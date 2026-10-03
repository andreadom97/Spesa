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
 * Usa le funzioni dell'app (Task 13, correzione D9 e diagnosi del 03/10): lo stato iniziale di
 * `statoRevisioneIniziale`, gli ingredienti della casa in `gruppiRighe` e `confermaTutti`, le
 * scelte di `sceltiIniziali`, il contatore di Ingredienti della pagina. Nel completamento d'ufficio
 * un dubbio senza proposta si risponde con 1 nell'unità dell'ingrediente che hai, e un peso di un
 * pezzo che manca vale 100 g: si contano e si stampano, perché le scritture si misurano lo stesso.
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

import { confermaTutti, gruppiRighe, pronto, rispondiGruppo, vociPasti, type GruppoRighe } from '@/domain/import/dubbi';
import {
  calcolaProposte, cambiDiretti, cambiUnita, motiviBlocco, passoBloccato, pesiProposte, sceltiIniziali,
} from '@/domain/import/ingredienti';
import { proponi } from '@/domain/import/formati-tipici';
import { normalizza, statoRevisioneIniziale } from '@/domain/import/mapping';
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

/**
 * L'unità della risposta d'ufficio a un dubbio senza proposta: quella dell'ingrediente che hai con
 * lo stesso nome, poi l'unità fissa del gruppo (decisione 8), poi quella delle sue righe risolte,
 * poi quella della tabella dei formati. Rispondere in un'altra unità creerebbe righe miste che il
 * riepilogo non sa scrivere senza un peso (la diagnosi del 03/10).
 */
function unitaDUfficio(g: GruppoRighe, esistenti: Ingredient[]) {
  const alimento = normalizza(g.alimento);
  return esistenti.find((e) => normalizza(e.nome) === alimento)?.unitaBase ?? g.unitaFissa ?? g.unita ?? proponi(g.alimento, null).unitaBase;
}

