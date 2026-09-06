'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AreaId, Ingredient, MealSlotDef, UnitaBase } from '@/domain/types';
import { leggiIngredienti, leggiRepertorio, salvaIngrediente, salvaPiatto } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { coloreArea, nomeArea } from '@/domain/aree';
import { predefinitiIngrediente } from '@/domain/ingredienti-base';
import { Segmento } from '@/components/Segmento';

/**
 * Quattro pasti di default per due piatti ciascuno: sotto questa soglia il
 * planner, che ruota per pasto, ripete lo stesso piatto ogni giorno. È il
 * numero della spec (2026-09-06, §2.2), non un consiglio su quanto mangiare.
 */
const PIATTI_PER_GIRARE = 8;

/** Quanti risultati mostrare sotto la ricerca: oltre, si scrive una lettera in più. */
const MAX_RISULTATI = 8;

/**
 * Confronto tollerante agli accenti, copiato da src/app/(app)/piatti/page.tsx:
 * chi cerca "caffe" deve trovare "Caffè", sulla tastiera del telefono
 * l'accento costa un tocco che nessuno spende per cercare.
 */
function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Quanti piatti per pasto perché la rotazione abbia qualcosa da alternare:
 * con uno solo il planner ripete lo stesso piatto ogni giorno di quel pasto.
 */
const PIATTI_PER_PASTO = 2;

/**
 * La riga sotto la testata, a tre livelli: `n` piatti nel repertorio (letti
 * all'apertura più quelli salvati in questa sessione). Sotto la soglia dice
 * quanti ne mancano a far girare la settimana; sopra, che si può smettere —
 * ma solo se OGNI pasto ha almeno `PIATTI_PER_PASTO` piatti: il planner
 * ruota per pasto, otto cene non fanno girare la colazione. Con la soglia
 * raggiunta ma un pasto scoperto, dice quale (quello con meno piatti; a
 * parità il primo nell'ordine dei pasti).
 */
function testoContatore(n: number, perPasto: Map<string, number>, slotDefs: MealSlotDef[]): string {
  if (n >= PIATTI_PER_GIRARE) {
    let scoperto: MealSlotDef | null = null;
    for (const def of slotDefs) {
      const conta = perPasto.get(def.id) ?? 0;
      if (conta >= PIATTI_PER_PASTO) continue;
      if (scoperto === null || conta < (perPasto.get(scoperto.id) ?? 0)) scoperto = def;
    }
    if (scoperto === null) return `Ne hai ${n}: la settimana può girare. Aggiungine quanti vuoi.`;
    return `${n} piatti salvati · manca ancora qualcosa per ${scoperto.nome}`;
  }
  const coda = `ne bastano ${PIATTI_PER_GIRARE} per far girare la settimana`;
  if (n === 0) return `Nessun piatto ancora · ${coda}`;
  if (n === 1) return `1 piatto salvato · ${coda}`;
  return `${n} piatti salvati · ${coda}`;
}

/** Oltre questo valore una quantità o un formato è un errore di battitura, non una ricetta. */
const QUANTITA_MASSIMA = 100000;

/** Nome del piatto, ricerca, nome dell'ingrediente: nessuno ha bisogno di più. */
const LUNGHEZZA_MASSIMA = 80;

/** Una riga del piatto in costruzione: la quantità resta testo finché non si salva ("80," mentre si digita). */
interface Riga {
  ingredientId: string;
  quantita: string;
  unita: UnitaBase;
}

/**
 * Virgola o punto: il tastierino decimale di iOS in italiano offre la
 * virgola, e `Number('80,5')` sarebbe NaN. Vuoto → NaN, così cade nello
 * stesso ramo "manca la quantità" di un testo non numerico.
 */
function quantitaNumerica(testo: string): number {
  const pulito = testo.trim();
  if (!pulito) return NaN;
  return Number(pulito.replace(',', '.'));
}

/**
 * La ragione per cui non si può salvare, una sola, la prima. `null` se il
 * piatto è valido. È la regola della spec (§2.2): nome, almeno una riga, ogni
 * quantità > 0 — nell'ordine in cui l'utente compila il modulo, così la
 * ragione mostrata è sempre la prossima cosa da fare.
 */
