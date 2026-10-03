import type { Ingredient, MealSlotDef, UnitaBase } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from './types';
import { chiavePasto, pastoEffettivo, unitaBaseDi } from './types';
import { normalizza, proponiSlot, quantoBasta } from './mapping';
import { arrotonda, convertiCucchiai, convertiPezzi, pesoPezzo, porzioneTipica, proponi, testoConversione } from './formati-tipici';

/**
 * I dubbi di Controlla (spec 8b §B): cosa l'AI non sa e va chiesto, e le scritture che
 * rispondono. Tutto puro, su (piano, stato): il componente non calcola niente da sé.
 *
 * I dubbi si riconoscono sul piano ORIGINALE, così un dubbio risposto resta al suo posto
 * come «fatto» invece di sparire sotto il dito; il loro stato si legge sul piano EFFETTIVO
 * (le correzioni applicate). Una riga di un gruppo si ritrova per chiave, mai per indice:
 * gli indici cambiano quando si tolgono righe.
 */

const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

/** Stesso alimento e stesso testo sul foglio: un dubbio solo, qualunque sia il numero di pasti (decisione 5). */
export function chiaveGruppo(riga: RigaEstratta): string {
  return `${normalizza(riga.alimento)}|${riga.testoOriginale}`;
}

/**
 * Quantità o unità mancante, o i cucchiai ancora da convertire: basta una per bloccare. Il
 * «quanto basta» no (spec 8c §B): è un valore.
 */
export function rigaIrrisolta(riga: RigaEstratta): boolean {
  if (quantoBasta(riga)) return false;
  return riga.quantita === null || riga.unita === null || riga.unita === 'cucchiaio' || riga.unita === 'cucchiaino';
}

/** Dove sta una riga nel suo pasto. `componente` e `opzione` sono null per una riga fissa. */
export interface PosizioneRiga {
  piatto: number;
  componente: number | null;
  opzione: number | null;
  riga: number;
}

export function stessaPosizione(a: PosizioneRiga, b: PosizioneRiga): boolean {
  return a.piatto === b.piatto && a.componente === b.componente && a.opzione === b.opzione && a.riga === b.riga;
}

export interface RigaNelPasto {
  riga: RigaEstratta;
  posizione: PosizioneRiga;
  nomePiatto: string;
}

/** Tutte le righe di un pasto, per piatto: prima le fisse, poi quelle delle opzioni. */
export function righeDelPasto(pasto: PastoEstratto): RigaNelPasto[] {
  const righe: RigaNelPasto[] = [];
  pasto.piatti.forEach((piatto, ip) => {
    piatto.righeFisse.forEach((riga, ir) => {
      righe.push({ riga, posizione: { piatto: ip, componente: null, opzione: null, riga: ir }, nomePiatto: piatto.nome });
    });
    piatto.componenti.forEach((componente, ic) => {
      componente.opzioni.forEach((opzione, io) => {
        opzione.forEach((riga, ir) => {
          righe.push({ riga, posizione: { piatto: ip, componente: ic, opzione: io, riga: ir }, nomePiatto: piatto.nome });
        });
      });
    });
  });
  return righe;
}

export interface PastoDelPiano {
  settimana: number;
  giorno: number;
  titolo: string | null;
  indice: number;
  chiave: string;
  originale: PastoEstratto;
  effettivo: PastoEstratto;
}

/** Ogni pasto del piano, in ordine di settimana, giorno e posizione, con l'originale e l'effettivo. */
export function pastiDelPiano(piano: PianoEstratto, stato: StatoRevisione): PastoDelPiano[] {
  const pasti: PastoDelPiano[] = [];
  const settimane = [...piano.settimane].sort((a, b) => a.numero - b.numero);
  for (const s of settimane) {
    const giorni = [...s.giorni].sort((a, b) => a.giorno - b.giorno);
    for (const g of giorni) {
      g.pasti.forEach((originale, indice) => {
        pasti.push({
          settimana: s.numero,
          giorno: g.giorno,
          titolo: g.titolo,
          indice,
          chiave: chiavePasto(s.numero, g.giorno, indice),
          originale,
          effettivo: pastoEffettivo(piano, stato.correzioni, s.numero, g.giorno, indice),
        });
      });
    }
  }
  return pasti;
}

