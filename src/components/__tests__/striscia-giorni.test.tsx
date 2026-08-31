import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StrisciaGiorni } from '../StrisciaGiorni';

describe('StrisciaGiorni', () => {
  it('ogni giorno ha nome accessibile con giorno esteso, numero e stato', () => {
    render(
      <StrisciaGiorni
        giorni={['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30']}
        slotDefs={[]}
        slots={[]}
        oggi="2026-08-30"
        selezionato={6}
        onSeleziona={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Domenica 30, selezionato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lunedì 24' })).toBeInTheDocument();
  });
});
