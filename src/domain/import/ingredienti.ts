import type { Dish, Ingredient, UnitaBase } from '@/domain/types';
import type { IngredienteProposto, PianoEstratto, StatoRevisione } from './types';
import { SCELTA_NUOVO, pastoEffettivo, unitaBaseDi } from './types';
import { abbina, ingredientiDaAbbinare, normalizza } from './mapping';
import { origineProposta, pesoPezzo, proponi } from './formati-tipici';

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
 * Ingredienti l'unità non si cambia più. Un alimento che `abbina` aggancia a un ingrediente che
 * hai, anche con un'altra unità (il secondo livello, spec 8c §A.2), non è una proposta: è un
 * cambio di unità (`cambiUnita`).
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
 * L'esistente a cui la proposta è legata. Prima la scelta in «È lo stesso di…» (spec 8c §G):
 * `SCELTA_NUOVO` non la lega a niente, un id la lega a quell'ingrediente. Senza scelta, lo
 * stesso criterio di `traduciBozza`: `abbina(nome, unitaBase, esistenti)`, nome esatto o per
 * inclusione con la stessa unità, o lo stesso nome esatto fra g e pz (cambio di unità). Una
 * proposta «Pasta di semola» g è quindi legata a un esistente «Semola» g anche se i nomi non sono
 * uguali: la schermata deve dirlo invece di mostrarla come nuova.
 *
 * Un nome vuoto non è legato a niente: per inclusione starebbe dentro ogni nome, e il nome si
 * svuota mentre lo si riscrive.
 */
export function legataA(
  proposta: IngredienteProposto,
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
): Ingredient | null {
  const scelta = scelti[proposta.alimento];
  if (scelta === SCELTA_NUOVO) return null;
  if (scelta !== undefined) {
    const scelto = esistenti.find((e) => e.id === scelta);
    if (scelto) return scelto;
  }
  if (!normalizza(proposta.nome)) return null;
  return abbina(proposta.nome, proposta.unitaBase, esistenti);
}

/**
 * La legata per `traduciBozza`. Come `legataA`, tranne per la scelta «nuovo»: lì l'unico
 * aggancio è il nome esatto con la stessa unità, cioè l'ingrediente creato dal primo giro di un
 * import interrotto (al primo giro non c'è: un «nuovo» col nome di un ingrediente che hai è un
 * `doppio` e blocca il passo).
 */
export function legataAlCommit(
  proposta: IngredienteProposto,
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
): Ingredient | null {
  if (scelti[proposta.alimento] !== SCELTA_NUOVO) return legataA(proposta, esistenti, scelti);
  const nome = normalizza(proposta.nome);
  return esistenti.find((e) => e.unitaBase === proposta.unitaBase && normalizza(e.nome) === nome) ?? null;
}

/**
 * Le proposte legate per scelta, `alimento → id dell'esistente`, ricostruite dai nomi: lo stato
 * iniziale di `scelti` per le bozze salvate prima dell'8c, che non lo portano. È legata per
 * scelta la proposta il cui nome normalizzato è esattamente quello di un esistente della stessa
 * unità.
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
 * Gli `alimento` delle proposte col nome doppio (decisione 3 dell'8b): lo stesso nome normalizzato
 * di un'altra proposta libera, o di un esistente con un'unità diversa. Una proposta scelta
 * «nuova» (spec 8c §G) è doppia anche col nome di un esistente della stessa unità: al riepilogo
 * finirebbe su quello. Le legate non contano: due proposte legate allo stesso esistente sono la
 * stessa scelta fatta due volte.
 */
export function nomiDoppi(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
): Set<string> {
  const doppi = new Set<string>();
  const libere = proposte.filter((p) => !legataA(p, esistenti, scelti));
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
    if (!nome) continue;
    const nuova = scelti[p.alimento] === SCELTA_NUOVO;
    if (esistenti.some((e) => normalizza(e.nome) === nome && (nuova || e.unitaBase !== p.unitaBase))) doppi.add(p.alimento);
  }
  return doppi;
}

/** Perché una proposta blocca il passo: ognuno ha il suo avviso in linea nella Scheda. */
export type MotivoBlocco = 'nomeVuoto' | 'doppio' | 'confezione' | 'peso';

