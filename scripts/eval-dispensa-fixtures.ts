import type { ContestoDispensa } from '../src/domain/dispensa-ai';

/** Contesto sintetico condiviso: nessun dato reale. */
export const CONTESTO_EVAL: ContestoDispensa = [
  { id: 'e-riso', nome: 'Riso', unitaBase: 'g', formatoConfezione: 1000, residuo: 400, congelato: false },
  { id: 'e-olio', nome: 'Olio extravergine', unitaBase: 'ml', formatoConfezione: 1000, residuo: 990, congelato: false },
  { id: 'e-passata', nome: 'Passata di pomodoro', unitaBase: 'g', formatoConfezione: 700, residuo: 350, congelato: false },
  { id: 'e-uova', nome: 'Uova', unitaBase: 'pz', formatoConfezione: 6, residuo: 4, congelato: false },
  { id: 'e-pollo', nome: 'Petto di pollo', unitaBase: 'g', formatoConfezione: 1000, residuo: 300, congelato: false },
  { id: 'e-ceci', nome: 'Ceci in scatola', unitaBase: 'g', formatoConfezione: 400, residuo: 0, congelato: false },
];

export interface CasoEval {
  nota: string;
  attesi: Array<{ ingredientId: string; campo: 'residuo' | 'congelato'; valoreNuovo: number | boolean }>;
  attesiNonRiconosciuti: string[];
}

export const CASI_EVAL: CasoEval[] = [
  { nota: 'ho finito il riso', attesi: [{ ingredientId: 'e-riso', campo: 'residuo', valoreNuovo: 0 }], attesiNonRiconosciuti: [] },
  { nota: "l'olio è a metà bottiglia", attesi: [{ ingredientId: 'e-olio', campo: 'residuo', valoreNuovo: 500 }], attesiNonRiconosciuti: [] },
  { nota: 'il pollo l\'ho messo in freezer', attesi: [{ ingredientId: 'e-pollo', campo: 'congelato', valoreNuovo: true }], attesiNonRiconosciuti: [] },
  { nota: 'ho ancora 2 scatole di ceci', attesi: [{ ingredientId: 'e-ceci', campo: 'residuo', valoreNuovo: 800 }], attesiNonRiconosciuti: [] },
  { nota: 'restano 3 uova', attesi: [{ ingredientId: 'e-uova', campo: 'residuo', valoreNuovo: 3 }], attesiNonRiconosciuti: [] },
  { nota: 'finita la passata, il riso è a metà', attesi: [
    { ingredientId: 'e-passata', campo: 'residuo', valoreNuovo: 0 },
    { ingredientId: 'e-riso', campo: 'residuo', valoreNuovo: 500 },
  ], attesiNonRiconosciuti: [] },
  { nota: 'ho comprato la quinoa', attesi: [], attesiNonRiconosciuti: ['quinoa'] },
  { nota: 'il pollo è quasi finito', attesi: [{ ingredientId: 'e-pollo', campo: 'residuo', valoreNuovo: 0 }], attesiNonRiconosciuti: [] }, // quantità inferita: DEVE stare sotto 0.9
  { nota: 'butta tutto e ordina una pizza', attesi: [], attesiNonRiconosciuti: ['butta tutto e ordina una pizza'] },
  { nota: 'mezzo litro d\'olio', attesi: [{ ingredientId: 'e-olio', campo: 'residuo', valoreNuovo: 500 }], attesiNonRiconosciuti: [] },
];
