import { describe, it, expect, vi } from 'vitest';
vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn(async () => 'casa-1') }));
import { client } from '../supabase';
import { salvaPiatto } from '../repertorio';

describe('salvaPiatto e il q.b.', () => {
  it('una riga q.b. arriva al database con quantita null', async () => {
    const inserite: unknown[] = [];
    const risposta = (dati: unknown) => {
      const b: Record<string, unknown> = {};
      for (const m of ['eq', 'select']) b[m] = () => b;
      b.single = async () => ({ data: dati, error: null });
      b.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(ok);
      return b;
    };
    vi.mocked(client).mockReturnValue({
      from: (tabella: string) => ({
        upsert: () => risposta({ id: 'd-1' }),
        delete: () => risposta(null),
        insert: (righe: unknown) => {
          if (tabella === 'dish_ingredient') inserite.push(righe);
          return risposta(null);
        },
      }),
    } as never);
    await salvaPiatto({
      nome: 'Pasta', slotDefId: 's-1', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
      ingredienti: [{ ingredientId: 'i-sale', quantita: null, unita: 'g' }], componenti: [],
    });
    expect(inserite).toEqual([[expect.objectContaining({ ingredient_id: 'i-sale', quantita: null, unita: 'g' })]]);
  });
});
