import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore }));

import { AvvioMarchio, LivelloAvvio, calcolaVolo, devePartire, CHIAVE_AVVIO, RITARDI_POP } from '../AvvioMarchio';
import { ORDINE_MARCHIO, coloreArea } from '@/domain/aree';
import type { AreaId } from '@/domain/types';

/** `#RRGGBB` → `rgb(r, g, b)`, come jsdom scrive lo stile reso. */
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

let riduci = false;
function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn((q: string) => ({
    matches: riduci && q.includes('reduce'), media: q, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })));
}

type Rett = { left: number; top: number; width: number; height: number };
const RETT_GRANDE: Rett = { left: 110, top: 355, width: 140, height: 90 }; // centro 180, 400
const RETT_BARRA: Rett = { left: 162.5, top: 758, width: 35, height: 22 }; // centro 180, 769
const rettangolo = (r: Rett) => ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => r }) as DOMRect;

/** La barra finta: un `.guscio` col suo data-barra e il segno della Lista col Marchio dentro. */
function montaBarra(stato: 'grande' | 'ridotta') {
  const guscio = document.createElement('div');
  guscio.className = 'guscio';
  guscio.dataset.barra = stato;
  const segno = document.createElement('span');
  segno.setAttribute('data-marchio-barra', '');
  segno.appendChild(document.createElement('div'));
  guscio.appendChild(segno);
  document.body.appendChild(guscio);
  return { segno, togli: () => guscio.remove() };
}

const livello = () => document.querySelector<HTMLElement>('[data-avvio]');
const marchio = () => document.querySelector<HTMLElement>('[data-avvio-marchio]')!;
const avanza = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  riduci = false;
  stubMatchMedia();
  sessionStorage.clear();
  percorso.valore = '/lista';
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-avvio-marchio')) return rettangolo(RETT_GRANDE);
    if (this.parentElement?.hasAttribute('data-marchio-barra')) return rettangolo(RETT_BARRA);
    return rettangolo({ left: 0, top: 0, width: 0, height: 0 });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('calcolaVolo', () => {
  it('porta il centro sul centro e scala sulla larghezza', () => {
    expect(calcolaVolo(RETT_GRANDE, RETT_BARRA)).toEqual({ dx: 0, dy: 369, scala: 0.25 });
    expect(calcolaVolo({ left: 0, top: 0, width: 140, height: 90 }, { left: 100, top: 200, width: 70, height: 45 }))
      .toEqual({ dx: 65, dy: 177.5, scala: 0.5 });
  });
});

describe('devePartire (spec §J: solo su /lista, una volta per sessione, mai con reduce)', () => {
  it('la prima volta su /lista sì, e segna la sessione', () => {
    expect(devePartire('/lista')).toBe(true);
    expect(sessionStorage.getItem(CHIAVE_AVVIO)).not.toBeNull();
    expect(devePartire('/lista')).toBe(false);
  });

  it.each(['/piano', '/dispensa', '/lista/fatta', '/piatti', null])('su %s no', (p) => {
    expect(devePartire(p)).toBe(false);
    expect(sessionStorage.getItem(CHIAVE_AVVIO)).toBeNull();
  });

  it('con prefers-reduced-motion: reduce no', () => {
    riduci = true;
    expect(devePartire('/lista')).toBe(false);
  });

  it('senza matchMedia no: non si sa se il moto è permesso', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(devePartire('/lista')).toBe(false);
  });

  it('se sessionStorage lancia no: non si potrebbe garantire «una volta sola»', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('negato'); });
    expect(devePartire('/lista')).toBe(false);
  });
});

