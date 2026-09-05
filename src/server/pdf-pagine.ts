import { PDFDocument } from 'pdf-lib';

/**
 * Divisione di un PDF multipagina in PDF a pagina singola.
 *
 * L'estrattore lavora una pagina per chiamata (spec 2026-09-05 §2.4): ogni
 * pagina diventa un blocco `document` a sé, con la stessa pipeline delle foto.
 * Si usa pdf-lib perché è JavaScript puro, senza dipendenze native: gira nelle
 * funzioni Vercel. Un PDF di sole scansioni va bene così com'è, l'OCR lo fa il
 * modello.
 *
 * La cifratura NON si ignora: un PDF cifrato è illeggibile per noi come uno
 * corrotto, e la route lo traduce in 400 "il PDF non si apre: prova con le foto".
 *
 * Il numero di pagine si controlla PRIMA di materializzarle: un PDF sotto i 4 MB
 * può avere centinaia di pagine che condividono un'immagine pesante, e copiarle
 * tutte per poi scartarle in route mandava la funzione in out-of-memory. Oltre
 * `maxPagine` → `TroppePagineError` senza produrre alcun output.
 */
export class PdfIllegibileError extends Error {
  constructor(causa?: unknown) {
    super('Il PDF non si apre.', causa === undefined ? undefined : { cause: causa });
    this.name = 'PdfIllegibileError';
  }
}

/** Il PDF si apre ma ha più pagine del cap: la route lo traduce in 413, come le foto. */
export class TroppePagineError extends Error {
  constructor(public readonly pagine: number) {
    super(`Il PDF ha ${pagine} pagine.`);
    this.name = 'TroppePagineError';
  }
}

/**
 * I byte del PDF → una stringa base64 per pagina, nell'ordine del documento;
 * 1 pagina → array di 1. Nessuna pagina → `PdfIllegibileError`; più di
 * `maxPagine` → `TroppePagineError`, deciso prima di copiare alcunché.
 */
export async function dividiPdf(bytes: Uint8Array, maxPagine: number): Promise<string[]> {
  let originale: PDFDocument;
  let n: number;
  try {
    originale = await PDFDocument.load(bytes, { ignoreEncryption: false });
    // Anche il conteggio sta nel try: su un albero di pagine ciclico o
    // profondissimo pdf-lib esaurisce lo stack, ed è un PDF che non si apre.
    n = originale.getPageCount();
  } catch (e) {
    throw new PdfIllegibileError(e);
  }
  if (n === 0) throw new PdfIllegibileError();
  if (n > maxPagine) throw new TroppePagineError(n);
  try {
    const pagine: string[] = [];
    for (let i = 0; i < n; i++) {
      const singola = await PDFDocument.create();
      const [pagina] = await singola.copyPages(originale, [i]);
      singola.addPage(pagina);
      pagine.push(await singola.saveAsBase64());
    }
    return pagine;
  } catch (e) {
    throw new PdfIllegibileError(e);
  }
}
