import { defineConfig } from 'vitest/config';
import path from 'node:path';

// L'harness NON entra mai nella suite normale (spesa denaro vero): gira solo
// con `npm run eval:dispensa`, e senza chiave stampa NON ESEGUITO ed esce.
//
// Niente mergeConfig con ./vitest.config: per gli array (es. `test.include`)
// mergeConfig concatena invece di sostituire, quindi il config di base
// (ambiente jsdom, include di tutta src/**) resterebbe attivo insieme a
// questo e farebbe girare l'intera suite in ambiente node. Si replicano qui
// le sole parti necessarie: l'alias `@` → `./src` (il plugin react non
// serve, l'harness non tocca componenti).
export default defineConfig({
  test: {
    include: ['scripts/eval-dispensa.eval.ts'],
    environment: 'node',
    testTimeout: 120000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