function ragioneNonValido(nome: string, righe: Riga[], nomiPerId: Map<string, string>): string | null {
  if (!nome.trim()) return 'Manca il nome';
  if (righe.length === 0) return 'Aggiungi almeno un ingrediente';
  for (const r of righe) {
    const q = quantitaNumerica(r.quantita);
    if (!Number.isFinite(q) || q <= 0) return `Manca la quantità di ${nomiPerId.get(r.ingredientId) ?? ''}`;
    if (q > QUANTITA_MASSIMA) return `Quantità troppo alta per ${nomiPerId.get(r.ingredientId) ?? ''}`;
  }
  return null;
}

interface Dati {
  slotDefs: MealSlotDef[];
  ordineAree: AreaId[];
  /** Piatti già nel repertorio all'apertura: la base del contatore. */
  salvatiPrima: number;
  /** Gli stessi, per pasto: il contatore guarda che nessun pasto resti scoperto. */
  perPastoPrima: Map<string, number>;
}

/** Quanti piatti per `slotDefId`, a partire dai piatti del repertorio. */
function contaPerPasto(piatti: { slotDefId: string }[]): Map<string, number> {
  const conta = new Map<string, number>();
  for (const p of piatti) conta.set(p.slotDefId, (conta.get(p.slotDefId) ?? 0) + 1);
  return conta;
}

/**
 * Inserimento veloce (spec 2026-09-06, §2.2 e §2.3): una schermata, un piatto
 * alla volta, che resta aperta finché non si dice basta. Conosce solo nome,
 * pasto e righe ingrediente con quantità in unità base: componenti, giorno
 * fisso, giro, procedimento e conversioni restano all'editor completo
 * (limite dichiarato, §5).
 */
