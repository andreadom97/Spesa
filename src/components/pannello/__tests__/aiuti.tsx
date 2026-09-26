import { render, type RenderResult } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { vi } from 'vitest';
import type { AreaId, Dish, Impostazioni, Ingredient, MealSlotDef } from '@/domain/types';
import type { VoceEvitata } from '@/domain/list-builder';
import type { StatoCasa } from '@/data/casa';
import { leggiImpostazioni, leggiSlotDefs, salvaImpostazioni, salvaSlotDefs } from '@/data/impostazioni';
import { statoCasa } from '@/data/casa';
import { leggiRisparmioTotale } from '@/data/risparmio';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { PannelloProvider, usePannello } from '../PannelloProvider';
import { DatiPannelloProvider } from '../DatiPannello';
import { Pannello } from '../Pannello';
import type { DestinazionePannello } from '../tipi';
import { percorso } from './finti';

// jsdom non ha matchMedia: il pannello può chiederlo per prefers-reduced-motion.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

export const ASSENZE_VUOTE = [false, false, false, false, false, false, false];
/** Non l'ordine di base: la riga Ordine delle aree dice PERSONALIZZATO. */
export const ORDINE_TEST: AreaId[] = ['dispensa', 'latticini', 'ortofrutta', 'surgelati', 'cereali', 'macelleria'];

// Tre pasti, come nei test di oggi: il pannello legge davvero leggiSlotDefs().
export const COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE_VUOTE };
export const PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: [true, false, false, false, false, false, false] };
export const CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE_VUOTE };

export function impostazioni(p: Partial<Impostazioni> = {}): Impostazioni {
  return { moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_TEST], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90, ...p };
}

export function piatto(p: Partial<Dish> & Pick<Dish, 'id' | 'slotDefId'>): Dish {
  return {
    nome: p.id, fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
    ingredienti: [], componenti: [], ...p,
  };
}

export function ingrediente(p: Partial<Ingredient> & Pick<Ingredient, 'id' | 'nome' | 'area'>): Ingredient {
  return {
    unitaBase: 'g', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
    ...p,
  };
}

export function voce(p: Partial<VoceEvitata> = {}): VoceEvitata {
  return {
    ingredientId: 'i-1', nome: 'Pasta', unita: 'g', fabbisogno: 0, confezioniIngenue: 0, confezioniReali: 0,
    confezioniEvitate: 1, quantitaEvitata: 500, prezzoConfezione: null, ...p,
  };
}

export interface DatiFinti {
  impostazioni?: Partial<Impostazioni>;
  pasti?: MealSlotDef[];
  /** Un Error fa fallire statoCasa (frame 26). */
  casa?: StatoCasa | Error;
  risparmio?: VoceEvitata[];
  piatti?: Dish[];
  ingredienti?: Ingredient[];
}

/**
 * I valori di default delle letture e delle scritture. Usa `mockResolvedValue`,
 * non `…Once`: un `mockReturnValueOnce` messo dal test prima di `montaPannello`
 * resta in coda e vince sulla prima chiamata.
 */
export function preparaDati(d: DatiFinti = {}): void {
  vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(d.impostazioni));
  vi.mocked(salvaImpostazioni).mockResolvedValue(undefined);
  vi.mocked(leggiSlotDefs).mockResolvedValue(d.pasti ?? [COLAZIONE, PRANZO, CENA]);
  vi.mocked(salvaSlotDefs).mockResolvedValue(undefined);
  if (d.casa instanceof Error) vi.mocked(statoCasa).mockRejectedValue(d.casa);
  else vi.mocked(statoCasa).mockResolvedValue(d.casa ?? { ruolo: 'solo', email: [], id: [] });
  vi.mocked(leggiRisparmioTotale).mockResolvedValue(d.risparmio ?? []);
  vi.mocked(leggiRepertorio).mockResolvedValue(d.piatti ?? []);
  vi.mocked(leggiIngredienti).mockResolvedValue(d.ingredienti ?? []);
}

function Apri({ dest }: { dest: DestinazionePannello }) {
  const { apri } = usePannello();
  // Una volta sola, al montaggio: come il tocco sul Menù utente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { apri(dest); }, []);
  return null;
}

/**
 * Monta il pannello come fa il Guscio (`DatiPannelloProvider` attorno a
 * `Pannello`, tutti e due dentro `PannelloProvider`) e lo apre su `dest`. Con
 * `?impostazioni=` non passa: quel percorso è del test del Task 6. `extra` sta
 * dentro `PannelloProvider` (per una sonda che legge `usePannello`).
 */
export function montaPannello(dest: DestinazionePannello = 'cima', d?: DatiFinti, extra?: ReactNode): RenderResult {
  preparaDati(d);
  return render(
    <PannelloProvider>
      <DatiPannelloProvider>
        <Pannello />
      </DatiPannelloProvider>
      <Apri dest={dest} />
      {extra}
    </PannelloProvider>,
  );
}

/** In `beforeEach`. `clearAllMocks` tiene le implementazioni di `finti.ts`. */
export function azzera(): void {
  vi.clearAllMocks();
  percorso.valore = '/lista';
  sessionStorage.clear();
  window.history.replaceState(null, '', '/lista');
}
