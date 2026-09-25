import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(__dirname, '../globals.css'), 'utf8');

describe('token del guscio comune (spec 20/09 §A)', () => {
  it.each([
    ['--testo-2', '#5C5F7A'], ['--avviso', '#9A5C00'], ['--errore', '#C4423E'],
    ['--freddo', '#2F6FBF'], ['--icona-spenta', '#C4C4CE'],
    ['--fine-barra-grande', '128px'], ['--fine-barra-piccola', '110px'],
    ['--moto-barra', '200ms'], ['--curva-barra', 'cubic-bezier(.2, .8, .25, 1)'],
    ['--barra-alta', '84px'], ['--barra-bassa', '66px'],
    ['--barra-larga', '304px'], ['--barra-larga-giu', '244px'],
    ['--barra-voce-larga', '96px'], ['--barra-voce-larga-giu', '76px'],
    ['--z-pannello', '70'], ['--pannello-alto', '76px'],
    ['--coda', '140px'],
  ])('%s vale %s', (nome, valore) => {
    expect(css).toMatch(new RegExp(`${nome}:\\s*${valore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;`));
  });

  it('il gradiente di schermata ha le quattro fermate del ridisegno', () => {
    expect(css).toContain('--sfondo-schermata: linear-gradient(180deg, #EDECEA 0%, #F2F1EF 34%, #F8F8F7 70%, #FCFCFB 100%);');
  });

  it('le sei ombre esistono come token', () => {
    for (const o of ['--ombra-tessera', '--ombra-casetta', '--ombra-tasto', '--ombra-pannello', '--ombra-nav', '--ombra-alta']) {
      expect(css).toMatch(new RegExp(`${o}:`));
    }
  });
});

/**
 * I blocchi `@media (…) { … }` di una query, per controllare che un'animazione stia solo
 * dove DESIGN.md §7 la ammette. Stessa conta delle graffe di `blocchiRoot` in
 * scripts/token-check.ts.
 */
function blocchiMedia(testo: string, query: string): string[] {
  const blocchi: string[] = [];
  let da = testo.indexOf(`@media ${query}`);
  while (da >= 0) {
    let i = testo.indexOf('{', da) + 1;
    const inizio = i;
    let profondita = 1;
    while (i < testo.length && profondita > 0) {
      if (testo[i] === '{') profondita++;
      else if (testo[i] === '}') profondita--;
      i++;
    }
    blocchi.push(testo.slice(inizio, i - 1));
    da = testo.indexOf(`@media ${query}`, i);
  }
  return blocchi;
}

const MOTO = blocchiMedia(css, '(prefers-reduced-motion: no-preference)').join('\n');
const FERMO = blocchiMedia(css, '(prefers-reduced-motion: reduce)').join('\n');

/** Il corpo della prima regola con quel selettore a inizio riga (anche indentata). */
function regola(selettore: string): string {
  const esc = selettore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, 'm'));
  return m ? m[1] : '';
}

function conta(testo: string, cosa: string): number {
  return testo.split(cosa).length - 1;
}

describe('CSS della fase 5 (spec 25/09 §G.1, §B.1, §B.2, §J)', () => {
  it('la tab bar è centrata a larghezza propria: --barra-lato non esiste più', () => {
    expect(css).not.toContain('--barra-lato');
    const barra = regola('.barra');
    expect(barra).toContain('width: var(--barra-larga)');
    expect(barra).toContain('margin: 0 auto');
    expect(regola('.guscio[data-barra="ridotta"] .barra')).toContain('width: var(--barra-larga-giu)');
  });

  it('le voci hanno il tetto di 96 e 76: con tre voci sono esattamente quelle', () => {
    expect(regola('.barra-voce')).toContain('max-width: var(--barra-voce-larga)');
    expect(regola('.guscio[data-barra="ridotta"] .barra-voce')).toContain('max-width: var(--barra-voce-larga-giu)');
  });

  it('.anim-barra anima width e height, non più left e right', () => {
    const r = regola('.anim-barra');
    expect(r).toContain('width var(--moto-barra)');
    expect(r).toContain('height var(--moto-barra)');
    expect(r).not.toContain('left');
  });

  it('il pannello sta a --z-pannello, a tutta larghezza da --pannello-alto, senza bordo', () => {
    const p = regola('.pannello');
    expect(p).toContain('z-index: var(--z-pannello)');
    expect(p).toContain('top: var(--pannello-alto)');
    expect(p).toContain('border-radius: 22px 22px 0 0');
    expect(p).not.toContain('border:');
    expect(regola('.pannello-velo')).toContain('background: var(--pannello-velo)');
  });

  it('la salita del pannello e la scala dell\'app stanno solo col movimento permesso', () => {
    expect(MOTO).toContain('translateY(100%)');
    expect(FERMO).not.toContain('translateY(100%)');
    expect(conta(MOTO, 'scale(.96)')).toBe(conta(css, 'scale(.96)'));
    expect(MOTO).toContain('.guscio[data-pannello="aperto"] .guscio-main');
    expect(MOTO).toContain('@keyframes sotto-entra');
  });

  it('con reduce il pannello ha solo opacità in 120 ms', () => {
    expect(FERMO).toContain('.pannello { opacity: 0;');
    expect(FERMO).toContain('opacity 120ms linear');
  });

  it('l\'avvio: @keyframes pb e il pop solo col movimento permesso, e con reduce il livello non c\'è', () => {
    expect(conta(MOTO, '@keyframes pb')).toBe(1);
    expect(conta(css, '@keyframes pb')).toBe(1);
    expect(MOTO).toContain('.anim-avvio-casella { animation: pb 620ms linear both; }');
    expect(FERMO).toContain('[data-avvio] { display: none; }');
  });

  it('aperto da un indirizzo il pannello non si anima', () => {
    expect(css).toContain('.pannello[data-istantaneo]');
    expect(css).toContain('.guscio[data-istantaneo] .guscio-main');
  });
});
