import type { MealSlot } from './types';
import { giorniTra, lunediDi } from './date';

/** I testi composti della home (spec §H). Sentence case: il maiuscolo lo fa il CSS. */

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

export function nomeGiorno(data: string): string {
  return GIORNI[giorniTra(lunediDi(data), data)] ?? '';
}

export function etichettaPoster(giorno: 'oggi' | 'domani', data: string, nomePasto: string): string {
  return `${giorno === 'oggi' ? nomeGiorno(data) : 'Domani'} · ${nomePasto}`;
}

export function etichettaPoi(giorno: 'oggi' | 'domani', nomePasto: string): string {
  return `${giorno === 'oggi' ? 'Poi' : 'Domani'} · ${nomePasto}`;
}

/** Spec §B.4.3: persone se più di una, porzioni da preparare, porzione pronta. */
export function sottotitoloPoster(slot: MealSlot, persone: number): string | null {
  const voci = [
    persone > 1 ? `Per ${persone}` : null,
    slot.porzioniPreparate > 0 ? `Cucina ${slot.porzioniPreparate} in più` : null,
    slot.daPronti ? 'Da una porzione pronta' : null,
  ].filter((v): v is string => v !== null);
  return voci.length > 0 ? voci.join(' · ') : null;
}

export function etichettaUso(uso: { data: string; nomePasto: string } | null, oggi: string): string {
  if (!uso) return 'Nessun pasto lo usa';
  const distanza = giorniTra(oggi, uso.data);
  const quando = distanza === 0 ? 'oggi' : distanza === 1 ? 'domani' : nomeGiorno(uso.data).toLowerCase();
  return `${uso.nomePasto} di ${quando}`;
}

export function testoScongela(nomePasto: string): string {
  return `Per ${nomePasto.toLowerCase()} di domani`;
}

export function pillolaPronti(n: number): string {
  return n === 1 ? '1 pronto' : `${n} pronti`;
}

export function dataLunga(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1]}`;
}

const DOPO = 'e qui compaiono le proposte con quello che hai e le cose che scadono.';

/** Spec §D.5: la parte in grassetto e il resto, nei due casi. */
export function testoDispensaFerma(ultimaChiusura: string | null): { forte: string | null; resto: string } {
  if (ultimaChiusura === null) return { forte: null, resto: `Chiudi la prima spesa nell'app, ${DOPO}` };
  return {
    forte: `La dispensa è ferma al ${dataLunga(ultimaChiusura)}`,
    resto: `, l'ultima spesa chiusa nell'app. Chiudi la prossima, ${DOPO}`,
  };
}
