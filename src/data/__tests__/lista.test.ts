import { describe, it, expect } from 'vitest';
import type { AreaId } from '@/domain/types';
import { raggruppaInSezioni, type RigaVoceGrezza } from '../lista';
import { fondiSezioni, type ListaSalvata, type SezioneSalvata, type VoceSalvata } from '../lista';

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

  /**
   * Round 2 del fix Task 1: il comparatore condiviso con fondiSezioni
   * (ordinaVoci/ordinaControlli) era garantito solo dalla lettura del diff —
   * nessun test esercitava l'ordinamento di raggruppaInSezioni da sola.
   */
  it('dentro un\'area, più voci si ordinano per confezioni decrescenti', () => {
    const righe = [
      riga({
        id: 'item-aceto', ingredient_id: 'ing-aceto', area: 'dispensa',
        confezioni: 1, quantita_totale: 100, origine: 'piano',
        ingredient: { nome: 'Aceto', classe_residuo: 'stima' },
      }),
      riga({
        id: 'item-burro', ingredient_id: 'ing-burro', area: 'dispensa',
        confezioni: 5, quantita_totale: 500, origine: 'piano',
        ingredient: { nome: 'Burro', classe_residuo: 'stima' },
      }),
      riga({
        id: 'item-cacao', ingredient_id: 'ing-cacao', area: 'dispensa',
        confezioni: 3, quantita_totale: 300, origine: 'piano',
        ingredient: { nome: 'Cacao', classe_residuo: 'stima' },
      }),
    ];

    const sezioni = raggruppaInSezioni(righe, ORDINE);

    expect(sezioni[0].voci.map((v) => v.nome)).toEqual(['Burro', 'Cacao', 'Aceto']);
  });

  /**
   * A pari confezioni, il tie-break è per nome con localeCompare('it'), non
   * un confronto binario sui code unit. "Èvo" e "Zucchine" sono la prova: in
   * italiano È è una variante di E e "Èvo" va ordinato vicino alla lettera E,
   * ben prima di "Zucchine" — ma un confronto binario (quello che useremmo
   * senza `'it'`, o con un `<` semplice) mette prima "Zucchine", perché il
   * code unit di 'Z' (90) è più piccolo di quello di 'È' (200). Le due
   * strade danno esiti opposti: non è una tautologia, è la prova che qui
   * serve davvero il collate italiano [misurato ora con
   * 'Èvo'.localeCompare('Zucchine', 'it') === -1 e 'Èvo' < 'Zucchine' === false].
   */
  it('a pari confezioni, il tie-break sul nome usa il collate italiano', () => {
    const righe = [
      riga({
        id: 'item-zucchine', ingredient_id: 'ing-zucchine', area: 'dispensa',
        confezioni: 2, quantita_totale: 200, origine: 'piano',
        ingredient: { nome: 'Zucchine', classe_residuo: 'stima' },
      }),
      riga({
        id: 'item-evo', ingredient_id: 'ing-evo', area: 'dispensa',
        confezioni: 2, quantita_totale: 200, origine: 'piano',
        ingredient: { nome: 'Èvo', classe_residuo: 'stima' },
      }),
    ];

    const sezioni = raggruppaInSezioni(righe, ORDINE);

    expect(sezioni[0].voci.map((v) => v.nome)).toEqual(['Èvo', 'Zucchine']);
  });

  it('i controlli si ordinano per nome e restano separati dalle voci', () => {
    const righe = [
      riga({
        id: 'item-riso', ingredient_id: 'ing-riso', area: 'cereali',
        confezioni: 1, quantita_totale: 1000, fabbisogno: 820, origine: 'piano',
        ingredient: { nome: 'Riso', classe_residuo: 'intero' },
      }),
      riga({
        id: 'item-zucchero', ingredient_id: 'ing-zucchero', area: 'cereali',
        confezioni: 0, quantita_totale: 0, origine: 'controllo',
        ingredient: { nome: 'Zucchero', classe_residuo: 'stima' },
      }),
      riga({
        id: 'item-avena', ingredient_id: 'ing-avena', area: 'cereali',
        confezioni: 0, quantita_totale: 0, origine: 'controllo',
        ingredient: { nome: 'Avena', classe_residuo: 'stima' },
      }),
    ];

    const sezioni = raggruppaInSezioni(righe, ORDINE);

    expect(sezioni[0].voci.map((v) => v.nome)).toEqual(['Riso']);
    expect(sezioni[0].controlli.map((c) => c.nome)).toEqual(['Avena', 'Zucchero']);
  });

  it('le aree escono nell\'ordine passato in ingresso, e un\'area senza niente non compare', () => {
    const righe = [
      riga({
        id: 'item-pasta', ingredient_id: 'ing-pasta', area: 'cereali',
        confezioni: 1, quantita_totale: 100, origine: 'piano',
        ingredient: { nome: 'Pasta', classe_residuo: 'intero' },
      }),
      riga({
        id: 'item-patate', ingredient_id: 'ing-patate', area: 'ortofrutta',
        confezioni: 1, quantita_totale: 100, origine: 'piano',
        ingredient: { nome: 'Patate', classe_residuo: 'intero' },
      }),
    ];
    // 'dispensa' è prima nell'ordine ma non ha righe: deve sparire, non
    // comparire vuota.
    const ordinePersonalizzato: AreaId[] = ['dispensa', 'ortofrutta', 'cereali'];

    const sezioni = raggruppaInSezioni(righe, ordinePersonalizzato);

    expect(sezioni.map((s) => s.area)).toEqual(['ortofrutta', 'cereali']);
  });
});

