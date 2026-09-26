import { describe, it, expect } from 'vitest';
import { CATALOGO_ICONE, CHIAVI_ICONE, trovaIcona } from '../icone-ingredienti';
import { normalizza } from '../import/mapping';
import { INGREDIENTI_BASE } from '../ingredienti-base';

describe('trovaIcona', () => {
  it.each([
    // nomi reali della produzione e del seed (query del 26/09)
    ['Olio extravergine', 'olio'],
    ['Cipolle', 'cipolla'],
    ['Limoni', 'limone'],
    ['Pane', 'pane'],
    ['Pomodorini', 'pomodorini'],
    ['Ceci lessati', 'legumi'],
    ['Uova', 'uovo'],
    ['Pasta integrale', 'pasta'],
    ['Petto di pollo', 'cosciotto'],
    ['Fesa di tacchino', 'cosciotto'],
    ['Macinato di manzo', 'bistecca'],
    ['Filetto di merluzzo', 'pesce'],
    ['Salmone surgelato', 'pesce'],
    ['Tonno in scatola', 'pesce'],
    ['Passata di pomodoro', 'pomodoro'],
    ['Pelati', 'pomodoro'],
    ['Pane in cassetta', 'pancarre'],
    ['Fette biscottate', 'pancarre'],
    ['Burro di arachidi', 'arachide'],
    ['Burro', 'burro'],
    ['Amido di mais', 'farina'],
    ['Mais', 'mais'],
    ['Pepe', 'spezie'],
    ['Peperoni', 'peperone'],
    ['Sale', 'sale'],
    ['Yogurt greco', 'yogurt'],
    ['Philadelphia', 'formaggio-fresco'],
    ['Tofu', 'formaggio-fresco'],
    ['Gocce di Cioccolato', 'cioccolato'],
    ['Minestrone surgelato', 'minestra'],
    ['Spinaci surgelati', 'foglie'],
    ['Piselli surgelati', 'piselli'],
    ['Fagiolini', 'fagiolini'],
    ['Fagioli lessati', 'legumi'],
    ['Lenticchie secche', 'legumi'],
    ['Cous cous', 'chicchi'],
    ['Fiocchi di avena', 'avena'],
    ['Caffè', 'caffe'],
    ['Würstel', 'salsiccia'],
    ['Funghi champignon', 'fungo'],
    ['Finocchi', 'finocchio'],
    ['Arance', 'arancia'],
    ['Noce moscata', 'spezie'],
  ])('%s → %s', (nome, chiave) => {
    expect(trovaIcona(nome)).toBe(chiave);
  });

  it('ignora maiuscole, accenti e spazi doppi', () => {
    expect(trovaIcona('  PETTO  di   Pollo ')).toBe('cosciotto');
    expect(trovaIcona('caffe')).toBe('caffe');
  });

  it('fuori catalogo: null', () => {
    expect(trovaIcona('Quark')).toBeNull();
    expect(trovaIcona('')).toBeNull();
  });

  it('copre tutti gli INGREDIENTI_BASE', () => {
    const scoperti = INGREDIENTI_BASE.map((i) => i.nome).filter((n) => trovaIcona(n) === null);
    expect(scoperti).toEqual([]);
  });
});

describe('CATALOGO_ICONE', () => {
  it('68 icone', () => {
    expect(CHIAVI_ICONE).toHaveLength(68);
  });

  it('ogni sinonimo appartiene a una sola chiave', () => {
    const visti = new Map<string, string>();
    const doppi: string[] = [];
    for (const k of CHIAVI_ICONE) {
      for (const s of CATALOGO_ICONE[k]) {
        const n = normalizza(s);
        if (visti.has(n)) doppi.push(`${s}: ${visti.get(n)} e ${k}`);
        visti.set(n, k);
      }
    }
    expect(doppi).toEqual([]);
  });
});
