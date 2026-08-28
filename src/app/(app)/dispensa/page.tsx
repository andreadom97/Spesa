'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AreaId, Ingredient, PantryState } from '@/domain/types';
import { leggiIngredienti } from '@/data/repertorio';
import { leggiDispensa, correggiResiduo, impostaCongelato } from '@/data/dispensa';
import { leggiImpostazioni } from '@/data/impostazioni';
import { coloreArea, nomeArea } from '@/domain/aree';
import { residuoUtilizzabile } from '@/domain/pantry';

interface Riga {
  ingrediente: Ingredient;
  residuo: number;
  ultimoAcquisto: string | null;
  congelato: boolean;
}

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function dataBreve(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`;
}

/**
 * Cosa risulta in casa, e come rimetterlo in pari quando non torna.
 *
 * Il residuo resta derivato dal piano (`residuo precedente + comprato −
 * consumato`): questa schermata non è un inventario da tenere aggiornato a
 * mano, che è la cosa che la spec esclude esplicitamente. È lo specchio del
 * calcolo, più la correzione prevista dalla riga 53 per quando il calcolo si
 * discosta dalla realtà — un uovo rotto, un pasto saltato, qualcun altro che
 * ha usato la pasta.
 *
 * Senza questa schermata uno scostamento non si recuperava più: il residuo
 * si allontanava dal vero in silenzio e continuava a produrre liste che
 * sembravano giuste.
 */
export default function Dispensa() {
  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [ordineAree, setOrdineAree] = useState<AreaId[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [erroreSalvataggio, setErroreSalvataggio] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiIngredienti(), leggiDispensa(), leggiImpostazioni()])
      .then(([ingredienti, dispensa, impostazioni]) => {
        if (!vivo) return;
        const perId = new Map<string, PantryState>(dispensa.map((p) => [p.ingredientId, p]));
        setRighe(
          ingredienti.map((ingrediente) => {
            const stato = perId.get(ingrediente.id);
            return {
              ingrediente,
              residuo: stato?.residuo ?? 0,
              ultimoAcquisto: stato?.ultimoAcquisto ?? null,
              congelato: stato?.congelato ?? false,
            };
          }),
        );
        setOrdineAree(impostazioni.ordineAree);
      })
      .catch((e) => {
        console.error('dispensa: caricamento fallito.', e);
        if (vivo) setErrore('Non riusciamo a caricare la dispensa. Riprova più tardi.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * Salva e, se fallisce, riporta il valore di prima: una correzione persa in
   * silenzio sarebbe peggio del residuo sbagliato che si stava correggendo,
   * perché l'utente crede di aver rimesso le cose a posto.
   */
  async function salva(ingredientId: string, nuovo: number, precedente: number) {
    if (nuovo === precedente) return;
    setErroreSalvataggio(null);
    setRighe((prev) => prev?.map((r) => (r.ingrediente.id === ingredientId ? { ...r, residuo: nuovo } : r)) ?? null);
    try {
      await correggiResiduo(ingredientId, nuovo);
    } catch (e) {
      console.error('dispensa: correzione del residuo fallita.', e);
      setRighe((prev) => prev?.map((r) => (r.ingrediente.id === ingredientId ? { ...r, residuo: precedente } : r)) ?? null);
      setErroreSalvataggio('Non siamo riusciti a salvare la correzione. Riprova.');
    }
  }

  /** Come `salva`: ottimistico, con ritorno al valore di prima se fallisce. */
  async function cambiaCongelato(ingredientId: string, congelato: boolean) {
    setErroreSalvataggio(null);
    setRighe((prev) => prev?.map((r) => (r.ingrediente.id === ingredientId ? { ...r, congelato } : r)) ?? null);
    try {
      await impostaCongelato(ingredientId, congelato);
    } catch (e) {
      console.error('dispensa: cambio congelatore fallito.', e);
      setRighe((prev) => prev?.map((r) => (r.ingrediente.id === ingredientId ? { ...r, congelato: !congelato } : r)) ?? null);
      setErroreSalvataggio('Non siamo riusciti a salvare. Riprova.');
    }
  }

  if (errore) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)', fontSize: 13 }}>{errore}</p>
      </Cornice>
    );
  }

  if (!righe) return <Cornice />;

  if (righe.length === 0) {
    return (
      <Cornice>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
            Ancora niente in dispensa
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--sec)' }}>
            Si riempie da sé: appena chiudi la prima spesa, qui trovi quello che è rimasto.
          </div>
        </div>
      </Cornice>
    );
  }

  const inCasa = righe.filter((r) => r.residuo > 0);
  const finiti = righe.filter((r) => r.residuo <= 0);

  return (
    <Cornice>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 20px' }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '0 6px 16px' }}>
          Questi numeri li calcola l’app da quello che hai comprato e da quello che il piano consuma:
          non c’è niente da tenere aggiornato. Correggili solo quando il conto non torna con la realtà.
        </p>

        {erroreSalvataggio && (
          <p style={{ fontSize: 13, color: 'var(--sec)', margin: '0 6px 12px' }}>{erroreSalvataggio}</p>
        )}

        <Gruppo titolo="IN CASA" righe={inCasa} ordineAree={ordineAree} onSalva={salva} onCongela={cambiaCongelato} />
        <Gruppo titolo="FINITI" righe={finiti} ordineAree={ordineAree} onSalva={salva} onCongela={cambiaCongelato} />
      </div>
    </Cornice>
  );
}

interface PropsGruppo {
  titolo: string;
  righe: Riga[];
  ordineAree: AreaId[];
  onSalva: (ingredientId: string, nuovo: number, precedente: number) => void;
  onCongela: (ingredientId: string, congelato: boolean) => void;
}

function Gruppo({ titolo, righe, ordineAree, onSalva, onCongela }: PropsGruppo) {
  if (righe.length === 0) return null;

  // Stesso ordine dei reparti della lista della spesa: cercare qui costa
  // quanto cercare lì.
  const ordinate = [...righe].sort((a, b) => {
    const da = ordineAree.indexOf(a.ingrediente.area);
    const db = ordineAree.indexOf(b.ingrediente.area);
    if (da !== db) return da - db;
    return a.ingrediente.nome.localeCompare(b.ingrediente.nome, 'it');
  });

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', margin: '0 4px 9px' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.16em', color: 'var(--ink)',
          }}
        >
          {titolo}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--ter)' }}>
          {ordinate.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {ordinate.map((r) => (
          // La key include il residuo: quando cambia sotto — salvataggio
          // riuscito, o rollback di uno fallito — la riga si rimonta e il
          // campo riparte dal valore vero. Il residuo cambia solo dopo il
          // blur, quindi non interrompe mai chi sta scrivendo.
          <RigaDispensa
            key={`${r.ingrediente.id}:${r.residuo}:${r.congelato}`}
            riga={r}
            onSalva={onSalva}
            onCongela={onCongela}
          />
        ))}
      </div>
    </div>
  );
}

function RigaDispensa({
  riga,
  onSalva,
  onCongela,
}: {
  riga: Riga;
  onSalva: PropsGruppo['onSalva'];
  onCongela: PropsGruppo['onCongela'];
}) {
  const [testo, setTesto] = useState(String(riga.residuo));

  // Quello che il calcolo della lista userà davvero. Mostrarlo qui è
  // necessario: senza, si legge "200 g" di pollo e non si capisce perché la
  // lista lo chiede lo stesso — la schermata direbbe una cosa e l'app ne
  // farebbe un'altra.
  const utilizzabile = residuoUtilizzabile({
    residuo: riga.residuo,
    deperibile: riga.ingrediente.deperibile,
    area: riga.ingrediente.area,
    ultimoAcquisto: riga.ultimoAcquisto,
    congelato: riga.congelato,
    oggi: new Date().toISOString().slice(0, 10),
  });
  const decaduto = riga.residuo > 0 && utilizzabile === 0;

  function conferma() {
    const n = Number(testo);
    if (testo.trim() === '' || Number.isNaN(n) || n < 0) {
      setTesto(String(riga.residuo));
      return;
    }
    onSalva(riga.ingrediente.id, n, riga.residuo);
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 62,
        padding: '11px 14px', borderRadius: 16,
        background: 'var(--superficie)', border: '1px solid var(--bordo)',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 3, flex: 'none', background: coloreArea(riga.ingrediente.area) }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {riga.ingrediente.nome}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.09em', color: 'var(--ter)', marginTop: 4 }}>
          {nomeArea(riga.ingrediente.area)}
          {riga.ultimoAcquisto ? ` · PRESO IL ${dataBreve(riga.ultimoAcquisto).toUpperCase()}` : ' · MAI COMPRATO'}
          {riga.congelato ? ' · IN CONGELATORE' : ''}
        </div>
        {decaduto && (
          <div style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--sec)', marginTop: 5 }}>
            Troppo tempo per essere ancora buono: la lista lo richiede.
            {!riga.congelato && ' Se l’hai congelato, dillo qui accanto.'}
          </div>
        )}
      </div>

      {/* Solo sui deperibili: su pasta e scatolame il congelatore non vuol
          dire niente, e un controllo che non fa nulla è peggio che assente. */}
      {riga.ingrediente.deperibile && (
        <button
          type="button"
          onClick={() => onCongela(riga.ingrediente.id, !riga.congelato)}
          aria-pressed={riga.congelato}
          aria-label={`${riga.ingrediente.nome}: ${riga.congelato ? 'togli dal congelatore' : 'metti in congelatore'}`}
          style={{
            width: 44, height: 44, flex: 'none', borderRadius: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: riga.congelato ? 'rgba(156,199,242,0.30)' : 'transparent',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2v20M12 6.5 8.5 4M12 6.5 15.5 4M12 17.5 8.5 20M12 17.5l3.5 2.5M3.3 7l17.4 10M6.8 8.2 5.9 4.1M6.8 8.2 3 9.3M17.2 15.8l.9 4.1M17.2 15.8 21 14.7M20.7 7 3.3 17M17.2 8.2l.9-4.1M17.2 8.2 21 9.3M6.8 15.8l-.9 4.1M6.8 15.8 3 14.7"
              stroke={riga.congelato ? '#4A90D9' : 'var(--ter)'}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {/* onBlur e non onChange: qui si riscrive un numero che l'app ha
          calcolato, e salvare a ogni tasto premuto significherebbe scrivere
          anche i valori intermedi di chi sta ancora digitando. */}
      <label
        style={{
          display: 'flex', alignItems: 'center', gap: 5, flex: 'none',
          minHeight: 44, cursor: 'text',
        }}
      >
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onBlur={conferma}
          aria-label={`Residuo di ${riga.ingrediente.nome}`}
          className="residuo-input"
          style={{
            width: 62, height: 38, borderRadius: 11, textAlign: 'right',
            border: '1px solid rgba(20,22,58,0.12)', background: '#FFFFFF',
            padding: '0 8px', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink)',
          }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sec)', width: 18 }}>
          {riga.ingrediente.unitaBase}
        </span>
      </label>
      <style jsx>{`
        .residuo-input::-webkit-outer-spin-button,
        .residuo-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .residuo-input {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
    </div>
  );
}

/** Stesso header delle altre sottopagine di /impostazioni. */
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/impostazioni"
          aria-label="Torna alle impostazioni"
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          DISPENSA
        </span>
        <div style={{ width: 44, height: 44 }} />
      </div>
      {children}
    </div>
  );
}
