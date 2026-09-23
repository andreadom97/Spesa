import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FogliPresi } from '../FogliPresi';

const TRE = [{ url: 'blob:1' }, { url: 'blob:2' }, { url: 'blob:3' }];

function monta(pagine = TRE) {
  const onSposta = vi.fn();
  const onTogli = vi.fn();
  const onChiudi = vi.fn();
  render(<FogliPresi pagine={pagine} onSposta={onSposta} onTogli={onTogli} onChiudi={onChiudi} />);
  return { onSposta, onTogli, onChiudi };
}

describe('FogliPresi', () => {
  it('è un dialogo col suo nome, e il fuoco ci va dentro all\'apertura', () => {
    monta();
    const dialogo = screen.getByRole('dialog', { name: 'Rivedi i fogli presi' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveFocus();
  });

  it('una riga per foglio, con la foto e il numero, nell\'ordine dato', () => {
    monta();
    const foto = screen.getAllByRole('img');
    expect(foto.map((f) => f.getAttribute('alt'))).toEqual(['Foglio 1', 'Foglio 2', 'Foglio 3']);
    expect(foto.map((f) => f.getAttribute('src'))).toEqual(['blob:1', 'blob:2', 'blob:3']);
  });

  it('l\'intestazione dice quanti sono e che l\'ordine conta; al singolare solo il numero', () => {
    monta();
    expect(screen.getByText("3 fogli · l'app li legge in quest'ordine")).toBeInTheDocument();
  });

  it('con un foglio l\'intestazione è al singolare', () => {
    monta([{ url: 'blob:1' }]);
    expect(screen.getByText('1 foglio')).toBeInTheDocument();
  });

  it('su è spento sul primo, giù è spento sull\'ultimo', () => {
    monta();
    expect(screen.getByRole('button', { name: 'Sposta il foglio 1 più su' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sposta il foglio 1 più giù' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Sposta il foglio 3 più giù' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sposta il foglio 3 più su' })).toBeEnabled();
  });

  it('i tasti chiamano i callback con indice e verso giusti', () => {
    const { onSposta, onTogli } = monta();
    fireEvent.click(screen.getByRole('button', { name: 'Sposta il foglio 2 più su' }));
    expect(onSposta).toHaveBeenLastCalledWith(1, -1);
    fireEvent.click(screen.getByRole('button', { name: 'Sposta il foglio 2 più giù' }));
    expect(onSposta).toHaveBeenLastCalledWith(1, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Togli il foglio 3' }));
    expect(onTogli).toHaveBeenLastCalledWith(2);
  });

  it('Chiudi, il velo ed Esc chiudono; un tocco dentro il foglio no', () => {
    const { onChiudi } = monta();
    const dialogo = screen.getByRole('dialog', { name: 'Rivedi i fogli presi' });
    fireEvent.click(within(dialogo).getByText("3 fogli · l'app li legge in quest'ordine"));
    expect(onChiudi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(onChiudi).toHaveBeenCalledTimes(1);
    fireEvent.click(dialogo.parentElement!);
    expect(onChiudi).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(dialogo, { key: 'Escape' });
    expect(onChiudi).toHaveBeenCalledTimes(3);
  });
});
