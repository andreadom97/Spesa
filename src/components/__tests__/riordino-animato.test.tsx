import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useRiordinoAnimato } from '../useRiordinoAnimato';

/**
 * jsdom non fa layout: la posizione di ogni reparto è un `offsetTop` finto. Basta per verificare il FLIP: chi si è
 * spostato parte dalla posizione vecchia (transform) e poi scivola a quella
 * nuova (classe di transizione, transform azzerato).
 */
function Elenco({ chiavi, top }: { chiavi: string[]; top: Record<string, number> }) {
  const registra = useRiordinoAnimato(chiavi);
  return (
    <div>
      {chiavi.map((k) => (
        <div
          key={k}
          data-testid={k}
          ref={(el) => {
            if (el) Object.defineProperty(el, 'offsetTop', { configurable: true, get: () => top[k] });
            registra(k)(el);
          }}
        />
      ))}
    </div>
  );
}

describe('useRiordinoAnimato', () => {
  it('al primo montaggio non anima niente', () => {
    const { getByTestId } = render(<Elenco chiavi={['a', 'b']} top={{ a: 0, b: 100 }} />);
    expect(getByTestId('a').style.transform).toBe('');
    expect(getByTestId('a')).not.toHaveClass('anim-riordino');
  });

  it('quando l\'ordine cambia, chi si è spostato scivola dalla posizione vecchia', () => {
    const { getByTestId, rerender } = render(<Elenco chiavi={['a', 'b']} top={{ a: 0, b: 100 }} />);
    rerender(<Elenco chiavi={['b', 'a']} top={{ a: 100, b: 0 }} />);
    // Dopo il frame d'avvio: transform azzerato e classe di transizione messa.
    const a = getByTestId('a');
    const b = getByTestId('b');
    expect(a).toHaveClass('anim-riordino');
    expect(b).toHaveClass('anim-riordino');
    expect(a.style.transform).toBe('');
  });

  it('se l\'ordine non cambia non tocca niente', () => {
    const { getByTestId, rerender } = render(<Elenco chiavi={['a', 'b']} top={{ a: 0, b: 100 }} />);
    rerender(<Elenco chiavi={['a', 'b']} top={{ a: 0, b: 100 }} />);
    expect(getByTestId('a')).not.toHaveClass('anim-riordino');
  });
});
