import { describe, it, expect } from 'vitest';
import { interpretaNota } from '../src/server/dispensa-ai';
import { validaProposte, CONFIDENCE_SOGLIA } from '../src/domain/dispensa-ai';
import { CASI_EVAL, CONTESTO_EVAL } from './eval-dispensa-fixtures';

const MODELLI = (process.env.EVAL_MODELLI ?? 'claude-haiku-4-5').split(',').map((m) => m.trim());

describe('eval dispensa-AI', () => {
  it.skipIf(process.env.ANTHROPIC_API_KEY)('NON ESEGUITO: manca ANTHROPIC_API_KEY', () => {
    console.log('\nEval NON ESEGUITO: esporta ANTHROPIC_API_KEY (e opzionalmente EVAL_MODELLI) e rilancia `npm run eval:dispensa`.');
    expect(true).toBe(true);
  });

  // Niente it.skipIf(...).each(...): il chaining non è garantito da vitest.
  // Un describe condizionale con un for che genera gli it è equivalente e sicuro.
  describe.skipIf(!process.env.ANTHROPIC_API_KEY)('confronto modelli', () => {
    for (const modello of MODELLI) {
      it(`modello ${modello}`, async () => {
        let abbinamentiOk = 0, valoriOk = 0, sbagliateSopraSoglia = 0, invalidi = 0;
        let attesiTotali = 0;

    for (const caso of CASI_EVAL) {
      attesiTotali += caso.attesi.length;
      let esito;
      try {
        esito = validaProposte(await interpretaNota(caso.nota, CONTESTO_EVAL, modello), CONTESTO_EVAL);
      } catch {
        invalidi += 1;
        continue;
      }
      for (const atteso of caso.attesi) {
        const trovata = esito.proposte.find((p) => p.ingredientId === atteso.ingredientId && p.campo === atteso.campo);
        if (trovata) abbinamentiOk += 1;
        if (trovata && trovata.valoreNuovo === atteso.valoreNuovo) valoriOk += 1;
      }
      for (const p of esito.proposte) {
        const attesa = caso.attesi.some((a) => a.ingredientId === p.ingredientId && a.campo === p.campo && a.valoreNuovo === p.valoreNuovo);
        if (!attesa && p.confidence >= CONFIDENCE_SOGLIA) sbagliateSopraSoglia += 1;
      }
    }

        console.log(`\n[${modello}] abbinamenti ${abbinamentiOk}/${attesiTotali} · valori esatti ${valoriOk}/${attesiTotali} · proposte sbagliate SOPRA soglia: ${sbagliateSopraSoglia} · esiti invalidi: ${invalidi}`);
        // L'harness è un report, non un gate: l'unica asserzione dura è la
        // calibrazione — una proposta sbagliata sopra soglia si auto-applica.
        expect(sbagliateSopraSoglia).toBe(0);
      });
    }
  });
});
