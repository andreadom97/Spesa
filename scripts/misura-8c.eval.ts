/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import type { Dish, Ingredient, MealSlotDef } from '@/domain/types';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';

/**
 * La misura della fase 8c (spec §J): quante cose bloccano l'import di una dieta vera, e quante
 * richieste e quanto tempo costa scriverla. Nessuna chiamata al modello: parte da una lettura già
 * salvata. Stampa SOLO contatori, mai un alimento, un nome di piatto o un testo della dieta.
 *
 * Input, percorsi assoluti in variabili d'ambiente (i file stanno fuori dal repository o in
 * `diete/`, che è gitignored):
 * - MISURA_8C_BOZZA: JSON `{ piano, statoRevisione? }` o la riga di import_draft `{ piano, stato_revisione }`;
 * - MISURA_8C_INGREDIENTI (facoltativo): gli ingredienti della casa, righe del database o `Ingredient`;
 * - MISURA_8C_SLOT (facoltativo): i pasti della casa, righe di meal_slot_def o `MealSlotDef`;
 * - MISURA_8C_REPERTORIO (facoltativo): i piatti attivi come `Dish[]`;
 * - MISURA_8C_LATENZA_MS (facoltativo, default 120): la latenza simulata di una richiesta.
 *   È un'ipotesi: il numero di richieste è misurato, la durata no.
 */
const finto = vi.hoisted(() => {
  const stato = { richieste: 0, latenzaMs: 120 };
  async function richiesta() {
    stato.richieste += 1;
    await new Promise((r) => setTimeout(r, stato.latenzaMs));
  }
  /** Un costruttore di query PostgREST finto: ogni `await` è una richiesta; insert e upsert restituiscono le righe con un id. */
  function costruttore() {
    let righe: Record<string, unknown>[] = [];
    let conSelect = false;
    let singola = false;
    const b: Record<string, unknown> = {};
    const passa = () => b;
    for (const m of ['eq', 'in', 'order', 'gte', 'delete', 'update', 'returns']) b[m] = passa;
    b.select = () => { conSelect = true; return b; };
    b.single = () => { singola = true; return b; };
    b.maybeSingle = () => { singola = true; return b; };
    b.insert = (p: unknown) => { righe = (Array.isArray(p) ? p : [p]) as Record<string, unknown>[]; return b; };
    b.upsert = (p: unknown) => { righe = (Array.isArray(p) ? p : [p]) as Record<string, unknown>[]; return b; };
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => (async () => {
      await richiesta();
      const conId = righe.map((r) => ({ ...r, id: r.id ?? crypto.randomUUID() }));
      if (singola) return { data: conId[0] ?? null, error: null };
      return { data: conSelect ? conId : null, error: null };
    })().then(ok, ko);
    return b;
  }
  const client = {
    from: () => costruttore(),
    rpc: async () => { await richiesta(); return { data: null, error: null }; },
  };
  return { stato, richiesta, client };
});

vi.mock('@/data/supabase', () => ({ client: () => finto.client }));
vi.mock('@/data/casa', () => ({ idCasa: async () => 'casa-misura' }));
// Le impostazioni: una lettura e una scrittura, come in produzione; i valori non contano.
vi.mock('@/data/impostazioni', () => ({
  leggiImpostazioni: async () => {
    await finto.richiesta();
    return {
      moltiplicatorePorzioni: 1, ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
      settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90,
    };
  },
  salvaImpostazioni: async () => { await finto.richiesta(); },
}));

import { confermaTutti, gruppiRighe, rispondiGruppo, vociPasti } from '@/domain/import/dubbi';
import { calcolaProposte, motiviBlocco, sceltiIniziali } from '@/domain/import/ingredienti';
import { normalizza, proponiSlot } from '@/domain/import/mapping';
import { BozzaIncompletaError, traduciBozza } from '@/domain/import/commit';
import { validaEsito, validaStatoRevisione } from '@/domain/import/valida';
import { aIngrediente, aSlotDef } from '@/data/mappers';
import { eseguiScritture } from '@/data/importa';

function leggiJson(variabile: string): unknown {
  const percorso = process.env[variabile];
  if (!percorso || !existsSync(percorso)) return null;
  try {
    return JSON.parse(readFileSync(percorso, 'utf-8'));
  } catch {
    // Messaggio fisso: l'errore di JSON.parse cita uno spezzone del testo (dati personali).
    throw new Error(`${variabile}: il file non è un JSON valido (il contenuto non viene stampato)`);
  }
}

/** Senza i pasti della casa: un pasto per nome della dieta, condimenti esclusi (dichiarato nel log). */
function slotDalPiano(piano: PianoEstratto): MealSlotDef[] {
  const nomi = [...new Set(piano.settimane.flatMap((s) => s.giorni.flatMap((g) => g.pasti.map((p) => normalizza(p.nomeOriginale)))))];
  return nomi
    .filter((n) => n !== 'condimenti')
    .map((nome, posizione) => ({ id: `slot-${posizione}`, nome, posizione, assenzeAbituali: Array(7).fill(false) }));
}

/** Lo stato iniziale della revisione, come lo costruisce oggi page.tsx. */
function statoIniziale(piano: PianoEstratto, slotDefs: MealSlotDef[]): StatoRevisione {
  const mappaturaPasti: Record<string, string> = {};
  for (const s of piano.settimane) for (const g of s.giorni) for (const p of g.pasti) {
    const chiave = normalizza(p.nomeOriginale);
    const id = proponiSlot(p.nomeOriginale, slotDefs);
    if (id && !(chiave in mappaturaPasti)) mappaturaPasti[chiave] = id;
  }
  return { passo: 'revisione', mappaturaPasti, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };
}

