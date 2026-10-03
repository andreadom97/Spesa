'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { eseguiScritture, type AvanzamentoScritture } from '@/data/importa';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import {
  traduciBozza, BozzaIncompletaError, riassuntoScritture, type RiassuntoScritture, type ScrittureImport, type StimaPortata,
} from '@/domain/import/commit';
import { UNITA_IN_PAROLE, numeroInParole, testoConversione } from '@/domain/import/formati-tipici';
import { Dock, ErroreSopraDock } from '@/components/Dock';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { segnaPianoSalvato } from '@/components/piano-salvato';
import { StatoImporta } from './StatoImporta';
import { useLivelliImporta } from './livelli';
import { plurale } from './sezione';

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
 * Il testo del dialogo (spec 8c §H): «3 piatti nuovi, 12 aggiornati, 4 tolti da Piatti. I tuoi
 * piatti restano.», senza le parti a zero. La prima parte presente porta sempre il sostantivo
 * (correzione D11): senza piatti nuovi «12 piatti aggiornati, 4 tolti da Piatti.», mai «12 aggiornati».
 */
export function testoDialogo(r: RiassuntoScritture): string {
  const parti: string[] = [];
  const conNome = (n: number, uno: string, molti: string) =>
    parti.length === 0 ? plurale(n, `piatto ${uno}`, `piatti ${molti}`) : plurale(n, uno, molti);
  if (r.piattiNuovi > 0) parti.push(conNome(r.piattiNuovi, 'nuovo', 'nuovi'));
  if (r.piattiAggiornati > 0) parti.push(conNome(r.piattiAggiornati, 'aggiornato', 'aggiornati'));
  if (r.piattiTolti > 0) parti.push(`${conNome(r.piattiTolti, 'tolto', 'tolti')} da Piatti`);
  return `${parti.join(', ')}. I tuoi piatti restano.`;
}

/**
 * La nota sotto una stima portata in un'altra unità: come è stata portata, e se le righe sono più
 * d'una, che qui c'è la prima (fix round 1, I1).
 */
function notaStima(s: StimaPortata): string {
  const come = s.rifatta ? 'Stimato da me, senza il peso di un pezzo' : 'Col peso di un pezzo';
  return s.righe > 1 ? `${come} · ${s.righe} righe, qui la prima` : come;
}

/** I passi dell'attesa (spec 8c §H): ingredienti, piatti, fine. */
function testoAvanzamento(a: AvanzamentoScritture): string {
  if (a.passo === 'ingredienti') return 'Gli ingredienti.';
  if (a.passo === 'piatti') return `I piatti: ${a.fatti} di ${a.totale}.`;
  return 'Ancora un attimo.';
}

