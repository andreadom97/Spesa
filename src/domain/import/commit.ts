import type { Dish, Ingredient, UnitaBase } from '@/domain/types';
import { lunediDi, sommaGiorni } from '@/domain/date';
import type { IngredienteProposto, PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from './types';
import { NOME_PASTO_CONDIMENTI, pastoEffettivo } from './types';
import { abbina, normalizza } from './mapping';

export type RigaTradotta = { quantita: number; unita: UnitaBase } & (
  | { ingredientId: string }
  | { nuovoAlimento: string }
);

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
  piattiDaDisattivare: string[];
  piattiDaCreare: PiattoDaCreare[];
  impostazioni: { settimaneCiclo: number; cicloOrigine: string };
}

export class BozzaIncompletaError extends Error {}

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
 * Regola 1: `abbina` su un ingrediente esistente; se fallisce, lookup fra i nuovi
 * dichiarati in revisione (per `alimento` normalizzato). Prima di dichiararlo davvero
 * nuovo, ritenta `abbina` sul `nome` pulito della proposta: un re-run dopo un commit
 * interrotto trova così l'ingrediente già creato (il cui `nome` in database non è più
 * l'`alimento` grezzo) invece di riproporlo duplicato. Un'unità che non torna con la
 * proposta, o una quantità mai risolta in revisione, fermano tutto.
 */
function risolviRiga(
  riga: RigaEstratta,
  ingredientiEsistenti: Ingredient[],
  ingredientiNuovi: IngredienteProposto[],
  usati: Set<string>,
): RigaTradotta {
  if (riga.quantita === null) {
    throw new BozzaIncompletaError(`Quantità non risolta per "${riga.testoOriginale}"`);
  }
  if (riga.unita === null) {
    throw new BozzaIncompletaError(`Unità non indicata per "${riga.testoOriginale}"`);
  }
  const esistente = abbina(riga.alimento, riga.unita, ingredientiEsistenti);
  if (esistente) return { ingredientId: esistente.id, quantita: riga.quantita, unita: riga.unita };
  const chiave = normalizza(riga.alimento);
  const nuovo = ingredientiNuovi.find((i) => normalizza(i.alimento) === chiave);
  if (!nuovo) throw new BozzaIncompletaError(`Ingrediente non risolto: "${riga.alimento}"`);
  const giaCreato = abbina(nuovo.nome, riga.unita, ingredientiEsistenti);
  if (giaCreato) return { ingredientId: giaCreato.id, quantita: riga.quantita, unita: riga.unita };
  if (riga.unita !== nuovo.unitaBase) {
    throw new BozzaIncompletaError(
      `Unità incompatibile per "${riga.alimento}": la riga usa "${riga.unita}", la proposta "${nuovo.unitaBase}"`,
    );
  }
  usati.add(chiave);
  return { nuovoAlimento: nuovo.alimento, quantita: riga.quantita, unita: riga.unita };
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
    per.set(k, { ...esistente, quantita: esistente.quantita + r.quantita });
  }
  return [...per.values()];
}

function traduciPiatto(
  piatto: PastoEstratto['piatti'][number],
  slotDefId: string,
  ingredientiEsistenti: Ingredient[],
  ingredientiNuovi: IngredienteProposto[],
  usati: Set<string>,
): PiattoInterno {
  return {
    nome: piatto.nome,
    slotDefId,
    descrizione: piatto.descrizione,
    righe: fondiRighe(piatto.righeFisse.map((r) => risolviRiga(r, ingredientiEsistenti, ingredientiNuovi, usati))),
    componenti: piatto.componenti.map((c) => ({
      nome: c.nome,
      // fondiRighe anche qui: due righe sullo stesso ingrediente nella stessa opzione (es.
      // "olio" fisso + "olio" da condimenti che finiscono nella stessa opzione) violerebbero
      // altrimenti l'indice unico dish_ingredient_opzione_unica a valle.
      opzioni: c.opzioni.map((op) => fondiRighe(op.map((r) => risolviRiga(r, ingredientiEsistenti, ingredientiNuovi, usati)))),
    })),
  };
}

/** Regola 3: tutte le righe (fisse e a scelta) del pasto condimenti, appiattite e risolte, nell'ordine dei piatti. */
function righeCondimenti(
  pasto: PastoEstratto,
  ingredientiEsistenti: Ingredient[],
  ingredientiNuovi: IngredienteProposto[],
  usati: Set<string>,
): RigaTradotta[] {
  const righe: RigaEstratta[] = pasto.piatti.flatMap((p) => [
    ...p.righeFisse,
    ...p.componenti.flatMap((c) => c.opzioni.flat()),
  ]);
  return righe.map((r) => risolviRiga(r, ingredientiEsistenti, ingredientiNuovi, usati));
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
  const usati = new Set<string>();
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
        const piatti = effettivo.piatti.map((p) =>
          traduciPiatto(p, slotDefId, ingredientiEsistenti, stato.ingredientiNuovi, usati),
        );
        const lista = slotMap.get(slotDefId) ?? [];
        lista.push(...piatti);
        slotMap.set(slotDefId, lista);
      });

      if (condimentiPasti.length > 0) {
        // Tutti condividono lo stesso nome normalizzato (il check sopra li ha raggruppati), quindi la stessa mappatura.
        const slotTarget = stato.mappaturaPasti[NOME_PASTO_CONDIMENTI];
        if (!slotTarget) throw new BozzaIncompletaError(`Nessuna mappatura per il pasto "${NOME_PASTO_CONDIMENTI}"`);
        const righe = fondiRighe(
          condimentiPasti.flatMap((p) => righeCondimenti(p, ingredientiEsistenti, stato.ingredientiNuovi, usati)),
        );
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
  // esistente ma resta inutilizzato è già escluso: risolviRiga non lo tocca mai) e il cui
  // nome non abbina già un ingrediente esistente (rete di sicurezza esplicita per il
  // re-run: se il fallback per nome in risolviRiga avesse un buco, qui si blocca comunque).
  // L'unità passata deve essere la stessa di risolviRiga (`i.unitaBase`, non null):
  // un'unità unit-agnostic farebbe matchare un omonimo per inclusione con un'unità
  // diversa, escludendo dai-da-creare un ingrediente che una riga ha comunque risolto
  // come nuovoAlimento — l'ingrediente referenziato non verrebbe mai creato.
  const ingredientiDaCreare = stato.ingredientiNuovi.filter(
    (i) => usati.has(normalizza(i.alimento)) && !abbina(i.nome, i.unitaBase, ingredientiEsistenti),
  );

  const cicloOrigine = sommaGiorni(lunediDi(oggi), 7);

  return {
    ingredientiDaCreare,
    piattiDaDisattivare,
    piattiDaCreare,
    impostazioni: { settimaneCiclo: piano.settimane.length, cicloOrigine },
  };
}
