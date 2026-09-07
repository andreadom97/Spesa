import type { UnitaBase } from './types';

/**
 * Un codice a barre accettabile: da 8 (EAN-8) a 14 (GTIN-14) cifre, solo cifre,
 * dopo aver tolto gli spazi ai bordi perché il campo digitato a mano li porta con
 * sé. Niente controllo della cifra di verifica: OFF risponde comunque `status: 0`
 * per un codice inesistente, e un controllo qui rifiuterebbe i codici interni
 * dei supermercati che non la rispettano.
 */
export function eanValido(s: string): boolean {
  return /^\d{8,14}$/.test(s.trim());
}

export interface QuantitaConfezione {
  valore: number;
  unita: UnitaBase;
}

/**
 * Unità riconosciute e il fattore verso l'unità base. Le sigle italiane più
 * comuni su OFF ("gr", "lt") sono alias innocui; "oz", "lb" e simili restano
 * fuori: un prodotto in once non arriva in un supermercato italiano e se
 * arrivasse sarebbe meglio dire "non capisco" che convertire a caso.
 */
const UNITA: Record<string, { base: UnitaBase; fattore: number }> = {
  g: { base: 'g', fattore: 1 },
  gr: { base: 'g', fattore: 1 },
  kg: { base: 'g', fattore: 1000 },
  ml: { base: 'ml', fattore: 1 },
  cl: { base: 'ml', fattore: 10 },
  dl: { base: 'ml', fattore: 100 },
  l: { base: 'ml', fattore: 1000 },
  lt: { base: 'ml', fattore: 1000 },
  pz: { base: 'pz', fattore: 1 },
  pezzi: { base: 'pz', fattore: 1 },
  pezzo: { base: 'pz', fattore: 1 },
  uova: { base: 'pz', fattore: 1 },
  uovo: { base: 'pz', fattore: 1 },
};

/** Le unità dei campi numerici di OFF: lì i pezzi non esistono, solo peso e volume. */
const UNITA_NUMERICHE = new Set(['g', 'gr', 'kg', 'ml', 'cl', 'dl', 'l', 'lt']);

/** Sigle in ordine di lunghezza decrescente: "kg" prima di "g", "ml" prima di "l". */
const SIGLE = Object.keys(UNITA).sort((a, b) => b.length - a.length).join('|');

/**
 * Cerca la prima quantità nel testo, da sinistra. Le alternative sono nell'ordine
 * in cui devono vincere sulla stessa posizione:
 *  1. `[N x] valore unità`  — "500 g", "1,5 l", "6 x 125 g": il multipack
 *     dev'essere provato per primo, altrimenti "6 x 125 g" darebbe 125 g;
 *  2. `x N`                 — "x6", "x 12": conteggio senza unità = pezzi.
 * Il lookahead `(?![a-z])` dopo l'unità evita che "500 grandi" passi per 500 g;
 * il lookbehind sul numero evita di leggere "5" dentro "1.5" e rifiuta "-500 g".
 */
const RE_QUANTITA = new RegExp(
  `(?:(\\d+)\\s*x\\s*)?(?<![\\d.-])(\\d+(?:\\.\\d+)?)\\s*(${SIGLE})(?![a-z])|(?<![a-z])x\\s*(\\d+)(?![\\d.])`,
);

function arrotonda3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function numeroPositivo(v: unknown): number | null {
  const n =
    typeof v === 'number' ? v
    : typeof v === 'string' && v.trim() !== '' ? Number(v.trim().replace(',', '.'))
    : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function inBase(valore: number, sigla: string): QuantitaConfezione | null {
  const u = UNITA[sigla];
  if (!u) return null;
  const v = arrotonda3(valore * u.fattore);
  return v > 0 ? { valore: v, unita: u.base } : null;
}

function daCampiNumerici(product_quantity: unknown, product_quantity_unit: unknown): QuantitaConfezione | null {
  const valore = numeroPositivo(product_quantity);
  if (valore === null || typeof product_quantity_unit !== 'string') return null;
  const sigla = product_quantity_unit.trim().toLowerCase();
  if (!UNITA_NUMERICHE.has(sigla)) return null;
  return inBase(valore, sigla);
}

function daTesto(quantity: unknown): QuantitaConfezione | null {
  if (typeof quantity !== 'string') return null;
  const testo = quantity.trim().toLowerCase().replace(/,/g, '.');
  const m = RE_QUANTITA.exec(testo);
  if (!m) return null;
  const [, pezziPack, valore, sigla, conteggio] = m;
  if (conteggio !== undefined) return inBase(Number(conteggio), 'pz');
  const moltiplicatore = pezziPack === undefined ? 1 : Number(pezziPack);
  return inBase(moltiplicatore * Number(valore), sigla);
}

/**
 * La quantità della confezione da un prodotto Open Food Facts, in unità base.
 *
 * Prima i campi numerici `product_quantity` + `product_quantity_unit` (OFF manda
 * il numero spesso come stringa, "500"): sono compilati da chi ha già
 * interpretato l'etichetta e valgono più del testo libero. Se mancano o non
 * tornano (≤ 0, non numerici, unità sconosciuta) si legge il testo `quantity`.
 *
 * Forme del testo riconosciute (dopo trim, minuscole, virgola → punto):
 *  - `500 g`, `500g`, `1 L`, `1,5 l`, `0.75 kg`, `330 ml`, `33 cl`, `2 dl`
 *  - multipack `6 x 125 g` (= 750 g), `4 x 500ml`, `12 x 33 cl`: si moltiplica
 *  - pezzi: `6 pz`, `6 pezzi`, `6 uova`, `x6` (conteggio senza unità)
 *  - rumore attorno: `1 kg (2 x 500 g)` → la prima quantità, 1 kg;
 *    `500 g e` → il segno ℮ e tutto ciò che segue si ignora;
 *    `Peso netto 400 g` → 400 g.
 * Conversioni: kg→g, l→ml, cl→ml, dl→ml. Risultato arrotondato a 3 decimali.
 * Restituisce null quando non c'è un numero, l'unità è sconosciuta ("500",
 * "500 oz"), o il valore non è positivo: meglio chiedere il formato a mano che
 * scrivere un numero inventato nel residuo.
 */
export function analizzaQuantitaOFF(p: {
  quantity?: unknown;
  product_quantity?: unknown;
  product_quantity_unit?: unknown;
}): QuantitaConfezione | null {
  return daCampiNumerici(p.product_quantity, p.product_quantity_unit) ?? daTesto(p.quantity);
}

/**
 * Il formato da proporre per l'ingrediente: la quantità OFF se l'unità coincide
 * con `unitaBase`, altrimenti null. Nessuna conversione fra g e ml: servirebbe
 * la densità e la spec vieta l'inferenza (vedi `UnitaIncompatibileError`).
 */
export function formatoProposto(q: QuantitaConfezione, unitaBase: UnitaBase): number | null {
  return q.unita === unitaBase ? q.valore : null;
}
