'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AreaId, Ingredient, LottoPronto, PantryState } from '@/domain/types';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { leggiDispensa, correggiResiduo, impostaCongelato } from '@/data/dispensa';
import { leggiImpostazioni } from '@/data/impostazioni';
import { leggiPronti, correggiLotto, impostaCongelatoLotto, eliminaLotto } from '@/data/pronti';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiRisparmioTotale } from '@/data/risparmio';
import type { VoceEvitata } from '@/domain/list-builder';
import { riassumiEvitato, formattaQuantita, formattaEuro } from '@/domain/risparmio';
import { coloreArea, nomeArea } from '@/domain/aree';
import { residuoUtilizzabile } from '@/domain/pantry';
import { porzioniUtilizzabili } from '@/domain/pronti';
import { NotaDispensa } from '@/components/NotaDispensa';

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
 * Il totale del non ricomprato sulle settimane chiuse è un di più: se la
 * lettura fallisce la dispensa resta usabile e la riga non compare.
 */
async function leggiRisparmioSenzaBloccare(): Promise<VoceEvitata[]> {
  try {
    return await leggiRisparmioTotale();
  } catch (e) {
    console.error('dispensa: lettura del non ricomprato fallita.', e);
    return [];
  }
}

/**
 * "Da quando usi Spesa: 9 confezioni non ricomprate · 4,1 kg · circa 32 €"
 * (spec §5). Null con zero confezioni: la Dispensa non fa rumore. Quantità ed
 * euro compaiono solo se c'è qualcosa da dire.
 */
