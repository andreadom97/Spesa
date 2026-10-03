import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../repertorio', () => ({ salvaPiatto: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), salvaImpostazioni: vi.fn() }));
vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { salvaPiatto } from '../repertorio';
import { leggiImpostazioni, salvaImpostazioni } from '../impostazioni';
import { client } from '../supabase';
import { idCasa } from '../casa';
import { eseguiScritture, type AvanzamentoScritture } from '../importa';
import type { PiattoDaCreare, ScrittureImport } from '@/domain/import/commit';

interface Chiamata { tabella: string; op: string; payload: unknown; filtri: unknown[][] }

/**
 * Supabase finto: ogni `from(tabella)` registra una chiamata e il suo `await` la mette in
 * `ordine`; `rpc` registra nome e argomenti. Gli errori si iniettano per tabella o per la RPC.
 */
function fintoSupabase(errori: { rpc?: unknown; tabella?: Record<string, unknown> } = {}) {
  const chiamate: Chiamata[] = [];
  const ordine: string[] = [];
  const rpc = vi.fn(async (nome: string, argomenti?: unknown) => {
    void argomenti; // registrati da vi.fn, controllati con toHaveBeenCalledWith
    ordine.push(`rpc:${nome}`);
    return { data: null, error: errori.rpc ?? null };
  });
  const from = vi.fn((tabella: string) => {
    const voce: Chiamata = { tabella, op: '', payload: undefined, filtri: [] };
    chiamate.push(voce);
    const b: Record<string, unknown> = {};
    b.insert = (p: unknown) => { voce.op = 'insert'; voce.payload = p; return b; };
    b.upsert = (p: unknown) => { voce.op = 'upsert'; voce.payload = p; return b; };
    b.update = (p: unknown) => { voce.op = 'update'; voce.payload = p; return b; };
    b.delete = () => { voce.op = 'delete'; return b; };
    b.eq = (...f: unknown[]) => { voce.filtri.push(['eq', ...f]); return b; };
    b.in = (...f: unknown[]) => { voce.filtri.push(['in', ...f]); return b; };
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => {
      ordine.push(`${tabella}:${voce.op}`);
      return Promise.resolve({ data: null, error: errori.tabella?.[tabella] ?? null }).then(ok, ko);
    };
    return b;
  });
  vi.mocked(client).mockReturnValue({ from, rpc } as never);
  return { chiamate, ordine, rpc };
}

const PIATTO: PiattoDaCreare = {
  riusaDishId: null, nome: 'Pasta al pomodoro', slotDefId: 's-pranzo',
  settimanaCiclo: null, giornoCiclo: null, descrizione: null,
  righe: [{ nuovoAlimento: 'pasta di semola', quantita: 80, unita: 'g' }],
  componenti: [{ nome: 'contorno', opzioni: [[{ nuovoAlimento: 'pasta di semola', quantita: 10, unita: 'g' }], [{ ingredientId: 'i-riso', quantita: 10, unita: 'g' }]] }],
};

const SCRITTURE: ScrittureImport = {
  ingredientiDaCreare: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: 1.2 }],
  cambiUnita: [],
  piattiDaDisattivare: ['d-old'],
  piattiDaCreare: [PIATTO],
  impostazioni: { settimaneCiclo: 1, cicloOrigine: '2026-08-31' },
};

/** `n` piatti che usano solo un ingrediente che c'è già. */
const piatti = (n: number): PiattoDaCreare[] =>
  Array.from({ length: n }, (_, i) => ({ ...PIATTO, nome: `Piatto ${i}`, righe: [{ ingredientId: 'i-riso', quantita: 10, unita: 'g' as const }], componenti: [] }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(idCasa).mockResolvedValue('u1');
  vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');
  vi.mocked(leggiImpostazioni).mockResolvedValue({ moltiplicatorePorzioni: 1, ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90 });
  vi.mocked(salvaImpostazioni).mockResolvedValue();
});