/**
 * Come si chiama un giorno: il titolo dello scenario (`giorni_tipo`), «Ogni giorno» per gli
 * archetipi il cui unico giorno vale sempre, altrimenti il giorno della settimana.
 */
export function etichettaGiorno(piano: PianoEstratto, giorno: number, titolo: string | null): string {
  if (titolo) return titolo;
  if (piano.archetipo === 'giornata_unica' || piano.archetipo === 'griglia_alternative') return 'Ogni giorno';
  return GIORNI_LUNGHI[giorno] ?? `Giorno ${giorno + 1}`;
}

export interface VocePasto {
  /** `normalizza(nomeOriginale)`: la chiave di `mappaturaPasti`. */
  chiave: string;
  nomeOriginale: string;
  /** In quanti giorni del piano compare con almeno un piatto. */
  giorni: number;
  /** Il nome sta in «Da sistemare»: `proponiSlot` non trova niente, o lo slot non c'è. */
  daSistemare: boolean;
  /** Lo slot abbinato, solo se esiste ancora in `slotDefs`. */
  slotDefId: string | null;
}

/** I nomi di pasto del piano effettivo, nell'ordine in cui compaiono (spec 8b §B, Pasti). */
export function vociPasti(piano: PianoEstratto, stato: StatoRevisione, slotDefs: MealSlotDef[]): VocePasto[] {
  const esistenti = new Set(slotDefs.map((s) => s.id));
  const perNome = new Map<string, { nomeOriginale: string; giorni: Set<string> }>();
  for (const p of pastiDelPiano(piano, stato)) {
    if (p.effettivo.piatti.length === 0) continue;
    const chiave = normalizza(p.effettivo.nomeOriginale);
    const voce = perNome.get(chiave) ?? { nomeOriginale: p.effettivo.nomeOriginale, giorni: new Set<string>() };
    voce.giorni.add(`${p.settimana}-${p.giorno}`);
    perNome.set(chiave, voce);
  }
  return [...perNome].map(([chiave, voce]) => {
    const mappato = stato.mappaturaPasti[chiave];
    const slotDefId = mappato && esistenti.has(mappato) ? mappato : null;
    return {
      chiave,
      nomeOriginale: voce.nomeOriginale,
      giorni: voce.giorni.size,
      daSistemare: proponiSlot(voce.nomeOriginale, slotDefs) === null || slotDefId === null,
      slotDefId,
    };
  });
}

export interface Occorrenza {
  /** La chiave del pasto (`chiavePasto`): serve a contare i pasti distinti. */
  pasto: string;
  settimana: number;
  giorno: number;
  titolo: string | null;
  nomePasto: string;
  nomePiatto: string;
}

/** La risposta proposta e già scelta per un dubbio (spec 8c §D). */
export interface PropostaGruppo {
  quantita: number;
  unita: UnitaBase;
  /** La porzione tipica, l'unità più frequente nel gruppo, o i cucchiai convertiti. */
  origine: 'porzione' | 'unitaFrequente' | 'cucchiaio';
  /** I due valori dei cucchiai («1 cucchiaio, quindi 15 ml»); null per le altre. */
  testo: string | null;
}

export type StatoGruppo = 'aperto' | 'fatto' | 'tolto';

