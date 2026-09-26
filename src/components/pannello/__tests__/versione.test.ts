import { describe, it, expect, vi, afterEach } from 'vitest';
import pacchetto from '../../../../package.json';
import configurazione from '../../../../next.config';

describe('la versione del piede (spec fase 5 §B.4)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('next.config espone la version di package.json come NEXT_PUBLIC_VERSIONE', () => {
    expect(configurazione.env?.NEXT_PUBLIC_VERSIONE).toBe(pacchetto.version);
  });

  it('VERSIONE è la variabile, quando c\'è', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERSIONE', '1.2.3');
    const { VERSIONE } = await import('../versione');
    expect(VERSIONE).toBe('1.2.3');
  });

  it('senza la variabile (test, script fuori da Next) vale 0.0.0', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERSIONE', undefined);
    const { VERSIONE } = await import('../versione');
    expect(VERSIONE).toBe('0.0.0');
  });
});
