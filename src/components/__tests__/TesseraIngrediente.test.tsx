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

describe('TesseraIngrediente · icona ingrediente', () => {
  it('icona in basso a destra nel tono medio, alone bianco su nome ed etichetta d\'area', () => {
    const { container } = rendi({ nome: 'Uova', area: 'latticini' });
    const s = container.querySelector('svg[data-icona]');
    expect(s).toHaveAttribute('data-icona', 'uovo');
    expect(s).toHaveAttribute('stroke', '#759EC8');
    expect(screen.getByText('Uova').style.textShadow).toContain('#FFFFFF');
    expect(screen.getByText('LATTICINI, UOVA E SALUMI').style.textShadow).toContain('#FFFFFF');
  });

  it('la matita sale in alto, accanto alla X: l\'angolo in basso a destra è dell\'icona', () => {
    rendi({ hrefModifica: '/piatti/p1/ingredienti/olio-1' });
    const matita = screen.getByRole('link', { name: 'Modifica Olio di semi' });
    expect(matita.style.top).toBe('0px');
    expect(matita.style.right).toBe('44px');
    expect(matita.style.bottom).toBe('');
    const x = screen.getByRole('button', { name: 'Rimuovi Olio di semi' });
    expect(x.style.right).toBe('0px');
  });
});
