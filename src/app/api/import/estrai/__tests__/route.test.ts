// Route handler server-side: FormData/File nativi (undici) confliggono con quelli
// polyfillati da jsdom (ambiente di default in vitest.config.ts).
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { getUserMock, estraiPianoMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  estraiPianoMock: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: getUserMock } }),
}));
vi.mock('@/server/import-ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/import-ai')>()),
  estraiPiano: estraiPianoMock,
}));

import { POST, maxDuration } from '../route';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';

function richiesta(opzioni?: { senzaAuth?: boolean; nImmagini?: number; byteImmagine?: number; mime?: string; documento?: boolean; documentoMime?: string }): Request {
  const fd = new FormData();
  if (opzioni?.documento) {
    fd.append('documento', new File(['pdf'], 'dieta.pdf', { type: opzioni?.documentoMime ?? 'application/pdf' }));
  } else {
    const n = opzioni?.nImmagini ?? 1;
    const byte = opzioni?.byteImmagine ?? 3;
    for (let i = 0; i < n; i++) {
      fd.append('immagini', new File(['x'.repeat(byte)], `pagina${i}.jpg`, { type: opzioni?.mime ?? 'image/jpeg' }));
    }
  }
  return new Request('http://localhost/api/import/estrai', {
    method: 'POST',
    body: fd,
    headers: opzioni?.senzaAuth ? {} : { Authorization: 'Bearer tok' },
  });
}

describe('POST /api/import/estrai', () => {
  const originale = { ...process.env };
  beforeEach(() => {
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    estraiPianoMock.mockReset();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.IMPORT_MOCK;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://sb';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  });
  afterEach(() => {
    if (originale.IMPORT_MOCK === undefined) delete process.env.IMPORT_MOCK;
    else process.env.IMPORT_MOCK = originale.IMPORT_MOCK;
    if (originale.ANTHROPIC_API_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originale.ANTHROPIC_API_KEY;
  });

  it('maxDuration esportato a 300', () => {
    expect(maxDuration).toBe(300);
  });

  it('senza Bearer → 401', async () => {
    const res = await POST(richiesta({ senzaAuth: true }));
    expect(res.status).toBe(401);
    expect((await res.json()).errore).toBe('non autorizzato');
  });

  it('token rifiutato da Supabase → 401', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'no' } });
    expect((await POST(richiesta())).status).toBe(401);
  });

  it('FormData senza immagini né documento → 400', async () => {
    const fd = new FormData();
    const res = await POST(new Request('http://localhost/api/import/estrai', { method: 'POST', body: fd, headers: { Authorization: 'Bearer tok' } }));
    expect(res.status).toBe(400);
    expect((await res.json()).errore).toBe('richiesta non valida');
  });

  it('MIME fuori lista → 400', async () => {
    expect((await POST(richiesta({ mime: 'image/gif' }))).status).toBe(400);
  });

  it('documento PDF con wrong MIME → 400', async () => {
    expect((await POST(richiesta({ documento: true, documentoMime: 'application/json' }))).status).toBe(400);
  });

  it('immagini + documento insieme → 400 richiesta non valida', async () => {
    const fd = new FormData();
    fd.append('immagini', new File(['x'], 'pagina.jpg', { type: 'image/jpeg' }));
    fd.append('documento', new File(['pdf'], 'dieta.pdf', { type: 'application/pdf' }));
    const res = await POST(new Request('http://localhost/api/import/estrai', { method: 'POST', body: fd, headers: { Authorization: 'Bearer tok' } }));
    expect(res.status).toBe(400);
    expect((await res.json()).errore).toBe('richiesta non valida');
  });

  it('con chiave: PDF-only → 200 e riceve base64', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    estraiPianoMock.mockResolvedValue(FIXTURE_RIFIUTO_MACRO);
    const res = await POST(richiesta({ documento: true }));
    expect(res.status).toBe(200);
    const files = estraiPianoMock.mock.calls[0]![0];
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ tipo: 'pdf', mime: 'application/pdf' });
    expect(typeof files[0].base64).toBe('string');
  });

  it('13 immagini → 413 col messaggio delle pagine', async () => {
    const res = await POST(richiesta({ nImmagini: 13 }));
    expect(res.status).toBe(413);
    expect((await res.json()).errore).toBe('troppe pagine: la v1 accetta fino a 12 foto');
  });

  it('oltre 4MB totali → 413 col messaggio dei file', async () => {
    const res = await POST(richiesta({ nImmagini: 5, byteImmagine: 900_000 }));
    expect(res.status).toBe(413);
    expect((await res.json()).errore).toBe('file troppo grandi, riprova con foto più leggere');
  });

  it('senza chiave né mock → 503', async () => {
    const res = await POST(richiesta());
    expect(res.status).toBe(503);
    expect((await res.json()).errore).toBe('estrazione non disponibile');
  });

  it("con chiave: estraiPiano riceve i file base64 e l'esito valido esce 200", async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    estraiPianoMock.mockResolvedValue(FIXTURE_RIFIUTO_MACRO);
    const res = await POST(richiesta({ nImmagini: 2 }));
    expect(res.status).toBe(200);
    const files = estraiPianoMock.mock.calls[0]![0];
    expect(files).toHaveLength(2);
    expect(files[0]).toMatchObject({ tipo: 'immagine', mime: 'image/jpeg' });
    expect(typeof files[0].base64).toBe('string');
  });

  it('con chiave: estraiPiano che lancia → 502', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    estraiPianoMock.mockRejectedValue(new Error('rete'));
    const res = await POST(richiesta());
    expect(res.status).toBe(502);
    expect((await res.json()).errore).toBe('estrazione non riuscita, riprova');
  });

  it('con chiave: esito che non passa validaEsito → 422', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    estraiPianoMock.mockResolvedValue({ tipo: 'piano', piano: { archetipo: 'boh' } });
    const res = await POST(richiesta());
    expect(res.status).toBe(422);
    expect((await res.json()).errore).toBe('non ho capito la dieta, riprova');
  });

  it('IMPORT_MOCK=sintetico serve il fixture del menu (senza chiave)', async () => {
    process.env.IMPORT_MOCK = 'sintetico';
    const res = await POST(richiesta());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(FIXTURE_MENU_SETTIMANALE);
  });

  it('IMPORT_MOCK=rifiuto serve il rifiuto macro', async () => {
    process.env.IMPORT_MOCK = 'rifiuto';
    expect(await (await POST(richiesta())).json()).toEqual(FIXTURE_RIFIUTO_MACRO);
  });

  it('IMPORT_MOCK su file assente → 503', async () => {
    process.env.IMPORT_MOCK = 'dieta-inesistente';
    expect((await POST(richiesta())).status).toBe(503);
  });
});