function voce(nome: string, area: VoceSalvata['area'], confezioni: number, extra: Partial<VoceSalvata> = {}): VoceSalvata {
  return {
    id: `item-${nome}`, ingredientId: `ing-${nome}`, nome, area, unita: 'g',
    fabbisogno: 100, residuo: 0, confezioni, quantitaTotale: 100 * confezioni,
    spuntato: false, origine: 'piano', mostraDettaglio: true, ...extra,
  };
}
function sezione(area: SezioneSalvata['area'], voci: VoceSalvata[], controlli: VoceSalvata[] = []): SezioneSalvata {
  return { area, voci, controlli };
}
function lista(p: Partial<ListaSalvata>): ListaSalvata {
  return { base: [], topup: [], baseListaId: 'lista-base', topupListaId: 'lista-topup', ...p };
}

describe('fondiSezioni', () => {
  it('mette nella stessa sezione le voci base e top-up della stessa area', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('ortofrutta', [voce('Patate', 'ortofrutta', 1)])],
      topup: [sezione('ortofrutta', [voce('Insalata', 'ortofrutta', 1)])],
      ordineAree: ['ortofrutta'],
    }));
    expect(fuse).toHaveLength(1);
    expect(fuse[0].voci.map((v) => v.nome)).toEqual(['Insalata', 'Patate']);
  });

  it('marca ogni voce con l\'id della lista da cui viene', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('cereali', [voce('Pasta', 'cereali', 1)])],
      topup: [sezione('cereali', [voce('Pane', 'cereali', 1)])],
      ordineAree: ['cereali'],
    }));
    const perNome = new Map(fuse[0].voci.map((v) => [v.nome, v.listaId]));
    expect(perNome.get('Pasta')).toBe('lista-base');
    expect(perNome.get('Pane')).toBe('lista-topup');
  });

  it('segue ordineAree, non la concatenazione delle due liste', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('ortofrutta', [voce('Patate', 'ortofrutta', 1)]), sezione('cereali', [voce('Pasta', 'cereali', 1)])],
      topup: [sezione('latticini', [voce('Ricotta', 'latticini', 1)])],
      ordineAree: ['ortofrutta', 'latticini', 'cereali'],
    }));
    expect(fuse.map((s) => s.area)).toEqual(['ortofrutta', 'latticini', 'cereali']);
  });

  it('senza ordineAree (istantanea offline vecchia) usa l\'ordine di default', () => {
    const senzaCampo = lista({ base: [sezione('cereali', [voce('Pasta', 'cereali', 1)])] });
    delete (senzaCampo as { ordineAree?: unknown }).ordineAree;
    expect(fondiSezioni(senzaCampo).map((s) => s.area)).toEqual(['cereali']);
  });

  it('riordina l\'unione per confezioni e poi per nome, non accoda una lista all\'altra', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('dispensa', [voce('Olio', 'dispensa', 1)])],
      topup: [sezione('dispensa', [voce('Tonno', 'dispensa', 3), voce('Aceto', 'dispensa', 1)])],
      ordineAree: ['dispensa'],
    }));
    expect(fuse[0].voci.map((v) => v.nome)).toEqual(['Tonno', 'Aceto', 'Olio']);
  });

  it('ordina i controlli per nome e li tiene separati dalle voci', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('dispensa', [], [voce('Sale', 'dispensa', 1, { origine: 'controllo' })])],
      topup: [sezione('dispensa', [], [voce('Farina', 'dispensa', 1, { origine: 'controllo' })])],
      ordineAree: ['dispensa'],
    }));
    expect(fuse[0].voci).toEqual([]);
    expect(fuse[0].controlli.map((c) => c.nome)).toEqual(['Farina', 'Sale']);
  });

  it('salta le aree senza niente', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('cereali', [voce('Pasta', 'cereali', 1)])],
      ordineAree: ['ortofrutta', 'cereali', 'latticini'],
    }));
    expect(fuse.map((s) => s.area)).toEqual(['cereali']);
  });

  it('scarta le voci di una lista senza id: non saprebbero dove scrivere la risposta', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('cereali', [voce('Pasta', 'cereali', 1)])],
      topup: [sezione('cereali', [voce('Pane', 'cereali', 1)])],
      topupListaId: null,
      ordineAree: ['cereali'],
    }));
    expect(fuse[0].voci.map((v) => v.nome)).toEqual(['Pasta']);
  });
});
