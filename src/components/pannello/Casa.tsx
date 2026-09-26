'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { creaInvito, entraInCasa, esciDallaCasa, rimuoviMembro } from '@/data/casa';
import { Etichetta, MessaggioErrore, STILE_PILLOLA, TastoPrimario, TastoSecondario } from '@/components/controlli';
import { usePannello } from './PannelloProvider';
import { useDatiPannello } from './DatiPannello';
import { PiedePannello } from './PiedePannello';
import { indirizzoPannello } from './indirizzi';
import { AvvisoCasaCambiata, Carico, ErroreCaricamento, Nota, STILE_BLOCCO } from './pezzi';

/** Otto caratteri, come li genera `crea_invito` (migrazione 0012). */
const LUNGHEZZA_CODICE = 8;
/**
 * `crea_invito()` scrive `scade_il = now() + interval '1 hour'` ma restituisce solo il codice:
 * la scadenza si conta sul telefono, dall'arrivo della risposta. Può essere indietro di qualche
 * secondo rispetto al server, mai avanti.
 */
export const DURATA_CODICE_MS = 60 * 60_000;
const CONTROLLO_SCADENZA_MS = 60_000;
const DURATA_COPIATO_MS = 2000;

// I testi di oggi, col loro apostrofo tipografico: vengono da `src/app/(app)/impostazioni/page.tsx`
// com'era prima della fase 5 (commit f983c43, righe 744–804); oggi quel file è solo un rimando
// al pannello, e il testo di prima si legge nella storia di git.
const TESTO_DA_SOLO = 'Chi entra nella tua casa usa i tuoi dati come fossero suoi: vede e cambia lista, piano, dispensa e piatti, e può anche cancellarli. Il suo piano resta da parte finché non esce. Dai il codice solo a chi vive con te.';
const TESTO_MEMBRO = 'Vedi e cambi la sua lista, il suo piano e la sua dispensa, come fossero tuoi. I tuoi restano da parte.';
const NOTA_PROPRIETARIO = 'Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.';
const NOTA_CODICE = 'Vale un’ora. Dalle sue Impostazioni, l’altra persona lo inserisce qui sotto.';

/**
 * Il messaggio da mostrare se `entraInCasa` fallisce. Solo un `raise
 * exception` della funzione SQL (SQLSTATE P0001) porta un messaggio scritto
 * per l'utente, in italiano (`codice non valido o scaduto`, `sei già in una
 * casa: esci prima`…): quello si mostra così com'è. Ogni altro errore
 * (violazione di vincolo, rete, permessi) è un messaggio grezzo di Postgres o
 * del client, che non va mostrato: dice cose che non aiutano e a volte cose
 * che non dovrebbe.
 */
export function messaggioEntrata(errore: unknown): string {
  if (typeof errore === 'object' && errore !== null) {
    const { code, message } = errore as { code?: unknown; message?: unknown };
    if (code === 'P0001' && typeof message === 'string' && message) return message;
  }
  return 'Non siamo riusciti a entrare. Riprova.';
}

/** «K7P3QX2M» → «K 7 P 3 Q X 2 M»: lo screen reader lo compita (§C.7). */
export function codiceCompitato(codice: string): string {
  return codice.split('').join(' ');
}

/**
 * Ricarica l'app da capo: dopo entra/esci l'id della casa cambia e ogni stato
 * in memoria è di un'altra casa, e un reload completo è l'unico modo onesto di
 * svuotarlo. Incapsulato perché `window.location.assign` non si spia in jsdom.
 */
function ricaricaSu(percorso: string) {
  window.location.assign(percorso);
}

interface Membro { id: string; email: string }

