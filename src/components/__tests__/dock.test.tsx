import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dock, ErroreSopraDock } from '../Dock';
import { SlotDockProvider } from '../dock-slot';
import { BarraProvider, useNascondiBarra } from '../barra-context';

function NascondeLaBarra() {
  useNascondiBarra(true);
  return null;
}

describe('Dock', () => {
  it('senza slot non renderizza niente', () => {
    const { container } = render(
      <SlotDockProvider slot={null}>
        <Dock><button type="button">HAI PRESO TUTTO</button></Dock>
      </SlotDockProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'HAI PRESO TUTTO' })).not.toBeInTheDocument();
  });

  it('con lo slot monta il contenuto dentro lo slot, non dov\'è scritto', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    const { container } = render(
      <SlotDockProvider slot={slot}>
        <Dock><button type="button">HAI PRESO TUTTO</button></Dock>
      </SlotDockProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    const tasto = screen.getByRole('button', { name: 'HAI PRESO TUTTO' });
    expect(slot.contains(tasto)).toBe(true);
    expect(slot.querySelector('.dock')).not.toBeNull();
    slot.remove();
  });

  it('il contenitore è una regione di nome «Azione principale» (spec fase 3 §H)', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    render(
      <SlotDockProvider slot={slot}>
        <Dock><button type="button">HAI PRESO TUTTO</button></Dock>
      </SlotDockProvider>,
    );
    const regione = screen.getByRole('region', { name: 'Azione principale' });
    expect(regione).toHaveClass('dock');
    expect(regione).toContainElement(screen.getByRole('button', { name: 'HAI PRESO TUTTO' }));
    slot.remove();
  });

  it('con sciolto il contenitore ha le classi dock e dock-sciolto ed è ancora la regione «Azione principale» (spec fase 4 §A)', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    render(
      <SlotDockProvider slot={slot}>
        <Dock sciolto><button type="button">HAI PRESO TUTTO</button></Dock>
      </SlotDockProvider>,
    );
    const regione = screen.getByRole('region', { name: 'Azione principale' });
    expect(regione).toHaveClass('dock');
    expect(regione).toHaveClass('dock-sciolto');
    slot.remove();
  });

  it('con la tab bar nascosta il Dock prende dock-senza-barra (spec fase 5 §F)', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    render(
      <BarraProvider>
        <SlotDockProvider slot={slot}>
          <NascondeLaBarra />
          <Dock><button type="button">SALVA</button></Dock>
        </SlotDockProvider>
      </BarraProvider>,
    );
    expect(slot.querySelector('.dock')).toHaveClass('dock', 'anim-dock', 'dock-senza-barra');
    slot.remove();
  });

  it('con la tab bar al suo posto il Dock non ha dock-senza-barra', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    render(
      <BarraProvider>
        <SlotDockProvider slot={slot}>
          <Dock><button type="button">SALVA</button></Dock>
        </SlotDockProvider>
      </BarraProvider>,
    );
    expect(slot.querySelector('.dock')).not.toHaveClass('dock-senza-barra');
    slot.remove();
  });

  it('ErroreSopraDock: un alert dentro la regione del Dock, sopra la pillola e fuori, su fondo bianco, in --errore (fase 7)', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    render(
      <SlotDockProvider slot={slot}>
        <Dock>
          <ErroreSopraDock>Non siamo riusciti a salvare. Riprova.</ErroreSopraDock>
          <button type="button">SALVA</button>
        </Dock>
      </SlotDockProvider>,
    );
    const regione = screen.getByRole('region', { name: 'Azione principale' });
    const msg = screen.getByRole('alert');
    expect(regione).toContainElement(msg);
    expect(msg).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(msg.style.position).toBe('absolute');
    expect(msg.style.bottom).toBe('calc(100% + 8px)');
    expect(msg.style.background).toBe('var(--superficie)');
    expect(msg.style.color).toBe('var(--errore)');
    slot.remove();
  });
});
