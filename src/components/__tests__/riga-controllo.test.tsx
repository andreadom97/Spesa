import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RigaControllo } from '../RigaControllo';
import { GIORNI_CONTROLLO_STAPLE } from '@/domain/pantry';

describe('RigaControllo', () => {
  it('la sottoriga riporta la cadenza vera e non dice più SCADUTO', () => {
    render(<RigaControllo nome="farina" area="cereali" onSi={vi.fn()} onNo={vi.fn()} />);
    expect(screen.getByText(`CONTROLLO OGNI ${GIORNI_CONTROLLO_STAPLE} GIORNI`)).toBeInTheDocument();
    expect(screen.queryByText(/SCADUTO/)).not.toBeInTheDocument();
  });

  it('le pillole restano SÌ e NO, coi loro nomi accessibili', () => {
    render(<RigaControllo nome="farina" area="cereali" onSi={vi.fn()} onNo={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sì, hai ancora farina' })).toHaveTextContent('SÌ');
    expect(screen.getByRole('button', { name: 'No, comprane una confezione di farina' })).toHaveTextContent('NO');
  });
});
