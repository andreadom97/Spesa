import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IconaDueToni, RIGHE_OMBRA } from '../IconaDueToni';

const svg = (c: HTMLElement) => c.querySelector('svg[data-icona]') as SVGSVGElement;
const parte = (s: Element, p: string) => s.querySelector(`[data-parte="${p}"]`) as SVGElement;

describe('IconaDueToni', () => {
  it('area: pieno nel colore d\'area a 0,72, tratti nel tono medio, 60 px tagliata di 11', () => {
    const { container } = render(<IconaDueToni chiave="carota" area="ortofrutta" tono="area" taglia={60} />);
    const s = svg(container);
    expect(s).toHaveAttribute('aria-hidden', 'true');
    expect(s).toHaveAttribute('data-tono', 'area');
    expect(s).toHaveAttribute('width', '60');
    expect(s).toHaveAttribute('stroke', '#7AA838');
    expect(s.style.right).toBe('-11px');
    expect(s.style.bottom).toBe('-11px');
    expect(s.style.pointerEvents).toBe('none');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(168, 217, 106, 0.72)');
    expect(parte(s, 'tratti')).toHaveAttribute('opacity', '1');
    expect(parte(s, 'ombra')).toHaveAttribute('stroke-width', '0.34');
    expect(parte(s, 'contorno')).toHaveAttribute('stroke-width', '0.9');
    expect(parte(s, 'dettagli')).toHaveAttribute('stroke-width', '0.5');
  });

  it('hero: 96 px tagliata di 18, pieno bianco a 0,7, tratti nel tono medio', () => {
    const { container } = render(<IconaDueToni chiave="pane" area="cereali" tono="hero" taglia={96} />);
    const s = svg(container);
    expect(s).toHaveAttribute('width', '96');
    expect(s.style.right).toBe('-18px');
    expect(s).toHaveAttribute('stroke', '#BB9609');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(255,255,255,0.7)');
  });

  it('tinta (Dispensa in casa): pieno bianco a 0,7, tratti nel tono medio', () => {
    const { container } = render(<IconaDueToni chiave="pesce" area="macelleria" tono="tinta" taglia={60} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#D88384');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(255,255,255,0.7)');
  });

  it('spento: pieno quasi trasparente, tratti --off a 0,55', () => {
    const { container } = render(<IconaDueToni chiave="latte" area="latticini" tono="spento" taglia={60} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#9A9AA6');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(20,22,58,0.06)');
    expect(parte(s, 'tratti')).toHaveAttribute('opacity', '0.55');
  });

  it('dettagli: i gruppi uniti in un path solo', () => {
    const { container } = render(<IconaDueToni chiave="formaggio" area="latticini" tono="area" taglia={60} />);
    expect(parte(svg(container), 'dettagli').getAttribute('d')).toContain('M3.2 13.4H21M16.4 5.4');
  });

  it('due icone nella stessa pagina hanno maschere diverse, e ognuna usa la sua', () => {
    const { container } = render(
      <div>
        <IconaDueToni chiave="carota" area="ortofrutta" tono="area" taglia={60} />
        <IconaDueToni chiave="pane" area="cereali" tono="area" taglia={60} />
      </div>,
    );
    const ids = [...container.querySelectorAll('mask')].map((m) => m.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    ids.forEach((id) => expect(id).toMatch(/^[A-Za-z0-9_-]+$/));
    const ombre = [...container.querySelectorAll('[data-parte="ombra"]')].map((o) => o.getAttribute('mask'));
    expect(ombre).toEqual(ids.map((id) => `url(#${id})`));
  });

  it('il tratteggio è uguale per tutte le icone e copre la griglia', () => {
    const { container } = render(<IconaDueToni chiave="carota" area="ortofrutta" tono="area" taglia={60} />);
    expect(parte(svg(container), 'ombra')).toHaveAttribute('d', RIGHE_OMBRA);
    expect(RIGHE_OMBRA.startsWith('M-2 -1L-28 25')).toBe(true);
    expect(RIGHE_OMBRA.split('M')).toHaveLength(45); // 44 righe
  });

  it('chiave senza sagoma: nulla', () => {
    const { container } = render(<IconaDueToni chiave="acqua" area="dispensa" tono="area" taglia={60} />);
    expect(svg(container)).toBeNull();
  });
});
