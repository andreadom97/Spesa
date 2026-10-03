import type { AreaId, ClasseResiduo, UnitaBase } from '@/domain/types';
import type { IngredienteProposto, UnitaCucchiaio, UnitaRiga } from './types';
import { normalizza } from './mapping';

interface VoceFormato {
  /** Chiave di ricerca, già normalizzata: si confronta per parole intere col nome estratto. */
  chiave: string;
  nome: string;
  unitaBase: UnitaBase;
  area: AreaId;
  classeResiduo: ClasseResiduo;
  deperibile: boolean;
  formatoConfezione: number;
}

/**
 * «intero» vuol dire formato 1 a pezzi (`list-builder`, `confezioni`): in g o ml conterebbe una
 * confezione per grammo o per millilitro. Fuori dai pezzi diventa «porzionabile» (review finale
 * 8c, I3): la confezione resta una, col suo peso. Lo usano `proponi`, la Scheda e `traduciBozza`.
 */
export function classeCoerente(classe: ClasseResiduo, unita: UnitaBase): ClasseResiduo {
  return classe === 'intero' && unita !== 'pz' ? 'porzionabile' : classe;
}

/**
 * Formati tipici del supermercato italiano: default proposti al passo formati,
 * sempre correggibili dall'utente. Quando arriverà l'estrattore Claude, la sua
 * proposta rimpiazzerà la tabella per i casi non coperti; il fallback resta.
 * «intero» solo per le voci a pezzi (`classeCoerente`).
 */
