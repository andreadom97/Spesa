import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { AreaId, Ingredient } from '@/domain/types';
import { SelettoreIngrediente } from '../SelettoreIngrediente';

function ingrediente(id: string, nome: string, area: AreaId = 'dispensa'): Ingredient {
  return {
    id, nome, unitaBase: 'g', area, classeResiduo: 'porzionabile', deperibile: false,
    formatoConfezione: 100, prezzoConfezione: null, ean: null,
  };
}

const YOGURT = ingrediente('i-1', 'Yogurt greco', 'latticini');
const AVENA = ingrediente('i-2', "Fiocchi d'avena", 'cereali');
const MOLTI = Array.from({ length: 12 }, (_, i) => ingrediente(`r-${i}`, `Riempitivo ${i}`));
const CAFFE = ingrediente('i-caffe', 'Caffè');

function apri(ingredienti: Ingredient[] = [YOGURT, AVENA]) {
  const onScegli = vi.fn();
  const onChiudi = vi.fn();
  const onPrimaDiCreare = vi.fn();
  render(
    <SelettoreIngrediente
      ingredienti={ingredienti}
      onScegli={onScegli}
      onChiudi={onChiudi}
      hrefNuovo="/piatti/d-1/ingredienti/nuovo"
      onPrimaDiCreare={onPrimaDiCreare}
    />,
  );
  return { onScegli, onChiudi, onPrimaDiCreare };
}

describe('SelettoreIngrediente (spec fase 7 §B.4)', () => {
  it('è un Foglio dal basso: un dialogo «Aggiungi ingrediente», AGGIUNGI INGREDIENTE in testata e la X', () => {
    apri();
    const foglio = screen.getByRole('dialog', { name: 'Aggiungi ingrediente' });
    expect(within(foglio).getByText('AGGIUNGI INGREDIENTE')).toBeInTheDocument();
    expect(within(foglio).getByRole('button', { name: 'Chiudi il foglio' })).toBeInTheDocument();
    expect(within(foglio).getByRole('button', { name: 'Yogurt greco' })).toBeInTheDocument();
    expect(within(foglio).getByRole('button', { name: "Fiocchi d'avena" })).toBeInTheDocument();
  });

  it('il tocco su una voce la passa a onScegli, e basta: chiudere è della pagina', () => {
    const { onScegli, onChiudi } = apri();
    fireEvent.click(screen.getByRole('button', { name: 'Yogurt greco' }));
    expect(onScegli).toHaveBeenCalledWith(YOGURT);
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it('la X e il velo chiudono senza scegliere', () => {
    const { onScegli, onChiudi } = apri();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi il foglio' }));
    expect(onChiudi).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('velo-foglio'));
    expect(onChiudi).toHaveBeenCalledTimes(2);
    expect(onScegli).not.toHaveBeenCalled();
  });

  it('la ricerca compare solo con più di otto ingredienti', () => {
    apri(MOLTI.slice(0, 8));
    expect(screen.queryByLabelText('Cerca un ingrediente')).toBeNull();
  });

  it('con nove ingredienti la ricerca c’è, senza fuoco automatico', () => {
    apri(MOLTI.slice(0, 9));
    const campo = screen.getByLabelText('Cerca un ingrediente');
    expect(campo).toHaveAttribute('placeholder', 'Cerca');
    expect(campo).not.toHaveFocus();
  });

  it('la ricerca filtra dentro il nome, senza accenti e senza maiuscole', () => {
    apri([...MOLTI, CAFFE]);
    fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: 'CAFFE' } });
    expect(screen.getByRole('button', { name: 'Caffè' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riempitivo 0' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: 'pitivo 1' } });
    expect(screen.getByRole('button', { name: 'Riempitivo 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Riempitivo 11' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riempitivo 2' })).toBeNull();
  });

  it('senza risultati propone di crearlo, e il link resta', () => {
    apri(MOLTI);
    fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: ' zafferano ' } });
    expect(screen.getByText('Nessun ingrediente per "zafferano". Puoi crearlo qui sotto.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ })).toBeInTheDocument();
  });

  it('con tutti gli ingredienti già nel piatto lo dice', () => {
    apri([]);
    expect(screen.getByText('Hai già aggiunto tutti gli ingredienti del repertorio.')).toBeInTheDocument();
  });

  it('NUOVO INGREDIENTE porta alla creazione e mette al riparo la bozza prima di uscire', () => {
    const { onPrimaDiCreare } = apri();
    const link = screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ });
    expect(link).toHaveAttribute('href', '/piatti/d-1/ingredienti/nuovo');
    fireEvent.click(link);
    expect(onPrimaDiCreare).toHaveBeenCalledTimes(1);
  });

  it('le voci e il link sono alti almeno 44', () => {
    apri();
    expect(screen.getByRole('button', { name: 'Yogurt greco' }).style.minHeight).toBe('44px');
    expect(screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ }).style.minHeight).toBe('44px');
  });
});