export default function PiattiVeloce() {
  const [dati, setDati] = useState<Dati | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  // Elenco locale: cresce con le mini-creazioni senza rileggere dal server.
  const [ingredienti, setIngredienti] = useState<Ingredient[]>([]);
  // I piatti salvati in questa sessione, per pasto: il totale è la somma.
  const [salvatiOra, setSalvatiOra] = useState<Map<string, number>>(new Map());

  const [nome, setNome] = useState('');
  const [slotDefId, setSlotDefId] = useState('');
  const [ricerca, setRicerca] = useState('');
  const [righe, setRighe] = useState<Riga[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);
  // Il nome dell'ultimo piatto salvato: la riga "Salvato: …" resta finché non
  // si ricomincia a scrivere, così chi salva tre cene di fila vede la conferma
  // senza un toast che sparisce da solo.
  const [ultimoSalvato, setUltimoSalvato] = useState<string | null>(null);

  // Mini-creazione: aperta quando `nuovoNome` non è null.
  const [nuovoNome, setNuovoNome] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiSlotDefs(), leggiIngredienti(), leggiRepertorio(), leggiImpostazioni()])
      .then(([slotDefs, ingredienti, repertorio, impostazioni]) => {
        if (!vivo) return;
        const ordinati = [...slotDefs].sort((a, b) => a.posizione - b.posizione);
        setDati({
          slotDefs: ordinati,
          ordineAree: impostazioni.ordineAree,
          salvatiPrima: repertorio.length,
          perPastoPrima: contaPerPasto(repertorio),
        });
        setIngredienti(ingredienti);
        setSlotDefId(ordinati[0]?.id ?? '');
      })
      .catch((errore) => {
        console.error('piatti/veloce: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare. Riprova più tardi.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (erroreCaricamento) {
    return (
      <Cornice etichetta="PIATTO">
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{erroreCaricamento}</p>
      </Cornice>
    );
  }

  if (!dati) return <Cornice etichetta="PIATTO" />;

  let n = dati.salvatiPrima;
  const perPasto = new Map(dati.perPastoPrima);
  for (const [id, conta] of salvatiOra) {
    n += conta;
    perPasto.set(id, (perPasto.get(id) ?? 0) + conta);
  }
  const nomiPerId = new Map(ingredienti.map((i) => [i.id, i.nome]));
  const ragione = ragioneNonValido(nome, righe, nomiPerId);

  const testoRicerca = normalizza(ricerca);
  const nelPiatto = new Set(righe.map((r) => r.ingredientId));
  const risultati = testoRicerca
    ? ingredienti
        .filter((i) => !nelPiatto.has(i.id) && normalizza(i.nome).includes(testoRicerca))
        .slice(0, MAX_RISULTATI)
    : [];
  // "Crea" solo se nessun ingrediente ha esattamente quel nome: un doppione
  // per una maiuscola o un accento in più sarebbe un ingrediente in più da
  // pulire in Impostazioni, e non c'è vincolo di unicità sul nome (§5).
  const offriCreazione =
    testoRicerca !== '' && !ingredienti.some((i) => normalizza(i.nome) === testoRicerca);

  function aggiungiRiga(ingrediente: Ingredient) {
    setRighe((prev) => [...prev, { ingredientId: ingrediente.id, quantita: '', unita: ingrediente.unitaBase }]);
    setRicerca('');
    setUltimoSalvato(null);
  }

  function cambiaQuantita(ingredientId: string, quantita: string) {
    setRighe((prev) => prev.map((r) => (r.ingredientId === ingredientId ? { ...r, quantita } : r)));
  }

  function togliRiga(ingredientId: string) {
    setRighe((prev) => prev.filter((r) => r.ingredientId !== ingredientId));
  }

  function cambiaNome(testo: string) {
    setNome(testo);
    setUltimoSalvato(null);
  }

  async function salva() {
    if (ragione !== null || salvando) return;
    setSalvando(true);
    setErroreSalva(null);
    const nomePulito = nome.trim();
    try {
      await salvaPiatto({
        nome: nomePulito,
        slotDefId,
        fonte: 'proprio',
        attivo: true,
        descrizione: null,
        settimanaCiclo: null,
        giornoCiclo: null,
        ingredienti: righe.map((r) => ({
          ingredientId: r.ingredientId,
          quantita: quantitaNumerica(r.quantita),
          unita: r.unita,
        })),
        componenti: [],
      });
      // Il pasto non si tocca: chi scrive tre cene di fila non lo ritocca.
      setSalvatiOra((prev) => new Map(prev).set(slotDefId, (prev.get(slotDefId) ?? 0) + 1));
      setNome('');
      setRighe([]);
      setRicerca('');
      setUltimoSalvato(nomePulito);
    } catch (errore) {
      console.error('piatti/veloce: salvataggio fallito.', errore);
      setErroreSalva('Non siamo riusciti a salvare il piatto. Riprova.');
    } finally {
      setSalvando(false);
    }
  }

  /** Dalla mini-creazione: l'ingrediente entra nell'elenco locale e nel piatto, il riquadro si chiude. */
  function ingredienteCreato(ingrediente: Ingredient) {
    setIngredienti((prev) => [...prev, ingrediente]);
    setNuovoNome(null);
    aggiungiRiga(ingrediente);
  }

  return (
    <Cornice etichetta={`PIATTO ${n + 1}`}>
      <div style={{ padding: '0 16px 8px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)' }}>
        {testoContatore(n, perPasto, dati.slotDefs)}
      </div>

      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 16px' }}>
        {ultimoSalvato !== null && (
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', margin: '2px 4px 10px' }}>
            Salvato: {ultimoSalvato}
          </div>
        )}

        <input
          type="text"
          value={nome}
          onChange={(e) => cambiaNome(e.target.value)}
          placeholder="Dai un nome al piatto"
          aria-label="Nome del piatto"
          maxLength={LUNGHEZZA_MASSIMA}
          style={{
            display: 'block', width: '100%', fontFamily: 'inherit',
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1,
            color: 'var(--ink)', padding: '4px 2px 8px',
            border: 'none', borderBottom: '1.5px solid rgba(20,22,58,0.14)',
            background: 'transparent', outline: 'none', boxSizing: 'border-box',
          }}
        />

        <Etichetta margine="18px 4px 8px">PASTO</Etichetta>
        <Segmento
          opzioni={dati.slotDefs.map((s) => ({ id: s.id, label: s.nome }))}
          valore={slotDefId}
          onCambia={setSlotDefId}
        />

        <Etichetta margine="16px 4px 8px">INGREDIENTI</Etichetta>
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca un ingrediente"
          aria-label="Cerca un ingrediente"
          maxLength={LUNGHEZZA_MASSIMA}
          style={{
            width: '100%', height: 44, padding: '0 14px',
            borderRadius: 14, border: '1px solid var(--bordo)',
            background: 'var(--fondo)', color: 'var(--ink)',
            fontSize: 15, outline: 'none', boxSizing: 'border-box',
          }}
        />

        {nuovoNome !== null ? (
          <MiniCreazione
            nomeIniziale={nuovoNome}
            ordineAree={dati.ordineAree}
            onCreato={ingredienteCreato}
            onAnnulla={() => setNuovoNome(null)}
          />
        ) : (
          (risultati.length > 0 || offriCreazione) && (
            <div
              style={{
                marginTop: 8, background: 'var(--superficie)', borderRadius: 18,
                border: '1px solid var(--bordo)', overflow: 'hidden',
              }}
            >
              {risultati.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => aggiungiRiga(i)}
                  aria-label={`Aggiungi ${i.nome}`}
                  style={{
                    width: '100%', minHeight: 46, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent', borderBottom: '1px solid var(--bordo)', textAlign: 'left',
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: 3, flex: 'none', background: coloreArea(i.area) }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{i.nome}</span>
                </button>
              ))}
              {offriCreazione && (
                <button
                  type="button"
                  onClick={() => setNuovoNome(ricerca.trim())}
                  // Il "+" è decorativo: il nome accessibile è la sola scritta.
                  aria-label={`Crea «${ricerca.trim()}»`}
                  style={{
                    width: '100%', minHeight: 46, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent', textAlign: 'left',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--sec)', width: 9, textAlign: 'center' }}>+</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Crea «{ricerca.trim()}»</span>
                </button>
              )}
            </div>
          )
        )}

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {righe.map((r) => {
            const nomeRiga = nomiPerId.get(r.ingredientId) ?? '';
            return (
              <div
                key={r.ingredientId}
                data-riga={r.ingredientId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 16px',
                  background: 'var(--superficie)', borderRadius: 18, border: '1px solid var(--bordo)',
                }}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nomeRiga}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={r.quantita}
                  onChange={(e) => cambiaQuantita(r.ingredientId, e.target.value)}
                  aria-label={`Quantità di ${nomeRiga}`}
                  placeholder="0"
                  style={{
                    width: 68, height: 40, borderRadius: 12, textAlign: 'right', padding: '0 10px',
                    border: '1px solid rgba(20,22,58,0.12)', background: '#FFFFFF', outline: 'none',
                    fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--ink)',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--sec)', width: 26 }}>
                  {r.unita}
                </span>
                <button
                  type="button"
                  onClick={() => togliRiga(r.ingredientId)}
                  aria-label={`Togli ${nomeRiga}`}
                  style={{ width: 40, height: 40, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6 6 18" stroke="var(--sec)" strokeWidth="2.1" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {righe.length === 0 && (
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '10px 4px 0' }}>
            Un piatto senza ingredienti non entra nella lista della spesa
          </div>
        )}

        {ragione !== null && (
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '14px 4px 0' }}>{ragione}</div>
        )}
        {erroreSalva && (
          <p style={{ margin: '10px 4px 0', fontSize: 12.5, color: 'var(--sec)' }}>{erroreSalva}</p>
        )}
      </div>

      <div style={{ padding: '8px 16px 22px', display: 'flex', gap: 9 }}>
        <Link
          href="/settimana"
          style={{
            flex: 'none', width: 104, height: 54, borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.09em',
            color: 'var(--sec)', background: 'rgba(20,22,58,0.05)',
          }}
        >
          HO FINITO
        </Link>
        <button
          type="button"
          onClick={salva}
          disabled={ragione !== null || salvando}
          style={{
            flex: 1, height: 54, borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            background: ragione === null ? 'var(--ink)' : 'rgba(20,22,58,0.10)',
            boxShadow: ragione === null ? '0 3px 10px rgba(20,22,58,0.24)' : 'none',
            color: ragione === null ? '#FFFFFF' : 'var(--ter)',
            opacity: salvando ? 0.7 : 1,
          }}
        >
          SALVA E AVANTI
        </button>
      </div>
    </Cornice>
  );
}

