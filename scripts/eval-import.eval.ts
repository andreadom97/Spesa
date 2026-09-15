import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import { estraiPianoConUso, estraiPianoAPagine, type FileEstrazione, type EstrazioneConUso } from '../src/server/import-ai';
import { dividiPdf } from '../src/server/pdf-pagine';
import { validaEsito } from '../src/domain/import/valida';
import { normalizza } from '../src/domain/import/mapping';
import type { PianoEstratto, RigaEstratta } from '../src/domain/import/types';
import { formattaReport, stimaCostoEur, type CasoEval, type PipelineEval, type SetEval } from './eval-import-report';

/**
 * Eval dell'estrattore su diete vere (spec 2026-09-05 §4): l'unico posto dove si
 * spende denaro vero, eseguibile solo in locale perché diete/ è gitignored.
 *
 * Dimensioni del confronto: diete × set (originali, compresse, pdf) × modelli ×
 * pipeline (singola = v1, pagine = indice + pagine + fusione). Ogni combinazione
 * è un `it`; a fine corsa un report markdown SOLO in diete/estrazioni/.
 *
 * Riservatezza: console e report stampano contatori, percentuali, durate, token
 * e costi. Mai un alimento, un testo della dieta, un nome di cartella o di foto.
 */

const DIR_DIETE = join(process.cwd(), 'diete');
const MANIFEST = join(DIR_DIETE, 'eval-manifest.json');
const MODELLI = (process.env.EVAL_IMPORT_MODELLI ?? 'claude-sonnet-5').split(',').map((m) => m.trim()).filter(Boolean);

/** Una voce di diete/eval-manifest.json: percorsi relativi a diete/. */
interface VoceManifest {
  nome: string;
  foto?: string;
  fotoCompresse?: string;
  pdf?: string;
  groundTruth: string;
}

/** Un (dieta, set) con le sue fonti già risolte in percorsi assoluti. */
interface CasoDaEseguire {
  dieta: string;
  set: SetEval;
  fonte: { tipo: 'cartella'; dir: string } | { tipo: 'pdf'; percorso: string };
  groundTruth: string;
}

/**
 * Senza manifest, il caso di sempre: la dieta 6 con le foto originali, e con
 * EVAL_IMPORT_DIR_FOTO (percorso come lo si passava finora: assoluto o relativo
 * alla cwd) come set delle compresse.
 */
function vociDefault(): VoceManifest[] {
  const compresse = process.env.EVAL_IMPORT_DIR_FOTO;
  return [{
    nome: 'dieta6',
    foto: 'Dieta 6',
    ...(compresse ? { fotoCompresse: resolve(process.cwd(), compresse) } : {}),
    groundTruth: 'estrazioni/piani/dieta6.json',
  }];
}

function leggiManifest(): VoceManifest[] {
  if (!existsSync(MANIFEST)) return vociDefault();
  const voci: unknown = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
  if (!Array.isArray(voci)) throw new Error('eval-manifest.json: atteso un array di voci');
  return voci as VoceManifest[];
}

function setRichiesti(): Set<'originali' | 'compresse'> {
  const v = process.env.EVAL_IMPORT_SET ?? 'entrambi';
  if (v === 'originali' || v === 'compresse') return new Set([v]);
  if (v === 'entrambi') return new Set(['originali', 'compresse']);
  throw new Error(`EVAL_IMPORT_SET=${v}: ammessi originali | compresse | entrambi`);
}

function pipelineRichieste(): PipelineEval[] {
  const v = process.env.EVAL_IMPORT_PIPELINE ?? 'pagine';
  if (v === 'pagine' || v === 'singola') return [v];
  if (v === 'entrambe') return ['singola', 'pagine'];
  throw new Error(`EVAL_IMPORT_PIPELINE=${v}: ammessi pagine | singola | entrambe`);
}

/**
 * Il prodotto dieta × set con le fonti che esistono davvero. I set assenti nel
 * manifest (o non richiesti) si saltano con una riga di log; il set `pdf` corre
 * quando la voce lo dichiara, è un'alternativa alle foto e non passa da
 * EVAL_IMPORT_SET. Una fonte dichiarata ma mancante su disco è un errore di
 * configurazione, non uno skip silenzioso.
 */
function preparaCasi(): CasoDaEseguire[] {
  const richiesti = setRichiesti();
  const casi: CasoDaEseguire[] = [];
  for (const voce of leggiManifest()) {
    const groundTruth = join(DIR_DIETE, voce.groundTruth);
    if (!existsSync(groundTruth)) throw new Error(`[${voce.nome}] ground truth mancante`);
    const cartelle: ['originali' | 'compresse', string | undefined][] = [['originali', voce.foto], ['compresse', voce.fotoCompresse]];
    for (const [set, dir] of cartelle) {
      if (!richiesti.has(set)) continue;
      if (!dir) {
        console.log(`[${voce.nome}] set ${set} assente nel manifest: salto`);
        continue;
      }
      const assoluto = resolve(DIR_DIETE, dir);
      if (!existsSync(assoluto)) throw new Error(`[${voce.nome}] set ${set}: cartella mancante`);
      casi.push({ dieta: voce.nome, set, fonte: { tipo: 'cartella', dir: assoluto }, groundTruth });
    }
    if (voce.pdf) {
      const percorso = resolve(DIR_DIETE, voce.pdf);
      if (!existsSync(percorso)) throw new Error(`[${voce.nome}] set pdf: file mancante`);
      casi.push({ dieta: voce.nome, set: 'pdf', fonte: { tipo: 'pdf', percorso }, groundTruth });
    }
  }
  return casi;
}

