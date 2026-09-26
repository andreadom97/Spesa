import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RigaControllo } from '../RigaControllo';

describe('RigaControllo', () => {
  it.each([
    [30, 'CONTROLLO OGNI MESE'],
    [60, 'CONTROLLO OGNI 2 MESI'],
    [90, 'CONTROLLO OGNI 3 MESI'],
  ] as const)('con la cadenza a %i giorni la sottoriga dice %s (spec fase 5 §I)', (g, testo) => {
    render(<RigaControllo nome="farina" area="cereali" giorniControllo={g} onSi={vi.fn()} onNo={vi.fn()} />);
    expect(screen.getByText(testo)).toBeInTheDocument();
    // Il testo di prima non torna, né il conto in giorni.
    expect(screen.queryByText(/GIORNI/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SCADUTO/)).not.toBeInTheDocument();
  });

  it('le pillole restano SÌ e NO, coi loro nomi accessibili', () => {
    render(<RigaControllo nome="farina" area="cereali" giorniControllo={90} onSi={vi.fn()} onNo={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sì, hai ancora farina' })).toHaveTextContent('SÌ');
    expect(screen.getByRole('button', { name: 'No, comprane una confezione di farina' })).toHaveTextContent('NO');
  });
});
