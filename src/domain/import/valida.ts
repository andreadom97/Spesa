import type { EsitoEstrazione, IngredienteProposto, PassoRevisione, PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from './types';

export class PianoNonValidoError extends Error {
  constructor(percorso: string, motivo: string) {
    super(`Piano estratto non valido (${percorso}): ${motivo}`);
    this.name = 'PianoNonValidoError';
  }
}

const UNITA = new Set(['g', 'ml', 'pz']);

function ogg(v: unknown, percorso: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new PianoNonValidoError(percorso, 'non è un oggetto');
  return v as Record<string, unknown>;
}
function arr(v: unknown, percorso: string): unknown[] {
  if (!Array.isArray(v)) throw new PianoNonValidoError(percorso, 'non è un array');
  return v;
}
function str(v: unknown, percorso: string): string {
  if (typeof v !== 'string') throw new PianoNonValidoError(percorso, 'non è una stringa');
  return v;
}

function validaRiga(v: unknown, percorso: string): RigaEstratta {
  const r = ogg(v, percorso);
  const alimento = str(r.alimento, `${percorso}.alimento`);
  if (alimento.trim() === '') throw new PianoNonValidoError(`${percorso}.alimento`, 'vuoto');
  const testoOriginale = str(r.testoOriginale, `${percorso}.testoOriginale`);
  const quantita = r.quantita;
  const unita = r.unita;
  if (quantita === null) {
    if (unita !== null) throw new PianoNonValidoError(percorso, 'quantita null con unita valorizzata');
  } else {
    if (typeof quantita !== 'number' || !Number.isFinite(quantita) || quantita <= 0)
      throw new PianoNonValidoError(`${percorso}.quantita`, 'non è un numero positivo');
    if (typeof unita !== 'string' || !UNITA.has(unita))
      throw new PianoNonValidoError(`${percorso}.unita`, 'quantita valorizzata con unita mancante o sconosciuta');
  }
  return { alimento, quantita: quantita as number | null, unita: (unita ?? null) as RigaEstratta['unita'], testoOriginale };
}

function validaPasto(v: unknown, percorso: string): PastoEstratto {
  const p = ogg(v, percorso);
  const nomeOriginale = str(p.nomeOriginale, `${percorso}.nomeOriginale`);
  const piatti = arr(p.piatti, `${percorso}.piatti`);
  if (piatti.length === 0) throw new PianoNonValidoError(`${percorso}.piatti`, 'vuoto');
  return {
    nomeOriginale,
    piatti: piatti.map((piatto, i) => {
      const pi = ogg(piatto, `${percorso}.piatti[${i}]`);
      const righeFisse = arr(pi.righeFisse, `${percorso}.piatti[${i}].righeFisse`).map((r, j) =>
        validaRiga(r, `${percorso}.piatti[${i}].righeFisse[${j}]`));
      const componenti = arr(pi.componenti, `${percorso}.piatti[${i}].componenti`).map((c, j) => {
        const co = ogg(c, `${percorso}.piatti[${i}].componenti[${j}]`);
        const opzioni = arr(co.opzioni, `${percorso}.piatti[${i}].componenti[${j}].opzioni`);
        if (opzioni.length < 2) throw new PianoNonValidoError(`${percorso}.piatti[${i}].componenti[${j}]`, 'meno di due opzioni');
        return {
          nome: str(co.nome, `${percorso}.piatti[${i}].componenti[${j}].nome`),
          opzioni: opzioni.map((o, k) => {
            const righe = arr(o, `${percorso}.piatti[${i}].componenti[${j}].opzioni[${k}]`);
            if (righe.length === 0) throw new PianoNonValidoError(`${percorso}.piatti[${i}].componenti[${j}].opzioni[${k}]`, 'opzione vuota');
            return righe.map((r, l) => validaRiga(r, `${percorso}.piatti[${i}].componenti[${j}].opzioni[${k}][${l}]`));
          }),
        };
      });
      if (righeFisse.length === 0 && componenti.length === 0)
        throw new PianoNonValidoError(`${percorso}.piatti[${i}]`, 'piatto senza righe né componenti');
      return {
        nome: str(pi.nome, `${percorso}.piatti[${i}].nome`),
        righeFisse,
        componenti,
        descrizione: pi.descrizione === null ? null : str(pi.descrizione, `${percorso}.piatti[${i}].descrizione`),
      };
    }),
  };
}

const ARCHETIPI = new Set(['menu_settimanale', 'giornata_unica', 'griglia_alternative']);

function validaPiano(v: unknown): PianoEstratto {
  const p = ogg(v, 'piano');
  const archetipo = str(p.archetipo, 'piano.archetipo');
  if (!ARCHETIPI.has(archetipo)) throw new PianoNonValidoError('piano.archetipo', `sconosciuto: ${archetipo}`);
  const settimane = arr(p.settimane, 'piano.settimane');
  if (settimane.length === 0 || settimane.length > 4) throw new PianoNonValidoError('piano.settimane', 'da 1 a 4');
  const numeriSettimana = new Set<number>();
  return {
    archetipo: archetipo as PianoEstratto['archetipo'],
    fonte: str(p.fonte, 'piano.fonte'),
    noteEstrazione: arr(p.noteEstrazione, 'piano.noteEstrazione').map((n, i) => str(n, `piano.noteEstrazione[${i}]`)),
    settimane: settimane.map((s, i) => {
      const se = ogg(s, `piano.settimane[${i}]`);
      const numero = se.numero;
      if (typeof numero !== 'number' || numero < 1 || numero > 4)
        throw new PianoNonValidoError(`piano.settimane[${i}].numero`, 'fuori da 1..4');
      if (numeriSettimana.has(numero)) throw new PianoNonValidoError(`piano.settimane[${i}].numero`, `duplicato: ${numero}`);
      numeriSettimana.add(numero);
      const giorni = arr(se.giorni, `piano.settimane[${i}].giorni`);
      if (giorni.length === 0) throw new PianoNonValidoError(`piano.settimane[${i}].giorni`, 'vuoto');
      const giorniVisti = new Set<number>();
      return {
        numero,
        giorni: giorni.map((g, j) => {
          const gi = ogg(g, `piano.settimane[${i}].giorni[${j}]`);
          const giorno = gi.giorno;
          if (typeof giorno !== 'number' || giorno < 0 || giorno > 6)
            throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].giorno`, 'fuori da 0..6');
          if (giorniVisti.has(giorno))
            throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].giorno`, `duplicato nella settimana: ${giorno}`);
          giorniVisti.add(giorno);
          const pasti = arr(gi.pasti, `piano.settimane[${i}].giorni[${j}].pasti`);
          if (pasti.length === 0) throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].pasti`, 'vuoto');
          return { giorno, pasti: pasti.map((pa, k) => validaPasto(pa, `piano.settimane[${i}].giorni[${j}].pasti[${k}]`)) };
        }),
      };
    }),
  };
}

const PASSI_REVISIONE = new Set<string>(['revisione', 'formati', 'riepilogo']);

/**
 * Validazione strutturale minima di uno `StatoRevisione` letto dal jsonb (mai tipizzato
 * a garanzia dal database): serve solo a distinguere "bozza rivalidabile" da "bozza
 * corrotta", non a rivalidare in profondità ogni `PastoEstratto` dentro `correzioni` (quello
 * lo fa comunque `traduciBozza` a valle, che fallisce onestamente con `BozzaIncompletaError`
 * se una correzione è malformata). Controlla solo: `passo` fra i tre ammessi,
 * `mappaturaPasti` un oggetto di stringhe, `pastiConfermati` un array di stringhe,
 * `correzioni` un oggetto, `ingredientiNuovi` un array.
 */
export function validaStatoRevisione(v: unknown): StatoRevisione {
  const s = ogg(v, 'statoRevisione');
  const passo = str(s.passo, 'statoRevisione.passo');
  if (!PASSI_REVISIONE.has(passo)) throw new PianoNonValidoError('statoRevisione.passo', `sconosciuto: ${passo}`);
  const mappaturaPasti = ogg(s.mappaturaPasti, 'statoRevisione.mappaturaPasti');
  for (const [chiave, valore] of Object.entries(mappaturaPasti)) {
    str(valore, `statoRevisione.mappaturaPasti.${chiave}`);
  }
  const pastiConfermati = arr(s.pastiConfermati, 'statoRevisione.pastiConfermati').map((p, i) =>
    str(p, `statoRevisione.pastiConfermati[${i}]`),
  );
  const correzioni = ogg(s.correzioni, 'statoRevisione.correzioni');
  arr(s.ingredientiNuovi, 'statoRevisione.ingredientiNuovi');
  return {
    passo: passo as PassoRevisione,
    mappaturaPasti: mappaturaPasti as Record<string, string>,
    pastiConfermati,
    correzioni: correzioni as Record<string, PastoEstratto>,
    ingredientiNuovi: s.ingredientiNuovi as IngredienteProposto[],
  };
}

export function validaEsito(v: unknown): EsitoEstrazione {
  const e = ogg(v, 'esito');
  if (e.tipo === 'piano') return { tipo: 'piano', piano: validaPiano(e.piano) };
  if (e.tipo === 'rifiuto') {
    const r = ogg(e.rifiuto, 'rifiuto');
    if (r.archetipo !== 'solo_macro') throw new PianoNonValidoError('rifiuto.archetipo', 'deve essere solo_macro');
    return { tipo: 'rifiuto', rifiuto: { archetipo: 'solo_macro', motivazione: str(r.motivazione, 'rifiuto.motivazione') } };
  }
  throw new PianoNonValidoError('esito.tipo', 'né piano né rifiuto');
}
