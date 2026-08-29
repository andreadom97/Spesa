import type { Dish, Ingredient, UnitaBase } from '@/domain/types';
import { lunediDi, sommaGiorni } from '@/domain/date';
import type { IngredienteProposto, PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from './types';
import { pastoEffettivo } from './types';
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

/**
 * Regola 1: `abbina` su un ingrediente esistente, altrimenti lookup fra i nuovi
 * dichiarati in revisione (per `alimento` normalizzato); se nemmeno lì, o se la
 * quantità non è stata risolta in revisione, la bozza è incompleta.
 */
function risolviRiga(
  riga: RigaEstratta,
  ingredientiEsistenti: Ingredient[],
  ingredientiNuovi: IngredienteProposto[],
  usati: Set<string>,
): RigaTradotta {
  if (riga.quantita === null || riga.unita === null) {
    throw new BozzaIncompletaError(`Quantità non risolta per "${riga.testoOriginale}"`);
  }
  const esistente = abbina(riga.alimento, riga.unita, ingredientiEsistenti);
  if (esistente) return { ingredientId: esistente.id, quantita: riga.quantita, unita: riga.unita };
  const chiave = normalizza(riga.alimento);
  const nuovo = ingredientiNuovi.find((i) => normalizza(i.alimento) === chiave);
  if (!nuovo) throw new BozzaIncompletaError(`Ingrediente non risolto: "${riga.alimento}"`);
  usati.add(chiave);
  return { nuovoAlimento: nuovo.alimento, quantita: riga.quantita, unita: riga.unita };
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
    righe: piatto.righeFisse.map((r) => risolviRiga(r, ingredientiEsistenti, ingredientiNuovi, usati)),
    componenti: piatto.componenti.map((c) => ({
      nome: c.nome,
      opzioni: c.opzioni.map((op) => op.map((r) => risolviRiga(r, ingredientiEsistenti, ingredientiNuovi, usati))),
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

function chiaveRiga(r: RigaTradotta): string {
  return 'ingredientId' in r ? r.ingredientId : r.nuovoAlimento;
}

function ordinaRighe(righe: RigaTradotta[]): RigaTradotta[] {
  return [...righe].sort((a, b) => chiaveRiga(a).localeCompare(chiaveRiga(b)));
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
    piatti.map(formaCanonica).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );
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

    for (const giorno of settimana.giorni) {
      const slotMap = new Map<string, PiattoInterno[]>();
      let condimentiPasto: PastoEstratto | null = null;

      giorno.pasti.forEach((_, indice) => {
        const effettivo = pastoEffettivo(piano, stato.correzioni, settimana.numero, giorno.giorno, indice);
        // Pasto svuotato in revisione: nessuna scrittura, nessuna mappatura pretesa.
        if (effettivo.piatti.length === 0) return;
        const norm = normalizza(effettivo.nomeOriginale);
        if (norm === 'condimenti') {
          condimentiPasto = effettivo;
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

      if (condimentiPasto) {
        const pasto: PastoEstratto = condimentiPasto;
        const slotTarget = stato.mappaturaPasti[normalizza(pasto.nomeOriginale)];
        if (!slotTarget) throw new BozzaIncompletaError(`Nessuna mappatura per il pasto "${pasto.nomeOriginale}"`);
        const righe = righeCondimenti(pasto, ingredientiEsistenti, stato.ingredientiNuovi, usati);
        const destinatari = slotMap.get(slotTarget);
        if (destinatari && destinatari.length > 0) {
          for (const d of destinatari) d.righe = [...d.righe, ...righe];
        } else {
          slotMap.set(slotTarget, [
            { nome: 'Condimenti', slotDefId: slotTarget, descrizione: null, righe, componenti: [] },
          ]);
        }
      }

      perGiorno.set(giorno.giorno, slotMap);
    }

    const tuttiGliSlot = new Set<string>();
    for (const slotMap of perGiorno.values()) for (const slot of slotMap.keys()) tuttiGliSlot.add(slot);

    for (const slotDefId of tuttiGliSlot) {
      const giorniConSlot = [...perGiorno.entries()]
        .filter(([, slotMap]) => (slotMap.get(slotDefId)?.length ?? 0) > 0)
        .map(([g]) => g)
        .sort((a, b) => a - b);

      const canoniche = giorniConSlot.map((g) => formaCanonicaLista(perGiorno.get(g)!.get(slotDefId)!));
      const compattabile = canoniche.every((c) => c === canoniche[0]);

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

  const repertorioUsato = new Set<string>();
  const piattiDaCreare: PiattoDaCreare[] = emessi.map(({ settimanaCiclo, giornoCiclo, slotDefId, piatto }) => {
    const match = repertorioEsistente.find(
      (d) =>
        d.fonte === 'nutrizionista' &&
        d.attivo &&
        d.nome === piatto.nome &&
        d.slotDefId === slotDefId &&
        d.settimanaCiclo === settimanaCiclo &&
        d.giornoCiclo === giornoCiclo,
    );
    if (match) repertorioUsato.add(match.id);
    return {
      riusaDishId: match?.id ?? null,
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
  // esistente ma resta inutilizzato è già escluso: risolviRiga non lo tocca mai).
  const ingredientiDaCreare = stato.ingredientiNuovi.filter((i) => usati.has(normalizza(i.alimento)));

  const cicloOrigine = sommaGiorni(lunediDi(oggi), 7);

  return {
    ingredientiDaCreare,
    piattiDaDisattivare,
    piattiDaCreare,
    impostazioni: { settimaneCiclo: piano.settimane.length, cicloOrigine },
  };
}
