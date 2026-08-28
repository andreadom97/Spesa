'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AreaId } from '@/domain/types';
import { leggiImpostazioni, salvaImpostazioni } from '@/data/impostazioni';
import { coloreArea, nomeArea } from '@/domain/aree';

interface Dati {
  porzioni: number;
  ordine: AreaId[];
}

/**
 * Ordine dei reparti: l'unica personalizzazione delle sei aree fisse (nomi e
 * insieme non cambiano, solo la sequenza). A differenza della pagina
 * Impostazioni, qui il riordino resta locale finché non si preme SALVA
 * ORDINE — l'artboard disegna esplicitamente quel pulsante, niente
 * auto-save a ogni freccia.
 *
 * Il marchio non segue quest'ordine: usa ORDINE_MARCHIO (src/domain/aree.ts),
 * fisso e indipendente da qui.
 */
export default function OrdineReparti() {
  const router = useRouter();

  const [dati, setDati] = useState<Dati | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroreSalvataggio, setErroreSalvataggio] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    leggiImpostazioni()
      .then((impostazioni) => {
        if (vivo) setDati({ porzioni: impostazioni.moltiplicatorePorzioni, ordine: impostazioni.ordineAree });
      })
      .catch((errore) => {
        console.error('impostazioni/reparti: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare l’ordine dei reparti. Riprova più tardi.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  function sposta(indice: number, delta: number) {
    if (!dati) return;
    const j = indice + delta;
    if (j < 0 || j >= dati.ordine.length) return;
    const copia = [...dati.ordine];
    const tmp = copia[indice];
    copia[indice] = copia[j];
    copia[j] = tmp;
    setErroreSalvataggio(null);
    setDati({ ...dati, ordine: copia });
  }

  async function salva() {
    if (!dati || salvando) return;
    setSalvando(true);
    setErroreSalvataggio(null);
    try {
      // moltiplicatorePorzioni viaggia invariato: questa pagina cambia solo
      // ordineAree, ma salvaImpostazioni scrive la riga intera.
      await salvaImpostazioni({ moltiplicatorePorzioni: dati.porzioni, ordineAree: dati.ordine });
      router.push('/impostazioni');
    } catch (errore) {
      console.error('impostazioni/reparti: salvataggio fallito.', errore);
      setErroreSalvataggio('Non siamo riusciti a salvare l’ordine. Riprova.');
      setSalvando(false);
    }
  }

  if (erroreCaricamento) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{erroreCaricamento}</p>
      </Cornice>
    );
  }

  if (!dati) {
    return <Cornice />;
  }

  return (
    <Cornice>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 18px' }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, color: 'var(--ink)', padding: '0 2px' }}>
          Ordine
          <br />
          dei reparti
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '12px 2px 20px' }}>
          Mettili nell’ordine in cui li incontri camminando nel tuo supermercato. La lista della spesa
          comparirà in quest’ordine, così non torni indietro fra le corsie. Le sei aree sono fisse: si
          cambia solo la sequenza.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dati.ordine.map((area, i) => {
            const puoSalire = i > 0;
            const puoScendere = i < dati.ordine.length - 1;
            return (
              <div
                key={area}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 16, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ter)', width: 16, flex: 'none' }}>
                  {i + 1}
                </span>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                  <path d="M6.6 6h6.8M6.6 10h6.8M6.6 14h6.8" stroke="var(--ter)" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
                <span style={{ width: 12, height: 12, borderRadius: 4, flex: 'none', background: coloreArea(area) }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--ink)' }}>
                  {nomeArea(area)}
                </span>
                <button
                  type="button"
                  onClick={() => sposta(i, -1)}
                  disabled={!puoSalire}
                  aria-label={`Sposta ${nomeArea(area)} in alto`}
                  style={{
                    width: 34, height: 34, flex: 'none', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: puoSalire ? 'rgba(20,22,58,0.06)' : 'rgba(20,22,58,0.02)', opacity: puoSalire ? 1 : 0.35,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M3.6 10 8 5.6 12.4 10" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => sposta(i, 1)}
                  disabled={!puoScendere}
                  aria-label={`Sposta ${nomeArea(area)} in basso`}
                  style={{
                    width: 34, height: 34, flex: 'none', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: puoScendere ? 'rgba(20,22,58,0.06)' : 'rgba(20,22,58,0.02)', opacity: puoScendere ? 1 : 0.35,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M3.6 6 8 10.4 12.4 6" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ margin: '26px 4px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
          ANTEPRIMA DELLA LISTA
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '15px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
          {dati.ordine.map((area) => (
            <span key={area} style={{ width: 26, height: 11, borderRadius: 4, display: 'inline-block', background: coloreArea(area) }} />
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--ter)' }}>
            DALL’ALTO IN BASSO
          </span>
        </div>

        {erroreSalvataggio && <p style={{ margin: '14px 6px 0', fontSize: 13, color: 'var(--sec)' }}>{erroreSalvataggio}</p>}
      </div>

      <div style={{ padding: '8px 16px 22px' }}>
        <button
          type="button"
          onClick={salva}
          disabled={salvando}
          style={{
            width: '100%', height: 54, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            background: 'var(--ink)', color: '#FFFFFF', boxShadow: '0 3px 10px rgba(20,22,58,0.24)',
          }}
        >
          {salvando ? 'SALVATAGGIO…' : 'SALVA ORDINE'}
        </button>
      </div>
    </Cornice>
  );
}

/**
 * Header minimale come in impostazioni/page.tsx, ma la freccia indietro va
 * alla pagina statica /impostazioni (non router.back()): questa è una
 * sottopagina fissa di quella, sullo stesso schema di
 * piatti/[id]/ingredienti/[ingId] che torna al piatto genitore.
 */
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/impostazioni"
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          IMPOSTAZIONI
        </span>
        <div style={{ width: 44, height: 44 }} />
      </div>
      {children}
    </div>
  );
}