/** Un ingrediente che hai, che il nuovo piano porta in un'altra unità (spec 8c §A.3). */
export interface CambioUnita {
  ingredientId: string;
  /** Il nome dell'ingrediente che hai. */
  nome: string;
  /** L'unità di oggi. */
  da: 'g' | 'pz';
  /** L'unità della dieta, che prevale. */
  a: 'g' | 'pz';
  /** Gli alimenti della dieta (normalizzati) che finiscono su questo ingrediente, nell'ordine del piano. */
  alimenti: string[];
  /** Grammi di un pezzo: scritti da te o dalla tabella; null = da chiedere (motivo `peso`). */
  pesoPezzo: number | null;
  /** Il peso viene dalla tabella dei pesi medi, non da te. */
  pesoDaTabella: boolean;
  /** «Tienile a pezzi»: l'ingrediente resta in `da`, e si convertono le righe della dieta. */
  tieni: boolean;
}

function gOpz(u: UnitaBase | null): u is 'g' | 'pz' {
  return u === 'g' || u === 'pz';
}

/**
 * I cambi di unità del piano (spec 8c §A.2, §A.3): per ogni alimento in g o pz, l'ingrediente che
 * hai a cui finisce con un'altra unità — per `abbina` (il secondo livello) o, per una proposta, per
 * `legataA` (la scelta in «È lo stesso di…»). Un cambio per ingrediente, con l'unità del primo
 * alimento nell'ordine del piano. La decisione salvata in `stato.cambiUnita` vince; il peso
 * altrimenti viene dalla tabella (prima col nome dell'ingrediente, poi con l'alimento).
 *
 * Un peso scritto che non è un numero finito e positivo non vale: il cambio resta senza peso
 * (motivo `peso`) invece di ricadere in silenzio sulla tabella, e `convertiPezzi` non vede mai
 * uno zero.
 */
export function cambiUnita(piano: PianoEstratto, stato: StatoRevisione, esistenti: Ingredient[]): CambioUnita[] {
  const proposte = new Map(stato.ingredientiNuovi.map((p) => [p.alimento, p]));
  const scelti = stato.scelti ?? {};
  const perId = new Map<string, CambioUnita>();
  for (const { alimento, unita } of ingredientiDaAbbinare(piano, stato.correzioni)) {
    if (!gOpz(unita)) continue;
    let esistente = abbina(alimento, unita, esistenti);
    if (!esistente) {
      const proposta = proposte.get(alimento);
      esistente = proposta ? legataA(proposta, esistenti, scelti) : null;
    }
    if (!esistente || esistente.unitaBase === unita || !gOpz(esistente.unitaBase)) continue;
    const gia = perId.get(esistente.id);
    if (gia) {
      gia.alimenti.push(alimento);
      continue;
    }
    const decisione = stato.cambiUnita?.[esistente.id];
    const tabella = pesoPezzo(esistente.nome, alimento);
    const scritto = decisione?.pesoPezzo ?? null;
    const scrittoValido = scritto === null || (Number.isFinite(scritto) && scritto > 0);
    perId.set(esistente.id, {
      ingredientId: esistente.id,
      nome: esistente.nome,
      da: esistente.unitaBase,
      a: unita,
      alimenti: [alimento],
      pesoPezzo: scrittoValido ? (scritto ?? tabella) : null,
      pesoDaTabella: scritto === null && tabella !== null,
      tieni: decisione?.tieni ?? false,
    });
  }
  return [...perId.values()];
}

/** I cambi che non vengono da una proposta: gli abbinamenti automatici del secondo livello, con la loro Scheda. */
export function cambiDiretti(cambi: CambioUnita[], proposte: IngredienteProposto[]): CambioUnita[] {
  const alimentiProposti = new Set(proposte.map((p) => p.alimento));
  return cambi.filter((c) => !c.alimenti.some((a) => alimentiProposti.has(a)));
}

