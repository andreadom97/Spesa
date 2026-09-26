/** Le otto sotto-schermate del pannello (spec §A.1). Porzioni sta nella riga, Cancella ed Esci sono dialoghi, Piatti e Importa sono pagine. */
export type SottoSchermata =
  | 'pasti-a-casa' | 'gestione-pasti' | 'rotazione'
  | 'ingredienti' | 'aree' | 'cadenza'
  | 'casa' | 'esporta';

export const SOTTO_SCHERMATE: readonly SottoSchermata[] = [
  'pasti-a-casa', 'gestione-pasti', 'rotazione',
  'ingredienti', 'aree', 'cadenza',
  'casa', 'esporta',
];

/** Dove apre il pannello: in cima o su una sotto-schermata. */
export type DestinazionePannello = 'cima' | SottoSchermata;

/** Il pannello, per `aria-controls` del Menù utente. */
export const ID_PANNELLO = 'pannello-impostazioni';
/** Il titolo del pannello, per `aria-labelledby`. */
export const ID_TITOLO_PANNELLO = 'pannello-impostazioni-titolo';
/** Il Menù utente: alla chiusura il pannello gli rende il fuoco (spec §A.2). */
export const ID_MENU_UTENTE = 'menu-utente';
