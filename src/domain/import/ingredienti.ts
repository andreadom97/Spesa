import type { Ingredient } from '@/domain/types';
import type { IngredienteProposto, PianoEstratto, StatoRevisione } from './types';
import { abbina, ingredientiDaAbbinare, normalizza } from './mapping';
import { origineProposta, proponi } from './formati-tipici';

/**
 * L'insieme necessario si ricalcola SEMPRE (non solo quando `ingredientiNuovi`
 * è vuoto): un ritorno da un `BozzaIncompletaError` al passo riepilogo può
 * portare in Controlla una correzione che introduce un alimento mai visto
 * prima, e quell'alimento deve poter comparire qui — altrimenti l'import
 * resterebbe bloccato in un loop permanente fra riepilogo e Controlla. Per
 * ogni alimento ancora necessario si conserva la proposta già in
 * `ingredientiNuovi` (comprese le correzioni fatte dall'utente in questo
 * passo); quelli non più necessari spariscono; quelli nuovi ricevono una
 * proposta fresca da `proponi`. La chiave di conservazione è `alimento` (il
 * nome estratto normalizzato), mai `nome` (che l'utente può aver rinominato
 * con «È lo stesso di…»). Spostata qui da Formati.tsx (fase 8b).
 */
export function calcolaProposte(
  piano: PianoEstratto,
  stato: StatoRevisione,
  esistenti: Ingredient[],
): IngredienteProposto[] {
  const giaProposti = new Map(stato.ingredientiNuovi.map((i) => [i.alimento, i]));
  return ingredientiDaAbbinare(piano, stato.correzioni)
    .filter(({ alimento, unita }) => !abbina(alimento, unita, esistenti))
    .map(({ alimento, unita }) => giaProposti.get(alimento) ?? proponi(alimento, unita));
}

/**
 * L'esistente a cui la proposta è legata: stesso nome normalizzato, stessa unità. È l'effetto
 * di «È lo stesso di…», che mette nella proposta il nome dell'esistente: `traduciBozza` la
 * aggancia per nome e non la crea.
 */
export function legataA(proposta: IngredienteProposto, esistenti: Ingredient[]): Ingredient | null {
  const nome = normalizza(proposta.nome);
  return esistenti.find((e) => e.unitaBase === proposta.unitaBase && normalizza(e.nome) === nome) ?? null;
}

/**
 * Gli `alimento` delle proposte col nome doppio (decisione 3): lo stesso nome normalizzato di
 * un'altra proposta, o di un esistente con un'unità diversa. Le legate non contano: due
 * proposte legate allo stesso esistente sono la stessa scelta fatta due volte, non un doppio.
 */
export function nomiDoppi(proposte: IngredienteProposto[], esistenti: Ingredient[]): Set<string> {
  const doppi = new Set<string>();
  const libere = proposte.filter((p) => !legataA(p, esistenti));
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

/** VAI AL RIEPILOGO spento: un nome doppio, un nome vuoto, una confezione che non è un numero positivo. */
export function passoBloccato(proposte: IngredienteProposto[], esistenti: Ingredient[]): boolean {
  if (nomiDoppi(proposte, esistenti).size > 0) return true;
  return proposte.some((p) => !p.nome.trim() || !Number.isFinite(p.formatoConfezione) || p.formatoConfezione <= 0);
}

/** La proposta viene dal ripiego di `proponi`, non dalla tabella dei formati. */
export function diRipiego(proposta: IngredienteProposto): boolean {
  return origineProposta(proposta.alimento, proposta.unitaBase) === 'ripiego';
}

/** Il valore di ripiego della confezione, per la nota: «1 pz», «500 g». */
export function valoreRipiego(proposta: IngredienteProposto): string {
  const ripiego = proponi(proposta.alimento, proposta.unitaBase);
  return `${ripiego.formatoConfezione} ${ripiego.unitaBase}`;
}

export interface SezioniIngredienti {
  daSistemare: string[];
  daControllare: string[];
}

/**
 * Le sezioni all'ingresso nel passo (spec 8b §F): si decidono una volta sola, così una scheda
 * non salta via sotto il dito mentre la si corregge. I nomi doppi stanno in «Da sistemare»
 * (anche se sono ripieghi), i ripieghi liberi in «Da controllare».
 */
export function sezioniIniziali(proposte: IngredienteProposto[], esistenti: Ingredient[]): SezioniIngredienti {
  const doppi = nomiDoppi(proposte, esistenti);
  return {
    daSistemare: proposte.filter((p) => doppi.has(p.alimento)).map((p) => p.alimento),
    daControllare: proposte
      .filter((p) => !doppi.has(p.alimento) && !legataA(p, esistenti) && diRipiego(p))
      .map((p) => p.alimento),
  };
}
