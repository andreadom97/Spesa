import type { Dish, Ingredient, UnitaBase } from '@/domain/types';
import { lunediDi, sommaGiorni } from '@/domain/date';
import type { IngredienteProposto, PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from './types';
import { NOME_PASTO_CONDIMENTI, pastoEffettivo } from './types';
import { normalizza, quantoBasta } from './mapping';
import {
  cambiUnita, destinazioni, legataAlCommit, pesiProposte, type CambioUnita, type Destino, type PesoProposta,
} from './ingredienti';
import { classeCoerente, convertiPezzi } from './formati-tipici';

/** `quantita` null = «quanto basta» (spec 8c §B). */
export type RigaTradotta = { quantita: number | null; unita: UnitaBase } & (
  | { ingredientId: string }
  | { nuovoAlimento: string }
);

/** Un cambio di unità da fare nel database prima dei piatti (spec 8c §A.4), coi due valori per il riepilogo. */
export interface CambioScritto {
  ingredientId: string;
  nome: string;
  da: 'g' | 'pz';
  a: 'g' | 'pz';
  pesoPezzo: number;
  /** Per cui si moltiplica tutto ciò che è scritto nell'unità di oggi: g per pz (da pz a g) o il suo inverso. */
  fattore: number;
}

export interface PiattoDaCreare {
  /** id esistente da riusare (upsert) se un piatto uguale per nome+slot+giorno+settimana è già lì: idempotenza. */
  riusaDishId: string | null;
  nome: string;
  slotDefId: string;
  settimanaCiclo: number | null;
  giornoCiclo: number | null;
  descrizione: string | null;
  righe: RigaTradotta[];
  componenti: { nome: string; opzioni: RigaTradotta[][] }[];
}

export interface ScrittureImport {
  ingredientiDaCreare: IngredienteProposto[];
  /** Prima dei piatti: le righe dei piatti nuovi sono già nell'unità nuova. Solo i cambi accettati. */
  cambiUnita: CambioScritto[];
  piattiDaDisattivare: string[];
  piattiDaCreare: PiattoDaCreare[];
  impostazioni: { settimaneCiclo: number; cicloOrigine: string };
}

export class BozzaIncompletaError extends Error {}

/** Quello che serve a risolvere le righe: il destino di ogni alimento, i cambi di unità e i pesi decisi. */
interface Contesto {
  /** Per alimento normalizzato: l'ingrediente che hai o la proposta nuova (`destinazioni`). */
  destini: Map<string, Destino>;
  /** Le chiavi `alimento` dei nuovi davvero usati da una riga (regola 2). */
  usati: Set<string>;
  /** Per id: il cambio di unità (o la sola conversione), che fissa l'unità finale dell'ingrediente e il peso. */
  cambi: Map<string, CambioUnita>;
  /** Per `alimento` della proposta: il peso delle proposte con righe in g e in pz. */
  pesi: Map<string, PesoProposta>;
}

/** L'unità finale di un ingrediente che hai: quella della dieta se il cambio è accettato, la sua se «Tienile a pezzi». */
function unitaFinale(e: Ingredient, ctx: Contesto): UnitaBase {
  const c = ctx.cambi.get(e.id);
  return c ? (c.tieni ? c.da : c.a) : e.unitaBase;
}

/**
 * La riga nell'unità finale del suo ingrediente (spec 8c §A.3, ruling 8c Task 8): il q.b. la
 * prende com'è e resta senza numero; fra g e pz si converte col peso di un pezzo, arrotondato;
 * fra altre unità non si inventa una densità: bozza incompleta. `di` dice chi ha l'unità finale,
 * per il messaggio: «l'ingrediente» o «la proposta».
 */
function nellUnita<D extends { ingredientId: string } | { nuovoAlimento: string }>(
  dove: D,
  riga: RigaEstratta,
  finale: UnitaBase,
  peso: number | null,
  di: string,
): RigaTradotta {
  if (riga.quantita === null) return { ...dove, quantita: null, unita: finale };
  const unita = riga.unita as UnitaBase;
  if (unita === finale) return { ...dove, quantita: riga.quantita, unita };
  const convertita = peso ? convertiPezzi(riga.quantita, unita, finale, peso) : null;
  if (convertita === null) {
    throw new BozzaIncompletaError(`Unità incompatibile per "${riga.alimento}": la riga usa "${unita}", ${di} "${finale}"`);
  }
  return { ...dove, quantita: convertita, unita: finale };
}

/** La rappresentazione interna di un piatto durante la costruzione, prima di riuso/disattivazione. */
interface PiattoInterno {
  nome: string;
  slotDefId: string;
  descrizione: string | null;
  righe: RigaTradotta[];
  componenti: { nome: string; opzioni: RigaTradotta[][] }[];
}

/** Un piatto emesso, con settimana/giorno del ciclo già decisi (post-compattazione). */
interface PiattoEmesso {
  settimanaCiclo: number | null;
  giornoCiclo: number | null;
  slotDefId: string;
  piatto: PiattoInterno;
}

function chiaveRiga(r: RigaTradotta): string {
  return 'ingredientId' in r ? r.ingredientId : r.nuovoAlimento;
}

/** Comparatore deterministico su stringhe: niente localeCompare (dipende da locale/ICU). */
function confrontaStringhe(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Regola 1: la riga va dove va il suo alimento (`destinazioni`, uno per alimento): un ingrediente
 * che hai, trovato da `abbina` (anche con un'altra unità, il secondo livello), dalla legata della
 * sua proposta (`legataAlCommit`: la scelta in «È lo stesso di…», o il nome, che un re-run dopo
 * un commit interrotto trova già creato) o per inclusione fra quelli già raggiunti (il ritentativo
 * dopo la RPC); altrimenti la proposta nuova. Sempre nell'unità finale (`nellUnita`). Una riga
 * q.b. (spec 8c §B) passa senza quantità, anche quella con una quantità stimata dal lettore: la
 * stima, quantità e unità, si scarta (correzione S1); una quantità mai risolta, i cucchiai non
 * convertiti o un'unità che non torna fermano tutto.
 */
function risolviRiga(rigaLetta: RigaEstratta, ctx: Contesto): RigaTradotta {
  const qb = quantoBasta(rigaLetta);
  const riga: RigaEstratta = qb ? { ...rigaLetta, quantita: null, unita: null } : rigaLetta;
  if (riga.quantita === null && !qb) {
    throw new BozzaIncompletaError(`Quantità non risolta per "${riga.testoOriginale}"`);
  }
  if (riga.unita === 'cucchiaio' || riga.unita === 'cucchiaino') {
    throw new BozzaIncompletaError(`Cucchiai non convertiti per "${riga.testoOriginale}"`);
  }
  if (riga.unita === null && !qb) {
    throw new BozzaIncompletaError(`Unità non indicata per "${riga.testoOriginale}"`);
  }
  const chiave = normalizza(riga.alimento);
  const destino = ctx.destini.get(chiave);
  if (!destino) throw new BozzaIncompletaError(`Ingrediente non risolto: "${riga.alimento}"`);
  if (destino.tipo === 'esistente') {
    const e = destino.ingrediente;
    return nellUnita({ ingredientId: e.id }, riga, unitaFinale(e, ctx), ctx.cambi.get(e.id)?.pesoPezzo ?? null, "l'ingrediente");
  }
  const nuovo = destino.proposta;
  const tradotta = nellUnita({ nuovoAlimento: nuovo.alimento }, riga, nuovo.unitaBase, ctx.pesi.get(nuovo.alimento)?.pesoPezzo ?? null, 'la proposta');
  ctx.usati.add(chiave);
  return tradotta;
}

/**
 * Fonde righe con la stessa chiave (ingredientId o nuovoAlimento) sommando le quantità:
 * necessario perché una riga fissa e una di condimenti (o due righe di condimenti)
 * possono cadere sullo stesso ingrediente nello stesso piatto, e l'indice unico a valle
 * non tollera due righe per lo stesso (piatto, ingrediente). Unità diverse sulla stessa
 * chiave non si convertono mai: bozza incompleta.
 */
function fondiRighe(righe: RigaTradotta[]): RigaTradotta[] {
  const per = new Map<string, RigaTradotta>();
  for (const r of righe) {
    const k = chiaveRiga(r);
    const esistente = per.get(k);
    if (!esistente) {
      per.set(k, r);
      continue;
    }
    if (esistente.unita !== r.unita) {
      throw new BozzaIncompletaError(`Unità incompatibili per "${k}": "${esistente.unita}" e "${r.unita}"`);
    }
    // Il q.b. non aggiunge niente (spec 8c §B): con un numero vale il numero, due q.b. restano q.b.
    const quantita = esistente.quantita === null ? r.quantita : r.quantita === null ? esistente.quantita : esistente.quantita + r.quantita;
    per.set(k, { ...esistente, quantita });
  }
  return [...per.values()];
}

function traduciPiatto(piatto: PastoEstratto['piatti'][number], slotDefId: string, ctx: Contesto): PiattoInterno {
  return {
    nome: piatto.nome,
    slotDefId,
    descrizione: piatto.descrizione,
    righe: fondiRighe(piatto.righeFisse.map((r) => risolviRiga(r, ctx))),
    componenti: piatto.componenti.map((c) => ({
      nome: c.nome,
      // fondiRighe anche qui: due righe sullo stesso ingrediente nella stessa opzione (es.
      // "olio" fisso + "olio" da condimenti che finiscono nella stessa opzione) violerebbero
      // altrimenti l'indice unico dish_ingredient_opzione_unica a valle.
      opzioni: c.opzioni.map((op) => fondiRighe(op.map((r) => risolviRiga(r, ctx)))),
    })),
  };
}

/** Regola 3: tutte le righe (fisse e a scelta) del pasto condimenti, appiattite e risolte, nell'ordine dei piatti. */
function righeCondimenti(pasto: PastoEstratto, ctx: Contesto): RigaTradotta[] {
  const righe: RigaEstratta[] = pasto.piatti.flatMap((p) => [
    ...p.righeFisse,
    ...p.componenti.flatMap((c) => c.opzioni.flat()),
  ]);
  return righe.map((r) => risolviRiga(r, ctx));
}

function ordinaRighe(righe: RigaTradotta[]): RigaTradotta[] {
  return [...righe].sort((a, b) => confrontaStringhe(chiaveRiga(a), chiaveRiga(b)));
}

/** Forma canonica di un piatto per il confronto di compattazione (regola 4). */
function formaCanonica(p: PiattoInterno): unknown {
  return {
    nome: p.nome,
    righe: ordinaRighe(p.righe),
    componenti: p.componenti.map((c) => ({ nome: c.nome, opzioni: c.opzioni.map(ordinaRighe) })),
  };
}

function formaCanonicaLista(piatti: PiattoInterno[]): string {
  return JSON.stringify(
    piatti.map(formaCanonica).sort((a, b) => confrontaStringhe(JSON.stringify(a), JSON.stringify(b))),
  );
}

function chiaveRiuso(nome: string, slotDefId: string, settimanaCiclo: number | null, giornoCiclo: number | null): string {
  return JSON.stringify([nome, slotDefId, settimanaCiclo, giornoCiclo]);
}

export function traduciBozza(
  piano: PianoEstratto,
  stato: StatoRevisione,
  ingredientiEsistenti: Ingredient[],
  repertorioEsistente: Dish[],
  oggi: string,
): ScrittureImport {
  // I cambi di unità e le righe da convertire fra g e pz (spec 8c §A.3, ruling 8c Task 8): senza
  // il peso di un pezzo non si sa scrivere niente.
  const cambi = cambiUnita(piano, stato, ingredientiEsistenti);
  const pesi = pesiProposte(piano, stato, ingredientiEsistenti);
  const senzaPeso = [...cambi, ...pesi].find((c) => c.pesoPezzo === null);
  if (senzaPeso) throw new BozzaIncompletaError(`Manca il peso di un pezzo di "${senzaPeso.nome}"`);
  const scelti = stato.scelti ?? {};
  const ctx: Contesto = {
    destini: destinazioni(piano, stato, ingredientiEsistenti),
    usati: new Set<string>(),
    cambi: new Map(cambi.map((c) => [c.ingredientId, c])),
    pesi: new Map(pesi.map((p) => [p.alimento, p])),
  };
  const unicaSettimana = piano.settimane.length === 1;
  const emessi: PiattoEmesso[] = [];

  for (const settimana of piano.settimane) {
    const settimanaCiclo = unicaSettimana ? null : settimana.numero;
    // giorno -> slotDefId -> piatti sorella (nell'ordine di estrazione).
    const perGiorno = new Map<number, Map<string, PiattoInterno[]>>();
    const titoloDi = new Map<number, string>();

    for (const giorno of settimana.giorni) {
      if (giorno.titolo !== null) titoloDi.set(giorno.giorno, giorno.titolo);
      const slotMap = new Map<string, PiattoInterno[]>();
      // Più pasti 'condimenti' nello stesso giorno sono un caso limite ma non vanno
      // persi: si accumulano e si fondono tutti verso lo stesso slot mappato.
      const condimentiPasti: PastoEstratto[] = [];

      giorno.pasti.forEach((_, indice) => {
        const effettivo = pastoEffettivo(piano, stato.correzioni, settimana.numero, giorno.giorno, indice);
        // Pasto svuotato in revisione: nessuna scrittura, nessuna mappatura pretesa.
        if (effettivo.piatti.length === 0) return;
        const norm = normalizza(effettivo.nomeOriginale);
        if (norm === NOME_PASTO_CONDIMENTI) {
          condimentiPasti.push(effettivo);
          return;
        }
        const slotDefId = stato.mappaturaPasti[norm];
        if (!slotDefId) throw new BozzaIncompletaError(`Nessuna mappatura per il pasto "${effettivo.nomeOriginale}"`);
        const piatti = effettivo.piatti.map((p) => traduciPiatto(p, slotDefId, ctx));
        const lista = slotMap.get(slotDefId) ?? [];
        lista.push(...piatti);
        slotMap.set(slotDefId, lista);
      });

      if (condimentiPasti.length > 0) {
        // Tutti condividono lo stesso nome normalizzato (il check sopra li ha raggruppati), quindi la stessa mappatura.
        const slotTarget = stato.mappaturaPasti[NOME_PASTO_CONDIMENTI];
        if (!slotTarget) throw new BozzaIncompletaError(`Nessuna mappatura per il pasto "${NOME_PASTO_CONDIMENTI}"`);
        const righe = fondiRighe(condimentiPasti.flatMap((p) => righeCondimenti(p, ctx)));
        const destinatari = slotMap.get(slotTarget);
        if (destinatari && destinatari.length > 0) {
          for (const d of destinatari) d.righe = fondiRighe([...d.righe, ...righe]);
        } else {
          slotMap.set(slotTarget, [
            { nome: 'Condimenti', slotDefId: slotTarget, descrizione: null, righe, componenti: [] },
          ]);
        }
      }

      perGiorno.set(giorno.giorno, slotMap);
    }

    if (piano.archetipo === 'giorni_tipo') {
      // Ogni scenario è un giorno-tipo: i piatti valgono sempre (cicli null),
      // col titolo dello scenario nel nome così restano distinguibili nel
      // planner e nelle chiavi di riuso.
      for (const [g, slotMap] of perGiorno) {
        const titolo = titoloDi.get(g);
        for (const [slotDefId, piatti] of slotMap) {
          for (const piatto of piatti) {
            emessi.push({
              settimanaCiclo: null,
              giornoCiclo: null,
              slotDefId,
              piatto: titolo ? { ...piatto, nome: `${titolo} — ${piatto.nome}` } : piatto,
            });
          }
        }
      }
    } else if (piano.archetipo === 'giornata_unica' || piano.archetipo === 'griglia_alternative') {
      // Questi archetipi impongono all'estrazione un solo giorno (giorno: 0) il cui
      // significato è "vale ogni giorno": niente compattazione da verificare (non c'è
      // altro giorno con cui confrontarsi), il piatto esce sempre con cicli null. Niente
      // prefisso di titolo: quello è solo per giorni_tipo, dove il titolo distingue scenari.
      for (const slotMap of perGiorno.values()) {
        for (const [slotDefId, piatti] of slotMap) {
          for (const piatto of piatti) {
            emessi.push({ settimanaCiclo, giornoCiclo: null, slotDefId, piatto });
          }
        }
      }
    } else {
      const tuttiGliSlot = new Set<string>();
      for (const slotMap of perGiorno.values()) for (const slot of slotMap.keys()) tuttiGliSlot.add(slot);

      for (const slotDefId of tuttiGliSlot) {
        const giorniConSlot = [...perGiorno.entries()]
          .filter(([, slotMap]) => (slotMap.get(slotDefId)?.length ?? 0) > 0)
          .map(([g]) => g)
          .sort((a, b) => a - b);

        const canoniche = giorniConSlot.map((g) => formaCanonicaLista(perGiorno.get(g)!.get(slotDefId)!));
        // Regola 4 (spec): si compatta solo se lo slot è identico in TUTTI i giorni della
        // settimana e la settimana ha almeno 2 giorni. Una settimana da 1 giorno (o uno
        // slot che non ricorre in ogni giorno) non è mai una compattazione vera: il
        // planner lo servirebbe comunque ogni giorno, quindi resta pinnato per giorno.
        const inTuttiIGiorni = giorniConSlot.length === settimana.giorni.length;
        const compattabile = settimana.giorni.length >= 2 && inTuttiIGiorni && canoniche.every((c) => c === canoniche[0]);

        if (compattabile) {
          const rappresentante = giorniConSlot[0];
          for (const piatto of perGiorno.get(rappresentante)!.get(slotDefId)!) {
            emessi.push({ settimanaCiclo, giornoCiclo: null, slotDefId, piatto });
          }
        } else {
          for (const g of giorniConSlot) {
            for (const piatto of perGiorno.get(g)!.get(slotDefId)!) {
              emessi.push({ settimanaCiclo, giornoCiclo: g, slotDefId, piatto });
            }
          }
        }
      }
    }
  }

  // Regola 6: pool di dish esistenti riusabili, consumato (mai un id assegnato due
  // volte): due PiattoDaCreare identici sullo stesso slot non possono agganciare lo
  // stesso riusaDishId, altrimenti l'upsert a valle ne farebbe sparire uno.
  const pool = new Map<string, Dish[]>();
  for (const d of repertorioEsistente) {
    if (d.fonte !== 'nutrizionista' || !d.attivo) continue;
    const k = chiaveRiuso(d.nome, d.slotDefId, d.settimanaCiclo, d.giornoCiclo);
    const lista = pool.get(k);
    if (lista) lista.push(d);
    else pool.set(k, [d]);
  }

  const repertorioUsato = new Set<string>();
  const piattiDaCreare: PiattoDaCreare[] = emessi.map(({ settimanaCiclo, giornoCiclo, slotDefId, piatto }) => {
    const k = chiaveRiuso(piatto.nome, slotDefId, settimanaCiclo, giornoCiclo);
    const candidati = pool.get(k);
    const scelto = candidati && candidati.length > 0 ? candidati.shift()! : null;
    if (scelto) repertorioUsato.add(scelto.id);
    return {
      riusaDishId: scelto?.id ?? null,
      nome: piatto.nome,
      slotDefId,
      settimanaCiclo,
      giornoCiclo,
      descrizione: piatto.descrizione,
      righe: piatto.righe,
      componenti: piatto.componenti,
    };
  });

  const piattiDaDisattivare = repertorioEsistente
    .filter((d) => d.fonte === 'nutrizionista' && d.attivo && !repertorioUsato.has(d.id))
    .map((d) => d.id);

  // Regola 2: solo i nuovi effettivamente usati da almeno una riga (chi non abbina a un
  // esistente ma resta inutilizzato è già escluso: risolviRiga non lo tocca mai) e non legati
  // a un ingrediente esistente da `legataAlCommit` (lo stesso criterio di `risolviRiga`: rete
  // di sicurezza esplicita per il re-run, se il fallback per nome in risolviRiga avesse un
  // buco, qui si blocca comunque). Il criterio deve essere lo stesso di risolviRiga: uno
  // diverso escluderebbe dai-da-creare un ingrediente che una riga ha comunque risolto come
  // nuovoAlimento — l'ingrediente referenziato non verrebbe mai creato.
  // Rete per una bozza salvata prima della correzione della tabella (review finale 8c, I3): un
  // nuovo «intero» in g o ml si scrive «porzionabile», o conterebbe una confezione per grammo.
  const ingredientiDaCreare = stato.ingredientiNuovi
    .filter((i) => ctx.usati.has(normalizza(i.alimento)) && !legataAlCommit(i, ingredientiEsistenti, scelti))
    .map((i) => {
      const classeResiduo = classeCoerente(i.classeResiduo, i.unitaBase);
      return classeResiduo === i.classeResiduo ? i : { ...i, classeResiduo };
    });

  const cicloOrigine = sommaGiorni(lunediDi(oggi), 7);

  return {
    ingredientiDaCreare,
    // Solo i cambi veri e accettati: con «tieni», o con l'unità che resta (`da === a`), la RPC non parte.
    cambiUnita: cambi.filter((c) => !c.tieni && c.da !== c.a).map((c) => ({
      ingredientId: c.ingredientId,
      nome: c.nome,
      da: c.da,
      a: c.a,
      pesoPezzo: c.pesoPezzo!,
      fattore: c.a === 'g' ? c.pesoPezzo! : 1 / c.pesoPezzo!,
    })),
    piattiDaDisattivare,
    piattiDaCreare,
    impostazioni: { settimaneCiclo: piano.settimane.length, cicloOrigine },
  };
}

/** Il riassunto del riepilogo (spec 8c §H). */
export interface RiassuntoScritture {
  piattiNuovi: number;
  piattiAggiornati: number;
  /** I piatti del nutrizionista che escono dal piano: «tolti da Piatti». */
  piattiTolti: number;
  ingredientiNuovi: number;
  cambi: CambioScritto[];
  /** C'è un piano attuale: piatti del nutrizionista attivi, che l'import aggiorna o toglie. */
  pianoAttuale: boolean;
}

export function riassuntoScritture(s: ScrittureImport): RiassuntoScritture {
  const aggiornati = s.piattiDaCreare.filter((p) => p.riusaDishId !== null).length;
  return {
    piattiNuovi: s.piattiDaCreare.length - aggiornati,
    piattiAggiornati: aggiornati,
    piattiTolti: s.piattiDaDisattivare.length,
    ingredientiNuovi: s.ingredientiDaCreare.length,
    cambi: s.cambiUnita,
    pianoAttuale: aggiornati + s.piattiDaDisattivare.length > 0,
  };
}
