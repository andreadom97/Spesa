import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IconaIngrediente, alone } from '../IconaIngrediente';
import { TRACCIATI } from '../tracciati-ingredienti';
import { CHIAVI_ICONE } from '@/domain/icone-ingredienti';

const PILOTA = ['bistecca', 'cosciotto', 'pesce', 'carota', 'pomodoro', 'uovo', 'latte', 'formaggio', 'pasta', 'pane', 'legumi', 'piselli'] as const;

function svg(c: HTMLElement) {
  return c.querySelector('svg[data-icona]') as SVGSVGElement;
}

describe('IconaIngrediente', () => {
  it('tono area: tono medio pieno, 52 px, tagliata di 10 px', () => {
    const { container } = render(<IconaIngrediente chiave="carota" area="ortofrutta" tono="area" taglia={52} />);
    const s = svg(container);
    expect(s).toHaveAttribute('aria-hidden', 'true');
    expect(s).toHaveAttribute('width', '52');
    expect(s).toHaveAttribute('stroke', '#7AA838');
    expect(s.style.right).toBe('-10px');
    expect(s.style.bottom).toBe('-10px');
    expect(s.style.opacity).toBe('1');
    expect(s.style.pointerEvents).toBe('none');
    const [sagoma, dettagli] = s.querySelectorAll('path');
    expect(sagoma).toHaveAttribute('stroke-width', '2');
    expect(dettagli).toHaveAttribute('stroke-width', '1.25');
  });

  it('tono hero: bianco a 0,42, 84 px, tagliata di 17 px', () => {
    const { container } = render(<IconaIngrediente chiave="pane" area="cereali" tono="hero" taglia={84} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#FFFFFF');
    expect(s).toHaveAttribute('width', '84');
    expect(s.style.opacity).toBe('0.42');
    expect(s.style.right).toBe('-17px');
  });

  it('tono spento: --off a 0,5', () => {
    const { container } = render(<IconaIngrediente chiave="uovo" area="latticini" tono="spento" taglia={52} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#9A9AA6');
    expect(s.style.opacity).toBe('0.5');
  });

  it('pasta ruotata di -28° come nel pilota', () => {
    const { container } = render(<IconaIngrediente chiave="pasta" area="cereali" tono="area" taglia={52} />);
    expect(svg(container).querySelector('path')).toHaveAttribute('transform', 'rotate(-28 12 12)');
  });

  it('ogni chiave del catalogo ha il tracciato', () => {
    expect(CHIAVI_ICONE.filter((k) => !TRACCIATI[k])).toEqual([]);
  });

  it('ogni tracciato ha sagoma e dettagli', () => {
    const vuoti = CHIAVI_ICONE.filter((k) => !TRACCIATI[k]?.d || !TRACCIATI[k]?.dd);
    expect(vuoti).toEqual([]);
  });

  it('chiave senza tracciato: nulla', () => {
    const { container } = render(
      <IconaIngrediente chiave={'inesistente' as never} area="dispensa" tono="area" taglia={52} />,
    );
    expect(svg(container)).toBeNull();
  });

  it('i dodici del pilota hanno il tracciato', () => {
    expect(PILOTA.filter((k) => !TRACCIATI[k])).toEqual([]);
  });
});

describe('alone', () => {
  it('otto direzioni senza sfocatura e una sfocata, nel colore dato', () => {
    expect(alone('#FFFFFF', 2)).toBe(
      '2px 0px 0 #FFFFFF,-2px 0px 0 #FFFFFF,0px 2px 0 #FFFFFF,0px -2px 0 #FFFFFF,'
      + '1.41px 1.41px 0 #FFFFFF,-1.41px 1.41px 0 #FFFFFF,1.41px -1.41px 0 #FFFFFF,-1.41px -1.41px 0 #FFFFFF,'
      + '0 0 3px #FFFFFF',
    );
    expect(alone('#F5CE5B', 3)).toContain('2.12px 2.12px 0 #F5CE5B');
    expect(alone('#F5CE5B', 3).endsWith('0 0 4px #F5CE5B')).toBe(true);
  });
});