const STILE_TITOLO_SCHEDA = { margin: 0, padding: '0 4px', fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', overflowWrap: 'anywhere' as const };
const STILE_CORPO = { margin: 0, padding: '0 4px', fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' };
const STILE_ETICHETTA_BLOCCO = { margin: 0, padding: '0 4px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' };
const STILE_EMAIL = { flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', overflowWrap: 'anywhere' as const, color: 'var(--ink)' };

/**
 * Casa condivisa (§C.7, frame 14–18, 26), nei tre ruoli: da solo invita a
 * creare un codice o a inserirne uno; da proprietario elenca chi c'è, lascia
 * togliere ognuno e offre un altro codice; da membro dice di chi è la casa e
 * lascia uscire. TOGLI ed ESCI DALLA CASA passano dal Dialogo di conferma, e
 * i loro errori sono i testi di oggi, nel dialogo: non passano da
 * `salvaImpostazioni`, e l'avviso «La casa è cambiata…» non li sostituisce.
 * I primari stanno nel piede fisso del pannello (§B.1, §C.9).
 *
 * Il codice creato vive nello stato della sotto-schermata: uscendo da Casa il
 * riquadro si perde, e il codice sul server resta valido fino alla sua ora.
 */
export function Casa() {
  const { mostraDialogo } = usePannello();
  const { stato, ricaricaCasa, casaCambiata } = useDatiPannello();
  const pathname = usePathname();
  const [codice, setCodice] = useState<{ testo: string; scadeAlle: number } | null>(null);
  const [creando, setCreando] = useState(false);
  const [erroreCodice, setErroreCodice] = useState(false);
  const [copia, setCopia] = useState<'ferma' | 'copiato' | 'errore'>('ferma');
  const [scritto, setScritto] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erroreEntrata, setErroreEntrata] = useState<string | null>(null);
  // Il timer che riporta COPIATO a COPIA: parte nel gestore del tocco, non in un effetto, così
  // c'è già quando COPIATO compare; si ferma se la sotto-schermata si smonta.
  const timerCopiato = useRef<number | undefined>(undefined);
  // Falso dopo lo smontaggio: una copia ancora in volo, quando finisce, non crea più il timer.
  const montato = useRef(false);

  // La scadenza del codice: ogni minuto e al ritorno in primo piano (§C.7, §L).
  useEffect(() => {
    if (!codice) return;
    const controlla = () => {
      if (Date.now() >= codice.scadeAlle) {
        setCodice(null);
        setCopia('ferma');
      }
    };
    const timer = window.setInterval(controlla, CONTROLLO_SCADENZA_MS);
    const suVisibilita = () => {
      if (document.visibilityState === 'visible') controlla();
    };
    document.addEventListener('visibilitychange', suVisibilita);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', suVisibilita);
    };
  }, [codice]);

  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
      window.clearTimeout(timerCopiato.current);
    };
  }, []);

  if (stato.stato === 'carico') return <Carico />;
  if (stato.stato === 'errore' || stato.dati.casa === null) {
    // Frame 26: senza la casa non si sa il ruolo; niente RIPROVA, come dice il testo.
    return <ErroreCaricamento testo="Non riusciamo a leggere la casa. Riprova più tardi." />;
  }
  const casa = stato.dati.casa;
  const io = stato.dati.utente.email;
  // Accoppiati per indice da `stato_casa`: TOGLI usa l'id, non l'email.
  const membri: Membro[] = casa.id.map((id, i) => ({ id, email: casa.email[i] }));
  const ruolo = casa.ruolo === 'proprietario' && membri.length === 0 ? 'solo' : casa.ruolo;

  async function crea() {
    if (creando) return;
    setCreando(true);
    setErroreCodice(false);
    try {
      const testo = await creaInvito();
      setCodice({ testo, scadeAlle: Date.now() + DURATA_CODICE_MS });
      setCopia('ferma');
    } catch (e) {
      console.error('pannello/casa: creazione del codice fallita.', e);
      setErroreCodice(true);
    } finally {
      setCreando(false);
    }
  }

  async function copiaCodice(testo: string) {
    try {
      // Senza `navigator.clipboard` (contesto non sicuro, browser vecchio) lancia: vale come un fallimento.
      await navigator.clipboard.writeText(testo);
      // Smontata mentre `writeText` era in volo: il cleanup è già passato, nessun timer dopo.
      if (!montato.current) return;
      // COPIATO per 2 s, poi di nuovo COPIA; un tocco nuovo riparte da 2 s.
      window.clearTimeout(timerCopiato.current);
      timerCopiato.current = window.setTimeout(() => setCopia('ferma'), DURATA_COPIATO_MS);
      setCopia('copiato');
    } catch (e) {
      console.error('pannello/casa: copia del codice fallita.', e);
      if (montato.current) setCopia('errore');
    }
  }

  async function entra() {
    if (scritto.length < LUNGHEZZA_CODICE || entrando) return;
    setEntrando(true);
    setErroreEntrata(null);
    try {
      await entraInCasa(scritto);
      ricaricaSu('/lista');
    } catch (e) {
      console.error('pannello/casa: entrata nella casa fallita.', e);
      setErroreEntrata(messaggioEntrata(e));
      setEntrando(false);
    }
  }

  function apriTogli(m: Membro) {
    mostraDialogo({
      titolo: `Togliere ${m.email} dalla casa?`,
      testo: 'Non vedrà più la tua lista, il piano e la dispensa, e torna ai suoi dati. Per rientrare le serve un codice nuovo.',
      azione: 'TOGLI',
      tono: 'distruttivo',
      erroreTesto: 'Non siamo riusciti a togliere. Riprova.',
      onConferma: async () => {
        try {
          await rimuoviMembro(m.id);
        } catch (e) {
          console.error('pannello/casa: rimozione del membro fallita.', e);
          throw e;
        }
        // Tolto davvero: la casa si riallinea al server. Se la rilettura
        // fallisce non si dice «non siamo riusciti» (sarebbe falso): vale la
        // casa di prima senza di lui, e senza membri si torna allo stato da solo.
        const restano = membri.filter((x) => x.id !== m.id);
        await ricaricaCasa({
          ruolo: restano.length > 0 ? 'proprietario' : 'solo',
          email: restano.map((x) => x.email),
          id: restano.map((x) => x.id),
        });
      },
    });
  }

  function apriEsciCasa(email: string) {
    mostraDialogo({
      titolo: `Uscire dalla casa di ${email}?`,
      testo: 'Torni alla tua lista, al tuo piano e alla tua dispensa, come li avevi lasciati. Per rientrare ti serve un codice nuovo.',
      azione: 'ESCI DALLA CASA',
      tono: 'distruttivo',
      erroreTesto: 'Non siamo riusciti a uscire. Riprova.',
      onConferma: async () => {
        try {
          await esciDallaCasa();
        } catch (e) {
          console.error('pannello/casa: uscita dalla casa fallita.', e);
          throw e;
        }
        // Una navigazione piena, come oggi, che riapre il pannello su Casa,
        // nello stato da solo, sopra la stessa pagina (§C.7).
        ricaricaSu(indirizzoPannello(pathname, 'casa'));
      },
    });
  }

  const riquadroCodice = codice && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Etichetta dal disegno (frame 15), confermata da Andrea il 26/09. */}
      <div style={{ padding: '6px 4px 0' }}><Etichetta>CODICE DELLA CASA</Etichetta></div>
      <div style={{ height: 64, borderRadius: 14, background: 'rgba(20,22,58,0.04)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 0 16px' }}>
        {/* `role="img"`: su un div senza ruolo (generic, ARIA 1.2) l'aria-label non vale e lo
            screen reader leggerebbe «K7P3QX2M» come una parola; da immagine legge il nome
            compitato (§C.7), e il testo visibile dentro resta presentazionale. */}
        <div
          role="img"
          aria-label={`Codice della casa: ${codiceCompitato(codice.testo)}`}
          style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 700, letterSpacing: '0.16em', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}
        >
          {codice.testo}
        </div>
        <button
          type="button"
          onClick={() => void copiaCodice(codice.testo)}
          style={{ ...STILE_PILLOLA, flex: 'none', background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid var(--bordo)' }}
        >
          {copia === 'copiato' ? 'COPIATO' : 'COPIA'}
        </button>
      </div>
      {copia === 'errore' && <MessaggioErrore ruolo="alert">Non siamo riusciti a copiarlo. Dettalo a voce.</MessaggioErrore>}
      <Nota>{NOTA_CODICE}</Nota>
    </div>
  );

  // Finché il codice vale, il piede perde CREA UN CODICE (frame 15, 16).
  const piedeCrea = !codice && (
    <PiedePannello>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {erroreCodice && <MessaggioErrore ruolo="alert">Non siamo riusciti a creare il codice. Riprova.</MessaggioErrore>}
        {ruolo === 'solo' ? (
          <TastoPrimario onClick={() => void crea()} disabled={creando}>CREA UN CODICE</TastoPrimario>
        ) : (
          <TastoSecondario onClick={() => void crea()} disabled={creando}>CREA UN CODICE</TastoSecondario>
        )}
      </div>
    </PiedePannello>
  );

  if (ruolo === 'membro') {
    const proprietario = casa.email[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {casaCambiata && <AvvisoCasaCambiata />}
        <section style={{ ...STILE_BLOCCO, padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={STILE_TITOLO_SCHEDA}>{`Sei nella casa di ${proprietario}`}</h3>
          <p style={STILE_CORPO}>{TESTO_MEMBRO}</p>
        </section>
        <PiedePannello>
          <TastoSecondario onClick={() => apriEsciCasa(proprietario)}>ESCI DALLA CASA</TastoSecondario>
        </PiedePannello>
      </div>
    );
  }

  if (ruolo === 'proprietario') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {casaCambiata && <AvvisoCasaCambiata />}
        <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column' }}>
          <h3 style={STILE_ETICHETTA_BLOCCO}>LA TUA CASA</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '6px 4px' }}>
            <span style={STILE_EMAIL}>{io}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--testo-2)' }}>TU</span>
          </div>
          {membri.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '6px 0 6px 4px', borderTop: '1px solid var(--bordo)' }}>
              <span style={STILE_EMAIL}>{m.email}</span>
              <button
                type="button"
                // Dal disegno (frame 16), confermato da Andrea il 26/09.
                aria-label={`Togli ${m.email} dalla casa`}
                onClick={() => apriTogli(m)}
                style={{ ...STILE_PILLOLA, flex: 'none', background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid rgba(20,22,58,0.09)' }}
              >
                TOGLI
              </button>
            </div>
          ))}
          <p style={{ margin: 0, padding: '8px 4px 12px', fontSize: 12.5, lineHeight: 1.4, color: 'var(--testo-2)' }}>{NOTA_PROPRIETARIO}</p>
          {riquadroCodice}
        </section>
        {piedeCrea}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <section style={{ ...STILE_BLOCCO, padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={STILE_TITOLO_SCHEDA}>Fai la spesa con qualcuno?</h3>
        <p style={STILE_CORPO}>{TESTO_DA_SOLO}</p>
        {riquadroCodice}
      </section>
      <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ ...STILE_ETICHETTA_BLOCCO, paddingBottom: 0 }}>HO UN CODICE</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={scritto}
            onChange={(e) => setScritto(e.target.value.toUpperCase())}
            aria-label="Ho un codice"
            placeholder="Ho un codice"
            maxLength={LUNGHEZZA_CODICE}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 14px',
              background: 'var(--superficie)', border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)',
            }}
          />
          <button
            type="button"
            onClick={() => void entra()}
            disabled={scritto.length < LUNGHEZZA_CODICE || entrando}
            style={{
              ...STILE_PILLOLA, flex: 'none', border: '1px solid transparent',
              background: scritto.length < LUNGHEZZA_CODICE ? 'rgba(20,22,58,0.10)' : 'var(--ink)',
              color: scritto.length < LUNGHEZZA_CODICE ? 'var(--ter)' : 'var(--superficie)',
              opacity: entrando ? 0.5 : 1,
            }}
          >
            ENTRA
          </button>
        </div>
        {erroreEntrata && <MessaggioErrore ruolo="alert">{erroreEntrata}</MessaggioErrore>}
      </section>
      {piedeCrea}
    </div>
  );
}
