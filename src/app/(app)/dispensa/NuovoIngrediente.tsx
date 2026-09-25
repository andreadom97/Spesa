'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AreaId, Ingredient, UnitaBase } from '@/domain/types';
import { AREE } from '@/domain/aree';
import { predefinitiIngrediente } from '@/domain/ingredienti-base';
import { nomeGiaUsato, predefinitiNuovo } from '@/domain/ricerca-dispensa';
import { esitoNuovoDaCatalogo, esitoNuovoLocale } from '@/domain/scansione-dispensa';
import { TestataFoglio } from '@/components/FoglioDalBasso';
import { IconaScansione } from './icone';
import { Etichetta, MessaggioErrore, STILE_PILLOLA, TastoPrimario, TastoSecondario } from './controlli';
import { LettoreCodice, cercaProdotto } from './LettoreCodice';

export interface DatiNuovoIngrediente {
  ingrediente: Omit<Ingredient, 'id' | 'prezzoConfezione'>;
  quantita: number;
}

interface Props {
  nomeIniziale: string;
  ingredienti: Ingredient[];
  onCrea: (d: DatiNuovoIngrediente) => Promise<void>;
  onApri: (altro: Ingredient) => void;
  onChiudi: () => void;
}

const UNITA: UnitaBase[] = ['g', 'pz', 'ml'];

function pillola(attiva: boolean) {
  return {
    ...STILE_PILLOLA,
    background: attiva ? 'var(--ink)' : 'var(--superficie)',
    color: attiva ? 'var(--superficie)' : 'var(--sec)',
    border: attiva ? '1px solid var(--ink)' : '1px solid rgba(20,22,58,0.09)',
  };
}

/**
 * Il foglio Nuovo ingrediente (spec §C, §F.3, v2 04): il nome dalla ricerca,
 * reparto, quanto ne hai, lo scanner, deperibile, e `CREA L'INGREDIENTE`.
 */
