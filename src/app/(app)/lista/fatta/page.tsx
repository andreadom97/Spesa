'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ORDINE_MARCHIO, coloreArea } from '@/domain/aree';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, chiudiSpesa, type ListaSalvata, type SezioneSalvata } from '@/data/lista';
import { Testata } from '@/components/Testata';

const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

/** "31 AGO — 6 SET": stessa formattazione di /lista. */
function formattaPillola(dataInizio: string): string {
  const inizio = new Date(`${dataInizio}T00:00:00Z`);
  const fine = new Date(inizio.getTime() + 6 * 86_400_000);
  const g = (d: Date) => `${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`;
  return `${g(inizio)} — ${g(fine)}`;
}

/**
 * Solo la classe "voci" conta come in /lista: i controlli non si spuntano,
 * si rispondono. Una lista è davvero finita solo quando ogni voce è spuntata
 * *e* non resta nessun controllo in sospeso da rispondere.
 */
function contaEControlli(sezioni: SezioneSalvata[]): { totale: number; fatte: number; controlliInSospeso: number } {
  let totale = 0;
  let fatte = 0;
  let controlliInSospeso = 0;
  for (const s of sezioni) {
    for (const v of s.voci) {
      totale += 1;
      if (v.spuntato) fatte += 1;
    }
    controlliInSospeso += s.controlli.length;
  }
  return { totale, fatte, controlliInSospeso };
}

function tuttoFatto(lista: ListaSalvata): { fatto: boolean; totale: number } {
  const c = contaEControlli([...lista.base, ...lista.topup]);
  return { fatto: c.totale > 0 && c.fatte === c.totale && c.controlliInSospeso === 0, totale: c.totale };
}

interface Stato {
  weekId: string;
  settimanaLabel: string;
  totaleVoci: number;
}

/**
 * "Hai preso tutto": l'unico momento in cui il residuo smette di essere
 * previsto e diventa reale. Senza questo tap la registrazione silenziosa non
 * ha un istante in cui avvenire — la settimana dopo la lista ricomprerebbe
 * tutto da capo.
 *
 * Raggiungibile solo a spesa davvero finita: un link diretto o una ricarica
 * a metà spunta non deve mai mostrare "tutto pieno" quando non lo è, quindi
 * si torna a /lista invece di inventare un traguardo.
 */
export default function ListaFatta() {
  const router = useRouter();
  const [stato, setStato] = useState<Stato | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [chiudendo, setChiudendo] = useState(false);
  const [erroreChiusura, setErroreChiusura] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carica() {
      try {
        const settimana = await leggiSettimanaCorrente();
        if (!settimana) {
          router.replace('/lista');
          return;
        }
        const lista = await leggiListe(settimana.id);
        const esito = lista ? tuttoFatto(lista) : { fatto: false, totale: 0 };
        if (!lista || !esito.fatto) {
          router.replace('/lista');
          return;
        }
        if (!vivo) return;
        setStato({
          weekId: settimana.id,
          settimanaLabel: formattaPillola(settimana.dataInizio),
          totaleVoci: esito.totale,
        });
      } catch {
        if (vivo) setErroreCaricamento('Non riusciamo a caricare la spesa. Riprova più tardi.');
      }
    }

    carica();
    return () => {
      vivo = false;
    };
  }, [router]);

  async function onChiudi() {
    if (!stato || chiudendo) return;
    setChiudendo(true);
    setErroreChiusura(null);
    try {
      await chiudiSpesa(stato.weekId);
      router.push('/settimana');
    } catch {
      setErroreChiusura('Non siamo riusciti a chiudere la spesa. Riprova.');
      setChiudendo(false);
    }
  }

  if (erroreCaricamento) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{erroreCaricamento}</p>
      </Cornice>
    );
  }

  if (!stato) {
    // Nessuno stato di caricamento nell'artboard: la testata basta finché i dati non arrivano.
    return <Cornice />;
  }

  return (
    <Cornice settimana={stato.settimanaLabel}>
      <div
        className="sc"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
        }}
      >
        <div style={{ padding: '26px 20px', borderRadius: 22, background: '#FFFFFF', border: '1px solid rgba(20,22,58,0.07)', textAlign: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 22px)', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
            {ORDINE_MARCHIO.map((area) => (
              <span key={area} style={{ width: 22, height: 22, borderRadius: 6, background: coloreArea(area), display: 'block' }} />
            ))}
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)', marginBottom: 8 }}>
            Hai preso tutto
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: '#8A8A96' }}>
            {stato.totaleVoci} voci su {stato.totaleVoci}, {ORDINE_MARCHIO.length} aree finite. Il marchio in
            alto è tutto pieno: ogni area è a posto, non ti manca niente.
          </div>
        </div>

        <div style={{ padding: '16px 18px', borderRadius: 20, background: 'rgba(20,22,58,0.045)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#8A8A96', marginBottom: 7 }}>
            CHIUDENDO LA SPESA
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            L’app registra cosa hai comprato e quando. Serve solo a ricordarti fra 90 giorni che l’olio sta per
            finire: non lo vedi da nessuna parte finché non serve.
          </div>
        </div>
      </div>

      {erroreChiusura && (
        <p style={{ margin: '0 16px 4px', fontSize: 12.5, color: 'var(--sec)' }}>{erroreChiusura}</p>
      )}
      <div style={{ padding: '6px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={onChiudi}
          disabled={chiudendo}
          style={{
            width: '100%', height: 54, borderRadius: 18, textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            background: '#14163A', boxShadow: '0 3px 10px rgba(20,22,58,0.24)', color: '#FFFFFF',
            opacity: chiudendo ? 0.7 : 1,
          }}
        >
          CHIUDI LA SPESA
        </button>
        <Link
          href="/lista"
          style={{
            width: '100%', height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.09em',
            background: 'transparent', border: '1.5px solid rgba(20,22,58,0.16)', color: 'var(--ink)',
          }}
        >
          TORNA ALLA LISTA
        </Link>
      </div>
    </Cornice>
  );
}

/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre. */
function Cornice({ settimana, children }: { settimana?: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Spesa" settimana={settimana} aree={[]} />
      {children}
    </div>
  );
}
