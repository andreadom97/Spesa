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
 *
 * Una proposta conservata con un'unità diversa da quella (non nulla) delle righe non si
 * conserva: si ripropone da capo. Viene dalle bozze di Formati, che lasciava cambiare l'unità;
 * tenuta così manderebbe il riepilogo in `BozzaIncompletaError` (decisione 7), e nel passo
 * Ingredienti l'unità non si cambia più.
 */
export function calcolaProposte(
  piano: PianoEstratto,
  stato: StatoRevisione,
  esistenti: Ingredient[],
): IngredienteProposto[] {
  const giaProposti = new Map(stato.ingredientiNuovi.map((i) => [i.alimento, i]));
  return ingredientiDaAbbinare(piano, stato.correzioni)
    .filter(({ alimento, unita }) => !abbina(alimento, unita, esistenti))
    .map(({ alimento, grezzo, unita }) => {
      const conservata = giaProposti.get(alimento);
      // `proponi` normalizza da sé la chiave; dal grezzo il nome tiene accenti e maiuscole («Caffè»).
      return conservata && (unita === null || conservata.unitaBase === unita) ? conservata : proponi(grezzo, unita);
    });
}

/**
 * L'esistente a cui la proposta è legata: lo stesso criterio di `traduciBozza` (`risolviRiga` e
 * il filtro di `ingredientiDaCreare` in `commit.ts`), che aggancia con
 * `abbina(nome, unitaBase, esistenti)` — nome esatto o per inclusione, stessa unità. Una
 * proposta «Pasta di semola» g è quindi legata a un esistente «Semola» g anche se i nomi non
 * sono uguali: `traduciBozza` l'aggancerebbe lì in silenzio, e la schermata deve dirlo invece di
 * mostrarla come nuova.
 *
 * Un nome vuoto non è legato a niente: per inclusione starebbe dentro ogni nome, e il nome si
 * svuota mentre lo si riscrive.
 */
export function legataA(proposta: IngredienteProposto, esistenti: Ingredient[]): Ingredient | null {
  if (!normalizza(proposta.nome)) return null;
  return abbina(proposta.nome, proposta.unitaBase, esistenti);
}

/**
 * Le proposte legate per scelta, `alimento → id dell'esistente`: lo stato iniziale di
 * `sceltiEsistenti` in Ingredienti. È legata per scelta la proposta il cui nome normalizzato è
 * esattamente quello di un esistente della stessa unità: così la lascia «È lo stesso di…», e
 * così si riconosce in una bozza ripresa. Una legata per sola inclusione non c'è.
 */
export function sceltiIniziali(proposte: IngredienteProposto[], esistenti: Ingredient[]): Record<string, string> {
  const scelti: Record<string, string> = {};
  for (const p of proposte) {
    const nome = normalizza(p.nome);
    const esistente = nome ? esistenti.find((e) => e.unitaBase === p.unitaBase && normalizza(e.nome) === nome) : undefined;
    if (esistente) scelti[p.alimento] = esistente.id;
  }
  return scelti;
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

/** Perché una proposta blocca il passo: ognuno ha il suo avviso in linea nella Scheda. */
export type MotivoBlocco = 'nomeVuoto' | 'doppio' | 'confezione';

/**
 * Le proposte che bloccano VAI AL RIEPILOGO, `alimento → motivi`; chi non blocca non c'è.
 * Un nome vuoto, un nome doppio, una confezione che non è un numero positivo. La confezione di
 * una proposta legata per scelta (`scelti`, gli `alimento` scelti in «È lo stesso di…») non
 * conta: `traduciBozza` usa l'esistente e la proposta non si crea.
 */
export function motiviBlocco(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
): Map<string, MotivoBlocco[]> {
  const doppi = nomiDoppi(proposte, esistenti);
  const motivi = new Map<string, MotivoBlocco[]>();
  for (const p of proposte) {
    const suoi: MotivoBlocco[] = [];
    if (!p.nome.trim()) suoi.push('nomeVuoto');
    if (doppi.has(p.alimento)) suoi.push('doppio');
    if (scelti[p.alimento] === undefined && (!Number.isFinite(p.formatoConfezione) || p.formatoConfezione <= 0)) suoi.push('confezione');
    if (suoi.length > 0) motivi.set(p.alimento, suoi);
  }
  return motivi;
}

/** VAI AL RIEPILOGO spento: almeno una proposta ha un motivo di blocco (`motiviBlocco`). */
export function passoBloccato(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
): boolean {
  return motiviBlocco(proposte, esistenti, scelti).size > 0;
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
 * non salta via sotto il dito mentre la si corregge. Le proposte che bloccano (`motiviBlocco`:
 * nome doppio, nome vuoto, confezione non valida) stanno in «Da sistemare», anche se sono
 * ripieghi; i ripieghi liberi in «Da controllare».
 */
export function sezioniIniziali(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
): SezioniIngredienti {
  const bloccate = motiviBlocco(proposte, esistenti, scelti);
  return {
    daSistemare: proposte.filter((p) => bloccate.has(p.alimento)).map((p) => p.alimento),
    daControllare: proposte
      .filter((p) => !bloccate.has(p.alimento) && !legataA(p, esistenti) && diRipiego(p))
      .map((p) => p.alimento),
  };
}
