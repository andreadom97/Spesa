'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AreaId, Dish, Ingredient } from '@/domain/types';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { leggiImpostazioni } from '@/data/impostazioni';
import { Testata } from '@/components/Testata';
import { Porta } from '@/components/Porta';
import { ElencoPiatti } from './ElencoPiatti';
import { PILLOLA_DA, destinazioneDa, leggiDaPiatti, type DaPiatti } from './da';

interface Repertorio {
  piatti: Dish[];
  ingredienti: Ingredient[];
  ordineAree: AreaId[];
}

type Indietro = { etichetta: string; ariaLabel: string; onTorna: () => void };

/** Nessun evento da ascoltare: `da` cambia solo con una navigazione, che rimonta la pagina. */
const nessunaIscrizione = () => () => {};

/**
 * `da` esiste solo nel browser (URL e `sessionStorage`): sul server e durante
 * l'idratazione vale `impostazioni`, poi React rifà il render col valore vero,
 * senza mancata corrispondenza e senza un setState in un effetto.
 */
function useDaPiatti(): DaPiatti {
  return useSyncExternalStore(
    nessunaIscrizione,
    () => leggiDaPiatti(window.location.search),
    (): DaPiatti => 'impostazioni',
  );
}

/**
 * Il repertorio: i piatti reali dell'utente in una lista sola (spec fase 3
 * §A). Niente filtro per pasto: un piatto non appartiene a un pasto, ci va a
 * finire quando lo metti nel piano. Questa pagina carica i dati e sceglie fra
 * errore, stato vuoto ed elenco; l'elenco sta in `ElencoPiatti.tsx`.
 * Si apre dal pannello (§G.2) o dagli stati vuoti di Lista e Piano; la
 * pillola della Testata dice dove torna (`da.ts`).
 */
export default function Piatti() {
  const router = useRouter();
  const da = useDaPiatti();
  const indietro: Indietro = { ...PILLOLA_DA[da], onTorna: () => router.push(destinazioneDa(da)) };
  const [repertorio, setRepertorio] = useState<Repertorio | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiRepertorio(), leggiIngredienti(), leggiImpostazioni()])
      .then(([piatti, ingredienti, impostazioni]) => {
        if (vivo) setRepertorio({ piatti, ingredienti, ordineAree: impostazioni.ordineAree });
      })
      .catch((errore) => {
        console.error('piatti: caricamento del repertorio fallito.', errore);
        if (vivo) setErrore('Non riusciamo a caricare i piatti. Riprova più tardi.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (errore) {
    return (
      <Cornice indietro={indietro}>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{errore}</p>
      </Cornice>
    );
  }

  if (!repertorio) {
    // Nessuno stato di caricamento è nell'artboard: la testata basta finché i dati non arrivano.
    return <Cornice indietro={indietro} />;
  }

  if (repertorio.piatti.length === 0) {
    return <VuotoPiatti indietro={indietro} />;
  }

  return (
    <Cornice indietro={indietro}>
      <ElencoPiatti piatti={repertorio.piatti} ingredienti={repertorio.ingredienti} ordineAree={repertorio.ordineAree} />
    </Cornice>
  );
}

/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre.
 *  Piatti non è più una voce della tab bar (spec fase 5 §G): la Testata è sempre in modo indietro. */
function Cornice({ children, indietro }: { children?: ReactNode; indietro: Indietro }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Piatti" indietro={indietro} />
      {children}
    </div>
  );
}

/**
 * Stato vuoto, che è anche l'onboarding: la schermata delle due porte
 * (spec docs/superpowers/specs/2026-09-06-due-porte-design.md §2.1).
 *
 * Non segue l'artboard design/VuotoPiatti.dc.html: quello è stato disegnato
 * prima che l'import esistesse e conosce una sola strada, l'editor completo.
 * Le due porte lo sostituiscono per scelta (spec §5, limite dichiarato: l'artboard
 * va aggiornato in un secondo momento). Chi ha una dieta la fotografa, chi cucina
 * sempre le stesse cose le scrive; l'editor completo resta a portata di link.
 * Nessuna affermazione di salute nel copy: l'app trascrive, non valuta.
 */
function VuotoPiatti({ indietro }: { indietro: Indietro }) {
  return (
    <Cornice indietro={indietro}>
      <div className="sc scroll-app" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px' }}>
        <div
          style={{
            fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2,
            color: 'var(--ink)', margin: '8px 6px 6px',
          }}
        >
          Da dove partiamo?
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--sec)', margin: '0 6px 16px' }}>
          Dispesa costruisce la lista dai piatti che mangi. Ce li dici una volta sola, in uno di questi due modi.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Porta
            titolo="Ho una dieta"
            testo="Fotografa le pagine del piano che ti hanno dato: piatti e grammature li legge l'app, tu controlli e confermi."
          >
            <Link href="/importa" className="porta-azione">IMPORTA LA DIETA</Link>
          </Porta>
          <Porta
            titolo="Cucino sempre le stesse cose"
            testo="Scrivi otto o dieci piatti che fai davvero, con gli ingredienti e quanto ne usi. Da lì la settimana gira da sola."
          >
            <Link href="/piatti/veloce" className="porta-azione">SCRIVI I MIEI PIATTI</Link>
          </Porta>
        </div>

        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '16px 6px 0' }}>
          Preferisci fare a modo tuo?{' '}
          <Link href="/piatti/nuovo" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
            {"Crea un piatto dall'editor completo"}
          </Link>
        </div>
      </div>
    </Cornice>
  );
}