export function NuovoIngrediente({ nomeIniziale, ingredienti, onCrea, onApri, onChiudi }: Props) {
  const router = useRouter();
  const iniziali = predefinitiNuovo(nomeIniziale);
  const [nome, setNome] = useState(nomeIniziale.trim());
  const [area, setArea] = useState<AreaId | null>(iniziali.area);
  const [unita, setUnita] = useState<UnitaBase>(iniziali.unitaBase);
  const [deperibile, setDeperibile] = useState<boolean | null>(iniziali.deperibile);
  const [deperibileToccato, setDeperibileToccato] = useState(iniziali.deperibile !== null);
  const [quantita, setQuantita] = useState('');
  const [formatoLetto, setFormatoLetto] = useState<number | null>(null);
  const [unitaLetta, setUnitaLetta] = useState<UnitaBase | null>(null);
  const [ean, setEan] = useState<string | null>(null);
  const [messaggioScan, setMessaggioScan] = useState<string | null>(null);
  const [altro, setAltro] = useState<Ingredient | null>(null);
  const [vista, setVista] = useState<'modulo' | 'scansione'>('modulo');
  const [erroreNome, setErroreNome] = useState(false);
  const [erroreScrittura, setErroreScrittura] = useState(false);
  const [volo, setVolo] = useState(false);

  function scegliArea(a: AreaId) {
    setArea(a);
    if (!deperibileToccato) setDeperibile(predefinitiIngrediente(a, unita).deperibile);
  }

  async function letto(codice: string) {
    const locale = esitoNuovoLocale(codice, ingredienti);
    if (locale && locale.tipo === 'altroIngrediente') {
      setAltro(locale.ingrediente);
      return;
    }
    const risposta = await cercaProdotto(codice);
    if (risposta === 'sessione') {
      router.replace('/entra');
      return;
    }
    const esito = esitoNuovoDaCatalogo(codice, risposta);
    if (esito.tipo !== 'letto') return;
    setEan(esito.ean);
    setMessaggioScan(esito.messaggio);
    // Una lettura senza quantità azzera il formato di una lettura precedente:
    // era di un altro prodotto.
    setFormatoLetto(esito.quantita?.valore ?? null);
    setUnitaLetta(esito.quantita?.unita ?? null);
    if (esito.quantita) {
      setQuantita(String(esito.quantita.valore));
      setUnita(esito.quantita.unita);
    }
    setVista('modulo');
  }

  const t = quantita.trim().replace(',', '.');
  const q = t === '' ? 0 : Number(t);
  const quantitaValida = Number.isFinite(q) && q >= 0;
  const pronto = nome.trim() !== '' && area !== null && deperibile !== null && quantitaValida;

  async function crea() {
    if (!pronto || volo || area === null || deperibile === null) return;
    if (nomeGiaUsato(nome, ingredienti)) {
      setErroreNome(true);
      return;
    }
    setErroreNome(false);
    setErroreScrittura(false);
    setVolo(true);
    const base = predefinitiIngrediente(area, unita);
    try {
      await onCrea({
        ingrediente: {
          nome: nome.trim(), unitaBase: unita, area, deperibile,
          classeResiduo: base.classeResiduo,
          // Gli interi hanno formato 1 (list-builder). Il formato letto vale solo se
          // l'unità scelta è ancora quella con cui è stato letto: se dopo la scansione
          // si cambia unità (g letto, poi si sceglie ml), il numero letto non significa
          // più niente in quell'unità — meglio il default del reparto che un dato
          // silenziosamente sbagliato. Il codice `ean` resta comunque legato: è
          // un'informazione sul prodotto, non sul formato.
          formatoConfezione: unita === 'pz' ? 1 : unita === unitaLetta && formatoLetto !== null ? formatoLetto : base.formatoConfezione,
          ean,
        },
        quantita: q,
      });
    } catch {
      setErroreScrittura(true);
      setVolo(false);
    }
  }

  if (vista === 'scansione') {
    return (
      <>
        <TestataFoglio onChiudi={onChiudi} etichettaChiudi="Chiudi senza creare" indietro={{ etichetta: 'Torna al nuovo ingrediente', onClick: () => { setAltro(null); setVista('modulo'); } }} />
        <div className="sc corpo-foglio" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {altro ? (
            <>
              <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{`Questo codice è di ${altro.nome}.`}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <TastoSecondario onClick={() => setAltro(null)} style={{ flex: 1 }}>NON È QUESTA</TastoSecondario>
                <TastoPrimario onClick={() => onApri(altro)} style={{ flex: 1 }}>{`APRI ${altro.nome.toUpperCase()}`}</TastoPrimario>
              </div>
            </>
          ) : (
            <LettoreCodice onCodice={(c) => void letto(c)} />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <TestataFoglio onChiudi={onChiudi} etichettaChiudi="Chiudi senza creare">
        <Etichetta>Nuovo ingrediente</Etichetta>
      </TestataFoglio>
      <div className="sc corpo-foglio" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            type="text"
            aria-label="Nome"
            value={nome}
            onChange={(e) => { setNome(e.target.value); setErroreNome(false); }}
            style={{ border: 'none', background: 'none', padding: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', color: 'var(--ink)', width: '100%' }}
          />
          {erroreNome && <MessaggioErrore>{"C'è già un ingrediente che si chiama così."}</MessaggioErrore>}
        </div>

        <div role="group" aria-label="Reparto" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>Reparto</Etichetta>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {AREE.map((a) => (
              <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => scegliArea(a.id)} style={pillola(area === a.id)}>
                {a.nome}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label="Quanto ne hai" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>Quanto ne hai</Etichetta>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              inputMode="decimal"
              aria-label={`Residuo di ${nome.trim() || nomeIniziale.trim()}`}
              value={quantita}
              onChange={(e) => setQuantita(e.target.value)}
              style={{
                width: 96, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
                border: '1px solid var(--bordo)', background: 'var(--superficie)',
                fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--ink)',
              }}
            />
            {UNITA.map((u) => (
              <button key={u} type="button" aria-pressed={unita === u} onClick={() => setUnita(u)} style={{ ...pillola(unita === u), minWidth: 52 }}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <TastoSecondario onClick={() => setVista('scansione')}>
          <IconaScansione />
          SCANSIONA LA CONFEZIONE
        </TastoSecondario>
        {messaggioScan && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--testo-2)' }}>{messaggioScan}</p>}

        <div role="group" aria-label="Deperibile" style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 52 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>Deperibile</span>
          <button type="button" aria-pressed={deperibile === true} onClick={() => { setDeperibile(true); setDeperibileToccato(true); }} style={pillola(deperibile === true)}>SÌ</button>
          <button type="button" aria-pressed={deperibile === false} onClick={() => { setDeperibile(false); setDeperibileToccato(true); }} style={pillola(deperibile === false)}>NO</button>
        </div>

        {erroreScrittura && <MessaggioErrore>Non siamo riusciti a salvare. Riprova.</MessaggioErrore>}
        <TastoPrimario onClick={() => void crea()} disabled={!pronto || volo}>{"CREA L'INGREDIENTE"}</TastoPrimario>
      </div>
    </>
  );
}
