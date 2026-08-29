import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FoglioAzioniPasto } from '../FoglioAzioniPasto';

function renderFoglio(spuntato: boolean) {
  const onSaltato = vi.fn();
  const onMangiatoAltro = vi.fn();
  const onTornaAlPiano = vi.fn();
  const onChiudi = vi.fn();
  render(
    <FoglioAzioniPasto
      nomePasto="Cena"
      spuntato={spuntato}
      hrefScegli="/settimana/2026-08-26/sd-3/scegli"
      onSaltato={onSaltato}
      onMangiatoAltro={onMangiatoAltro}
      onTornaAlPiano={onTornaAlPiano}
      onChiudi={onChiudi}
    />,
  );
  return { onSaltato, onMangiatoAltro, onTornaAlPiano, onChiudi };
}

describe('FoglioAzioniPasto', () => {
  it('mostra le tre azioni; "Torna al piano" solo se lo slot è già spuntato', () => {
    renderFoglio(false);
    expect(screen.getByRole('button', { name: 'Saltato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ho mangiato altro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ho mangiato un altro piatto' }))
      .toHaveAttribute('href', '/settimana/2026-08-26/sd-3/scegli');
    expect(screen.queryByRole('button', { name: 'Torna al piano' })).not.toBeInTheDocument();
  });

  it('su uno slot spuntato compare "Torna al piano" e invoca il suo handler', () => {
    const { onTornaAlPiano } = renderFoglio(true);
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piano' }));
    expect(onTornaAlPiano).toHaveBeenCalledTimes(1);
  });

  it('le azioni invocano i rispettivi handler', () => {
    const { onSaltato, onMangiatoAltro } = renderFoglio(false);
    fireEvent.click(screen.getByRole('button', { name: 'Saltato' }));
    expect(onSaltato).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ho mangiato altro' }));
    expect(onMangiatoAltro).toHaveBeenCalledTimes(1);
  });

  it('il tap sul fondale chiude', () => {
    const { onChiudi } = renderFoglio(false);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });
});
