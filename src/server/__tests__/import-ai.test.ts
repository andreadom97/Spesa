import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: createMock };
  },
}));

import { estraiPiano, modelloImportConfigurato, MODELLO_DEFAULT_IMPORT, type FileEstrazione } from '../import-ai';

const FOTO: FileEstrazione[] = [{ tipo: 'immagine', mime: 'image/jpeg', base64: 'QUJD' }];

describe('estraiPiano', () => {
  beforeEach(() => {
    createMock.mockReset();
    delete process.env.IMPORT_AI_MODEL;
  });

  it('manda le immagini come blocchi base64 e chiede il JSON dello schema', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: '{"tipo":"rifiuto","rifiuto":{"archetipo":"solo_macro","motivazione":"x"}}' }] });
    await estraiPiano(FOTO, 'claude-sonnet-5');
    const args = createMock.mock.calls[0]![0];
    expect(args.model).toBe('claude-sonnet-5');
    expect(args.max_tokens).toBe(32000);
    expect(args.system).toContain('giorni_tipo');       // lo schema esteso è nel prompt
    expect(args.system).toContain('quantitaInferita');
    expect(args.system).toContain('compatto');           // il vincolo sul JSON compatto
    const contenuto = args.messages[0].content;
    expect(contenuto[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } });
    expect(contenuto[contenuto.length - 1].type).toBe('text');
  });

  it('un PDF diventa un blocco document', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: '{"tipo":"rifiuto","rifiuto":{"archetipo":"solo_macro","motivazione":"x"}}' }] });
    await estraiPiano([{ tipo: 'pdf', mime: 'application/pdf', base64: 'QUJD' }], 'claude-sonnet-5');
    const contenuto = createMock.mock.calls[0]![0].messages[0].content;
    expect(contenuto[0]).toEqual({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' } });
  });

  it('estrae il JSON anche dentro un fence, e lancia senza JSON', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'Ecco:\n```json\n{"a":1}\n```' }] });
    expect(await estraiPiano(FOTO, 'claude-sonnet-5')).toEqual({ a: 1 });
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'boh' }] });
    await expect(estraiPiano(FOTO, 'claude-sonnet-5')).rejects.toThrow();
  });

  it('modelloImportConfigurato: env batte il default', () => {
    expect(modelloImportConfigurato()).toBe(MODELLO_DEFAULT_IMPORT);
    process.env.IMPORT_AI_MODEL = 'claude-haiku-4-5';
    expect(modelloImportConfigurato()).toBe('claude-haiku-4-5');
    delete process.env.IMPORT_AI_MODEL;
  });
});