/**
 * Le proposte che bloccano VAI AL RIEPILOGO, `alimento → motivi`; chi non blocca non c'è. Un nome
 * vuoto, un nome doppio, una confezione che non è un numero positivo, un cambio di unità senza il
 * peso di un pezzo (spec 8c §A.3). La confezione di una proposta legata per scelta a un
 * esistente non conta: `traduciBozza` usa l'esistente e la proposta non si crea.
 */
export function motiviBlocco(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
  cambi: CambioUnita[] = [],
): Map<string, MotivoBlocco[]> {
  const doppi = nomiDoppi(proposte, esistenti, scelti);
  const senzaPeso = new Set(cambi.filter((c) => c.pesoPezzo === null).flatMap((c) => c.alimenti));
  const motivi = new Map<string, MotivoBlocco[]>();
  for (const p of proposte) {
    const suoi: MotivoBlocco[] = [];
    const legataPerScelta = scelti[p.alimento] !== undefined && scelti[p.alimento] !== SCELTA_NUOVO;
    if (!p.nome.trim()) suoi.push('nomeVuoto');
    if (doppi.has(p.alimento)) suoi.push('doppio');
    if (!legataPerScelta && (!Number.isFinite(p.formatoConfezione) || p.formatoConfezione <= 0)) suoi.push('confezione');
    if (senzaPeso.has(p.alimento)) suoi.push('peso');
    if (suoi.length > 0) motivi.set(p.alimento, suoi);
  }
  return motivi;
}

/** VAI AL RIEPILOGO spento: una proposta blocca, o un cambio di unità aspetta il peso di un pezzo. */
export function passoBloccato(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
  cambi: CambioUnita[] = [],
): boolean {
  return motiviBlocco(proposte, esistenti, scelti, cambi).size > 0 || cambi.some((c) => c.pesoPezzo === null);
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
 * non salta via sotto il dito mentre la si corregge. Le proposte che bloccano stanno in «Da
 * sistemare», anche se sono ripieghi; i ripieghi liberi in «Da controllare».
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
      .filter((p) => !bloccate.has(p.alimento) && !legataA(p, esistenti, scelti) && diRipiego(p))
      .map((p) => p.alimento),
  };
}

/** Il nome proposto per un alimento, con accenti e maiuscole della dieta («Caffè»): per «No, è nuovo» (spec 8c §G). */
export function nomeProposto(piano: PianoEstratto, stato: StatoRevisione, alimento: string, unita: UnitaBase): string {
  const voce = ingredientiDaAbbinare(piano, stato.correzioni).find((v) => v.alimento === alimento);
  return proponi(voce?.grezzo ?? alimento, unita).nome;
}

/** La prima riga della dieta, per questi alimenti, con una quantità in un'unità di base: l'esempio di «Tienile a pezzi». */
export function esempioRiga(piano: PianoEstratto, stato: StatoRevisione, alimenti: string[]): { quantita: number; unita: UnitaBase } | null {
  const cercati = new Set(alimenti);
  for (const s of piano.settimane) {
    for (const g of s.giorni) {
      for (let i = 0; i < g.pasti.length; i++) {
        const pasto = pastoEffettivo(piano, stato.correzioni, s.numero, g.giorno, i);
        for (const p of pasto.piatti) {
          for (const r of [...p.righeFisse, ...p.componenti.flatMap((c) => c.opzioni.flat())]) {
            const unita = unitaBaseDi(r.unita);
            if (cercati.has(normalizza(r.alimento)) && r.quantita !== null && unita !== null) return { quantita: r.quantita, unita };
          }
        }
      }
    }
  }
  return null;
}

/** Il primo piatto attivo che usa l'ingrediente con una quantità nell'unità di oggi: l'esempio del cambio (spec 8c §A.3). */
export function esempioPiatto(ingredientId: string, unita: UnitaBase, repertorio: Dish[]): { nome: string; quantita: number } | null {
  for (const d of repertorio) {
    if (!d.attivo) continue;
    const righe = [...d.ingredienti, ...d.componenti.flatMap((c) => c.opzioni.flatMap((o) => o.righe))];
    for (const r of righe) {
      if (r.ingredientId === ingredientId && r.quantita !== null && r.unita === unita) return { nome: d.nome, quantita: r.quantita };
    }
  }
  return null;
}
