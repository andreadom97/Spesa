import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RigaPasto } from '../RigaPasto';
import type { StatoSlot } from '@/domain/types';

describe('RigaPasto', () => {
  it('il corpo centrale ha nome accessibile Apri quando c\'è un piatto', () => {
    render(
      <RigaPasto
        nomePasto="Pranzo"
        stato={"casa" as StatoSlot}
        nomePiatto="Riso e ceci"
        aree={[]}
        onToggleStato={() => {}}
        onApriPiatto={() => {}}
        hrefScegli="/x"
      />,
    );
    expect(screen.getByRole('button', { name: 'Apri Riso e ceci' })).toBeInTheDocument();
  });

  it('il corpo centrale non ha aria-label quando non c\'è un piatto', () => {
    render(
      <RigaPasto
        nomePasto="Pranzo"
        stato={"casa" as StatoSlot}
        nomePiatto={null}
        aree={[]}
        onToggleStato={() => {}}
        hrefScegli="/x"
      />,
    );
    const bottone = screen.getByRole('button', { name: /Nessun piatto assegnato/ });
    expect(bottone).not.toHaveAttribute('aria-label');
  });
});
