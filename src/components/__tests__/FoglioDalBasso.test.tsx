import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FoglioDalBasso, TestataFoglio } from '../FoglioDalBasso';

describe('FoglioDalBasso', () => {
  it('il dialogo ha il nome passato', () => {
    render(
      <FoglioDalBasso etichetta="Petto di pollo" onChiudi={vi.fn()}>
        <p>Contenuto</p>
      </FoglioDalBasso>,
    );
    expect(screen.getByRole('dialog', { name: 'Petto di pollo' })).toBeInTheDocument();
  });

  it('il tocco sul velo chiama onChiudi, quello dentro il foglio no', () => {
    const onChiudi = vi.fn();
    render(
      <FoglioDalBasso etichetta="Petto di pollo" onChiudi={onChiudi}>
        <button type="button">Dentro</button>
      </FoglioDalBasso>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dentro' }));
    expect(onChiudi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('velo-foglio'));
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it('con chiudiDalVelo={false} il velo non chiude', () => {
    const onChiudi = vi.fn();
    render(
      <FoglioDalBasso etichetta="Elimina" onChiudi={onChiudi} chiudiDalVelo={false}>
        <p>Contenuto</p>
      </FoglioDalBasso>,
    );
    fireEvent.click(screen.getByTestId('velo-foglio'));
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it('ruolo="alertdialog" dà quel ruolo', () => {
    render(
      <FoglioDalBasso etichetta="Elimina" onChiudi={vi.fn()} ruolo="alertdialog">
        <p>Contenuto</p>
      </FoglioDalBasso>,
    );
    expect(screen.getByRole('alertdialog', { name: 'Elimina' })).toBeInTheDocument();
  });

  it('il fuoco è sul foglio dopo il montaggio', () => {
    render(
      <FoglioDalBasso etichetta="Petto di pollo" onChiudi={vi.fn()}>
        <p>Contenuto</p>
      </FoglioDalBasso>,
    );
    expect(screen.getByRole('dialog', { name: 'Petto di pollo' })).toHaveFocus();
  });

  it('TestataFoglio con indietro rende due tasti coi nomi dati', () => {
    render(
      <TestataFoglio onChiudi={vi.fn()} indietro={{ etichetta: 'Torna al lotto', onClick: vi.fn() }}>
        <span>Titolo</span>
      </TestataFoglio>,
    );
    expect(screen.getByRole('button', { name: 'Torna al lotto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chiudi il foglio' })).toBeInTheDocument();
  });

  it('i livelli stanno a 50, 60 e 80: il 3 è il dialogo sopra il pannello (70)', () => {
    const { rerender } = render(
      <FoglioDalBasso etichetta="Foglio" onChiudi={vi.fn()}><p>Contenuto</p></FoglioDalBasso>,
    );
    expect(screen.getByTestId('velo-foglio').style.zIndex).toBe('50');
    rerender(<FoglioDalBasso etichetta="Foglio" onChiudi={vi.fn()} livello={2}><p>Contenuto</p></FoglioDalBasso>);
    expect(screen.getByTestId('velo-foglio').style.zIndex).toBe('60');
    rerender(<FoglioDalBasso etichetta="Foglio" onChiudi={vi.fn()} livello={3}><p>Contenuto</p></FoglioDalBasso>);
    expect(screen.getByTestId('velo-foglio').style.zIndex).toBe('80');
  });
});
