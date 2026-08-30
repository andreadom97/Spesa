// Route handler server-side, come api/import/estrai: ambiente node.
/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { interpretaNotaMock, getUserMock } = vi.hoisted(() => ({
  interpretaNotaMock: vi.fn(),
  getUserMock: vi.fn(),
}));
vi.mock('@/server/dispensa-ai', () => ({
  interpretaNota: interpretaNotaMock,
  modelloConfigurato: () => 'claude-haiku-4-5',
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: getUserMock } }),
}));

import { POST } from '../route';

const CONTESTO = [
  { id: 'i-riso', nome: 'Riso', unitaBase: 'g', formatoConfezione: 1000, residuo: 400, congelato: false },
];

function richiesta(body: unknown, token: string | null = 'jwt-valido'): Request {
  return new Request('http://localhost/api/dispensa/correggi', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/dispensa/correggi', () => {
  beforeEach(() => {
    interpretaNotaMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.DISPENSA_AI_MOCK;
  });

  it('senza Bearer → 401', async () => {
    const res = await POST(richiesta({ nota: 'x', contesto: CONTESTO }, null));
    expect(res.status).toBe(401);
    expect((await res.json()).errore).toBe('non autorizzato');
  });

  it('token rifiutato da Supabase → 401', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const res = await POST(richiesta({ nota: 'x', contesto: CONTESTO }));
    expect(res.status).toBe(401);
  });

  it('body senza nota o contesto → 400', async () => {
    const res = await POST(richiesta({ contesto: CONTESTO }));
    expect(res.status).toBe(400);
    expect((await res.json()).errore).toBe('richiesta non valida');
  });

  it('body JSON null → 400', async () => {
    const res = await POST(richiesta(null));
    expect(res.status).toBe(400);
    expect((await res.json()).errore).toBe('richiesta non valida');
  });

  it('nota oltre 2000 caratteri → 400', async () => {
    const res = await POST(richiesta({ nota: 'x'.repeat(2001), contesto: CONTESTO }));
    expect(res.status).toBe(400);
    expect((await res.json()).errore).toBe('richiesta non valida');
  });

  it('contesto oltre 500 voci → 400', async () => {
    const contestoGonfiato = Array.from({ length: 501 }, (_, i) => ({
      id: `i-${i}`, nome: `Voce ${i}`, unitaBase: 'g', formatoConfezione: 1000, residuo: 400, congelato: false,
    }));
    const res = await POST(richiesta({ nota: 'x', contesto: contestoGonfiato }));
    expect(res.status).toBe(400);
    expect((await res.json()).errore).toBe('richiesta non valida');
  });

  it('senza chiave e senza flag mock → 503', async () => {
    const res = await POST(richiesta({ nota: 'finito il riso', contesto: CONTESTO }));
    expect(res.status).toBe(503);
    expect((await res.json()).errore).toBe('correzione non disponibile');
  });

  it('DISPENSA_AI_MOCK=1 → interprete a regole, esito validato', async () => {
    process.env.DISPENSA_AI_MOCK = '1';
    const res = await POST(richiesta({ nota: 'finito il riso', contesto: CONTESTO }));
    expect(res.status).toBe(200);
    const esito = await res.json();
    expect(esito.proposte[0]).toMatchObject({ ingredientId: 'i-riso', valoreNuovo: 0, valoreAttuale: 400 });
    expect(interpretaNotaMock).not.toHaveBeenCalled();
  });

  it('con la chiave la chiamata vera batte il mock, col modello configurato', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-non-vera';
    process.env.DISPENSA_AI_MOCK = '1';
    interpretaNotaMock.mockResolvedValue({ proposte: [], nonRiconosciuti: ['boh'] });

    const res = await POST(richiesta({ nota: 'boh', contesto: CONTESTO }));

    expect(res.status).toBe(200);
    expect(interpretaNotaMock).toHaveBeenCalledWith('boh', CONTESTO, 'claude-haiku-4-5');
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('esito malformato del modello → 422', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-non-vera';
    interpretaNotaMock.mockResolvedValue({ proposte: [{ ingredientId: 'i-fantasma' }], nonRiconosciuti: [] });
    const res = await POST(richiesta({ nota: 'x', contesto: CONTESTO }));
    expect(res.status).toBe(422);
    expect((await res.json()).errore).toBe('non ho capito la nota, riprova');
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('interpretaNota che esplode (rete) → 502', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-non-vera';
    interpretaNotaMock.mockRejectedValue(new Error('rete giù'));
    const res = await POST(richiesta({ nota: 'x', contesto: CONTESTO }));
    expect(res.status).toBe(502);
    expect((await res.json()).errore).toBe('correzione non riuscita, riprova');
    delete process.env.ANTHROPIC_API_KEY;
  });
});
