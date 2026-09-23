import { giorniTra } from './date';

const MESI_LUNGHI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/**
 * "Settimana del 21 settembre" dal lunedì della settimana (ridisegno del
 * 19/09, spec fase 2 §H). Sostituisce il formato "31 AGO — 6 SET": nomina un
 * giorno solo, quindi non deve scrivere due mesi quando la settimana ne
 * attraversa due.
 *
 * Il testo si scrive in sentence case e lo rende maiuscolo la pillola
 * (`text-transform`), come vuole DESIGN.md §3.
 *
 * Data non valida: stringa vuota, non "NaN". Chi la usa passa il valore a
 * `Testata`, che senza `settimana` non disegna la pillola — meglio nessuna
 * pillola che una pillola che dice NaN.
 */
export function etichettaSettimana(dataInizio: string): string {
  const inizio = new Date(`${dataInizio}T00:00:00Z`);
  if (Number.isNaN(inizio.getTime())) return '';
  return `Settimana del ${inizio.getUTCDate()} ${MESI_LUNGHI[inizio.getUTCMonth()]}`;
}

/**
 * La parola che dice dov'è un giorno rispetto a oggi, o null per i giorni
 * lontani: solo ieri, oggi e domani hanno un nome proprio (nota "L'etichetta
 * del giorno" di `Piano - oggi e domani.html`). Entrambe le date sono ISO
 * `YYYY-MM-DD`.
 */
export function parolaTemporale(data: string, oggi: string): 'Ieri' | 'Oggi' | 'Domani' | null {
  const d = giorniTra(oggi, data);
  if (d === 0) return 'Oggi';
  if (d === 1) return 'Domani';
  if (d === -1) return 'Ieri';
  return null;
}