// Il gate resta quello di sempre: senza chiave o senza diete/ non si legge nulla
// da disco e la suite esce 0 col test "NON ESEGUITO".
const CHIAVE = Boolean(process.env.ANTHROPIC_API_KEY);
const CASI = CHIAVE && existsSync(DIR_DIETE) ? preparaCasi() : [];
const PIPELINE = CHIAVE ? pipelineRichieste() : [];
const pronto = CHIAVE && CASI.length > 0;

function tutteLeRighe(piano: PianoEstratto): RigaEstratta[] {
  return piano.settimane.flatMap((s) =>
    s.giorni.flatMap((g) =>
      g.pasti.flatMap((p) =>
        p.piatti.flatMap((pi) => [...pi.righeFisse, ...pi.componenti.flatMap((c) => c.opzioni.flat())]),
      ),
    ),
  );
}

interface Verita {
  piano: PianoEstratto;
  /** alimento normalizzato -> insieme delle quantità che il ground truth conosce per quell'alimento */
  quantitaVere: Map<string, Set<number | null>>;
}

type Metriche = Omit<CasoEval, 'dieta' | 'set' | 'modello' | 'pipeline' | 'durataS' | 'uso'>;

/**
 * Le metriche di sempre, pure: l'estrazione contro il ground truth. Le righe
 * fabbricate tornano a parte per il dump di debug (mai per la console).
 */
function misura(piano: PianoEstratto, verita: Verita): { metriche: Metriche; righeFabbricate: RigaEstratta[] } {
  const righe = tutteLeRighe(piano);
  let abbinati = 0, esatte = 0, fabbricate = 0, inferite = 0, estranei = 0;
  const righeFabbricate: RigaEstratta[] = [];
  const vistiEstratti = new Set<string>();
  for (const r of righe) {
    const k = normalizza(r.alimento);
    vistiEstratti.add(k);
    if (r.quantitaInferita) inferite += 1;
    const vere = verita.quantitaVere.get(k);
    if (!vere) {
      estranei += 1;
      continue;
    }
    if (r.quantita !== null && !r.quantitaInferita && !vere.has(r.quantita)) {
      fabbricate += 1;
      righeFabbricate.push(r);
    }
    if (r.quantita !== null && vere.has(r.quantita)) esatte += 1;
  }
  for (const k of verita.quantitaVere.keys()) if (vistiEstratti.has(k)) abbinati += 1;
  return {
    metriche: {
      archetipo: piano.archetipo,
      settimane: piano.settimane.length,
      settimaneVere: verita.piano.settimane.length,
      abbinati,
      abbinabili: verita.quantitaVere.size,
      estranei,
      esatte,
      righe: righe.length,
      inferite,
      fabbricate,
    },
    righeFabbricate,
  };
}

