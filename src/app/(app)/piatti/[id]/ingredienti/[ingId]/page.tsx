'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { AreaId, ClasseResiduo, UnitaBase } from '@/domain/types';
import { salvaIngrediente, leggiIngredienti, eliminaIngrediente, IngredienteInUsoError } from '@/data/repertorio';
import { AREE } from '@/domain/aree';
import { Segmento } from '@/components/Segmento';

/**
 * Le tre spiegazioni sono copiate alla lettera da Ingrediente.dc.html,
 * apostrofi tipografici compresi: spiegano all'utente un concetto che non
 * conosce (le classi di residuo) ed è testo pensato e discusso, non da
 * riformulare.
 */
const SPIEGA_CLASSE: Record<ClasseResiduo, string> = {
  porzionabile:
    'La confezione copre più pasti. L’app calcola quanto ne resta dopo ogni porzione e lo riporta alla settimana dopo.',
  intero: 'Si conta a pezzi e non lascia resti frazionari: sei uova sono sei uova.',
  stima:
    'Non vale la pena contarlo a grammi. Ogni 90 giorni dall’ultimo acquisto la lista ti chiede se ne hai ancora.',
};

const TESTO_ELIMINA =
  'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato. Se è ancora usato in un ' +
  'piatto o in una lista della spesa, l’eliminazione viene bloccata: toglilo prima da lì.';

const OPZIONI_UNITA = [
  { id: 'g', label: 'G' },
  { id: 'ml', label: 'ML' },
  { id: 'pz', label: 'PZ' },
];

const OPZIONI_CLASSE = [
  { id: 'porzionabile', label: 'PORZIONABILE' },
  { id: 'intero', label: 'INTERO' },
  { id: 'stima', label: 'A STIMA' },
];