describe('AvvioMarchio', () => {
  it('su /lista monta il livello: fixed, sopra tutto, senza tocchi, nascosto allo screen reader', () => {
    render(<AvvioMarchio />);
    const l = livello()!;
    expect(l).not.toBeNull();
    expect(l).toHaveAttribute('aria-hidden', 'true');
    expect(l.style.position).toBe('fixed');
    expect(l.style.pointerEvents).toBe('none');
    expect(Number(l.style.zIndex)).toBeGreaterThanOrEqual(100);
  });

  it('sei caselle da 40 nei colori pieni e nell\'ordine del Marchio, coi ritardi del pop', () => {
    render(<AvvioMarchio />);
    const caselle = [...marchio().querySelectorAll<HTMLElement>('[data-avvio-casella]')];
    expect(caselle).toHaveLength(6);
    expect(caselle.map((c) => c.style.animationDelay)).toEqual(RITARDI_POP.map((r) => `${r}ms`));
    expect(caselle.map((c) => c.dataset.area)).toEqual(ORDINE_MARCHIO);
    for (const c of caselle) {
      expect(c).toHaveClass('anim-avvio-casella');
      expect(c.style.width).toBe('40px');
      expect(c.style.boxSizing).toBe('border-box');
      expect(c.style.borderRadius).toBe('11.2px');
    }
    // Il colore reso, non la costante del dominio (preflight #60): jsdom normalizza
    // l'esadecimale in rgb(), quindi si confronta con la sua conversione.
    for (const c of caselle) expect(c.style.backgroundColor).toBe(rgb(coloreArea(c.dataset.area as AreaId)));
    expect(caselle[0].style.backgroundColor).toBe('rgb(242, 164, 101)'); // #F2A465, la Dispensa
  });

  it('una volta per sessione: rimontato, non riparte', () => {
    const { unmount } = render(<AvvioMarchio />);
    unmount();
    render(<AvvioMarchio />);
    expect(livello()).toBeNull();
  });

  it('non parte su /piano né con reduce', () => {
    percorso.valore = '/piano';
    const a = render(<AvvioMarchio />);
    expect(livello()).toBeNull();
    a.unmount();
    percorso.valore = '/lista';
    riduci = true;
    render(<AvvioMarchio />);
    expect(livello()).toBeNull();
  });

  it('con la barra grande: pop, volo sul Marchio della barra a 1200, dissolvenza a 1700, smontaggio a 2100', () => {
    const { segno, togli } = montaBarra('grande');
    render(<AvvioMarchio />);
    // Il Marchio della barra è nascosto finché quello in volo non arriva.
    expect(segno).toHaveClass('anim-avvio-nascosto', 'anim-avvio-rivela');

    avanza(1199);
    expect(marchio()).not.toHaveClass('anim-avvio-volo');
    expect(marchio().style.transform).toBe('');

    avanza(1);
    expect(marchio()).toHaveClass('anim-avvio-volo');
    expect(marchio().style.transform).toBe('translate(0px, 369px) scale(0.25)');
    expect(livello()!.querySelector('[data-avvio-fondo]')).toHaveClass('anim-avvio-fondo-via');

    avanza(500); // 1700
    expect(marchio()).toHaveClass('anim-avvio-svanisce');
    expect(segno).not.toHaveClass('anim-avvio-nascosto');

    avanza(399); // 2099
    expect(livello()).not.toBeNull();
    avanza(1); // 2100
    expect(livello()).toBeNull();
    expect(segno).not.toHaveClass('anim-avvio-rivela');
    togli();
  });

  it.each(['ridotta', null] as const)('con la barra %s il volo non parte: il livello si dissolve e si smonta', (stato) => {
    const barra = stato ? montaBarra(stato) : null;
    render(<AvvioMarchio />);
    avanza(1200);
    expect(marchio().style.transform).toBe('');
    expect(livello()).toHaveClass('anim-avvio-dissolto');
    if (barra) expect(barra.segno).not.toHaveClass('anim-avvio-nascosto');
    avanza(900);
    expect(livello()).toBeNull();
    barra?.togli();
  });

  it('smontato prima della fine (cambio di pagina, strict mode) ripulisce la barra e i timer', () => {
    const { segno, togli } = montaBarra('grande');
    const onFine = vi.fn();
    const { unmount } = render(<LivelloAvvio onFine={onFine} />);
    avanza(500);
    unmount();
    expect(segno).not.toHaveClass('anim-avvio-nascosto');
    expect(segno).not.toHaveClass('anim-avvio-rivela');
    avanza(3000);
    expect(onFine).not.toHaveBeenCalled();
    togli();
  });
});