const OPZIONI_UNITA = [
  { id: 'g', label: 'G' },
  { id: 'ml', label: 'ML' },
  { id: 'pz', label: 'PZ' },
];

const AREA_INIZIALE: AreaId = 'dispensa';
const UNITA_INIZIALE: UnitaBase = 'g';

interface PropsMiniCreazione {
  nomeIniziale: string;
  ordineAree: AreaId[];
  onCreato: (ingrediente: Ingredient) => void;
  onAnnulla: () => void;
}

/**
 * Mini-creazione di un ingrediente (spec §2.3), nello stesso posto dei
 * risultati di ricerca. L'utente sceglie nome, area e unità; il resto lo
 * mettono i `predefinitiIngrediente`, riapplicati a ogni cambio di area o
 * unità ai soli campi non ancora toccati a mano: un default che sovrascrive
 * quello che l'utente ha appena scritto sarebbe una correzione a tradimento.
 * Con `pz` il formato è 1 comunque: list-builder forza 1 per gli interi e
 * mostrare altro qui mentirebbe su cosa succede in lista. Per lo stesso
 * motivo il passaggio da `pz` a un'altra unità riparte dal default del
 * formato anche se era stato toccato: quel che c'era scritto era un formato
 * a pezzi, non ha senso in grammi, e un "1" lasciato lì diventerebbe una
 * confezione da un grammo.
 */