/** Stessa conversione hex->rgba duplicata in TesseraIngrediente.tsx: qui serve
 * per lo sfondo al 22% della cella d'area selezionata. */
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Editor delle proprietà di un ingrediente: crea (`ingId === 'nuovo'`) o
 * modifica un ingrediente del repertorio. Sono le proprietà da cui dipende
 * l'aritmetica del residuo (`residuo = residuo precedente + comprato -
 * consumato dal piano`): formato confezione e classe di residuo, più area e
 * deperibilità che decidono dove l'ingrediente finisce nella lista.
 */
export default function IngredienteEditor() {
  const { id, ingId } = useParams<{ id: string; ingId: string }>();
  const router = useRouter();
  const nuovo = ingId === 'nuovo';

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [nonTrovato, setNonTrovato] = useState(false);
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [nome, setNome] = useState('');
  const [area, setArea] = useState<AreaId | null>(null);
  const [unitaBase, setUnitaBase] = useState<UnitaBase>('g');
  const [classeResiduo, setClasseResiduo] = useState<ClasseResiduo>('porzionabile');
  // Default true come in Ingrediente.dc.html (this.state.deper = true, riga 86):
  // un default sbagliato qui si nota subito, perché finisce nel top-up, la
  // lista che si guarda più spesso — con false l'errore resterebbe sepolto
  // nella lista base settimanale.
  const [deperibile, setDeperibile] = useState(true);
  const [formatoTesto, setFormatoTesto] = useState('');

  useEffect(() => {
    let vivo = true;
    async function carica() {
      if (nuovo) {
        setCaricamento(false);
        return;
      }
      try {
        const catalogo = await leggiIngredienti();
        if (!vivo) return;
        const trovato = catalogo.find((i) => i.id === ingId);
        if (!trovato) {
          setNonTrovato(true);
        } else {
          setNome(trovato.nome);
          setArea(trovato.area);
          setUnitaBase(trovato.unitaBase);
          setClasseResiduo(trovato.classeResiduo);
          setDeperibile(trovato.deperibile);
          setFormatoTesto(String(trovato.formatoConfezione));
        }
      } catch {
        if (vivo) setErrore('Non riusciamo a caricare l’ingrediente. Riprova più tardi.');
      } finally {
        if (vivo) setCaricamento(false);
      }
    }
    carica();
    return () => {
      vivo = false;
    };
  }, [ingId, nuovo]);

  /**
   * Quello che fa list-builder: per la classe "intero" il formato memorizzato
   * viene ignorato e forzato a 1 (`ing.classeResiduo === 'intero' ? 1 :
   * ing.formatoConfezione`). Mostrare qui un altro formato mentirebbe
   * all'utente su cosa succede davvero in lista. L'unità passa a PZ perché
   * un ingrediente "intero" si conta a pezzi: resta comunque modificabile
   * dopo, non è una regola imposta altrove come il formato.
   */
  function scegliClasse(valore: string) {
    const classe = valore as ClasseResiduo;
    setClasseResiduo(classe);
    if (classe === 'intero') {
      setUnitaBase('pz');
      setFormatoTesto('1');
    }
  }

  const formatoConfezione = Number(formatoTesto);
  const nonValido =
    !nome.trim() ||
    area === null ||
    !formatoTesto.trim() ||
    Number.isNaN(formatoConfezione) ||
    formatoConfezione <= 0;

  async function salva() {
    if (nonValido || salvando || area === null) return;
    setSalvando(true);
    setErrore(null);
    try {
      await salvaIngrediente({
        id: nuovo ? undefined : ingId,
        nome: nome.trim(),
        unitaBase,
        area,
        classeResiduo,
        deperibile,
        formatoConfezione,
      });
      router.push(`/piatti/${id}`);
    } catch {
      setErrore('Non siamo riusciti a salvare l’ingrediente. Riprova.');
      setSalvando(false);
    }
  }

  /**
   * Su un ingrediente nuovo (mai salvato) non c'è niente da eliminare:
   * equivale ad annullare, senza chiedere conferma — stessa scelta già fatta
   * per il piatto in piatti/[id]/page.tsx. Su un ingrediente esistente apre
   * la conferma: qui l'eliminazione è definitiva (hard delete), non va fatta
   * con un tap solo.
   */
  function tapCestino() {
    if (nuovo) {
      router.push(`/piatti/${id}`);
      return;
    }
    setConfermaEliminazione(true);
  }

  async function confermaElimina() {
    setEliminando(true);
    try {
      await eliminaIngrediente(ingId);
      router.push(`/piatti/${id}`);
    } catch (e) {
      setErrore(
        e instanceof IngredienteInUsoError
          ? e.message
          : 'Non siamo riusciti a eliminare l’ingrediente. Riprova.',
      );
      setEliminando(false);
      setConfermaEliminazione(false);
    }
  }

  if (nonTrovato) {
    return (
      <Cornice dishId={id} cestinoAttivo={false}>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>Ingrediente non trovato.</p>
      </Cornice>
    );
  }

  if (caricamento) return <Cornice dishId={id} />;

  return (
    <Cornice dishId={id} onCestino={tapCestino}>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px' }}>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Dai un nome all'ingrediente"
          className="nome-ingrediente"
          style={{
            display: 'block',
            width: '100%',
            fontFamily: 'inherit',
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.045em',
            lineHeight: 1.05,
            color: 'var(--ink)',
            padding: '0 2px 8px',
            border: 'none',
            borderBottom: '1.5px solid rgba(20,22,58,0.14)',
            background: 'transparent',
            outline: 'none',
          }}
        />
        <style jsx>{`
          .nome-ingrediente::placeholder {
            color: #c4c4ce;
          }
        `}</style>

        <Etichetta margine="22px 4px 10px">AREA DEL SUPERMERCATO</Etichetta>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {AREE.map((a) => {
            const selezionata = area === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setArea(a.id)}
                aria-pressed={selezionata}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  minHeight: 52,
                  padding: '11px 12px',
                  borderRadius: 15,
                  background: selezionata ? rgba(a.colore, 0.22) : '#FFFFFF',
                  border: selezionata ? `1.5px solid ${a.colore}` : '1px solid rgba(20,22,58,0.09)',
                }}
              >
                <span style={{ width: 11, height: 11, borderRadius: 3.5, flex: 'none', background: a.colore }} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    lineHeight: 1.45,
                    color: selezionata ? 'var(--ink)' : 'var(--sec)',
                  }}
                >
                  {a.nome}
                </span>
              </button>
            );
          })}
        </div>

        <Etichetta margine="24px 4px 10px">UNITÀ DI MISURA</Etichetta>
        <Segmento opzioni={OPZIONI_UNITA} valore={unitaBase} onCambia={(u) => setUnitaBase(u as UnitaBase)} />

        <Etichetta margine="24px 4px 10px">FORMATO DELLA CONFEZIONE</Etichetta>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              flex: 1,
              height: 56,
              borderRadius: 16,
              background: '#FFFFFF',
              border: '1px solid rgba(20,22,58,0.12)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
            }}
          >
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={formatoTesto}
              disabled={classeResiduo === 'intero'}
              onChange={(e) => setFormatoTesto(e.target.value)}
              aria-label="Formato della confezione"
              className="formato-input"
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--sec)', width: 34 }}>
            {unitaBase}
          </span>
        </div>
        <style jsx>{`
          .formato-input::-webkit-outer-spin-button,
          .formato-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .formato-input {
            -moz-appearance: textfield;
            appearance: textfield;
          }
        `}</style>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', marginTop: 8 }}>
          Quanto ne vendono in una confezione. Serve a sapere quante confezioni comprare, non quanti grammi.
        </div>

        <Etichetta margine="24px 4px 10px">COME SI CONSUMA</Etichetta>
        <Segmento opzioni={OPZIONI_CLASSE} valore={classeResiduo} onCambia={scegliClasse} />
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', marginTop: 8 }}>
          {SPIEGA_CLASSE[classeResiduo]}
        </div>

        <Etichetta margine="24px 4px 10px">DEPERIBILE</Etichetta>
        <button
          type="button"
          onClick={() => setDeperibile((v) => !v)}
          aria-pressed={deperibile}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '15px 16px',
            borderRadius: 18,
            background: '#FFFFFF',
            border: '1px solid rgba(20,22,58,0.09)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              {deperibile ? 'Sì, va comprato fresco' : 'No, si conserva a lungo'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.1em',
                color: 'var(--sec)',
                marginTop: 5,
              }}
            >
              {deperibile ? 'FINISCE NELLA LISTA TOP-UP' : 'FINISCE NELLA LISTA BASE'}
            </div>
          </div>
          <span
            style={{
              width: 52,
              height: 31,
              borderRadius: 999,
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              padding: 3,
              background: deperibile ? 'var(--ink)' : 'rgba(20,22,58,0.14)',
              justifyContent: deperibile ? 'flex-end' : 'flex-start',
            }}
          >
            <span
              style={{
                width: 25,
                height: 25,
                borderRadius: 999,
                background: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(20,22,58,0.28)',
              }}
            />
          </span>
        </button>

        {errore && <p style={{ margin: '14px 6px 0', color: 'var(--sec)', fontSize: 13 }}>{errore}</p>}
      </div>

      <div style={{ padding: '8px 16px 22px', display: 'flex', gap: 9 }}>
        <Link
          href={`/piatti/${id}`}
          style={{
            flex: 'none',
            width: 104,
            height: 54,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.09em',
            color: 'var(--sec)',
            background: 'rgba(20,22,58,0.05)',
          }}
        >
          ANNULLA
        </Link>
        <button
          type="button"
          onClick={salva}
          disabled={nonValido || salvando}
          style={{
            flex: 1,
            height: 54,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.09em',
            background: nonValido ? 'rgba(20,22,58,0.10)' : 'var(--ink)',
            color: nonValido ? 'var(--ter)' : '#FFFFFF',
            boxShadow: nonValido ? 'none' : '0 3px 10px rgba(20,22,58,0.24)',
          }}
        >
          SALVA INGREDIENTE
        </button>
      </div>

      {confermaEliminazione && (
        <div
          onClick={() => !eliminando && setConfermaEliminazione(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(20,22,58,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '0 24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 320, background: '#FFFFFF', borderRadius: 22, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Eliminare questo ingrediente?
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--sec)' }}>{TESTO_ELIMINA}</div>
            <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setConfermaEliminazione(false)}
                disabled={eliminando}
                style={{
                  flex: 1, height: 48, borderRadius: 14, fontFamily: 'var(--font-mono)', fontSize: 11,
                  fontWeight: 700, letterSpacing: '0.08em', color: 'var(--sec)', background: 'rgba(20,22,58,0.05)',
                }}
              >
                ANNULLA
              </button>
              <button
                type="button"
                onClick={confermaElimina}
                disabled={eliminando}
                style={{
                  flex: 1, height: 48, borderRadius: 14, fontFamily: 'var(--font-mono)', fontSize: 11,
                  fontWeight: 700, letterSpacing: '0.08em', color: '#FFFFFF', background: 'var(--ink)',
                }}
              >
                ELIMINA
              </button>
            </div>
          </div>
        </div>
      )}
    </Cornice>
  );
}

/** Etichetta mono di sezione, ripetuta identica per ogni blocco della scheda. */
function Etichetta({ children, margine }: { children: ReactNode; margine: string }) {
  return (
    <div
      style={{
        margin: margine,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.16em',
        color: 'var(--ink)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Header minimale come in piatti/[id]/page.tsx: freccia indietro, etichetta
 * centrale, icona a destra. Non è Testata (quella porta il marchio e il
 * titolo a 52px delle schermate di casa): l'artboard di questa scheda ha lo
 * stesso header ridotto delle altre pagine di editing, non quello.
 *
 * L'icona a destra è lo stesso cestino di Piatto.dc.html (stesso path SVG) e
 * qui fa sul serio: elimina davvero l'ingrediente (hard delete, non soft
 * come per il piatto — vedi eliminaIngrediente in src/data/repertorio.ts).
 * Un bottone che sembra fare qualcosa senza fare niente è peggio di uno
 * assente, quindi resta disattivato solo quando non c'è ancora niente su cui
 * agire (`onCestino` assente: caricamento in corso) o quando agire non avrebbe
 * senso (`cestinoAttivo={false}`: ingrediente non trovato).
 */
function Cornice({
  children,
  dishId,
  onCestino,
  cestinoAttivo = true,
}: {
  children?: ReactNode;
  dishId: string;
  onCestino?: () => void;
  cestinoAttivo?: boolean;
}) {
  const attivo = cestinoAttivo && !!onCestino;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href={`/piatti/${dishId}`}
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          INGREDIENTE
        </span>
        <button
          type="button"
          onClick={onCestino}
          disabled={!attivo}
          aria-label="Elimina ingrediente"
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 -10px 0 0',
            background: 'transparent',
            opacity: attivo ? 1 : 0.35,
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
            <path
              d="M4.6 6.6h14.8M9.6 6.6V4.4h4.8v2.2M6.6 6.6l.9 12.2a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-12.2"
              stroke="var(--ink)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}
