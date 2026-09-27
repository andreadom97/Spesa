'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { eseguiScritture } from '@/data/importa';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { traduciBozza, BozzaIncompletaError, type ScrittureImport } from '@/domain/import/commit';
import { Dock, ErroreSopraDock } from '@/components/Dock';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { useIndietroFogli } from '@/components/useIndietroFogli';
import { StatoImporta } from './StatoImporta';

// Il testo di oggi, esatto (era in page.tsx).
const ERRORE_ESECUZIONE = 'Qualcosa si è fermato: riprova, l’import riprende da dove era.';

/**
 * La data di oggi in locale, come yyyy-mm-dd: `toISOString` converte a UTC, quindi vicino
 * alla mezzanotte (in un fuso più avanti di UTC, come l'Italia) darebbe il giorno sbagliato.
 * Costruita dai campi locali di `Date`, mai da una stringa UTC.
 */
function dataLocaleOggi(): string {
  const d = new Date();
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mese}-${giorno}`;
}

/**
 * Il riepilogo finale (spec fase 8a §C): traduce la bozza in scritture concrete (`traduciBozza`,
 * con ingredienti e repertorio riletti freschi, non quelli in memoria dal mount del wizard, che un
 * commit parziale precedente può aver superato) e mostra il conto prima di eseguirle.
 *
 * Il Dock dice cosa succede: `CREA IL PIANO` scrive subito quando l'import non disattiva niente
 * (il primo import); `SOSTITUISCI IL PIANO` passa dal Dialogo di conferma quando disattiva dei
 * piatti del nutrizionista (decisione di Andrea del 27/09).
 *
 * `BozzaIncompletaError` è un difetto di dati risolvibile solo tornando alla revisione: si mostra
 * il suo messaggio esatto, con TORNA ALLA REVISIONE nel Dock.
 */
export function Riepilogo({
  piano,
  stato,
  onStato,
}: {
  piano: PianoEstratto;
  stato: StatoRevisione;
  onStato: (s: StatoRevisione) => void;
}) {
  const router = useRouter();
  // Le ultime scritture calcolate: restano a schermo durante un ricalcolo, così il conto e la
  // scritta del Dock non saltano. `pronto` dice se sono quelle di adesso.
  const [scritture, setScritture] = useState<ScrittureImport | null>(null);
  const [pronto, setPronto] = useState(false);
  const [erroreBozza, setErroreBozza] = useState<string | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [confermaSostituzione, setConfermaSostituzione] = useState(false);
  const [eseguendo, setEseguendo] = useState(false);
  const [erroreEsecuzione, setErroreEsecuzione] = useState<string | null>(null);
  // Sale a ogni retry (dopo un errore di eseguiScritture o del caricamento): rifà l'effetto sotto,
  // che rilegge ingredienti e repertorio e ricalcola da zero. L'idempotenza vive in traduciBozza
  // (riusaDishId, ingredienti già creati agganciati per nome): un retry che riusasse le scritture
  // di prima salterebbe quella rivalutazione e duplicherebbe ingredienti e piatti.
  const [tentativo, setTentativo] = useState(0);

  // L'indietro di sistema chiude il dialogo invece di lasciare Importa.
  const { chiudiTuttoPoi } = useIndietroFogli(confermaSostituzione ? 1 : 0, () => setConfermaSostituzione(false));

  useEffect(() => {
    let vivo = true;
    (async () => {
      // Spento finché questo calcolo non finisce: mai un tasto acceso su scritture stantie.
      setPronto(false);
      setErroreCaricamento(null);
      try {
        const [ingredientiEsistenti, repertorioEsistente] = await Promise.all([leggiIngredienti(), leggiRepertorio()]);
        if (!vivo) return;
        setScritture(traduciBozza(piano, stato, ingredientiEsistenti, repertorioEsistente, dataLocaleOggi()));
        setPronto(true);
      } catch (e) {
        if (!vivo) return;
        if (e instanceof BozzaIncompletaError) {
          setErroreBozza(e.message);
        } else {
          console.error('importa: preparazione del riepilogo fallita.', e);
          setErroreCaricamento('Non siamo riusciti a preparare il riepilogo. Riprova più tardi.');
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [piano, stato, tentativo]);

  /**
   * Scrive. Dal Dock (CREA IL PIANO) o dal dialogo (SOSTITUISCI). Riuscito: al Piano con
   * `replace`, così l'indietro di sistema non torna su un Importa già chiuso; se il dialogo è
   * aperto, prima si consuma la sua voce (`chiudiTuttoPoi`). Fallito: il dialogo si chiude,
   * l'errore sta sopra il Dock, e il Dock resta spento fino al ricalcolo (spec §C). Non lancia:
   * il dialogo non deve mostrare un suo errore.
   */
  async function scrivi() {
    if (!scritture || !pronto || eseguendo) return;
    setEseguendo(true);
    setErroreEsecuzione(null);
    try {
      await eseguiScritture(scritture);
      chiudiTuttoPoi(() => router.replace('/piano'));
      setConfermaSostituzione(false);
    } catch (e) {
      console.error('importa: esecuzione dell’import fallita.', e);
      setErroreEsecuzione(ERRORE_ESECUZIONE);
      setEseguendo(false);
      setConfermaSostituzione(false);
      setTentativo((n) => n + 1);
    }
  }

  if (erroreBozza) {
    return (
      <>
        <StatoImporta titolo="C'è ancora qualcosa da sistemare" testo={erroreBozza} conDock />
        <Dock>
          <button type="button" className="dock-primario" onClick={() => onStato({ ...stato, passo: 'revisione' })}>
            TORNA ALLA REVISIONE
          </button>
        </Dock>
      </>
    );
  }

  if (erroreCaricamento) {
    return (
      <>
        <StatoImporta titolo="Il riepilogo non è pronto" testo={erroreCaricamento} conDock />
        <Dock>
          <button type="button" className="dock-primario" onClick={() => setTentativo((n) => n + 1)}>RIPROVA</button>
        </Dock>
      </>
    );
  }

  // Il primo calcolo: niente sotto la testata, come oggi.
  if (!scritture) return null;

  const disattivati = scritture.piattiDaDisattivare.length;
  const sostituisce = disattivati > 0;
  const voci: { nome: string; valore: number }[] = [
    { nome: 'Piatti', valore: scritture.piattiDaCreare.length },
    { nome: 'Settimane del giro', valore: scritture.impostazioni.settimaneCiclo },
    { nome: 'Ingredienti nuovi', valore: scritture.ingredientiDaCreare.length },
    ...(sostituisce ? [{ nome: 'Piatti del piano attuale da disattivare', valore: disattivati }] : []),
  ];

  return (
    <>
      <div className="sc scroll-app con-dock" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px' }}>
        <h2 style={{ margin: '8px 6px 12px', fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)' }}>
          Il nuovo piano
        </h2>
        <ul
          aria-label="Il conto dell'import"
          style={{
            listStyle: 'none', margin: 0, padding: '0 16px', borderRadius: 18, background: 'var(--superficie)',
            border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
          }}
        >
          {voci.map((v, i) => (
            <li
              key={v.nome}
              style={{
                minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--bordo)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: 'var(--testo-2)' }}>{v.nome}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{v.valore}</span>
            </li>
          ))}
        </ul>
      </div>

      <Dock>
        {erroreEsecuzione && <ErroreSopraDock>{erroreEsecuzione}</ErroreSopraDock>}
        <button
          type="button"
          className="dock-primario"
          disabled={!pronto || eseguendo}
          onClick={() => (sostituisce ? setConfermaSostituzione(true) : void scrivi())}
        >
          {sostituisce ? 'SOSTITUISCI IL PIANO' : 'CREA IL PIANO'}
        </button>
      </Dock>

      {confermaSostituzione && (
        <FoglioDalBasso
          etichetta="Sostituire il piano attuale?"
          onChiudi={() => setConfermaSostituzione(false)}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
        >
          <DialogoConferma
            titolo="Sostituire il piano attuale?"
            testo="I piatti del nutrizionista non più presenti nella nuova dieta verranno disattivati; questa azione non si annulla."
            azione="SOSTITUISCI"
            tono="distruttivo"
            erroreTesto={ERRORE_ESECUZIONE}
            onConferma={scrivi}
            onAnnulla={() => setConfermaSostituzione(false)}
          />
        </FoglioDalBasso>
      )}
    </>
  );
}
