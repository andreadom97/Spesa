import type { AreaId, ClasseResiduo, UnitaBase } from '@/domain/types';

/** 'solo_macro' non produce mai un piano: è l'archetipo del rifiuto onesto. */
export type ArchetipoImportabile = 'menu_settimanale' | 'giornata_unica' | 'griglia_alternative' | 'giorni_tipo';

export interface RigaEstratta {
  alimento: string;
  /** null = quantità non in grammi/ml/pz ("q.b.", "1 scatoletta piccola"): la risolve l'utente in revisione. */
  quantita: number | null;
  unita: UnitaBase | null;
  /** true = quantità proposta dal modello per una riga senza grammatura scritta ("q.b."): in revisione va evidenziata e confermata. */
  quantitaInferita: boolean;
  /** Il testo letto dal foglio, mai riscritto: è la garanzia anti-fabbricazione mostrata in revisione. */
  testoOriginale: string;
}

export interface ComponenteEstratto {
  nome: string;
  /** Vincolo letto accanto alle alternative ("1 vv sett"); v1 lo mostra in revisione e basta. */
  nota: string | null;
  /** Ogni opzione è >=1 righe ("ricotta 50g + noci 20g" è UNA opzione). */
  opzioni: RigaEstratta[][];
}

export interface PiattoEstratto {
  nome: string;
  righeFisse: RigaEstratta[];
  componenti: ComponenteEstratto[];
  descrizione: string | null;
}

/** Il nome sintetico del pasto condimenti: condiviso fra mapping.ts e commit.ts, mai duplicato come stringa letterale. */
export const NOME_PASTO_CONDIMENTI = 'condimenti';

export interface PastoEstratto {
  /** Il nome del pasto come scritto nella dieta; 'condimenti' (v. NOME_PASTO_CONDIMENTI) è il pasto sintetico giornaliero. */
  nomeOriginale: string;
  /** >1 = piatti sorella (alternative fra pasti, come nel dominio). */
  piatti: PiattoEstratto[];
}

export interface GiornoEstratto {
  /** 0 = lunedì, come ovunque nel dominio. */
  giorno: number;
  /** Solo per archetipo 'giorni_tipo': il nome dello scenario ("Piano 1"). null per gli altri archetipi. */
  titolo: string | null;
  pasti: PastoEstratto[];
}

export interface SettimanaEstratta {
  /** 1..4, il limite di settimaneCiclo. */
  numero: number;
  giorni: GiornoEstratto[];
}

export interface PianoEstratto {
  archetipo: ArchetipoImportabile;
  fonte: string;
  settimane: SettimanaEstratta[];
  noteEstrazione: string[];
}

export interface RifiutoImport {
  archetipo: 'solo_macro';
  motivazione: string;
}

export type EsitoEstrazione =
  | { tipo: 'piano'; piano: PianoEstratto }
  | { tipo: 'rifiuto'; rifiuto: RifiutoImport };

export interface IngredienteProposto {
  /** Il nome estratto normalizzato: è la chiave che riaggancia le righe all'ingrediente creato. */
  alimento: string;
  nome: string;
  unitaBase: UnitaBase;
  area: AreaId;
  classeResiduo: ClasseResiduo;
  deperibile: boolean;
  formatoConfezione: number;
  /** Facoltativo, euro per confezione; null nelle bozze legacy (v. validaStatoRevisione) e quando l'utente non lo mette. */
  prezzoConfezione: number | null;
}

export type PassoRevisione = 'revisione' | 'formati' | 'riepilogo';

export interface StatoRevisione {
  passo: PassoRevisione;
  /** nomeOriginale (normalizzato) -> slotDefId. */
  mappaturaPasti: Record<string, string>;
  pastiConfermati: string[];
  /** chiavePasto -> pasto editato. Il piano estratto resta immutato. */
  correzioni: Record<string, PastoEstratto>;
  /** Compilati entrando nel passo formati; editati lì. */
  ingredientiNuovi: IngredienteProposto[];
}

export function chiavePasto(settimana: number, giorno: number, indicePasto: number): string {
  return `${settimana}-${giorno}-${indicePasto}`;
}

/** Il pasto con le correzioni della revisione applicate, o l'originale se non toccato. */
export function pastoEffettivo(
  piano: PianoEstratto,
  correzioni: Record<string, PastoEstratto>,
  settimana: number,
  giorno: number,
  indicePasto: number,
): PastoEstratto {
  const chiave = chiavePasto(settimana, giorno, indicePasto);
  if (correzioni[chiave]) return correzioni[chiave];
  const s = piano.settimane.find((x) => x.numero === settimana);
  const g = s?.giorni.find((x) => x.giorno === giorno);
  const p = g?.pasti[indicePasto];
  if (!p) throw new Error(`pastoEffettivo: pasto ${chiave} inesistente nel piano`);
  return p;
}
