import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FoglioAzioniPasto } from '../FoglioAzioniPasto';

function renderFoglio(sovrascrivi: Partial<Parameters<typeof FoglioAzioniPasto>[0]> = {}) {
  const handlers = {
    onSaltato: vi.fn(), onMangiatoAltro: vi.fn(), onTornaAlPiano: vi.fn(),
    onCucinatoNonMangiato: vi.fn(), onPreparaPorzioni: vi.fn(),
    onUsaPronta: vi.fn(), onNonUsarePronta: vi.fn(), onChiudi: vi.fn(),
  };
  render(
    <FoglioAzioniPasto
      nomePasto="Cena"
      spuntato={false}
      passato
      aCasa
      porzioniPreparate={0}
      prontiCongelato={false}
      daPronti={false}
      prontiDisponibili={0}
      hrefScegli="/settimana/2026-08-26/sd-3/scegli"
      {...handlers}
      {...sovrascrivi}
    />,
  );
  return handlers;
}

describe('FoglioAzioniPasto', () => {
  it('giorno passato: spunte visibili, link "Ho mangiato un altro piatto"', () => {
    renderFoglio();
    expect(screen.getByRole('button', { name: 'Saltato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ho mangiato altro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ho mangiato un altro piatto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cucinato ma non mangiato' })).toBeInTheDocument();
  });

  it('giorno futuro: niente spunte, il link diventa "Cambia piatto"', () => {
    renderFoglio({ passato: false });
    expect(screen.queryByRole('button', { name: 'Saltato' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cucinato ma non mangiato' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cambia piatto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ne preparo di più' })).toBeInTheDocument();
  });

  it('"Cucinato ma non mangiato" solo se lo slot è a casa', () => {
    renderFoglio({ aCasa: false, spuntato: true });
    expect(screen.queryByRole('button', { name: 'Cucinato ma non mangiato' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Torna al piano' })).toBeInTheDocument();
  });

  it('"Uso una porzione pronta" compare solo con disponibilità, col numero', () => {
    renderFoglio({ prontiDisponibili: 0 });
    expect(screen.queryByText(/Uso una porzione pronta/)).not.toBeInTheDocument();
  });

  it('con disponibilità la voce mostra il numero e invoca il gesto', () => {
    const { onUsaPronta } = renderFoglio({ prontiDisponibili: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Uso una porzione pronta (2 pronte)' }));
    expect(onUsaPronta).toHaveBeenCalledTimes(1);
  });

  it('slot già daPronti: la voce diventa "Non uso la porzione pronta"', () => {
    const { onNonUsarePronta } = renderFoglio({ daPronti: true });
    fireEvent.click(screen.getByRole('button', { name: 'Non uso la porzione pronta' }));
    expect(onNonUsarePronta).toHaveBeenCalledTimes(1);
  });

  it('lo stepper parte dalle porzioni dichiarate e salva n + congelato', () => {
    const { onPreparaPorzioni } = renderFoglio({ porzioniPreparate: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Ne preparo di più' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una porzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Freezer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva porzioni' }));
    expect(onPreparaPorzioni).toHaveBeenCalledWith(3, true);
  });

  it('lo stepper a zero salva la rimozione', () => {
    const { onPreparaPorzioni } = renderFoglio({ porzioniPreparate: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Ne preparo di più' }));
    fireEvent.click(screen.getByRole('button', { name: 'Togli una porzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva porzioni' }));
    expect(onPreparaPorzioni).toHaveBeenCalledWith(0, false);
  });

  // F1 (review meal-prepping): il lotto legato allo slot era in freezer, ma
  // lo stepper partiva sempre da congelato=false — riaprire e correggere solo
  // N (senza toccare Frigo/Freezer) riportava il lotto in frigo in silenzio.
  // congelatoIniziale deve seminare lo stato del toggle dal lotto legato.
  it('lotto legato congelato: riapri lo stepper e salva senza toccare il toggle preserva il freezer', () => {
    const { onPreparaPorzioni } = renderFoglio({ porzioniPreparate: 3, prontiCongelato: true });
    fireEvent.click(screen.getByRole('button', { name: 'Ne preparo di più' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una porzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva porzioni' }));
    expect(onPreparaPorzioni).toHaveBeenCalledWith(4, true);
  });

  it('il tap sul fondale chiude', () => {
    const { onChiudi } = renderFoglio();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });
});
