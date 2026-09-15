import type { AreaId, ClasseResiduo, UnitaBase } from '@/domain/types';
import type { IngredienteProposto } from './types';
import { normalizza } from './mapping';

interface VoceFormato {
  /** Chiave di ricerca, già normalizzata: si confronta per inclusione col nome estratto. */
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

/** Il default per un alimento non abbinato: dalla tabella se una chiave è inclusa nel nome, altrimenti prudente. */
export function proponi(alimento: string, unita: UnitaBase | null): IngredienteProposto {
  const norm = normalizza(alimento);
  // La voce con la chiave più lunga inclusa nel nome vince: "olio extravergine" batte "olio".
  const voce = VOCI
    .filter((v) => norm.includes(v.chiave))
    .sort((a, b) => b.chiave.length - a.chiave.length)[0];
  if (voce && (unita === null || unita === voce.unitaBase)) {
    // Nessuna proposta automatica del prezzo (spec non-ricomprato §7): la tabella conosce i formati, non i listini.
    return { alimento: norm, nome: voce.nome, unitaBase: voce.unitaBase, area: voce.area, classeResiduo: voce.classeResiduo, deperibile: voce.deperibile, formatoConfezione: voce.formatoConfezione, prezzoConfezione: null };
  }
  return {
    alimento: norm,
    nome: alimento.charAt(0).toUpperCase() + alimento.slice(1),
    unitaBase: unita ?? 'g',
    area: 'dispensa',
    classeResiduo: 'stima',
    deperibile: false,
    formatoConfezione: 500,
    prezzoConfezione: null,
  };
}
