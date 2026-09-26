'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { usePannello, usePannelloInterno } from './PannelloProvider';
import { SlotPiedeProvider } from './PiedePannello';
import { CIMA, SCHERMATE } from './schermate';
import { ID_MENU_UTENTE, ID_PANNELLO, ID_TITOLO_PANNELLO, type SottoSchermata } from './tipi';

/** Quanto resta a schermo una sotto-schermata che esce: la durata di `.anim-sotto-esce` (spec §B.2). */
export const DURATA_USCITA_MS = 200;

/** Per quanto si prova a rimettere lo scorrimento salvato mentre il contenuto arriva (spec §A.3). */
const ATTESA_SCROLL_MS = 3000;

const FRECCIA = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CROCE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
  </svg>
);

/** Il tondo 44 su 0,07 della testata del pannello: la X in cima, la freccia in una sotto-schermata. */
function TondoTestata({ etichetta, onClick, children }: { etichetta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etichetta}
      onClick={onClick}
      style={{
        width: 44, height: 44, flex: 'none', borderRadius: 999, background: 'var(--barra-attiva)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Il Pannello impostazioni (spec §B.1, §B.2): velo, contenitore a tutta larghezza da `top 76`,
 * testata fissa, corpo che scorre, piede fisso per i tre primari, e il Dialogo di conferma
 * sopra, a z 80. È sempre nel DOM: chiuso sta a `visibility: hidden`, `inert` e `aria-hidden`,
 * così la chiusura può scendere animata. Il movimento è tutto nel CSS (`data-stato`,
 * `data-istantaneo`, `.anim-sotto-*` in globals.css).
 *
 * Il contenuto della cima si monta alla prima apertura e resta; quello di una sotto-schermata
 * si smonta quando si esce, dopo i 200 ms dell'uscita verso destra. Il titolo e i tondi
 * seguono subito la sotto-schermata di stato; il corpo segue quella «mostrata», che all'uscita
 * resta a schermo per la durata dell'animazione.
 */
export function Pannello() {
  const { aperto, sotto, chiudi, torna, chiudiDialogo } = usePannello();
  const { dialogo, istantaneo, scroll, scrollUsato } = usePannelloInterno();

  // Aggiustati durante il render, come la barra nel Guscio: niente effetti per stato derivato.
  const [mostrata, setMostrata] = useState<SottoSchermata | null>(sotto);
  if (sotto !== null && sotto !== mostrata) setMostrata(sotto);
  const uscente = sotto === null && mostrata !== null;
  const [giaAperto, setGiaAperto] = useState(aperto);
  if (aperto && !giaAperto) setGiaAperto(true);

  const [piede, setPiede] = useState<HTMLDivElement | null>(null);
  const pannelloRef = useRef<HTMLDivElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const eraAperto = useRef(false);
  const eraDialogo = useRef(false);

  useEffect(() => {
    if (!uscente) return;
    const t = setTimeout(() => setMostrata(null), DURATA_USCITA_MS);
    return () => clearTimeout(t);
  }, [uscente]);

  // Il fuoco: al pannello quando si apre, al Menù utente quando si chiude (spec §A.2).
  useEffect(() => {
    if (aperto) {
      eraAperto.current = true;
      pannelloRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!eraAperto.current) return;
    eraAperto.current = false;
    document.getElementById(ID_MENU_UTENTE)?.focus({ preventScroll: true });
  }, [aperto]);

  // Chiuso il dialogo, il fuoco torna al pannello: FoglioDalBasso l'aveva preso per sé.
  const conDialogo = dialogo !== null;
  useEffect(() => {
    if (conDialogo) {
      eraDialogo.current = true;
      return;
    }
    if (!eraDialogo.current) return;
    eraDialogo.current = false;
    if (aperto) pannelloRef.current?.focus({ preventScroll: true });
  }, [conDialogo, aperto]);

  // Lo scorrimento salvato (spec §A.3: gli Ingredienti al ritorno dall'editor). Il contenuto
  // può arrivare dopo l'apertura (una sotto-schermata che legge i suoi dati): si riprova a ogni
  // cambio del corpo finché il valore tiene, per ATTESA_SCROLL_MS al più.
  useEffect(() => {
    if (scroll === null) return;
    const corpo = corpoRef.current;
    if (!corpo) return;
    let finito = false;
    const osservatore = new MutationObserver(() => prova());
    const timer = setTimeout(() => smetti(), ATTESA_SCROLL_MS);
    function smetti() {
      if (finito) return;
      finito = true;
      osservatore.disconnect();
      clearTimeout(timer);
      scrollUsato();
    }
    function prova() {
      if (finito || corpo === null) return;
      corpo.scrollTop = scroll ?? 0;
      if (Math.abs(corpo.scrollTop - (scroll ?? 0)) <= 1) smetti();
    }
    osservatore.observe(corpo, { childList: true, subtree: true });
    prova();
    return () => {
      finito = true;
      osservatore.disconnect();
      clearTimeout(timer);
    };
  }, [scroll, mostrata, scrollUsato]);

  const titolo = sotto !== null ? SCHERMATE[sotto].titolo : 'Impostazioni';
  const Contenuto = mostrata !== null ? SCHERMATE[mostrata].Componente : CIMA;
  let classeCorpo = '';
  if (uscente) classeCorpo = aperto ? ' anim-sotto-esce' : '';
  else if (mostrata !== null && !istantaneo) classeCorpo = ' anim-sotto-entra';
  const statoAttr = aperto ? 'aperto' : 'chiuso';
  const istantaneoAttr = istantaneo ? '' : undefined;

  return (
    <SlotPiedeProvider slot={piede}>
      <div
        className="pannello-velo"
        data-stato={statoAttr}
        data-istantaneo={istantaneoAttr}
        aria-hidden="true"
        onClick={chiudi}
      />
      <div
        ref={pannelloRef}
        id={ID_PANNELLO}
        className="pannello"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ID_TITOLO_PANNELLO}
        aria-hidden={aperto ? undefined : true}
        inert={!aperto}
        tabIndex={-1}
        data-stato={statoAttr}
        data-istantaneo={istantaneoAttr}
      >
        <div className="pannello-testata">
          {sotto !== null && <TondoTestata etichetta="Torna alle impostazioni" onClick={torna}>{FRECCIA}</TondoTestata>}
          <h2
            id={ID_TITOLO_PANNELLO}
            style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            {titolo}
          </h2>
          {sotto === null && <TondoTestata etichetta="Chiudi le impostazioni" onClick={chiudi}>{CROCE}</TondoTestata>}
        </div>
        <div key={mostrata ?? 'cima'} ref={corpoRef} className={`pannello-corpo sc${classeCorpo}`}>
          {giaAperto && <Contenuto />}
        </div>
        <div className="pannello-piede" ref={setPiede} />
      </div>
      {dialogo !== null && (
        <FoglioDalBasso
          etichetta={dialogo.titolo}
          onChiudi={chiudiDialogo}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
          livello={3}
        >
          <DialogoConferma {...dialogo} onAnnulla={chiudiDialogo} />
        </FoglioDalBasso>
      )}
    </SlotPiedeProvider>
  );
}
