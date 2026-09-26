import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { salvaIngrediente, UnitaInUsoError } from '../repertorio';

// L'id che finisce in `user_id` non viene più da `auth.getUser` sul client
// finto ma da `idCasa()` (l'account della casa): lo stesso valore di prima,
// così i payload attesi non cambiano.
beforeEach(() => {
  vi.mocked(idCasa).mockReset();
  vi.mocked(idCasa).mockResolvedValue('user-1');
});

/**
 * Registra l'ultimo payload passato a upsert, tabella per tabella. `letture`
 * è quello che rispondono le catene senza upsert (select … maybeSingle o
 * await diretto): serve al controllo del cambio d'unità. `eq` registra i
 * filtri di ogni lettura.
 */
function creaClientMock(letture: Record<string, unknown> = {}) {
  const upsert: Record<string, unknown[]> = {};
  const filtri: Record<string, unknown[][]> = {};
  function from(tabella: string) {
    let scrive = false;
    const lettura = () => ({ data: letture[tabella] ?? null, error: null });
    const proxy: Record<string, unknown> = {
      select: () => proxy,
      returns: () => proxy,
      eq: (...args: unknown[]) => {
        (filtri[tabella] ??= []).push(args);
        return proxy;
      },
      single: () => Promise.resolve({ data: { id: 'i-salvato' }, error: null }),
      maybeSingle: () => Promise.resolve(lettura()),
      upsert: (payload: unknown) => {
        scrive = true;
        (upsert[tabella] ??= []).push(payload);
        return proxy;
      },
      then(onFulfilled: (v: unknown) => unknown) {
        return Promise.resolve(scrive ? { data: null, error: null } : lettura()).then(onFulfilled);
      },
    };
    return proxy;
  }
  return {
    sb: { from },
    upsert,
    filtri,
  };
}

const BASE = {
  nome: 'Riso',
  unitaBase: 'g' as const,
  area: 'cereali' as const,
  classeResiduo: 'porzionabile' as const,
  deperibile: false,
  formatoConfezione: 1000,
};

