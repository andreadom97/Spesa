import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/data/primo-avvio', () => ({ assicuraDatiIniziali: vi.fn() }));

import { assicuraDatiIniziali } from '@/data/primo-avvio';
import { PrimoAvvio } from '../PrimoAvvio';

function promessaDifferita<T>() {
  let risolvi!: (v: T) => void;
  let rigetta!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => { risolvi = res; rigetta = rej; });
  return { promessa, risolvi, rigetta };
}

describe('PrimoAvvio', () => {
  // Con le graffe, di proposito: `mockReset()` restituisce il mock e Vitest
  // tratta ciò che un `beforeEach` restituisce come funzione di pulizia, che
  // chiamerebbe a fine test — cioè chiamerebbe `assicuraDatiIniziali()` una
  // seconda volta, e nel test del fallimento il suo rigetto farebbe fallire
  // il test dall'hook. Un `() => x.mockReset()` senza graffe non è innocuo.
  beforeEach(() => {
    vi.mocked(assicuraDatiIniziali).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra i figli solo dopo che la semina è finita', async () => {
    const { promessa, risolvi } = promessaDifferita<{ pasti: boolean; ingredienti: boolean }>();
    vi.mocked(assicuraDatiIniziali).mockReturnValue(promessa);

    render(<PrimoAvvio><p>figlio</p></PrimoAvvio>);

    expect(assicuraDatiIniziali).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('figlio')).not.toBeInTheDocument();

    await act(async () => { risolvi({ pasti: true, ingredienti: true }); });

    expect(screen.getByText('figlio')).toBeInTheDocument();
  });

  it('mostra i figli anche se la semina fallisce, e lo dice in console', async () => {
    const errore = new Error('rete assente');
    const spia = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(assicuraDatiIniziali).mockRejectedValue(errore);

    render(<PrimoAvvio><p>figlio</p></PrimoAvvio>);

    expect(await screen.findByText('figlio')).toBeInTheDocument();
    expect(spia).toHaveBeenCalledWith('primo avvio: semina iniziale fallita.', errore);
  });
});
