import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlotDockProvider } from '@/components/dock-slot';
import type { Ingredient } from '@/domain/types';
import type { PillolaStato, VoceDispensa } from '@/domain/dispensa-vista';
import { TesseraDispensa } from '../TesseraDispensa';
import { TesseraLotto } from '../TesseraLotto';
import { WidgetArea } from '../WidgetArea';
import { WidgetVuoti } from '../WidgetVuoti';
import { DockDispensa } from '../DockDispensa';

const pollo: Ingredient = {
  id: 'pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile',
  deperibile: true, formatoConfezione: 300, prezzoConfezione: null, ean: null,
};
function voce(p: Partial<VoceDispensa> = {}): VoceDispensa {
  return { ingrediente: pollo, residuo: 600, ultimoAcquisto: '2026-09-24', congelato: false, scadenzaManuale: null, ...p };
}

describe('TesseraDispensa', () => {
  it('in casa: nome accessibile, quantità, nessun aria-pressed, il click chiama onApri', () => {
    const onApri = vi.fn();
    render(<TesseraDispensa voce={voce()} pillola={null} onApri={onApri} />);
    const tasto = screen.getByRole('button', { name: 'Apri Petto di pollo' });
    expect(tasto).toHaveTextContent('600 g');
    expect(tasto).not.toHaveAttribute('aria-pressed');
    fireEvent.click(tasto);
    expect(onApri).toHaveBeenCalledTimes(1);
  });

  it('finita: testo Finito e nome barrato', () => {
    render(<TesseraDispensa voce={voce({ residuo: 0 })} pillola={null} onApri={vi.fn()} />);
    const tasto = screen.getByRole('button', { name: 'Apri Petto di pollo' });
    expect(tasto).toHaveTextContent('Finito');
    expect(screen.getByText('Petto di pollo')).toHaveStyle({ textDecoration: 'line-through' });
  });

  it('mai comprata: testo Mai comprato, nome non barrato', () => {
    render(<TesseraDispensa voce={voce({ residuo: 0, ultimoAcquisto: null })} pillola={null} onApri={vi.fn()} />);
    const tasto = screen.getByRole('button', { name: 'Apri Petto di pollo' });
    expect(tasto).toHaveTextContent('Mai comprato');
    expect(screen.getByText('Petto di pollo')).toHaveStyle({ textDecoration: 'none' });
  });

  it('la pillola compare in var(--avviso) se avviso, in var(--freddo) se congelato, e non compare se null', () => {
    const avviso: PillolaStato = { testo: 'Scade il 27/09', tono: 'avviso' };
    const { rerender } = render(<TesseraDispensa voce={voce()} pillola={avviso} onApri={vi.fn()} />);
    expect(screen.getByText('Scade il 27/09')).toHaveStyle({ color: 'var(--avviso)' });

    const freddo: PillolaStato = { testo: 'Congelato', tono: 'freddo' };
    rerender(<TesseraDispensa voce={voce()} pillola={freddo} onApri={vi.fn()} />);
    expect(screen.getByText('Congelato')).toHaveStyle({ color: 'var(--freddo)' });

    rerender(<TesseraDispensa voce={voce()} pillola={null} onApri={vi.fn()} />);
    expect(screen.queryByText('Scade il 27/09')).not.toBeInTheDocument();
    expect(screen.queryByText('Congelato')).not.toBeInTheDocument();
  });
});

describe('TesseraLotto', () => {
  it('nome accessibile, testo delle porzioni, Congelato solo se congelato', () => {
    const onApri = vi.fn();
    const { rerender } = render(<TesseraLotto nome="Ragù di lenticchie" porzioni={4} congelato={false} onApri={onApri} />);
    const tasto = screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' });
    expect(tasto).toHaveTextContent('4 porz.');
    expect(screen.queryByText('Congelato')).not.toBeInTheDocument();
    fireEvent.click(tasto);
    expect(onApri).toHaveBeenCalledTimes(1);

    rerender(<TesseraLotto nome="Ragù di lenticchie" porzioni={4} congelato onApri={onApri} />);
    expect(screen.getByText('Congelato')).toBeInTheDocument();
  });
});

