import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { validaEsito, validaStatoRevisione } from '@/domain/import/valida';
import type { PiattoDaCreare, RigaTradotta, ScrittureImport } from '@/domain/import/commit';
import type { Dish, DishIngredient } from '@/domain/types';
import { client } from './supabase';
import { idCasa } from './casa';
import { salvaPiatto } from './repertorio';
import { leggiImpostazioni, salvaImpostazioni } from './impostazioni';

export interface BozzaImport {
  piano: PianoEstratto;
  statoRevisione: StatoRevisione;
}

export async function leggiBozzaImport(): Promise<BozzaImport | null> {
  const sb = client();
  // L'id della casa (casa.ts), non dell'account: per un membro è il proprietario. Una chiamata per funzione: è memorizzata.
  const userId = await idCasa();
  const { data, error } = await sb
    .from('import_draft')
    .select('piano, stato_revisione')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Il jsonb torna dal database senza garanzie di forma: si rivalida come al
  // bordo API, sia il piano che lo stato di revisione. Una bozza corrotta (in uno
  // dei due) si tratta come assente, non come un crash.
  try {
    const esito = validaEsito({ tipo: 'piano', piano: data.piano });
    if (esito.tipo !== 'piano') return null;
    const statoRevisione = validaStatoRevisione(data.stato_revisione);
    return { piano: esito.piano, statoRevisione };
  } catch {
    return null;
  }
}

export async function salvaBozzaImport(b: BozzaImport): Promise<void> {
  const sb = client();
  const userId = await idCasa();
  const { error } = await sb.from('import_draft').upsert({
    user_id: userId,
    piano: b.piano,
    stato_revisione: b.statoRevisione,
  });
  if (error) throw error;
}

export async function cancellaBozzaImport(): Promise<void> {
  const sb = client();
  const userId = await idCasa();
  const { error } = await sb.from('import_draft').delete().eq('user_id', userId);
  if (error) throw error;
}

/** Risolve una riga tradotta in una riga-ingrediente vera, sostituendo `nuovoAlimento` con l'id appena creato. */
function risolviRigaTradotta(riga: RigaTradotta, idPerAlimento: Map<string, string>): DishIngredient {
  if ('ingredientId' in riga) return { ingredientId: riga.ingredientId, quantita: riga.quantita, unita: riga.unita };
  const id = idPerAlimento.get(riga.nuovoAlimento);
  if (!id) throw new Error(`eseguiScritture: nessun id creato per l'alimento "${riga.nuovoAlimento}"`);
  return { ingredientId: id, quantita: riga.quantita, unita: riga.unita };
}

function risolviPiatto(p: PiattoDaCreare, idPerAlimento: Map<string, string>): Omit<Dish, 'id'> & { id?: string } {
  return {
    id: p.riusaDishId ?? undefined,
    nome: p.nome,
    slotDefId: p.slotDefId,
    fonte: 'nutrizionista',
    attivo: true,
    descrizione: p.descrizione,
    settimanaCiclo: p.settimanaCiclo,
    giornoCiclo: p.giornoCiclo,
    ingredienti: p.righe.map((r) => risolviRigaTradotta(r, idPerAlimento)),
    componenti: p.componenti.map((c) => ({
      id: crypto.randomUUID(),
      nome: c.nome,
      opzioni: c.opzioni.map((righe) => ({
        id: crypto.randomUUID(),
        righe: righe.map((r) => risolviRigaTradotta(r, idPerAlimento)),
      })),
    })),
  };
}

/** A che punto sono le scritture (spec 8c §H): l'attesa del riepilogo lo dice a passi. */
export type AvanzamentoScritture =
  | { passo: 'ingredienti' }
  | { passo: 'piatti'; fatti: number; totale: number }
  | { passo: 'fine' };

/** Quanti piatti si scrivono insieme: [ipotesi] 4 non stressa PostgREST; la misura dice il guadagno (piano 8c, Task 8). */
const PIATTI_IN_PARALLELO = 4;

/**
 * Quanti id per update di disattivazione: vanno nella query string (`id=in.(…)`), circa 37
 * caratteri l'uno, quindi circa 3,7 KB per blocco. [ipotesi] Sotto il limite d'URL davanti a
 * PostgREST, che non è noto (ruling 8c, Task 8).
 */
const DISATTIVAZIONI_PER_RICHIESTA = 100;

