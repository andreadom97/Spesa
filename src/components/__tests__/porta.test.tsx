import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Porta } from '../Porta';

describe('Porta', () => {
  it('mostra titolo, testo e l\'azione che riceve', () => {
    render(
      <Porta titolo="Carica il PDF" testo="Se la dieta ti è arrivata in PDF, caricalo così com'è.">
        <button type="button" className="porta-azione">SCEGLI IL PDF</button>
      </Porta>,
    );
    expect(screen.getByText('Carica il PDF')).toBeInTheDocument();
    expect(screen.getByText("Se la dieta ti è arrivata in PDF, caricalo così com'è.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SCEGLI IL PDF' })).toHaveClass('porta-azione');
  });

  it('il testo può essere un nodo, non solo una stringa', () => {
    render(
      <Porta titolo="Carica il PDF" testo={<span data-testid="nome-file">dieta.pdf</span>}>
        <span>Cambia file</span>
      </Porta>,
    );
    expect(screen.getByTestId('nome-file')).toHaveTextContent('dieta.pdf');
  });
});
