import type { Dish, Ingredient, UnitaBase } from '@/domain/types';
import type { IngredienteProposto, PianoEstratto, StatoRevisione } from './types';
import { SCELTA_NUOVO, pastoEffettivo, unitaBaseDi } from './types';
import { abbina, ingredientiDaAbbinare, normalizza, righeDelPiano, stessoNome, unitaPrevalente, unitaTrascritta } from './mapping';
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
 * Una proposta conservata con un'unità diversa da quella (non nulla) che prevale fra le righe
 * (`unitaPrevalente`: con righe in g e in pz la più frequente; votano le righe trascritte, le
 * stime del lettore solo se non ce n'è nessuna, correzione 8c-bis C) non si conserva: si ripropone da capo. Viene dalle bozze di Formati, che lasciava cambiare l'unità;
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
  const { capi } = fratelliSenzaAbbinamento(ingredientiDaAbbinare(piano, stato.correzioni), esistenti);
  return capi.map(({ capo, unita, membri }) => {
    // La proposta già in bozza: del capo, o di un fratello (una bozza vecchia con solo «banane»).
    const conservata = giaProposti.get(capo.alimento) ?? membri.map((m) => giaProposti.get(m)).find((p) => p !== undefined);
    // `proponi` normalizza da sé la chiave; dal grezzo il nome tiene accenti e maiuscole («Caffè»).
    return conservata && (unita === null || conservata.unitaBase === unita) ? conservata : proponi(capo.grezzo, unita);
  });
}

type VoceDaAbbinare = ReturnType<typeof ingredientiDaAbbinare>[number];

/**
 * Gli alimenti del piano senza un ingrediente che hai, uniti per `stessoNome` (fix round 1 dell'8c-bis,
 * I2): «1 banana» e «2 banane» sono un alimento solo, una proposta sola e un ingrediente solo al commit.
 * Il capo è il primo del gruppo nell'ordine del piano; l'unità è quella che prevale fra le righe di
 * tutti i fratelli (le trascritte, poi le stime: come `ingredientiDaAbbinare`). Le chiavi salvate nella
 * bozza non cambiano: la proposta resta quella del capo.
 */
function fratelliSenzaAbbinamento(
  voci: VoceDaAbbinare[],
  esistenti: Ingredient[],
): { capi: { capo: VoceDaAbbinare; unita: UnitaBase | null; membri: string[] }[]; capoDi: Map<string, string> } {
  const gruppi: { capo: VoceDaAbbinare; trascritte: UnitaBase[]; viste: UnitaBase[]; membri: string[] }[] = [];
  const capoDi = new Map<string, string>();
  for (const voce of voci) {
    if (abbina(voce.alimento, voce.unita, esistenti)) continue;
    const gruppo = gruppi.find((g) => stessoNome(g.capo.alimento, voce.alimento));
    if (gruppo) {
      gruppo.trascritte.push(...voce.unitaTrascritte);
      gruppo.viste.push(...voce.unitaViste);
      gruppo.membri.push(voce.alimento);
      capoDi.set(voce.alimento, gruppo.capo.alimento);
    } else {
      gruppi.push({ capo: voce, trascritte: [...voce.unitaTrascritte], viste: [...voce.unitaViste], membri: [voce.alimento] });
      capoDi.set(voce.alimento, voce.alimento);
    }
  }
  const capi = gruppi.map((g) => ({
    capo: g.capo,
    // Un gruppo di un alimento solo ha già la sua unità: la stessa di prima.
    unita: g.membri.length === 1 ? g.capo.unita : unitaPrevalente(g.trascritte) ?? unitaPrevalente(g.viste),
    membri: g.membri,
  }));
  return { capi, capoDi };
}

/**
 * La proposta di un alimento senza abbinamento fra quelle della bozza: quella del suo capo, poi la
 * sua, poi quella di un fratello per `stessoNome` (preferendo sempre l'uguaglianza esatta).
 */