export interface GruppoRighe {
  chiave: string;
  /** Come lo scrive la prima riga del gruppo. */
  alimento: string;
  testoOriginale: string;
  /**
   * `irrisolta` sta in «Da sistemare» e blocca finché non ha una proposta; `proposta` è
   * un'irrisolta che sul piano letto ha già la risposta proposta (spec 8c §D): sta in «Da
   * controllare» e non blocca; `inferita` è la quantità proposta dall'AI, in «Da controllare».
   */
  tipo: 'irrisolta' | 'proposta' | 'inferita';
  occorrenze: Occorrenza[];
  stato: StatoGruppo;
  /** Comune a tutte le righe effettive, se sono tutte risolte con la stessa quantità e la stessa unità; altrimenti null. */
  quantita: number | null;
  /** Comune a tutte le righe effettive risolte, anche con quantità diverse; null senza righe risolte o con unità diverse. */
  unita: UnitaBase | null;
  /**
   * Le righe effettive sono tutte risolte ma con più di un'unità (I2): il dubbio è sceglierne
   * una per tutte, e l'avviso lo dice al posto di «senza peso».
   */
  unitaDiverse: boolean;
  /** L'unità di una riga dello stesso alimento fuori da OGNI gruppo irrisolto (decisione 8), o null. */
  unitaFissa: UnitaBase | null;
  /** Solo per un gruppo aperto: la risposta proposta e già scelta, o null (un dubbio che blocca). */
  proposta: PropostaGruppo | null;
  /** Le righe effettive sono tutte proposte (`quantitaInferita`): dall'AI o da CONFERMA I PASTI. */
  daMe: boolean;
}

interface Raccolta {
  alimento: string;
  testoOriginale: string;
  originali: Occorrenza[];
  righeOriginali: RigaEstratta[];
  effettive: { riga: RigaEstratta; occorrenza: Occorrenza }[];
  irrisolta: boolean;
  inferita: boolean;
}

/**
 * Una passata sola sul piano (originale ed effettivo) che raccoglie, per chiave di gruppo,
 * le occorrenze e se il gruppo è irrisolta o inferita. Usata sia da `gruppiRighe` (per
 * costruire i gruppi da mostrare) sia da `unitaNota` tramite `chiaviGruppiIrrisolti` (per
 * sapere quali righe NON possono fissare l'unità di un altro gruppo): un gruppo solo di
 * raccolta, mai due, per non disallineare le due letture.
 */
function raccogliDubbi(piano: PianoEstratto, stato: StatoRevisione): Map<string, Raccolta> {
  const pasti = pastiDelPiano(piano, stato);
  const perChiave = new Map<string, Raccolta>();
  const raccolta = (riga: RigaEstratta): Raccolta => {
    const chiave = chiaveGruppo(riga);
    let r = perChiave.get(chiave);
    if (!r) {
      r = { alimento: riga.alimento, testoOriginale: riga.testoOriginale, originali: [], righeOriginali: [], effettive: [], irrisolta: false, inferita: false };
      perChiave.set(chiave, r);
    }
    return r;
  };
  const occorrenza = (p: PastoDelPiano, pasto: PastoEstratto, nomePiatto: string): Occorrenza => ({
    pasto: p.chiave, settimana: p.settimana, giorno: p.giorno, titolo: p.titolo, nomePasto: pasto.nomeOriginale, nomePiatto,
  });

  for (const p of pasti) {
    for (const { riga, nomePiatto } of righeDelPasto(p.originale)) {
      const r = raccolta(riga);
      r.originali.push(occorrenza(p, p.originale, nomePiatto));
      r.righeOriginali.push(riga);
      if (rigaIrrisolta(riga)) r.irrisolta = true;
      // Un q.b. con una quantità stimata dal lettore è q.b., non una quantità proposta (correzione S1).
      else if (riga.quantitaInferita && !quantoBasta(riga)) r.inferita = true;
    }
  }
  for (const p of pasti) {
    for (const { riga, nomePiatto } of righeDelPasto(p.effettivo)) {
      const r = raccolta(riga);
      r.effettive.push({ riga, occorrenza: occorrenza(p, p.effettivo, nomePiatto) });
      if (rigaIrrisolta(riga)) r.irrisolta = true;
    }
  }
  // Più di un'unità fra le righe risolte dello stesso gruppo è un dubbio irrisolto (I2): il
  // riepilogo non saprebbe in che unità creare l'ingrediente. Letta sul piano originale (l'AI
  // ha scritto unità diverse) resta irrisolto anche dopo la risposta, come ogni dubbio.
  for (const r of perChiave.values()) {
    if (unitaDiverse(r.righeOriginali) || unitaDiverse(r.effettive.map((e) => e.riga))) r.irrisolta = true;
  }
  return perChiave;
}

