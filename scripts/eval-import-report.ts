import type { UsoEstrazione } from '../src/server/import-ai';

/**
 * Report dell'eval dell'estrattore (spec 2026-09-05 §4): formattazione della
 * tabella e stima dei costi. Modulo PURO, senza I/O: l'harness gli passa i
 * contatori e scrive il markdown dove decide lui (solo dentro diete/).
 *
 * Regola di riservatezza (spec 30/08 §7): qui entrano SOLO contatori,
 * percentuali, durate, token e costi. Il tipo `CasoEval` non ha campi liberi
 * della dieta, così nulla della dieta può finire nel report per costruzione.
 */

export type SetEval = 'originali' | 'compresse' | 'pdf';
export type PipelineEval = 'singola' | 'pagine';

export interface CasoEval {
  /** Etichetta della dieta nel manifest (es. "dieta6"), non un contenuto. */
  dieta: string;
  set: SetEval;
  modello: string;
  pipeline: PipelineEval;
  durataS: number;
  /** Uno dei quattro archetipi importabili: un enum, non un testo del foglio. */
  archetipo: string;
  settimane: number;
  settimaneVere: number;
  /** Alimenti del ground truth ritrovati nell'estrazione, su quelli abbinabili. */
  abbinati: number;
  abbinabili: number;
  /** Alimenti estratti che il ground truth non conosce. */
  estranei: number;
  /** Righe con quantità esatta, sul totale delle righe estratte. */
  esatte: number;
  righe: number;
  inferite: number;
  /** Quantità inventate non marcate: il gate duro, deve restare 0. */
  fabbricate: number;
  uso: UsoEstrazione;
}

/**
 * Listino Anthropic al 09/2026, aggiornare a mano (spec §2.5). Sono i prezzi di
 * listino in dollari per milione di token, usati come euro per la stima: è un
 * ordine di grandezza per scegliere il modello, non una fattura.
 */
export const PREZZI_EUR_PER_MILIONE: Record<string, { input: number; output: number; cacheLettura: number; cacheScrittura: number }> = {
  'claude-sonnet-5': { input: 2, output: 10, cacheLettura: 0.2, cacheScrittura: 2.5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheLettura: 0.2, cacheScrittura: 2.5 },
  'claude-opus-5': { input: 5, output: 25, cacheLettura: 0.5, cacheScrittura: 6.25 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheLettura: 0.1, cacheScrittura: 1.25 },
};

/** null se il modello non è in listino: nel report diventa "n.d.", mai uno zero che sembra gratis. */
export function stimaCostoEur(modello: string, uso: UsoEstrazione): number | null {
  const p = PREZZI_EUR_PER_MILIONE[modello];
  if (!p) return null;
  return (
    uso.inputTokens * p.input +
    uso.outputTokens * p.output +
    uso.cacheLetti * p.cacheLettura +
    uso.cacheScritti * p.cacheScrittura
  ) / 1_000_000;
}

const ORDINE_SET: Record<SetEval, number> = { originali: 0, compresse: 1, pdf: 2 };

const INTESTAZIONI = [
  'modello', 'pipeline', 'durata s', 'settimane', 'abbinati', 'estranei', 'esatte',
  'inferite', 'fabbricate', 'token in', 'token out', 'cache letti', 'chiamate', 'costo €',
];

function due(n: number): string {
  return String(n).padStart(2, '0');
}

/** gg/mm/aaaa hh:mm, a mano: niente dipendenza dal locale della macchina. */
function formattaData(d: Date): string {
  return `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${due(d.getHours())}:${due(d.getMinutes())}`;
}

function percentualeIntera(n: number, tot: number): number {
  return tot === 0 ? 0 : Math.round((n / tot) * 100);
}

function rigaTabella(c: CasoEval): string {
  const costo = stimaCostoEur(c.modello, c.uso);
  const celle = [
    c.modello,
    c.pipeline,
    c.durataS.toFixed(1),
    `${c.settimane}/${c.settimaneVere}`,
    `${c.abbinati}/${c.abbinabili} (${percentualeIntera(c.abbinati, c.abbinabili)}%)`,
    String(c.estranei),
    `${c.esatte}/${c.righe}`,
    String(c.inferite),
    String(c.fabbricate),
    String(c.uso.inputTokens),
    String(c.uso.outputTokens),
    String(c.uso.cacheLetti),
    String(c.uso.chiamate),
    costo === null ? 'n.d.' : costo.toFixed(2),
  ];
  return `| ${celle.join(' | ')} |`;
}

function confrontaCasi(a: CasoEval, b: CasoEval): number {
  return a.modello.localeCompare(b.modello) || a.pipeline.localeCompare(b.pipeline);
}

/**
 * Markdown: una sezione per (dieta, set), una riga per (modello, pipeline).
 * Le sezioni seguono l'ordine di apparizione delle diete e poi originali,
 * compresse, pdf; le righe sono ordinate per modello e poi per pipeline.
 */
export function formattaReport(casi: CasoEval[], generatoIl: Date): string {
  // Chiave JSON, non una concatenazione: il nome della dieta è libero (viene dal
  // manifest) e potrebbe contenere qualunque separatore; dieta e set restano
  // anche nel valore, così non serve mai scomporre la chiave.
  const sezioni = new Map<string, { dieta: string; set: SetEval; casi: CasoEval[] }>();
  const ordineDiete: string[] = [];
  for (const c of casi) {
    if (!ordineDiete.includes(c.dieta)) ordineDiete.push(c.dieta);
    const chiave = JSON.stringify([c.dieta, c.set]);
    const sezione = sezioni.get(chiave) ?? { dieta: c.dieta, set: c.set, casi: [] };
    sezione.casi.push(c);
    sezioni.set(chiave, sezione);
  }
  const sezioniOrdinate = [...sezioni.values()].sort((a, b) =>
    ordineDiete.indexOf(a.dieta) - ordineDiete.indexOf(b.dieta) || ORDINE_SET[a.set] - ORDINE_SET[b.set]);

  const righe: string[] = [`# Eval estrattore — ${formattaData(generatoIl)}`, ''];
  for (const { dieta, set, casi: casiSezione } of sezioniOrdinate) {
    righe.push(`## ${dieta} — ${set}`, '');
    righe.push(`| ${INTESTAZIONI.join(' | ')} |`);
    righe.push(`|${INTESTAZIONI.map(() => '---').join('|')}|`);
    for (const c of [...casiSezione].sort(confrontaCasi)) righe.push(rigaTabella(c));
    righe.push('');
  }
  righe.push(
    'Regola di decisione: spec `docs/superpowers/specs/2026-09-05-import-in-produzione-design.md` §4 — ' +
    'Opus solo se porta gli abbinati sopra il 90% dove Sonnet resta sotto, sullo stesso set; ' +
    'se Sonnet cede solo sulle compresse, prima si alza la qualità della Camera.',
    '',
  );
  return righe.join('\n');
}