function propostaDi(proposte: IngredienteProposto[], capo: string, alimento: string): IngredienteProposto | undefined {
  const per = (a: string) => proposte.find((p) => normalizza(p.alimento) === a);
  return per(capo) ?? per(alimento) ?? proposte.find((p) => stessoNome(normalizza(p.alimento), alimento));
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
  // Il nome è lo stesso anche a meno di singolare e plurale (fix round 1 dell'8c-bis, I2): è la rete
  // di `calcolaProposte`, che già unisce banana e banane.
  const conNome = libere.map((p) => ({ p, nome: normalizza(p.nome) })).filter(({ nome }) => nome !== '');
  for (const { p, nome } of conNome) {
    if (conNome.some((altra) => altra.p !== p && stessoNome(altra.nome, nome))) doppi.add(p.alimento);
  }
  for (const { p, nome } of conNome) {
    const nuova = scelti[p.alimento] === SCELTA_NUOVO;
    if (esistenti.some((e) => stessoNome(normalizza(e.nome), nome) && (nuova || e.unitaBase !== p.unitaBase))) doppi.add(p.alimento);
  }
  return doppi;
}

/** Perché una proposta blocca il passo: ognuno ha il suo avviso in linea nella Scheda. */
export type MotivoBlocco = 'nomeVuoto' | 'doppio' | 'confezione' | 'peso';

/**
 * Un ingrediente che hai, raggiunto da righe della dieta nell'altra unità fra g e pz (spec 8c
 * §A.3, ruling 8c Task 8). `da !== a`: il nuovo piano lo porta in un'altra unità (un cambio vero,
 * che la RPC applica se non è «tieni»). `da === a`: l'unità resta, ma alcune righe sono nell'altra
 * e si convertono col peso di un pezzo: serve solo il peso, non c'è niente da tenere.
 */
export interface CambioUnita {
  ingredientId: string;
  /** Il nome dell'ingrediente che hai. */
  nome: string;
  /** L'unità di oggi. */
  da: 'g' | 'pz';
  /**
   * L'unità della dieta, che prevale: la più frequente fra le righe TRASCRITTE che finiscono qui
   * (`unitaPrevalente`). Le stime del lettore non votano (correzione 8c-bis C).
   */
  a: 'g' | 'pz';
  /** Gli alimenti della dieta (normalizzati) con almeno una riga trascritta nell'unità diversa da `da`, nell'ordine del piano. */
  alimenti: string[];
  /** Grammi di un pezzo: scritti da te o dalla tabella; null = da chiedere (motivo `peso`). */
  pesoPezzo: number | null;
  /** Il peso viene dalla tabella dei pesi medi, non da te. */
  pesoDaTabella: boolean;
  /** «Tienile a pezzi»: l'ingrediente resta in `da`, e si convertono le righe della dieta. Sempre false se `da === a`. */
  tieni: boolean;
}

/**
 * Una proposta nuova con righe sia in g sia in pz (ruling 8c, Task 8): l'ingrediente nasce
 * nell'unità che prevale (`unitaBase` della proposta), le righe nell'altra si convertono col peso
 * di un pezzo. Il peso scritto si salva in `stato.cambiUnita[alimento]` (la proposta non ha un id).
 */
export interface PesoProposta {
  alimento: string;
  /** Il nome della proposta. */
  nome: string;
  /** Grammi di un pezzo: scritti da te o dalla tabella; null = da chiedere (motivo `peso`). */
  pesoPezzo: number | null;
  pesoDaTabella: boolean;
}

function gOpz(u: UnitaBase | null): u is 'g' | 'pz' {
  return u === 'g' || u === 'pz';
}

/** Dove finiscono tutte le righe di un alimento: un ingrediente che hai o la proposta nuova. */
export type Destino = { tipo: 'esistente'; ingrediente: Ingredient } | { tipo: 'proposta'; proposta: IngredienteProposto };