const VOCI: VoceFormato[] = [
  { chiave: 'pasta', nome: 'Pasta di semola', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { chiave: 'riso', nome: 'Riso', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { chiave: 'farina 00', nome: 'Farina 00', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { chiave: 'pane', nome: 'Pane', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { chiave: 'fette biscottate', nome: 'Fette biscottate', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 315 },
  { chiave: "fiocchi d'avena", nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { chiave: 'cous cous', nome: 'Cous cous', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { chiave: 'latte', nome: 'Latte', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 },
  { chiave: 'yogurt greco', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 170 },
  { chiave: 'yogurt', nome: 'Yogurt', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 125 },
  { chiave: 'parmigiano', nome: 'Parmigiano', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { chiave: 'mozzarella', nome: 'Mozzarella', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 125 },
  { chiave: 'feta', nome: 'Feta', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { chiave: 'ricotta', nome: 'Ricotta', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 250 },
  { chiave: 'uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 6 },
  { chiave: 'petto di pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
  { chiave: 'fesa di tacchino', nome: 'Fesa di tacchino', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
  { chiave: 'manzo', nome: 'Manzo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
  { chiave: 'prosciutto cotto', nome: 'Prosciutto cotto', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 120 },
  { chiave: 'bresaola', nome: 'Bresaola', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 100 },
  { chiave: 'salmone', nome: 'Salmone', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { chiave: 'tonno al naturale', nome: 'Tonno al naturale', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 160 },
  { chiave: 'filetto di merluzzo', nome: 'Filetto di merluzzo', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 300 },
  { chiave: 'ceci', nome: 'Ceci', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 240 },
  { chiave: 'fagioli', nome: 'Fagioli', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 240 },
  { chiave: 'lenticchie', nome: 'Lenticchie', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 250 },
  { chiave: 'piselli surgelati', nome: 'Piselli surgelati', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 450 },
  { chiave: 'passata di pomodoro', nome: 'Passata di pomodoro', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 700 },
  { chiave: 'pomodorini', nome: 'Pomodorini', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { chiave: 'insalata', nome: 'Insalata', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { chiave: 'zucchine', nome: 'Zucchine', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { chiave: 'carote', nome: 'Carote', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { chiave: 'patate', nome: 'Patate', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { chiave: 'mela', nome: 'Mela', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 },
  { chiave: 'frutta secca', nome: 'Frutta secca', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 200 },
  { chiave: 'frutta', nome: 'Frutta fresca', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 },
  { chiave: 'olio extravergine', nome: 'Olio extravergine di oliva', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { chiave: 'olio di semi', nome: 'Olio di semi', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { chiave: 'cioccolato fondente', nome: 'Cioccolato fondente', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 100 },
  { chiave: 'marmellata', nome: 'Marmellata', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 350 },
  { chiave: 'miele', nome: 'Miele', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 400 },
  { chiave: 'crackers', nome: 'Crackers', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 250 },
];

/**
 * Spezie, erbe, sale e pepe (correzione 8c-bis A, prove dal telefono del 03/10): si usano «quanto
 * basta», senza grammatura. Chiavi già normalizzate. Lo zenzero fresco si compra a grammi, quindi
 * c'è solo «zenzero in polvere».
 */
const SPEZIE = [
  'sale', 'pepe', 'cannella', 'origano', 'basilico', 'prezzemolo', 'rosmarino', 'timo', 'salvia', 'alloro',
  'maggiorana', 'menta', 'aneto', 'erba cipollina', 'curcuma', 'paprika', 'peperoncino', 'noce moscata',
  'zenzero in polvere', 'curry', 'cumino', 'coriandolo', 'chiodi di garofano', 'vaniglia', 'zafferano',
  'semi di finocchio', 'spezie', 'erbe aromatiche', 'aromi',
];

/**
 * Vero se l'alimento è una spezia o un'erba: la chiave sta SOLO in testa al nome e per parole intere
 * («sale fino», «pepe nero», «cannella in polvere» sì; «salmone», «salsa di pomodoro», «peperoni»,
 * «pesto alla genovese», «pane alle erbe» no), come `categoriaDi`.
 */
export function eSpezia(alimento: string): boolean {
  const norm = normalizza(alimento).replace(/['’]/g, ' ').replace(/\s+/g, ' ');
  return SPEZIE.some((chiave) => norm === chiave || norm.startsWith(`${chiave} `));
}

/** Vero se `chiave` compare in `norm` come sequenza di parole intere: «melanzane» non contiene la parola «mela». */
function contieneParole(norm: string, chiave: string): boolean {
  return ` ${norm} `.includes(` ${chiave} `);
}

/**
 * La voce della tabella per l'alimento: fra quelle la cui chiave compare per parole intere
 * vince la più lunga («yogurt greco» batte «yogurt»), e vale solo se l'unità della riga
 * è `null` o la sua.
 */
function voceDi(alimento: string, unita: UnitaBase | null): VoceFormato | null {
  const voce = voceTabella(VOCI, [alimento]);
  if (!voce) return null;
  return unita === null || unita === voce.unitaBase ? voce : null;
}

/** Da dove viene la proposta di `proponi`: deterministica, si ricalcola invece di salvarla nella bozza (spec 8b §A). */
export function origineProposta(alimento: string, unita: UnitaBase | null): 'tabella' | 'ripiego' {
  return voceDi(alimento, unita) ? 'tabella' : 'ripiego';
}

/** Il nome come lo scrive la dieta, con la prima lettera maiuscola. */
function nomeDallaDieta(alimento: string): string {
  const pulito = alimento.trim().replace(/\s+/g, ' ');
  return pulito.charAt(0).toUpperCase() + pulito.slice(1);
}

/**
 * Il default per un alimento non abbinato (spec 8b §A). Dalla tabella prende unità, area,
 * classe, fresco e confezione; il nome è quello della tabella solo se l'alimento è proprio
 * la chiave («pasta» → «Pasta di semola»), altrimenti quello della dieta («pane integrale»
 * resta «Pane integrale», e non diventa «Pane» come «pane di segale»). Fuori tabella, il
 * ripiego prudente: dispensa, a stima, non fresco, 1 pz o 500 g/ml a confezione.
 * Nessuna proposta del prezzo (spec non-ricomprato §7): la tabella conosce i formati, non i listini.
 */
export function proponi(alimento: string, unita: UnitaBase | null): IngredienteProposto {
  const norm = normalizza(alimento);
  const voce = voceDi(alimento, unita);
  if (voce) {
    return {
      alimento: norm,
      nome: norm === voce.chiave ? voce.nome : nomeDallaDieta(alimento),
      unitaBase: voce.unitaBase,
      area: voce.area,
      classeResiduo: classeCoerente(voce.classeResiduo, voce.unitaBase),
      deperibile: voce.deperibile,
      formatoConfezione: voce.formatoConfezione,
      prezzoConfezione: null,
    };
  }
  const unitaBase = unita ?? 'g';
  return {
    alimento: norm,
    nome: nomeDallaDieta(alimento),
    unitaBase,
    area: 'dispensa',
    classeResiduo: 'stima',
    deperibile: false,
    // A pezzi, 500 a confezione farebbe comprare 1 confezione per 3 olive e lasciarne 497 in dispensa.
    formatoConfezione: unitaBase === 'pz' ? 1 : 500,
    prezzoConfezione: null,
  };
}

// --- Fase 8c: pesi, cucchiai, porzioni (spec §A.1, §C, §D). VALORI MEDI da fonti comuni
// (tabelle merceologiche, porzioni standard LARN/SINU): si mostrano sempre coi due valori e si
// correggono nella Scheda. Le chiavi si confrontano per parole intere, come quelle dei formati.

/** La voce di una tabella che compare per parole intere nel primo nome che ne ha una; vince la chiave più lunga. */
function voceTabella<T extends { chiave: string }>(tabella: T[], nomi: string[]): T | null {
  for (const nome of nomi) {
    const norm = normalizza(nome);
    const voce = tabella
      .filter((v) => contieneParole(norm, v.chiave))
      .sort((a, b) => b.chiave.length - a.chiave.length)[0];
    if (voce) return voce;
  }
  return null;
}

/** Grammi di un pezzo, medi (spec §A.1). */
const PESO_PEZZO: { chiave: string; grammi: number }[] = [
  { chiave: 'zucchina', grammi: 200 }, { chiave: 'zucchine', grammi: 200 },
  { chiave: 'mela', grammi: 180 }, { chiave: 'mele', grammi: 180 },
  { chiave: 'pera', grammi: 180 }, { chiave: 'pere', grammi: 180 },
  { chiave: 'banana', grammi: 120 }, { chiave: 'banane', grammi: 120 },
  { chiave: 'arancia', grammi: 200 }, { chiave: 'arance', grammi: 200 },
  { chiave: 'limone', grammi: 100 }, { chiave: 'limoni', grammi: 100 },
  { chiave: 'kiwi', grammi: 80 },
  { chiave: 'uovo', grammi: 60 }, { chiave: 'uova', grammi: 60 },
  { chiave: 'carota', grammi: 80 }, { chiave: 'carote', grammi: 80 },
  { chiave: 'cipolla', grammi: 150 }, { chiave: 'cipolle', grammi: 150 },
  { chiave: 'patata', grammi: 200 }, { chiave: 'patate', grammi: 200 },
  { chiave: 'pomodoro', grammi: 120 }, { chiave: 'pomodori', grammi: 120 },
  { chiave: 'peperone', grammi: 200 }, { chiave: 'peperoni', grammi: 200 },
  { chiave: 'melanzana', grammi: 300 }, { chiave: 'melanzane', grammi: 300 },
  { chiave: 'finocchio', grammi: 250 }, { chiave: 'finocchi', grammi: 250 },
  { chiave: 'avocado', grammi: 200 },
  // Gli aromi che si contano a pezzi (8c-bis C, review): valori medi, non misurati. Senza, «1 pz»
  // di aglio in g diventava 100 g. Un pezzo di aglio è uno spicchio, di sedano una costa.
  { chiave: 'aglio', grammi: 5 }, { chiave: 'agli', grammi: 5 },
  { chiave: "spicchio d'aglio", grammi: 5 }, { chiave: "spicchi d'aglio", grammi: 5 },
  { chiave: 'sedano', grammi: 50 }, { chiave: 'sedani', grammi: 50 },
  { chiave: 'scalogno', grammi: 30 }, { chiave: 'scalogni', grammi: 30 },
  { chiave: 'porro', grammi: 150 }, { chiave: 'porri', grammi: 150 },
  { chiave: 'cipollotto', grammi: 20 }, { chiave: 'cipollotti', grammi: 20 },
  // Il sedano rapa è una radice, non una costa: vince la chiave più lunga.
  { chiave: 'sedano rapa', grammi: 400 },
];

/** Grammi di un pezzo per il primo dei nomi che la tabella conosce, o null. */
export function pesoPezzo(...nomi: string[]): number | null {
  // L'apostrofo curvo vale come quello dritto, così le chiavi esplicite («spicchi d'aglio») lo
  // trovano. Niente seconda passata con l'apostrofo come spazio: dava «pane all'aglio» 5 g, «pasta
  // all'uovo» 60 g, «succo d'arancia» 200 g (review finale 8c-bis, M3).
  return voceTabella(PESO_PEZZO, nomi.map((n) => n.replace(/’/g, "'")))?.grammi ?? null;
}

/** Un cucchiaio e un cucchiaino generici, in ml (spec §C). */
const CUCCHIAIO_ML: Record<UnitaCucchiaio, number> = { cucchiaio: 15, cucchiaino: 5 };

/** Grammi di un cucchiaio e di un cucchiaino per alimento, medi (spec §C). */
const CUCCHIAIO_G: { chiave: string; cucchiaio: number; cucchiaino: number }[] = [
  { chiave: 'miele', cucchiaio: 21, cucchiaino: 7 },
  { chiave: 'zucchero', cucchiaio: 12, cucchiaino: 4 },
  { chiave: 'olio', cucchiaio: 13, cucchiaino: 4 },
  { chiave: 'sale', cucchiaio: 18, cucchiaino: 6 },
  { chiave: 'burro', cucchiaio: 14, cucchiaino: 5 },
];

/** In g senza voce: la proposta da controllare (spec §C). */
const CUCCHIAIO_G_GENERICO: Record<UnitaCucchiaio, number> = { cucchiaio: 15, cucchiaino: 5 };

/**
 * Una quantità a cucchiai nell'unità dell'ingrediente (spec §C): in ml i valori generici, in g la
 * tabella per alimento. `daTabella` false = in g senza voce, 15 g o 5 g: una proposta da
 * controllare. A pezzi non si converte: null, e resta un dubbio senza proposta.
 */
export function convertiCucchiai(
  quantita: number,
  unita: UnitaCucchiaio,
  alimento: string,
  verso: UnitaBase,
): { quantita: number; daTabella: boolean } | null {
  if (verso === 'ml') return { quantita: quantita * CUCCHIAIO_ML[unita], daTabella: true };
  if (verso === 'pz') return null;
  const voce = voceTabella(CUCCHIAIO_G, [alimento]);
  return voce
    ? { quantita: quantita * voce[unita], daTabella: true }
    : { quantita: quantita * CUCCHIAIO_G_GENERICO[unita], daTabella: false };
}

/** Porzioni tipiche per una riga senza quantità (spec §D), medie (LARN/SINU). */
const PORZIONE_TIPICA: { chiave: string; quantita: number; unita: UnitaBase }[] = [
  { chiave: 'pasta', quantita: 80, unita: 'g' },
  { chiave: 'riso', quantita: 80, unita: 'g' },
  { chiave: 'pane', quantita: 50, unita: 'g' },
  { chiave: "fiocchi d'avena", quantita: 30, unita: 'g' },
  { chiave: 'fette biscottate', quantita: 30, unita: 'g' },
  { chiave: 'patate', quantita: 200, unita: 'g' },
  { chiave: 'verdura', quantita: 200, unita: 'g' },
  { chiave: 'verdure', quantita: 200, unita: 'g' },
  { chiave: 'insalata', quantita: 80, unita: 'g' },
  { chiave: 'insalate', quantita: 80, unita: 'g' },
  { chiave: 'frutta', quantita: 150, unita: 'g' },
  { chiave: 'frutta secca', quantita: 30, unita: 'g' },
  { chiave: 'latte', quantita: 125, unita: 'ml' },
  { chiave: 'yogurt', quantita: 125, unita: 'g' },
  { chiave: 'ricotta', quantita: 100, unita: 'g' },
  { chiave: 'mozzarella', quantita: 100, unita: 'g' },
  { chiave: 'pollo', quantita: 100, unita: 'g' },
  { chiave: 'tacchino', quantita: 100, unita: 'g' },
  { chiave: 'manzo', quantita: 100, unita: 'g' },
  { chiave: 'pesce', quantita: 150, unita: 'g' },
  { chiave: 'merluzzo', quantita: 150, unita: 'g' },
  { chiave: 'salmone', quantita: 150, unita: 'g' },
  { chiave: 'prosciutto', quantita: 50, unita: 'g' },
  { chiave: 'bresaola', quantita: 50, unita: 'g' },
  { chiave: 'uovo', quantita: 1, unita: 'pz' },
  { chiave: 'uova', quantita: 1, unita: 'pz' },
  { chiave: 'olio', quantita: 10, unita: 'ml' },
];

export type CategoriaPorzione = 'verdure' | 'frutta';

/**
 * Il ripiego per categoria delle porzioni tipiche (Task 12b): le parole di verdure e ortaggi e
 * quelle della frutta, ognuna al singolare e al plurale (fix M3). Valgono solo in testa
 * all'alimento (fix M2, `categoriaDi`).
 */
const CATEGORIE: { chiave: string; categoria: CategoriaPorzione }[] = [
  ...[
    'zucchina', 'zucchine', 'melanzana', 'melanzane', 'peperone', 'peperoni', 'pomodoro', 'pomodori',
    'pomodorino', 'pomodorini', 'datterino', 'datterini', 'ciliegino', 'ciliegini', 'carota', 'carote',
    'finocchio', 'finocchi', 'sedano', 'sedani', 'sedano rapa', 'cetriolo', 'cetrioli', 'cavolo', 'cavoli',
    'cavolfiore', 'cavolfiori', 'cavolo nero', 'cavolo cappuccio', 'verza', 'verze', 'broccolo', 'broccoli',
    'cima di rapa', 'cime di rapa', 'friariello', 'friarielli', 'spinacio', 'spinaci', 'spinacino', 'spinacini',
    'bietola', 'bietole', 'bieta', 'biete', 'catalogna', 'catalogne', 'cicoria', 'cicorie', 'puntarella',
    'puntarelle', 'scarola', 'scarole', 'indivia', 'indivie', 'lattuga', 'lattughe', 'lattughino', 'lattughini',
    'insalata', 'insalate', 'rucola', 'rucole', 'radicchio', 'radicchi', 'valeriana', 'valeriane', 'songino',
    'crescione', 'carciofo', 'carciofi', 'cardo', 'cardi', 'asparago', 'asparagi', 'fagiolino', 'fagiolini',
    'piselli freschi', 'porro', 'porri', 'cipolla', 'cipolle', 'cipollina', 'cipolline', 'cipollotto',
    'cipollotti', 'scalogno', 'scalogni', 'zucca', 'zucche', 'fungo', 'funghi', 'champignon', 'ravanello',
    'ravanelli', 'rapa', 'rape', 'barbabietola', 'barbabietole', 'cavoletto di bruxelles', 'cavoletti di bruxelles',
    'fiore di zucca', 'fiori di zucca', 'germoglio', 'germogli', 'topinambur', 'ortaggio', 'ortaggi',
    'verdura', 'verdure', 'contorno di verdura', 'contorno di verdure',
  ].map((chiave) => ({ chiave, categoria: 'verdure' as const })),
  ...[
    // Non «frutti» da solo: «frutti di mare» non è frutta (fix M2).
    'mela', 'mele', 'pera', 'pere', 'arancia', 'arance', 'mandarino', 'mandarini', 'clementina', 'clementine',
    'pompelmo', 'pompelmi', 'banana', 'banane', 'kiwi', 'pesca', 'pesche', 'nettarina', 'nettarine',
    'albicocca', 'albicocche', 'susina', 'susine', 'prugna', 'prugne', 'ciliegia', 'ciliegie', 'fragola',
    'fragole', 'frutti di bosco', 'frutti rossi', 'mirtillo', 'mirtilli', 'lampone', 'lamponi', 'mora', 'more',
    'ribes', 'uva', 'melone', 'meloni', 'anguria', 'angurie', 'ananas', 'mango', 'manghi', 'papaya', 'papaye',
    'caco', 'cachi', 'fico', 'fichi', 'melagrana', 'melagrane', 'melograno', 'melograni', 'nespola', 'nespole',
    'macedonia', 'macedonie', 'frutta', 'frutta fresca', 'frutto',
  ].map((chiave) => ({ chiave, categoria: 'frutta' as const })),
];

/**
 * Le forme lavorate dopo la testa: «pomodori secchi», «uva passa», «carciofi sott'olio» non sono una
 * porzione di frutta o di verdura. Si confrontano senza apostrofi («sott'olio» = «sottolio»).
 */
const LAVORATI = [
  'succo', 'succhi', 'spremuta', 'estratto', 'centrifugato', 'marmellata', 'confettura', 'composta', 'passata',
  'polpa', 'concentrato', 'salsa', 'sugo', 'secco', 'secca', 'secchi', 'secche', 'essiccato', 'essiccata',
  'essiccati', 'essiccate', 'disidratato', 'disidratata', 'disidratati', 'disidratate', 'sciroppato',
  'sciroppata', 'sciroppati', 'sciroppate', 'candito', 'candita', 'canditi', 'candite', 'torta', 'crostata',
  'polvere', 'farina', 'sottolio', 'sottaceto', 'sottaceti', 'passa', 'pelati', 'pelato', 'aceto',
];

/** Porzioni medie per categoria (LARN/SINU): verdure e ortaggi 200 g, frutta 150 g. */
const PORZIONE_CATEGORIA: Record<CategoriaPorzione, number> = { verdure: 200, frutta: 150 };

/**
 * Verdure, frutta, o null. La parola della categoria vale solo in testa all'alimento (fix M2): la
 * prima parola, o le prime per le chiavi composte («cavolo nero», «frutti di bosco»); vince la più
 * lunga. Così «aceto di mele», «pesto di rucola» o «gelato alla fragola» restano fuori. Fuori anche
 * le forme lavorate (`LAVORATI`), ovunque compaiano.
 */
export function categoriaDi(alimento: string): CategoriaPorzione | null {
  // L'apostrofo tolto («sott'olio» = «sottolio») e come spazio («all'aceto» = «all aceto»).
  const norm = normalizza(alimento).replace(/['’]/g, ' ').replace(/\s+/g, ' ');
  const unito = normalizza(alimento).replace(/['’]/g, '');
  if (LAVORATI.some((parola) => contieneParole(norm, parola) || contieneParole(unito, parola))) return null;
  const voce = CATEGORIE
    .filter((v) => norm === v.chiave || norm.startsWith(`${v.chiave} `))
    .sort((a, b) => b.chiave.length - a.chiave.length)[0];
  return voce?.categoria ?? null;
}

/**
 * La porzione tipica di una riga senza quantità: la voce della tabella, che vince sempre, poi il
 * ripiego per categoria (Task 12b). `origine` dice quale delle due.
 */
export function porzioneTipica(alimento: string): { quantita: number; unita: UnitaBase; origine: 'porzione' | 'categoria' } | null {
  const voce = voceTabella(PORZIONE_TIPICA, [alimento]);
  if (voce) return { quantita: voce.quantita, unita: voce.unita, origine: 'porzione' };
  const categoria = categoriaDi(alimento);
  return categoria ? { quantita: PORZIONE_CATEGORIA[categoria], unita: 'g', origine: 'categoria' } : null;
}

/**
 * La porzione tipica di un alimento portata nell'unità `verso` (null = la sua): nell'unità della
 * porzione com'è, altrimenti convertita col peso di un pezzo se c'è; verdure e frutta a pezzi senza
 * peso sono 1 pz (ruling del Task 12b); altrimenti null. È la regola di una riga senza quantità
 * (`propostaPer` in dubbi.ts) e della stima rifatta (`stimaNellUnita`): una fonte sola.
 */
export function porzioneNellUnita(
  alimento: string,
  verso: UnitaBase | null,
  peso: number | null,
): { quantita: number; unita: UnitaBase; origine: 'porzione' | 'categoria' } | null {
  const porzione = porzioneTipica(alimento);
  if (!porzione) return null;
  const { origine } = porzione;
  if (verso === null || verso === porzione.unita) return { quantita: porzione.quantita, unita: porzione.unita, origine };
  const convertita = peso === null ? null : convertiPezzi(porzione.quantita, porzione.unita, verso, peso);
  if (convertita !== null) return { quantita: convertita, unita: verso, origine };
  if (verso === 'pz' && categoriaDi(alimento) !== null) return { quantita: 1, unita: 'pz', origine };
  return null;
}

/**
 * La stima di una riga che il lettore ha proposto (`quantitaInferita`) in un'unità diversa da
 * quella finale dell'ingrediente, quando non si può convertire (manca il peso di un pezzo):
 * rifatta nell'unità finale con la stessa proposta di una riga senza quantità (`porzioneNellUnita`).
 * Se nemmeno quella dà un valore: 1 pz, 100 g, 100 ml (correzione 8c-bis C, prove dal telefono del
 * 03/10). Resta una stima: chi la chiama non la presenta come scritta sul foglio.
 */
export function stimaNellUnita(alimento: string, unita: UnitaBase, peso: number | null): number {
  return porzioneNellUnita(alimento, unita, peso)?.quantita ?? (unita === 'pz' ? 1 : 100);
}

/** Spec §A.3: pz al quarto, g all'intero, mai sotto il minimo (il database vuole > 0); ml al decimo. */
export function arrotonda(quantita: number, unita: UnitaBase): number {
  if (unita === 'pz') return Math.max(0.25, Math.round(quantita * 4) / 4);
  if (unita === 'g') return Math.max(1, Math.round(quantita));
  return Math.max(0.1, Math.round(quantita * 10) / 10);
}

/** Fra g e pz col peso di un pezzo, arrotondato (§A.3); la stessa unità resta com'è; fra altre unità null. */
export function convertiPezzi(quantita: number, da: UnitaBase, a: UnitaBase, peso: number): number | null {
  if (da === a) return quantita;
  if (da === 'pz' && a === 'g') return arrotonda(quantita * peso, 'g');
  if (da === 'g' && a === 'pz') return arrotonda(quantita / peso, 'pz');
  return null;
}

/** Un numero come lo si legge: la virgola, al massimo due decimali («0,75», «7,5», «0,33»). */
export function numeroInParole(n: number): string {
  return String(Number(n.toFixed(2))).replace('.', ',');
}

const NOMI_UNITA: Record<UnitaRiga, [string, string]> = {
  g: ['g', 'g'], ml: ['ml', 'ml'], pz: ['pz', 'pz'],
  cucchiaio: ['cucchiaio', 'cucchiai'], cucchiaino: ['cucchiaino', 'cucchiaini'],
};

/** «150 g», «1 cucchiaio», «2 cucchiaini»: il singolare solo per 1. */
export function quantitaInTesto(quantita: number, unita: UnitaRiga): string {
  const [uno, molti] = NOMI_UNITA[unita];
  return `${numeroInParole(quantita)} ${quantita === 1 ? uno : molti}`;
}

/** I due valori di una conversione (spec 8c, «Come si mostra una conversione»): «150 g, quindi 0,75 pz». */
export function testoConversione(da: { quantita: number; unita: UnitaRiga }, a: { quantita: number; unita: UnitaBase }): string {
  return `${quantitaInTesto(da.quantita, da.unita)}, quindi ${quantitaInTesto(a.quantita, a.unita)}`;
}

export const UNITA_IN_PAROLE: Record<UnitaBase, string> = { g: 'grammi', ml: 'millilitri', pz: 'pezzi' };

/** Il cambio di unità in una frase (spec §A.3): «Zucchine passa a grammi: 1 pz = 200 g.» */
export function testoCambio(nome: string, a: UnitaBase, peso: number): string {
  return `${nome} passa a ${UNITA_IN_PAROLE[a]}: 1 pz = ${numeroInParole(peso)} g.`;
}
