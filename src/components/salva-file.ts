/**
 * Quanto resta vivo l'URL del file dopo il click. Revocarlo subito può
 * interrompere il download in alcuni browser; 40 secondi è il margine largo
 * che usano le librerie di download (FileSaver.js) [ipotesi: il valore non è
 * misurato qui]. Il file pesa meno di un megabyte: tenerlo 40 s non costa.
 */
const REVOCA_DOPO_MS = 40_000;

function eAnnullo(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';
}

/** Il download classico: un <a download> cliccato da codice, poi tolto. */
function scarica(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOCA_DOPO_MS);
}

/**
 * `SALVA IL FILE` di Esporta (spec fase 5 §E.3):
 * - se il browser sa condividere file (`navigator.canShare({ files })`), apre
 *   il foglio di condivisione del sistema: su iPhone e Android è da lì che
 *   si salva in File, Drive o si manda a sé stessi;
 * - se no, scarica il file;
 * - se l'utente chiude il foglio (`AbortError`), non è un errore: torna
 *   `'annullato'` e il tasto resta `SALVA IL FILE`;
 * - se la condivisione fallisce per un altro motivo, ripiega sul download
 *   (piano fase 5, D4): il file è pronto, e non c'è un testo d'errore per
 *   questo caso.
 *
 * Va chiamata dentro il tocco dell'utente: `share` vuole un gesto recente.
 */
export async function salvaFile(file: File): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  const puoCondividere = typeof navigator !== 'undefined'
    && typeof navigator.share === 'function'
    && navigator.canShare?.({ files: [file] }) === true;
  if (puoCondividere) {
    try {
      await navigator.share({ files: [file] });
      return 'condiviso';
    } catch (e) {
      if (eAnnullo(e)) return 'annullato';
      console.error('salvaFile: condivisione fallita, scarico il file.', e);
    }
  }
  scarica(file);
  return 'scaricato';
}
