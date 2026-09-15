/** @vitest-environment node */
import { describe, it, expect } from 'vitest';

import { formattaReport, stimaCostoEur, PREZZI_EUR_PER_MILIONE, type CasoEval } from '../eval-import-report';
import type { UsoEstrazione } from '../../src/server/import-ai';

// Casi FINTI: numeri inventati, nessun dato di dieta. Il tipo non ha campi
// liberi, e il test in coda verifica che l'output ne rispetti la promessa.

function uso(parte: Partial<UsoEstrazione> = {}): UsoEstrazione {
  return { chiamate: 1, inputTokens: 0, outputTokens: 0, cacheLetti: 0, cacheScritti: 0, durataMs: 0, ...parte };
}

function caso(parte: Partial<CasoEval> = {}): CasoEval {
  return {
    dieta: 'dieta6', set: 'originali', modello: 'claude-sonnet-5', pipeline: 'pagine', durataS: 61.26,
    archetipo: 'menu_settimanale', settimane: 2, settimaneVere: 2, abbinati: 31, abbinabili: 33, estranei: 3,
    esatte: 88, righe: 94, inferite: 2, fabbricate: 0,
    uso: uso({ chiamate: 8, inputTokens: 12_000, outputTokens: 23_000, cacheLetti: 70_000, cacheScritti: 10_000 }),
    ...parte,
  };
}

const GENERATO = new Date(2026, 8, 5, 14, 7);

/** Le righe di dati delle tabelle: iniziano con `|`, non sono intestazione né separatore. */
function righeDati(report: string): string[][] {
  return report
    .split('\n')
    .filter((r) => r.startsWith('|') && !r.startsWith('| modello | pipeline') && !r.startsWith('|---'))
    .map((r) => r.slice(1, -1).split('|').map((c) => c.trim()));
}

describe('stimaCostoEur', () => {
  it('1M token in su sonnet costa 2,00', () => {
    expect(stimaCostoEur('claude-sonnet-5', uso({ inputTokens: 1_000_000 }))).toBe(2);
  });
  it('somma input, output e cache col prezzo di ciascuno', () => {
    // 1M in (5) + 1M out (25) + 1M cache letta (0,5) + 1M cache scritta (6,25) su opus
    const u = uso({ inputTokens: 1_000_000, outputTokens: 1_000_000, cacheLetti: 1_000_000, cacheScritti: 1_000_000 });
    expect(stimaCostoEur('claude-opus-5', u)).toBeCloseTo(36.75, 6);
  });
  it('modello ignoto → null, mai zero', () => {
    expect(stimaCostoEur('modello-inventato', uso({ inputTokens: 1_000_000 }))).toBeNull();
  });
  it('il listino ha i tre modelli previsti', () => {
    expect(Object.keys(PREZZI_EUR_PER_MILIONE).sort()).toEqual(['claude-haiku-4-5', 'claude-opus-5', 'claude-sonnet-5']);
  });
});

describe('formattaReport', () => {
  it('titolo con la data e la regola di decisione in coda', () => {
    const r = formattaReport([caso()], GENERATO);
    expect(r.split('\n')[0]).toBe('# Eval estrattore — 05/09/2026 14:07');
    expect(r).toMatch(/Regola di decisione:.*§4/);
  });

  it('una riga per caso, con percentuale intera e costo a due decimali', () => {
    const r = formattaReport([caso()], GENERATO);
    const [riga] = righeDati(r);
    expect(righeDati(r)).toHaveLength(1);
    // 12k×2 + 23k×10 + 70k×0,2 + 10k×2,5 = 0,024 + 0,23 + 0,014 + 0,025 = 0,293 → 0,29
    expect(riga).toEqual([
      'claude-sonnet-5', 'pagine', '61.3', '2/2', '31/33 (94%)', '3', '88/94', '2', '0',
      '12000', '23000', '70000', '8', '0.29',
    ]);
  });

  it('modello fuori listino → costo "n.d."', () => {
    const r = formattaReport([caso({ modello: 'modello-inventato' })], GENERATO);
    expect(righeDati(r)[0].at(-1)).toBe('n.d.');
  });

  it('abbinabili a zero non divide per zero', () => {
    const r = formattaReport([caso({ abbinati: 0, abbinabili: 0 })], GENERATO);
    expect(righeDati(r)[0][4]).toBe('0/0 (0%)');
  });

  it('una sezione per dieta × set, righe ordinate per modello poi pipeline', () => {
    const casi = [
      caso({ dieta: 'dieta6', set: 'compresse', modello: 'claude-sonnet-5', pipeline: 'singola' }),
      caso({ dieta: 'dieta2', set: 'pdf', modello: 'claude-sonnet-5' }),
      caso({ dieta: 'dieta6', set: 'originali', modello: 'claude-sonnet-5', pipeline: 'singola' }),
      caso({ dieta: 'dieta6', set: 'originali', modello: 'claude-opus-5', pipeline: 'pagine' }),
      caso({ dieta: 'dieta6', set: 'originali', modello: 'claude-sonnet-5', pipeline: 'pagine' }),
      caso({ dieta: 'dieta6', set: 'compresse', modello: 'claude-opus-5', pipeline: 'pagine' }),
    ];
    const r = formattaReport(casi, GENERATO);
    const sezioni = r.split('\n').filter((l) => l.startsWith('## '));
    expect(sezioni).toEqual(['## dieta6 — originali', '## dieta6 — compresse', '## dieta2 — pdf']);
    expect(righeDati(r).map(([modello, pipeline]) => `${modello}/${pipeline}`)).toEqual([
      'claude-opus-5/pagine', 'claude-sonnet-5/pagine', 'claude-sonnet-5/singola', // originali
      'claude-opus-5/pagine', 'claude-sonnet-5/singola', // compresse
      'claude-sonnet-5/pagine', // pdf
    ]);
  });

  it('senza casi: solo titolo e regola, nessuna tabella', () => {
    const r = formattaReport([], GENERATO);
    expect(r).not.toContain('|');
    expect(r).toContain('Regola di decisione');
  });

  it('nelle celle finiscono solo modello, pipeline, numeri e "n.d.": mai testo libero', () => {
    const casi = [
      caso({ archetipo: 'giorni_tipo' }),
      caso({ modello: 'claude-opus-5', pipeline: 'singola', set: 'compresse' }),
      caso({ modello: 'modello-inventato', dieta: 'dieta2' }),
    ];
    const r = formattaReport(casi, GENERATO);
    const modelli = new Set(casi.map((c) => c.modello));
    for (const celle of righeDati(r)) {
      expect(celle).toHaveLength(14);
      expect(modelli.has(celle[0])).toBe(true);
      expect(['singola', 'pagine']).toContain(celle[1]);
      for (const cella of celle.slice(2)) expect(cella).toMatch(/^([\d./% ()]+|n\.d\.)$/);
    }
    // Fuori dalle tabelle: solo titolo, sezioni, intestazioni e regola.
    for (const linea of r.split('\n').filter((l) => l !== '' && !l.startsWith('|'))) {
      expect(linea).toMatch(/^(# Eval estrattore — |## (dieta6|dieta2) — (originali|compresse|pdf)$|Regola di decisione:)/);
    }
    expect(r).not.toContain('giorni_tipo'); // l'archetipo, pur enum, non fa parte della tabella
  });
});
