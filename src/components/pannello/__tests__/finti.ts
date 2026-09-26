import { vi } from 'vitest';

/**
 * I moduli finti del pannello, per `vi.mock` nei test di src/components/pannello.
 * Sta a parte da `aiuti.tsx` perché le fabbriche di `vi.mock` lo importano da
 * dentro (`await import('./finti')`): se importasse il codice dell'app, la
 * fabbrica di un modulo finto caricherebbe il modulo che sta fingendo.
 */

export const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() };
/** La pagina sotto il pannello: `usePathname()` la legge da qui. */
export const percorso = { valore: '/lista' };
export const UTENTE = { id: 'u-1', email: 'andrea@esempio.it', user_metadata: { nome: 'Andrea' } };
export const auth = {
  getUser: vi.fn(async () => ({ data: { user: UTENTE }, error: null })),
  getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};

export function modNavigazione() {
  return {
    useRouter: () => router,
    usePathname: () => percorso.valore,
    useSearchParams: () => new URLSearchParams(),
  };
}

export function modSupabase() {
  return { client: () => ({ auth, rpc: vi.fn(), from: vi.fn() }) };
}

export async function modImpostazioni() {
  const vero = await vi.importActual<typeof import('@/data/impostazioni')>('@/data/impostazioni');
  return { ...vero, leggiImpostazioni: vi.fn(), salvaImpostazioni: vi.fn(), leggiSlotDefs: vi.fn(), salvaSlotDefs: vi.fn() };
}

/** `eRifiutoRls` resta quella vera: è pura, e il provider si ramifica su di lei. */
export async function modCasa() {
  const vero = await vi.importActual<typeof import('@/data/casa')>('@/data/casa');
  return {
    ...vero,
    idCasa: vi.fn(async () => 'casa-1'),
    statoCasa: vi.fn(),
    creaInvito: vi.fn(),
    entraInCasa: vi.fn(),
    esciDallaCasa: vi.fn(),
    rimuoviMembro: vi.fn(),
    dimenticaIdCasa: vi.fn(),
  };
}

export async function modRisparmio() {
  const vero = await vi.importActual<typeof import('@/data/risparmio')>('@/data/risparmio');
  return { ...vero, leggiRisparmioTotale: vi.fn(async () => []), leggiRisparmioSettimana: vi.fn(async () => []) };
}

export async function modRepertorio() {
  const vero = await vi.importActual<typeof import('@/data/repertorio')>('@/data/repertorio');
  return { ...vero, leggiRepertorio: vi.fn(async () => []), leggiIngredienti: vi.fn(async () => []) };
}

export async function modDispensa() {
  const vero = await vi.importActual<typeof import('@/data/dispensa')>('@/data/dispensa');
  return { ...vero, cancellaDispensa: vi.fn(async () => undefined) };
}

export async function modSessione() {
  const vero = await vi.importActual<typeof import('@/data/sessione')>('@/data/sessione');
  return { ...vero, esci: vi.fn() };
}

export async function modEsporta() {
  const vero = await vi.importActual<typeof import('@/data/esporta')>('@/data/esporta');
  return { ...vero, preparaEsportazione: vi.fn() };
}

export async function modSalvaFile() {
  const vero = await vi.importActual<typeof import('@/components/salva-file')>('@/components/salva-file');
  return { ...vero, salvaFile: vi.fn() };
}
