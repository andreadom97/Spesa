/**
 * L'evento che Lista e Piano ascoltano per rileggersi quando il pannello delle Impostazioni ha
 * salvato davvero (review finale della fase 5, I2): ordine delle aree, cadenza, persone,
 * rotazione, pasti. Prima della fase 5 le Impostazioni erano una pagina, e tornare alla Lista la
 * rimontava; il pannello sta sopra la pagina, che non si rimonta e senza questo resterebbe coi
 * dati di prima. Lo pubblica `DatiPannello` sul `window` dopo una scrittura riuscita e ultima (non
 * dopo un rollback, non per una richiesta superata), come `EVENTO_DISPENSA_CAMBIATA`.
 *
 * Sta qui e non in `@/data/impostazioni`: quel modulo è finto in una ventina di file di test, e
 * ogni finto dovrebbe ripetere la costante per non far lanciare Vitest a chi la legge.
 */
export const EVENTO_IMPOSTAZIONI_CAMBIATE = 'spesa:impostazioni-cambiate';
