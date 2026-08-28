import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Segmento } from '../Segmento';

const OPZIONI = [
  { id: 'tutti', label: 'TUTTI' },
  { id: 'colazione', label: 'Colazione' },
  { id: 'pranzo', label: 'Pranzo' },
];

describe('Segmento', () => {
  it('rende una pillola per opzione', () => {
    render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('marca attiva solo la pillola col valore corrente', () => {
    render(<Segmento opzioni={OPZIONI} valore="pranzo" onCambia={() => {}} />);
    expect(screen.getByRole('button', { name: 'Pranzo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Colazione' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('chiama onCambia con l\'id dell\'opzione cliccata, non con la label', () => {
    const onCambia = vi.fn();
    render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={onCambia} />);
    fireEvent.click(screen.getByRole('button', { name: 'Colazione' }));
    expect(onCambia).toHaveBeenCalledWith('colazione');
  });

  it('non tocca il testo sorgente: la maiuscola è solo visiva (text-transform)', () => {
    render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={() => {}} />);
    expect(screen.getByText('Colazione')).toBeInTheDocument();
  });

  it("area di tap (button) 44px, disegno della pillola (span interno) 38px: sono due elementi distinti", () => {
    // jsdom non calcola il layout reale (niente getBoundingClientRect utile):
    // qui si verifica solo che lo stile dichiarato separi le due altezze come
    // da contratto. La misura in pixel effettivi è verificata a parte, in un
    // vero browser (vedi report del task).
    render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={() => {}} />);
    const bottone = screen.getByRole('button', { name: 'Pranzo' });
    expect(bottone.style.height).toBe('44px');
    const pillola = bottone.firstElementChild as HTMLElement;
    expect(pillola.style.height).toBe('38px');
  });

  describe("variante 'blocco'", () => {
    it("il bottone stesso è l'area di tap: 46px pieno, non un wrapper attorno a una pillola più piccola", () => {
      render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={() => {}} variante="blocco" />);
      const bottone = screen.getByRole('button', { name: 'Pranzo' });
      expect(bottone.style.height).toBe('46px');
      expect(bottone.style.borderRadius).toBe('14px');
      expect(bottone.style.flex).toBe('1 1 0%');
      // Nessun <span> interno con un'altezza diversa: il testo è figlio diretto.
      expect(bottone.firstElementChild).toBeNull();
    });

    it('segna attivo il bottone col valore corrente, come la pillola', () => {
      render(<Segmento opzioni={OPZIONI} valore="pranzo" onCambia={() => {}} variante="blocco" />);
      expect(screen.getByRole('button', { name: 'Pranzo' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Colazione' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('disabilitato', () => {
    it('non è cliccabile: onCambia non viene mai chiamata, in nessuna variante', () => {
      const onCambiaPillola = vi.fn();
      const onCambiaBlocco = vi.fn();
      render(
        <>
          <Segmento opzioni={OPZIONI} valore="tutti" onCambia={onCambiaPillola} disabilitato />
          <Segmento opzioni={OPZIONI} valore="tutti" onCambia={onCambiaBlocco} variante="blocco" disabilitato />
        </>,
      );
      for (const bottone of screen.getAllByRole('button', { name: 'Colazione' })) {
        fireEvent.click(bottone);
      }
      expect(onCambiaPillola).not.toHaveBeenCalled();
      expect(onCambiaBlocco).not.toHaveBeenCalled();
    });

    it('non lo sembra: ogni bottone porta l\'attributo disabled nativo', () => {
      render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={() => {}} variante="blocco" disabilitato />);
      for (const bottone of screen.getAllByRole('button')) {
        expect(bottone).toBeDisabled();
      }
    });
  });
});
