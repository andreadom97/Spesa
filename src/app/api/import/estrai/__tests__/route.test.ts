// Route handler server-side: FormData/File nativi (undici) confliggono con quelli
// polyfillati da jsdom (ambiente di default in vitest.config.ts) — vedi task-6-report.md.
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';

function richiesta(): Request {
  const fd = new FormData();
  fd.append('immagini', new File(['x'], 'pagina1.jpg', { type: 'image/jpeg' }));
  return new Request('http://localhost/api/import/estrai', { method: 'POST', body: fd });
}

describe('POST /api/import/estrai (mock)', () => {
  const originale = { ...process.env };
  beforeEach(() => { delete process.env.ANTHROPIC_API_KEY; });
  afterEach(() => { process.env.IMPORT_MOCK = originale.IMPORT_MOCK; });

  it('IMPORT_MOCK=sintetico serve il fixture del menu', async () => {
    process.env.IMPORT_MOCK = 'sintetico';
    const res = await POST(richiesta());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(FIXTURE_MENU_SETTIMANALE);
  });

  it('IMPORT_MOCK=rifiuto serve il rifiuto macro', async () => {
    process.env.IMPORT_MOCK = 'rifiuto';
    const res = await POST(richiesta());
    expect(await res.json()).toEqual(FIXTURE_RIFIUTO_MACRO);
  });

  it('fixture su file assente → 503 estrazione non disponibile', async () => {
    process.env.IMPORT_MOCK = 'dieta-inesistente';
    const res = await POST(richiesta());
    expect(res.status).toBe(503);
    expect((await res.json()).errore).toBe('estrazione non disponibile');
  });
});
