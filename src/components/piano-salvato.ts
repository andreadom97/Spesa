/**
 * Il segno «Piano salvato» (spec 8c §H): Importa lo lascia prima di andare al Piano, il Piano lo
 * legge una volta e lo toglie. `sessionStorage`, come la bozza del piatto: è roba della sessione.
 * Ogni accesso è protetto: in navigazione privata il solo leggere lancia, e si perde l'avviso, non
 * il piano.
 */
const CHIAVE = 'spesa:piano-salvato';

export function segnaPianoSalvato(): void {
  try {
    window.sessionStorage.setItem(CHIAVE, '1');
  } catch {
    // Senza memoria niente avviso: il piano è salvato lo stesso.
  }
}

export function consumaPianoSalvato(): boolean {
  try {
    const c = window.sessionStorage.getItem(CHIAVE) === '1';
    window.sessionStorage.removeItem(CHIAVE);
    return c;
  } catch {
    return false;
  }
}
