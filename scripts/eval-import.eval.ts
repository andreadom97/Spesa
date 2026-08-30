import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { describe, it, expect } from 'vitest';
import { estraiPiano, type FileEstrazione } from '../src/server/import-ai';
import { validaEsito } from '../src/domain/import/valida';
import { normalizza } from '../src/domain/import/mapping';
import type { PianoEstratto, RigaEstratta } from '../src/domain/import/types';

// Override per misurare set alternativi (es. le stesse foto compresse come
// fa la Camera): il default resta la dieta 6 originale.
const DIR_FOTO = process.env.EVAL_IMPORT_DIR_FOTO ?? join(process.cwd(), 'diete/Dieta 6');
const GROUND_TRUTH = join(process.cwd(), 'diete/estrazioni/piani/dieta6.json');
const MODELLI = (process.env.EVAL_IMPORT_MODELLI ?? 'claude-sonnet-5').split(',').map((m) => m.trim()).filter(Boolean);

const pronto = Boolean(process.env.ANTHROPIC_API_KEY) && existsSync(DIR_FOTO) && existsSync(GROUND_TRUTH);

function tutteLeRighe(piano: PianoEstratto): RigaEstratta[] {
  return piano.settimane.flatMap((s) =>
    s.giorni.flatMap((g) =>
      g.pasti.flatMap((p) =>
        p.piatti.flatMap((pi) => [...pi.righeFisse, ...pi.componenti.flatMap((c) => c.opzioni.flat())]),
      ),
    ),
  );
}

describe('eval estrattore', () => {
  it.skipIf(pronto)('NON ESEGUITO: servono ANTHROPIC_API_KEY e la cartella diete/ locale', () => {
    console.log('\nEval NON ESEGUITO: esporta ANTHROPIC_API_KEY (e opzionalmente EVAL_IMPORT_MODELLI) su una macchina con diete/ e rilancia `npm run eval:import`.');
    expect(true).toBe(true);
  });

  // ATTENZIONE: il corpo di un describe.skipIf viene comunque ESEGUITO in fase
  // di collezione — le letture da disco vivono in queste funzioni, chiamate
  // solo dentro gli it (che con lo skip non girano mai).
  function caricaFoto(): FileEstrazione[] {
    return readdirSync(DIR_FOTO)
      .filter((f) => ['.jpeg', '.jpg', '.png'].includes(extname(f).toLowerCase()))
      .sort()
      .map((f) => ({
        tipo: 'immagine' as const,
        mime: extname(f).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg',
        base64: readFileSync(join(DIR_FOTO, f)).toString('base64'),
      }));
  }
  function caricaVerita(): { righeVere: RigaEstratta[]; quantitaVere: Map<string, Set<number | null>>; piano: PianoEstratto } {
    const veritaEsito = validaEsito(JSON.parse(readFileSync(GROUND_TRUTH, 'utf-8')));
    if (veritaEsito.tipo !== 'piano') throw new Error('ground truth inatteso: non è un piano');
    const righeVere = tutteLeRighe(veritaEsito.piano);
    // alimento normalizzato -> insieme delle quantità che il ground truth conosce per quell'alimento
    const quantitaVere = new Map<string, Set<number | null>>();
    for (const r of righeVere) {
      const k = normalizza(r.alimento);
      const s = quantitaVere.get(k) ?? new Set<number | null>();
      s.add(r.quantita);
      quantitaVere.set(k, s);
    }
    return { righeVere, quantitaVere, piano: veritaEsito.piano };
  }

  describe.skipIf(!pronto)('dieta 6 vs ground truth', () => {
    for (const modello of MODELLI) {
      it(`modello ${modello}`, async () => {
        const files = caricaFoto();
        const { righeVere, quantitaVere, piano: pianoVero } = caricaVerita();
        const inizio = Date.now();
        let grezzo: unknown;
        try {
          grezzo = await estraiPiano(files, modello);
        } catch (err) {
          console.log(`\n[${modello}] CHIAMATA FALLITA: ${err instanceof Error ? err.constructor.name : 'errore'}`);
          throw err; // mai passare a vuoto: una chiamata fallita è un fallimento dell'eval
        }
        const durata = ((Date.now() - inizio) / 1000).toFixed(1);
        const esito = validaEsito(grezzo); // gate duro: lancia se l'estrazione non è valida
        if (esito.tipo !== 'piano') throw new Error(`[${modello}] esito rifiuto su una dieta con menu`);

        const righe = tutteLeRighe(esito.piano);
        let abbinate = 0, quantitaEsatte = 0, fabbricate = 0, inferite = 0, estranei = 0;
        const righeFabbricate: RigaEstratta[] = [];
        const vistiVeri = new Set(righeVere.map((r) => normalizza(r.alimento)));
        const vistiEstratti = new Set<string>();
        for (const r of righe) {
          const k = normalizza(r.alimento);
          vistiEstratti.add(k);
          if (r.quantitaInferita) inferite += 1;
          const vere = quantitaVere.get(k);
          if (!vere) {
            estranei += 1;
            continue;
          }
          if (r.quantita !== null && !r.quantitaInferita && !vere.has(r.quantita)) {
            fabbricate += 1;
            righeFabbricate.push(r);
          }
          if (r.quantita !== null && vere.has(r.quantita)) quantitaEsatte += 1;
        }
        for (const k of vistiVeri) if (vistiEstratti.has(k)) abbinate += 1;

        console.log(
          `\n[${modello}] durata ${durata}s · archetipo ${esito.piano.archetipo} · ` +
          `settimane ${esito.piano.settimane.length}/${pianoVero.settimane.length} · ` +
          `alimenti del ground truth abbinati ${abbinate}/${vistiVeri.size} · ` +
          `alimenti fuori dal ground truth: ${estranei} · ` +
          `righe con quantità esatta ${quantitaEsatte}/${righe.length} · inferite ${inferite} · ` +
          `QUANTITÀ FABBRICATE: ${fabbricate}`,
        );
        // Debug locale opzionale: le righe incriminate finiscono in un file
        // DENTRO diete/ (gitignored, stessa classe di riservatezza dei dati) —
        // mai stampate. Serve a distinguere invenzione vera da ground truth
        // incompleto senza violare la regola contatori-soltanto del report.
        if (righeFabbricate.length > 0 && process.env.EVAL_IMPORT_DEBUG) {
          writeFileSync(
            join(process.cwd(), 'diete/estrazioni/debug-eval.json'),
            JSON.stringify({ modello, righeFabbricate, grezzo }, null, 1),
          );
        }
        // Gate duro anti-fabbricazione: una quantità inventata non marcata è il difetto
        // che l'intero formato esiste per impedire.
        expect(fabbricate).toBe(0);
      });
    }
  });
});
