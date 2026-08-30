import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Gira solo con `npm run eval:import`: spende denaro vero e legge la cartella
// locale diete/ (dati sanitari, mai in git): non entra mai nella suite normale.
export default defineConfig({
  test: {
    include: ['scripts/eval-import.eval.ts'],
    environment: 'node',
    testTimeout: 600_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