/**
 * Le righe che dicono un'unità: risolte, non q.b. e con l'unità. Il q.b. non è un'unità
 * (correzioni D2 e S1 del piano 8c): né quello senza numero, né quello stimato dal lettore.
 */
function righeConUnita(righe: RigaEstratta[]): RigaEstratta[] {
  return righe.filter((x) => !rigaIrrisolta(x) && !quantoBasta(x) && x.unita !== null);
}

/** Più di un'unità fra le righe che ne dicono una. */
function unitaDiverse(righe: RigaEstratta[]): boolean {
  return new Set(righeConUnita(righe).map((x) => x.unita)).size > 1;
}

/**
 * Le chiavi di gruppo irrisolte: una riga irrisolta, o righe risolte con unità diverse, nel
 * piano originale o in quello effettivo (stessa definizione di `tipo: 'irrisolta'` in
 * `gruppiRighe`). Una chiave irrisolta nel piano originale lo resta anche se poi si risolve
 * nelle correzioni: altrimenti, risolto un gruppo, la sua unità fisserebbe per sempre un altro
 * gruppo ancora aperto dello stesso alimento (e viceversa). Le unità diverse nate solo nelle
 * correzioni contano finché ci sono.
 */
function chiaviGruppiIrrisolti(piano: PianoEstratto, stato: StatoRevisione): Set<string> {
  const chiavi = new Set<string>();
  for (const [chiave, r] of raccogliDubbi(piano, stato)) {
    if (r.irrisolta) chiavi.add(chiave);
  }
  return chiavi;
}

/**
 * L'unità che il piano effettivo conosce già per un alimento (`alimento` normalizzato): la
 * prima riga con l'unità, saltando `escludi` e le righe di OGNI chiave di gruppo irrisolta
 * (`chiaviGruppiIrrisolti`). Non solo `escludi`: due gruppi irrisolti dello stesso alimento
 * non devono fissarsi l'unità a vicenda, altrimenti, risposti entrambi, un'unità scelta per
 * sbaglio non si potrebbe più cambiare (decisione 8).
 */
export function unitaNota(piano: PianoEstratto, stato: StatoRevisione, alimento: string, escludi?: string): UnitaBase | null {
  const irrisolti = chiaviGruppiIrrisolti(piano, stato);
  for (const p of pastiDelPiano(piano, stato)) {
    for (const { riga } of righeDelPasto(p.effettivo)) {
      if (normalizza(riga.alimento) !== alimento) continue;
      const chiave = chiaveGruppo(riga);
      if (escludi !== undefined && chiave === escludi) continue;
      if (irrisolti.has(chiave)) continue;
      // Il q.b. non dice un'unità, nemmeno quella stimata dal lettore (correzione S1).
      if (quantoBasta(riga)) continue;
      const unita = unitaBaseDi(riga.unita);
      if (unita !== null) return unita;
    }
  }
  return null;
}

/**
 * L'unità di un'altra riga GIÀ RISOLTA dello stesso gruppo nel piano effettivo, saltando la
 * riga `escludi` (pasto e posizione), o null (I2). Il foglio del giorno la usa come unità
 * fissa: così lo stesso gruppo non si risolve con unità diverse in giorni diversi.
 */
export function unitaDelGruppo(
  piano: PianoEstratto,
  stato: StatoRevisione,
  chiave: string,
  escludi: { pasto: string; posizione: PosizioneRiga },
): UnitaBase | null {
  for (const p of pastiDelPiano(piano, stato)) {
    for (const { riga, posizione } of righeDelPasto(p.effettivo)) {
      // Il q.b. non è irrisolto ma non ha un'unità da dare: si salta (correzione S1).
      if (chiaveGruppo(riga) !== chiave || rigaIrrisolta(riga) || quantoBasta(riga)) continue;
      if (p.chiave === escludi.pasto && stessaPosizione(posizione, escludi.posizione)) continue;
      return unitaBaseDi(riga.unita);
    }
  }
  return null;
}

/** L'unità in cui va la riga: quella di un ingrediente che hai con lo stesso nome, poi quella di un'altra riga del piano. */
function unitaVerso(piano: PianoEstratto, stato: StatoRevisione, alimento: string, chiave: string, esistenti: Ingredient[]): UnitaBase | null {
  const esistente = esistenti.find((e) => normalizza(e.nome) === alimento);
  return esistente?.unitaBase ?? unitaNota(piano, stato, alimento, chiave);
}

