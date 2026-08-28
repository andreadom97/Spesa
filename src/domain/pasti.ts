/**
 * Quanti pasti può avere una giornata.
 *
 * Il massimo è salito da 5 a 6 il 28/08/2026: il piano di Andrea ha due
 * spuntini distinti (mattina e pomeriggio) oltre a colazione, pranzo, cena e
 * dopocena, e con cinque righe due di questi finivano accorpati in uno — con
 * la conseguenza che la lista sommava in un pasto solo le grammature di due
 * momenti diversi della giornata. Diverge dalla spec riga 233 ("da 3 a 5
 * righe"), su richiesta esplicita di Andrea.
 *
 * Sta nel dominio e non nel data layer perché è una regola del prodotto, non
 * un dettaglio di persistenza: la schermata Impostazioni e `salvaSlotDefs`
 * devono leggere lo stesso numero, o l'interfaccia offrirebbe un pasto che la
 * scrittura poi rifiuta.
 */
export const MIN_PASTI = 3;
export const MAX_PASTI = 6;
