import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LottoPronto } from '@/domain/types';
import { DettaglioLotto } from '../DettaglioLotto';
import { DialogoElimina } from '../DialogoElimina';

const NOME = 'Ragù di lenticchie';

function lotto(p: Partial<LottoPronto> = {}): LottoPronto {
  return { id: 'lp-1', dishId: 'd-1', porzioni: 2, congelato: true, preparataIl: '2026-09-12', mealSlotId: null, ...p };
}

function propsLotto(p: { lotto?: LottoPronto; nome?: string; impegnate?: number } = {}) {
  return {
    lotto: lotto(),
    nome: NOME,
    impegnate: 0,
    onPorzioni: vi.fn().mockResolvedValue(undefined),
    onCongelato: vi.fn().mockResolvedValue(undefined),
    onElimina: vi.fn(),
    onChiudi: vi.fn(),
    ...p,
  };
}

describe('DettaglioLotto', () => {
  // Difetto fase 4: il corpo che scorre schiacciava ELIMINA IL LOTTO sotto ~766px
  // di finestra. jsdom non calcola il layout: qui si controlla solo che la classe
  // .corpo-foglio (globals.css, flex-shrink: 0 sui figli diretti) sia applicata.
  it('il corpo che scorre ha .corpo-foglio, per non schiacciare ELIMINA IL LOTTO', () => {
    const { container } = render(<DettaglioLotto {...propsLotto()} />);
    expect(container.querySelector('.sc.corpo-foglio')).toBeInTheDocument();
  });


  it('dati: PREPARATO IL 12 SET · IN CONGELATORE', () => {
    render(<DettaglioLotto {...propsLotto()} />);
    expect(screen.getByText('PREPARATO IL 12 SET · IN CONGELATORE')).toBeInTheDocument();
  });

  it('in frigo: senza · IN CONGELATORE', () => {
    render(<DettaglioLotto {...propsLotto({ lotto: lotto({ congelato: false }) })} />);
    expect(screen.getByText('PREPARATO IL 12 SET')).toBeInTheDocument();
  });

  it('2 impegnate, 1 impegnata, nessuna riga a 0', () => {
    const { rerender } = render(<DettaglioLotto {...propsLotto({ impegnate: 2 })} />);
    expect(screen.getByText('2 impegnate')).toBeInTheDocument();

    rerender(<DettaglioLotto {...propsLotto({ impegnate: 1 })} />);
    expect(screen.getByText('1 impegnata')).toBeInTheDocument();

    rerender(<DettaglioLotto {...propsLotto({ impegnate: 0 })} />);
    expect(screen.queryByText(/impegnat/)).not.toBeInTheDocument();
  });

  it('Porzioni: 2,5 e SALVA riporta al valore (intero); 3 chiama onPorzioni(3)', async () => {
    const props = propsLotto();
    render(<DettaglioLotto {...props} />);
    const campo = screen.getByLabelText('Porzioni di Ragù di lenticchie');

    fireEvent.change(campo, { target: { value: '2,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'SALVA' }));
    expect(props.onPorzioni).not.toHaveBeenCalled();
    expect(campo).toHaveValue('2');

    fireEvent.change(campo, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'SALVA' }));
    await waitFor(() => expect(props.onPorzioni).toHaveBeenCalledWith(3));
  });

  it('Elimina il lotto di Ragù di lenticchie chiama onElimina', () => {
    const props = propsLotto();
    render(<DettaglioLotto {...props} />);
    fireEvent.click(screen.getByLabelText('Elimina il lotto di Ragù di lenticchie'));
    expect(props.onElimina).toHaveBeenCalledTimes(1);
  });
});

function propsDialogo(p: { nome?: string; porzioni?: number; impegnate?: number } = {}) {
  return {
    nome: NOME,
    porzioni: 4,
    impegnate: 2,
    onAnnulla: vi.fn(),
    onElimina: vi.fn().mockResolvedValue(undefined),
    ...p,
  };
}

describe('DialogoElimina', () => {
  it('4 porzioni e 2 impegnate: la frase di §I', () => {
    render(<DialogoElimina {...propsDialogo()} />);
    expect(screen.getByText(
      'Ragù di lenticchie, 4 porzioni. 2 sono impegnate dai pasti in programma: dopo, quei pasti non le trovano più.',
    )).toBeInTheDocument();
  });

  it('con 0 impegnate la seconda frase non c\'è', () => {
    render(<DialogoElimina {...propsDialogo({ impegnate: 0 })} />);
    expect(screen.getByText('Ragù di lenticchie, 4 porzioni.')).toBeInTheDocument();
  });

  it('1 porzione e 1 impegnata: le forme singolari', () => {
    render(<DialogoElimina {...propsDialogo({ porzioni: 1, impegnate: 1 })} />);
    expect(screen.getByText(
      'Ragù di lenticchie, 1 porzione. 1 è impegnata dai pasti in programma: dopo, quei pasti non la trovano più.',
    )).toBeInTheDocument();
  });

  it('ANNULLA chiama onAnnulla', () => {
    const props = propsDialogo();
    render(<DialogoElimina {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'ANNULLA' }));
    expect(props.onAnnulla).toHaveBeenCalledTimes(1);
  });

  it('ELIMINA che rigetta mostra l\'errore e riaccende i tasti', async () => {
    const props = propsDialogo();
    props.onElimina.mockRejectedValueOnce(new Error('no'));
    render(<DialogoElimina {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'ELIMINA' }));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ANNULLA' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'ELIMINA' })).not.toBeDisabled();
  });
});
