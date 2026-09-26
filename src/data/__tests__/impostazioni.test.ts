import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Impostazioni, MealSlotDef } from '@/domain/types';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { MAX_PORZIONI, MIN_PORZIONI, leggiImpostazioni, salvaImpostazioni, salvaSlotDefs } from '../impostazioni';
import { MAX_PASTI, MIN_PASTI } from '@/domain/pasti';

// L'id che finisce in `user_id` non viene più da `auth.getUser` sul client
// finto ma da `idCasa()` (l'account della casa): lo stesso valore di prima,
// così i payload attesi non cambiano.
beforeEach(() => {
  vi.mocked(idCasa).mockReset();
  vi.mocked(idCasa).mockResolvedValue('user-1');
});

function pasto(i: number): MealSlotDef {
  return { id: `p-${i}`, nome: `Pasto ${i}`, posizione: i, assenzeAbituali: Array(7).fill(false) };
}

function pasti(n: number): MealSlotDef[] {
  return Array.from({ length: n }, (_, i) => pasto(i));
}

/** Registra l'ultimo payload passato a upsert, tabella per tabella. */
function creaClientMock() {
  const upsert: Record<string, unknown[]> = {};
  function from(tabella: string) {
    const proxy: Record<string, unknown> = {
      select: () => proxy,
      eq: () => proxy,
      in: () => proxy,
      delete: () => proxy,
      upsert: (payload: unknown) => {
        (upsert[tabella] ??= []).push(payload);
        return proxy;
      },
      then(onFulfilled: (v: unknown) => unknown) {
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      },
    };
    return proxy;
  }
  return {
    sb: { from },
    upsert,
  };
}

const BASE: Impostazioni = {
  moltiplicatorePorzioni: 1,
  ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
  settimaneCiclo: 1,
  cicloOrigine: null,
  giorniControllo: 90,
};

describe('salvaSlotDefs — quanti pasti si possono avere', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('il massimo è sei: il piano di Andrea ha due spuntini distinti', () => {
    expect(MAX_PASTI).toBe(6);
    expect(MIN_PASTI).toBe(3);
  });

  it('accetta sei pasti', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await salvaSlotDefs(pasti(6));
    expect(upsert['meal_slot_def']).toHaveLength(1);
  });

  it('rifiuta sette pasti senza scrivere niente', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(salvaSlotDefs(pasti(7))).rejects.toThrow(/da 3 a 6/);
    // Il controllo viene prima di qualunque scrittura: rifiutare a metà
    // lavoro lascerebbe i pasti peggio di come stavano.
    expect(upsert['meal_slot_def']).toBeUndefined();
  });

  it('rifiuta due pasti', async () => {
    const { sb } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(salvaSlotDefs(pasti(2))).rejects.toThrow(/da 3 a 6/);
  });
});

/**
 * Un client finto che ricorda le cancellazioni: `select` risponde con le
 * righe della casa sul server (`esistenti`), `delete().in(...)` registra gli
 * id cancellati.
 */
function creaClientConServer(esistenti: string[]) {
  const cancellati: string[][] = [];
  const letture: string[] = [];
  const upsert: unknown[] = [];
  function from(tabella: string) {
    let cancella = false;
    const proxy: Record<string, unknown> = {
      select: () => { letture.push(tabella); return proxy; },
      eq: () => proxy,
      in: (_colonna: string, ids: string[]) => { if (cancella) cancellati.push(ids); return proxy; },
      delete: () => { cancella = true; return proxy; },
      upsert: (payload: unknown) => { upsert.push(payload); return proxy; },
      then(onFulfilled: (v: unknown) => unknown) {
        return Promise.resolve({ data: esistenti.map((id) => ({ id })), error: null }).then(onFulfilled);
      },
    };
    return proxy;
  }
  return { sb: { from }, cancellati, letture, upsert };
}

describe('salvaSlotDefs — cosa si cancella (review finale I4)', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('senza soloTolti cancella ogni pasto del server che non è nell\'elenco, come prima', async () => {
    const finto = creaClientConServer(['p-0', 'p-1', 'p-2', 'dell-altro']);
    vi.mocked(client).mockReturnValue(finto.sb as never);
    await salvaSlotDefs(pasti(3));
    expect(finto.cancellati).toEqual([['dell-altro']]);
  });

  it('con soloTolti un pasto del server che il client non conosce sopravvive', async () => {
    const finto = creaClientConServer(['p-0', 'p-1', 'p-2', 'dell-altro']);
    vi.mocked(client).mockReturnValue(finto.sb as never);
    await salvaSlotDefs(pasti(3), { soloTolti: [] });
    expect(finto.cancellati).toEqual([]);
    expect(finto.letture).toEqual([]);
    expect(finto.upsert).toHaveLength(1);
  });

  it('con soloTolti si cancella solo il pasto tolto esplicitamente', async () => {
    const finto = creaClientConServer(['p-0', 'p-1', 'p-2', 'p-3', 'dell-altro']);
    vi.mocked(client).mockReturnValue(finto.sb as never);
    await salvaSlotDefs(pasti(3), { soloTolti: ['p-3'] });
    expect(finto.cancellati).toEqual([['p-3']]);
  });

  it('con soloTolti un id che è ancora nell\'elenco non si cancella', async () => {
    const finto = creaClientConServer(['p-0', 'p-1', 'p-2']);
    vi.mocked(client).mockReturnValue(finto.sb as never);
    await salvaSlotDefs(pasti(3), { soloTolti: ['p-1'] });
    expect(finto.cancellati).toEqual([]);
  });

  it('con soloTolti il vincolo da 3 a 6 si controlla comunque per primo', async () => {
    const finto = creaClientConServer(['p-0', 'p-1', 'p-2', 'p-3']);
    vi.mocked(client).mockReturnValue(finto.sb as never);
    await expect(salvaSlotDefs(pasti(2), { soloTolti: ['p-2', 'p-3'] })).rejects.toThrow(/da 3 a 6/);
    await expect(salvaSlotDefs(pasti(7), { soloTolti: [] })).rejects.toThrow(/da 3 a 6/);
    expect(finto.cancellati).toEqual([]);
    expect(finto.upsert).toEqual([]);
  });
});

