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
  const quantitaInferita = r.quantitaInferita === undefined ? false : r.quantitaInferita;
  if (typeof quantitaInferita !== 'boolean')
    throw new PianoNonValidoError(`${percorso}.quantitaInferita`, 'non è un booleano');
  if (quantitaInferita && quantita === null)
    throw new PianoNonValidoError(percorso, 'quantitaInferita senza quantità proposta');
  return { alimento, quantita: quantita as number | null, unita: (unita ?? null) as RigaEstratta['unita'], quantitaInferita, testoOriginale };
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
        const nota = co.nota === undefined || co.nota === null
          ? null
          : str(co.nota, `${percorso}.piatti[${i}].componenti[${j}].nota`);
        return {
          nome: str(co.nome, `${percorso}.piatti[${i}].componenti[${j}].nome`),
          nota,
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

const ARCHETIPI = new Set(['menu_settimanale', 'giornata_unica', 'griglia_alternative', 'giorni_tipo']);

/**
 * La forma del piano: tipi, intervalli e vincoli di ogni singola settimana/giorno/pasto/
 * piatto/riga, con le normalizzazioni dei JSON legacy (titolo/quantitaInferita/nota assenti
 * → null/false/null). Non conosce le regole d'insieme (v. `validaInsiemePiano`): è la parte
 * che vale anche per la pagina di un'estrazione a pagine, che può contenere la sola
 * settimana 2 o un giorno di giorni_tipo senza titolo perché continua dalla precedente.
 */
function validaFormaPiano(v: unknown): PianoEstratto {
  const p = ogg(v, 'piano');
  const archetipo = str(p.archetipo, 'piano.archetipo');
  if (!ARCHETIPI.has(archetipo)) throw new PianoNonValidoError('piano.archetipo', `sconosciuto: ${archetipo}`);
  const settimane = arr(p.settimane, 'piano.settimane');
  if (settimane.length === 0 || settimane.length > 4) throw new PianoNonValidoError('piano.settimane', 'da 1 a 4');
  const giorniTipo = archetipo === 'giorni_tipo';
  const numeriSettimana = new Set<number>();
  const settimaneValidate = settimane.map((s, i) => {
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
        // Per giorni_tipo il tetto (indici contigui da 0) dipende da quanti giorni ha l'insieme.
        if (typeof giorno !== 'number' || giorno < 0 || (!giorniTipo && giorno > 6))
          throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].giorno`, giorniTipo ? `fuori da 0..${giorni.length - 1}` : 'fuori da 0..6');
        if (giorniVisti.has(giorno))
          throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].giorno`, `duplicato nella settimana: ${giorno}`);
        giorniVisti.add(giorno);
        const titoloGrezzo = gi.titolo === undefined || gi.titolo === null ? null : str(gi.titolo, `piano.settimane[${i}].giorni[${j}].titolo`);
        if (!giorniTipo && titoloGrezzo !== null)
          throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].titolo`, 'ammesso solo per giorni_tipo');
        const pasti = arr(gi.pasti, `piano.settimane[${i}].giorni[${j}].pasti`);
        if (pasti.length === 0) throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].pasti`, 'vuoto');
        return { giorno, titolo: titoloGrezzo, pasti: pasti.map((pa, k) => validaPasto(pa, `piano.settimane[${i}].giorni[${j}].pasti[${k}]`)) };
      }),
    };
  });
  return {
    archetipo: archetipo as PianoEstratto['archetipo'],
    fonte: str(p.fonte, 'piano.fonte'),
    noteEstrazione: arr(p.noteEstrazione, 'piano.noteEstrazione').map((n, i) => str(n, `piano.noteEstrazione[${i}]`)),
    settimane: settimaneValidate,
  };
}

/**
 * Le regole d'insieme, quelle che hanno senso solo sul piano intero: settimane contigue
 * da 1; giorni_tipo con una sola settimana (numero 1), giorni indicizzati in modo contiguo
 * da 0 e titolo obbligatorio su ogni giorno.
 */
