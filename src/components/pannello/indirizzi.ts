import { SOTTO_SCHERMATE, type DestinazionePannello, type SottoSchermata } from './tipi';

const CHIAVE_ORIGINE = 'spesa:origine-pannello';
const PREFISSO_SCROLL = 'spesa:pannello-scroll:';

/**
 * `?impostazioni=` (spec §A.3): null se il parametro manca; `cima` o una delle otto
 * sotto-schermate; un valore sconosciuto vale `cima`.
 */
export function leggiDestinazione(search: string): DestinazionePannello | null {
  const valore = new URLSearchParams(search).get('impostazioni');
  if (valore === null) return null;
  return (SOTTO_SCHERMATE as readonly string[]).includes(valore) ? (valore as SottoSchermata) : 'cima';
}

/** L'unica funzione che costruisce gli indirizzi del pannello: la usano tutte le pagine piene per tornare. */
export function indirizzoPannello(pathname: string, dest: DestinazionePannello): string {
  return `${pathname}?impostazioni=${dest}`;
}

/** Da dove si è lasciato il pannello per una pagina piena (spec §A.5). */
export interface OriginePannello {
  /** La pagina sotto il pannello, es. `/dispensa`. */
  pathname: string;
  sotto: 'cima' | 'ingredienti';
}

/**
 * sessionStorage può mancare o lanciare (Safari in navigazione privata, dati del sito
 * bloccati): ogni accesso sta dentro un try, e senza memoria il pannello torna in cima sopra
 * la Lista.
 */
function memoria(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function salvaOrigine(o: OriginePannello): void {
  try {
    memoria()?.setItem(CHIAVE_ORIGINE, JSON.stringify(o));
  } catch {
    // Senza memoria il ritorno va in cima sopra la Lista.
  }
}

/** Un percorso interno: comincia con una sola barra. `//altro.sito` sarebbe un altro sito. */
function percorsoInterno(p: unknown): p is string {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');
}

export function leggiOrigine(): OriginePannello | null {
  try {
    const testo = memoria()?.getItem(CHIAVE_ORIGINE);
    if (!testo) return null;
    const o = JSON.parse(testo) as { pathname?: unknown; sotto?: unknown };
    if (!percorsoInterno(o.pathname)) return null;
    if (o.sotto !== 'cima' && o.sotto !== 'ingredienti') return null;
    return { pathname: o.pathname, sotto: o.sotto };
  } catch {
    return null;
  }
}

/** Dove porta la freccia di una pagina piena aperta dal pannello: il pannello sopra l'origine. */
export function indirizzoRitorno(): string {
  const o = leggiOrigine();
  return o ? indirizzoPannello(o.pathname, o.sotto) : indirizzoPannello('/lista', 'cima');
}

export function salvaScrollPannello(dest: DestinazionePannello, px: number): void {
  try {
    memoria()?.setItem(PREFISSO_SCROLL + dest, String(Math.round(px)));
  } catch {
    // Senza memoria il pannello riapre dall'alto.
  }
}

/** Legge e cancella: lo scorrimento salvato vale per un ritorno solo. */
export function prendiScrollPannello(dest: DestinazionePannello): number | null {
  try {
    const m = memoria();
    const testo = m?.getItem(PREFISSO_SCROLL + dest);
    if (testo == null) return null;
    m?.removeItem(PREFISSO_SCROLL + dest);
    const px = Number(testo);
    return Number.isFinite(px) && px >= 0 ? px : null;
  } catch {
    return null;
  }
}
