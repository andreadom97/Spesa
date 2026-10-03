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
 * Formati tipici del supermercato italiano: default proposti al passo formati,
 * sempre correggibili dall'utente. Quando arriverà l'estrattore Claude, la sua
 * proposta rimpiazzerà la tabella per i casi non coperti; il fallback resta.
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
  { chiave: 'yogurt greco', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 170 },
  { chiave: 'yogurt', nome: 'Yogurt', unitaBase: 'g', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 125 },
  { chiave: 'parmigiano', nome: 'Parmigiano', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { chiave: 'mozzarella', nome: 'Mozzarella', unitaBase: 'g', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 125 },
  { chiave: 'feta', nome: 'Feta', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { chiave: 'ricotta', nome: 'Ricotta', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 250 },
  { chiave: 'uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 6 },
  { chiave: 'petto di pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
  { chiave: 'fesa di tacchino', nome: 'Fesa di tacchino', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
  { chiave: 'manzo', nome: 'Manzo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
  { chiave: 'prosciutto cotto', nome: 'Prosciutto cotto', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 120 },
  { chiave: 'bresaola', nome: 'Bresaola', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 100 },
  { chiave: 'salmone', nome: 'Salmone', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { chiave: 'tonno al naturale', nome: 'Tonno al naturale', unitaBase: 'g', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 160 },
  { chiave: 'filetto di merluzzo', nome: 'Filetto di merluzzo', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 300 },
  { chiave: 'ceci', nome: 'Ceci', unitaBase: 'g', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 240 },
  { chiave: 'fagioli', nome: 'Fagioli', unitaBase: 'g', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 240 },
  { chiave: 'lenticchie', nome: 'Lenticchie', unitaBase: 'g', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 250 },
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
      classeResiduo: voce.classeResiduo,
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
];

/** Grammi di un pezzo per il primo dei nomi che la tabella conosce, o null. */
export function pesoPezzo(...nomi: string[]): number | null {
  return voceTabella(PESO_PEZZO, nomi)?.grammi ?? null;
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

export function porzioneTipica(alimento: string): { quantita: number; unita: UnitaBase } | null {
  const voce = voceTabella(PORZIONE_TIPICA, [alimento]);
  return voce ? { quantita: voce.quantita, unita: voce.unita } : null;
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