/**
 * La proposta per un gruppo, letta su queste righe (spec 8c §D): con le righe tutte risolte in
 * unità diverse, la più frequente (a pari merito quella della prima riga) con la sua quantità;
 * con una riga a cucchiai, i cucchiai convertiti nell'unità dell'ingrediente; con una riga senza
 * quantità, la porzione tipica nell'unità che il piano conosce. L'unità è quella di una riga del
 * gruppo già risolta, se c'è, altrimenti `unitaVerso`. Altrimenti null: un dubbio che blocca.
 */
function propostaPer(
  piano: PianoEstratto,
  stato: StatoRevisione,
  alimento: string,
  chiave: string,
  righe: RigaEstratta[],
  esistenti: Ingredient[],
): PropostaGruppo | null {
  if (righe.length === 0) return null;
  const tutteRisolte = righe.every((x) => !rigaIrrisolta(x));
  if (tutteRisolte && unitaDiverse(righe)) {
    // Si contano solo le righe che dicono un'unità (correzione D2): il q.b. non vota.
    const conUnita = righeConUnita(righe);
    const conta = new Map<UnitaBase, number>();
    for (const x of conUnita) {
      const u = unitaBaseDi(x.unita)!;
      conta.set(u, (conta.get(u) ?? 0) + 1);
    }
    let scelta = unitaBaseDi(conUnita[0].unita)!;
    for (const [u, n] of conta) if (n > conta.get(scelta)!) scelta = u;
    const riga = conUnita.find((x) => x.unita === scelta)!;
    return { quantita: riga.quantita!, unita: scelta, origine: 'unitaFrequente', testo: null };
  }
  const irrisolta = righe.find(rigaIrrisolta);
  if (!irrisolta) return null;
  // Prima l'unità di una riga dello stesso gruppo già risolta (q.b. esclusi): la proposta non
  // deve lasciare il gruppo con unità diverse (review I1, come `unitaDelGruppo` nel foglio).
  const delGruppo = righeConUnita(righe)[0];
  const verso = (delGruppo ? unitaBaseDi(delGruppo.unita) : null) ?? unitaVerso(piano, stato, alimento, chiave, esistenti);
  if (irrisolta.unita === 'cucchiaio' || irrisolta.unita === 'cucchiaino') {
    if (irrisolta.quantita === null) return null;
    const destinazione = verso ?? proponi(alimento, null).unitaBase;
    const convertita = convertiCucchiai(irrisolta.quantita, irrisolta.unita, alimento, destinazione);
    if (!convertita) return null;
    const quantita = arrotonda(convertita.quantita, destinazione);
    return {
      quantita, unita: destinazione, origine: 'cucchiaio',
      testo: testoConversione({ quantita: irrisolta.quantita, unita: irrisolta.unita }, { quantita, unita: destinazione }),
    };
  }
  const porzione = porzioneTipica(alimento);
  if (!porzione) return null;
  if (verso === null || verso === porzione.unita) return { ...porzione, origine: 'porzione', testo: null };
  const peso = pesoPezzo(alimento);
  const convertita = peso === null ? null : convertiPezzi(porzione.quantita, porzione.unita, verso, peso);
  return convertita === null ? null : { quantita: convertita, unita: verso, origine: 'porzione', testo: null };
}

/**
 * I gruppi di righe da chiedere (spec 8b §B, 8c §D). Un gruppo esiste se una sua riga originale è
 * irrisolta o inferita, oppure se una sua riga effettiva è irrisolta (le bozze vecchie). Esiste,
 * irrisolto, anche se le sue righe risolte hanno più di un'unità (I2). Un'irrisolta con una
 * proposta sul piano letto è di tipo `proposta`; la proposta del gruppo aperto si legge sulle
 * righe effettive. `esistenti` serve all'unità della proposta (Ruling del piano 8c, Task 7).
 */
