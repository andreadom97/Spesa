'use client';

import type { MealSlotDef, AreaId } from '@/domain/types';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';
import { testoCadenza } from '@/domain/pantry';
import { cancellaDispensa, EVENTO_DISPENSA_CAMBIATA } from '@/data/dispensa';
import { esci } from '@/data/sessione';
import { usePannello } from './PannelloProvider';
import { StatoDatiPannello, useDatiPannello, type DatiPannello } from './DatiPannello';
import { TesserePannello } from './TesserePannello';
import { RigaImpostazione } from './RigaImpostazione';
import { CampoPersone } from './CampoPersone';
import { NotaRisparmio, testoRisparmio } from './NotaRisparmio';
import { AvvisoCasaCambiata, BloccoGruppo } from './pezzi';
import { VERSIONE } from './versione';

// Testi dal disegno (frame 03, 04), confermati da Andrea il 26/09 (spec §I).
const NOTA_PASTI_A_CASA = 'Il default con cui nasce ogni settimana nuova.';
const NOTA_CADENZA = 'Ogni quanto ti chiedo se hai ancora olio, sale, farina.';
const NOTA_ORDINE = "L'ordine in cui compaiono in Lista: mettilo come gira il tuo supermercato.";
const NOTA_CANCELLA = 'Svuota quello che hai in casa. I piatti e il piano restano.';

/** Le celle fuori casa della matrice: `assenzeAbituali` vale true = fuori. */
export function fuoriCasa(defs: MealSlotDef[]): number {
  return defs.reduce((n, d) => n + d.assenzeAbituali.filter(Boolean).length, 0);
}

export function valorePastiACasa(n: number): string {
  return n === 0 ? 'NESSUNO FUORI CASA' : `${n} FUORI CASA`;
}

export function valoreRotazione(settimane: number): string {
  return settimane <= 1 ? 'NESSUNA' : `${settimane} SETT.`;
}

/** DI BASE quando l'ordine è ORDINE_AREE_DEFAULT (§B.4). */
export function ordinePersonalizzato(ordine: AreaId[]): boolean {
  return ordine.length !== ORDINE_AREE_DEFAULT.length || ordine.some((a, i) => a !== ORDINE_AREE_DEFAULT[i]);
}

/**
 * Il testo del dialogo di Esci (§D). Senza email letta (`leggiUtente` non lancia e torna
 * vuoto) la frase non può nominarla: «via email» al posto di «a {email}» (decisione del
 * controller del 26/09, da confermare con Andrea).
 */
export function testoEsci(email: string): string {
  return email
    ? `I tuoi dati restano. Per rientrare ti mandiamo un link a ${email}.`
    : 'I tuoi dati restano. Per rientrare ti mandiamo un link via email.';
}

function dueCifre(n: number): string {
  return String(n).padStart(2, '0');
}

/** `Cancellata il {gg/mm} alle {hh:mm}.` (§D), nell'ora del telefono. */
export function notaCancellata(quando: Date): string {
  return `Cancellata il ${dueCifre(quando.getDate())}/${dueCifre(quando.getMonth() + 1)} alle ${dueCifre(quando.getHours())}:${dueCifre(quando.getMinutes())}.`;
}

/**
 * La cima del pannello (§B.3, §B.4, frame 03–04, 23–25). Le tessere e il
 * separatore ci sono sempre; i blocchi aspettano i dati (`StatoDatiPannello`:
 * `CARICO…`, o l'errore con RIPROVA). Cancella la dispensa ed Esci passano dal
 * Dialogo di conferma del provider (§D): la conferma riuscita lo chiude.
 */
export function Cima() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TesserePannello />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px 0' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--testo-2)' }}>
          SI CAMBIANO DI RADO
        </span>
        <span aria-hidden="true" style={{ flex: 1, height: 1, background: 'var(--bordo)' }} />
      </div>
      <StatoDatiPannello>{(dati) => <BlocchiCima dati={dati} />}</StatoDatiPannello>
    </div>
  );
}

