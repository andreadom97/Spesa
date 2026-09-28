import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { RigaAlimento, type PropsRigaAlimento } from '../RigaAlimento';

function rendi(props: Partial<PropsRigaAlimento> = {}) {
  const tutte: PropsRigaAlimento = {
    nome: 'Filetto di merluzzo', etichetta: 'filetto di merluzzo', nota: 'Sul foglio: «Filetto di merluzzo (120g)»',
    quantita: 120, unita: 'g', scegliUnita: false, dubbio: false, onValore: vi.fn(), onTogli: vi.fn(), ...props,
  };
  const esito = render(<RigaAlimento {...tutte} />);
  return { ...esito, props: tutte };
}
const campo = (alimento = 'filetto di merluzzo') => screen.getByRole('textbox', { name: `Quantità di ${alimento}` });

describe('RigaAlimento', () => {
  it('nome, nota, provenienza, il valore con la virgola e l\'unità', () => {
    rendi({ provenienza: 'Martedì · cena · Merluzzo', quantita: 12.5 });
    expect(screen.getByText('Filetto di merluzzo')).toBeInTheDocument();
    expect(screen.getByText('Sul foglio: «Filetto di merluzzo (120g)»')).toBeInTheDocument();
    expect(screen.getByText('Martedì · cena · Merluzzo')).toBeInTheDocument();
    expect(campo()).toHaveValue('12,5');
    expect(screen.getByText('g')).toBeInTheDocument();
  });

  it("all'uscita dal campo salva il numero nuovo, anche con la virgola", () => {
    const { props } = rendi();
    fireEvent.change(campo(), { target: { value: '150,5' } });
    fireEvent.blur(campo());
    expect(props.onValore).toHaveBeenCalledWith(150.5, 'g');
  });

  it('Invio esce dal campo e salva una volta sola', () => {
    const { props } = rendi();
    campo().focus();
    fireEvent.change(campo(), { target: { value: '90' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    expect(props.onValore).toHaveBeenCalledTimes(1);
    expect(props.onValore).toHaveBeenCalledWith(90, 'g');
  });

  it('lo stesso valore non salva', () => {
    const { props } = rendi();
    fireEvent.blur(campo());
    expect(props.onValore).not.toHaveBeenCalled();
  });

  it('un valore non valido torna a quello di prima, con l\'errore', () => {
    const { props } = rendi();
    fireEvent.change(campo(), { target: { value: '0' } });
    fireEvent.blur(campo());
    expect(props.onValore).not.toHaveBeenCalled();
    expect(campo()).toHaveValue('120');
    expect(screen.getByRole('alert')).toHaveTextContent('Scrivi un numero maggiore di zero.');
  });

  it('svuotare una riga risolta non la toglie: torna il valore di prima', () => {
    const { props } = rendi();
    fireEvent.change(campo(), { target: { value: '' } });
    fireEvent.blur(campo());
    expect(props.onValore).not.toHaveBeenCalled();
    expect(campo()).toHaveValue('120');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('dubbio senza unità: il numero aspetta la pillola, e la pillola salva', () => {
    const { props } = rendi({
      nome: 'Olive taggiasche', etichetta: 'olive taggiasche', quantita: null, unita: null, scegliUnita: true, dubbio: true,
      avviso: 'Sul foglio non c\'è un peso: scrivi quanto ne usi e in che unità.',
    });
    expect(screen.getByText('Sul foglio non c\'è un peso: scrivi quanto ne usi e in che unità.')).toBeInTheDocument();
    fireEvent.change(campo('olive taggiasche'), { target: { value: '3' } });
    fireEvent.blur(campo('olive taggiasche'));
    expect(props.onValore).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', { name: 'Unità di olive taggiasche' })).getByRole('button', { name: 'PZ' }));
    expect(props.onValore).toHaveBeenCalledWith(3, 'pz');
  });

  it('la pillola senza numero non salva; poi il numero sì', () => {
    const { props } = rendi({ etichetta: 'olive taggiasche', quantita: null, unita: null, scegliUnita: true, dubbio: true });
    fireEvent.click(within(screen.getByRole('group', { name: 'Unità di olive taggiasche' })).getByRole('button', { name: 'PZ' }));
    expect(props.onValore).not.toHaveBeenCalled();
    fireEvent.change(campo('olive taggiasche'), { target: { value: '3' } });
    fireEvent.blur(campo('olive taggiasche'));
    expect(props.onValore).toHaveBeenCalledWith(3, 'pz');
  });

  it('la X toglie; senza onTogli la X non c\'è', () => {
    const { props, unmount } = rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Togli filetto di merluzzo' }));
    expect(props.onTogli).toHaveBeenCalled();
    unmount();
    rendi({ onTogli: undefined });
    expect(screen.queryByRole('button', { name: 'Togli filetto di merluzzo' })).toBeNull();
  });

  it('segue il valore che cambia da fuori', () => {
    const { rerender, props } = rendi();
    rerender(<RigaAlimento {...props} quantita={200} />);
    expect(campo()).toHaveValue('200');
  });
});