/**
 * Il riepilogo finale (spec fase 8a §C, 8c §H): traduce la bozza in scritture concrete
 * (`traduciBozza`, con ingredienti e repertorio riletti freschi, non quelli in memoria dal mount
 * del wizard, che un commit parziale precedente può aver superato) e mostra sempre il riassunto:
 * piatti nuovi, aggiornati, tolti, ingredienti nuovi, ingredienti che cambiano unità coi due
 * valori. Il Dock dice sempre SALVA IL PIANO; con un piano attuale (piatti del nutrizionista
 * attivi) passa dal Dialogo di conferma blu notte coi numeri. Dopo il tocco, «Salvo il piano…»
 * con l'avanzamento a passi; riuscito, il Piano con `replace` e il segno «Piano salvato».
 *
 * `BozzaIncompletaError` è un difetto di dati risolvibile solo tornando a Controlla (il passo
 * `revisione`): si mostra il suo messaggio esatto, con TORNA A CONTROLLA nel Dock.
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
  const [conferma, setConferma] = useState(false);
  const [eseguendo, setEseguendo] = useState(false);
  const [avanzamento, setAvanzamento] = useState<AvanzamentoScritture>({ passo: 'ingredienti' });
  const [erroreEsecuzione, setErroreEsecuzione] = useState<string | null>(null);
  // Sale a ogni retry (dopo un errore di eseguiScritture o del caricamento): rifà l'effetto sotto,
  // che rilegge ingredienti e repertorio e ricalcola da zero. L'idempotenza vive in traduciBozza
  // (riusaDishId, ingredienti già creati agganciati per nome): un retry che riusasse le scritture
  // di prima salterebbe quella rivalutazione e duplicherebbe ingredienti e piatti.
  const [tentativo, setTentativo] = useState(0);

  // Un solo indietro per la bozza (spec 8c §F): il dialogo, poi Ingredienti. Mentre le scritture
  // sono in corso («Salvo il piano…») l'indietro del passo non fa niente (correzione D1): tornare a
  // Ingredienti riscriverebbe import_draft dopo cancellaBozzaImport, e la bozza ricomparirebbe.
  const { chiudiTuttoPoi } = useLivelliImporta(
    conferma ? 1 : 0,
    () => setConferma(false),
    () => { if (!eseguendo) onStato({ ...stato, passo: 'formati' }); },
  );

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
   * Scrive, con l'avanzamento a passi. Riuscito: il segno «Piano salvato», poi il Piano con
   * `replace` dopo aver consumato le voci dei passi (`chiudiTuttoPoi`), così l'indietro di sistema
   * non torna su un Importa già chiuso. Fallito: l'errore sta sopra il Dock, e il Dock resta spento
   * fino al ricalcolo (spec §C). Non lancia: il dialogo è già chiuso e non mostra un suo errore.
   */
  async function scrivi() {
    if (!scritture || !pronto || eseguendo) return;
    setEseguendo(true);
    setAvanzamento({ passo: 'ingredienti' });
    setErroreEsecuzione(null);
    try {
      await eseguiScritture(scritture, setAvanzamento);
      segnaPianoSalvato();
      chiudiTuttoPoi(() => router.replace('/piano'));
    } catch (e) {
      console.error('importa: esecuzione dell’import fallita.', e);
      setErroreEsecuzione(ERRORE_ESECUZIONE);
      // Prima di riaccendere: senza, il tasto resterebbe acceso per un commit, fino all'effetto
      // del ricalcolo, e un tocco lì rieseguirebbe le scritture di prima (doppioni).
      setPronto(false);
      setEseguendo(false);
      setTentativo((n) => n + 1);
    }
  }

  if (erroreBozza) {
    return (
      <>
        <StatoImporta titolo="C'è ancora qualcosa da sistemare" testo={erroreBozza} conDock />
        <Dock>
          <button type="button" className="dock-primario" onClick={() => onStato({ ...stato, passo: 'revisione' })}>
            TORNA A CONTROLLA
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

  const r = riassuntoScritture(scritture);
  const voci: { nome: string; valore: string }[] = [
    { nome: 'Piatti nuovi', valore: String(r.piattiNuovi) },
    { nome: 'Piatti aggiornati', valore: String(r.piattiAggiornati) },
    { nome: 'Tolti da Piatti', valore: String(r.piattiTolti) },
    { nome: 'Ingredienti nuovi', valore: String(r.ingredientiNuovi) },
    { nome: 'Settimane del giro', valore: String(scritture.impostazioni.settimaneCiclo) },
    ...r.cambi.map((c) => ({ nome: `${c.nome} passa a ${UNITA_IN_PAROLE[c.a]}`, valore: `1 pz = ${numeroInParole(c.pesoPezzo)} g` })),
  ];

  return (
    <>
      {eseguendo ? (
        <StatoImporta titolo="Salvo il piano…" testo={testoAvanzamento(avanzamento)} luce stato occupato conDock />
      ) : (
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
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{v.valore}</span>
              </li>
            ))}
          </ul>
          {/* Le stime del lettore scritte in un'altra unità: la quantità che si salva non è quella vista in Controlla (fix round 1, I1). */}
          {r.stime.length > 0 && (
            <>
              <h3 style={{ margin: '20px 6px 8px', fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: 'var(--testo-2)' }}>
                {'Quantità proposte da me, nell\'unità dell\'ingrediente'}
              </h3>
              <ul
                aria-label="Le quantità proposte da me, portate nell'unità dell'ingrediente"
                style={{
                  listStyle: 'none', margin: 0, padding: '0 16px', borderRadius: 18, background: 'var(--superficie)',
                  border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
                }}
              >
                {r.stime.map((s, i) => (
                  <li
                    key={`${s.nome}-${i}`}
                    style={{
                      minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--bordo)',
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: 'var(--ink)' }}>{s.nome}</span>
                      <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--testo-2)' }}>{notaStima(s)}</span>
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                      {testoConversione(s.da, s.a)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <Dock>
        {erroreEsecuzione && <ErroreSopraDock>{erroreEsecuzione}</ErroreSopraDock>}
        <button
          type="button"
          className="dock-primario"
          disabled={!pronto || eseguendo}
          onClick={() => (r.pianoAttuale ? setConferma(true) : void scrivi())}
        >
          SALVA IL PIANO
        </button>
      </Dock>

      {conferma && (
        <FoglioDalBasso
          etichetta="Salvare il nuovo piano?"
          onChiudi={() => setConferma(false)}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
        >
          <DialogoConferma
            titolo="Salvare il nuovo piano?"
            testo={testoDialogo(r)}
            azione="SALVA"
            tono="primario"
            erroreTesto={ERRORE_ESECUZIONE}
            onConferma={async () => {
              // Il dialogo si chiude subito: l'attesa a passi è la stessa con e senza dialogo.
              setConferma(false);
              void scrivi();
            }}
            onAnnulla={() => setConferma(false)}
          />
        </FoglioDalBasso>
      )}
    </>
  );
}