describe('salvaImpostazioni — l\'origine del ciclo', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  async function scritto(i: Impostazioni) {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await salvaImpostazioni(i);
    return upsert['settings'][0] as Record<string, unknown>;
  }

  it('accendere il ciclo senza origine lo àncora al lunedì di questa settimana', async () => {
    // Un ciclo di più settimane senza origine non saprebbe da dove contare.
    const riga = await scritto({ ...BASE, settimaneCiclo: 2, cicloOrigine: null });
    expect(riga.settimane_ciclo).toBe(2);
    expect(riga.ciclo_origine).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('un\'origine già scelta non viene riscritta', async () => {
    const riga = await scritto({ ...BASE, settimaneCiclo: 3, cicloOrigine: '2026-08-31' });
    expect(riga.ciclo_origine).toBe('2026-08-31');
  });

  it('spegnere il ciclo conserva l\'origine: riaccendendolo il giro riprende da dov\'era', async () => {
    const riga = await scritto({ ...BASE, settimaneCiclo: 1, cicloOrigine: '2026-08-31' });
    expect(riga.settimane_ciclo).toBe(1);
    expect(riga.ciclo_origine).toBe('2026-08-31');
  });
});

// Review di sicurezza dell'11/09: "Per quante persone cucini" era vincolato
// 1–4 solo dallo stepper in pagina, mentre la colonna ammette 1–6. Il tetto
// vive qui, dove si scrive, e la pagina lo importa.
describe('salvaImpostazioni — per quante persone', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('il tetto è 4 e il minimo 1, come lo stepper della pagina', () => {
    expect(MIN_PORZIONI).toBe(1);
    expect(MAX_PORZIONI).toBe(4);
  });

  it('accetta 1 e 4', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await salvaImpostazioni({ ...BASE, moltiplicatorePorzioni: 1 });
    await salvaImpostazioni({ ...BASE, moltiplicatorePorzioni: 4 });
    expect(upsert['settings']).toHaveLength(2);
  });

  it.each([0, 5, 6, 2.5, NaN, Infinity])('rifiuta %s senza scrivere niente', async (persone) => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(salvaImpostazioni({ ...BASE, moltiplicatorePorzioni: persone })).rejects.toThrow('persone non valide');
    expect(upsert['settings']).toBeUndefined();
    // Il controllo viene prima di qualunque accesso al server.
    expect(idCasa).not.toHaveBeenCalled();
  });
});

/**
 * Un client finto per la sola lettura di settings: `select → eq →
 * maybeSingle` risponde con la riga data, e registra la stringa della select.
 */
function clientConRiga(riga: Record<string, unknown> | null) {
  const colonne: string[] = [];
  const proxy: Record<string, unknown> = {
    select: (c: string) => { colonne.push(c); return proxy; },
    eq: () => proxy,
    maybeSingle: () => Promise.resolve({ data: riga, error: null }),
  };
  return { sb: { from: () => proxy }, colonne };
}

const RIGA = {
  moltiplicatore_porzioni: 2,
  ordine_aree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
  settimane_ciclo: 1,
  ciclo_origine: null,
};

describe('leggiImpostazioni — la cadenza dei controlli (spec fase 5 §E.1)', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('chiede la colonna giorni_controllo', async () => {
    const { sb, colonne } = clientConRiga({ ...RIGA, giorni_controllo: 60 });
    vi.mocked(client).mockReturnValue(sb as never);
    await leggiImpostazioni();
    expect(colonne[0]).toContain('giorni_controllo');
  });

  it('legge la cadenza salvata', async () => {
    const { sb } = clientConRiga({ ...RIGA, giorni_controllo: 30 });
    vi.mocked(client).mockReturnValue(sb as never);
    expect((await leggiImpostazioni()).giorniControllo).toBe(30);
  });

  it('senza riga settings vale il default, 90', async () => {
    const { sb } = clientConRiga(null);
    vi.mocked(client).mockReturnValue(sb as never);
    expect((await leggiImpostazioni()).giorniControllo).toBe(90);
  });

  it.each([45, 0, null, undefined, '30'])('un valore fuori dalle tre cadenze (%s) vale il default', async (v) => {
    const { sb } = clientConRiga({ ...RIGA, giorni_controllo: v });
    vi.mocked(client).mockReturnValue(sb as never);
    expect((await leggiImpostazioni()).giorniControllo).toBe(90);
  });
});

describe('salvaImpostazioni — la cadenza dei controlli (spec fase 5 §E.1)', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it.each([30, 60, 90] as const)('scrive giorni_controllo = %i', async (g) => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await salvaImpostazioni({ ...BASE, giorniControllo: g });
    expect((upsert['settings'][0] as Record<string, unknown>).giorni_controllo).toBe(g);
  });

  it.each([0, 45, 91, 30.5, NaN])('rifiuta %s senza scrivere niente', async (g) => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(salvaImpostazioni({ ...BASE, giorniControllo: g as never })).rejects.toThrow('cadenza non valida');
    expect(upsert['settings']).toBeUndefined();
    // Come per le persone: il controllo viene prima di qualunque accesso al server.
    expect(idCasa).not.toHaveBeenCalled();
  });
});
