'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIndietroFogli } from '@/components/useIndietroFogli';
import type { PropsDialogo } from '@/components/DialogoConferma';
import type { DestinazionePannello, SottoSchermata } from './tipi';
import { leggiDestinazione, prendiScrollPannello, salvaOrigine, type OriginePannello } from './indirizzi';

export interface ContestoPannello {
  aperto: boolean;
  sotto: SottoSchermata | null;
  /** Con l'animazione di §B.2. Senza argomento, in cima. */
  apri(dest?: DestinazionePannello): void;
  chiudi(): void;
  entra(s: SottoSchermata): void;
  torna(): void;
  /** `onConferma` avvolta: se riesce, il dialogo si chiude. */
  mostraDialogo(d: PropsDialogo): void;
  chiudiDialogo(): void;
  /** Salva l'origine, chiude tutto, poi naviga (spec §A.5). */
  vaiA(href: string, origine: OriginePannello): void;
}

/** Quello che serve solo al contenitore (`Pannello`) e al `Guscio`. */
export interface ContestoPannelloInterno {
  dialogo: PropsDialogo | null;
  /** L'apertura viene da `?impostazioni=`: niente animazione (spec §A.3). */
  istantaneo: boolean;
  /** L'altezza del corpo da rimettere, letta da sessionStorage all'apertura da indirizzo. */
  scroll: number | null;
  scrollUsato(): void;
  /** Lo chiama `PrimoAvvio` quando apre il suo cancello: da lì `?impostazioni=` può aprire. */
  primoAvvioFinito(): void;
}

interface Stato {
  aperto: boolean;
  sotto: SottoSchermata | null;
  dialogo: PropsDialogo | null;
  istantaneo: boolean;
  scroll: number | null;
}

const CHIUSO: Stato = { aperto: false, sotto: null, dialogo: null, istantaneo: false, scroll: null };

/**
 * Fuori dal provider (i test di una pagina montano la Testata senza Guscio) il pannello è
 * inerte: il Menù utente c'è e non apre niente.
 */
const INERTE: ContestoPannello = {
  aperto: false, sotto: null,
  apri() {}, chiudi() {}, entra() {}, torna() {}, mostraDialogo() {}, chiudiDialogo() {}, vaiA() {},
};
const INERTE_INTERNO: ContestoPannelloInterno = {
  dialogo: null, istantaneo: false, scroll: null, scrollUsato() {}, primoAvvioFinito() {},
};

/**
 * L'indirizzo di oggi senza `?impostazioni=`: gli altri parametri e l'ancora restano (review
 * finale M7). Un indirizzo con il solo parametro torna al solo percorso.
 */
function senzaParametroPannello(pathname: string): string {
  const parametri = new URLSearchParams(window.location.search);
  parametri.delete('impostazioni');
  const resto = parametri.toString();
  return `${pathname}${resto ? `?${resto}` : ''}${window.location.hash}`;
}

const Contesto = createContext<ContestoPannello>(INERTE);
const ContestoInterno = createContext<ContestoPannelloInterno>(INERTE_INTERNO);

/** Pannello chiuso 0; in cima 1; in una sotto-schermata 2; un dialogo sopra aggiunge 1 (spec §A.4). */
function profondita(s: Stato): number {
  if (!s.aperto) return 0;
  return (s.sotto ? 2 : 1) + (s.dialogo ? 1 : 0);
}

/**
 * Lo stato del Pannello impostazioni (spec §A.1): aperto, la sotto-schermata, il dialogo. Vive
 * nel Guscio, così il pannello si apre sopra qualunque pagina e ci resta durante le sue
 * transizioni.
 *
 * Il gesto indietro passa da `useIndietroFogli`: una voce di cronologia per livello, e un
 * `popstate` non atteso scende di un livello (dialogo → sotto-schermata → cima → chiuso). I
 * tasti (X, velo, freccia, ANNULLA, conferme) cambiano solo lo stato: è l'hook a consumare le
 * voci.
 *
 * `?impostazioni=` (spec §A.3) si legge al montaggio e a ogni cambio di pathname, da
 * `window.location.search` (niente `useSearchParams`, niente `Suspense`: come `?torna=`
 * nell'editor). Il parametro si toglie con `history.replaceState` **prima** di aprire, così le
 * voci che l'hook mette dopo nascono sull'indirizzo pulito e un indietro non lo ritrova. La
 * `replaceState` passa `window.history.state`, **mai** `null`: questo effetto gira prima che
 * l'`AppRouter` avvolga la History API, e con `null` la voce perderebbe lo stato di Next
 * (`__NA`), che al primo indietro ricaricherebbe la pagina (regola B′, misurata dalla sonda
 * del Task 2 della fase 5). Si toglie solo quel parametro: gli altri restano (review finale M7).
 *
 * `attendiPrimoAvvio` (il Guscio lo passa; review finale M2): il pannello vive fuori dal
 * cancello di `PrimoAvvio`, e un utente nuovo che entra da un vecchio segnalibro `/impostazioni`
 * aprirebbe il pannello mentre `assicuraDatiIniziali` semina i pasti. `leggiNucleo` troverebbe
 * la tabella ancora vuota e seminerebbe i suoi quattro: otto pasti, oltre il massimo di sei, e
 * ogni salvataggio dei pasti rifiutato. Con `attendiPrimoAvvio` l'indirizzo si legge solo dopo
 * che `PrimoAvvio` ha aperto il suo cancello (`primoAvvioFinito`); fino ad allora il parametro
 * resta nell'indirizzo. Senza (i test che montano il pannello da solo), si legge subito.
 */