function rigaTotaleNonRicomprato(voci: VoceEvitata[]): string | null {
  const r = riassumiEvitato(voci);
  if (r.confezioni === 0) return null;
  const segmenti = [r.confezioni === 1 ? '1 confezione non ricomprata' : `${r.confezioni} confezioni non ricomprate`];
  const quantita = formattaQuantita(r.quantita);
  if (quantita) segmenti.push(quantita);
  if (r.euro !== null) segmenti.push(formattaEuro(r.euro));
  return `Da quando usi Spesa: ${segmenti.join(' · ')}`;
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
  const [lotti, setLotti] = useState<LottoPronto[]>([]);
  const [nomiPiatti, setNomiPiatti] = useState<Map<string, string>>(new Map());
  const [impegniPerPiatto, setImpegniPerPiatto] = useState<Map<string, number>>(new Map());
  const [totaleNonRicomprato, setTotaleNonRicomprato] = useState<string | null>(null);
  // La nota AI e' un ripiego per quando il calcolo non torna, non la prima
  // cosa da vedere: parte compressa in una card, si monta solo al tap.
  const [notaAperta, setNotaAperta] = useState(false);

  /**
   * Il corpo del caricamento, richiamabile: la nota alla dispensa (sotto)
   * cambia residui e flag congelato scrivendo direttamente sul server, e
   * dopo un'applicazione questa schermata deve rileggerli — non le basta
   * aggiornare lo stato locale come fanno `salva`/`cambiaCongelato`, perché
   * non sa quali proposte la nota ha applicato.
   */
  function carica(vivo: () => boolean) {
    Promise.all([
      leggiIngredienti(),
      leggiDispensa(),
      leggiImpostazioni(),
      leggiPronti(),
      leggiRepertorio(),
      leggiSettimanaCorrente(),
      leggiRisparmioSenzaBloccare(),
    ])
      .then(([ingredienti, dispensa, impostazioni, pronti, repertorio, settimana, risparmio]) => {
        if (!vivo()) return;
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
        setLotti(pronti);
        setNomiPiatti(new Map(repertorio.map((d) => [d.id, d.nome])));
        setTotaleNonRicomprato(rigaTotaleNonRicomprato(risparmio));

        // Quante porzioni di quel piatto sono già promesse a uno slot
        // futuro: un lotto "disponibile" che in realtà è già impegnato per
        // dopodomani non è la stessa cosa di uno libero.
        const oggi = new Date().toISOString().slice(0, 10);
        const impegni = new Map<string, number>();
        for (const slot of settimana?.slots ?? []) {
          if (!slot.daPronti || slot.dishId === null || slot.data < oggi) continue;
          impegni.set(slot.dishId, (impegni.get(slot.dishId) ?? 0) + 1);
        }
        setImpegniPerPiatto(impegni);
      })
      .catch((e) => {
        console.error('dispensa: caricamento fallito.', e);
        if (vivo()) setErrore('Non riusciamo a caricare la dispensa. Riprova più tardi.');
      });
  }

  useEffect(() => {
    let vivo = true;
    carica(() => vivo);
    return () => {
      vivo = false;
    };
  }, []);

  /** Richiamata dopo che la nota alla dispensa ha applicato le sue proposte: qui il componente è già montato, quindi nessun cleanup da rispettare. */
  function ricarica() {
    carica(() => true);
  }

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

  /** Come `salva`, sul lotto: ottimistico, con ritorno al valore di prima se fallisce. */
  async function correggiLottoOttimistico(id: string, nuovo: number) {
    const precedenti = lotti;
    setErroreSalvataggio(null);
    setLotti((prev) => prev.map((l) => (l.id === id ? { ...l, porzioni: nuovo } : l)));
    try {
      await correggiLotto(id, nuovo);
    } catch (e) {
      console.error('dispensa: correzione del lotto fallita.', e);
      setLotti(precedenti);
      setErroreSalvataggio('Non siamo riusciti a salvare la correzione. Riprova.');
    }
  }

  /** Come `cambiaCongelato`, sul lotto. */
  async function congelaLottoOttimistico(id: string, congelato: boolean) {
    const precedenti = lotti;
    setErroreSalvataggio(null);
    setLotti((prev) => prev.map((l) => (l.id === id ? { ...l, congelato } : l)));
    try {
      await impostaCongelatoLotto(id, congelato);
    } catch (e) {
      console.error('dispensa: cambio congelatore del lotto fallito.', e);
      setLotti(precedenti);
      setErroreSalvataggio('Non siamo riusciti a salvare. Riprova.');
    }
  }

  /** Come le altre due, ma senza ripristino parziale: il lotto sparisce e torna se l'eliminazione fallisce. */
  async function eliminaLottoOttimistico(id: string) {
    const precedenti = lotti;
    setErroreSalvataggio(null);
    setLotti((prev) => prev.filter((l) => l.id !== id));
    try {
      await eliminaLotto(id);
    } catch (e) {
      console.error('dispensa: eliminazione del lotto fallita.', e);
      setLotti(precedenti);
      setErroreSalvataggio('Non siamo riusciti a salvare. Riprova.');
    }
  }

  const contestoNota =
    righe?.map((r) => ({
      id: r.ingrediente.id,
      nome: r.ingrediente.nome,
      unitaBase: r.ingrediente.unitaBase,
      formatoConfezione: r.ingrediente.formatoConfezione,
      residuo: r.residuo,
      congelato: r.congelato,
    })) ?? [];

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

  const oggi = new Date().toISOString().slice(0, 10);
  const inCasa = righe.filter((r) => r.residuo > 0);
  // "Finito" e "mai avuto" non sono la stessa cosa: il primo e' un
  // ingrediente che usi e che si e' esaurito — informazione utile, sono
  // pochi — il secondo e' catalogo, e dopo il seed sono decine. Tenerli
  // insieme seppelliva i primi sotto i secondi.
  const finiti = righe.filter((r) => r.residuo <= 0 && r.ultimoAcquisto !== null);
  const maiComprati = righe.filter((r) => r.residuo <= 0 && r.ultimoAcquisto === null);

  return (
    <Cornice>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 20px' }}>
        {/* Il residuo derivato, sommato sulle settimane chiuse: una riga e
            basta, e solo quando c'è qualcosa da dire. */}
        {totaleNonRicomprato && (
          <p style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '0 4px 14px' }}>{totaleNonRicomprato}</p>
        )}

        {erroreSalvataggio && (
          <p style={{ fontSize: 13, color: 'var(--sec)', margin: '0 6px 12px' }}>{erroreSalvataggio}</p>
        )}

        <Gruppo
          titolo="IN CASA"
          righe={inCasa}
          ordineAree={ordineAree}
          onSalva={salva}
          onCongela={cambiaCongelato}
          sottotitolo="Calcolato da spesa e piano: correggi solo se non torna con la realtà."
        />
        <Gruppo titolo="FINITI" righe={finiti} ordineAree={ordineAree} onSalva={salva} onCongela={cambiaCongelato} />

        <SezionePronti
          lotti={lotti.filter((l) => porzioniUtilizzabili(l, oggi) > 0)}
          nomiPiatti={nomiPiatti}
          impegniPerPiatto={impegniPerPiatto}
          onCorreggi={correggiLottoOttimistico}
          onCongela={congelaLottoOttimistico}
          onElimina={eliminaLottoOttimistico}
        />

        {/* Chiuso di partenza: e' l'intero catalogo di quello che non hai mai
            preso, serve solo quando cerchi qualcosa di preciso per dire che
            ce l'hai gia' in casa. Aperto sarebbe la parte piu' lunga della
            schermata e la meno utile. */}
        <Gruppo
          titolo="MAI COMPRATI"
          righe={maiComprati}
          ordineAree={ordineAree}
          onSalva={salva}
          onCongela={cambiaCongelato}
          chiusoDaSubito
        />

        {/* La correzione via AI e' un ripiego per quando il calcolo non
            torna, non la prima cosa da vedere: in cima distraeva da quello
            che la schermata serve davvero a mostrare. Resta una card
            compressa finche' non serve, e monta NotaDispensa solo al tap. */}
        {notaAperta ? (
          <div className="anim-foglio" style={{ position: 'relative' }}>
            {/* Chiusura discreta senza toccare la firma di NotaDispensa: un
                bottone sovrapposto, stesso disegno della X di rimozione
                ingrediente (TesseraIngrediente), stessa area di tap 44px. */}
            <button
              type="button"
              onClick={() => setNotaAperta(false)}
              aria-label="Chiudi correzione con una nota"
              style={{
                position: 'absolute', top: 0, right: 0, width: 44, height: 44, zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M5 5l14 14M19 5 5 19" stroke="#C4C4CE" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <NotaDispensa contesto={contestoNota} onDatiCambiati={ricarica} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNotaAperta(true)}
            style={{
              width: '100%', padding: '15px 16px', borderRadius: 18, background: '#FFFFFF',
              border: '1px solid rgba(20,22,58,0.07)', textAlign: 'left',
              fontSize: 14.5, fontWeight: 600, color: 'var(--ink)',
            }}
          >
            Il conto non torna? Correggi con una nota
          </button>
        )}
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
  /** Parte richiuso, con il solo titolo cliccabile. */
  chiusoDaSubito?: boolean;
  /** Riga di spiegazione sotto l'intestazione — solo IN CASA la usa. */
  sottotitolo?: string;
}

function Gruppo({ titolo, righe, ordineAree, onSalva, onCongela, chiusoDaSubito = false, sottotitolo }: PropsGruppo) {
  const [aperto, setAperto] = useState(!chiusoDaSubito);
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
      <button
        type="button"
        onClick={chiusoDaSubito ? () => setAperto((v) => !v) : undefined}
        aria-expanded={chiusoDaSubito ? aperto : undefined}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
          margin: '0 0 9px', padding: '0 4px',
          minHeight: chiusoDaSubito ? 44 : undefined,
          cursor: chiusoDaSubito ? 'pointer' : 'default',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.16em', color: 'var(--ink)',
          }}
        >
          {titolo}
        </span>
        {chiusoDaSubito && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: aperto ? 'rotate(90deg)' : undefined }}>
            <path d="M9 5l7 7-7 7" stroke="var(--ter)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--ter)' }}>
          {ordinate.length}
        </span>
      </button>

      {sottotitolo && (
        <p style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '0 4px 12px' }}>{sottotitolo}</p>
      )}

      <div style={{ display: aperto ? 'flex' : 'none', flexDirection: 'column', gap: 7 }}>
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

