import { describe, it, expect } from 'vitest';
import { BLOCCHI, CATALOGO_ICONE, CHIAVI_ICONE, trovaIcona } from '../icone-ingredienti';
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
    ['Pepe', 'spezie'],
    ['Peperoni', 'peperone'],
    ['Sale', 'sale'],
    ['Yogurt greco', 'yogurt'],
    ['Mozzarella', 'formaggio'],
    ['Burrata', 'formaggio'],
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

  it.each([
    // criterio "prima la posizione, poi la lunghezza" (spec §4): vince il
    // primo sinonimo che compare nel nome, non il più lungo ovunque sia.
    ['Yogurt alla fragola', 'yogurt'],
    ['Yogurt ai frutti di bosco', 'yogurt'],
    ['Pane al latte', 'pane'],
    ['Riso al latte', 'riso'],
    ['Biscotti al cioccolato', 'biscotto'],
    ['Latte di mandorla', 'latte'],
    ['Farina di mandorle', 'farina'],
    ['Pasta al pomodoro', 'pasta'],
    ['Olio di semi di arachide', 'olio'],
    ['Brodo di pollo', 'minestra'],
  ])('%s → %s (posizione prima della lunghezza)', (nome, chiave) => {
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

  it.each([
    // esito del gate del 26/09: nessuna icona per kiwi, affettati e mais
    'Kiwi',
    'Prosciutto crudo',
    'Bresaola',
    'Mais',
  ])('%s → null (gate 26/09)', (nome) => {
    expect(trovaIcona(nome)).toBeNull();
  });

  // Esclusi di proposito dal catalogo icone al gate del 26/09: restano senza
  // icona per decisione di Andrea, non per un buco nel catalogo.
  const ESCLUSI_DI_PROPOSITO = ['Prosciutto crudo', 'Prosciutto cotto', 'Bresaola', 'Mais'];

  it('copre tutti gli INGREDIENTI_BASE, salvo gli esclusi di proposito', () => {
    const scoperti = INGREDIENTI_BASE.map((i) => i.nome).filter((n) => trovaIcona(n) === null);
    expect(scoperti).toEqual(ESCLUSI_DI_PROPOSITO);
  });

  it.each([
    // BLOCCHI: stessa radice di un sinonimo vero (pesca~pesce, grano~grana) o
    // impasti/creme che non sono pasta secca — meglio nessuna icona che una
    // sbagliata.
    'Pesca',
    'Succo di pesca',
    'Tè alla pesca',
    'Pesche noci',
    'Grano saraceno',
    'Semola di grano duro',
    'Semola rimacinata di grano duro',
    'Pasta sfoglia',
    'Pasta frolla',
    'Pasta brisée',
    'Pasta per pizza',
    'Pasta di acciughe',
  ])('%s → null (blocco)', (nome) => {
    expect(trovaIcona(nome)).toBeNull();
  });

  it.each([
    // punteggiatura: radici() spezza su /[^a-z0-9]+/ dopo normalizza, scarta
    // le parti vuote ("d'avena" → "d", "avena"). NB: "Burro d'arachidi" (dal
    // brief) NON è testato qui — vedi NEEDS_CONTEXT nel report finale: con la
    // posizione-prima la contrazione rompe il sinonimo composto "burro di
    // arachidi" (tokenizza "di" ≠ "d") e vince "burro" (pos 0) invece di
    // "arachide" (pos 2). Il seed reale usa solo "Burro di arachidi" (senza
    // apostrofo), che resta verde: vedi il test con "di" per esteso sopra.
    ["Fiocchi d'avena", 'avena'],
  ])('%s → %s (punteggiatura)', (nome, chiave) => {
    expect(trovaIcona(nome)).toBe(chiave);
  });
});

describe('CATALOGO_ICONE', () => {
  it('64 icone', () => {
    expect(CHIAVI_ICONE).toHaveLength(64);
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

  it('nessun sinonimo coincide con un blocco', () => {
    const sinonimi = new Set<string>();
    for (const k of CHIAVI_ICONE) {
      for (const s of CATALOGO_ICONE[k]) sinonimi.add(normalizza(s));
    }
    const doppi = BLOCCHI.filter((b) => sinonimi.has(normalizza(b)));
    expect(doppi).toEqual([]);
  });
});