export function PannelloProvider({ children, attendiPrimoAvvio = false }: { children: ReactNode; attendiPrimoAvvio?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stato, setStato] = useState<Stato>(CHIUSO);
  const [avvioFinito, setAvvioFinito] = useState(!attendiPrimoAvvio);

  const chiudiUltimo = useCallback(() => {
    setStato((s) => {
      if (!s.aperto) return s;
      if (s.dialogo) return { ...s, dialogo: null };
      if (s.sotto) return { ...s, sotto: null, istantaneo: false, scroll: null };
      return CHIUSO;
    });
  }, []);

  const { chiudiTuttoPoi } = useIndietroFogli(profondita(stato), chiudiUltimo);

  useEffect(() => {
    if (!avvioFinito) return;
    const dest = leggiDestinazione(window.location.search);
    if (dest === null) return;
    window.history.replaceState(window.history.state, '', senzaParametroPannello(pathname));
    const scroll = prendiScrollPannello(dest);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStato({ aperto: true, sotto: dest === 'cima' ? null : dest, dialogo: null, istantaneo: true, scroll });
  }, [pathname, avvioFinito]);

  const primoAvvioFinito = useCallback(() => setAvvioFinito(true), []);

  const apri = useCallback((dest: DestinazionePannello = 'cima') => {
    setStato({ aperto: true, sotto: dest === 'cima' ? null : dest, dialogo: null, istantaneo: false, scroll: null });
  }, []);

  const chiudi = useCallback(() => setStato(CHIUSO), []);

  const entra = useCallback((s: SottoSchermata) => {
    setStato((p) => (p.aperto ? { ...p, sotto: s, dialogo: null, istantaneo: false, scroll: null } : p));
  }, []);

  const torna = useCallback(() => {
    setStato((p) => ({ ...p, sotto: null, dialogo: null, istantaneo: false, scroll: null }));
  }, []);

  const chiudiDialogo = useCallback(() => {
    setStato((p) => (p.dialogo ? { ...p, dialogo: null } : p));
  }, []);

  const mostraDialogo = useCallback((d: PropsDialogo) => {
    const avvolto: PropsDialogo = {
      ...d,
      onConferma: async () => {
        await d.onConferma();
        chiudiDialogo();
      },
    };
    setStato((p) => (p.aperto ? { ...p, dialogo: avvolto } : p));
  }, [chiudiDialogo]);

  // Ramo A (la sonda del Task 2 regge con la fn differita): prima si chiude, poi si naviga.
  // L'hook fa partire la push un giro dopo il popstate che conclude il suo go(-n): navigare
  // subito farebbe correre insieme go e push, e dentro il popstate Next la scarterebbe.
  const vaiA = useCallback((href: string, origine: OriginePannello) => {
    salvaOrigine(origine);
    chiudiTuttoPoi(() => router.push(href));
    setStato(CHIUSO);
  }, [chiudiTuttoPoi, router]);

  const scrollUsato = useCallback(() => {
    setStato((p) => (p.scroll === null ? p : { ...p, scroll: null }));
  }, []);

  const valore = useMemo<ContestoPannello>(() => ({
    aperto: stato.aperto, sotto: stato.sotto, apri, chiudi, entra, torna, mostraDialogo, chiudiDialogo, vaiA,
  }), [stato.aperto, stato.sotto, apri, chiudi, entra, torna, mostraDialogo, chiudiDialogo, vaiA]);

  const interno = useMemo<ContestoPannelloInterno>(() => ({
    dialogo: stato.dialogo, istantaneo: stato.istantaneo, scroll: stato.scroll, scrollUsato, primoAvvioFinito,
  }), [stato.dialogo, stato.istantaneo, stato.scroll, scrollUsato, primoAvvioFinito]);

  return (
    <Contesto.Provider value={valore}>
      <ContestoInterno.Provider value={interno}>{children}</ContestoInterno.Provider>
    </Contesto.Provider>
  );
}

export function usePannello(): ContestoPannello {
  return useContext(Contesto);
}

export function usePannelloInterno(): ContestoPannelloInterno {
  return useContext(ContestoInterno);
}
