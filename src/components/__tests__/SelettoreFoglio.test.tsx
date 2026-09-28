import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SelettoreFoglio, type PropsSelettoreFoglio } from '../SelettoreFoglio';

const VOCI = [{ id: 's-col', nome: 'Colazione' }, { id: 's-cena', nome: 'Cena' }];

function rendi(props: Partial<PropsSelettoreFoglio> = {}) {
  const tutte: PropsSelettoreFoglio = {
    nome: 'Condimenti', nota: 'Nella dieta sono un pasto a parte', voci: VOCI, sceltaId: null,
    titolo: 'Condimenti: in quale pasto li usi?', notaFoglio: 'Ogni giorno le righe dei condimenti finiscono in questo pasto.',
    aperto: false, onApri: vi.fn(), onChiudi: vi.fn(), onScegli: vi.fn(), ...props,
  };
  render(<SelettoreFoglio {...tutte} />);
  return tutte;
}

describe('SelettoreFoglio', () => {
  it('chiuso: la riga col valore (o «Scegli») apre', () => {
    const props = rendi();
    const riga = screen.getByRole('button', { name: /Condimenti/ });
    expect(riga).toHaveTextContent('Scegli');
    fireEvent.click(riga);
    expect(props.onApri).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('il valore è il nome della voce scelta', () => {
    rendi({ sceltaId: 's-cena' });
    expect(screen.getByRole('button', { name: /Condimenti/ })).toHaveTextContent('Cena');
  });

  it('aperto: le voci come radio, la scelta spuntata; il tocco sceglie e chiude', () => {
    const props = rendi({ aperto: true, sceltaId: 's-col' });
    const foglio = screen.getByRole('dialog', { name: 'Condimenti: in quale pasto li usi?' });
    expect(within(foglio).getByText('Ogni giorno le righe dei condimenti finiscono in questo pasto.')).toBeInTheDocument();
    expect(within(foglio).getByRole('radio', { name: 'Colazione' })).toHaveAttribute('aria-checked', 'true');
    expect(within(foglio).getByRole('radio', { name: 'Cena' })).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(within(foglio).getByRole('radio', { name: 'Cena' }));
    expect(props.onScegli).toHaveBeenCalledWith('s-cena');
    expect(props.onChiudi).toHaveBeenCalled();
  });

  it('il velo chiude senza scegliere', () => {
    const props = rendi({ aperto: true });
    fireEvent.click(screen.getByTestId('velo-foglio'));
    expect(props.onChiudi).toHaveBeenCalled();
    expect(props.onScegli).not.toHaveBeenCalled();
  });
});