function validaInsiemePiano(piano: PianoEstratto): void {
  const giorniTipo = piano.archetipo === 'giorni_tipo';
  if (giorniTipo && piano.settimane.length !== 1)
    throw new PianoNonValidoError('piano.settimane', 'giorni_tipo richiede esattamente una settimana');
  piano.settimane.forEach((settimana, i) => {
    if (giorniTipo && settimana.numero !== 1)
      throw new PianoNonValidoError(`piano.settimane[${i}].numero`, 'giorni_tipo richiede numero 1');
    settimana.giorni.forEach((giorno, j) => {
      const limiteGiorno = settimana.giorni.length - 1;
      if (giorniTipo && giorno.giorno > limiteGiorno)
        throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].giorno`, `fuori da 0..${limiteGiorno}`);
      if (giorniTipo && (giorno.titolo === null || giorno.titolo.trim() === ''))
        throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].titolo`, 'obbligatorio per giorni_tipo');
    });
  });
  const numeri = piano.settimane
    .map((s) => s.numero)
    .sort((a, b) => a - b);
  if (numeri.some((n, i) => n !== i + 1))
    throw new PianoNonValidoError('piano.settimane', 'numeri non contigui da 1');
}

/**
 * Il piano di UNA pagina di un'estrazione a pagine (spec 2026-09-05 §2.3): stessa forma e
 * stesse normalizzazioni legacy di `validaEsito`, senza le regole d'insieme, che la fusione
 * non può garantire per la singola pagina e che `validaEsito` verifica sul piano fuso.
 */
export function validaPianoParziale(v: unknown): PianoEstratto {
  return validaFormaPiano(v);
}

function validaPiano(v: unknown): PianoEstratto {
  const piano = validaFormaPiano(v);
  validaInsiemePiano(piano);
  return piano;
}

const PASSI_REVISIONE = new Set<string>(['revisione', 'formati', 'riepilogo']);

/**
 * Validazione strutturale minima di uno `StatoRevisione` letto dal jsonb (mai tipizzato
 * a garanzia dal database): serve solo a distinguere "bozza rivalidabile" da "bozza
 * corrotta", non a rivalidare in profondità ogni `PastoEstratto` dentro `correzioni` (quello
 * lo fa comunque `traduciBozza` a valle, che fallisce onestamente con `BozzaIncompletaError`
 * se una correzione è malformata). Controlla solo: `passo` fra i tre ammessi,
 * `mappaturaPasti` un oggetto di stringhe, `pastiConfermati` un array di stringhe,
 * `correzioni` un oggetto, `ingredientiNuovi` un array di oggetti. L'unica
 * normalizzazione legacy è `prezzoConfezione` degli ingredienti nuovi: assente nelle
 * bozze salvate prima della migrazione 0011 → `null`; se presente dev'essere `null` o
 * un numero positivo, come il `check (prezzo_confezione > 0)` della colonna.
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
  const ingredientiNuovi = arr(s.ingredientiNuovi, 'statoRevisione.ingredientiNuovi').map((i, k) => {
    const percorso = `statoRevisione.ingredientiNuovi[${k}]`;
    const ing = ogg(i, percorso);
    const prezzo = ing.prezzoConfezione;
    if (prezzo !== undefined && prezzo !== null && (typeof prezzo !== 'number' || !Number.isFinite(prezzo) || prezzo <= 0))
      throw new PianoNonValidoError(`${percorso}.prezzoConfezione`, 'non è un numero positivo');
    return { ...ing, prezzoConfezione: prezzo ?? null } as IngredienteProposto;
  });
  return {
    passo: passo as PassoRevisione,
    mappaturaPasti: mappaturaPasti as Record<string, string>,
    pastiConfermati,
    correzioni: correzioni as Record<string, PastoEstratto>,
    ingredientiNuovi,
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