export function gruppiRighe(piano: PianoEstratto, stato: StatoRevisione, esistenti: Ingredient[] = []): GruppoRighe[] {
  const perChiave = raccogliDubbi(piano, stato);
  const gruppi: GruppoRighe[] = [];
  for (const [chiave, r] of perChiave) {
    const base = r.irrisolta ? 'irrisolta' : r.inferita ? 'inferita' : null;
    if (base === null) continue;
    const alimento = normalizza(r.alimento);
    const originali = r.righeOriginali.length > 0 ? r.righeOriginali : r.effettive.map((e) => e.riga);
    const tipo = base === 'irrisolta' && propostaPer(piano, stato, alimento, chiave, originali, esistenti) !== null ? 'proposta' : base;
    const righe = r.effettive.map((e) => e.riga);
    const risolte = righe.filter((x) => !rigaIrrisolta(x));
    const diverse = unitaDiverse(righe);
    const statoGruppo: StatoGruppo = righe.length === 0 ? 'tolto' : risolte.length < righe.length || diverse ? 'aperto' : 'fatto';
    // L'unità comune si calcola a parte dalla quantità (I1): con quantità diverse nei giorni la
    // riga resta scrivibile, perché il numero nuovo ha comunque la sua unità.
    const unitaComune = risolte.length > 0 && !diverse ? unitaBaseDi(risolte[0].unita) : null;
    const prima = righe[0];
    const quantitaComune = unitaComune !== null && risolte.length === righe.length
      && righe.every((x) => x.quantita === prima.quantita) ? prima.quantita : null;
    gruppi.push({
      chiave,
      alimento: r.alimento,
      testoOriginale: r.testoOriginale,
      tipo,
      occorrenze: r.originali.length > 0 ? r.originali : r.effettive.map((e) => e.occorrenza),
      stato: statoGruppo,
      quantita: quantitaComune,
      unita: unitaComune,
      unitaDiverse: diverse && risolte.length === righe.length,
      unitaFissa: unitaNota(piano, stato, alimento, chiave),
      proposta: statoGruppo === 'aperto' ? propostaPer(piano, stato, alimento, chiave, righe, esistenti) : null,
      daMe: righe.length > 0 && righe.every((x) => x.quantitaInferita),
    });
  }
  return gruppi;
}

/** Quanti pasti distinti tocca un gruppo (due piatti sorella nello stesso pasto contano uno). */
export function pastiDelGruppo(gruppo: GruppoRighe): number {
  return new Set(gruppo.occorrenze.map((o) => o.pasto)).size;
}

/** La riga sopra il nome nella Riga dell'alimento: da dove viene il dubbio (spec 8b §D). */
export function provenienza(piano: PianoEstratto, gruppo: GruppoRighe): string {
  const pasti = pastiDelGruppo(gruppo);
  if (pasti > 1) return `In ${pasti} pasti`;
  const o = gruppo.occorrenze[0];
  const parti: string[] = [];
  if (piano.settimane.length > 1) parti.push(`Sett. ${o.settimana}`);
  // Il nome del pasto come nel foglio del giorno: niente underscore («spuntino mattina»).
  parti.push(etichettaGiorno(piano, o.giorno, o.titolo), o.nomePasto.replace(/_/g, ' '), o.nomePiatto);
  return parti.join(' · ');
}

/** Il cancello di CONFERMA I PASTI: ogni dubbio aperto ha una proposta (spec 8c §D) e ogni nome di pasto è abbinato. */
export function pronto(piano: PianoEstratto, stato: StatoRevisione, slotDefs: MealSlotDef[], esistenti: Ingredient[] = []): boolean {
  return gruppiRighe(piano, stato, esistenti).every((g) => g.stato !== 'aperto' || g.proposta !== null)
    && vociPasti(piano, stato, slotDefs).every((v) => v.slotDefId !== null);
}

export interface RiassuntoGiorno {
  settimana: number;
  giorno: number;
  titolo: string | null;
  etichetta: string;
  /** I piatti del giorno: sorelle unite da « o », pasti da « · ». */
  piatti: string;
  /** I pasti con almeno un piatto. */
  pasti: number;
}

