import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));

import { client } from '../supabase';
import { chiudiSpesa } from '../lista';

interface Chiamata { metodo: string; args: unknown[] }

/**
 * Controfigura minimale del query builder di supabase-js: ogni `.from(table)`
 * apre una catena che registra i metodi invocati (select/eq/in/update/
 * insert/...) e si risolve solo quando viene messa in `await` (thenable),
 * con il risultato deciso da `risolvi(table, chiamate)`. Basta a testare la
 * logica di chiudiSpesa senza una rete o un database veri: quello — il ciclo
 * completo contro Supabase — è lo Step 7, NON ESEGUITO.
 */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const scritture: Record<string, Chiamata[][]> = {};

  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'),
      eq: registra('eq'),
      in: registra('in'),
      update: registra('update'),
      insert: registra('insert'),
      upsert: registra('upsert'),
      delete: registra('delete'),
      returns: () => proxy,
      single: () => proxy,
      maybeSingle: () => proxy,
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (scritture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }

  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    scritture,
  };
}

const RIGA_YOGURT = {
  ingredient_id: 'ing-yogurt', fabbisogno: 750, residuo: 50, confezioni: 2,
  quantita_totale: 1000, spuntato: true, origine: 'piano',
};
const RIGA_PASTA = {
  ingredient_id: 'ing-pasta', fabbisogno: 500, residuo: 100, confezioni: 0,
  quantita_totale: 0, spuntato: false, origine: 'piano',
};
const RIGA_OLIO = {
  ingredient_id: 'ing-olio', fabbisogno: 0, residuo: 0, confezioni: 1,
  quantita_totale: 1000, spuntato: true, origine: 'controllo',
};

const LISTE_LETTURA = [
  { id: 'lista-base', shopping_list_item: [RIGA_YOGURT, RIGA_PASTA] },
  { id: 'lista-topup', shopping_list_item: [RIGA_OLIO] },
];

/**
 * Risolve week (select) come confermata, shopping_list (select) con le liste
 * passate e meal_slot_storno (select) con gli storni passati. Il default []
 * riproduce il mondo senza spunte: i test pre-esistenti non cambiano di una
 * virgola.
 */
function risolviSettimanaConfermata(
  liste: unknown[],
  storni: Array<{ ingredient_id: string; delta: number }> = [],
) {
  return (tabella: string, chiamate: Chiamata[]) => {
    const legge = chiamate.some((c) => c.metodo === 'select');
    if (tabella === 'week' && legge) {
      return { data: { stato: 'confermata' }, error: null };
    }
    if (tabella === 'shopping_list' && legge) {
      return { data: liste, error: null };
    }
    if (tabella === 'meal_slot_storno' && legge) {
      return { data: storni, error: null };
    }
    return { data: null, error: null };
  };
}

/**
 * Estrae il patch dell'unica chiamata upsert() su pantry_state per un dato
 * ingredientId, spogliato di ingredient_id/user_id (le chiavi che
 * identificano la riga, non il "cosa cambia" verificato dai test). upsert,
 * non update (I1): niente .eq() a valle da cercare, l'ingrediente si
 * riconosce dal corpo stesso della scrittura.
 */
function patchPantry(scritture: Chiamata[][], ingredientId: string): Record<string, unknown> | undefined {
  const chiamata = scritture
    .flat()
    .find((x) => x.metodo === 'upsert' && (x.args[0] as Record<string, unknown>).ingredient_id === ingredientId);
  if (!chiamata) return undefined;
  const patch = { ...(chiamata.args[0] as Record<string, unknown>) };
  delete patch.ingredient_id;
  delete patch.user_id;
  return patch;
}

