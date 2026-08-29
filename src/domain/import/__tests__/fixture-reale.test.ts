import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validaEsito } from '../valida';

// Il fixture reale è fuori git (dati sanitari): su una macchina che non ce
// l'ha questi test si saltano, non falliscono.
const PERCORSO = join(process.cwd(), 'diete/estrazioni/piani/dieta6.json');

describe.skipIf(!existsSync(PERCORSO))('fixture reale dieta6', () => {
  it('è un EsitoEstrazione valido con 7 giorni', () => {
    const esito = validaEsito(JSON.parse(readFileSync(PERCORSO, 'utf8')));
    expect(esito.tipo).toBe('piano');
    if (esito.tipo !== 'piano') return;
    expect(esito.piano.settimane).toHaveLength(1);
    expect(esito.piano.settimane[0].giorni).toHaveLength(7);
    // Ogni giorno ha il pasto sintetico dei condimenti (nella dieta 6 c'è sempre).
    for (const g of esito.piano.settimane[0].giorni) {
      expect(g.pasti.some((p) => p.nomeOriginale === 'condimenti')).toBe(true);
    }
  });
});