export function riassuntoGiorni(piano: PianoEstratto, stato: StatoRevisione): RiassuntoGiorno[] {
  const riassunti: RiassuntoGiorno[] = [];
  const settimane = [...piano.settimane].sort((a, b) => a.numero - b.numero);
  for (const s of settimane) {
    const giorni = [...s.giorni].sort((a, b) => a.giorno - b.giorno);
    for (const g of giorni) {
      const pieni = g.pasti
        .map((_, i) => pastoEffettivo(piano, stato.correzioni, s.numero, g.giorno, i))
        .filter((p) => p.piatti.length > 0);
      riassunti.push({
        settimana: s.numero,
        giorno: g.giorno,
        titolo: g.titolo,
        etichetta: etichettaGiorno(piano, g.giorno, g.titolo),
        piatti: pieni.map((p) => p.piatti.map((x) => x.nome).join(' o ')).join(' · '),
        pasti: pieni.length,
      });
    }
  }
  return riassunti;
}

/** I numeri della frase d'apertura: letti = dal piano originale; confermabili = pasti effettivi con piatti. */
export function conteggi(piano: PianoEstratto, stato: StatoRevisione): { settimane: number; giorni: number; pastiLetti: number; pastiConfermabili: number } {
  const pasti = pastiDelPiano(piano, stato);
  return {
    settimane: piano.settimane.length,
    giorni: piano.settimane.reduce((n, s) => n + s.giorni.length, 0),
    pastiLetti: pasti.length,
    pastiConfermabili: pasti.filter((p) => p.effettivo.piatti.length > 0).length,
  };
}

// --- Le scritture: restituiscono sempre un pasto o uno stato nuovo, il piano estratto non si tocca. ---

/**
 * Applica `fn` a ogni riga del pasto: la riga restituita prende il posto di quella di prima,
 * `null` la toglie. Poi la cascata (decisione 9), solo su ciò che la rimozione ha svuotato:
 * un'opzione rimasta senza righe sparisce, un componente senza opzioni sparisce, un piatto
 * senza righe né componenti sparisce, e un pasto senza piatti diventa
 * `{ nomeOriginale, piatti: [] }`, che `traduciBozza` legge come pasto rimosso.
 */
export function mappaRighe(
  pasto: PastoEstratto,
  fn: (riga: RigaEstratta, posizione: PosizioneRiga) => RigaEstratta | null,
): PastoEstratto {
  const piatti = pasto.piatti.flatMap((piatto, ip) => {
    const righeFisse = piatto.righeFisse.flatMap((riga, ir) => {
      const nuova = fn(riga, { piatto: ip, componente: null, opzione: null, riga: ir });
      return nuova ? [nuova] : [];
    });
    const componenti = piatto.componenti.flatMap((componente, ic) => {
      const opzioni = componente.opzioni.flatMap((opzione, io) => {
        const righe = opzione.flatMap((riga, ir) => {
          const nuova = fn(riga, { piatto: ip, componente: ic, opzione: io, riga: ir });
          return nuova ? [nuova] : [];
        });
        return opzione.length > 0 && righe.length === 0 ? [] : [righe];
      });
      return componente.opzioni.length > 0 && opzioni.length === 0 ? [] : [{ ...componente, opzioni }];
    });
    const aveva = piatto.righeFisse.length > 0 || piatto.componenti.length > 0;
    const vuoto = righeFisse.length === 0 && componenti.length === 0;
    return aveva && vuoto ? [] : [{ ...piatto, righeFisse, componenti }];
  });
  if (pasto.piatti.length > 0 && piatti.length === 0) return { nomeOriginale: pasto.nomeOriginale, piatti: [] };
  return { ...pasto, piatti };
}

export function cambiaRiga(pasto: PastoEstratto, posizione: PosizioneRiga, cambio: Partial<RigaEstratta>): PastoEstratto {
  return mappaRighe(pasto, (riga, p) => (stessaPosizione(p, posizione) ? { ...riga, ...cambio } : riga));
}

export function togliRiga(pasto: PastoEstratto, posizione: PosizioneRiga): PastoEstratto {
  return mappaRighe(pasto, (riga, p) => (stessaPosizione(p, posizione) ? null : riga));
}