/** Il contatore di Ingredienti come lo mostra la pagina: le proposte che bloccano più i cambi diretti senza peso. */
function bloccantiIngredienti(piano: PianoEstratto, stato: StatoRevisione, esistenti: Ingredient[]) {
  const proposte = stato.ingredientiNuovi;
  const scelti = stato.scelti ?? {};
  const cambi = cambiUnita(piano, stato, esistenti);
  const pesi = pesiProposte(piano, stato, esistenti);
  const cambiSenzaPeso = cambiDiretti(cambi, proposte).filter((c) => c.pesoPezzo === null).length;
  return {
    proposte: proposte.length,
    bloccanti: motiviBlocco(proposte, esistenti, scelti, cambi, pesi).size + cambiSenzaPeso,
    bloccato: passoBloccato(proposte, esistenti, scelti, cambi, pesi),
    cambi,
    pesi,
    cambiVeri: cambi.filter((c) => c.da !== c.a).length,
    // Solo i cambi veri, come `cambiVeri`: con l'unità che resta (da === a) il peso non serve, e
    // contarli farebbe «senza peso M» più grande di «cambi di unità N».
    cambiSenzaPeso: cambi.filter((c) => c.da !== c.a && c.pesoPezzo === null).length,
    pesiSenzaPeso: pesi.filter((p) => p.pesoPezzo === null).length,
  };
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
      : statoRevisioneIniziale(piano, slotDefs);

    // Controlla: i dubbi aperti senza proposta (spec 8c §D: quelli con la proposta non bloccano) e i
    // nomi di pasto senza abbinamento. Con gli ingredienti della casa, come la pagina.
    const gruppi = gruppiRighe(piano, stato, esistenti);
    const dubbiBloccanti = gruppi.filter((g) => g.stato === 'aperto' && g.proposta === null).length;
    const dubbiConProposta = gruppi.filter((g) => g.stato === 'aperto' && g.proposta !== null).length;
    const pastiBloccanti = vociPasti(piano, stato, slotDefs).filter((v) => v.slotDefId === null).length;
    const controllaPronto = pronto(piano, stato, slotDefs, esistenti);

    // Ingredienti dopo CONFERMA I PASTI, senza toccare altro: le proposte che bloccano e i cambi di unità.
    const confermato = confermaTutti(piano, stato, esistenti);
    const proposte = calcolaProposte(piano, confermato, esistenti);
    const statoIngredienti: StatoRevisione = {
      ...confermato, ingredientiNuovi: proposte, scelti: confermato.scelti ?? sceltiIniziali(proposte, esistenti),
    };
    const ing = bloccantiIngredienti(piano, statoIngredienti, esistenti);

    console.log(
      `\n[misura 8c] pasti ${grezziSlot ? 'della casa' : 'dal piano (fittizi)'}, ${esistenti.length} ingredienti della casa · ` +
      `Controlla: dubbi che bloccano ${dubbiBloccanti} su ${gruppi.length} (con proposta ${dubbiConProposta}), ` +
      `pasti senza abbinamento ${pastiBloccanti}, CONFERMA I PASTI ${controllaPronto ? 'accesa' : 'spenta'} · ` +
      `Ingredienti: bloccano ${ing.bloccanti} (proposte e cambi diretti senza peso, il contatore della pagina), ` +
      `proposte ${ing.proposte}, passo ${ing.bloccato ? 'bloccato' : 'libero'}, cambi di unità ${ing.cambiVeri} ` +
      `(senza peso ${ing.cambiSenzaPeso}), proposte in g e pz senza peso ${ing.pesiSenzaPeso}`,
    );

    // Le scritture, su una bozza completata d'ufficio: ogni dubbio ancora aperto risposto con la sua
    // proposta o con 1 nell'unità d'ufficio, ogni pasto senza abbinamento sul primo pasto. Si misura il
    // costo di scrivere piatti e ingredienti, non le risposte. Si ricalcolano i gruppi a ogni risposta:
    // una risposta può unire o chiudere altri gruppi dello stesso alimento.
    let completo = confermato;
    let rispostiDUfficio = 0;
    for (let giro = 0; giro < 2000; giro += 1) {
      const aperto = gruppiRighe(piano, completo, esistenti).find((g) => g.stato === 'aperto');
      if (!aperto) break;
      const risposta = aperto.proposta ?? { quantita: 1, unita: unitaDUfficio(aperto, esistenti) };
      const dopo = rispondiGruppo(piano, completo, aperto.chiave, risposta.quantita, risposta.unita);
      if (dopo === completo || JSON.stringify(dopo.correzioni) === JSON.stringify(completo.correzioni)) break;
      completo = dopo;
      rispostiDUfficio += 1;
    }
    const ancoraAperti = gruppiRighe(piano, completo, esistenti).filter((g) => g.stato === 'aperto').length;
    const mappaturaPasti = { ...completo.mappaturaPasti };
    let pastiDUfficio = 0;
    for (const v of vociPasti(piano, completo, slotDefs)) {
      if (v.slotDefId === null && slotDefs[0]) {
        mappaturaPasti[v.chiave] = slotDefs[0].id;
        pastiDUfficio += 1;
      }
    }
    completo = { ...completo, mappaturaPasti, passo: 'formati' };
    const proposteComplete = calcolaProposte(piano, completo, esistenti);
    completo = { ...completo, ingredientiNuovi: proposteComplete, scelti: completo.scelti ?? sceltiIniziali(proposteComplete, esistenti) };

    // Ingredienti sullo stato completato: è lo stato che arriva davvero al passo.
    const ingCompleto = bloccantiIngredienti(piano, completo, esistenti);
    // I pesi che mancano, d'ufficio a 100 g: si misurano le scritture, non le risposte.
    const pesiDUfficio = Object.fromEntries([
      ...ingCompleto.cambi.filter((c) => c.pesoPezzo === null).map((c) => [c.ingredientId, { tieni: false, pesoPezzo: 100 }]),
      ...ingCompleto.pesi.filter((p) => p.pesoPezzo === null).map((p) => [p.alimento, { tieni: false, pesoPezzo: 100 }]),
    ]);
    completo = { ...completo, cambiUnita: { ...(completo.cambiUnita ?? {}), ...pesiDUfficio }, passo: 'riepilogo' };

    console.log(
      `[misura 8c] Completamento d'ufficio: ${rispostiDUfficio} dubbi risposti, ${ancoraAperti} ancora aperti, ` +
      `${pastiDUfficio} pasti sul primo pasto · Ingredienti sullo stato completato: bloccano ${ingCompleto.bloccanti}, ` +
      `proposte ${ingCompleto.proposte}, passo ${ingCompleto.bloccato ? 'bloccato' : 'libero'}, cambi di unità ${ingCompleto.cambiVeri} ` +
      `(senza peso ${ingCompleto.cambiSenzaPeso}), proposte in g e pz senza peso ${ingCompleto.pesiSenzaPeso}, ` +
      `pesi messi d'ufficio a 100 g ${Object.keys(pesiDUfficio).length}`,
    );

    const repertorio = (leggiJson('MISURA_8C_REPERTORIO') ?? []) as Dish[];
    let scritture: ReturnType<typeof traduciBozza>;
    try {
      scritture = traduciBozza(piano, completo, esistenti, repertorio, '2026-10-05');
    } catch (e) {
      if (!(e instanceof BozzaIncompletaError)) throw e;
      // Il messaggio dell'errore cita un alimento o un pasto (dati personali): non si stampa.
      console.log('[misura 8c] Riepilogo: la bozza completata d\'ufficio non si traduce (BozzaIncompletaError): scritture NON MISURATE');
      return;
    }
    finto.stato.richieste = 0;
    const inizio = performance.now();
    await eseguiScritture(scritture);
    const durataS = (performance.now() - inizio) / 1000;
    console.log(
      `[misura 8c] Scritture: ${scritture.ingredientiDaCreare.length} ingredienti, ${scritture.piattiDaCreare.length} piatti, ` +
      `${scritture.piattiDaDisattivare.length} disattivazioni, ${scritture.cambiUnita.length} cambi di unità → ` +
      `${finto.stato.richieste} richieste [misurato]; ` +
      `durata con ${finto.stato.latenzaMs} ms a richiesta ${durataS.toFixed(1)} s [ipotesi sulla latenza]`,
    );
    expect(finto.stato.richieste).toBeGreaterThan(0);
  });
});
