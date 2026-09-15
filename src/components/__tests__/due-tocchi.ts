import { vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { RITARDO_MINIMO_MS } from '../BottoneDueTocchi';

/**
 * Il secondo tap di un `BottoneDueTocchi` già armato, nei test di pagina
 * che girano con i timer veri: due `click` in fila arrivano a pochi
 * millisecondi l'uno dall'altro e il bottone li scarta come un doppio tap
 * involontario. Qui `Date.now` si sposta avanti di `RITARDO_MINIMO_MS`, e
 * solo per questo click: il resto della pagina (la coda offline, per dire,
 * che timbra ogni spunta) continua a leggere l'ora vera.
 */
export function secondoTocco(): void {
  const spia = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + RITARDO_MINIMO_MS);
  try {
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));
  } finally {
    spia.mockRestore();
  }
}

/** I due tap in fila: arma e conferma. */
export function dueTocchi(bottone: HTMLElement): void {
  fireEvent.click(bottone);
  secondoTocco();
}
