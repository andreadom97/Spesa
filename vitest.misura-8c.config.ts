import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Gira solo con `npm run misura:8c`: legge una bozza vera da un percorso locale (dati personali,
// mai in git) e stampa solo contatori. Non entra mai nella suite normale.
export default defineConfig({
  test: {
    include: ['scripts/misura-8c.eval.ts'],
    environment: 'node',
    testTimeout: 600_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