describe('salvaIngrediente', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('scrive prezzo_confezione accanto al formato', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    const id = await salvaIngrediente({ ...BASE, prezzoConfezione: 2.5 });

    expect(id).toBe('i-salvato');
    expect(upsert.ingredient[0]).toMatchObject({
      user_id: 'user-1',
      nome: 'Riso',
      formato_confezione: 1000,
      prezzo_confezione: 2.5,
    });
  });

  it('un ingrediente senza prezzo scrive prezzo_confezione null, non lo omette', async () => {
    // Omettere la colonna lascerebbe in piedi, su un upsert, il prezzo
    // vecchio: "nessun prezzo" dev'essere una scrittura esplicita.
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await salvaIngrediente({ ...BASE, prezzoConfezione: null });

    const riga = upsert.ingredient[0] as Record<string, unknown>;
    expect('prezzo_confezione' in riga).toBe(true);
    expect(riga.prezzo_confezione).toBeNull();
  });

  it('scrive ean quando lo riceve, null compreso', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await salvaIngrediente({ ...BASE, prezzoConfezione: null, ean: '8076800105735' });
    await salvaIngrediente({ ...BASE, prezzoConfezione: null, ean: null });

    expect(upsert.ingredient[0]).toMatchObject({ ean: '8076800105735' });
    // null esplicito è una scrittura: azzera l'ultimo codice.
    const conNull = upsert.ingredient[1] as Record<string, unknown>;
    expect('ean' in conNull).toBe(true);
    expect(conNull.ean).toBeNull();
  });

  it('senza ean nel parametro non tocca la colonna: la scheda ingrediente non azzera il codice scansionato', async () => {
    // A differenza di prezzo_confezione, nessun editor scrive ean a mano: lo
    // scrive solo la scansione (confezioni.ts). La scheda e l'import non lo
    // passano, e un undefined sparisce dal payload JSON di supabase-js:
    // la colonna resta com'è.
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await salvaIngrediente({ ...BASE, prezzoConfezione: null });

    const riga = upsert.ingredient[0] as Record<string, unknown>;
    expect(riga.ean).toBeUndefined();
    expect(JSON.parse(JSON.stringify(riga))).not.toHaveProperty('ean');
  });

  it('crea la riga di dispensa a residuo zero, come prima', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await salvaIngrediente({ ...BASE, prezzoConfezione: null });

    expect(upsert.pantry_state[0]).toEqual({ ingredient_id: 'i-salvato', user_id: 'user-1', residuo: 0 });
  });

  describe('cambio d\'unità di un ingrediente esistente (difetto del 26/09)', () => {
    const YOGURT = { ...BASE, id: 'yogurt', nome: 'Yogurt greco', area: 'latticini' as const, formatoConfezione: 500, prezzoConfezione: null };

    it('rifiuta G → ML se un piatto attivo lo usa, senza scrivere nulla', async () => {
      const { sb, upsert, filtri } = creaClientMock({
        ingredient: { unita_base: 'g' },
        dish_ingredient: [{ dish: { nome: 'Yogurt e avena' } }, { dish: { nome: 'Yogurt e avena' } }],
        pantry_state: { residuo: 0 },
      });
      vi.mocked(client).mockReturnValue(sb as never);

      const salvataggio = salvaIngrediente({ ...YOGURT, unitaBase: 'ml' });

      await expect(salvataggio).rejects.toBeInstanceOf(UnitaInUsoError);
      await expect(salvataggio).rejects.toThrow(
        'Il piatto «Yogurt e avena» lo usa con le quantità in g: per passare a ml toglilo prima da lì, o crea un ingrediente nuovo in ml.',
      );
      expect(upsert.ingredient).toBeUndefined();
      expect(upsert.pantry_state).toBeUndefined();
      // Solo i piatti attivi: un piatto eliminato (soft delete) non si legge
      // più da nessuna parte, le sue righe non possono rompere niente.
      expect(filtri.dish_ingredient).toEqual(expect.arrayContaining([
        ['ingredient_id', 'yogurt'], ['dish.attivo', true],
      ]));
      expect(filtri.ingredient).toEqual(expect.arrayContaining([['id', 'yogurt'], ['user_id', 'user-1']]));
    });

    it('rifiuta il cambio se in dispensa c\'è un residuo, anche senza piatti', async () => {
      const { sb, upsert } = creaClientMock({
        ingredient: { unita_base: 'g' },
        dish_ingredient: [],
        pantry_state: { residuo: 300 },
      });
      vi.mocked(client).mockReturnValue(sb as never);

      await expect(salvaIngrediente({ ...YOGURT, unitaBase: 'pz' })).rejects.toThrow(
        'In dispensa ne risultano 300 g: azzeralo dalla Dispensa, poi cambia l\'unità.',
      );
      expect(upsert.ingredient).toBeUndefined();
    });

    it('lascia cambiare l\'unità a un ingrediente che nessun piatto usa e con la dispensa a zero', async () => {
      const { sb, upsert } = creaClientMock({
        ingredient: { unita_base: 'g' },
        dish_ingredient: [],
        pantry_state: { residuo: 0 },
      });
      vi.mocked(client).mockReturnValue(sb as never);

      await salvaIngrediente({ ...YOGURT, unitaBase: 'ml' });

      expect(upsert.ingredient[0]).toMatchObject({ id: 'yogurt', unita_base: 'ml' });
    });

    it('a unità invariata salva senza leggere piatti e dispensa', async () => {
      const { sb, upsert, filtri } = creaClientMock({ ingredient: { unita_base: 'g' } });
      vi.mocked(client).mockReturnValue(sb as never);

      await salvaIngrediente({ ...YOGURT, nome: 'Yogurt greco 0%' });

      expect(upsert.ingredient[0]).toMatchObject({ nome: 'Yogurt greco 0%', unita_base: 'g' });
      expect(filtri.dish_ingredient).toBeUndefined();
    });

    it('un ingrediente nuovo (senza id) non legge niente prima di salvare', async () => {
      const { sb, filtri } = creaClientMock();
      vi.mocked(client).mockReturnValue(sb as never);

      await salvaIngrediente({ ...BASE, prezzoConfezione: null });

      expect(filtri).toEqual({});
    });
  });
});
