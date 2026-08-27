import { describe, it, expect } from 'vitest';
import type { AreaId } from '@/domain/types';
import { raggruppaInSezioni, type RigaVoceGrezza } from '../lista';

const ORDINE: AreaId[] = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'];

/** Righe nella forma che arrivano davvero da Supabase (snake_case, ingredient annidato). */
function riga(overrides: Partial<RigaVoceGrezza>): RigaVoceGrezza {
  return {
    id: 'id-default', ingredient_id: 'ing-default', fabbisogno: 0, residuo: 0,
    confezioni: 0, quantita_totale: 0, unita: 'g', area: 'dispensa', spuntato: false,
    origine: 'piano', ingredient: { nome: 'Ingrediente', classe_residuo: 'stima' },
    ...overrides,
  };
}

/**
 * Regressione sul fix del Task 14: lo smistamento voci/controlli deve
 * guardare lo stato della riga (origine 'controllo' *e* confezioni 0), non
 * solo l'origine. rispondiControllo() lascia origine invariata anche dopo un
 * "no" — solo confezioni cambia — quindi la vecchia regola (solo origine)
 * avrebbe tenuto la riga bloccata fra i controlli per sempre.
 */
describe('raggruppaInSezioni', () => {
  it('un controllo non ancora risposto (confezioni 0) resta fra i controlli', () => {
    const righe = [riga({
      id: 'item-olio', ingredient_id: 'ing-olio', area: 'dispensa', unita: 'ml',
      confezioni: 0, quantita_totale: 0, origine: 'controllo',
      ingredient: { nome: 'Olio', classe_residuo: 'stima' },
    })];

    const sezioni = raggruppaInSezioni(righe, ORDINE);

    expect(sezioni).toHaveLength(1);
    expect(sezioni[0].voci).toEqual([]);
    expect(sezioni[0].controlli).toHaveLength(1);
    expect(sezioni[0].controlli[0]).toMatchObject({ nome: 'Olio', origine: 'controllo', confezioni: 0 });
  });

  it('un controllo risposto "no" (confezioni > 0) diventa una tessera fra le voci', () => {
    const righe = [riga({
      id: 'item-olio', ingredient_id: 'ing-olio', area: 'dispensa', unita: 'ml',
      confezioni: 1, quantita_totale: 1000, origine: 'controllo',
      ingredient: { nome: 'Olio', classe_residuo: 'stima' },
    })];

    const sezioni = raggruppaInSezioni(righe, ORDINE);

    expect(sezioni).toHaveLength(1);
    expect(sezioni[0].controlli).toEqual([]);
    expect(sezioni[0].voci).toHaveLength(1);
    expect(sezioni[0].voci[0]).toMatchObject({
      nome: 'Olio', origine: 'controllo', confezioni: 1, quantitaTotale: 1000,
    });
  });

  it('una voce di piano normale resta fra le voci, un controllo in sospeso nella stessa area resta fra i controlli', () => {
    const righe = [
      riga({
        id: 'item-riso', ingredient_id: 'ing-riso', area: 'cereali', unita: 'g',
        confezioni: 1, quantita_totale: 1000, fabbisogno: 820, origine: 'piano',
        ingredient: { nome: 'Riso', classe_residuo: 'intero' },
      }),
      riga({
        id: 'item-avena', ingredient_id: 'ing-avena', area: 'cereali', unita: 'g',
        confezioni: 0, quantita_totale: 0, origine: 'controllo',
        ingredient: { nome: 'Avena', classe_residuo: 'stima' },
      }),
    ];

    const sezioni = raggruppaInSezioni(righe, ORDINE);

    expect(sezioni).toHaveLength(1);
    expect(sezioni[0].voci.map((v) => v.nome)).toEqual(['Riso']);
    expect(sezioni[0].controlli.map((c) => c.nome)).toEqual(['Avena']);
  });
});
