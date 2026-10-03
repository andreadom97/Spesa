/**
 * Copia congelata dell'8b (piano 8c, Task 6): `abbina` di mapping.ts e le letture di
 * ingredienti.ts com'erano prima dell'abbinamento a due livelli. Serve solo al test
 * differenziale: non si modifica.
 */
import type { Ingredient, UnitaBase } from '@/domain/types';
import type { IngredienteProposto } from '../types';
import { normalizza } from '../mapping';

export function abbina8b(alimento: string, unita: UnitaBase | null, ingredienti: Ingredient[]): Ingredient | null {
  const norm = normalizza(alimento);
  const compatibili = ingredienti.filter((i) => unita === null || i.unitaBase === unita);
  const esatto = compatibili.find((i) => normalizza(i.nome) === norm);
  if (esatto) return esatto;
  const inclusi = compatibili
    .filter((i) => {
      const n = normalizza(i.nome);
      return n.includes(norm) || norm.includes(n);
    })
    .sort((a, b) => a.nome.length - b.nome.length);
  return inclusi[0] ?? null;
}

export function legataA8b(proposta: IngredienteProposto, esistenti: Ingredient[]): Ingredient | null {
  if (!normalizza(proposta.nome)) return null;
  return abbina8b(proposta.nome, proposta.unitaBase, esistenti);
}

export function nomiDoppi8b(proposte: IngredienteProposto[], esistenti: Ingredient[]): Set<string> {
  const doppi = new Set<string>();
  const libere = proposte.filter((p) => !legataA8b(p, esistenti));
  const perNome = new Map<string, string[]>();
  for (const p of libere) {
    const nome = normalizza(p.nome);
    if (!nome) continue;
    perNome.set(nome, [...(perNome.get(nome) ?? []), p.alimento]);
  }
  for (const alimenti of perNome.values()) {
    if (alimenti.length > 1) for (const a of alimenti) doppi.add(a);
  }
  for (const p of libere) {
    const nome = normalizza(p.nome);
    if (nome && esistenti.some((e) => normalizza(e.nome) === nome && e.unitaBase !== p.unitaBase)) doppi.add(p.alimento);
  }
  return doppi;
}

export type MotivoBlocco8b = 'nomeVuoto' | 'doppio' | 'confezione';

export function motiviBlocco8b(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
): Map<string, MotivoBlocco8b[]> {
  const doppi = nomiDoppi8b(proposte, esistenti);
  const motivi = new Map<string, MotivoBlocco8b[]>();
  for (const p of proposte) {
    const suoi: MotivoBlocco8b[] = [];
    if (!p.nome.trim()) suoi.push('nomeVuoto');
    if (doppi.has(p.alimento)) suoi.push('doppio');
    if (scelti[p.alimento] === undefined && (!Number.isFinite(p.formatoConfezione) || p.formatoConfezione <= 0)) suoi.push('confezione');
    if (suoi.length > 0) motivi.set(p.alimento, suoi);
  }
  return motivi;
}

export function passoBloccato8b(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
): boolean {
  return motiviBlocco8b(proposte, esistenti, scelti).size > 0;
}