describe('chiudiSpesa', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggiorna pantry_state solo dove residuo o ultimo_acquisto cambiano davvero', async () => {
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(LISTE_LETTURA));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    const scrittePantry = scritture['pantry_state'] ?? [];
    expect(scrittePantry).toHaveLength(3);

    // Yogurt: comprato, residuo cambia (50 + 1000 − 750 = 300) e ultimo_acquisto si aggiorna.
    expect(patchPantry(scrittePantry, 'ing-yogurt')).toEqual({ residuo: 300, ultimo_acquisto: '2026-09-06' });
    // Pasta: NON spuntata, ma il piano la consuma comunque (100 + 0 − 500 → 0). Non è stata comprata: niente ultimo_acquisto.
    expect(patchPantry(scrittePantry, 'ing-pasta')).toEqual({ residuo: 0 });
    // Olio: riga di controllo, la classe stima non tiene residuo — ma è stata spuntata, quindi ultimo_acquisto si aggiorna comunque.
    expect(patchPantry(scrittePantry, 'ing-olio')).toEqual({ ultimo_acquisto: '2026-09-06' });
  });

  it('inserisce in purchase una riga solo per le voci spuntate, con la lista di provenienza corretta', async () => {
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(LISTE_LETTURA));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    const scritturePurchase = scritture['purchase'] ?? [];
    expect(scritturePurchase).toHaveLength(1);
    const righe = scritturePurchase[0].find((c) => c.metodo === 'insert')?.args[0] as Array<Record<string, unknown>>;
    expect(righe).toHaveLength(2); // yogurt e olio: pasta non è stata comprata.
    expect(righe).toEqual(expect.arrayContaining([
      { user_id: 'user-1', ingredient_id: 'ing-yogurt', data: '2026-09-06', confezioni: 2, quantita: 1000, shopping_list_id: 'lista-base' },
      { user_id: 'user-1', ingredient_id: 'ing-olio', data: '2026-09-06', confezioni: 1, quantita: 1000, shopping_list_id: 'lista-topup' },
    ]));
  });

  it('chiude entrambe le shopping_list e la week', async () => {
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(LISTE_LETTURA));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    const scrittureListe = (scritture['shopping_list'] ?? []).filter((c) => c.some((x) => x.metodo === 'update'));
    expect(scrittureListe).toHaveLength(1);
    const updateListe = scrittureListe[0].find((c) => c.metodo === 'update')?.args[0] as Record<string, unknown>;
    expect(updateListe).toHaveProperty('chiusa_il');
    const inListe = scrittureListe[0].find((c) => c.metodo === 'in')?.args;
    expect(inListe).toEqual(['id', ['lista-base', 'lista-topup']]);

    const scrittureWeek = (scritture['week'] ?? []).filter((c) => c.some((x) => x.metodo === 'update'));
    expect(scrittureWeek).toHaveLength(1);
    const updateWeek = scrittureWeek[0].find((c) => c.metodo === 'update')?.args[0];
    expect(updateWeek).toEqual({ stato: 'chiusa' });
    const eqWeek = scrittureWeek[0].find((c) => c.metodo === 'eq' && c.args[0] === 'id')?.args;
    expect(eqWeek).toEqual(['id', 'week-1']);
  });

  it('propaga l\'errore se una scrittura fallisce, invece di far finta che sia andato tutto bene', async () => {
    const { sb } = creaClientMock((tabella, chiamate) => {
      if (tabella === 'purchase') return { data: null, error: { message: 'boom' } };
      return risolviSettimanaConfermata(LISTE_LETTURA)(tabella, chiamate);
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(chiudiSpesa('week-1')).rejects.toEqual({ message: 'boom' });
  });

  it('se purchase fallisce, non chiude né la week né le shopping_list: un ritentativo deve poter ancora scrivere lo storico', async () => {
    // Riproduce l'interazione trovata in review: le quattro scritture non
    // sono più tutte nello stesso Promise.all. Se week.stato venisse posato
    // a 'chiusa' comunque, il guard di idempotenza (che è corretto e va
    // tenuto) bloccherebbe in silenzio ogni ritentativo, e le righe di
    // purchase non spuntate qui non verrebbero mai più scritte.
    const { sb, scritture } = creaClientMock((tabella, chiamate) => {
      if (tabella === 'purchase') return { data: null, error: { message: 'boom' } };
      return risolviSettimanaConfermata(LISTE_LETTURA)(tabella, chiamate);
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(chiudiSpesa('week-1')).rejects.toEqual({ message: 'boom' });

    // Nessuna chiamata update() né su week né su shopping_list: il passo 2
    // (la chiusura ufficiale) non deve partire se il passo 1 (i dati) è fallito.
    expect((scritture['week'] ?? []).some((c) => c.some((x) => x.metodo === 'update'))).toBe(false);
    expect((scritture['shopping_list'] ?? []).some((c) => c.some((x) => x.metodo === 'update'))).toBe(false);
    // pantry_state, invece, è nel passo 1 insieme a purchase: essendo in
    // Promise.all coi due, entrambi partono comunque (yogurt/pasta/olio: 3 scritture).
    expect(scritture['pantry_state']).toHaveLength(3);
  });

  it('senza liste per la settimana non scrive nulla', async () => {
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata([]));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    expect(scritture['pantry_state']).toBeUndefined();
    expect(scritture['purchase']).toBeUndefined();
    expect(scritture['week']?.some((c) => c.some((x) => x.metodo === 'update'))).toBeFalsy();
  });

  it('è idempotente: su una week già chiusa non tocca nulla, invece di riapplicare due volte lo stesso delta al residuo', async () => {
    const { sb, scritture } = creaClientMock((tabella, chiamate) => {
      if (tabella === 'week' && chiamate.some((c) => c.metodo === 'select')) {
        return { data: { stato: 'chiusa' }, error: null };
      }
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    // Non ha nemmeno letto le liste: il guard scatta prima, sulla sola week.
    expect(scritture['shopping_list']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
    expect(scritture['purchase']).toBeUndefined();
  });

  it('riapplica gli storni della settimana sopra il residuo congelato', async () => {
    // Lo yogurt ha uno storno di +100 (una colazione saltata prima della
    // chiusura): la sovrascrittura assoluta lo cancellerebbe, la
    // riapplicazione lo somma — 50 + 1000 − 750 + 100 = 400 (spec §5.2).
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(
      LISTE_LETTURA,
      [{ ingredient_id: 'ing-yogurt', delta: 100 }],
    ));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    expect(patchPantry(scritture['pantry_state'] ?? [], 'ing-yogurt'))
      .toEqual({ residuo: 400, ultimo_acquisto: '2026-09-06' });
  });

  it('uno storno su un ingrediente fuori lista NON si riapplica: il residuo vivo lo ha già', async () => {
    // Il piatto sostituito ha addebitato un ingrediente mai entrato in lista:
    // il delta è stato applicato al residuo vivo al momento del tap, e la
    // chiusura non sovrascrive quella riga. Riapplicarlo qui lo conterebbe
    // due volte (spec §5.2).
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(
      LISTE_LETTURA,
      [{ ingredient_id: 'ing-fagioli', delta: -30 }],
    ));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    expect(patchPantry(scritture['pantry_state'] ?? [], 'ing-fagioli')).toBeUndefined();
  });

  it('la riapplicazione clampa a zero, come ogni applicazione di storno', async () => {
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(
      LISTE_LETTURA,
      [{ ingredient_id: 'ing-pasta', delta: -700 }],
    ));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    // Pasta congelata: 100 + 0 − 500 → 0; storno −700 → max(0, 0 − 700) = 0.
    expect(patchPantry(scritture['pantry_state'] ?? [], 'ing-pasta'))
      .toEqual({ residuo: 0 });
  });
});
