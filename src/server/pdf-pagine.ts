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
 * corrotto, e la route lo traduce in 400 `richiesta non valida`.
 */
export class PdfIllegibileError extends Error {
  constructor(causa?: unknown) {
    super('Il PDF non si apre.', causa === undefined ? undefined : { cause: causa });
    this.name = 'PdfIllegibileError';
  }
}

/** Una stringa base64 per pagina, nell'ordine del documento; 1 pagina → array di 1. */
export async function dividiPdf(base64: string): Promise<string[]> {
  try {
    const originale = await PDFDocument.load(base64, { ignoreEncryption: false });
    const pagine: string[] = [];
    for (let i = 0; i < originale.getPageCount(); i++) {
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