describe('eseguiScritture', () => {
  it('gli ingredienti nuovi in un insert solo, con l\'id scelto qui; la dispensa a zero in blocco; le righe sanno l\'id', async () => {
    const { chiamate } = fintoSupabase();
    await eseguiScritture(SCRITTURE);
    const ingredienti = chiamate.filter((c) => c.tabella === 'ingredient');
    expect(ingredienti).toHaveLength(1);
    const [riga] = ingredienti[0].payload as Record<string, unknown>[];
    expect(riga).toMatchObject({
      user_id: 'u1', nome: 'Pasta', unita_base: 'g', area: 'cereali', classe_residuo: 'porzionabile',
      deperibile: false, formato_confezione: 500, prezzo_confezione: 1.2,
    });
    const id = riga.id as string;
    expect(typeof id).toBe('string');
    expect(chiamate.find((c) => c.tabella === 'pantry_state')).toMatchObject({ op: 'upsert', payload: [{ ingredient_id: id, user_id: 'u1', residuo: 0 }] });
    const piatto = vi.mocked(salvaPiatto).mock.calls[0][0];
    expect(piatto.ingredienti).toEqual([{ ingredientId: id, quantita: 80, unita: 'g' }]);
    expect(piatto.componenti[0].opzioni[0].righe).toEqual([{ ingredientId: id, quantita: 10, unita: 'g' }]);
    expect(piatto.componenti[0].opzioni[1].righe).toEqual([{ ingredientId: 'i-riso', quantita: 10, unita: 'g' }]);
    expect(piatto).toMatchObject({ fonte: 'nutrizionista', attivo: true });
  });

  it('il prezzo per confezione della proposta arriva anche quando è null', async () => {
    const { chiamate } = fintoSupabase();
    await eseguiScritture({ ...SCRITTURE, ingredientiDaCreare: [{ ...SCRITTURE.ingredientiDaCreare[0], prezzoConfezione: null }] });
    expect((chiamate.find((c) => c.tabella === 'ingredient')!.payload as Record<string, unknown>[])[0]).toMatchObject({ prezzo_confezione: null });
  });

  it('le disattivazioni in una richiesta sola, filtrate per casa', async () => {
    const { chiamate } = fintoSupabase();
    await eseguiScritture({ ...SCRITTURE, piattiDaDisattivare: ['d-1', 'd-2'] });
    const disattivazioni = chiamate.filter((c) => c.tabella === 'dish');
    expect(disattivazioni).toEqual([{ tabella: 'dish', op: 'update', payload: { attivo: false }, filtri: [['in', 'id', ['d-1', 'd-2']], ['eq', 'user_id', 'u1']] }]);
  });

  it('l\'ordine: ingredienti, dispensa, cambi di unità, disattivazioni, piatti, impostazioni, bozza', async () => {
    const { ordine, rpc } = fintoSupabase();
    vi.mocked(salvaPiatto).mockImplementation(async () => { ordine.push('piatto'); return 'd'; });
    vi.mocked(salvaImpostazioni).mockImplementation(async () => { ordine.push('impostazioni'); });
    await eseguiScritture({ ...SCRITTURE, cambiUnita: [{ ingredientId: 'i-zucc', nome: 'Zucchine', da: 'pz', a: 'g', pesoPezzo: 200, fattore: 200 }] });
    expect(ordine).toEqual(['ingredient:insert', 'pantry_state:upsert', 'rpc:cambia_unita_ingrediente', 'dish:update', 'piatto', 'impostazioni', 'import_draft:delete']);
    expect(rpc).toHaveBeenCalledWith('cambia_unita_ingrediente', { p_ingrediente: 'i-zucc', p_unita: 'g', p_fattore: 200 });
  });

  it('un cambio di unità che fallisce ferma tutto prima dei piatti', async () => {
    fintoSupabase({ rpc: { message: 'ingrediente non trovato' } });
    await expect(eseguiScritture({ ...SCRITTURE, cambiUnita: [{ ingredientId: 'i-zucc', nome: 'Zucchine', da: 'pz', a: 'g', pesoPezzo: 200, fattore: 200 }] }))
      .rejects.toMatchObject({ message: 'ingrediente non trovato' });
    expect(salvaPiatto).not.toHaveBeenCalled();
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('l\'avanzamento: ingredienti, i piatti uno per uno, fine', async () => {
    fintoSupabase();
    const passi: AvanzamentoScritture[] = [];
    await eseguiScritture({ ...SCRITTURE, ingredientiDaCreare: [], piattiDaCreare: piatti(3) }, (a) => passi.push(a));
    expect(passi).toEqual([
      { passo: 'ingredienti' },
      { passo: 'piatti', fatti: 0, totale: 3 },
      { passo: 'piatti', fatti: 1, totale: 3 },
      { passo: 'piatti', fatti: 2, totale: 3 },
      { passo: 'piatti', fatti: 3, totale: 3 },
      { passo: 'fine' },
    ]);
  });

  it('al massimo quattro piatti in volo insieme', async () => {
    fintoSupabase();
    let inVolo = 0;
    let massimo = 0;
    vi.mocked(salvaPiatto).mockImplementation(async () => {
      inVolo += 1;
      massimo = Math.max(massimo, inVolo);
      await new Promise((r) => setTimeout(r, 5));
      inVolo -= 1;
      return 'd';
    });
    await eseguiScritture({ ...SCRITTURE, ingredientiDaCreare: [], piattiDaCreare: piatti(10) });
    expect(salvaPiatto).toHaveBeenCalledTimes(10);
    expect(massimo).toBe(4);
  });

  it('un piatto che fallisce: nessuno parte dopo, quelli in volo finiscono, e l\'errore sale', async () => {
    fintoSupabase();
    let partiti = 0;
    vi.mocked(salvaPiatto).mockImplementation(async () => {
      partiti += 1;
      const n = partiti;
      await new Promise((r) => setTimeout(r, 5));
      if (n === 1) throw new Error('piatto');
      return 'd';
    });
    await expect(eseguiScritture({ ...SCRITTURE, ingredientiDaCreare: [], piattiDaCreare: piatti(10) })).rejects.toThrow('piatto');
    expect(partiti).toBe(4);
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('il riuso passa l\'id al salvataggio; le impostazioni preservano i campi non toccati', async () => {
    fintoSupabase();
    await eseguiScritture({ ...SCRITTURE, piattiDaCreare: [{ ...PIATTO, riusaDishId: 'd-gia' }] });
    expect(vi.mocked(salvaPiatto).mock.calls[0][0].id).toBe('d-gia');
    expect(salvaImpostazioni).toHaveBeenCalledWith(expect.objectContaining({ moltiplicatorePorzioni: 1, settimaneCiclo: 1, cicloOrigine: '2026-08-31' }));
  });

  it('una riga con nuovoAlimento senza corrispondente in ingredientiDaCreare fa fallire con un errore esplicito', async () => {
    fintoSupabase();
    await expect(eseguiScritture({ ...SCRITTURE, ingredientiDaCreare: [] })).rejects.toThrow('nessun id creato');
  });

  it('un doppione per alimento crea un solo ingrediente, riusato da tutte le righe', async () => {
    const { chiamate } = fintoSupabase();
    const duplicato = SCRITTURE.ingredientiDaCreare[0];
    await eseguiScritture({ ...SCRITTURE, ingredientiDaCreare: [duplicato, { ...duplicato, nome: 'Pasta (doppione)' }] });
    const inseriti = chiamate.find((c) => c.tabella === 'ingredient')!.payload as Record<string, unknown>[];
    expect(inseriti).toHaveLength(1);
    expect(vi.mocked(salvaPiatto).mock.calls[0][0].ingredienti).toEqual([{ ingredientId: inseriti[0].id, quantita: 80, unita: 'g' }]);
  });
});
