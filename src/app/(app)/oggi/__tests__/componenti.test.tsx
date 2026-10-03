import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Poster, PosterVuoto } from '../Poster';
import { Alternative } from '../Alternative';
import { TesseraPiena, TesseraBianca, TesseraDispensaFerma } from '../TesseraOggi';

const caselle = [
  { slotDefId: 'a', stato: 'passata' as const },
  { slotDefId: 'b', stato: 'poster' as const },
  { slotDefId: 'c', stato: 'fuori' as const },
];

describe('Poster (spec §B.4)', () => {
  const base = {
    etichetta: 'Sabato · Cena', nomePiatto: 'Polpette di ceci', sottotitolo: 'Per 2', caselle,
    icona: { chiave: 'legumi' as const, area: 'dispensa' as const }, hrefCambia: '/piano/2026-10-03/cen/scegli?da=oggi',
    onComEAndata: vi.fn(), onRimetti: null, inVolo: false,
  };
  it('etichetta, nome come titolo, sottotitolo, caselle nascoste allo screen reader', () => {
    render(<Poster {...base} />);
    expect(screen.getByText('Sabato · Cena')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
    expect(screen.getByText('Per 2')).toBeInTheDocument();
    const gruppo = document.querySelector('[data-caselle]')!;
    expect(gruppo).toHaveAttribute('aria-hidden', 'true');
    expect([...gruppo.children].map((c) => c.getAttribute('data-stato'))).toEqual(['passata', 'poster', 'fuori']);
  });
  it('la sezione si chiama «Prossimo pasto» (spec §H)', () => {
    render(<Poster {...base} />);
    expect(screen.getByRole('region', { name: 'Prossimo pasto' })).toBeInTheDocument();
  });
  it('CAMBIA è un link a Scegli; COM\'È ANDATA chiama; senza callback non c\'è', () => {
    const { rerender } = render(<Poster {...base} />);
    expect(screen.getByRole('link', { name: 'Cambia' })).toHaveAttribute('href', '/piano/2026-10-03/cen/scegli?da=oggi');
    fireEvent.click(screen.getByRole('button', { name: "Com'è andata" }));
    expect(base.onComEAndata).toHaveBeenCalled();
    rerender(<Poster {...base} onComEAndata={null} />);
    expect(screen.queryByRole('button', { name: "Com'è andata" })).toBeNull();
  });
  it('RIMETTI QUELLO DEL PIANO solo con la callback; con una scrittura in volo anche COM\'È ANDATA è spento', () => {
    const onRimetti = vi.fn();
    const { rerender } = render(<Poster {...base} onRimetti={onRimetti} inVolo />);
    expect(screen.getByRole('button', { name: 'Rimetti quello del piano' })).toBeDisabled();
    expect(screen.getByRole('button', { name: "Com'è andata" })).toBeDisabled();
    // Spento davvero (attributo nativo), e si riaccende a scrittura finita.
    rerender(<Poster {...base} onRimetti={onRimetti} inVolo={false} />);
    expect(screen.getByRole('button', { name: "Com'è andata" })).toBeEnabled();
  });
  it('RIMETTI QUELLO DEL PIANO chiama quando non è in volo, e senza callback non c\'è', () => {
    const onRimetti = vi.fn();
    const { rerender } = render(<Poster {...base} onRimetti={onRimetti} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rimetti quello del piano' }));
    expect(onRimetti).toHaveBeenCalledTimes(1);
    rerender(<Poster {...base} />);
    expect(screen.queryByRole('button', { name: 'Rimetti quello del piano' })).toBeNull();
  });
  it('senza sottotitolo non c\'è la riga', () => {
    render(<Poster {...base} sottotitolo={null} />);
    expect(screen.queryByText('Per 2')).toBeNull();
  });
  it('l\'icona dell\'ingrediente principale è a 96, tono hero (spec §B.4); senza, non c\'è', () => {
    const { container, rerender } = render(<Poster {...base} />);
    const icona = container.querySelector('svg[data-icona]')!;
    expect(icona).toHaveAttribute('data-tono', 'hero');
    expect(icona).toHaveAttribute('width', '96');
    rerender(<Poster {...base} icona={null} />);
    expect(container.querySelector('svg[data-icona]')).toBeNull();
  });
  it('le alternative (children) stanno dentro il poster', () => {
    render(<Poster {...base}><p>Banda</p></Poster>);
    expect(screen.getByRole('region', { name: 'Prossimo pasto' })).toContainElement(screen.getByText('Banda'));
  });
});

describe('PosterVuoto (spec §B.1, §F)', () => {
  it('testo e tasto per il Piano', () => {
    render(<PosterVuoto etichetta="Domani" testo="Il piano di domani non c'è ancora." />);
    expect(screen.getByText("Il piano di domani non c'è ancora.")).toBeInTheDocument();
    expect(screen.getByText('Domani')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Prossimo pasto' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri il piano' })).toHaveAttribute('href', '/piano');
  });
});

