import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IconaIngrediente, RIGHE_OMBRA, alone } from '../IconaIngrediente';
import { TRACCIATI } from '../tracciati-ingredienti';
import { CHIAVI_ICONE } from '@/domain/icone-ingredienti';

const PILOTA = ['bistecca', 'cosciotto', 'pesce', 'carota', 'pomodoro', 'uovo', 'latte', 'formaggio', 'pasta', 'pane', 'legumi', 'piselli'] as const;

function svg(c: HTMLElement) {
  return c.querySelector('svg[data-icona]') as SVGSVGElement;
}
const parte = (s: Element, p: string) => s.querySelector(`[data-parte="${p}"]`) as SVGElement;

describe('IconaIngrediente', () => {
  it('area: pieno nel colore d\'area a 0,72, tratti nel tono medio, 60 px tagliata di 11', () => {
    const { container } = render(<IconaIngrediente chiave="carota" area="ortofrutta" tono="area" taglia={60} />);
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
    const { container } = render(<IconaIngrediente chiave="pane" area="cereali" tono="hero" taglia={96} />);
    const s = svg(container);
    expect(s).toHaveAttribute('width', '96');
    expect(s.style.right).toBe('-18px');
    expect(s).toHaveAttribute('stroke', '#BB9609');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(255,255,255,0.7)');
  });

  it('tinta (Dispensa in casa): pieno bianco a 0,7, tratti nel tono medio', () => {
    const { container } = render(<IconaIngrediente chiave="pesce" area="macelleria" tono="tinta" taglia={60} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#D88384');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(255,255,255,0.7)');
  });

  it('spento: pieno quasi trasparente, tratti --off a 0,55', () => {
    const { container } = render(<IconaIngrediente chiave="latte" area="latticini" tono="spento" taglia={60} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#9A9AA6');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(20,22,58,0.06)');
    expect(parte(s, 'tratti')).toHaveAttribute('opacity', '0.55');
  });

  it('dettagli: i gruppi uniti in un path solo', () => {
    const { container } = render(<IconaIngrediente chiave="formaggio" area="latticini" tono="area" taglia={60} />);
    expect(parte(svg(container), 'dettagli').getAttribute('d')).toContain('M3.2 13.4H21M16.4 5.4');
  });

  it('due icone nella stessa pagina hanno maschere diverse, e ognuna usa la sua', () => {
    const { container } = render(
      <div>
        <IconaIngrediente chiave="carota" area="ortofrutta" tono="area" taglia={60} />
        <IconaIngrediente chiave="pane" area="cereali" tono="area" taglia={60} />
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
    const { container } = render(<IconaIngrediente chiave="carota" area="ortofrutta" tono="area" taglia={60} />);
    expect(parte(svg(container), 'ombra')).toHaveAttribute('d', RIGHE_OMBRA);
    expect(RIGHE_OMBRA.startsWith('M-2 -1L-28 25')).toBe(true);
    expect(RIGHE_OMBRA.split('M')).toHaveLength(45); // 44 righe
  });

  it('chiave senza sagoma: nulla', () => {
    const { container } = render(<IconaIngrediente chiave={'inesistente' as never} area="dispensa" tono="area" taglia={60} />);
    expect(svg(container)).toBeNull();
  });

  it('ogni chiave del catalogo ha la sagoma', () => {
    expect(CHIAVI_ICONE.filter((k) => !TRACCIATI[k]?.sil)).toEqual([]);
  });

  it('pasta: pieno, contorno e dettagli ruotati di -28°, ombra no', () => {
    const { container } = render(<IconaIngrediente chiave="pasta" area="cereali" tono="area" taglia={60} />);
    const s = svg(container);
    for (const p of ['pieno', 'contorno', 'dettagli']) {
      expect(s.querySelector(`[data-parte="${p}"]`)).toHaveAttribute('transform', 'rotate(-28 12 12)');
    }
    expect(s.querySelector('[data-parte="ombra"]')).not.toHaveAttribute('transform');
    expect(s.querySelectorAll('mask path')[1]).toHaveAttribute('transform', 'translate(-2 -2.2) rotate(-28 12 12)');
  });

  it('ogni tracciato ha sagoma e dettagli', () => {
    const vuoti = CHIAVI_ICONE.filter((k) => !TRACCIATI[k]?.d || !TRACCIATI[k]?.dd);
    expect(vuoti).toEqual([]);
  });

  it('chiave senza tracciato: nulla', () => {
    const { container } = render(
      <IconaIngrediente chiave={'inesistente' as never} area="dispensa" tono="area" taglia={60} />,
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

describe('tracciati · forma a due toni (spec 03/10)', () => {
  /** Ogni sottopercorso (da una M alla successiva) finisce in Z. */
  const chiusa = (sil: string) =>
    sil.split(/(?=[Mm])/).map((s) => s.trim()).filter(Boolean).every((s) => /[Zz]$/.test(s));

  it('ogni sagoma presente ha i sottopercorsi chiusi', () => {
    expect(CHIAVI_ICONE.filter((k) => {
      const sil = TRACCIATI[k]?.sil;
      return sil !== undefined && !chiusa(sil);
    })).toEqual([]);
  });

  it('dettagli: da uno a cinque gruppi, nessuno vuoto', () => {
    expect(CHIAVI_ICONE.filter((k) => {
      const g = TRACCIATI[k]!.dd;
      return g.length < 1 || g.length > 5 || g.some((x) => x.trim() === '');
    })).toEqual([]);
  });

  it('il controllo delle sagome scarta un sottopercorso aperto', () => {
    expect(chiusa('M0 0h2v2Z')).toBe(true);
    expect(chiusa('M0 0h2v2ZM4 4h1')).toBe(false);
  });

  it('le sei del pilota del 03/10 hanno la sagoma e i gruppi', () => {
    const sei = ['pomodoro', 'carota', 'pesce', 'formaggio', 'pane', 'latte'] as const;
    expect(sei.filter((k) => !TRACCIATI[k]?.sil)).toEqual([]);
    expect(sei.map((k) => TRACCIATI[k]!.dd.length)).toEqual([4, 5, 5, 4, 4, 5]);
  });
});
