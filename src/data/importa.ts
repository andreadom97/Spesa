import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { validaEsito } from '@/domain/import/valida';
import type { PiattoDaCreare, RigaTradotta, ScrittureImport } from '@/domain/import/commit';
import type { Dish, DishIngredient } from '@/domain/types';
import { client } from './supabase';
import { salvaIngrediente, salvaPiatto, eliminaPiatto } from './repertorio';
import { leggiImpostazioni, salvaImpostazioni } from './impostazioni';

export interface BozzaImport {
  piano: PianoEstratto;
  statoRevisione: StatoRevisione;
}

export async function leggiBozzaImport(): Promise<BozzaImport | null> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { data, error } = await sb
    .from('import_draft')
    .select('piano, stato_revisione')
    .eq('user_id', utente.user!.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Il jsonb torna dal database senza garanzie di forma: si rivalida come al
  // bordo API. Una bozza corrotta si tratta come assente, non come un crash.
  try {
    const esito = validaEsito({ tipo: 'piano', piano: data.piano });
    if (esito.tipo !== 'piano') return null;
    return { piano: esito.piano, statoRevisione: data.stato_revisione as StatoRevisione };
  } catch {
    return null;
  }
}

export async function salvaBozzaImport(b: BozzaImport): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb.from('import_draft').upsert({
    user_id: utente.user!.id,
    piano: b.piano,
    stato_revisione: b.statoRevisione,
  });
  if (error) throw error;
}

export async function cancellaBozzaImport(): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb.from('import_draft').delete().eq('user_id', utente.user!.id);
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

/**
 * L'esecutore del commit di un'importazione: applica in ordine fisso le
 * scritture prodotte da `traduciBozza` (spec §6). Ordine obbligato — un
 * ingrediente creato in più o un piatto disattivato in più, se l'esecuzione
 * si interrompe a metà, sono recuperabili; un piano lasciato mezzo attivo
 * (piatti nuovi senza le disattivazioni, o impostazioni riscritte prima che
 * i piatti esistano) non lo è: ingredienti -> disattivazioni -> piatti ->
 * impostazioni -> cancella bozza.
 */
export async function eseguiScritture(s: ScrittureImport): Promise<void> {
  const idPerAlimento = new Map<string, string>();
  for (const ing of s.ingredientiDaCreare) {
    const id = await salvaIngrediente({
      nome: ing.nome,
      unitaBase: ing.unitaBase,
      area: ing.area,
      classeResiduo: ing.classeResiduo,
      deperibile: ing.deperibile,
      formatoConfezione: ing.formatoConfezione,
    });
    idPerAlimento.set(ing.alimento, id);
  }

  for (const id of s.piattiDaDisattivare) {
    await eliminaPiatto(id);
  }

  for (const piatto of s.piattiDaCreare) {
    await salvaPiatto(risolviPiatto(piatto, idPerAlimento));
  }

  const impostazioniAttuali = await leggiImpostazioni();
  await salvaImpostazioni({
    ...impostazioniAttuali,
    settimaneCiclo: s.impostazioni.settimaneCiclo,
    cicloOrigine: s.impostazioni.cicloOrigine,
  });

  await cancellaBozzaImport();
}
