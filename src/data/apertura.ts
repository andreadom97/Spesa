import { lunediDi } from '@/domain/date';
import { creaSettimana, leggiSettimana, type SettimanaCorrente } from './settimana';

/** Le creazioni in volo, per lunedì: due aperture insieme (Strict Mode, due schede) ne fanno una. */
const inVolo = new Map<string, Promise<void>>();

/**
 * La settimana che contiene `oggi` (data LOCALE, spec Oggi §B.1), creata se manca, come fa il
 * Piano. L'unique `(user_id, data_inizio)` blocca un doppione: se la creazione fallisce si
 * rilegge, e solo se la settimana non c'è ancora l'errore è vero.
 */
export async function apriSettimanaCorrente(oggi: string): Promise<SettimanaCorrente> {
  const lunedi = lunediDi(oggi);
  const esistente = await leggiSettimana(lunedi);
  if (esistente) return esistente;
  let creazione = inVolo.get(lunedi);
  if (!creazione) {
    creazione = creaSettimana(lunedi).then(() => undefined);
    inVolo.set(lunedi, creazione);
    creazione.finally(() => inVolo.delete(lunedi)).catch(() => undefined);
  }
  try {
    await creazione;
  } catch (errore) {
    const dopo = await leggiSettimana(lunedi);
    if (dopo) return dopo;
    throw errore;
  }
  const creata = await leggiSettimana(lunedi);
  if (!creata) throw new Error('Settimana non disponibile dopo la creazione.');
  return creata;
}
