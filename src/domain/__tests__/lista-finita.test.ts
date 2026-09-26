import { describe, it, expect } from 'vitest';
import { listaFinita, contaVoci, type SezioneDaSpuntare } from '../lista-finita';

function sezione(spunte: boolean[], controlli = 0): SezioneDaSpuntare {
  return { voci: spunte.map((spuntato) => ({ spuntato })), controlli: Array.from({ length: controlli }, () => ({})) };
}

describe('listaFinita', () => {
  it('una lista senza voci non è finita: non c\'è niente da aver preso', () => {
    expect(listaFinita({ base: [], topup: [] })).toBe(false);
    expect(listaFinita({ base: [sezione([])], topup: [] })).toBe(false);
  });

  it('una voce non spuntata basta a non finire', () => {
    expect(listaFinita({ base: [sezione([true, false])], topup: [] })).toBe(false);
  });

  it('tutto spuntato ma un controllo in sospeso: non è finita (un controllo si risponde, non si spunta)', () => {
    expect(listaFinita({ base: [sezione([true]), sezione([], 1)], topup: [] })).toBe(false);
  });

  it('tutto spuntato e nessun controllo: finita', () => {
    expect(listaFinita({ base: [sezione([true, true])], topup: [] })).toBe(true);
  });

  it('base e top-up contano insieme', () => {
    expect(listaFinita({ base: [sezione([true])], topup: [sezione([false])] })).toBe(false);
    expect(listaFinita({ base: [sezione([true])], topup: [sezione([true])] })).toBe(true);
    // Solo il top-up ha voci: basta quello.
    expect(listaFinita({ base: [sezione([])], topup: [sezione([true])] })).toBe(true);
  });
});

describe('contaVoci', () => {
  it('conta le voci di base e top-up, non i controlli', () => {
    expect(contaVoci({ base: [sezione([true, true], 2)], topup: [sezione([true])] })).toBe(3);
    expect(contaVoci({ base: [], topup: [] })).toBe(0);
  });
});
