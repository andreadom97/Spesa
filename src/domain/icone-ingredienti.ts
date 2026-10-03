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
  insalata: ['insalata', 'insalatona', 'lattuga', 'valeriana', 'songino', 'iceberg'],
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
  erbe: ['basilico', 'prezzemolo', 'menta', 'rosmarino', 'salvia', 'erba cipollina', 'erbe aromatiche', 'erba aromatica'],
  // famiglie (03/10): i nomi generici delle diete importate. «Frutti di bosco» resta su
  // `fragola` (sinonimo più lungo alla stessa posizione), «Minestrone» su `minestra`.
  frutta: ['frutta', 'macedonia'],
  verdura: ['verdura', 'ortaggio'],
  // ondata 1 (03/10). Il mais era stato tolto al gate del 26/09 perché non si capiva: torna
  // con la pannocchia disegnata da capo, decide Andrea al foglio. «Amido/Farina di mais»
  // restano su `farina` (prima posizione).
  mais: ['mais', 'granturco', 'pannocchia', 'pop corn', 'popcorn'],
  // ondata 1 (03/10): esce da `spezie`, ha una forma sua. «Peperoncino fresco» e «in polvere»
  // non servono: «peperoncino» è già in prima posizione e porta alla stessa chiave.
  peperoncino: ['peperoncino', 'jalapeno'],
  // ondata 1 (03/10), frutta. «Latte/Farina/Noce di cocco» vengono qui e non su `latte`,
  // `farina`, `noce`: più lunghi alla stessa posizione. «Cocco rapé» lo prende già «cocco».
  ananas: ['ananas'],
  cocco: ['cocco', 'noce di cocco', 'latte di cocco', 'farina di cocco'],
  // «Ciliege» e «marasche» a parte: `radice` non unisce -gie/-ge né -ca/-che.
  ciliegia: ['ciliegia', 'ciliege', 'amarena', 'marasca', 'marasche', 'visciola'],
  melone: ['melone', 'anguria', 'cocomero'],
  // «Fichi» a parte: la radice di «fico» (fic) non è quella di «fichi» (fich). «Fico secco» e
  // «Fico d'India» li prende già «fico». «Datterini» restano su `pomodorini` (radice diversa).
  'datteri-fichi': ['dattero', 'fico', 'fichi'],
  // ondata 1 (03/10), frutta e verdura. «Albicocche» e «percoche» a parte: `radice` non unisce
  // -ca/-che. Niente «pesca»: ha la radice di «pesce» ed è un blocco, quindi «Pesca» resta senza icona.
  'pesca-albicocca': ['albicocca', 'albicocche', 'nettarina', 'percoca', 'percoche'],
  // «Uva passa» e «Uva sultanina» qui e non su `uva`: più lunghi alla stessa posizione.
  uvetta: ['uvetta', 'uva passa', 'uva sultanina'],
  carciofo: ['carciofo'],
  asparago: ['asparago'],
  // carne e pesce
  bistecca: ['manzo', 'macinato', 'vitello', 'carne', 'bistecca', 'hamburger'],
  cosciotto: ['pollo', 'tacchino'],
  salsiccia: ['salsiccia', 'wurstel'],
  pesce: ['pesce', 'salmone', 'merluzzo', 'branzino', 'spigola', 'orata', 'tonno', 'sgombro', 'platessa', 'nasello', 'pesce spada'],
  gambero: ['gambero', 'gamberetto', 'mazzancolla'],
  pancetta: ['pancetta', 'guanciale'],
  // famiglia (03/10, supera il gate del 26/09 che li lasciava senza icona): nel foglio sta
  // con i latticini, come al banco gastronomia.
  salumi: ['salume', 'salame', 'prosciutto', 'bresaola', 'speck', 'mortadella', 'affettato'],
  // ondata 1 (03/10). Niente «filetto» da solo: è anche di manzo o di pesce. «Carne di
  // maiale» qui e non su `bistecca` (più lungo alla stessa posizione di «carne»).
  maiale: ['maiale', 'carne di maiale', 'lonza', 'arista', 'braciola di maiale', 'costine', 'filetto di maiale', 'porchetta'],
  agnello: ['agnello', 'carne di agnello', 'abbacchio', 'capretto'],
  // ondata 1 (03/10). I crostacei restano su `gambero`. «Ostriche» e «capesante» a parte:
  // `radice` non unisce -ca/-che né capa-/cape-. «Frutti di mare» qui, non su `frutta`
  // (stessa radice frutt), «Insalata di mare» non su `insalata`; «Polpa di» è un blocco (radice di
  // «polpo»): «Polpo di scoglio» gli passa davanti perché è più lungo alla stessa posizione.
  molluschi: ['cozza', 'vongola', 'calamaro', 'polpo', 'polpo di scoglio', 'seppia', 'totano', 'moscardino', 'ostrica', 'ostriche', 'capasanta', 'capesante', 'frutti di mare', 'insalata di mare'],
  // latticini e uova
  uovo: ['uovo'],
  latte: ['latte'],
  yogurt: ['yogurt', 'skyr', 'kefir'],
  formaggio: ['formaggio', 'parmigiano', 'grana', 'pecorino', 'feta', 'emmental', 'provola', 'scamorza', 'mozzarella', 'burrata', 'stracciatella', 'fiordilatte'],
  'formaggio-fresco': ['ricotta', 'philadelphia', 'formaggio spalmabile', 'stracchino', 'fiocchi di latte', 'tofu'],
  burro: ['burro'],
  // ondata 1 (03/10). «Panna cotta» è un dolce: è nei BLOCCHI, non qui. Niente
  // «besciamella»: è una salsa (latte, burro, farina), non la panna da comprare.
  panna: ['panna', 'panna da cucina', 'panna fresca', 'panna montata'],
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
  spezie: ['pepe', 'cannella', 'cumino', 'curry', 'paprika', 'origano', 'curcuma', 'noce moscata', 'zenzero', 'spezia'],
  zucchero: ['zucchero'],
  miele: ['miele'],
  marmellata: ['marmellata', 'confettura'],
  caffe: ['caffe'],
  legumi: ['legumi', 'ceci', 'cece', 'fagioli', 'cannellini', 'borlotti', 'lenticchie'],
  piselli: ['pisello', 'edamame'],
  noce: ['noce'],
  mandorla: ['mandorla'],
  arachide: ['arachide', 'burro di arachidi', 'noccioline'],
  // famiglie (03/10). «Noci» resta su `noce`, «Noci miste» viene qui (più lungo alla stessa
  // posizione); «Olio d'oliva» resta su `olio` (prima posizione).
  'frutta-guscio': ['frutta a guscio', 'frutta secca', 'nocciola', 'pistacchio', 'anacardo', 'noci miste'],
  olive: ['oliva'],
  cioccolato: ['cioccolato', 'cacao'],
  // ondata 1 (03/10). Niente «aroma»: nelle diete «aroma»/«aromatizzazione» non sono ingredienti.
  vaniglia: ['vaniglia', 'vanillina', 'estratto di vaniglia', 'bacca di vaniglia'],
  lievito: ['lievito', 'lievito di birra', 'lievito per dolci', 'bicarbonato', 'cremor tartaro'],
  // Niente «mostarda»: in Italia è frutta candita alla senape, non la senape.
  senape: ['senape'],
  capperi: ['cappero'],
  // ondata 1 (03/10). «Semi di zucca» qui e non su `zucca` (prima posizione). «Semola» resta un
  // blocco e «Semifreddo» non si accende: le radici (semol, semifredd) non sono quella di «semi» (sem).
  semi: ['semi di chia', 'semi di lino', 'semi di girasole', 'semi di zucca', 'semi di sesamo', 'sesamo', 'chia', 'lino'],
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
 * - `salame di cioccolato`: un dolce, non un salume — senza il blocco prenderebbe
 *   l'icona di `salumi` (03/10).
 * - `panna cotta`: un dolce pronto, non la panna da comprare — senza il blocco
 *   prenderebbe l'icona di `panna` (03/10).
 * - `gelato`, `budino`: dolci pronti — senza il blocco "Gelato alla vaniglia" e
 *   "Budino alla vaniglia" prenderebbero l'icona della bacca di vaniglia (03/10).
 *   Non si blocca «crema»: bloccherebbe anche "Crema di zucca" o "Crema di
 *   ceci", che oggi prendono l'icona giusta.
 * - `polpa di`: stessa radice di `polpo` (polp) — senza il blocco "Polpa di
 *   zucca" o "Polpa di granchio" prenderebbero l'icona dei molluschi. "Polpa di
 *   pomodoro" resta su `pomodoro` (sinonimo più lungo alla stessa posizione).
 *   Non si blocca «polpa» da sola: a parità di lunghezza il blocco vincerebbe
 *   anche su «Polpo». Prezzo accettato: «Polpa» da sola prende i molluschi.
 *   «Polpo di scoglio» è un sinonimo di `molluschi` più lungo del blocco, quindi
 *   vince lui (03/10).
 * - `mostarda`: frutta candita alla senape, non la senape né la frutta —
 *   senza il blocco "Mostarda di fichi" prenderebbe l'icona di `datteri-fichi`
 *   (03/10). "Mostarda" da sola resta senza icona come prima.
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
  'salame di cioccolato',
  'panna cotta',
  'gelato',
  'budino',
  'polpa di',
  'mostarda',
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