/** I cinque Blocchi di gruppo e il piede di versione, coi dati pronti. */
function BlocchiCima({ dati }: { dati: DatiPannello }) {
  const { entra, mostraDialogo } = usePannello();
  const { casaCambiata, cancellataIl, segnaCancellata } = useDatiPannello();
  const { impostazioni: imp, slotDefs, risparmio, utente } = dati;

  function apriCancella() {
    mostraDialogo({
      titolo: 'Cancellare la dispensa?',
      testo: 'Tutto quello che risulta in casa torna a zero, anche le confezioni in congelatore e i pronti. Piatti e piano restano. Non si può annullare.',
      azione: 'CANCELLA',
      tono: 'distruttivo',
      erroreTesto: 'Non siamo riusciti a cancellare la dispensa. Riprova.',
      onConferma: async () => {
        await cancellaDispensa();
        window.dispatchEvent(new Event(EVENTO_DISPENSA_CAMBIATA));
        // Nel provider, non qui: la nota dura fino alla chiusura del pannello (§D).
        segnaCancellata(new Date());
      },
    });
  }

  function apriEsci(email: string) {
    mostraDialogo({
      titolo: 'Uscire da Dispesa?',
      testo: testoEsci(email),
      azione: 'ESCI',
      tono: 'primario',
      erroreTesto: 'Non siamo riusciti a farti uscire. Riprova.',
      onConferma: () => esci(),
    });
  }

  return (
    <>
      {casaCambiata && <AvvisoCasaCambiata />}
      <BloccoGruppo titolo="La settimana di base">
        <RigaImpostazione
          nome="Pasti a casa"
          nota={NOTA_PASTI_A_CASA}
          finale={{ tipo: 'valore', valore: valorePastiACasa(fuoriCasa(slotDefs)), onApri: () => entra('pasti-a-casa') }}
        />
        <RigaImpostazione
          nome="Gestione dei pasti"
          nota="Quanti pasti fai al giorno e come si chiamano."
          finale={{ tipo: 'valore', valore: `${slotDefs.length} PASTI`, onApri: () => entra('gestione-pasti') }}
        />
        <RigaImpostazione
          nome="Rotazione del piano"
          nota="Se il tuo piano si ripete a blocchi di settimane."
          finale={{ tipo: 'valore', valore: valoreRotazione(imp.settimaneCiclo), onApri: () => entra('rotazione') }}
        />
      </BloccoGruppo>
      <BloccoGruppo titolo="Come calcolo la lista">
        <CampoPersone />
        <RigaImpostazione
          nome="Cadenza dei controlli"
          nota={NOTA_CADENZA}
          finale={{ tipo: 'valore', valore: testoCadenza(imp.giorniControllo), onApri: () => entra('cadenza') }}
        />
        <RigaImpostazione
          nome="Ingredienti"
          nota="Area, confezione e come si consuma."
          finale={{ tipo: 'valore', valore: '', onApri: () => entra('ingredienti') }}
        />
      </BloccoGruppo>
      <BloccoGruppo titolo="Come la vedi in corsia">
        <RigaImpostazione
          nome="Ordine delle aree"
          nota={NOTA_ORDINE}
          finale={{ tipo: 'valore', valore: ordinePersonalizzato(imp.ordineAree) ? 'PERSONALIZZATO' : 'DI BASE', onApri: () => entra('aree') }}
        />
      </BloccoGruppo>
      <BloccoGruppo titolo="I tuoi dati">
        {testoRisparmio(risparmio) && <NotaRisparmio riassunto={risparmio} />}
        <RigaImpostazione
          nome="Cancella la dispensa"
          nota={cancellataIl ? notaCancellata(cancellataIl) : NOTA_CANCELLA}
          finale={{ tipo: 'azione', onAzione: apriCancella }}
        />
      </BloccoGruppo>
      <BloccoGruppo titolo="Account">
        {/* Senza nome né email (lettura dell'utente fallita) la riga informativa non c'è: resta Esci. */}
        {/* Un booleano, non la stringa vuota: BloccoGruppo terrebbe '' come figlio, col suo filetto. */}
        {(utente.nome !== '' || utente.email !== '') && (
          <RigaImpostazione nome={utente.nome} nota={utente.email} finale={{ tipo: 'niente' }} />
        )}
        <RigaImpostazione
          nome="Esci"
          nota="Per rientrare ti serve il link che ti mandiamo via email."
          finale={{ tipo: 'azione', tono: 'errore', onAzione: () => apriEsci(utente.email) }}
        />
      </BloccoGruppo>
      <p style={{ margin: 0, padding: '12px 6px 0', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--testo-2)' }}>
        {`Versione ${VERSIONE}`}
      </p>
    </>
  );
}
