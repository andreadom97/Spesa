// Route handler server-side: FormData/File nativi (undici) confliggono con quelli
// polyfillati da jsdom (ambiente di default in vitest.config.ts).
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { getUserMock, createClientMock, estraiPianoAPagineMock, dividiPdfMock, contaImportRecentiMock, registraImportMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  createClientMock: vi.fn(),
  estraiPianoAPagineMock: vi.fn(),
  dividiPdfMock: vi.fn(),
  contaImportRecentiMock: vi.fn(),
  registraImportMock: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));
vi.mock('@/server/import-ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/import-ai')>()),
  estraiPianoAPagine: estraiPianoAPagineMock,
}));
vi.mock('@/server/pdf-pagine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/pdf-pagine')>()),
  dividiPdf: dividiPdfMock,
}));
vi.mock('@/data/import-uso', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/import-uso')>()),
  contaImportRecenti: contaImportRecentiMock,
  registraImport: registraImportMock,
}));

import { POST, maxDuration } from '../route';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';
import { PianoNonValidoError } from '@/domain/import/valida';
import { PdfIllegibileError, TroppePagineError } from '@/server/pdf-pagine';
import { MODELLO_DEFAULT_IMPORT } from '@/server/import-ai';

const USO = { chiamate: 1, inputTokens: 10, outputTokens: 5, cacheLetti: 0, cacheScritti: 0, durataMs: 1 };
const conUso = (grezzo: unknown) => ({ grezzo, uso: USO });

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

/** Il client costruito con il JWT dell'utente negli header: è quello che deve arrivare a import-uso. */
function clientUtente(): unknown {
  const chiamata = createClientMock.mock.calls.find((c) => c[2]?.global?.headers?.Authorization === 'Bearer tok');
  return chiamata ? createClientMock.mock.results[createClientMock.mock.calls.indexOf(chiamata)]!.value : undefined;
}

