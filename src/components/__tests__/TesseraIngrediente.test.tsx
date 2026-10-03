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
  // Prove dal telefono della fase 7: appena aggiunto un ingrediente non si capiva
  // dove scrivere la grammatura.
  it('appena aggiunta: il fuoco va sulla grammatura, selezionata, e la pillola chiama', () => {
    // Una spia: in jsdom `selectionStart` di un input number vale null prima e dopo `select()`.
    const seleziona = vi.spyOn(HTMLInputElement.prototype, 'select');
    try {
      rendi({ quantita: 0, appenaAggiunta: true });
      const campo = screen.getByLabelText('Grammatura di Olio di semi');
      expect(campo).toHaveFocus();
      expect(seleziona.mock.contexts).toContain(campo);
      expect(campo.closest('.anim-chiamata')).not.toBeNull();
    } finally {
      seleziona.mockRestore();
    }
  });

  it('senza appenaAggiunta niente fuoco e niente anello', () => {
    rendi();
    const campo = screen.getByLabelText('Grammatura di Olio di semi');
    expect(campo).not.toHaveFocus();
    expect(campo.closest('.anim-chiamata')).toBeNull();
  });

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

  it('la matita e la X stanno sopra il <label> della quantità, che dipinge dopo nel DOM', () => {
    // Il <label> ora è position: relative (per l'icona sotto): senza uno
    // zIndex più alto sulla matita/X, un tocco nella striscia x≈95-105 apre
    // la tastiera invece della modifica.
    rendi({ hrefModifica: '/piatti/p1/ingredienti/olio-1' });
    const matita = screen.getByRole('link', { name: 'Modifica Olio di semi' });
    const x = screen.getByRole('button', { name: 'Rimuovi Olio di semi' });
    expect(matita.style.zIndex).toBe('1');
    expect(x.style.zIndex).toBe('1');
  });

  it('gli anelli di focus non sono tagliati dall\'overflow: hidden della tessera', () => {
    rendi({ hrefModifica: '/piatti/p1/ingredienti/olio-1' });
    const matita = screen.getByRole('link', { name: 'Modifica Olio di semi' });
    const x = screen.getByRole('button', { name: 'Rimuovi Olio di semi' });
    expect(matita.style.outlineOffset).toBe('-2px');
    expect(x.style.outlineOffset).toBe('-2px');
  });

  it('a fuoco la pillola offre «Q.B.»: scelta, la quantità è null (spec 8c §B)', () => {
    const onCambiaQuantita = vi.fn();
    rendi({ onCambiaQuantita });
    expect(screen.queryByRole('button', { name: 'Olio di semi: quanto basta' })).toBeNull();
    fireEvent.focus(screen.getByLabelText('Grammatura di Olio di semi'));
    fireEvent.click(screen.getByRole('button', { name: 'Olio di semi: quanto basta' }));
    expect(onCambiaQuantita).toHaveBeenLastCalledWith(null);
  });

  it('una riga q.b. mostra «Q.B.» al posto del numero; il tocco riapre il campo vuoto e a fuoco', () => {
    const onCambiaQuantita = vi.fn();
    rendi({ quantita: null, onCambiaQuantita });
    const pillola = screen.getByRole('button', { name: 'Grammatura di Olio di semi: quanto basta' });
    expect(pillola).toHaveTextContent('Q.B.');
    expect(screen.queryByLabelText('Grammatura di Olio di semi')).toBeNull();
    fireEvent.click(pillola);
    const campo = screen.getByLabelText('Grammatura di Olio di semi');
    expect(campo).toHaveValue(null);
    expect(campo).toHaveFocus();
    fireEvent.change(campo, { target: { value: '5' } });
    expect(onCambiaQuantita).toHaveBeenLastCalledWith(5);
  });

  it('il fuoco che passa alla voce «Q.B.» (Tab) non la smonta: resta cliccabile; altrove sparisce', () => {
    const onCambiaQuantita = vi.fn();
    rendi({ onCambiaQuantita });
    const campo = screen.getByLabelText('Grammatura di Olio di semi');
    fireEvent.focus(campo);
    const voce = screen.getByRole('button', { name: 'Olio di semi: quanto basta' });
    fireEvent.blur(campo, { relatedTarget: voce });
    expect(screen.getByRole('button', { name: 'Olio di semi: quanto basta' })).toBe(voce);
    // Dalla voce il fuoco torna al campo: la voce resta.
    fireEvent.blur(voce, { relatedTarget: campo });
    expect(screen.getByRole('button', { name: 'Olio di semi: quanto basta' })).toBe(voce);
    fireEvent.blur(voce, { relatedTarget: null });
    expect(screen.queryByRole('button', { name: 'Olio di semi: quanto basta' })).toBeNull();
    // Il percorso da tastiera: campo -> voce -> invio.
    fireEvent.focus(campo);
    const voce2 = screen.getByRole('button', { name: 'Olio di semi: quanto basta' });
    fireEvent.blur(campo, { relatedTarget: voce2 });
    fireEvent.click(voce2);
    expect(onCambiaQuantita).toHaveBeenLastCalledWith(null);
  });

  it('i bottoni Q.B. hanno outlineOffset -2 come X e matita', () => {
    const { unmount } = rendi({ quantita: null });
    expect(screen.getByRole('button', { name: 'Grammatura di Olio di semi: quanto basta' }).style.outlineOffset).toBe('-2px');
    unmount();
    rendi();
    fireEvent.focus(screen.getByLabelText('Grammatura di Olio di semi'));
    expect(screen.getByRole('button', { name: 'Olio di semi: quanto basta' }).style.outlineOffset).toBe('-2px');
  });

  it('una riga q.b. non ha il bordo d\'errore', () => {
    const { container } = rendi({ quantita: null });
    expect(container.querySelector('[data-quantita-valida="true"]')).not.toBeNull();
  });
});
