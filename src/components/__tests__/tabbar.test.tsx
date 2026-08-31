import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore }));

import { TabBar } from '../TabBar';

describe('TabBar', () => {
  it('ha quattro voci: LISTA, SETTIMANA, PIATTI, DISPENSA', () => {
    render(<TabBar />);
    for (const nome of ['LISTA', 'SETTIMANA', 'PIATTI', 'DISPENSA']) {
      expect(screen.getByRole('link', { name: new RegExp(nome) })).toBeInTheDocument();
    }
  });

  it('DISPENSA è attiva su /dispensa', () => {
    percorso.valore = '/dispensa';
    render(<TabBar />);
    const voce = screen.getByRole('link', { name: /DISPENSA/ });
    expect(voce.getAttribute('href')).toBe('/dispensa');
  });
});
