import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TesseraIngrediente } from '../TesseraIngrediente';

function rendi(extra: Partial<Parameters<typeof TesseraIngrediente>[0]> = {}) {
  return render(
    <TesseraIngrediente
      nome="Olio di semi"
      area="dispensa"
      quantita={10}
      unita="ml"
      onCambiaQuantita={() => {}}
      onRimuovi={() => {}}
      {...extra}
    />,
  );
}

describe('TesseraIngrediente', () => {
  it('senza hrefModifica non mostra alcun accesso all\'ingrediente', () => {
    rendi();
    expect(screen.queryByRole('link', { name: 'Modifica Olio di semi' })).toBeNull();
  });

  it('con hrefModifica apre l\'editor di quell\'ingrediente', () => {
    // Era l'unica schermata dell'app irraggiungibile: senza questo link,
    // area, formato confezione, unità e deperibilità restano per sempre
    // quelle scelte alla creazione.
    rendi({ hrefModifica: '/piatti/p1/ingredienti/olio-1' });
    expect(screen.getByRole('link', { name: 'Modifica Olio di semi' })).toHaveAttribute(
      'href',
      '/piatti/p1/ingredienti/olio-1',
    );
  });

  it('mette al riparo la bozza prima di seguire il link', () => {
    // L'ordine conta: la navigazione smonta l'editor del piatto, che tiene
    // il suo stato solo in memoria.
    const onPrimaDiModificare = vi.fn();
    rendi({ hrefModifica: '/piatti/p1/ingredienti/olio-1', onPrimaDiModificare });
    fireEvent.click(screen.getByRole('link', { name: 'Modifica Olio di semi' }));
    expect(onPrimaDiModificare).toHaveBeenCalledOnce();
  });

  it('la rimozione resta distinta dalla modifica', () => {
    const onRimuovi = vi.fn();
    rendi({ hrefModifica: '/piatti/p1/ingredienti/olio-1', onRimuovi });
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Olio di semi' }));
    expect(onRimuovi).toHaveBeenCalledOnce();
  });
});
