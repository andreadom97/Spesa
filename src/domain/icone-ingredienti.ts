import { normalizza } from './import/mapping';

/**
 * Le icone ingrediente (spec 2026-09-26, delta del pilota). Ogni chiave ha i
 * nomi che la accendono; singolare e plurale li assorbe `radice`, quindi qui
 * basta una forma. Le famiglie (pesce, legumi, spezie…) hanno un solo
 * rappresentante; i composti prendono l'icona dell'ingrediente base
 * (Passata di pomodoro → pomodoro, Tonno in scatola → pesce).
 */
export const CATALOGO_ICONE = {
  // ortofrutta
  banana: ['banana'],
  mela: ['mela'],
  pera: ['pera'],
  arancia: ['arancia', 'mandarino', 'clementina'],
  limone: ['limone', 'lime'],
  avocado: ['avocado'],
  zucchina: ['zucchina', 'zucchino'],
  melanzana: ['melanzana'],
  peperone: ['peperone'],
  broccolo: ['broccolo', 'cavolfiore', 'cavolo'],
  finocchio: ['finocchio'],
  sedano: ['sedano'],
  pomodoro: ['pomodoro', 'passata', 'passata di pomodoro', 'pelati', 'polpa di pomodoro', 'concentrato di pomodoro'],
  pomodorini: ['pomodorino', 'ciliegino', 'datterino'],
  insalata: ['insalata', 'lattuga', 'valeriana', 'songino', 'iceberg'],
  foglie: ['spinaci', 'rucola', 'bietola', 'bieta', 'erbette', 'coste'],
  carota: ['carota'],
  patata: ['patata', 'patata dolce', 'batata'],
  cipolla: ['cipolla', 'cipollotto', 'scalogno', 'porro'],
  aglio: ['aglio'],
  fungo: ['fungo', 'funghi', 'champignon'],
  zucca: ['zucca'],
  fagiolini: ['fagiolino'],
  uva: ['uva'],
  fragola: ['fragola', 'frutti di bosco', 'mirtillo', 'lampone'],
  cetriolo: ['cetriolo'],
  kiwi: ['kiwi'],
  erbe: ['basilico', 'prezzemolo', 'menta', 'rosmarino', 'salvia', 'erba cipollina'],
  // carne e pesce
  bistecca: ['manzo', 'macinato', 'vitello', 'carne', 'bistecca', 'hamburger'],
  cosciotto: ['pollo', 'tacchino'],
  salsiccia: ['salsiccia', 'wurstel'],
  pesce: ['pesce', 'salmone', 'merluzzo', 'branzino', 'spigola', 'orata', 'tonno', 'sgombro', 'platessa', 'nasello', 'pesce spada'],
  gambero: ['gambero', 'gamberetto', 'mazzancolla'],
  affettato: ['prosciutto', 'bresaola', 'speck', 'mortadella', 'salame', 'affettato'],
  pancetta: ['pancetta', 'guanciale'],
  // latticini e uova
  uovo: ['uovo'],
  latte: ['latte'],
  yogurt: ['yogurt', 'skyr', 'kefir'],
  formaggio: ['formaggio', 'parmigiano', 'grana', 'pecorino', 'feta', 'emmental', 'provola', 'scamorza'],
  mozzarella: ['mozzarella', 'burrata', 'stracciatella', 'fiordilatte'],
  'formaggio-fresco': ['ricotta', 'philadelphia', 'formaggio spalmabile', 'stracchino', 'fiocchi di latte', 'tofu'],
  burro: ['burro'],
  // cereali e forno
  pasta: ['pasta', 'spaghetti', 'penne', 'fusilli', 'rigatoni', 'linguine', 'tagliatelle', 'gnocchi'],
  riso: ['riso'],
  chicchi: ['farro', 'orzo', 'cous cous', 'couscous', 'quinoa', 'bulgur', 'miglio'],
  avena: ['avena', 'fiocchi di avena', 'porridge'],
  pane: ['pane', 'pagnotta', 'panino', 'baguette'],
  pancarre: ['pane in cassetta', 'pancarre', 'fetta biscottata', 'pane tostato'],
  biscotto: ['biscotto', 'cracker', 'crackers', 'galletta'],
  farina: ['farina', 'amido di mais', 'maizena', 'pangrattato'],
  cornetto: ['cornetto', 'brioche', 'croissant'],
  // dispensa
  olio: ['olio'],
  ampolla: ['aceto', 'salsa di soia'],
  sale: ['sale'],
  spezie: ['pepe', 'cannella', 'cumino', 'curry', 'paprika', 'origano', 'curcuma', 'noce moscata', 'zenzero', 'peperoncino'],
  zucchero: ['zucchero'],
  miele: ['miele'],
  marmellata: ['marmellata', 'confettura'],
  caffe: ['caffe'],
  mais: ['mais'],
  legumi: ['legumi', 'ceci', 'cece', 'fagioli', 'cannellini', 'borlotti', 'lenticchie'],
  piselli: ['pisello', 'edamame'],
  noce: ['noce', 'frutta secca'],
  mandorla: ['mandorla'],
  arachide: ['arachide', 'burro di arachidi', 'noccioline'],
  cioccolato: ['cioccolato', 'cacao'],
  // pronti e bevande
  minestra: ['minestrone', 'minestra', 'brodo', 'zuppa', 'vellutata'],
  acqua: ['acqua'],
} as const satisfies Record<string, readonly string[]>;

export type ChiaveIcona = keyof typeof CATALOGO_ICONE;
export const CHIAVI_ICONE = Object.keys(CATALOGO_ICONE) as ChiaveIcona[];

/**
 * Radice di una parola: toglie la vocale finale e poi una `i` rimasta
 * (pomodori/pomodoro → pomodor, arance/arancia → aranc, finocchi/finocchio →
 * finocch). Le parole fino a tre lettere restano intere.
 */
function radice(parola: string): string {
  if (parola.length <= 3) return parola;
  let r = parola.replace(/[aeiou]$/, '');
  if (r.length > 3) r = r.replace(/i$/, '');
  return r;
}

function radici(s: string): string[] {
  const n = normalizza(s);
  return n === '' ? [] : n.split(' ').map(radice);
}

interface Voce { chiave: ChiaveIcona; radici: string[]; lunghezza: number }

const VOCI: Voce[] = CHIAVI_ICONE.flatMap((chiave) =>
  CATALOGO_ICONE[chiave].map((s) => ({ chiave, radici: radici(s), lunghezza: normalizza(s).length })),
);

function posizione(nome: string[], cerca: string[]): number {
  for (let i = 0; i + cerca.length <= nome.length; i++) {
    if (cerca.every((r, j) => nome[i + j] === r)) return i;
  }
  return -1;
}

/**
 * La chiave d'icona per un nome libero, o null se fuori catalogo. Vince il
 * sinonimo più lungo che compare intero nel nome; a parità, il primo.
 */
export function trovaIcona(nome: string): ChiaveIcona | null {
  const n = radici(nome);
  let migliore: { chiave: ChiaveIcona; lunghezza: number; pos: number } | null = null;
  for (const v of VOCI) {
    const pos = posizione(n, v.radici);
    if (pos < 0) continue;
    if (!migliore || v.lunghezza > migliore.lunghezza || (v.lunghezza === migliore.lunghezza && pos < migliore.pos)) {
      migliore = { chiave: v.chiave, lunghezza: v.lunghezza, pos };
    }
  }
  return migliore?.chiave ?? null;
}
