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
    ['--barra-alta', '84px'], ['--barra-bassa', '66px'], ['--barra-lato', '16px'],
    ['--barra-lato-giu', '46px'], ['--coda', '140px'], ['--raggio-casella-barra', '2.52px'],
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
