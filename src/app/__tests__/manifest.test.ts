import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(readFileSync(path.resolve(__dirname, '../../../public/manifest.json'), 'utf8'));

describe('manifest della PWA', () => {
  it('l\'app parte da Oggi', () => {
    expect(manifest.start_url).toBe('/oggi');
  });

  it('l\'id resta quello calcolato dalle installazioni di prima (il vecchio start_url): senza id, cambiare lo start_url cambia l\'identità', () => {
    expect(manifest.id).toBe('/lista');
  });
});