const BOZZA = leggiJson('MISURA_8C_BOZZA') as Record<string, unknown> | null;

// Senza la lettura salvata la misura non gira: lo si dice una volta, qui, e il test vero si salta
// (correzione D8: niente test che non verifica niente). La lettura la produce il controller.
if (BOZZA === null) {
  console.log(
    '\nMisura NON ESEGUITA: la esegue il controller (piano 8c, Task 0 Step 5) con la lettura salvata in diete/misura-8c/; ' +
    'esporta MISURA_8C_BOZZA (e MISURA_8C_INGREDIENTI, MISURA_8C_SLOT) e rilancia `npm run misura:8c`.',
  );
}

describe('misura 8c', () => {
  it.skipIf(BOZZA === null)('bloccanti e scritture', async () => {
    finto.stato.latenzaMs = Number(process.env.MISURA_8C_LATENZA_MS ?? 120);
    const esito = validaEsito({ tipo: 'piano', piano: BOZZA!.piano });
    if (esito.tipo !== 'piano') throw new Error('bozza senza piano');
    const piano = esito.piano;
    const grezziIng = (leggiJson('MISURA_8C_INGREDIENTI') ?? []) as Record<string, unknown>[];
    const esistenti: Ingredient[] = grezziIng.map((r) => ('unita_base' in r ? aIngrediente(r) : (r as unknown as Ingredient)));
    const grezziSlot = leggiJson('MISURA_8C_SLOT') as Record<string, unknown>[] | null;
    const slotDefs: MealSlotDef[] = grezziSlot
      ? grezziSlot.map((r) => ('assenze_abituali' in r ? aSlotDef(r) : (r as unknown as MealSlotDef)))
      : slotDalPiano(piano);
    const grezzoStato = BOZZA!.statoRevisione ?? BOZZA!.stato_revisione;
    const stato: StatoRevisione = grezzoStato
      ? { ...validaStatoRevisione(grezzoStato), passo: 'revisione' }
      : statoIniziale(piano, slotDefs);

    // Controlla: i dubbi aperti senza proposta e i nomi di pasto senza abbinamento.
    const gruppi = gruppiRighe(piano, stato);
    const dubbiBloccanti = gruppi.filter((g) => g.stato === 'aperto' && (g as { proposta?: unknown }).proposta == null).length;
    const pastiBloccanti = vociPasti(piano, stato, slotDefs).filter((v) => v.slotDefId === null).length;

    // Ingredienti: le proposte che bloccano, dopo CONFERMA I PASTI.
    const confermato = confermaTutti(piano, stato);
    const proposte = calcolaProposte(piano, confermato, esistenti);
    const ingredientiBloccanti = motiviBlocco(proposte, esistenti, sceltiIniziali(proposte, esistenti)).size;

    console.log(
      `\n[misura 8c] pasti ${grezziSlot ? 'della casa' : 'dal piano (fittizi)'}, ${esistenti.length} ingredienti della casa · ` +
      `Controlla: dubbi che bloccano ${dubbiBloccanti} su ${gruppi.length}, pasti senza abbinamento ${pastiBloccanti} · ` +
      `Ingredienti: proposte che bloccano ${ingredientiBloccanti} su ${proposte.length}`,
    );

    // Le scritture, su una bozza completata d'ufficio: ogni dubbio ancora aperto risposto con 1
    // nell'unità nota (o in g), ogni pasto senza abbinamento sul primo pasto. Si misura il costo di
    // scrivere piatti e ingredienti, non le risposte.
    let completo = confermato;
    for (const g of gruppiRighe(piano, completo)) {
      if (g.stato === 'aperto') completo = rispondiGruppo(piano, completo, g.chiave, 1, g.unitaFissa ?? g.unita ?? 'g');
    }
    const mappaturaPasti = { ...completo.mappaturaPasti };
    for (const v of vociPasti(piano, completo, slotDefs)) if (v.slotDefId === null) mappaturaPasti[v.chiave] = slotDefs[0].id;
    completo = { ...completo, mappaturaPasti, passo: 'riepilogo' };
    completo = { ...completo, ingredientiNuovi: calcolaProposte(piano, completo, esistenti) };
    const repertorio = (leggiJson('MISURA_8C_REPERTORIO') ?? []) as Dish[];
    let scritture: ReturnType<typeof traduciBozza>;
    try {
      scritture = traduciBozza(piano, completo, esistenti, repertorio, '2026-10-05');
    } catch (e) {
      if (!(e instanceof BozzaIncompletaError)) throw e;
      console.log('[misura 8c] Riepilogo: la bozza completata d\'ufficio non si traduce (BozzaIncompletaError): scritture NON MISURATE');
      return;
    }
    finto.stato.richieste = 0;
    const inizio = performance.now();
    await eseguiScritture(scritture);
    const durataS = (performance.now() - inizio) / 1000;
    console.log(
      `[misura 8c] Scritture: ${scritture.ingredientiDaCreare.length} ingredienti, ${scritture.piattiDaCreare.length} piatti, ` +
      `${scritture.piattiDaDisattivare.length} disattivazioni → ${finto.stato.richieste} richieste [misurato]; ` +
      `durata con ${finto.stato.latenzaMs} ms a richiesta ${durataS.toFixed(1)} s [ipotesi sulla latenza]`,
    );
    expect(finto.stato.richieste).toBeGreaterThan(0);
  });
});