/**
 * Il destino di ogni alimento del piano, uno per alimento e lo stesso per tutte le sue righe
 * (ruling 8c, Task 8). È il criterio di `traduciBozza`, e i cambi di unità lo leggono da qui:
 * 1. `abbina` con l'unità che prevale fra le sue righe (`ingredientiDaAbbinare`);
 * 2. altrimenti la sua proposta: la legata (`legataAlCommit`) o la proposta stessa;
 * 3. altrimenti, per un alimento in g o pz, il nome per inclusione fra gli ingredienti in g o pz
 *    che i passi 1 e 2 hanno già raggiunto (le «ancore»). Serve al ritentativo dopo la RPC: un
 *    alimento che al primo giro stava su «Zucchine» pz per inclusione («zucchine grigliate»), dopo
 *    il cambio a g non lo trova più al passo 1 e non ha una proposta. Al primo giro ogni alimento
 *    senza abbinamento ha la sua proposta (`calcolaProposte`), quindi il passo 3 non tocca le
 *    scelte della spec §A.2 («Pasta di farro» resta una proposta).
 * Un alimento senza destino non c'è: `traduciBozza` lo dice «non risolto».
 */
export function destinazioni(piano: PianoEstratto, stato: StatoRevisione, esistenti: Ingredient[]): Map<string, Destino> {
  const scelti = stato.scelti ?? {};
  const destini = new Map<string, Destino>();
  const senza: { alimento: string; unita: UnitaBase | null }[] = [];
  const voci = ingredientiDaAbbinare(piano, stato.correzioni);
  const { capoDi } = fratelliSenzaAbbinamento(voci, esistenti);
  for (const { alimento, unita } of voci) {
    const esistente = abbina(alimento, unita, esistenti);
    if (esistente) {
      destini.set(alimento, { tipo: 'esistente', ingrediente: esistente });
      continue;
    }
    // Il fratello di un alimento (banana/banane) va sulla stessa proposta (fix round 1, I2).
    const proposta = propostaDi(stato.ingredientiNuovi, capoDi.get(alimento) ?? alimento, alimento);
    if (proposta) {
      const legata = legataAlCommit(proposta, esistenti, scelti);
      destini.set(alimento, legata ? { tipo: 'esistente', ingrediente: legata } : { tipo: 'proposta', proposta });
      continue;
    }
    senza.push({ alimento, unita });
  }
  const ancore = esistenti.filter(
    (e) => gOpz(e.unitaBase) && [...destini.values()].some((d) => d.tipo === 'esistente' && d.ingrediente.id === e.id),
  );
  for (const { alimento, unita } of senza) {
    const ancora = gOpz(unita) ? abbina(alimento, null, ancore) : null;
    if (ancora) destini.set(alimento, { tipo: 'esistente', ingrediente: ancora });
  }
  return destini;
}

/** Il peso scritto, se c'è: un valore che non è un numero finito e positivo non vale (resta il motivo `peso`). */
function pesoScritto(scritti: (number | null | undefined)[]): { scritto: number | null; valido: boolean } {
  const scritto = scritti.find((p) => p !== null && p !== undefined) ?? null;
  return { scritto, valido: scritto === null || (Number.isFinite(scritto) && scritto > 0) };
}

/**
 * I cambi di unità del piano (spec 8c §A.2, §A.3, ruling 8c Task 8), uno per ingrediente che hai
 * in g o pz raggiunto da righe nell'altra unità. L'unità della dieta (`a`) è la più frequente fra
 * le righe TRASCRITTE che vi finiscono (a pari merito la prima nell'ordine del piano), MAI
 * ricavata dall'unità di oggi: così, al ritentativo dopo la RPC, l'ingrediente è già nell'unità
 * finale e non nasce un cambio inverso.
 *
 * Le quantità stimate dal lettore (`quantitaInferita`) non votano e non fanno nascere né un cambio
 * né la domanda del peso (correzione 8c-bis C, prove dal telefono del 03/10): con sole stime
 * l'ingrediente resta com'è, e `traduciBozza` porta le stime nella sua unità, col peso di un pezzo
 * se c'è, altrimenti rifacendole (`stimaNellUnita`). Una riga trascritta in un'altra unità, invece,
 * c'è sempre: cambio o conversione, e il peso.
 *
 * La decisione salvata in `stato.cambiUnita[id]` vince («tieni» e il peso). Il peso altrimenti è
 * quello scritto per uno degli alimenti (`stato.cambiUnita[alimento]`, quello di una proposta
 * creata al primo giro), poi la tabella: prima col nome dell'ingrediente, poi con gli alimenti che
 * vi finiscono, nell'ordine del piano. Un peso scritto che non è un numero finito e positivo non
 * vale: resta senza peso (motivo `peso`) invece di ricadere in silenzio sulla tabella, e
 * `convertiPezzi` non vede mai uno zero.
 */