/**
 * L'esecutore del commit di un'importazione: applica le scritture prodotte da `traduciBozza`, a
 * blocchi dove si può (spec 8c §H). Ordine obbligato: ingredienti → dispensa → cambi di unità →
 * disattivazioni → piatti → impostazioni → cancella bozza. Un ingrediente creato in più o un
 * piatto disattivato in più, se l'esecuzione si interrompe, sono recuperabili (il ritentativo
 * ricalcola e li trova); un piano lasciato mezzo attivo no. I cambi stanno prima dei piatti: le
 * righe dei piatti nuovi sono già nell'unità nuova.
 *
 * Gli ingredienti in un insert solo, con gli id scelti qui; la dispensa a zero in un upsert solo;
 * le disattivazioni in un update ogni `DISATTIVAZIONI_PER_RICHIESTA` id; i cambi una RPC per ingrediente, ognuna una transazione
 * (migrazione 0016); i piatti uno per uno, `PIATTI_IN_PARALLELO` alla volta. Un piatto che
 * fallisce ferma la coda: nessuno parte dopo, quelli in volo finiscono, poi l'errore sale.
 */
export async function eseguiScritture(
  s: ScrittureImport,
  onAvanzamento?: (a: AvanzamentoScritture) => void,
): Promise<void> {
  const sb = client();
  const userId = await idCasa();
  onAvanzamento?.({ passo: 'ingredienti' });

  // Deduplica per `alimento`: due proposte per lo stesso alimento (bozza jsonb riscrivibile dal
  // client) creerebbero due ingredienti invece di uno. Vince la prima occorrenza.
  const daCreare = new Map<string, (typeof s.ingredientiDaCreare)[number]>();
  for (const ing of s.ingredientiDaCreare) {
    if (!daCreare.has(ing.alimento)) daCreare.set(ing.alimento, ing);
  }
  const idPerAlimento = new Map<string, string>();
  const righeIngrediente = [...daCreare.values()].map((ing) => {
    const id = crypto.randomUUID();
    idPerAlimento.set(ing.alimento, id);
    return {
      id,
      user_id: userId,
      nome: ing.nome,
      unita_base: ing.unitaBase,
      area: ing.area,
      classe_residuo: ing.classeResiduo,
      deperibile: ing.deperibile,
      formato_confezione: ing.formatoConfezione,
      prezzo_confezione: ing.prezzoConfezione,
    };
  });
  if (righeIngrediente.length > 0) {
    const { error } = await sb.from('ingredient').insert(righeIngrediente);
    if (error) throw error;
    // Ogni ingrediente ha una riga di dispensa dal primo giorno, a residuo zero (come salvaIngrediente).
    const { error: eDispensa } = await sb.from('pantry_state').upsert(
      righeIngrediente.map((r) => ({ ingredient_id: r.id, user_id: userId, residuo: 0 })),
      { onConflict: 'ingredient_id', ignoreDuplicates: true },
    );
    if (eDispensa) throw eDispensa;
  }

  for (const c of s.cambiUnita) {
    const { error } = await sb.rpc('cambia_unita_ingrediente', { p_ingrediente: c.ingredientId, p_unita: c.a, p_fattore: c.fattore });
    if (error) throw error;
  }

  // Soft delete, come eliminaPiatto, a blocchi: gli id vanno nella query string dell'update.
  for (let i = 0; i < s.piattiDaDisattivare.length; i += DISATTIVAZIONI_PER_RICHIESTA) {
    const blocco = s.piattiDaDisattivare.slice(i, i + DISATTIVAZIONI_PER_RICHIESTA);
    const { error } = await sb.from('dish').update({ attivo: false }).in('id', blocco).eq('user_id', userId);
    if (error) throw error;
  }

  const totale = s.piattiDaCreare.length;
  let fatti = 0;
  onAvanzamento?.({ passo: 'piatti', fatti, totale });
  const coda = [...s.piattiDaCreare];
  const errori: unknown[] = [];
  // Ogni lavoratore prende il prossimo piatto finché la coda non è vuota; dopo il primo errore
  // nessuno ne prende un altro (quelli già in volo finiscono).
  async function lavora() {
    while (errori.length === 0) {
      const piatto = coda.shift();
      if (!piatto) return;
      try {
        await salvaPiatto(risolviPiatto(piatto, idPerAlimento));
      } catch (e) {
        errori.push(e);
        return;
      }
      fatti += 1;
      onAvanzamento?.({ passo: 'piatti', fatti, totale });
    }
  }
  await Promise.all(Array.from({ length: Math.min(PIATTI_IN_PARALLELO, totale) }, lavora));
  if (errori.length > 0) throw errori[0];

  onAvanzamento?.({ passo: 'fine' });
  const impostazioniAttuali = await leggiImpostazioni();
  await salvaImpostazioni({
    ...impostazioniAttuali,
    settimaneCiclo: s.impostazioni.settimaneCiclo,
    cicloOrigine: s.impostazioni.cicloOrigine,
  });

  await cancellaBozzaImport();
}
