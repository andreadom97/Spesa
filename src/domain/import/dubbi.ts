import type { MealSlotDef, UnitaBase } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from './types';
import { chiavePasto, pastoEffettivo } from './types';
import { normalizza, proponiSlot } from './mapping';

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

/** Quantità o unità mancante: le due vanno insieme (valida.ts), ma basta una per bloccare. */
export function rigaIrrisolta(riga: RigaEstratta): boolean {
  return riga.quantita === null || riga.unita === null;
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

export type StatoGruppo = 'aperto' | 'fatto' | 'tolto';

export interface GruppoRighe {
  chiave: string;
  /** Come lo scrive la prima riga del gruppo. */
  alimento: string;
  testoOriginale: string;
  /** `irrisolta` sta in «Da sistemare» e blocca; `inferita` sta in «Da controllare» e non blocca. */
  tipo: 'irrisolta' | 'inferita';
  occorrenze: Occorrenza[];
  stato: StatoGruppo;
  /** Comuni a tutte le righe effettive, se risolte e uguali; altrimenti null. */
  quantita: number | null;
  unita: UnitaBase | null;
  /** L'unità di una riga dello stesso alimento FUORI dal gruppo (decisione 8), o null. */
  unitaFissa: UnitaBase | null;
}

/**
 * L'unità che il piano effettivo conosce già per un alimento (`alimento` normalizzato): la
 * prima riga con l'unità, saltando le righe del gruppo `escludi`. Fuori dal gruppo, e non
 * dentro: altrimenti, risposto un gruppo, la sua stessa unità lo fisserebbe per sempre.
 */
export function unitaNota(piano: PianoEstratto, stato: StatoRevisione, alimento: string, escludi?: string): UnitaBase | null {
  for (const p of pastiDelPiano(piano, stato)) {
    for (const { riga } of righeDelPasto(p.effettivo)) {
      if (normalizza(riga.alimento) !== alimento) continue;
      if (escludi !== undefined && chiaveGruppo(riga) === escludi) continue;
      if (riga.unita !== null) return riga.unita;
    }
  }
  return null;
}

interface Raccolta {
  alimento: string;
  testoOriginale: string;
  originali: Occorrenza[];
  effettive: { riga: RigaEstratta; occorrenza: Occorrenza }[];
  irrisolta: boolean;
  inferita: boolean;
}

/**
 * I gruppi di righe da chiedere (spec 8b §B). Un gruppo esiste se una sua riga originale è
 * irrisolta o inferita, oppure se una sua riga effettiva è irrisolta: la seconda condizione
 * copre le bozze vecchie, dove la Revisione di prima poteva svuotare una quantità, e fa sì
 * che `pronto` non lasci passare una riga irrisolta invisibile.
 */
export function gruppiRighe(piano: PianoEstratto, stato: StatoRevisione): GruppoRighe[] {
  const pasti = pastiDelPiano(piano, stato);
  const perChiave = new Map<string, Raccolta>();
  const raccolta = (riga: RigaEstratta): Raccolta => {
    const chiave = chiaveGruppo(riga);
    let r = perChiave.get(chiave);
    if (!r) {
      r = { alimento: riga.alimento, testoOriginale: riga.testoOriginale, originali: [], effettive: [], irrisolta: false, inferita: false };
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
      if (rigaIrrisolta(riga)) r.irrisolta = true;
      else if (riga.quantitaInferita) r.inferita = true;
    }
  }
  for (const p of pasti) {
    for (const { riga, nomePiatto } of righeDelPasto(p.effettivo)) {
      const r = raccolta(riga);
      r.effettive.push({ riga, occorrenza: occorrenza(p, p.effettivo, nomePiatto) });
      if (rigaIrrisolta(riga)) r.irrisolta = true;
    }
  }

  const gruppi: GruppoRighe[] = [];
  for (const [chiave, r] of perChiave) {
    const tipo = r.irrisolta ? 'irrisolta' : r.inferita ? 'inferita' : null;
    if (tipo === null) continue;
    const righe = r.effettive.map((e) => e.riga);
    const statoGruppo: StatoGruppo = righe.length === 0 ? 'tolto' : righe.some(rigaIrrisolta) ? 'aperto' : 'fatto';
    const prima = righe[0];
    const comuni = prima !== undefined && !rigaIrrisolta(prima)
      && righe.every((x) => x.quantita === prima.quantita && x.unita === prima.unita);
    gruppi.push({
      chiave,
      alimento: r.alimento,
      testoOriginale: r.testoOriginale,
      tipo,
      occorrenze: r.originali.length > 0 ? r.originali : r.effettive.map((e) => e.occorrenza),
      stato: statoGruppo,
      quantita: comuni ? prima.quantita : null,
      unita: comuni ? prima.unita : null,
      unitaFissa: unitaNota(piano, stato, normalizza(r.alimento), chiave),
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
  parti.push(etichettaGiorno(piano, o.giorno, o.titolo), o.nomePasto, o.nomePiatto);
  return parti.join(' · ');
}

/** Il cancello di CONFERMA I PASTI: nessuna riga irrisolta e ogni nome di pasto abbinato. */
export function pronto(piano: PianoEstratto, stato: StatoRevisione, slotDefs: MealSlotDef[]): boolean {
  return gruppiRighe(piano, stato).every((g) => g.stato !== 'aperto')
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
