import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SceltaUnita } from '../SceltaUnita';

describe('SceltaUnita', () => {
  it('tre pillole G / ML / PZ, la scelta premuta, il tocco sceglie', () => {
    const onCambia = vi.fn();
    render(<SceltaUnita valore="g" onCambia={onCambia} etichetta="Unità di olive" />);
    const gruppo = screen.getByRole('group', { name: 'Unità di olive' });
    expect(within(gruppo).getByRole('button', { name: 'G' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(gruppo).getByRole('button', { name: 'PZ' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(within(gruppo).getByRole('button', { name: 'PZ' }));
    expect(onCambia).toHaveBeenCalledWith('pz');
  });

  it('senza valore nessuna è premuta; disabilitata non sceglie', () => {
    const onCambia = vi.fn();
    render(<SceltaUnita valore={null} onCambia={onCambia} disabilitato />);
    const gruppo = screen.getByRole('group', { name: 'Unità' });
    expect(within(gruppo).getAllByRole('button').every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(within(gruppo).getByRole('button', { name: 'ML' })).toBeDisabled();
  });
});
