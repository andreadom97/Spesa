/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

import { dividiPdf, PdfIllegibileError, TroppePagineError } from '../pdf-pagine';

/**
 * Un PDF vero, con `n` pagine vuote, generato qui: nessun file di dieta nei test.
 * `addDefaultPage: false`, altrimenti pdf-lib aggiunge da sé una pagina al documento vuoto.
 */
async function pdfConPagine(n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage();
  return doc.save({ addDefaultPage: false });
}

describe('dividiPdf', () => {
  it('un PDF a 3 pagine diventa 3 PDF a pagina singola in base64, ciascuno ricaricabile', async () => {
    const pagine = await dividiPdf(await pdfConPagine(3), 12);
    expect(pagine).toHaveLength(3);
    for (const base64 of pagine) {
      expect(typeof base64).toBe('string');
      const doc = await PDFDocument.load(base64);
      expect(doc.getPageCount()).toBe(1);
    }
  });

  it('un PDF a 1 pagina resta un array di 1', async () => {
    const pagine = await dividiPdf(await pdfConPagine(1), 12);
    expect(pagine).toHaveLength(1);
    expect((await PDFDocument.load(pagine[0])).getPageCount()).toBe(1);
  });

  it('esattamente maxPagine pagine passano', async () => {
    expect(await dividiPdf(await pdfConPagine(12), 12)).toHaveLength(12);
  });

  it('13 pagine con massimo 12 → TroppePagineError col numero di pagine, prima di copiare alcunché', async () => {
    const errore = await dividiPdf(await pdfConPagine(13), 12).catch((e: unknown) => e);
    expect(errore).toBeInstanceOf(TroppePagineError);
    expect((errore as TroppePagineError).pagine).toBe(13);
    expect(errore).not.toBeInstanceOf(PdfIllegibileError);
  });

  it('0 pagine → PdfIllegibileError', async () => {
    await expect(dividiPdf(await pdfConPagine(0), 12)).rejects.toBeInstanceOf(PdfIllegibileError);
  });

  it('byte casuali rigettano con PdfIllegibileError', async () => {
    const casuali = new Uint8Array(Array.from({ length: 256 }, (_, i) => (i * 37 + 11) % 256));
    await expect(dividiPdf(casuali, 12)).rejects.toBeInstanceOf(PdfIllegibileError);
  });
});