interface PropsSezionePronti {
  lotti: LottoPronto[];
  nomiPiatti: Map<string, string>;
  impegniPerPiatto: Map<string, number>;
  onCorreggi: (id: string, nuovo: number) => void;
  onCongela: (id: string, congelato: boolean) => void;
  onElimina: (id: string) => void;
}

/**
 * I lotti del meal prepping: porzioni già cucinate, in frigo o freezer, in
 * attesa di uno slot che le usi. Assente finché non esiste nessun lotto
 * utilizzabile — un titolo di sezione sempre vuoto sarebbe solo rumore prima
 * ancora che il meal prepping venga usato.
 */
function SezionePronti({ lotti, nomiPiatti, impegniPerPiatto, onCorreggi, onCongela, onElimina }: PropsSezionePronti) {
  if (lotti.length === 0) return null;

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 9px', padding: '0 4px' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.16em', color: 'var(--ink)',
          }}
        >
          PRONTI
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--ter)' }}>
          {lotti.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {(() => {
          // La spec parla di una tessera per piatto; qui il layout resta per
          // lotto (semplificazione accettata). Con più lotti dello stesso
          // piatto mostrare "N impegnate" su ognuno raddoppierebbe il numero
          // letto dall'utente: la riga compare solo sulla prima tessera di
          // quel dishId nell'ordine di rendering.
          const dishGiaMostrati = new Set<string>();
          return lotti.map((lotto) => {
            const primaVolta = !dishGiaMostrati.has(lotto.dishId);
            dishGiaMostrati.add(lotto.dishId);
            return (
              <TesseraPronto
                key={`${lotto.id}:${lotto.porzioni}:${lotto.congelato}`}
                lotto={lotto}
                nome={nomiPiatti.get(lotto.dishId) ?? 'Piatto eliminato'}
                impegnate={primaVolta ? impegniPerPiatto.get(lotto.dishId) ?? 0 : 0}
                onCorreggi={onCorreggi}
                onCongela={onCongela}
                onElimina={onElimina}
              />
            );
          });
        })()}
      </div>
    </div>
  );
}

