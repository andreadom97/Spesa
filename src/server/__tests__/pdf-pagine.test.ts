/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

import { dividiPdf, PdfIllegibileError } from '../pdf-pagine';

/** Un PDF vero, con `n` pagine vuote, generato qui: nessun file di dieta nei test. */
async function pdfConPagine(n: number): Promise<string> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage();
  return doc.saveAsBase64();
}

describe('dividiPdf', () => {
  it('un PDF a 3 pagine diventa 3 PDF a pagina singola, ciascuno ricaricabile', async () => {
    const pagine = await dividiPdf(await pdfConPagine(3));
    expect(pagine).toHaveLength(3);
    for (const base64 of pagine) {
      const doc = await PDFDocument.load(base64);
      expect(doc.getPageCount()).toBe(1);
    }
  });

  it('un PDF a 1 pagina resta un array di 1', async () => {
    const pagine = await dividiPdf(await pdfConPagine(1));
    expect(pagine).toHaveLength(1);
    expect((await PDFDocument.load(pagine[0])).getPageCount()).toBe(1);
  });

  it('byte casuali rigettano con PdfIllegibileError', async () => {
    const casuali = Buffer.from(Array.from({ length: 256 }, (_, i) => (i * 37 + 11) % 256)).toString('base64');
    await expect(dividiPdf(casuali)).rejects.toBeInstanceOf(PdfIllegibileError);
  });
});
