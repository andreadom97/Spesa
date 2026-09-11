// Route handler server-side: Request/Response nativi di undici, niente jsdom
// (ambiente di default in vitest.config.ts) — come per /api/import/estrai.
/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getUserMock, createServerClientMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  createServerClientMock: vi.fn(),
}));
vi.mock('@supabase/ssr', () => ({ createServerClient: createServerClientMock }));

import { GET } from '../route';

const EAN = '8076800195057';
const fetchMock = vi.fn();

function chiama(ean = EAN): Promise<Response> {
  return GET(new NextRequest(`http://x/api/prodotto/${ean}`), { params: Promise.resolve({ ean }) });
}

/** Una risposta di OFF: il corpo JSON con lo status HTTP dato. */
function rispostaOFF(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

const PRODOTTO = { status: 1, product: { product_name: 'Spaghetti n. 5', brands: 'Barilla', quantity: '500 g' } };

describe('GET /api/prodotto/[ean]', () => {
  let erroreSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    createServerClientMock.mockReset();
    createServerClientMock.mockImplementation(() => ({ auth: { getUser: getUserMock } }));
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    erroreSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://sb';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    erroreSpy.mockRestore();
  });

  it('ean non valido → 400, senza toccare né la sessione né OFF', async () => {
    const res = await chiama('12ab');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ errore: 'codice non valido' });
    expect(getUserMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('senza utente → 401, senza chiamare OFF', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'no' } });
    const res = await chiama();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ errore: 'non autenticato' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('il client Supabase legge i cookie della richiesta', async () => {
    fetchMock.mockResolvedValue(rispostaOFF(PRODOTTO));
    const req = new NextRequest(`http://x/api/prodotto/${EAN}`, { headers: { cookie: 'sb-token=abc' } });
    await GET(req, { params: Promise.resolve({ ean: EAN }) });
    expect(createServerClientMock).toHaveBeenCalledWith('http://sb', 'anon', expect.objectContaining({ cookies: expect.anything() }));
    const opzioni = createServerClientMock.mock.calls[0]![2] as { cookies: { getAll: () => { name: string; value: string }[] } };
    expect(opzioni.cookies.getAll()).toEqual([{ name: 'sb-token', value: 'abc' }]);
  });

  it('OFF status 1 → trovato con nome, marca e quantità analizzata', async () => {
    fetchMock.mockResolvedValue(rispostaOFF(PRODOTTO));
    const res = await chiama();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      trovato: true,
      nome: 'Spaghetti n. 5',
      marca: 'Barilla',
      quantita: { valore: 500, unita: 'g' },
    });
  });

  it('la URL chiamata porta l\'ean e i fields; l\'header User-Agent è presente; la fetch va in data cache per un giorno', async () => {
    fetchMock.mockResolvedValue(rispostaOFF(PRODOTTO));
    await chiama();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit & { next?: { revalidate?: number } }];
    expect(url).toBe(`https://world.openfoodfacts.org/api/v2/product/${EAN}.json?fields=product_name,brands,quantity,product_quantity,product_quantity_unit`);
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^Spesa\//);
    // Cache per URL = per codice: nessun dato utente. `cache: 'no-store'` e
    // `revalidate` insieme si annullerebbero a vicenda (docs di fetch).
    expect(init.next).toEqual({ revalidate: 86400 });
    expect(init.cache).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('i 200 portano Cache-Control private per un giorno; gli errori no', async () => {
    fetchMock.mockResolvedValue(rispostaOFF(PRODOTTO));
    expect((await chiama()).headers.get('Cache-Control')).toBe('private, max-age=86400');

    fetchMock.mockResolvedValue(rispostaOFF({ status: 0 }));
    expect((await chiama()).headers.get('Cache-Control')).toBe('private, max-age=86400');

    fetchMock.mockResolvedValue(rispostaOFF({ status: 0 }, 404));
    expect((await chiama()).headers.get('Cache-Control')).toBe('private, max-age=86400');

    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    expect((await chiama()).headers.get('Cache-Control')).toBeNull();
    expect((await chiama('12ab')).headers.get('Cache-Control')).toBeNull();
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'no' } });
    expect((await chiama()).headers.get('Cache-Control')).toBeNull();
  });

  it('nome e marca: trim e taglio a 80 caratteri; vuoti se assenti', async () => {
    fetchMock.mockResolvedValue(rispostaOFF({ status: 1, product: { product_name: '  ' + 'a'.repeat(200) + '  ', quantity: '1 L' } }));
    const corpo = await (await chiama()).json();
    expect(corpo.nome).toBe('a'.repeat(80));
    expect(corpo.marca).toBe('');
    expect(corpo.quantita).toEqual({ valore: 1000, unita: 'ml' });
  });

  it('i campi della quantità entrano tagliati: il testo oltre 80 caratteri non si legge', async () => {
    // Senza il taglio "500 g" in coda a 80 caratteri di rumore verrebbe letto;
    // con il taglio il testo che arriva ad analizzaQuantitaOFF è solo il rumore.
    fetchMock.mockResolvedValue(rispostaOFF({ status: 1, product: { product_name: 'Cosa', quantity: 'x'.repeat(80) + ' 500 g' } }));
    expect((await (await chiama()).json()).quantita).toBeNull();
  });

  it('product_quantity: una stringa si taglia, un numero finito si tiene, Infinity no', async () => {
    fetchMock.mockResolvedValue(rispostaOFF({ status: 1, product: { product_name: 'Cosa', product_quantity: 500, product_quantity_unit: 'g' } }));
    expect((await (await chiama()).json()).quantita).toEqual({ valore: 500, unita: 'g' });

    fetchMock.mockResolvedValue(rispostaOFF({ status: 1, product: { product_name: 'Cosa', product_quantity: ' 250 ', product_quantity_unit: ' kg ' } }));
    expect((await (await chiama()).json()).quantita).toEqual({ valore: 250_000, unita: 'g' });

    // JSON non porta Infinity: qui arriva come stringa, e Number('Infinity') non è finito.
    fetchMock.mockResolvedValue(rispostaOFF({ status: 1, product: { product_name: 'Cosa', product_quantity: 'Infinity', product_quantity_unit: 'g', quantity: '1 L' } }));
    expect((await (await chiama()).json()).quantita).toEqual({ valore: 1000, unita: 'ml' });
  });

  it('campi della quantità di 50.000 caratteri: risponde in meno di 100 ms, senza bloccare l\'event loop', async () => {
    const lungo = '9'.repeat(50_000);
    fetchMock.mockResolvedValue(rispostaOFF({
      status: 1,
      product: { product_name: 'Cosa', quantity: lungo, product_quantity: lungo, product_quantity_unit: 'g'.repeat(50_000) },
    }));
    const inizio = performance.now();
    const corpo = await (await chiama()).json();
    expect(performance.now() - inizio).toBeLessThan(100);
    expect(corpo).toEqual({ trovato: true, nome: 'Cosa', marca: '', quantita: null });
  });

  it('quantità non capita → quantita null, ma trovato', async () => {
    fetchMock.mockResolvedValue(rispostaOFF({ status: 1, product: { product_name: 'Cosa', brands: 'X', quantity: 'grande' } }));
    expect(await (await chiama()).json()).toEqual({ trovato: true, nome: 'Cosa', marca: 'X', quantita: null });
  });

  it('OFF status 0 → trovato: false', async () => {
    fetchMock.mockResolvedValue(rispostaOFF({ status: 0, status_verbose: 'product not found' }));
    const res = await chiama();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trovato: false });
  });

  it('OFF senza product → trovato: false', async () => {
    fetchMock.mockResolvedValue(rispostaOFF({ status: 1 }));
    expect(await (await chiama()).json()).toEqual({ trovato: false });
  });

  it('OFF 404 → trovato: false', async () => {
    fetchMock.mockResolvedValue(rispostaOFF({ status: 0 }, 404));
    const res = await chiama();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trovato: false });
    expect(erroreSpy).not.toHaveBeenCalled();
  });

  it('OFF 500 → 502', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const res = await chiama();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ errore: 'servizio non raggiungibile' });
  });

  it('fetch che rigetta (timeout) → 502 e un log senza il codice a barre', async () => {
    fetchMock.mockRejectedValue(new DOMException('timeout', 'AbortError'));
    const res = await chiama();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ errore: 'servizio non raggiungibile' });
    expect(erroreSpy).toHaveBeenCalledTimes(1);
    const messaggio = erroreSpy.mock.calls[0]!.map(String).join(' ');
    expect(messaggio).not.toContain(EAN);
    expect(messaggio).toContain('AbortError');
  });

  it('corpo di OFF non JSON → 502', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }));
    expect((await chiama()).status).toBe(502);
  });

  it('nessun log fuori dal ramo 502', async () => {
    fetchMock.mockResolvedValue(rispostaOFF(PRODOTTO));
    await chiama();
    await chiama('12ab');
    expect(erroreSpy).not.toHaveBeenCalled();
  });
});
