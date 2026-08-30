import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = { create: createMock };
  },
}));

import type { ContestoDispensa } from '@/domain/dispensa-ai';
import { interpretaNota, modelloConfigurato, MODELLO_DEFAULT } from '../dispensa-ai';

const CONTESTO: ContestoDispensa = [
  { id: 'i-riso', nome: 'Riso', unitaBase: 'g', formatoConfezione: 1000, residuo: 400, congelato: false },
];

describe('interpretaNota', () => {
  beforeEach(() => {
    createMock.mockReset();
    delete process.env.DISPENSA_AI_MODEL;
  });

  it('chiama il modello richiesto con nota e contesto nel messaggio', async () => {
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: '{"proposte":[],"nonRiconosciuti":[]}' }],
    });

    await interpretaNota('finito il riso', CONTESTO, 'claude-haiku-4-5');

    const args = createMock.mock.calls[0]![0];
    expect(args.model).toBe('claude-haiku-4-5');
    expect(args.system).toContain('nonRiconosciuti'); // il prompt descrive la forma dell'esito
    const corpo = String(args.messages[0].content);
    expect(corpo).toContain('finito il riso');
    expect(corpo).toContain('i-riso');
  });

  it('estrae il JSON anche dentro un fence markdown', async () => {
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: 'Ecco:\n```json\n{"proposte":[],"nonRiconosciuti":["boh"]}\n```' }],
    });
    const esito = await interpretaNota('boh', CONTESTO, 'claude-haiku-4-5');
    expect(esito).toEqual({ proposte: [], nonRiconosciuti: ['boh'] });
  });

  it('testo senza JSON → lancia (la route lo tradurrà in errore utente)', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'non saprei' }] });
    await expect(interpretaNota('x', CONTESTO, 'claude-haiku-4-5')).rejects.toThrow();
  });

  it('modelloConfigurato: env batte il default', () => {
    expect(modelloConfigurato()).toBe(MODELLO_DEFAULT);
    process.env.DISPENSA_AI_MODEL = 'claude-sonnet-5';
    expect(modelloConfigurato()).toBe('claude-sonnet-5');
    delete process.env.DISPENSA_AI_MODEL;
  });
});
