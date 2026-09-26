import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LottoPronto, MealSlotDef } from '@/domain/types';
import { IMPOSTAZIONI, INGREDIENTI, PIATTI, cinqueColazioni, dispensaVuota } from '@/domain/__tests__/fixtures';

vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn() }));
vi.mock('../settimana', () => ({ leggiTutteLeSettimane: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));
vi.mock('../pronti', () => ({ leggiPronti: vi.fn() }));
vi.mock('@/components/pannello/versione', () => ({ VERSIONE: '9.9.9' }));

import { leggiImpostazioni, leggiSlotDefs } from '../impostazioni';
import { leggiIngredienti, leggiRepertorio } from '../repertorio';
import { leggiTutteLeSettimane } from '../settimana';
import { leggiDispensa } from '../dispensa';
import { leggiPronti } from '../pronti';
import { preparaEsportazione } from '../esporta';

const PASTI: MealSlotDef[] = [{ id: 'col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) }];
const PIANO = [{ lunedi: '2026-08-31', stato: 'chiusa', pasti: cinqueColazioni() }];
const STATO = dispensaVuota();
const PRONTI: LottoPronto[] = [
  { id: 'lp-1', dishId: 'colazione-yogurt', porzioni: 2, congelato: true, preparataIl: '2026-09-20', mealSlotId: null },
];

beforeEach(() => {
  vi.mocked(leggiImpostazioni).mockReset().mockResolvedValue(IMPOSTAZIONI);
  vi.mocked(leggiSlotDefs).mockReset().mockResolvedValue(PASTI);
  vi.mocked(leggiIngredienti).mockReset().mockResolvedValue(INGREDIENTI);
  vi.mocked(leggiRepertorio).mockReset().mockResolvedValue(PIATTI);
  vi.mocked(leggiTutteLeSettimane).mockReset().mockResolvedValue(PIANO);
  vi.mocked(leggiDispensa).mockReset().mockResolvedValue(STATO);
  vi.mocked(leggiPronti).mockReset().mockResolvedValue(PRONTI);
});

describe('preparaEsportazione (spec fase 5 §E.3)', () => {
  it('un file JSON col nome del giorno e tutte le letture dentro', async () => {
    const adesso = new Date(2026, 8, 25, 10, 30); // 25/09/2026, ora locale
    const file = await preparaEsportazione(adesso);

    expect(file.name).toBe('dispesa-25-09-2026.json');
    expect(file.type).toBe('application/json');
    expect(JSON.parse(await file.text())).toEqual({
      formato: 1,
      app: 'dispesa',
      versione: '9.9.9',
      esportatoIl: adesso.toISOString(),
      impostazioni: IMPOSTAZIONI,
      pasti: PASTI,
      ingredienti: INGREDIENTI,
      piatti: PIATTI,
      piano: PIANO,
      dispensa: { stato: STATO, pronti: PRONTI },
    });
  });

  it('il nome usa il giorno di chi esporta, non quello UTC', async () => {
    // Mezzanotte e mezza del 26 in Italia sono le 22:30 UTC del 25: il file è del 26.
    const file = await preparaEsportazione(new Date(2026, 8, 26, 0, 30));
    expect(file.name).toBe('dispesa-26-09-2026.json');
  });

  it('leggibile a occhio: il JSON è indentato', async () => {
    const testo = await (await preparaEsportazione(new Date(2026, 8, 25))).text();
    expect(testo.startsWith('{\n  "formato": 1,')).toBe(true);
  });

  it('se una lettura fallisce non c\'è nessun file: l\'errore passa', async () => {
    const errore = new Error('rete');
    vi.mocked(leggiTutteLeSettimane).mockRejectedValue(errore);
    await expect(preparaEsportazione(new Date(2026, 8, 25))).rejects.toBe(errore);
  });

  it('senza data usa adesso', async () => {
    const file = await preparaEsportazione();
    expect(file.name).toMatch(/^dispesa-\d{2}-\d{2}-\d{4}\.json$/);
  });
});
