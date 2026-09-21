/** @vitest-environment node */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { confronta, formattaEsito, leggiToken, normalizza } from '../token-check';

const RADICE = path.resolve(__dirname, '../..');
const TOKENS = path.join(RADICE, 'design/sistema/tokens.css');
const GLOBALS = path.join(RADICE, 'src/app/globals.css');

describe('leggiToken', () => {
  it('prende i token di :root', () => {
    const t = leggiToken(':root { --ink: #14163A; --fondo: #F1F0EE; }');
    expect(t.get('--ink')).toBe('#14163a');
    expect(t.size).toBe(2);
  });

  it('ignora i token dentro un commento: sono prosa, non dichiarazioni', () => {
    const t = leggiToken(':root { /* prima era --ink: #000000; */ --ink: #14163A; }');
    expect(t.get('--ink')).toBe('#14163a');
    expect(t.size).toBe(1);
  });

  it('ignora gli override fuori da :root: `--coda` in una regola è locale a quella regola', () => {
    const css = ':root { --coda: 140px; }\n.scroll-app.con-piede { --coda: 16px; }';
    expect(leggiToken(css).get('--coda')).toBe('140px');
  });

  it('unisce più blocchi :root', () => {
    const t = leggiToken(':root { --ink: #14163A; }\n@layer base { a { color: red; } }\n:root { --off: #9A9AA6; }');
    expect([...t.keys()]).toEqual(['--ink', '--off']);
  });
});

describe('normalizza', () => {
  it('spazi, zero iniziale e maiuscole sono formattazione, non valore', () => {
    expect(normalizza('  0 1px   2px rgba(20, 22, 58, 0.05)')).toBe(normalizza('0 1px 2px rgba(20,22,58,.05)'));
    expect(normalizza('#A8D96A')).toBe(normalizza('#a8d96a'));
  });

  it('un valore davvero diverso resta diverso', () => {
    expect(normalizza('128px')).not.toBe(normalizza('140px'));
    expect(normalizza('rgba(20, 22, 58, 0.07)')).not.toBe(normalizza('rgba(20, 22, 58, 0.05)'));
  });
});

describe('confronta', () => {
  const design = leggiToken(':root { --ink: #14163A; --spazio-1: 4px; }');

  it('stesso nome e valore diverso → divergenza', () => {
    const esito = confronta(design, leggiToken(':root { --ink: #000000; }'));
    expect(esito.divergenti).toEqual([{ nome: '--ink', design: '#14163a', codice: '#000000' }]);
    expect(esito.comuni).toBe(1);
  });

  it('un token che il codice non ha ancora non è una divergenza', () => {
    const esito = confronta(design, leggiToken(':root { --ink: #14163A; }'));
    expect(esito.divergenti).toEqual([]);
    expect(esito.soloDesign).toEqual(['--spazio-1']);
  });

  it('un token che il design non nomina finisce in soloCodice', () => {
    const esito = confronta(design, leggiToken(':root { --ink: #14163A; --coda: 140px; }'));
    expect(esito.soloCodice).toEqual(['--coda']);
    expect(esito.divergenti).toEqual([]);
  });
});

// Il guardiano vero: gira dentro `npm test`, legge i due file veri e fallisce
// appena un valore diverge. Non serve ricordarsi di lanciare niente.
describe('i due file veri', () => {
  const design = leggiToken(readFileSync(TOKENS, 'utf8'));
  const codice = leggiToken(readFileSync(GLOBALS, 'utf8'));
  const esito = confronta(design, codice);

  it('nessun token vale una cosa nel design e un\'altra nel codice', () => {
    expect(esito.divergenti, formattaEsito(esito)).toEqual([]);
  });

  it('il perimetro verificato non si restringe di nascosto', () => {
    // Se questo numero scende, qualcuno ha tolto o rinominato token invece di allinearli.
    expect(esito.comuni).toBeGreaterThanOrEqual(45);
  });
});