export function cambiUnita(piano: PianoEstratto, stato: StatoRevisione, esistenti: Ingredient[]): CambioUnita[] {
  const destini = destinazioni(piano, stato, esistenti);
  const perId = new Map<string, { ingrediente: Ingredient & { unitaBase: 'g' | 'pz' }; voti: UnitaBase[]; tutti: string[]; diversi: string[] }>();
  for (const riga of righeDelPiano(piano, stato.correzioni)) {
    const alimento = normalizza(riga.alimento);
    const destino = destini.get(alimento);
    if (destino?.tipo !== 'esistente') continue;
    const ingrediente = destino.ingrediente;
    if (!gOpz(ingrediente.unitaBase)) continue;
    const voce = perId.get(ingrediente.id) ?? { ingrediente: ingrediente as Ingredient & { unitaBase: 'g' | 'pz' }, voti: [], tutti: [], diversi: [] };
    perId.set(ingrediente.id, voce);
    if (!voce.tutti.includes(alimento)) voce.tutti.push(alimento);
    // Votano solo le righe con la quantità trascritta: una stima del lettore non decide l'unità
    // (correzione 8c-bis C). Senza righe trascritte l'ingrediente non ha voti e resta com'è.
    const unita = unitaTrascritta(riga);
    if (!gOpz(unita)) continue;
    voce.voti.push(unita);
    if (unita !== ingrediente.unitaBase && !voce.diversi.includes(alimento)) voce.diversi.push(alimento);
  }
  const cambi: CambioUnita[] = [];
  for (const { ingrediente, voti, tutti, diversi } of perId.values()) {
    if (diversi.length === 0) continue;
    const a = unitaPrevalente(voti) as 'g' | 'pz';
    const decisione = stato.cambiUnita?.[ingrediente.id];
    const tabella = pesoPezzo(ingrediente.nome, ...tutti);
    const { scritto, valido } = pesoScritto([decisione?.pesoPezzo, ...tutti.map((al) => stato.cambiUnita?.[al]?.pesoPezzo)]);
    cambi.push({
      ingredientId: ingrediente.id,
      nome: ingrediente.nome,
      da: ingrediente.unitaBase,
      a,
      alimenti: diversi,
      pesoPezzo: valido ? (scritto ?? tabella) : null,
      pesoDaTabella: scritto === null && tabella !== null,
      tieni: a !== ingrediente.unitaBase && (decisione?.tieni ?? false),
    });
  }
  return cambi;
}

/**
 * Il peso di un pezzo per convertire una stima del lettore in un'altra unità (correzione 8c-bis C):
 * il primo scritto da te (per l'ingrediente che hai, poi per l'alimento) che sia un numero finito e
 * positivo, poi la tabella (nome dell'ingrediente o della proposta, poi l'alimento); null se non
 * c'è. A differenza di `cambiUnita`, un peso scritto non valido si salta e non blocca: qui non si
 * chiede niente, la stima si rifà (`stimaNellUnita`).
 */
export function pesoPerStima(stato: StatoRevisione, ingredientId: string | null, nome: string, alimento: string): number | null {
  const scritti = [ingredientId === null ? undefined : stato.cambiUnita?.[ingredientId]?.pesoPezzo, stato.cambiUnita?.[alimento]?.pesoPezzo];
  return scritti.find((p): p is number => typeof p === 'number' && Number.isFinite(p) && p > 0) ?? pesoPezzo(nome, alimento);
}

/**
 * Le proposte nuove con righe sia in g sia in pz (ruling 8c, Task 8): le righe nell'unità diversa
 * da quella della proposta si convertono col peso di un pezzo. Il peso: quello scritto in
 * `stato.cambiUnita[alimento]`, poi la tabella (nome della proposta, poi l'alimento); senza,
 * motivo `peso`. Solo per le righe trascritte: le stime del lettore non lo chiedono (8c-bis C).
 */