describe('WidgetArea', () => {
  it('una regione col nome dato, nessun contatore', () => {
    render(<WidgetArea etichetta="MACELLERIA E PESCHERIA" colore="#F29B9B">contenuto</WidgetArea>);
    const regione = screen.getByRole('region', { name: 'MACELLERIA E PESCHERIA' });
    expect(regione).toBeInTheDocument();
    expect(screen.queryByText(/voci$/)).not.toBeInTheDocument();
  });
});

describe('WidgetVuoti', () => {
  it('role="status" col nome Carico la dispensa, tre elementi anim-luce-widget', () => {
    const { container } = render(<WidgetVuoti />);
    expect(screen.getByRole('status', { name: 'Carico la dispensa' })).toBeInTheDocument();
    expect(container.querySelectorAll('.anim-luce-widget')).toHaveLength(3);
  });
});

function renderDockDispensa(props: Partial<Parameters<typeof DockDispensa>[0]> = {}) {
  const handlers = { onModifica: vi.fn(), onPremiMicrofono: vi.fn(), onToccaMicrofono: vi.fn() };
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  render(
    <SlotDockProvider slot={slot}>
      <DockDispensa dettatura {...handlers} {...props} />
    </SlotDockProvider>,
  );
  return { ...handlers, slot };
}

describe('DockDispensa', () => {
  it('senza dettatura c\'è solo "Modifica con l\'AI"', () => {
    const { slot } = renderDockDispensa({ dettatura: false });
    expect(screen.getByRole('button', { name: "Modifica con l'AI" })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registra un vocale' })).not.toBeInTheDocument();
    slot.remove();
  });

  it('con dettatura c\'è anche "Registra un vocale"', () => {
    const { slot } = renderDockDispensa({ dettatura: true });
    expect(screen.getByRole('button', { name: "Modifica con l'AI" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registra un vocale' })).toBeInTheDocument();
    slot.remove();
  });

  it('pointerDown sul tondo chiama onPremiMicrofono col pointerId del dito', () => {
    const { onPremiMicrofono, slot } = renderDockDispensa({ dettatura: true });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Registra un vocale' }), { pointerId: 7 });
    expect(onPremiMicrofono).toHaveBeenCalledTimes(1);
    expect(onPremiMicrofono).toHaveBeenCalledWith(7);
    slot.remove();
  });

  it('il click del tondo come in WidgetAI: il dito (pointerdown + click) no; tastiera e screen reader sì', () => {
    const { onPremiMicrofono, onToccaMicrofono, slot } = renderDockDispensa({ dettatura: true });
    const tondo = screen.getByRole('button', { name: 'Registra un vocale' });

    // Il dito: pointerdown e poi il click del browser. Lo gestisce `premi`.
    fireEvent.pointerDown(tondo, { pointerId: 3 });
    fireEvent.click(tondo, { detail: 1 });
    expect(onPremiMicrofono).toHaveBeenCalledTimes(1);
    expect(onToccaMicrofono).not.toHaveBeenCalled();

    // Uno screen reader: click sintetizzato con detail 1, senza pointerdown prima.
    fireEvent.click(tondo, { detail: 1 });
    expect(onToccaMicrofono).toHaveBeenCalledTimes(1);

    // La tastiera: detail 0, sempre, anche con un pointerdown rimasto senza click.
    fireEvent.click(tondo, { detail: 0 });
    expect(onToccaMicrofono).toHaveBeenCalledTimes(2);
    fireEvent.pointerDown(tondo, { pointerId: 4 });
    fireEvent.click(tondo, { detail: 0 });
    expect(onToccaMicrofono).toHaveBeenCalledTimes(3);
    slot.remove();
  });

  it('il contenitore ha la classe dock-sciolto', () => {
    const { slot } = renderDockDispensa();
    expect(slot.querySelector('.dock-sciolto')).not.toBeNull();
    slot.remove();
  });
});
