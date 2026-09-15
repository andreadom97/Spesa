import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BottoneDueTocchi, DISARMO_MS, RITARDO_MINIMO_MS } from '../BottoneDueTocchi';

// Timer finti in ogni test: il bottone ragiona su `Date.now()` (il tempo
// fra i due tap) e su un `setTimeout` (il disarmo automatico), e qui si
// vuole decidere quanto tempo passa, non aspettarlo.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BottoneDueTocchi', () => {
  it('il primo tap arma ("SICURO?") senza confermare', () => {
    const onConferma = vi.fn();
    render(<BottoneDueTocchi testo="TOGLI" onConferma={onConferma} />);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));

    expect(screen.getByRole('button', { name: 'SICURO?' })).toBeInTheDocument();
    expect(onConferma).not.toHaveBeenCalled();
  });

  // Review del 15/09 (bassa): un doppio tap involontario, due `click` a
  // ~100 ms, armava e confermava in un colpo solo. La conferma in due
  // tocchi serve proprio a non farlo.
  it('un doppio tap a 100 ms non conferma: il bottone resta armato', () => {
    const onConferma = vi.fn();
    render(<BottoneDueTocchi testo="TOGLI" onConferma={onConferma} />);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    expect(onConferma).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'SICURO?' })).toBeInTheDocument();
  });

  it('il secondo tap conferma solo se sono passati almeno RITARDO_MINIMO_MS', () => {
    const onConferma = vi.fn();
    render(<BottoneDueTocchi testo="TOGLI" onConferma={onConferma} />);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));
    act(() => { vi.advanceTimersByTime(RITARDO_MINIMO_MS - 1); });
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));
    expect(onConferma).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    expect(onConferma).toHaveBeenCalledTimes(1);
    // Confermato: si disarma.
    expect(screen.getByRole('button', { name: 'TOGLI' })).toBeInTheDocument();
  });

  it('un secondo tap a 400 ms conferma', () => {
    const onConferma = vi.fn();
    render(<BottoneDueTocchi testo="TOGLI" onConferma={onConferma} />);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    expect(onConferma).toHaveBeenCalledTimes(1);
  });

  it('dopo DISARMO_MS senza il secondo tap si disarma da solo', () => {
    const onConferma = vi.fn();
    render(<BottoneDueTocchi testo="TOGLI" onConferma={onConferma} />);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));
    act(() => { vi.advanceTimersByTime(DISARMO_MS - 1); });
    expect(screen.getByRole('button', { name: 'SICURO?' })).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1); });

    expect(screen.getByRole('button', { name: 'TOGLI' })).toBeInTheDocument();
    // Un tap adesso arma di nuovo, non conferma.
    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));
    expect(onConferma).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'SICURO?' })).toBeInTheDocument();
  });

  it('un tap fuori dal bottone disarma senza confermare', () => {
    const onConferma = vi.fn();
    render(<BottoneDueTocchi testo="TOGLI" onConferma={onConferma} />);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.click(document.body);

    expect(screen.getByRole('button', { name: 'TOGLI' })).toBeInTheDocument();
    expect(onConferma).not.toHaveBeenCalled();
  });

  it('al disarmo (tap fuori) e allo smontaggio il timer se ne va', () => {
    const { unmount } = render(<BottoneDueTocchi testo="TOGLI" onConferma={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));
    expect(vi.getTimerCount()).toBe(1);
    fireEvent.click(document.body);
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('con disabled non si arma', () => {
    const onConferma = vi.fn();
    render(<BottoneDueTocchi testo="TOGLI" onConferma={onConferma} disabled />);

    fireEvent.click(screen.getByRole('button', { name: 'TOGLI' }));

    expect(screen.getByRole('button', { name: 'TOGLI' })).toBeDisabled();
    expect(onConferma).not.toHaveBeenCalled();
  });
});