describe('Alternative (spec §C.5)', () => {
  const voci = [
    { dishId: 'd-f', nome: 'Frittata di patate', stato: { tipo: 'tutto' as const }, icona: { chiave: 'patata' as const, area: 'ortofrutta' as const } },
    { dishId: 'd-u', nome: 'Uova al pomodoro', stato: { tipo: 'manca' as const, ingrediente: { id: 'pane', nome: 'Pane' } as never }, icona: null },
  ];
  it('etichetta, una lista di carte con lo stato e SCAMBIA con nome accessibile', () => {
    const onScambia = vi.fn();
    render(<Alternative voci={voci} inVolo={false} onScambia={onScambia} />);
    expect(screen.getByText('Oppure, con quello che hai')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Tutto in casa')).toBeInTheDocument();
    expect(screen.getByText('Manca: Pane')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Scambia con Frittata di patate' }));
    expect(onScambia).toHaveBeenCalledWith('d-f');
  });
  it('il carosello è una role="list" esplicita (Safari toglie la lista con list-style none)', () => {
    const { container } = render(<Alternative voci={voci} inVolo={false} onScambia={vi.fn()} />);
    expect(container.querySelector('ul')).toHaveAttribute('role', 'list');
  });
  it('in volo i tasti sono spenti; zero voci non rende niente', () => {
    const { rerender, container } = render(<Alternative voci={voci} inVolo onScambia={vi.fn()} />);
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();
    rerender(<Alternative voci={[]} inVolo={false} onScambia={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('due carte: puntini decorativi sotto; una sola: niente puntini', () => {
    const { container, rerender } = render(<Alternative voci={voci} inVolo={false} onScambia={vi.fn()} />);
    const puntini = container.querySelector('[data-puntini]')!;
    expect(puntini).toHaveAttribute('aria-hidden', 'true');
    expect(puntini.children).toHaveLength(2);
    rerender(<Alternative voci={[voci[0]]} inVolo={false} onScambia={vi.fn()} />);
    expect(container.querySelector('[data-puntini]')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
  it('l\'icona della carta è a 96, tono area; senza icona non c\'è', () => {
    const { container } = render(<Alternative voci={voci} inVolo={false} onScambia={vi.fn()} />);
    const icone = container.querySelectorAll('svg[data-icona]');
    expect(icone).toHaveLength(1);
    expect(icone[0]).toHaveAttribute('data-tono', 'area');
    expect(icone[0]).toHaveAttribute('width', '96');
  });
});

describe('Tessere (spec §D)', () => {
  it('piena: pillola, nome, sottotitolo, link', () => {
    render(<TesseraPiena area="latticini" pillola="Scade lunedì" nome="Feta" sottotitolo="Pranzo di domani" icona={null} href="/dispensa?ingrediente=feta" />);
    expect(screen.getByRole('link', { name: /Feta/ })).toHaveAttribute('href', '/dispensa?ingrediente=feta');
    expect(screen.getByText('Scade lunedì')).toBeInTheDocument();
    expect(screen.getByText('Pranzo di domani')).toBeInTheDocument();
  });
  it('piena: l\'icona è a 96, tono hero; senza area la tessera è bianca e regge', () => {
    const { container, rerender } = render(
      <TesseraPiena area="latticini" pillola="Scade lunedì" nome="Feta" sottotitolo="Pranzo di domani" icona={{ chiave: 'formaggio', area: 'latticini' }} href="/x" />,
    );
    const icona = container.querySelector('svg[data-icona]')!;
    expect(icona).toHaveAttribute('data-tono', 'hero');
    expect(icona).toHaveAttribute('width', '96');
    rerender(<TesseraPiena area={null} pillola="2 pronti" nome="Pasta e ceci" sottotitolo="In frigo" icona={null} href="/x" />);
    expect(screen.getByRole('link', { name: /Pasta e ceci/ })).toBeInTheDocument();
  });
  it('bianca: etichetta o pillola fredda', () => {
    render(<TesseraBianca pillola={{ testo: 'Scongela', tono: 'freddo' }} etichetta={null} nome="Pane" sottotitolo="Per cena di domani" icona={null} href="/dispensa?ingrediente=pane" />);
    expect(screen.getByText('Scongela')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pane/ })).toBeInTheDocument();
  });
  it('bianca: con l\'etichetta mono (Poi) niente pillola; l\'icona è a 60, tono area', () => {
    const { container } = render(
      <TesseraBianca pillola={null} etichetta="Poi · Cena" nome="Farro con zucca" sottotitolo={null} icona={{ chiave: 'pane', area: 'cereali' }} href="/piano" larga />,
    );
    expect(screen.getByText('Poi · Cena')).toBeInTheDocument();
    // L'etichetta porta informazione: --testo-2 (6,2:1 su bianco), non --sec (3,4:1, solo decorazione).
    expect(screen.getByText('Poi · Cena').getAttribute('style')).toContain('color: var(--testo-2)');
    expect(screen.queryByText('Scongela')).toBeNull();
    const icona = container.querySelector('svg[data-icona]')!;
    expect(icona).toHaveAttribute('data-tono', 'area');
    expect(icona).toHaveAttribute('width', '60');
  });
  it('dispensa ferma: i due testi e APRI LA LISTA', () => {
    const { rerender } = render(<TesseraDispensaFerma ultimaChiusura="2026-08-28" />);
    expect(screen.getByText('La dispensa è ferma al 28 agosto')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri la lista' })).toHaveAttribute('href', '/lista');
    rerender(<TesseraDispensaFerma ultimaChiusura={null} />);
    expect(screen.getByText(/Chiudi la prima spesa nell'app/)).toBeInTheDocument();
  });
});
