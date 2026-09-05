import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../repertorio', () => ({ salvaIngrediente: vi.fn(), salvaPiatto: vi.fn(), eliminaPiatto: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), salvaImpostazioni: vi.fn() }));
vi.mock('../supabase', () => ({ client: vi.fn() }));

import { salvaIngrediente, salvaPiatto, eliminaPiatto } from '../repertorio';
import { leggiImpostazioni, salvaImpostazioni } from '../impostazioni';
import { client } from '../supabase';
import { eseguiScritture } from '../importa';
import type { ScrittureImport } from '@/domain/import/commit';

const SCRITTURE: ScrittureImport = {
  ingredientiDaCreare: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: 1.2 }],
  piattiDaDisattivare: ['d-old'],
  piattiDaCreare: [{
    riusaDishId: null, nome: 'Pasta al pomodoro', slotDefId: 's-pranzo',
    settimanaCiclo: null, giornoCiclo: null, descrizione: null,
    righe: [{ nuovoAlimento: 'pasta di semola', quantita: 80, unita: 'g' }],
    componenti: [{ nome: 'contorno', opzioni: [[{ nuovoAlimento: 'pasta di semola', quantita: 10, unita: 'g' }], [{ ingredientId: 'i-riso', quantita: 10, unita: 'g' }]] }],
  }],
  impostazioni: { settimaneCiclo: 1, cicloOrigine: '2026-08-31' },
};

function mockBozzaDelete() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn(() => ({ eq }));
  vi.mocked(client).mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(() => ({ delete: del })),
  } as never);
}

describe('eseguiScritture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBozzaDelete();
    vi.mocked(salvaIngrediente).mockResolvedValue('i-pasta-nuovo');
    vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');
    vi.mocked(eliminaPiatto).mockResolvedValue();
    vi.mocked(leggiImpostazioni).mockResolvedValue({ moltiplicatorePorzioni: 1, ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'], settimaneCiclo: 1, cicloOrigine: null });
    vi.mocked(salvaImpostazioni).mockResolvedValue();
  });

  it('crea gli ingredienti, poi sostituisce nuovoAlimento con gli id veri nelle righe e nelle opzioni', async () => {
    await eseguiScritture(SCRITTURE);
    expect(salvaIngrediente).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Pasta' }));
  });

  it("l'ingrediente creato riceve il prezzo per confezione della proposta (null se non c'è)", async () => {
    await eseguiScritture(SCRITTURE);
    expect(salvaIngrediente).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Pasta', prezzoConfezione: 1.2 }));

    vi.mocked(salvaIngrediente).mockClear();
    const senzaPrezzo: ScrittureImport = {
      ...SCRITTURE,
      ingredientiDaCreare: [{ ...SCRITTURE.ingredientiDaCreare[0], prezzoConfezione: null }],
    };
    await eseguiScritture(senzaPrezzo);
    expect(salvaIngrediente).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Pasta', prezzoConfezione: null }));
    const piatto = vi.mocked(salvaPiatto).mock.calls[0][0];
    expect(piatto.ingredienti).toEqual([{ ingredientId: 'i-pasta-nuovo', quantita: 80, unita: 'g' }]);
    expect(piatto.componenti[0].opzioni[0].righe).toEqual([{ ingredientId: 'i-pasta-nuovo', quantita: 10, unita: 'g' }]);
    expect(piatto.componenti[0].opzioni[1].righe).toEqual([{ ingredientId: 'i-riso', quantita: 10, unita: 'g' }]);
    expect(piatto).toMatchObject({ fonte: 'nutrizionista', attivo: true });
  });

  it("l'ordine è: ingredienti, disattivazioni, piatti, impostazioni", async () => {
    const ordine: string[] = [];
    vi.mocked(salvaIngrediente).mockImplementation(async () => { ordine.push('ingrediente'); return 'i-x'; });
    vi.mocked(eliminaPiatto).mockImplementation(async () => { ordine.push('disattiva'); });
    vi.mocked(salvaPiatto).mockImplementation(async () => { ordine.push('piatto'); return 'd-x'; });
    vi.mocked(salvaImpostazioni).mockImplementation(async () => { ordine.push('impostazioni'); });
    await eseguiScritture(SCRITTURE);
    expect(ordine).toEqual(['ingrediente', 'disattiva', 'piatto', 'impostazioni']);
  });

  it('il riuso passa id al salvataggio; le impostazioni preservano i campi non toccati', async () => {
    await eseguiScritture({ ...SCRITTURE, piattiDaCreare: [{ ...SCRITTURE.piattiDaCreare[0], riusaDishId: 'd-gia' }] });
    expect(vi.mocked(salvaPiatto).mock.calls[0][0].id).toBe('d-gia');
    expect(salvaImpostazioni).toHaveBeenCalledWith(expect.objectContaining({ moltiplicatorePorzioni: 1, settimaneCiclo: 1, cicloOrigine: '2026-08-31' }));
  });

  it('una riga con nuovoAlimento senza corrispondente in ingredientiDaCreare fa fallire con un errore esplicito', async () => {
    await expect(eseguiScritture({ ...SCRITTURE, ingredientiDaCreare: [] })).rejects.toThrow('nessun id creato');
  });

  it('un doppione per alimento in ingredientiDaCreare crea un solo ingrediente, riusato da tutte le righe', async () => {
    const duplicato = SCRITTURE.ingredientiDaCreare[0];
    await eseguiScritture({ ...SCRITTURE, ingredientiDaCreare: [duplicato, { ...duplicato, nome: 'Pasta (doppione)' }] });
    expect(salvaIngrediente).toHaveBeenCalledTimes(1);
    const piatto = vi.mocked(salvaPiatto).mock.calls[0][0];
    expect(piatto.ingredienti).toEqual([{ ingredientId: 'i-pasta-nuovo', quantita: 80, unita: 'g' }]);
    expect(piatto.componenti[0].opzioni[0].righe).toEqual([{ ingredientId: 'i-pasta-nuovo', quantita: 10, unita: 'g' }]);
  });
});