describe('eval estrattore', () => {
  it.skipIf(pronto)('NON ESEGUITO: servono ANTHROPIC_API_KEY e la cartella diete/ locale', () => {
    console.log('\nEval NON ESEGUITO: esporta ANTHROPIC_API_KEY (e opzionalmente EVAL_IMPORT_MODELLI, EVAL_IMPORT_PIPELINE, EVAL_IMPORT_SET) su una macchina con diete/ e rilancia `npm run eval:import`.');
    expect(true).toBe(true);
  });

  // ATTENZIONE: il corpo di un describe.skipIf viene comunque ESEGUITO in fase
  // di collezione — le letture delle foto e del ground truth vivono in queste
  // funzioni, chiamate solo dentro gli it (che con lo skip non girano mai).
  function caricaFoto(dir: string): FileEstrazione[] {
    return readdirSync(dir)
      .filter((f) => ['.jpeg', '.jpg', '.png'].includes(extname(f).toLowerCase()))
      .sort()
      .map((f) => ({
        tipo: 'immagine' as const,
        mime: extname(f).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg',
        base64: readFileSync(join(dir, f)).toString('base64'),
      }));
  }
  /** Il PDF intero per la singola; una pagina per file per la pipeline a pagine (come fa la route). */
  async function caricaPdf(percorso: string, pipeline: PipelineEval): Promise<FileEstrazione[]> {
    const byte = readFileSync(percorso);
    // Stesso cap della route (12 pagine): l'eval misura ciò che la produzione accetta.
    const pagine = pipeline === 'pagine' ? await dividiPdf(new Uint8Array(byte), 12) : [byte.toString('base64')];
    return pagine.map((base64) => ({ tipo: 'pdf' as const, mime: 'application/pdf', base64 }));
  }
  function caricaFile(caso: CasoDaEseguire, pipeline: PipelineEval): Promise<FileEstrazione[]> {
    return caso.fonte.tipo === 'pdf' ? caricaPdf(caso.fonte.percorso, pipeline) : Promise.resolve(caricaFoto(caso.fonte.dir));
  }
  function caricaVerita(percorso: string): Verita {
    const veritaEsito = validaEsito(JSON.parse(readFileSync(percorso, 'utf-8')));
    if (veritaEsito.tipo !== 'piano') throw new Error('ground truth inatteso: non è un piano');
    const quantitaVere = new Map<string, Set<number | null>>();
    for (const r of tutteLeRighe(veritaEsito.piano)) {
      const k = normalizza(r.alimento);
      const s = quantitaVere.get(k) ?? new Set<number | null>();
      s.add(r.quantita);
      quantitaVere.set(k, s);
    }
    return { piano: veritaEsito.piano, quantitaVere };
  }

  const casiEval: CasoEval[] = [];

  describe.skipIf(!pronto)('diete vs ground truth', () => {
    for (const caso of CASI) {
      for (const modello of MODELLI) {
        for (const pipeline of PIPELINE) {
          const etichetta = `[${caso.dieta} · ${caso.set} · ${modello} · ${pipeline}]`;
          it(etichetta, async () => {
            const files = await caricaFile(caso, pipeline);
            const verita = caricaVerita(caso.groundTruth);
            const inizio = Date.now();
            let risultato: EstrazioneConUso;
            try {
              risultato = pipeline === 'singola'
                ? await estraiPianoConUso(files, modello)
                : await estraiPianoAPagine(files, modello);
            } catch (err) {
              console.log(`\n${etichetta} CHIAMATA FALLITA: ${err instanceof Error ? err.constructor.name : 'errore'}`);
              throw err; // mai passare a vuoto: una chiamata fallita è un fallimento dell'eval
            }
            const durataS = (Date.now() - inizio) / 1000;
            const esito = validaEsito(risultato.grezzo); // gate duro: lancia se l'estrazione non è valida
            if (esito.tipo !== 'piano') throw new Error(`${etichetta} esito rifiuto su una dieta con menu`);

            const { metriche, righeFabbricate } = misura(esito.piano, verita);
            const { uso } = risultato;
            const costo = stimaCostoEur(modello, uso);
            console.log(
              `\n${etichetta} durata ${durataS.toFixed(1)}s · archetipo ${metriche.archetipo} · ` +
              `settimane ${metriche.settimane}/${metriche.settimaneVere} · ` +
              `alimenti del ground truth abbinati ${metriche.abbinati}/${metriche.abbinabili} · ` +
              `alimenti fuori dal ground truth: ${metriche.estranei} · ` +
              `righe con quantità esatta ${metriche.esatte}/${metriche.righe} · inferite ${metriche.inferite} · ` +
              `QUANTITÀ FABBRICATE: ${metriche.fabbricate} · ` +
              `chiamate ${uso.chiamate} · token in ${uso.inputTokens} · out ${uso.outputTokens} · ` +
              `cache letti ${uso.cacheLetti} · scritti ${uso.cacheScritti} · ` +
              `costo stimato ${costo === null ? 'n.d.' : `${costo.toFixed(2)} €`}`,
            );
            // Debug locale opzionale: le righe incriminate finiscono in un file
            // DENTRO diete/ (gitignored, stessa classe di riservatezza dei dati) —
            // mai stampate. Serve a distinguere invenzione vera da ground truth
            // incompleto senza violare la regola contatori-soltanto del report.
            if (righeFabbricate.length > 0 && process.env.EVAL_IMPORT_DEBUG) {
              writeFileSync(
                join(DIR_DIETE, 'estrazioni/debug-eval.json'),
                JSON.stringify({ dieta: caso.dieta, set: caso.set, modello, pipeline, righeFabbricate, grezzo: risultato.grezzo }, null, 1),
              );
            }
            // Il caso entra nel report PRIMA del gate: una fabbricazione deve comparire in tabella, non sparire.
            casiEval.push({ dieta: caso.dieta, set: caso.set, modello, pipeline, durataS, ...metriche, uso });
            // Gate duro anti-fabbricazione: una quantità inventata non marcata è il difetto
            // che l'intero formato esiste per impedire.
            expect(metriche.fabbricate).toBe(0);
          });
        }
      }
    }
  });

  afterAll(() => {
    if (casiEval.length === 0) return;
    const adesso = new Date();
    const due = (n: number) => String(n).padStart(2, '0');
    const marca = `${adesso.getFullYear()}${due(adesso.getMonth() + 1)}${due(adesso.getDate())}-${due(adesso.getHours())}${due(adesso.getMinutes())}`;
    const dir = join(DIR_DIETE, 'estrazioni');
    mkdirSync(dir, { recursive: true });
    const percorso = join(dir, `report-${marca}.md`);
    writeFileSync(percorso, formattaReport(casiEval, adesso));
    console.log(`\nReport (${casiEval.length} casi): ${percorso}`);
  });
});
