'use client';

import { formattaEuro, formattaQuantita, type RiassuntoEvitato } from '@/domain/risparmio';

/**
 * "Da quando usi Dispesa: 9 confezioni non ricomprate · 4,1 kg · circa 32 €"
 * (§C.11). Null con zero confezioni: la nota non c'è. Quantità ed euro solo se
 * c'è qualcosa da dire. È la formattazione della Dispensa prima della fase 4.
 */
export function testoRisparmio(r: RiassuntoEvitato | null): string | null {
  if (!r || r.confezioni === 0) return null;
  const segmenti = [r.confezioni === 1 ? '1 confezione non ricomprata' : `${r.confezioni} confezioni non ricomprate`];
  const quantita = formattaQuantita(r.quantita);
  if (quantita) segmenti.push(quantita);
  if (r.euro !== null) segmenti.push(formattaEuro(r.euro));
  return `Da quando usi Dispesa: ${segmenti.join(' · ')}`;
}

/** Nota in testa al blocco I tuoi dati (frame 04): non è una riga toccabile. */
export function NotaRisparmio({ riassunto }: { riassunto: RiassuntoEvitato | null }) {
  const testo = testoRisparmio(riassunto);
  if (!testo) return null;
  return (
    <p style={{ margin: 0, padding: '4px 4px 12px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' }}>{testo}</p>
  );
}
