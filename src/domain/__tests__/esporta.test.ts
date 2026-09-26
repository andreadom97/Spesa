import { describe, it, expect } from 'vitest';
import { componiEsportazione, nomeFileEsportazione } from '../esporta';
import { IMPOSTAZIONI, INGREDIENTI, PIATTI, cinqueColazioni, dispensaVuota } from './fixtures';

const INGRESSO = {
  versione: '0.1.0',
  esportatoIl: '2026-09-25T08:30:00.000Z',
  impostazioni: IMPOSTAZIONI,
  pasti: [{ id: 'col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) }],
  ingredienti: INGREDIENTI,
  piatti: PIATTI,
  piano: [{ lunedi: '2026-08-31', stato: 'chiusa', pasti: cinqueColazioni() }],
  dispensa: {
    stato: dispensaVuota(),
    pronti: [{ id: 'lp-1', dishId: 'colazione-yogurt', porzioni: 2, congelato: false, preparataIl: '2026-09-24', mealSlotId: null }],
  },
};

describe('componiEsportazione (spec fase 5 §E.3)', () => {
  it('formato 1, app dispesa, e i dati così come arrivano', () => {
    const e = componiEsportazione(INGRESSO);
    expect(e.formato).toBe(1);
    expect(e.app).toBe('dispesa');
    expect(e).toEqual({ formato: 1, app: 'dispesa', ...INGRESSO });
  });

  it('le chiavi nell\'ordine della spec: il file si legge dall\'alto', () => {
    expect(Object.keys(componiEsportazione(INGRESSO))).toEqual([
      'formato', 'app', 'versione', 'esportatoIl', 'impostazioni', 'pasti',
      'ingredienti', 'piatti', 'piano', 'dispensa',
    ]);
  });

  it('le impostazioni portano anche la cadenza dei controlli', () => {
    expect(componiEsportazione(INGRESSO).impostazioni.giorniControllo).toBe(90);
  });

  it('un giro in JSON non perde niente', () => {
    const e = componiEsportazione(INGRESSO);
    expect(JSON.parse(JSON.stringify(e))).toEqual(e);
  });
});

describe('nomeFileEsportazione (spec fase 5 §C.8)', () => {
  it('dispesa-{gg-mm-aaaa}.json', () => {
    expect(nomeFileEsportazione('2026-09-25')).toBe('dispesa-25-09-2026.json');
    expect(nomeFileEsportazione('2027-01-03')).toBe('dispesa-03-01-2027.json');
  });

  it('una data che non è aaaa-mm-gg non fa un nome a caso', () => {
    expect(() => nomeFileEsportazione('25/09/2026')).toThrow();
    expect(() => nomeFileEsportazione('')).toThrow();
  });
});
