import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dock } from '../Dock';
import { SlotDockProvider } from '../dock-slot';

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
});