/** Riscrive, in ogni pasto effettivo che ha una riga del gruppo, le righe del gruppo con `fn`. */
function suOgniRigaDelGruppo(
  piano: PianoEstratto,
  stato: StatoRevisione,
  chiave: string,
  fn: (riga: RigaEstratta) => RigaEstratta | null,
): StatoRevisione {
  const correzioni = { ...stato.correzioni };
  for (const p of pastiDelPiano(piano, stato)) {
    if (!righeDelPasto(p.effettivo).some(({ riga }) => chiaveGruppo(riga) === chiave)) continue;
    correzioni[p.chiave] = mappaRighe(p.effettivo, (riga) => (chiaveGruppo(riga) === chiave ? fn(riga) : riga));
  }
  return { ...stato, correzioni };
}

/** La risposta a un gruppo: quantità e unità su tutte le sue righe, e la quantità non è più una proposta. */
export function rispondiGruppo(
  piano: PianoEstratto,
  stato: StatoRevisione,
  chiave: string,
  quantita: number,
  unita: UnitaBase,
): StatoRevisione {
  return suOgniRigaDelGruppo(piano, stato, chiave, (riga) => ({ ...riga, quantita, unita, quantitaInferita: false }));
}

/** Toglie tutte le righe del gruppo, con la cascata di `mappaRighe`. */
export function togliGruppo(piano: PianoEstratto, stato: StatoRevisione, chiave: string): StatoRevisione {
  return suOgniRigaDelGruppo(piano, stato, chiave, () => null);
}

export interface AnteprimaTogli {
  /** Lo stato dopo `togliGruppo`. */
  stato: StatoRevisione;
  /** I pasti distinti che hanno ancora righe del gruppo (occorrenze effettive, non originali). */
  pasti: number;
  /** I piatti che la cascata toglie perché restano senza righe, contati pasto per pasto. */
  piattiSpariti: number;
}

/**
 * Cosa succede togliendo un gruppo, prima di toglierlo (I3): il dialogo TOGLI non promette
 * l'editor del piatto se il piatto stesso sparisce, e conta i pasti che il gruppo tocca ora.
 */
export function anteprimaTogli(piano: PianoEstratto, stato: StatoRevisione, chiave: string): AnteprimaTogli {
  const dopo = togliGruppo(piano, stato, chiave);
  let pasti = 0;
  let piattiSpariti = 0;
  for (const p of pastiDelPiano(piano, stato)) {
    if (righeDelPasto(p.effettivo).some(({ riga }) => chiaveGruppo(riga) === chiave)) pasti += 1;
    piattiSpariti += p.effettivo.piatti.length - pastoEffettivo(piano, dopo.correzioni, p.settimana, p.giorno, p.indice).piatti.length;
  }
  return { stato: dopo, pasti, piattiSpariti };
}

/**
 * CONFERMA I PASTI: le proposte dei dubbi aperti scritte nelle correzioni come «proposta da me»
 * (`quantitaInferita: true`, spec 8c §D), tutte le chiavi del piano in `pastiConfermati` e il passo
 * dopo, in uno stato solo. La porzione e i cucchiai riempiono le righe ancora irrisolte; l'unità
 * più frequente riscrive tutte le righe del gruppo, tranne quelle q.b., che restano com'erano.
 */
export function confermaTutti(piano: PianoEstratto, stato: StatoRevisione, esistenti: Ingredient[] = []): StatoRevisione {
  let nuovo = stato;
  for (const g of gruppiRighe(piano, stato, esistenti)) {
    if (g.stato !== 'aperto' || g.proposta === null) continue;
    const p = g.proposta;
    nuovo = suOgniRigaDelGruppo(piano, nuovo, g.chiave, (riga) =>
      !quantoBasta(riga) && (p.origine === 'unitaFrequente' || rigaIrrisolta(riga))
        ? { ...riga, quantita: p.quantita, unita: p.unita, quantitaInferita: true }
        : riga);
  }
  return { ...nuovo, pastiConfermati: pastiDelPiano(piano, nuovo).map((x) => x.chiave), passo: 'formati' };
}
