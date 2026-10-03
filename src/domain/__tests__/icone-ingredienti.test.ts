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
    // icone di famiglia (03/10): i nomi generici delle diete importate
    ['Frutta fresca di stagione', 'frutta'],
    ['Frutta di stagione', 'frutta'],
    ['Verdure grigliate', 'verdura'],
    ['Verdure miste', 'verdura'],
    ['Frutta a guscio', 'frutta-guscio'],
    ['Nocciole', 'frutta-guscio'],
    ['Pistacchi', 'frutta-guscio'],
    ['Frutta secca', 'frutta-guscio'],
    ['Prosciutto cotto', 'salumi'],
    ['Prosciutto crudo', 'salumi'],
    ['Bresaola', 'salumi'],
    ['Olive taggiasche', 'olive'],
    ['Spezie', 'spezie'],
    ['Erbe aromatiche', 'erbe'],
    ['Insalatona mista', 'insalata'],
    // ondata 1, lotto A (03/10)
    ['Panna', 'panna'],
    ['Panna da cucina', 'panna'],
    ['Panna fresca', 'panna'],
    ['Panna montata', 'panna'],
    ['Vaniglia', 'vaniglia'],
    ['Vanillina', 'vaniglia'],
    ['Estratto di vaniglia', 'vaniglia'],
    ['Bacca di vaniglia', 'vaniglia'],
    ['Lievito di birra', 'lievito'],
    ['Lievito per dolci', 'lievito'],
    ['Lievito istantaneo', 'lievito'],
    ['Bicarbonato', 'lievito'],
    ['Bicarbonato di sodio', 'lievito'],
    ['Cremor tartaro', 'lievito'],
    ['Senape', 'senape'],
    ['Senape di Digione', 'senape'],
    ['Capperi', 'capperi'],
    ['Capperi sotto sale', 'capperi'],
    // ondata 1, lotto B (03/10)
    ['Maiale', 'maiale'],
    ['Carne di maiale', 'maiale'],
    ['Lonza', 'maiale'],
    ['Arista di maiale', 'maiale'],
    ['Braciola di maiale', 'maiale'],
    ['Costine', 'maiale'],
    ['Filetto di maiale', 'maiale'],
    ['Porchetta', 'maiale'],
    ['Agnello', 'agnello'],
    ["Costolette d'agnello", 'agnello'],
    ['Abbacchio', 'agnello'],
    ['Capretto', 'agnello'],
    ['Cozze', 'molluschi'],
    ['Vongole veraci', 'molluschi'],
    ['Calamari', 'molluschi'],
    ['Polpo', 'molluschi'],
    ['Polpo di scoglio', 'molluschi'],
    // prezzo accettato del blocco «polpa di»: «Polpa» da sola ha la radice di «polpo»
    // e prende i molluschi (bloccarla toglierebbe l'icona anche a «Polpo»)
    ['Polpa', 'molluschi'],
    ['Seppie', 'molluschi'],
    ['Totani', 'molluschi'],
    ['Moscardini', 'molluschi'],
    ['Ostriche', 'molluschi'],
    ['Capesante', 'molluschi'],
    ['Frutti di mare', 'molluschi'],
    ['Insalata di mare', 'molluschi'],
    ['Mais', 'mais'],
    ['Mais in scatola', 'mais'],
    ['Granturco', 'mais'],
    ['Pannocchia', 'mais'],
    ['Pannocchie', 'mais'],
    ['Pop corn', 'mais'],
    ['Popcorn', 'mais'],
    ['Peperoncino', 'peperoncino'],
    ['Peperoncini freschi', 'peperoncino'],
    ['Peperoncino in polvere', 'peperoncino'],
    ['Jalapeño', 'peperoncino'],
    // ondata 1, lotto C (03/10)
    ['Ananas', 'ananas'],
    ['Ananas sciroppato', 'ananas'],
    ['Succo di ananas', 'ananas'],
    ['Cocco', 'cocco'],
    ['Cocco rapè', 'cocco'],
    ['Noce di cocco', 'cocco'],
    ['Latte di cocco', 'cocco'],
    ['Farina di cocco', 'cocco'],
    ['Ciliegie', 'ciliegia'],
    ['Ciliege', 'ciliegia'],
    ['Amarene sciroppate', 'ciliegia'],
    ['Marasche', 'ciliegia'],
    ['Visciole', 'ciliegia'],
    ['Melone', 'melone'],
    ['Melone giallo', 'melone'],
    ['Anguria', 'melone'],
    ['Cocomero', 'melone'],
    ['Datteri', 'datteri-fichi'],
    ['Datteri Medjoul', 'datteri-fichi'],
    ['Fico', 'datteri-fichi'],
    ['Fichi', 'datteri-fichi'],
    ['Fichi secchi', 'datteri-fichi'],
    ["Fichi d'India", 'datteri-fichi'],
    // ondata 1, lotto D (03/10)
    ['Albicocca', 'pesca-albicocca'],
    ['Albicocche', 'pesca-albicocca'],
    ['Albicocche secche', 'pesca-albicocca'],
    ['Nettarine', 'pesca-albicocca'],
    ['Nettarina', 'pesca-albicocca'],
    ['Percoche', 'pesca-albicocca'],
    ['Uvetta', 'uvetta'],
    ['Uvette', 'uvetta'],
    ['Uvetta sultanina', 'uvetta'],
    ['Uva passa', 'uvetta'],
    ['Uva sultanina', 'uvetta'],
    ['Carciofi', 'carciofo'],
    ['Carciofo', 'carciofo'],
    ['Cuori di carciofo', 'carciofo'],
    ['Asparagi', 'asparago'],
    ['Asparagi verdi', 'asparago'],
    ['Punte di asparagi', 'asparago'],
    ['Semi di chia', 'semi'],
    ['Semi di lino', 'semi'],
    ['Semi di girasole', 'semi'],
    ['Semi di zucca', 'semi'],
    ['Semi di sesamo', 'semi'],
    ['Sesamo', 'semi'],
    ['Chia', 'semi'],
    ['Lino', 'semi'],
    // pulizia del lotto E (03/10): «seme» per i semi generici, «carciofino» per i sott'olio,
    // la preposizione «agli» non si legge come aglio
    ['Semi', 'semi'],
    ['Semi misti', 'semi'],
    ["Carciofini sott'olio", 'carciofo'],
    ['Risotto agli asparagi', 'asparago'],
    ['Aglio', 'aglio'],
    ['Aglio in polvere', 'aglio'],
    ["Spicchio d'aglio", 'aglio'],
    // ondata 1, lotto E (03/10)
    ['Vino', 'vino'],
    ['Vino bianco', 'vino'],
    ['Vino rosso', 'vino'],
    ['Vino bianco secco', 'vino'],
    ['Spumante', 'vino'],
    ['Prosecco', 'vino'],
    ['Liquore', 'liquore'],
    ["Liquore all'amaretto", 'liquore'],
    ['Rum', 'liquore'],
    ['Marsala', 'liquore'],
    ['Brandy', 'liquore'],
    ['Cognac', 'liquore'],
    ['Limoncello', 'liquore'],
    ['Grappa', 'liquore'],
    ['Tè', 'te'],
    ['Te verde', 'te'],
    ['Tè nero', 'te'],
    // era un blocco (pesca): ora vince «tè» in prima posizione, ed è l'icona giusta
    ['Tè alla pesca', 'te'],
    ['Tisana', 'te'],
    ['Camomilla', 'te'],
    ['Infuso di zenzero', 'te'],
    ['Cereali', 'cereali'],
    ['Cereali integrali', 'cereali'],
    ['Fiocchi di cereali', 'cereali'],
    ['Corn flakes', 'cereali'],
    ['Cornflakes', 'cereali'],
    ['Fiocchi di mais', 'cereali'],
    ['Muesli', 'cereali'],
    ['Granola', 'cereali'],
    ['Piadina', 'piadina'],
    ['Piadina integrale', 'piadina'],
    ['Piadine', 'piadina'],
    ['Tortilla', 'piadina'],
    ['Wrap', 'piadina'],
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
    // non regressione delle famiglie (03/10): i composti restano sull'ingrediente base
    ['Olio extravergine di oliva', 'olio'],
    ["Olio d'oliva", 'olio'],
    ['Frutti di bosco', 'fragola'],
    ['Noci', 'noce'],
    ['Yogurt alla frutta', 'yogurt'],
    ['Marmellata di frutta', 'marmellata'],
    // non regressione del lotto A (03/10)
    ['Yogurt alla vaniglia', 'yogurt'],
    ['Zucchero vanigliato', 'zucchero'],
    ['Fragole con panna', 'fragola'],
    ['Latte e panna', 'latte'],
    ['Olive e capperi', 'olive'],
    // omografi (review del lotto A): parole vicine a un sinonimo che non devono accenderlo
    ['Pane lievitato', 'pane'],
    // non regressione del lotto B (03/10)
    ['Amido di mais', 'farina'],
    ['Farina di mais', 'farina'],
    ['Salsiccia di maiale', 'salsiccia'],
    ['Macinato di manzo', 'bistecca'],
    ['Coste', 'foglie'],
    ['Polpa di pomodoro', 'pomodoro'],
    ['Spaghetti alle vongole', 'pasta'],
    ['Olio al peperoncino', 'olio'],
    ['Peperoni', 'peperone'],
    ['Pepe', 'spezie'],
    // non regressione del lotto C (03/10)
    ['Acqua di cocco', 'acqua'],
    ['Olio di cocco', 'olio'],
    ['Yogurt al cocco', 'yogurt'],
    ['Prosciutto e melone', 'salumi'],
    ['Confettura di fichi', 'marmellata'],
    ['Datterini', 'pomodorini'],
    ['Pomodorini ciliegini', 'pomodorini'],
    ['Ciliegini', 'pomodorini'],
    ['Mele', 'mela'],
    ['Melanzane', 'melanzana'],
    ['Marmellata di ciliegie', 'marmellata'],
    // non regressione del lotto D (03/10)
    ['Uva', 'uva'],
    ['Uva bianca', 'uva'],
    ['Marmellata di albicocche', 'marmellata'],
    ['Zucca', 'zucca'],
    ['Olio di semi', 'olio'],
    ['Olio di semi di girasole', 'olio'],
    ['Olio di sesamo', 'olio'],
    ['Farina di semi di lino', 'farina'],
    ['Yogurt con semi di chia', 'yogurt'],
    ['Pane ai semi di sesamo', 'pane'],
    ['Pasta e carciofi', 'pasta'],
    // pulizia del lotto E (03/10): «agli» ignorata, le posizioni delle altre parole non cambiano
    ['Pasta agli asparagi', 'pasta'],
    ['Spaghetti aglio e olio', 'pasta'],
    // non regressione del lotto E (03/10)
    ['Aceto di vino', 'ampolla'],
    ['Aceto di vino rosso', 'ampolla'],
    ['Pollo al marsala', 'cosciotto'],
    ['Pane ai cereali', 'pane'],
    ['Yogurt con cereali', 'yogurt'],
    ['Latte e cereali', 'latte'],
    ['Biscotti ai cereali', 'biscotto'],
    ['Mais', 'mais'],
    ['Limoni', 'limone'],
    ['Zenzero', 'spezie'],
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
    // omografi (review del lotto A): radici diverse da lievito, cappero, panna
    'Lievitato',
    'Cappuccino',
    // radice diversa da capretto, polpo, calamaro, mais
    'Caprino',
    'Polpette',
    'Calamarata',
    'Filetto',
    // radice diversa da amarena
    'Amaretti',
    // radice diversa da semi (sem): semifredd
    'Semifreddo',
    // la pesca resta senza icona: «pesca» è un blocco (radice di pesce) e «pesche» (pesch) non
    // combina con niente; `pesca-albicocca` prende solo albicocca, nettarina e percoca (lotto D)
    'Pesche',
    'Pesche sciroppate',
    // «agli» è ignorata come parola (preposizione articolata, stessa radice di «aglio»): il
    // plurale «Agli» da solo resta senza icona, prezzo accettato (lotto E)
    'Agli',
    // radici diverse da vino, liquore, piadina e cereali (lotto E); «Amaretto» è anche il
    // biscotto, non va su `liquore`
    'Vinaigrette',
    'Liquirizia',
    'Amaretto',
  ])('%s → null (omografo)', (nome) => {
    expect(trovaIcona(nome)).toBeNull();
  });

  it.each([
    // esito del gate del 26/09, rivisto il 03/10: i salumi hanno l'icona di famiglia, il mais
    // torna con la pannocchia ridisegnata (lotto B, da confermare al foglio)
    'Kiwi',
  ])('%s → null (gate 26/09)', (nome) => {
    expect(trovaIcona(nome)).toBeNull();
  });

  it.each([
    // tolti di proposito dai sinonimi (lotti A e B del 03/10): la besciamella è una salsa,
    // non la panna; la mostarda italiana è frutta candita, non la senape
    'Besciamella',
    'Mostarda',
  ])('%s → null (tolto dai sinonimi)', (nome) => {
    expect(trovaIcona(nome)).toBeNull();
  });

  // Esclusi di proposito dal catalogo icone al gate del 26/09 (rivisto il 03/10:
  // i salumi hanno l'icona di famiglia, il mais torna col lotto B): restano senza
  // icona per decisione di Andrea, non per un buco nel catalogo. Vuota di proposito
  // dal lotto B: oggi ogni INGREDIENTI_BASE ha un'icona; se un gate ne toglie una,
  // il nome torna qui.
  const ESCLUSI_DI_PROPOSITO: string[] = [];

  it('copre tutti gli INGREDIENTI_BASE, salvo gli esclusi di proposito', () => {
    const scoperti = INGREDIENTI_BASE.map((i) => i.nome).filter((n) => trovaIcona(n) === null);
    expect(scoperti).toEqual(ESCLUSI_DI_PROPOSITO);
  });

  it.each([
    // BLOCCHI: stessa radice di un sinonimo vero (pesca~pesce, grano~grana),
    // impasti/creme che non sono pasta secca o dolci col nome di un salume —
    // meglio nessuna icona che una sbagliata.
    'Pesca',
    'Succo di pesca',
    'Pesche noci',
    'Grano saraceno',
    'Semola di grano duro',
    'Semola rimacinata di grano duro',
    'Pasta sfoglia',
    'Pasta frolla',
    'Pasta brisée',
    'Pasta per pizza',
    'Pasta di acciughe',
    'Salame di cioccolato',
    'Panna cotta',
    'Panna cotta ai frutti di bosco',
    'Gelato alla vaniglia',
    'Budino alla vaniglia',
    'Polpa di zucca',
    'Polpa di granchio',
    'Mostarda di fichi',
    'Mostarda di Cremona',
    // semola: blocco esistente, non prende `semi` (lotto D)
    'Semola',
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
  it('94 icone (64 del 26/09 + 5 famiglie del 03/10 + 25 dell\'ondata 1)', () => {
    expect(CHIAVI_ICONE).toHaveLength(94);
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
