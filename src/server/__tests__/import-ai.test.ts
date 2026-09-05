/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import type { IndiceEstrazione, PaginaIndice } from '@/domain/import/indice';
import { validaEsito } from '@/domain/import/valida';

/**
 * Finto client Anthropic: `beta.messages.stream(params)` registra i parametri e risponde con
 * la prossima voce della coda; conta le chiamate in volo (per misurare la concorrenza) e
 * registra le opzioni passate a `withOptions`. Nessuna rete.
 */
const finto = vi.hoisted(() => {
  type Usage = Record<string, number | null>;
  type Voce =
    | { corpo: unknown; usage?: Usage }
    | { errore: Error }
    | { perChiamata: (params: { messages: { content: { type: string; text?: string }[] }[] }) => unknown };
  const USO_DEFAULT: Usage = { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 30, cache_creation_input_tokens: 20 };
  const stato = {
    risposte: [] as Voce[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chiamate: [] as any[],
    inVolo: 0,
    massimoInVolo: 0,
    ritardoMs: 0,
  };
  const stream = vi.fn((params: unknown) => {
    stato.chiamate.push(params);
    const voce = stato.risposte.shift();
    return {
      finalMessage: async () => {
        stato.inVolo++;
        stato.massimoInVolo = Math.max(stato.massimoInVolo, stato.inVolo);
        await new Promise((r) => setTimeout(r, stato.ritardoMs));
        stato.inVolo--;
        if (!voce) throw new Error('nessuna risposta finta in coda');
        if ('errore' in voce) throw voce.errore;
        const corpo = 'perChiamata' in voce ? voce.perChiamata(params as never) : voce.corpo;
        const usage = 'usage' in voce && voce.usage ? voce.usage : USO_DEFAULT;
        const testo = typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
        return { content: [{ type: 'text', text: testo }], usage };
      },
    };
  });
  const withOptions = vi.fn();
  const client = { beta: { messages: { stream } }, withOptions };
  withOptions.mockImplementation(() => client);
  const azzera = () => {
    stato.risposte = [];
    stato.chiamate = [];
    stato.inVolo = 0;
    stato.massimoInVolo = 0;
    stato.ritardoMs = 0;
    stream.mockClear();
    withOptions.mockClear();
  };
  return { stato, stream, withOptions, client, azzera, USO_DEFAULT };
});

vi.mock('@/server/anthropic', async (importa) => {
  const vero = await importa<typeof import('@/server/anthropic')>();
  return { ...vero, clientAnthropic: () => finto.client };
});

import {
  concorrenzaImportConfigurata,
  effortImportConfigurato,
  estraiIndice,
  estraiPagina,
  estraiPiano,
  estraiPianoAPagine,
  modelloImportConfigurato,
  MODELLO_DEFAULT_IMPORT,
  type FileEstrazione,
} from '../import-ai';

const FOTO: FileEstrazione[] = [{ tipo: 'immagine', mime: 'image/jpeg', base64: 'QUJD' }];
const RIFIUTO = { tipo: 'rifiuto', rifiuto: { archetipo: 'solo_macro', motivazione: 'solo macro' } };

function foto(n: number): FileEstrazione[] {
  return Array.from({ length: n }, (_, i) => ({ tipo: 'immagine' as const, mime: 'image/jpeg', base64: `Rk9UTw${i}` }));
}

/** Le voci dell'indice per il giorno (settimana, giorno) del fixture: i nomi dei pasti nell'ordine. */
function voce(settimana: number, giorno: number) {
  const g = PIANO_MENU_SETTIMANALE.settimane.find((s) => s.numero === settimana)!.giorni.find((x) => x.giorno === giorno)!;
  return { settimana, giorno, titolo: null, pasti: g.pasti.map((p) => p.nomeOriginale) };
}

function indiceDi(pagine: Partial<PaginaIndice>[], extra: Partial<IndiceEstrazione> = {}) {
  return {
    tipo: 'indice',
    indice: {
      archetipo: 'menu_settimanale',
      fonte: 'fixture sintetico',
      noteEstrazione: ['dati inventati per i test'],
      pagine: pagine.map((p, k) => ({ pagina: k + 1, continuaDallaPrecedente: false, contenuto: [], ...p })),
      ...extra,
    },
  };
}

/** Il piano parziale di una pagina: il solo giorno (settimana, giorno) del fixture, nella forma della v1. */
function pianoDelGiorno(settimana: number, giorno: number) {
  const s = PIANO_MENU_SETTIMANALE.settimane.find((x) => x.numero === settimana)!;
  const g = s.giorni.find((x) => x.giorno === giorno)!;
  return {
    tipo: 'piano',
    piano: { archetipo: 'menu_settimanale', fonte: 'fixture sintetico', noteEstrazione: [], settimane: [{ numero: settimana, giorni: [structuredClone(g)] }] },
  };
}

/** I tre giorni del fixture (settimana 1: giorni 0 e 1; settimana 2: giorno 0), uno per pagina. */
const GIORNI_FIXTURE: [number, number][] = [[1, 0], [1, 1], [2, 0]];

function numeroPagina(params: { messages: { content: { type: string; text?: string }[] }[] }): number {
  const testo = params.messages[0].content.find((b) => b.type === 'text')?.text ?? '';
  const m = /pagina (\d+) di \d+/.exec(testo);
  if (!m) throw new Error(`istruzione senza numero di pagina: ${testo}`);
  return Number(m[1]);
}

function blocchiPagina(params: { messages: { content: { type: string }[] }[] }) {
  return params.messages[0].content.filter((b) => b.type !== 'text');
}

beforeEach(() => {
  finto.azzera();
  delete process.env.IMPORT_AI_MODEL;
  delete process.env.IMPORT_AI_EFFORT;
  delete process.env.IMPORT_CONCORRENZA;
});

describe('estraiPiano (v1, una chiamata)', () => {
  it('manda le immagini come blocchi base64 e chiede il JSON dello schema', async () => {
    finto.stato.risposte.push({ corpo: RIFIUTO });
    await estraiPiano(FOTO, 'claude-sonnet-5');
    const args = finto.stato.chiamate[0];
    expect(args.model).toBe('claude-sonnet-5');
    expect(args.max_tokens).toBe(32000);
    expect(args.system).toContain('giorni_tipo');       // lo schema esteso è nel prompt
    expect(args.system).toContain('quantitaInferita');
    expect(args.system).toContain('compatto');           // il vincolo sul JSON compatto
    expect(args.output_config.format.type).toBe('json_schema');   // structured output
    expect(args.output_config.format.schema.anyOf).toHaveLength(2); // le due forme piano/rifiuto
    expect(args.output_config.format.schema.anyOf[0].properties.tipo.enum).toEqual(['piano']);
    expect(args.betas).toContain('structured-outputs-2025-12-15');
    const contenuto = args.messages[0].content;
    // system → pagine → testo, cache_control sull'ultimo blocco pagina (qui l'unico)
    expect(contenuto[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' }, cache_control: { type: 'ephemeral' } });
    expect(contenuto[contenuto.length - 1].type).toBe('text');
  });

  it('un PDF diventa un blocco document', async () => {
    finto.stato.risposte.push({ corpo: RIFIUTO });
    await estraiPiano([{ tipo: 'pdf', mime: 'application/pdf', base64: 'QUJD' }], 'claude-sonnet-5');
    const contenuto = finto.stato.chiamate[0].messages[0].content;
    expect(contenuto[0]).toEqual({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' }, cache_control: { type: 'ephemeral' } });
  });

  it('estrae il JSON anche dentro un fence, e lancia senza JSON', async () => {
    finto.stato.risposte.push({ corpo: 'Ecco:\n```json\n{"a":1}\n```' });
    expect(await estraiPiano(FOTO, 'claude-sonnet-5')).toEqual({ a: 1 });
    finto.stato.risposte.push({ corpo: 'boh' }, { corpo: 'boh' });
    await expect(estraiPiano(FOTO, 'claude-sonnet-5')).rejects.toThrow();
  });

  it('JSON malformato al primo colpo → ritenta una volta e riesce', async () => {
    finto.stato.risposte.push({ corpo: '{"a":[1,2' }, { corpo: '{"a":1}' });
    expect(await estraiPiano(FOTO, 'claude-sonnet-5')).toEqual({ a: 1 });
    expect(finto.stream).toHaveBeenCalledTimes(2);
  });

  it('JSON malformato due volte → l\'errore propaga (niente terzo tentativo)', async () => {
    finto.stato.risposte.push({ corpo: '{"a":[1,2}' }, { corpo: '{"a":[1,2}' });
    await expect(estraiPiano(FOTO, 'claude-sonnet-5')).rejects.toThrow(SyntaxError);
    expect(finto.stream).toHaveBeenCalledTimes(2);
  });

  it('errore API → propaga subito senza retry', async () => {
    finto.stato.risposte.push({ errore: new Error('rete') });
    await expect(estraiPiano(FOTO, 'claude-sonnet-5')).rejects.toThrow('rete');
    expect(finto.stream).toHaveBeenCalledTimes(1);
  });

  it('modelloImportConfigurato: env batte il default', () => {
    expect(modelloImportConfigurato()).toBe(MODELLO_DEFAULT_IMPORT);
    process.env.IMPORT_AI_MODEL = 'claude-haiku-4-5';
    expect(modelloImportConfigurato()).toBe('claude-haiku-4-5');
  });
});

describe('configurazione', () => {
  it('concorrenzaImportConfigurata: default 4, valore non valido → 4, minimo 1, letta a ogni chiamata', () => {
    expect(concorrenzaImportConfigurata()).toBe(4);
    process.env.IMPORT_CONCORRENZA = 'abc';
    expect(concorrenzaImportConfigurata()).toBe(4);
    process.env.IMPORT_CONCORRENZA = '';
    expect(concorrenzaImportConfigurata()).toBe(4);
    process.env.IMPORT_CONCORRENZA = '2';
    expect(concorrenzaImportConfigurata()).toBe(2);
    process.env.IMPORT_CONCORRENZA = '0';
    expect(concorrenzaImportConfigurata()).toBe(1);
  });

  it('effortImportConfigurato: solo low/medium/high, altrimenti assente', () => {
    expect(effortImportConfigurato()).toBeUndefined();
    process.env.IMPORT_AI_EFFORT = 'low';
    expect(effortImportConfigurato()).toBe('low');
    process.env.IMPORT_AI_EFFORT = 'medium';
    expect(effortImportConfigurato()).toBe('medium');
    process.env.IMPORT_AI_EFFORT = 'high';
    expect(effortImportConfigurato()).toBe('high');
    process.env.IMPORT_AI_EFFORT = 'xhigh';
    expect(effortImportConfigurato()).toBeUndefined();
  });

  it('IMPORT_AI_EFFORT impostata → output_config.effort su indice, pagine e v1; assente altrimenti', async () => {
    const indice = indiceDi([{ contenuto: [voce(1, 0)] }, { contenuto: [voce(1, 1)] }]);
    finto.stato.risposte.push({ corpo: indice }, { corpo: pianoDelGiorno(1, 0) }, { corpo: RIFIUTO });
    await estraiIndice(foto(2), 'claude-opus-5');
    await estraiPagina(foto(2), indice.indice.pagine[0], indice.indice as IndiceEstrazione, 'claude-opus-5');
    await estraiPiano(FOTO, 'claude-opus-5');
    for (const c of finto.stato.chiamate) expect(c.output_config).not.toHaveProperty('effort');

    finto.azzera();
    process.env.IMPORT_AI_EFFORT = 'low';
    finto.stato.risposte.push({ corpo: indice }, { corpo: pianoDelGiorno(1, 0) }, { corpo: RIFIUTO });
    await estraiIndice(foto(2), 'claude-opus-5');
    await estraiPagina(foto(2), indice.indice.pagine[0], indice.indice as IndiceEstrazione, 'claude-opus-5');
    await estraiPiano(FOTO, 'claude-opus-5');
    expect(finto.stato.chiamate).toHaveLength(3);
    for (const c of finto.stato.chiamate) expect(c.output_config.effort).toBe('low');
  });
});

describe('estraiIndice ed estraiPagina', () => {
  const files = foto(3);
  const indice = indiceDi([
    { contenuto: [voce(1, 0)] },
    { continuaDallaPrecedente: true, contenuto: [voce(1, 1)] },
    { contenuto: [] },
  ]);

  it('ordine dei blocchi system → pagine → testo, cache_control SOLO sull\'ultimo blocco pagina, prefisso identico fra indice e pagina', async () => {
    finto.stato.risposte.push({ corpo: indice }, { corpo: pianoDelGiorno(1, 1) });
    await estraiIndice(files, 'claude-sonnet-5');
    await estraiPagina(files, indice.indice.pagine[1], indice.indice as IndiceEstrazione, 'claude-sonnet-5');
    const [ind, pag] = finto.stato.chiamate;

    for (const c of [ind, pag]) {
      const contenuto = c.messages[0].content;
      expect(contenuto).toHaveLength(4);
      expect(contenuto.slice(0, 3).map((b: { type: string }) => b.type)).toEqual(['image', 'image', 'image']);
      expect(contenuto.slice(0, 3).map((b: { source: { data: string } }) => b.source.data)).toEqual(['Rk9UTw0', 'Rk9UTw1', 'Rk9UTw2']);
      expect(contenuto[0]).not.toHaveProperty('cache_control');
      expect(contenuto[1]).not.toHaveProperty('cache_control');
      expect(contenuto[2].cache_control).toEqual({ type: 'ephemeral' });
      expect(contenuto[3].type).toBe('text');
      expect(contenuto[3]).not.toHaveProperty('cache_control');
      expect(c.messages).toHaveLength(1);
      expect(c.messages[0].role).toBe('user');
    }
    // Il prefisso cacheabile è byte-identico: stesso system, stessi blocchi pagina; cambia solo il testo.
    expect(ind.system).toBe(pag.system);
    expect(JSON.stringify(blocchiPagina(ind))).toBe(JSON.stringify(blocchiPagina(pag)));
    expect(ind.messages[0].content[3].text).not.toBe(pag.messages[0].content[3].text);
  });

  it('indice: max_tokens 4000, schema dedicato (indice | rifiuto), istruzione che numera le pagine 1..N', async () => {
    finto.stato.risposte.push({ corpo: indice });
    const esito = await estraiIndice(files, 'claude-sonnet-5');
    const args = finto.stato.chiamate[0];
    expect(args.model).toBe('claude-sonnet-5');
    expect(args.max_tokens).toBe(4000);
    expect(args.betas).toContain('structured-outputs-2025-12-15');
    expect(args.output_config.format.type).toBe('json_schema');
    const schema = args.output_config.format.schema;
    expect(schema.anyOf).toHaveLength(2);
    expect(schema.anyOf[0].properties.tipo.enum).toEqual(['indice']);
    expect(schema.anyOf[0].properties.indice.required).toEqual(expect.arrayContaining(['archetipo', 'fonte', 'noteEstrazione', 'pagine']));
    expect(schema.anyOf[0].properties.indice.properties.pagine.items.required).toEqual(expect.arrayContaining(['pagina', 'continuaDallaPrecedente', 'contenuto']));
    expect(schema.anyOf[0].properties.indice.properties.pagine.items.properties.contenuto.items.required).toEqual(expect.arrayContaining(['settimana', 'giorno', 'titolo', 'pasti']));
    expect(schema.anyOf[1].properties.tipo.enum).toEqual(['rifiuto']);
    const testo = args.messages[0].content[3].text;
    expect(testo).toMatch(/1 a 3/);
    expect(testo).toContain('continuaDallaPrecedente');
    expect(testo).toMatch(/contenuto/);
    expect(testo).toMatch(/inventare/i);
    expect(esito.grezzo).toEqual(indice);
    expect(esito.uso).toMatchObject({ chiamate: 1, inputTokens: 100, outputTokens: 50, cacheLetti: 30, cacheScritti: 20 });
    expect(esito.uso.durataMs).toBeGreaterThanOrEqual(0);
  });

  it('pagina: max_tokens 32000, schema v1, istruzione con pagina k di N, archetipo e voci; withOptions({ maxRetries: 4 })', async () => {
    finto.stato.risposte.push({ corpo: pianoDelGiorno(1, 1) });
    const esito = await estraiPagina(files, indice.indice.pagine[1], indice.indice as IndiceEstrazione, 'claude-sonnet-5');
    expect(finto.withOptions).toHaveBeenCalledWith({ maxRetries: 4 });
    const args = finto.stato.chiamate[0];
    expect(args.max_tokens).toBe(32000);
    expect(args.output_config.format.schema.anyOf[0].properties.tipo.enum).toEqual(['piano']);
    const testo = args.messages[0].content[3].text;
    expect(testo).toContain('SOLO la pagina 2 di 3');
    expect(testo).toContain('menu_settimanale');
    expect(testo).toMatch(/settimana 1/);
    expect(testo).toMatch(/giorno 1/);
    expect(testo).toContain('colazione');
    expect(testo).toContain('cena');
    expect(testo).toMatch(/altre pagine/i);
    expect(testo).toMatch(/precedente/); // continuaDallaPrecedente: true → istruzione sulla coda del pasto
    expect(esito.grezzo).toEqual(pianoDelGiorno(1, 1));
  });

  it('pagina senza continuaDallaPrecedente: nessuna istruzione sulla coda; giorni_tipo cita il titolo', async () => {
    const giorniTipo = indiceDi([{ contenuto: [{ settimana: 1, giorno: 0, titolo: 'Piano 1', pasti: ['colazione'] }] }], { archetipo: 'giorni_tipo' });
    finto.stato.risposte.push({ corpo: RIFIUTO });
    await estraiPagina(foto(1), giorniTipo.indice.pagine[0], giorniTipo.indice as IndiceEstrazione, 'claude-sonnet-5');
    const testo = finto.stato.chiamate[0].messages[0].content[1].text;
    expect(testo).toContain('SOLO la pagina 1 di 1');
    expect(testo).toContain('giorni_tipo');
    expect(testo).toContain('Piano 1');
    expect(testo).not.toMatch(/continua/i);
  });

  it('indice non nel JSON → nessun indice cercato nell\'estrazione: estraiIndice non valida (lo fa l\'orchestratore)', async () => {
    finto.stato.risposte.push({ corpo: { tipo: 'indice', indice: 'rotto' } });
    const esito = await estraiIndice(files, 'claude-sonnet-5');
    expect(esito.grezzo).toEqual({ tipo: 'indice', indice: 'rotto' });
  });
});

describe('estraiPianoAPagine', () => {
  it('1 file → una sola chiamata con lo schema v1, nessun indice, uso della singola chiamata', async () => {
    finto.stato.risposte.push({ corpo: RIFIUTO, usage: { input_tokens: 7, output_tokens: 3, cache_read_input_tokens: null, cache_creation_input_tokens: null } });
    const esito = await estraiPianoAPagine(FOTO, 'claude-sonnet-5');
    expect(finto.stream).toHaveBeenCalledTimes(1);
    expect(finto.stato.chiamate[0].max_tokens).toBe(32000);
    expect(finto.stato.chiamate[0].output_config.format.schema.anyOf[0].properties.tipo.enum).toEqual(['piano']);
    expect(esito.grezzo).toEqual(RIFIUTO);
    expect(esito.uso).toMatchObject({ chiamate: 1, inputTokens: 7, outputTokens: 3, cacheLetti: 0, cacheScritti: 0 });
  });

  it('rifiuto dall\'indice → una chiamata sola, nessuna pagina, grezzo = rifiuto', async () => {
    finto.stato.risposte.push({ corpo: RIFIUTO });
    const esito = await estraiPianoAPagine(foto(3), 'claude-sonnet-5');
    expect(finto.stream).toHaveBeenCalledTimes(1);
    expect(finto.stato.chiamate[0].max_tokens).toBe(4000);
    expect(esito.grezzo).toEqual(RIFIUTO);
    expect(esito.uso.chiamate).toBe(1);
  });

  it('indice non valido → PianoNonValidoError propaga, nessuna chiamata di pagina', async () => {
    finto.stato.risposte.push({ corpo: { tipo: 'indice', indice: 'rotto' } });
    await expect(estraiPianoAPagine(foto(2), 'claude-sonnet-5')).rejects.toThrow(/non valido/);
    expect(finto.stream).toHaveBeenCalledTimes(1);
  });

  it('le pagine con contenuto vuoto non generano chiamate; le altre sì, ognuna per la propria pagina', async () => {
    finto.stato.risposte.push(
      { corpo: indiceDi([{ contenuto: [] }, { contenuto: [voce(1, 0)] }, { contenuto: [] }, { contenuto: [voce(1, 1)] }]) },
      { perChiamata: (p) => (numeroPagina(p) === 2 ? pianoDelGiorno(1, 0) : pianoDelGiorno(1, 1)) },
      { perChiamata: (p) => (numeroPagina(p) === 2 ? pianoDelGiorno(1, 0) : pianoDelGiorno(1, 1)) },
    );
    const esito = await estraiPianoAPagine(foto(4), 'claude-sonnet-5');
    expect(finto.stream).toHaveBeenCalledTimes(3);
    expect(finto.stato.chiamate.slice(1).map(numeroPagina).sort()).toEqual([2, 4]);
    expect(esito.uso.chiamate).toBe(3);
    const piano = validaEsito(esito.grezzo);
    expect(piano.tipo).toBe('piano');
    if (piano.tipo === 'piano') expect(piano.piano.settimane[0].giorni.map((g) => g.giorno)).toEqual([0, 1]);
  });

  it('con concorrenza 2 e 5 pagine non vuote, al massimo 2 chiamate in volo insieme', async () => {
    finto.stato.ritardoMs = 5;
    finto.stato.risposte.push({ corpo: indiceDi(Array.from({ length: 5 }, () => ({ contenuto: [voce(1, 0)] }))) });
    for (let i = 0; i < 5; i++) finto.stato.risposte.push({ corpo: pianoDelGiorno(1, 0) });
    await estraiPianoAPagine(foto(5), 'claude-sonnet-5', { concorrenza: 2 });
    expect(finto.stream).toHaveBeenCalledTimes(6);
    expect(finto.stato.massimoInVolo).toBe(2);
  });

  it('senza opzioni la concorrenza viene da IMPORT_CONCORRENZA', async () => {
    process.env.IMPORT_CONCORRENZA = '1';
    finto.stato.ritardoMs = 5;
    finto.stato.risposte.push({ corpo: indiceDi(Array.from({ length: 3 }, () => ({ contenuto: [voce(1, 0)] }))) });
    for (let i = 0; i < 3; i++) finto.stato.risposte.push({ corpo: pianoDelGiorno(1, 0) });
    await estraiPianoAPagine(foto(3), 'claude-sonnet-5');
    expect(finto.stato.massimoInVolo).toBe(1);
  });

  it('una pagina che lancia → l\'intera estrazione lancia (nessun piano parziale)', async () => {
    finto.stato.risposte.push(
      { corpo: indiceDi([{ contenuto: [voce(1, 0)] }, { contenuto: [voce(1, 1)] }]) },
      { corpo: pianoDelGiorno(1, 0) },
      { errore: new Error('rate limit esaurito') },
    );
    await expect(estraiPianoAPagine(foto(2), 'claude-sonnet-5')).rejects.toThrow('rate limit esaurito');
  });

  it('una pagina che risponde con un rifiuto o un piano malformato → PianoNonValidoError', async () => {
    finto.stato.risposte.push({ corpo: indiceDi([{ contenuto: [voce(1, 0)] }]) }, { corpo: RIFIUTO });
    await expect(estraiPianoAPagine(foto(1).concat(foto(1)), 'claude-sonnet-5')).rejects.toThrow(/non valido/);
  });

  it('JSON malformato su una pagina → ritenta quella pagina una volta; chiamate conta le riuscite', async () => {
    finto.stato.risposte.push(
      { corpo: indiceDi([{ contenuto: [voce(1, 0)] }]) },
      { corpo: '{"tipo":"piano"' },
      { corpo: pianoDelGiorno(1, 0) },
    );
    const esito = await estraiPianoAPagine(foto(2), 'claude-sonnet-5');
    expect(finto.stream).toHaveBeenCalledTimes(3);
    expect(esito.uso.chiamate).toBe(2);
  });

  it('uso aggrega token, cache e chiamate; durataMs è il wall-clock della pipeline', async () => {
    finto.stato.ritardoMs = 3;
    finto.stato.risposte.push(
      { corpo: indiceDi([{ contenuto: [voce(1, 0)] }, { contenuto: [voce(1, 1)] }]), usage: { input_tokens: 1000, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 900 } },
      { perChiamata: (p) => pianoDelGiorno(1, numeroPagina(p) - 1), usage: { input_tokens: 10, output_tokens: 200, cache_read_input_tokens: 900, cache_creation_input_tokens: null } },
      { perChiamata: (p) => pianoDelGiorno(1, numeroPagina(p) - 1), usage: { input_tokens: 12, output_tokens: 300, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 } },
    );
    const esito = await estraiPianoAPagine(foto(2), 'claude-sonnet-5');
    expect(esito.uso).toMatchObject({ chiamate: 3, inputTokens: 1022, outputTokens: 600, cacheLetti: 1800, cacheScritti: 900 });
    expect(esito.uso.durataMs).toBeGreaterThanOrEqual(6);
  });

  it('il fixture spezzato per giorni su 3 pagine si rifonde in un piano che passa validaEsito ed è deep-equal all\'originale', async () => {
    finto.stato.risposte.push({ corpo: indiceDi(GIORNI_FIXTURE.map(([s, g]) => ({ contenuto: [voce(s, g)] }))) });
    for (let i = 0; i < GIORNI_FIXTURE.length; i++) {
      finto.stato.risposte.push({ perChiamata: (p) => pianoDelGiorno(...GIORNI_FIXTURE[numeroPagina(p) - 1]) });
    }
    const esito = await estraiPianoAPagine(foto(3), 'claude-sonnet-5', { concorrenza: 2 });
    expect(finto.stream).toHaveBeenCalledTimes(4);
    const valido = validaEsito(esito.grezzo);
    expect(valido).toEqual({ tipo: 'piano', piano: PIANO_MENU_SETTIMANALE });
  });
});