function MiniCreazione({ nomeIniziale, ordineAree, onCreato, onAnnulla }: PropsMiniCreazione) {
  const iniziali = predefinitiIngrediente(AREA_INIZIALE, UNITA_INIZIALE);
  const [nome, setNome] = useState(nomeIniziale);
  const [area, setArea] = useState<AreaId>(AREA_INIZIALE);
  const [unita, setUnita] = useState<UnitaBase>(UNITA_INIZIALE);
  const [deperibile, setDeperibile] = useState(iniziali.deperibile);
  const [formatoTesto, setFormatoTesto] = useState(String(iniziali.formatoConfezione));
  const [deperibileToccato, setDeperibileToccato] = useState(false);
  const [formatoToccato, setFormatoToccato] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  /**
   * Riapplica i default ai campi non toccati, con i valori nuovi di area e
   * unità. `formatoLibero` dice se il formato va considerato non toccato:
   * di norma è `!formatoToccato`, ma cambiaUnita lo forza quando si lascia `pz`.
   */
  function riapplica(areaNuova: AreaId, unitaNuova: UnitaBase, formatoLibero = !formatoToccato) {
    const p = predefinitiIngrediente(areaNuova, unitaNuova);
    if (!deperibileToccato) setDeperibile(p.deperibile);
    if (formatoLibero || unitaNuova === 'pz') setFormatoTesto(String(p.formatoConfezione));
  }

  function cambiaArea(id: string) {
    const a = id as AreaId;
    setArea(a);
    riapplica(a, unita);
  }

  function cambiaUnita(id: string) {
    const u = id as UnitaBase;
    // Da pezzi a peso/volume: il formato scritto prima era a pezzi, si
    // riparte dal default e si dimentica che era stato toccato.
    const daPezzi = unita === 'pz' && u !== 'pz';
    if (daPezzi) setFormatoToccato(false);
    setUnita(u);
    riapplica(area, u, daPezzi || !formatoToccato);
  }

  const aPezzi = unita === 'pz';
  const formato = aPezzi ? 1 : quantitaNumerica(formatoTesto);
  const nonValido = !nome.trim() || !Number.isFinite(formato) || formato <= 0 || formato > QUANTITA_MASSIMA;

  async function crea() {
    if (nonValido || creando) return;
    setCreando(true);
    setErrore(null);
    const { classeResiduo } = predefinitiIngrediente(area, unita);
    const dati: Omit<Ingredient, 'id'> = {
      nome: nome.trim(),
      unitaBase: unita,
      area,
      classeResiduo,
      deperibile,
      formatoConfezione: formato,
      prezzoConfezione: null,
    };
    try {
      const id = await salvaIngrediente(dati);
      onCreato({ id, ...dati });
    } catch (errore) {
      console.error('piatti/veloce: creazione ingrediente fallita.', errore);
      setErrore("Non siamo riusciti a creare l'ingrediente. Riprova.");
      setCreando(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 8, padding: '14px 14px 14px', background: 'var(--superficie)',
        borderRadius: 18, border: '1px solid var(--bordo)',
      }}
    >
      <Etichetta margine="0 2px 8px">NUOVO INGREDIENTE</Etichetta>
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label="Nome dell'ingrediente"
        placeholder="Dai un nome all'ingrediente"
        maxLength={LUNGHEZZA_MASSIMA}
        style={{
          width: '100%', height: 44, padding: '0 14px', borderRadius: 14,
          border: '1px solid rgba(20,22,58,0.12)', background: '#FFFFFF', color: 'var(--ink)',
          fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
        }}
      />

      <Etichetta margine="14px 2px 8px">AREA DEL SUPERMERCATO</Etichetta>
      <Segmento opzioni={ordineAree.map((a) => ({ id: a, label: nomeArea(a) }))} valore={area} onCambia={cambiaArea} />

      <Etichetta margine="12px 2px 8px">UNITÀ DI MISURA</Etichetta>
      <Segmento opzioni={OPZIONI_UNITA} valore={unita} onCambia={cambiaUnita} variante="blocco" />

      <Etichetta margine="14px 2px 8px">DEPERIBILE</Etichetta>
      <button
        type="button"
        onClick={() => {
          setDeperibileToccato(true);
          setDeperibile((v) => !v);
        }}
        aria-pressed={deperibile}
        aria-label="Va comprato fresco"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
          borderRadius: 16, background: '#FFFFFF', border: '1px solid rgba(20,22,58,0.09)',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          {deperibile ? 'Sì, va comprato fresco' : 'No, si conserva a lungo'}
        </span>
        <span
          style={{
            width: 46, height: 28, borderRadius: 999, flex: 'none', display: 'flex', alignItems: 'center', padding: 3,
            background: deperibile ? 'var(--ink)' : 'rgba(20,22,58,0.14)',
            justifyContent: deperibile ? 'flex-end' : 'flex-start',
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: 999, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(20,22,58,0.28)' }} />
        </span>
      </button>

      <Etichetta margine="14px 2px 8px">FORMATO DELLA CONFEZIONE</Etichetta>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="text"
          inputMode="decimal"
          value={aPezzi ? '1' : formatoTesto}
          disabled={aPezzi}
          onChange={(e) => {
            setFormatoToccato(true);
            setFormatoTesto(e.target.value);
          }}
          aria-label="Formato della confezione"
          style={{
            flex: 1, height: 48, padding: '0 14px', borderRadius: 14,
            border: '1px solid rgba(20,22,58,0.12)', background: '#FFFFFF', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--ink)',
            opacity: aPezzi ? 0.5 : 1, boxSizing: 'border-box',
          }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--sec)', width: 30 }}>
          {unita}
        </span>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', marginTop: 8 }}>
        Formato e reparto li puoi correggere dopo in Impostazioni → Ingredienti.
      </div>

      {errore && <p style={{ margin: '10px 2px 0', fontSize: 12.5, color: 'var(--sec)' }}>{errore}</p>}

      <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
        <button
          type="button"
          onClick={onAnnulla}
          disabled={creando}
          style={{
            flex: 'none', width: 104, height: 54, borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.09em',
            color: 'var(--sec)', background: 'rgba(20,22,58,0.05)',
          }}
        >
          ANNULLA
        </button>
        <button
          type="button"
          onClick={crea}
          disabled={nonValido || creando}
          style={{
            flex: 1, height: 54, borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            background: nonValido ? 'rgba(20,22,58,0.10)' : 'var(--ink)',
            color: nonValido ? 'var(--ter)' : '#FFFFFF',
            boxShadow: nonValido ? 'none' : '0 3px 10px rgba(20,22,58,0.24)',
            opacity: creando ? 0.7 : 1,
          }}
        >
          CREA E AGGIUNGI
        </button>
      </div>
    </div>
  );
}

/** Etichetta mono di sezione, come nell'editor ingrediente. */
function Etichetta({ children, margine }: { children: ReactNode; margine: string }) {
  return (
    <div style={{ margin: margine, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
      {children}
    </div>
  );
}

/**
 * Header ridotto come in Scegli: freccia indietro verso /piatti, etichetta
 * mono al centro, spazio vuoto a destra per tenerla centrata. Non è Testata
 * (quella porta il marchio e il titolo grande delle schermate di casa).
 */
function Cornice({ etichetta, children }: { etichetta: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/piatti"
          aria-label="Torna ai piatti"
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          {etichetta}
        </span>
        <div style={{ width: 44, height: 44, flex: 'none' }} />
      </div>
      {children}
    </div>
  );
}
