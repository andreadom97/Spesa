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
  erbe: ['basilico', 'prezzemolo', 'menta', 'rosmarino', 'salvia', 'erba cipollina'],
  // carne e pesce
  bistecca: ['manzo', 'macinato', 'vitello', 'carne', 'bistecca', 'hamburger'],
  cosciotto: ['pollo', 'tacchino'],
  salsiccia: ['salsiccia', 'wurstel'],
  pesce: ['pesce', 'salmone', 'merluzzo', 'branzino', 'spigola', 'orata', 'tonno', 'sgombro', 'platessa', 'nasello', 'pesce spada'],
  gambero: ['gambero', 'gamberetto', 'mazzancolla'],
  pancetta: ['pancetta', 'guanciale'],
  // latticini e uova
  uovo: ['uovo'],
  latte: ['latte'],
  yogurt: ['yogurt', 'skyr', 'kefir'],
  formaggio: ['formaggio', 'parmigiano', 'grana', 'pecorino', 'feta', 'emmental', 'provola', 'scamorza', 'mozzarella', 'burrata', 'stracciatella', 'fiordilatte'],
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
 * Espressioni che partecipano alla ricerca come i sinonimi (stesse radici,
 * stessa regola di precedenza) ma che, se vincono, fanno restituire `null` a
 * `trovaIcona` invece di una chiave: meglio nessuna icona che un'icona
 * sbagliata.
 *
 * - `pesca`: stessa radice di `pesce` (pesc) — senza il blocco, "Pesca" o
 *   "Succo di pesca" prenderebbero l'icona del pesce.
 * - `pesche noci`: la pesca noce ha la stessa ambiguità della pesca; non
 *   basta bloccare `pesca` perché "pesche" da sola ha una radice diversa
 *   (pesch) da "pesca" (pesc).
 * - `grano`: stessa radice di `grana` (gran) — senza il blocco, "Grano
 *   saraceno" prenderebbe l'icona del formaggio.
 * - `semola`: la semola è un derivato del grano, stessa cautela.
 * - `pasta sfoglia`, `pasta frolla`, `pasta brisee`, `pasta per pizza`,
 *   `pasta di acciughe`: impasti o creme, non pasta secca — non devono
 *   prendere l'icona di `pasta`.
 */
export const BLOCCHI: readonly string[] = [
  'pesca',
  'pesche noci',
  'grano',
  'semola',
  'pasta sfoglia',
  'pasta frolla',
  'pasta brisee',
  'pasta per pizza',
  'pasta di acciughe',
];

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

/**
 * Spezza sulla punteggiatura oltre che sugli spazi (dopo `normalizza`), così
 * l'apostrofo in "Fiocchi d'avena" o "Burro d'arachidi" separa "d" da
 * "avena"/"arachidi" invece di incollarli in una sola parola che non
 * combina con nessuna radice del catalogo. Le parti vuote (punteggiatura a
 * inizio/fine o doppia) sono scartate.
 */
function radici(s: string): string[] {
  const n = normalizza(s);
  return n === '' ? [] : n.split(/[^a-z0-9]+/).filter((p) => p !== '').map(radice);
}

interface Voce { chiave: ChiaveIcona | null; radici: string[]; lunghezza: number; blocco: boolean }

const VOCI: Voce[] = [
  ...CHIAVI_ICONE.flatMap((chiave) =>
    CATALOGO_ICONE[chiave].map((s) => ({ chiave, radici: radici(s), lunghezza: normalizza(s).length, blocco: false })),
  ),
  ...BLOCCHI.map((s) => ({ chiave: null, radici: radici(s), lunghezza: normalizza(s).length, blocco: true })),
];

function posizione(nome: string[], cerca: string[]): number {
  for (let i = 0; i + cerca.length <= nome.length; i++) {
    if (cerca.every((r, j) => nome[i + j] === r)) return i;
  }
  return -1;
}

/**
 * La chiave d'icona per un nome libero, o null se fuori catalogo (o se
 * l'espressione vincente è un blocco). Vince il sinonimo che compare prima
 * nel nome ("prima parola significativa"); a parità di posizione, il più
 * lungo; a parità di posizione e lunghezza, un blocco vince su un sinonimo
 * (pesca/pesce, grano/grana condividono la radice ed è il blocco a
 * risolvere l'ambiguità).
 */
export function trovaIcona(nome: string): ChiaveIcona | null {
  const n = radici(nome);
  let migliore: { chiave: ChiaveIcona | null; lunghezza: number; pos: number; blocco: boolean } | null = null;
  for (const v of VOCI) {
    const pos = posizione(n, v.radici);
    if (pos < 0) continue;
    if (
      !migliore ||
      pos < migliore.pos ||
      (pos === migliore.pos &&
        (v.lunghezza > migliore.lunghezza || (v.lunghezza === migliore.lunghezza && v.blocco && !migliore.blocco)))
    ) {
      migliore = { chiave: v.chiave, lunghezza: v.lunghezza, pos, blocco: v.blocco };
    }
  }
  return migliore?.chiave ?? null;
}