describe('POST /api/import/estrai', () => {
  const originale = { ...process.env };
  beforeEach(() => {
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    createClientMock.mockReset();
    createClientMock.mockImplementation(() => ({ auth: { getUser: getUserMock } }));
    estraiPianoAPagineMock.mockReset();
    dividiPdfMock.mockReset();
    dividiPdfMock.mockImplementation(async (bytes: Uint8Array) => [Buffer.from(bytes).toString('base64')]);
    contaImportRecentiMock.mockReset();
    contaImportRecentiMock.mockResolvedValue({ conteggio: 0, piuVecchio: null });
    registraImportMock.mockReset();
    registraImportMock.mockResolvedValue(undefined);
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.IMPORT_MOCK;
    delete process.env.IMPORT_LIMITE_30GG;
    delete process.env.IMPORT_CONCORRENZA;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://sb';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  });
  afterEach(() => {
    for (const nome of ['IMPORT_MOCK', 'ANTHROPIC_API_KEY', 'IMPORT_LIMITE_30GG', 'IMPORT_CONCORRENZA'] as const) {
      if (originale[nome] === undefined) delete process.env[nome];
      else process.env[nome] = originale[nome];
    }
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
    estraiPianoAPagineMock.mockResolvedValue(conUso(FIXTURE_RIFIUTO_MACRO));
    const res = await POST(richiesta({ documento: true }));
    expect(res.status).toBe(200);
    const files = estraiPianoAPagineMock.mock.calls[0]![0];
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

  it("con chiave: estraiPianoAPagine riceve i file base64 e l'esito valido esce 200", async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    estraiPianoAPagineMock.mockResolvedValue(conUso(FIXTURE_RIFIUTO_MACRO));
    const res = await POST(richiesta({ nImmagini: 2 }));
    expect(res.status).toBe(200);
    const files = estraiPianoAPagineMock.mock.calls[0]![0];
    expect(files).toHaveLength(2);
    expect(files[0]).toMatchObject({ tipo: 'immagine', mime: 'image/jpeg' });
    expect(typeof files[0].base64).toBe('string');
  });

  it('con chiave: estraiPianoAPagine che lancia → 502', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    estraiPianoAPagineMock.mockRejectedValue(new Error('rete'));
    const res = await POST(richiesta());
    expect(res.status).toBe(502);
    expect((await res.json()).errore).toBe('estrazione non riuscita, riprova');
  });

  it('con chiave: PianoNonValidoError dalla pipeline (indice o pagina) → 422', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    estraiPianoAPagineMock.mockRejectedValue(new PianoNonValidoError('indice.pagine', 'non contigue'));
    const res = await POST(richiesta({ nImmagini: 3 }));
    expect(res.status).toBe(422);
    expect((await res.json()).errore).toBe('non ho capito la dieta, riprova');
  });

  it('con chiave: esito che non passa validaEsito → 422', async () => {
    process.env.ANTHROPIC_API_KEY = 'k';
    estraiPianoAPagineMock.mockResolvedValue(conUso({ tipo: 'piano', piano: { archetipo: 'boh' } }));
    const res = await POST(richiesta());
    expect(res.status).toBe(422);
    expect((await res.json()).errore).toBe('non ho capito la dieta, riprova');
  });

  describe('tetto per utente', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'k';
      estraiPianoAPagineMock.mockResolvedValue(conUso(FIXTURE_RIFIUTO_MACRO));
    });

    it('sotto il limite: registra PRIMA di contare (pagine = n immagini), poi estrae con la concorrenza configurata', async () => {
      process.env.IMPORT_CONCORRENZA = '2';
      // Il conteggio include la riga appena inserita: 2 vecchie + questa = 3, cioè il limite → passa.
      contaImportRecentiMock.mockResolvedValue({ conteggio: 3, piuVecchio: new Date('2026-08-20T08:00:00Z') });
      const res = await POST(richiesta({ nImmagini: 5 }));
      expect(res.status).toBe(200);

      const sbUtente = clientUtente();
      expect(sbUtente).toBeDefined();
      expect(registraImportMock).toHaveBeenCalledTimes(1);
      expect(registraImportMock).toHaveBeenCalledWith(sbUtente, 'u1', 5, MODELLO_DEFAULT_IMPORT);
      expect(contaImportRecentiMock).toHaveBeenCalledTimes(1);
      expect(contaImportRecentiMock).toHaveBeenCalledWith(sbUtente, 'u1', expect.any(Date));

      expect(estraiPianoAPagineMock).toHaveBeenCalledTimes(1);
      const [files, modello, opzioni] = estraiPianoAPagineMock.mock.calls[0]!;
      expect(files).toHaveLength(5);
      expect(files.every((f: { tipo: string }) => f.tipo === 'immagine')).toBe(true);
      expect(modello).toBe(MODELLO_DEFAULT_IMPORT);
      expect(opzioni).toEqual({ concorrenza: 2 });
      // Registra → conta → modello: la riga si scrive prima del controllo, così due
      // invii concorrenti non passano entrambi sullo stesso slot (si contano i tentativi).
      expect(registraImportMock.mock.invocationCallOrder[0]).toBeLessThan(contaImportRecentiMock.mock.invocationCallOrder[0]!);
      expect(contaImportRecentiMock.mock.invocationCallOrder[0]).toBeLessThan(estraiPianoAPagineMock.mock.invocationCallOrder[0]!);
    });

    it('oltre il limite (conteggio = limite + 1, riga nuova inclusa): 429 con la data del più vecchio + 30 giorni, slot consumato, nessuna chiamata', async () => {
      contaImportRecentiMock.mockResolvedValue({ conteggio: 4, piuVecchio: new Date('2026-08-13T10:00:00Z') });
      const res = await POST(richiesta({ nImmagini: 2 }));
      expect(res.status).toBe(429);
      expect((await res.json()).errore).toBe('hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026');
      expect(registraImportMock).toHaveBeenCalledTimes(1);
      expect(registraImportMock.mock.invocationCallOrder[0]).toBeLessThan(contaImportRecentiMock.mock.invocationCallOrder[0]!);
      expect(estraiPianoAPagineMock).not.toHaveBeenCalled();
      expect(dividiPdfMock).not.toHaveBeenCalled();
    });

    it('IMPORT_LIMITE_30GG=5: conteggio 5 passa, conteggio 6 è 429 col 5 nel messaggio', async () => {
      process.env.IMPORT_LIMITE_30GG = '5';
      contaImportRecentiMock.mockResolvedValue({ conteggio: 5, piuVecchio: new Date('2026-08-13T10:00:00Z') });
      expect((await POST(richiesta({ nImmagini: 2 }))).status).toBe(200);
      contaImportRecentiMock.mockResolvedValue({ conteggio: 6, piuVecchio: new Date('2026-08-13T10:00:00Z') });
      const res = await POST(richiesta({ nImmagini: 2 }));
      expect(res.status).toBe(429);
      expect((await res.json()).errore).toBe('hai già fatto 5 import negli ultimi 30 giorni: il prossimo dal 12/09/2026');
      expect(estraiPianoAPagineMock).toHaveBeenCalledTimes(1);
    });

    it('IMPORT_LIMITE_30GG=0: né conteggio né registrazione, ma si estrae', async () => {
      process.env.IMPORT_LIMITE_30GG = '0';
      const res = await POST(richiesta({ nImmagini: 2 }));
      expect(res.status).toBe(200);
      expect(contaImportRecentiMock).not.toHaveBeenCalled();
      expect(registraImportMock).not.toHaveBeenCalled();
      expect(estraiPianoAPagineMock).toHaveBeenCalledTimes(1);
    });

    it('PDF a 3 pagine: registrazione con pagine 0 (PDF non ancora diviso), poi dividiPdf(byte, 12), tre FileEstrazione tipo pdf', async () => {
      dividiPdfMock.mockResolvedValue(['p1', 'p2', 'p3']);
      const res = await POST(richiesta({ documento: true }));
      expect(res.status).toBe(200);
      expect(registraImportMock).toHaveBeenCalledWith(clientUtente(), 'u1', 0, MODELLO_DEFAULT_IMPORT);
      expect(dividiPdfMock).toHaveBeenCalledTimes(1);
      const [byte, maxPagine] = dividiPdfMock.mock.calls[0]!;
      expect(byte).toBeInstanceOf(Uint8Array);
      expect(Buffer.from(byte).toString()).toBe('pdf');
      expect(maxPagine).toBe(12);
      // La registrazione e il conteggio precedono la divisione: il PDF non si materializza per chi è oltre il tetto.
      expect(registraImportMock.mock.invocationCallOrder[0]).toBeLessThan(dividiPdfMock.mock.invocationCallOrder[0]!);
      expect(contaImportRecentiMock.mock.invocationCallOrder[0]).toBeLessThan(dividiPdfMock.mock.invocationCallOrder[0]!);
      const files = estraiPianoAPagineMock.mock.calls[0]![0];
      expect(files).toEqual([
        { tipo: 'pdf', mime: 'application/pdf', base64: 'p1' },
        { tipo: 'pdf', mime: 'application/pdf', base64: 'p2' },
        { tipo: 'pdf', mime: 'application/pdf', base64: 'p3' },
      ]);
    });

    it('PdfIllegibileError → 400 col messaggio della spec; lo slot è già consumato', async () => {
      dividiPdfMock.mockRejectedValue(new PdfIllegibileError());
      const res = await POST(richiesta({ documento: true }));
      expect(res.status).toBe(400);
      expect((await res.json()).errore).toBe('il PDF non si apre: prova con le foto');
      expect(registraImportMock).toHaveBeenCalledTimes(1);
      expect(estraiPianoAPagineMock).not.toHaveBeenCalled();
    });

    it('TroppePagineError da dividiPdf → 413 col messaggio delle pagine; lo slot è già consumato', async () => {
      dividiPdfMock.mockRejectedValue(new TroppePagineError(13));
      const res = await POST(richiesta({ documento: true }));
      expect(res.status).toBe(413);
      expect((await res.json()).errore).toBe('troppe pagine: la v1 accetta fino a 12 foto');
      expect(registraImportMock).toHaveBeenCalledTimes(1);
      expect(estraiPianoAPagineMock).not.toHaveBeenCalled();
    });

    it('PDF oltre il tetto: 429 senza mai dividere il PDF', async () => {
      contaImportRecentiMock.mockResolvedValue({ conteggio: 4, piuVecchio: new Date('2026-08-13T10:00:00Z') });
      const res = await POST(richiesta({ documento: true }));
      expect(res.status).toBe(429);
      expect(registraImportMock).toHaveBeenCalledWith(clientUtente(), 'u1', 0, MODELLO_DEFAULT_IMPORT);
      expect(dividiPdfMock).not.toHaveBeenCalled();
      expect(estraiPianoAPagineMock).not.toHaveBeenCalled();
    });

    it('Supabase che fallisce su registraImport → 502, nessun conteggio né chiamata al modello', async () => {
      registraImportMock.mockRejectedValue({ message: 'connessione rifiutata', code: '08001' });
      const res = await POST(richiesta({ nImmagini: 2 }));
      expect(res.status).toBe(502);
      expect((await res.json()).errore).toBe('estrazione non riuscita, riprova');
      expect(contaImportRecentiMock).not.toHaveBeenCalled();
      expect(estraiPianoAPagineMock).not.toHaveBeenCalled();
    });

    it('Supabase che fallisce su contaImportRecenti → 502, nessuna chiamata al modello', async () => {
      contaImportRecentiMock.mockRejectedValue({ message: 'connessione rifiutata', code: '08001' });
      const res = await POST(richiesta({ nImmagini: 2 }));
      expect(res.status).toBe(502);
      expect(registraImportMock).toHaveBeenCalledTimes(1);
      expect(estraiPianoAPagineMock).not.toHaveBeenCalled();
    });
  });

  it('ramo mock e 503: né conteggio né registrazione', async () => {
    process.env.IMPORT_MOCK = 'sintetico';
    expect((await POST(richiesta({ nImmagini: 2 }))).status).toBe(200);
    delete process.env.IMPORT_MOCK;
    expect((await POST(richiesta({ nImmagini: 2 }))).status).toBe(503);
    expect(contaImportRecentiMock).not.toHaveBeenCalled();
    expect(registraImportMock).not.toHaveBeenCalled();
    expect(dividiPdfMock).not.toHaveBeenCalled();
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