function TesseraPronto({
  lotto,
  nome,
  impegnate,
  onCorreggi,
  onCongela,
  onElimina,
}: {
  lotto: LottoPronto;
  nome: string;
  impegnate: number;
  onCorreggi: PropsSezionePronti['onCorreggi'];
  onCongela: PropsSezionePronti['onCongela'];
  onElimina: PropsSezionePronti['onElimina'];
}) {
  const [testo, setTesto] = useState(String(lotto.porzioni));

  function conferma() {
    const n = Number(testo);
    if (testo.trim() === '' || Number.isNaN(n) || n < 0) {
      setTesto(String(lotto.porzioni));
      return;
    }
    onCorreggi(lotto.id, n);
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 62,
        padding: '11px 14px', borderRadius: 16,
        background: 'var(--superficie)', border: '1px solid var(--bordo)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {nome}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.09em', color: 'var(--ter)', marginTop: 4 }}>
          PREPARATO IL {dataBreve(lotto.preparataIl).toUpperCase()}
          {lotto.congelato ? ' · IN CONGELATORE' : ''}
        </div>
        {impegnate > 0 && (
          <div style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--sec)', marginTop: 5 }}>
            {impegnate === 1 ? '1 impegnata' : `${impegnate} impegnate`}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onCongela(lotto.id, !lotto.congelato)}
        aria-pressed={lotto.congelato}
        aria-label={`${nome}: ${lotto.congelato ? 'togli dal congelatore' : 'metti in congelatore'}`}
        style={{
          width: 44, height: 44, flex: 'none', borderRadius: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: lotto.congelato ? 'rgba(156,199,242,0.30)' : 'transparent',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2v20M12 6.5 8.5 4M12 6.5 15.5 4M12 17.5 8.5 20M12 17.5l3.5 2.5M3.3 7l17.4 10M6.8 8.2 5.9 4.1M6.8 8.2 3 9.3M17.2 15.8l.9 4.1M17.2 15.8 21 14.7M20.7 7 3.3 17M17.2 8.2l.9-4.1M17.2 8.2 21 9.3M6.8 15.8l-.9 4.1M6.8 15.8 3 14.7"
            stroke={lotto.congelato ? '#4A90D9' : 'var(--ter)'}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

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
          aria-label={`Porzioni di ${nome}`}
          className="residuo-input"
          style={{
            width: 46, height: 38, borderRadius: 11, textAlign: 'right',
            border: '1px solid rgba(20,22,58,0.12)', background: '#FFFFFF',
            padding: '0 8px', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--ink)',
          }}
        />
      </label>

      <button
        type="button"
        onClick={() => onElimina(lotto.id)}
        aria-label={`Elimina il lotto di ${nome}`}
        style={{
          width: 44, height: 44, flex: 'none', borderRadius: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
            stroke="var(--ter)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
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