export function pesiProposte(piano: PianoEstratto, stato: StatoRevisione, esistenti: Ingredient[]): PesoProposta[] {
  const destini = destinazioni(piano, stato, esistenti);
  const pesi: PesoProposta[] = [];
  for (const { alimento, unitaTrascritte } of ingredientiDaAbbinare(piano, stato.correzioni)) {
    const destino = destini.get(alimento);
    if (destino?.tipo !== 'proposta') continue;
    const p = destino.proposta;
    // Il peso serve solo per le righe trascritte in un'altra unità: una stima del lettore si
    // converte in silenzio o si rifà (correzione 8c-bis C), non si chiede.
    if (!gOpz(p.unitaBase) || !unitaTrascritte.some((u) => gOpz(u) && u !== p.unitaBase)) continue;
    const tabella = pesoPezzo(p.nome, alimento);
    const { scritto, valido } = pesoScritto([stato.cambiUnita?.[p.alimento]?.pesoPezzo]);
    pesi.push({
      alimento: p.alimento,
      nome: p.nome,
      pesoPezzo: valido ? (scritto ?? tabella) : null,
      pesoDaTabella: scritto === null && tabella !== null,
    });
  }
  return pesi;
}

/** I cambi che non vengono da una proposta: gli abbinamenti automatici del secondo livello, con la loro Scheda. */
export function cambiDiretti(cambi: CambioUnita[], proposte: IngredienteProposto[]): CambioUnita[] {
  const alimentiProposti = new Set(proposte.map((p) => p.alimento));
  return cambi.filter((c) => !c.alimenti.some((a) => alimentiProposti.has(a)));
}

/**
 * Le proposte che bloccano VAI AL RIEPILOGO, `alimento → motivi`; chi non blocca non c'è. Un nome
 * vuoto, un nome doppio, una confezione che non è un numero positivo, un cambio di unità o una
 * proposta con righe in g e in pz senza il peso di un pezzo (spec 8c §A.3, ruling 8c Task 8). La
 * confezione di una proposta legata per scelta a un esistente non conta: `traduciBozza` usa
 * l'esistente e la proposta non si crea.
 */
export function motiviBlocco(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
  cambi: CambioUnita[] = [],
  pesi: PesoProposta[] = [],
): Map<string, MotivoBlocco[]> {
  const doppi = nomiDoppi(proposte, esistenti, scelti);
  const senzaPeso = new Set([
    ...cambi.filter((c) => c.pesoPezzo === null).flatMap((c) => c.alimenti),
    ...pesi.filter((p) => p.pesoPezzo === null).map((p) => p.alimento),
  ]);
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

/** VAI AL RIEPILOGO spento: una proposta blocca, o un cambio di unità (o una proposta in g e pz) aspetta il peso di un pezzo. */
export function passoBloccato(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
  cambi: CambioUnita[] = [],
  pesi: PesoProposta[] = [],
): boolean {
  return (
    motiviBlocco(proposte, esistenti, scelti, cambi, pesi).size > 0 ||
    cambi.some((c) => c.pesoPezzo === null) ||
    pesi.some((p) => p.pesoPezzo === null)
  );
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
 * sistemare», anche se sono ripieghi; i ripieghi liberi in «Da controllare». Con i cambi e i pesi
 * (8c), anche una proposta che aspetta il peso di un pezzo sta in «Da sistemare» dall'ingresso.
 */
export function sezioniIniziali(
  proposte: IngredienteProposto[],
  esistenti: Ingredient[],
  scelti: Readonly<Record<string, string>> = {},
  cambi: CambioUnita[] = [],
  pesi: PesoProposta[] = [],
): SezioniIngredienti {
  const bloccate = motiviBlocco(proposte, esistenti, scelti, cambi, pesi);
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
            // Una stima del lettore non è «sulla dieta»: l'esempio è sempre una riga scritta (8c-bis C).
            if (cercati.has(normalizza(r.alimento)) && r.quantita !== null && unita !== null && !r.quantitaInferita) return { quantita: r.quantita, unita };
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
