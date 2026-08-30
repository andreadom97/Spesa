import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();
const streamMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: createMock, stream: streamMock };
    beta = { messages: { stream: streamMock } };
  },
}));

import { estraiPiano, modelloImportConfigurato, MODELLO_DEFAULT_IMPORT, type FileEstrazione } from '../import-ai';

const FOTO: FileEstrazione[] = [{ tipo: 'immagine', mime: 'image/jpeg', base64: 'QUJD' }];

describe('estraiPiano', () => {
  beforeEach(() => {
    createMock.mockReset();
    streamMock.mockReset();
    delete process.env.IMPORT_AI_MODEL;
  });

  it('manda le immagini come blocchi base64 e chiede il JSON dello schema', async () => {
    streamMock.mockReturnValue({ finalMessage: async () => ({ content: [{ type: 'text', text: '{"tipo":"rifiuto","rifiuto":{"archetipo":"solo_macro","motivazione":"x"}}' }] }) });
    await estraiPiano(FOTO, 'claude-sonnet-5');
    const args = streamMock.mock.calls[0]![0];
    expect(args.model).toBe('claude-sonnet-5');
    expect(args.max_tokens).toBe(32000);
    expect(args.system).toContain('giorni_tipo');       // lo schema esteso è nel prompt
    expect(args.system).toContain('quantitaInferita');
    expect(args.system).toContain('compatto');           // il vincolo sul JSON compatto
    expect(args.output_config.format.type).toBe('json_schema');   // structured output
    expect(args.output_config.format.schema.anyOf).toHaveLength(2); // le due forme piano/rifiuto
    expect(args.betas).toContain('structured-outputs-2025-12-15');
    const contenuto = args.messages[0].content;
    expect(contenuto[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } });
    expect(contenuto[contenuto.length - 1].type).toBe('text');
  });

  it('un PDF diventa un blocco document', async () => {
    streamMock.mockReturnValue({ finalMessage: async () => ({ content: [{ type: 'text', text: '{"tipo":"rifiuto","rifiuto":{"archetipo":"solo_macro","motivazione":"x"}}' }] }) });
    await estraiPiano([{ tipo: 'pdf', mime: 'application/pdf', base64: 'QUJD' }], 'claude-sonnet-5');
    const contenuto = streamMock.mock.calls[0]![0].messages[0].content;
    expect(contenuto[0]).toEqual({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' } });
  });

  it('estrae il JSON anche dentro un fence, e lancia senza JSON', async () => {
    streamMock.mockReturnValue({ finalMessage: async () => ({ content: [{ type: 'text', text: 'Ecco:\n```json\n{"a":1}\n```' }] }) });
    expect(await estraiPiano(FOTO, 'claude-sonnet-5')).toEqual({ a: 1 });
    streamMock.mockReturnValue({ finalMessage: async () => ({ content: [{ type: 'text', text: 'boh' }] }) });
    await expect(estraiPiano(FOTO, 'claude-sonnet-5')).rejects.toThrow();
  });

  it('JSON malformato al primo colpo → ritenta una volta e riesce', async () => {
    streamMock
      .mockReturnValueOnce({ finalMessage: async () => ({ content: [{ type: 'text', text: '{"a":[1,2' }] }) })
      .mockReturnValueOnce({ finalMessage: async () => ({ content: [{ type: 'text', text: '{"a":1}' }] }) });
    expect(await estraiPiano(FOTO, 'claude-sonnet-5')).toEqual({ a: 1 });
    expect(streamMock).toHaveBeenCalledTimes(2);
  });

  it('JSON malformato due volte → l\'errore propaga (niente terzo tentativo)', async () => {
    streamMock.mockReturnValue({ finalMessage: async () => ({ content: [{ type: 'text', text: '{"a":[1,2}' }] }) });
    await expect(estraiPiano(FOTO, 'claude-sonnet-5')).rejects.toThrow(SyntaxError);
    expect(streamMock).toHaveBeenCalledTimes(2);
  });

  it('errore API → propaga subito senza retry', async () => {
    streamMock.mockReturnValue({ finalMessage: async () => { throw new Error('rete'); } });
    await expect(estraiPiano(FOTO, 'claude-sonnet-5')).rejects.toThrow('rete');
    expect(streamMock).toHaveBeenCalledTimes(1);
  });

  it('modelloImportConfigurato: env batte il default', () => {
    expect(modelloImportConfigurato()).toBe(MODELLO_DEFAULT_IMPORT);
    process.env.IMPORT_AI_MODEL = 'claude-haiku-4-5';
    expect(modelloImportConfigurato()).toBe('claude-haiku-4-5');
    delete process.env.IMPORT_AI_MODEL;
  });
});
