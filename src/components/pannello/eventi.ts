import { useEffect, type RefObject } from 'react';

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

/**
 * Chiama `ricarica.current` a ogni `EVENTO_IMPOSTAZIONI_CAMBIATE`, finché il componente è
 * montato. Due salvataggi di fila non fanno correre due letture: chi arriva mentre una è in volo
 * ne chiede un'altra dopo, e ne parte una sola per quanti ne arrivano. Così l'ultima a toccare lo
 * schermo è partita dopo l'ultima scrittura. `ricarica` è un ref: le pagine ci pubblicano il
 * caricamento dichiarato nel loro effetto, che cambia a ogni montaggio o cambio di vista.
 */
export function useRileggiDopoImpostazioni(ricarica: RefObject<() => Promise<void>>): void {
  useEffect(() => {
    let attivo = true;
    let inVolo = false;
    let ancora = false;
    async function rileggi() {
      if (inVolo) {
        ancora = true;
        return;
      }
      inVolo = true;
      try {
        do {
          ancora = false;
          await ricarica.current();
        } while (ancora && attivo);
      } catch (errore) {
        console.error('impostazioni: rilettura della pagina dopo il salvataggio fallita.', errore);
      } finally {
        inVolo = false;
      }
    }
    function alCambio() {
      void rileggi();
    }
    window.addEventListener(EVENTO_IMPOSTAZIONI_CAMBIATE, alCambio);
    return () => {
      attivo = false;
      window.removeEventListener(EVENTO_IMPOSTAZIONI_CAMBIATE, alCambio);
    };
  }, [ricarica]);
}
