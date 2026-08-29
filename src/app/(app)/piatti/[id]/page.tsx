'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Dish, DishIngredient, Ingredient, MealSlotDef } from '@/domain/types';
import { salvaPiatto, leggiRepertorio, leggiIngredienti, eliminaPiatto } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { giorniDellaSettimana } from '@/domain/date';
import { coloreArea } from '@/domain/aree';
import { Segmento } from '@/components/Segmento';
import { TesseraIngrediente } from '@/components/TesseraIngrediente';
import { raccogliIngredienteCreato, riprendiBozza, salvaBozza, scartaBozza } from './bozza';

const GIORNI_LABEL = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
// Iniziali, non LUN/MAR come nella striscia "in questa settimana": sono due
// cose diverse nella stessa schermata (qui si sceglie, là si legge cosa è
// già in programma) e due strisce identiche si confonderebbero. È anche la
// stessa forma dei giorni "abitualmente fuori casa" in Impostazioni, dove
// pure si sceglie.
const GIORNI_INIZIALE = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

const TESTO_SENZA_INGREDIENTI =
  'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ' +
  'ingrediente a dire quanto comprare. Aggiungine almeno uno.';

const TESTO_NON_IN_PROGRAMMA =
  'Non ancora in programma. Comparirà qui appena lo assegni a un pasto dalla Settimana.';

const TESTO_ELIMINA =
  'Non comparirà più nel repertorio né nelle prossime settimane. Le settimane già passate restano invariate.';

// Solo 0-7 possibili (sette giorni): un lookup fisso è sicuro qui, a
// differenza di provare a pluralizzare un nome di pasto scritto liberamente
// dall'utente (quello sì fragile, ed è il motivo per cui la frase sotto non
// riproduce il gioco di parole "Sei... sei al bar" del mock).
const NUMERI_PAROLA = ['zero', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette'];

function volte(n: number): string {
  return n === 1 ? 'una volta' : `${NUMERI_PAROLA[n]} volte`;
}

/**
 * La frase di riepilogo sotto la striscia dei giorni, mostrata solo quando
 * il piatto è davvero in programma questa settimana (altrimenti si usa il
 * riquadro muto con TESTO_NON_IN_PROGRAMMA, copiato alla lettera da
 * VuotoPiatto.dc.html — niente striscia in quel caso, vedi il render).
 *
 * Non c'è un testo imposto dall'artboard per questo caso (in Piatto.dc.html
 * è un dato di mock, non copy fisso): tenendo dal mock i numeri scritti in
 * lettere e la struttura in due tempi — prima cosa succede in settimana, poi
 * la conseguenza sulla lista — senza il gioco di parole, che non regge con
 * un conteggio o un nome di pasto qualsiasi.
 */
function testoRiepilogo(nCasa: number, nFuori: number): string {
  if (nCasa === 0) {
    return `Fuori casa ${volte(nFuori)} questa settimana: non entra nella lista.`;
  }
  let frase = `In casa ${volte(nCasa)} questa settimana`;
  if (nFuori > 0) frase += `, fuori ${volte(nFuori)}`;
  frase += `. Il piatto entra ${volte(nCasa)} nella lista.`;
  return frase;
}

/**
 * Confronto tollerante agli accenti: chi cerca "caffe" deve trovare "Caffè",
 * perché sulla tastiera del telefono l'accento costa un tocco in più e
 * nessuno lo mette per cercare.
 */
function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Editor della ricetta: crea (`id === 'nuovo'`) o modifica un piatto del
 * repertorio. Il marchio non compare in questa schermata (niente Testata:
 * l'header qui è quello minimale degli artboard Piatto/VuotoPiatto, non il
 * titolo di casa a 52px — sono due schermate diverse, non la stessa).
 */
export default function Piatto() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const nuovo = id === 'nuovo';

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [slotDefs, setSlotDefs] = useState<MealSlotDef[]>([]);
  const [catalogo, setCatalogo] = useState<Ingredient[]>([]);
  const [piattoOriginale, setPiattoOriginale] = useState<Dish | null>(null);
  const [giorniCasa, setGiorniCasa] = useState<Set<string>>(new Set());
  const [giorniFuori, setGiorniFuori] = useState<Set<string>>(new Set());
  const [dataInizioSettimana, setDataInizioSettimana] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [slotDefId, setSlotDefId] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [settimanaCiclo, setSettimanaCiclo] = useState<number | null>(null);
  const [giornoCiclo, setGiornoCiclo] = useState<number | null>(null);
  // Quante settimane ha il ciclo: sotto le due, la scelta della settimana non
  // ha nulla fra cui scegliere e la sezione non compare.
  const [settimaneCiclo, setSettimaneCiclo] = useState(1);
  const [ingredienti, setIngredienti] = useState<DishIngredient[]>([]);
  const [selettoreAperto, setSelettoreAperto] = useState(false);
  const [ricerca, setRicerca] = useState('');
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const nomeRef = useRef<HTMLTextAreaElement>(null);

  // Il titolo va a capo su più righe come nell'artboard (che lo scrive con un
  // <br>): un <input> a riga singola l'avrebbe semplicemente tagliato fuori
  // dallo schermo. La textarea si auto-ridimensiona sul contenuto reale.
  useEffect(() => {
    const el = nomeRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [nome]);

  useEffect(() => {
    let vivo = true;
    async function carica() {
      try {
        const [defs, catalogoIngredienti, settimana, repertorio, impostazioni] = await Promise.all([
          leggiSlotDefs(),
          leggiIngredienti(),
          leggiSettimanaCorrente(),
          nuovo ? Promise.resolve(null) : leggiRepertorio(),
          leggiImpostazioni(),
        ]);
        if (!vivo) return;
        setSlotDefs(defs);
        setCatalogo(catalogoIngredienti);
        setSettimaneCiclo(impostazioni.settimaneCiclo);
        if (settimana) setDataInizioSettimana(settimana.dataInizio);

        if (!nuovo) {
          const trovato = (repertorio ?? []).find((p) => p.id === id) ?? null;
          if (!trovato) {
            setErrore('Piatto non trovato.');
          } else {
            setPiattoOriginale(trovato);
            setNome(trovato.nome);
            setSlotDefId(trovato.slotDefId);
            setDescrizione(trovato.descrizione ?? '');
            setSettimanaCiclo(trovato.settimanaCiclo);
            setGiornoCiclo(trovato.giornoCiclo);
            setIngredienti(trovato.ingredienti);
            if (settimana) {
              const casa = new Set<string>();
              const fuori = new Set<string>();
              for (const s of settimana.slots) {
                if (s.dishId !== trovato.id) continue;
                if (s.stato === 'casa') casa.add(s.data);
                else fuori.add(s.data);
              }
              setGiorniCasa(casa);
              setGiorniFuori(fuori);
            }
          }
        }

        // Dopo i dati veri, non prima: la bozza è più recente di quello che
        // c'è sul server (è lavoro non ancora salvato) e deve vincere.
        const bozza = riprendiBozza(id);
        if (bozza) {
          setNome(bozza.nome);
          setSlotDefId(bozza.slotDefId);
          setDescrizione(bozza.descrizione);
          setSettimanaCiclo(bozza.settimanaCiclo);
          setGiornoCiclo(bozza.giornoCiclo);
          setIngredienti(bozza.ingredienti);
        }

        // Chi è appena tornato dalla creazione di un ingrediente lo aveva
        // creato per questo piatto: entra da solo, con grammatura da
        // scrivere. Il catalogo appena letto è la fonte dell'unità di base.
        const creato = raccogliIngredienteCreato(id);
        if (creato) {
          const ing = catalogoIngredienti.find((i) => i.id === creato);
          if (ing) {
            setIngredienti((prev) =>
              prev.some((r) => r.ingredientId === creato)
                ? prev
                : [...prev, { ingredientId: creato, quantita: 0, unita: ing.unitaBase }],
            );
          }
        }
      } catch (errore) {
        console.error('piatto: caricamento fallito.', errore);
        if (vivo) setErrore('Non riusciamo a caricare il piatto. Riprova più tardi.');
      } finally {
        if (vivo) setCaricamento(false);
      }
    }
    carica();
    return () => {
      vivo = false;
    };
  }, [id, nuovo]);

  function aggiungiIngrediente(ing: Ingredient) {
    setIngredienti((prev) => [...prev, { ingredientId: ing.id, quantita: 0, unita: ing.unitaBase }]);
    setSelettoreAperto(false);
    // Riaprendo il selettore si riparte dall'elenco intero: la ricerca di
    // prima non ha niente a che vedere con l'ingrediente successivo.
    setRicerca('');
  }

  function cambiaQuantita(ingredientId: string, quantita: number) {
    setIngredienti((prev) => prev.map((r) => (r.ingredientId === ingredientId ? { ...r, quantita } : r)));
  }

  function rimuoviIngrediente(ingredientId: string) {
    setIngredienti((prev) => prev.filter((r) => r.ingredientId !== ingredientId));
  }

  /**
   * Da chiamare prima di ogni uscita verso l'editor di un ingrediente: è
   * l'unica navigazione che si porta via lavoro non salvato, perché il
   * piatto qui esiste solo in memoria finché non si preme SALVA PIATTO.
   */
  function riparaBozzaPrimaDiUscire() {
    salvaBozza(id, { nome, slotDefId, descrizione, settimanaCiclo, giornoCiclo, ingredienti });
  }

  /**
   * Il cestino nell'header è quello dell'artboard: deve fare qualcosa di
   * vero, non solo esserci. Su un piatto nuovo (mai salvato) non c'è ancora
   * niente da eliminare: equivale ad annullare, senza bisogno di conferma
   * (ANNULLA già fa esattamente questo senza chiederla). Su un piatto
   * esistente apre la conferma.
   */
  function tapCestino() {
    if (nuovo) {
      router.push('/piatti');
      return;
    }
    setConfermaEliminazione(true);
  }

  async function confermaElimina() {
    if (!piattoOriginale) return;
    setEliminando(true);
    try {
      await eliminaPiatto(piattoOriginale.id);
      scartaBozza(id);
      router.push('/piatti');
    } catch (errore) {
      console.error('piatto: eliminazione fallita.', errore);
      setErrore('Non siamo riusciti a eliminare il piatto. Riprova.');
      setEliminando(false);
      setConfermaEliminazione(false);
    }
  }

  async function salva() {
    if (ingredienti.length === 0 || ingredienti.some((r) => r.quantita <= 0) || salvando) return;
    setSalvando(true);
    setErrore(null);
    try {
      // Fallback silenzioso sul primo pasto se l'utente non ne ha ancora
      // scelto uno: la schermata non blocca il salvataggio su questo (solo
      // sugli ingredienti, per Step 4), ma dish.slot_def_id non è nullable.
      const slotEffettivo = slotDefId || slotDefs[0]?.id || '';
      await salvaPiatto({
        id: nuovo ? undefined : id,
        nome: nome.trim(),
        slotDefId: slotEffettivo,
        fonte: piattoOriginale?.fonte ?? 'proprio',
        attivo: piattoOriginale?.attivo ?? true,
        descrizione: descrizione.trim() || null,
        // Una settimana del ciclo che il ciclo non contiene più (si è passati
        // da quattro settimane a due) filtrerebbe via il piatto per sempre:
        // si scrive solo quello che il ciclo corrente può ancora usare.
        settimanaCiclo: settimanaCiclo !== null && settimanaCiclo <= settimaneCiclo ? settimanaCiclo : null,
        giornoCiclo,
        ingredienti,
        componenti: [],
      });
      scartaBozza(id);
      router.push('/piatti');
    } catch (errore) {
      console.error('piatto: salvataggio fallito.', errore);
      setErrore('Non siamo riusciti a salvare il piatto. Riprova.');
      setSalvando(false);
    }
  }

  if (errore && !caricamento && !piattoOriginale && !nuovo) {
    // Niente da eliminare su un piatto che non è stato trovato.
    return (
      <Cornice cestinoAttivo={false}>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{errore}</p>
      </Cornice>
    );
  }

  if (caricamento) return <Cornice cestinoAttivo={false} />;

  const catalogoPerId = new Map(catalogo.map((i) => [i.id, i]));
  const nonAncoraNelPiatto = catalogo.filter((i) => !ingredienti.some((r) => r.ingredientId === i.id));
  // La ricerca cerca dentro il nome, non solo all'inizio: "pomo" trova sia
  // "Pomodori" sia "Passata di pomodoro".
  const disponibili = ricerca.trim()
    ? nonAncoraNelPiatto.filter((i) => normalizza(i.nome).includes(normalizza(ricerca)))
    : nonAncoraNelPiatto;

  const giorniSettimana = dataInizioSettimana ? giorniDellaSettimana(dataInizioSettimana) : [];
  const giorni = GIORNI_LABEL.map((label, i) => {
    const iso = giorniSettimana[i];
    return { label, inProgramma: iso ? giorniCasa.has(iso) : false };
  });
  const nCasa = giorni.filter((g) => g.inProgramma).length;
  const nFuori = giorniFuori.size;

  const senzaIngredienti = ingredienti.length === 0;
  // dish_ingredient ha `check (quantita > 0)`: un ingrediente aggiunto e mai
  // toccato parte da quantita: 0 (vedi aggiungiIngrediente sopra) e
  // salverebbe sempre lo stesso errore generico, senza dire quale tessera è
  // il problema (I2). Il salvataggio resta disattivato finché non è > 0.
  const quantitaNonValide = new Set(ingredienti.filter((r) => r.quantita <= 0).map((r) => r.ingredientId));
  const salvataggioDisabilitato = senzaIngredienti || quantitaNonValide.size > 0;

  return (
    <Cornice onCestino={tapCestino}>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 14px' }}>
        <textarea
          ref={nomeRef}
          rows={1}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            // Il nome è una stringa sola: va a capo da solo per lunghezza,
            // non deve poter contenere newline inseriti a mano.
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder="Dai un nome al piatto"
          className="nome-piatto"
          style={{
            display: 'block',
            width: '100%',
            resize: 'none',
            overflow: 'hidden',
            fontFamily: 'inherit',
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: '-0.045em',
            lineHeight: 1.05,
            color: 'var(--ink)',
            padding: '0 2px 4px',
            border: 'none',
            borderBottom: '1.5px solid rgba(20,22,58,0.14)',
            background: 'transparent',
            outline: 'none',
          }}
        />
        <style jsx>{`
          .nome-piatto::placeholder {
            color: #c4c4ce;
          }
        `}</style>

        <div style={{ marginTop: 16 }}>
          <Segmento
            opzioni={slotDefs.map((s) => ({ id: s.id, label: s.nome }))}
            valore={slotDefId}
            onCambia={setSlotDefId}
          />
        </div>


        {/* Dove sta il piatto nel piano: la settimana del giro e il giorno
            fisso. Entrambi facoltativi — un piatto senza niente di dichiarato
            resta buono per tutte le settimane e per tutti i giorni, che è
            come si comportava il repertorio prima della rotazione. La
            settimana compare solo se un ciclo c'è: con una sola settimana non
            avrebbe nulla fra cui scegliere. */}
        <div style={{ margin: '22px 4px 9px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
          NEL PIANO
        </div>
        <div style={{ background: 'var(--superficie)', borderRadius: 18, border: '1px solid var(--bordo)', padding: '13px 14px 14px' }}>
          {settimaneCiclo > 1 && (
            <>
              <EtichettaCampo>SETTIMANA DEL GIRO</EtichettaCampo>
              <Pillole
                opzioni={[
                  { valore: null, label: 'TUTTE', descrizione: 'Va bene in ogni settimana del giro' },
                  ...Array.from({ length: settimaneCiclo }, (_, i) => ({
                    valore: i + 1,
                    label: String(i + 1),
                    descrizione: `Settimana ${i + 1} del giro`,
                  })),
                ]}
                valore={settimanaCiclo}
                onCambia={setSettimanaCiclo}
                gruppo="Settimana del giro"
              />
            </>
          )}
          <EtichettaCampo margine={settimaneCiclo > 1 ? '13px 0 7px' : '0 0 7px'}>GIORNO FISSO</EtichettaCampo>
          <Pillole
            opzioni={[
              { valore: null, label: 'LIBERO', descrizione: 'Lo sceglie l’app, ruotando' },
              ...GIORNI_INIZIALE.map((label, i) => ({ valore: i, label, descrizione: GIORNI_LUNGHI[i] })),
            ]}
            valore={giornoCiclo}
            onCambia={setGiornoCiclo}
            gruppo="Giorno fisso"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 4px 9px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
            INGREDIENTI
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--sec)' }}>
            PER 1 PORZIONE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {ingredienti.map((riga) => {
            const ing = catalogoPerId.get(riga.ingredientId);
            if (!ing) return null;
            return (
              <TesseraIngrediente
                key={riga.ingredientId}
                nome={ing.nome}
                area={ing.area}
                quantita={riga.quantita}
                unita={riga.unita}
                onCambiaQuantita={(q) => cambiaQuantita(riga.ingredientId, q)}
                onRimuovi={() => rimuoviIngrediente(riga.ingredientId)}
                quantitaValida={!quantitaNonValide.has(riga.ingredientId)}
                hrefModifica={`/piatti/${id}/ingredienti/${riga.ingredientId}`}
                onPrimaDiModificare={riparaBozzaPrimaDiUscire}
              />
            );
          })}

          <button
            type="button"
            onClick={() => setSelettoreAperto(true)}
            style={{
              minHeight: 108,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              padding: '13px 12px',
              borderRadius: 15,
              background: 'transparent',
              border: '1.5px dashed rgba(20,22,58,0.28)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#8A8A96" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.11em', color: 'var(--sec)', textAlign: 'center', lineHeight: 1.5 }}>
              AGGIUNGI
              <br />
              INGREDIENTE
            </span>
          </button>

          {senzaIngredienti && (
            <div style={{ minHeight: 108, borderRadius: 15, border: '1.5px dashed rgba(20,22,58,0.10)' }} />
          )}
        </div>

        {senzaIngredienti && (
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '14px 6px 0' }}>
            {TESTO_SENZA_INGREDIENTI}
          </div>
        )}

        {/* Il bordo rosso della tessera segnala che qualcosa non va, ma non
            dice cosa fare, e il numero in alto nella tessera non si legge
            come un campo da riempire — sembra un'etichetta. Senza questa
            riga il salvataggio resta bloccato senza spiegazione: si prova a
            toccare in giro finché non si scopre da soli che quel numero si
            scrive. Nominare gli ingredienti che mancano evita anche di
            doverli cercare a occhio in una griglia lunga. */}
        {!senzaIngredienti && quantitaNonValide.size > 0 && (
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '14px 6px 0' }}>
            {quantitaNonValide.size === 1 ? 'Manca la grammatura di' : 'Mancano le grammature di'}{' '}
            <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>
              {ingredienti
                .filter((r) => quantitaNonValide.has(r.ingredientId))
                .map((r) => catalogoPerId.get(r.ingredientId)?.nome)
                .filter(Boolean)
                .join(', ')}
            </strong>
            : tocca il numero sulla tessera e scrivi quanto ne usi per una porzione.
          </div>
        )}


        <div style={{ margin: '22px 4px 9px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
          COME SI FA
        </div>
        <textarea
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          placeholder="Il procedimento, se serve ricordarlo"
          aria-label="Procedimento del piatto"
          rows={4}
          className="ricetta"
          style={{
            display: 'block', width: '100%', resize: 'vertical',
            fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, color: 'var(--ink)',
            padding: '13px 14px', borderRadius: 18,
            background: 'var(--superficie)', border: '1px solid var(--bordo)', outline: 'none',
          }}
        />
        <style jsx>{`
          .ricetta::placeholder {
            color: #c4c4ce;
          }
        `}</style>

        {nCasa === 0 && nFuori === 0 ? (
          // Non in programma: niente striscia di sette giorni tutti spenti
          // (rumore che non dice niente) — il riquadro muto di
          // VuotoPiatto.dc.html, copiato alla lettera, dice cosa manca e
          // cosa fare per rimediare.
          <>
            <div style={{ margin: '26px 4px 9px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#C4C4CE' }}>
              IN QUESTA SETTIMANA
            </div>
            <div style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(20,22,58,0.035)', fontSize: 13, lineHeight: 1.45, color: 'var(--sec)' }}>
              {TESTO_NON_IN_PROGRAMMA}
            </div>
          </>
        ) : (
          <>
            <div style={{ margin: '22px 4px 9px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
              IN QUESTA SETTIMANA
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {giorni.map((g) => (
                <span
                  key={g.label}
                  style={{
                    flex: '1 1 0%',
                    textAlign: 'center',
                    padding: '11px 0',
                    borderRadius: 12,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: g.inProgramma ? 700 : 500,
                    letterSpacing: '0.07em',
                    color: g.inProgramma ? '#FFFFFF' : 'var(--ter)',
                    background: g.inProgramma ? 'var(--ink)' : 'rgba(20,22,58,0.045)',
                  }}
                >
                  {g.label}
                </span>
              ))}
            </div>
            <div style={{ margin: '10px 4px 0', fontSize: 13, lineHeight: 1.45, color: 'var(--sec)' }}>
              {testoRiepilogo(nCasa, nFuori)}
            </div>
          </>
        )}

        {errore && <p style={{ margin: '14px 6px 0', color: 'var(--sec)', fontSize: 13 }}>{errore}</p>}
      </div>

      <div style={{ padding: '8px 16px 22px', display: 'flex', gap: 9 }}>
        <Link
          href="/piatti"
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
          disabled={salvataggioDisabilitato || salvando}
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
            background: salvataggioDisabilitato ? 'rgba(20,22,58,0.10)' : 'var(--ink)',
            color: salvataggioDisabilitato ? 'var(--ter)' : '#FFFFFF',
          }}
        >
          SALVA PIATTO
        </button>
      </div>

      {selettoreAperto && (
        <div
          onClick={() => {
            setSelettoreAperto(false);
            setRicerca('');
          }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,58,0.35)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sc"
            style={{
              width: '100%',
              maxHeight: '70vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: '22px 22px 0 0',
              padding: '18px 16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)', margin: '0 6px 8px' }}>
              AGGIUNGI INGREDIENTE
            </div>

            {/* Niente autoFocus: su un telefono aprirebbe la tastiera addosso
                alla lista, e chi vuole solo scorrere si troverebbe metà
                schermo occupato senza averlo chiesto. Compare solo quando la
                lista è abbastanza lunga da rendere lo scorrimento peggiore
                della digitazione. */}
            {nonAncoraNelPiatto.length > 8 && (
              <input
                type="search"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca"
                aria-label="Cerca un ingrediente"
                style={{
                  height: 44, margin: '0 2px 10px', padding: '0 14px',
                  borderRadius: 14, border: '1px solid var(--bordo)',
                  background: 'var(--fondo)', color: 'var(--ink)',
                  fontSize: 15, outline: 'none',
                }}
              />
            )}

            {disponibili.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--sec)', padding: '8px 6px' }}>
                {ricerca.trim()
                  ? `Nessun ingrediente per "${ricerca.trim()}". Puoi crearlo qui sotto.`
                  : 'Hai già aggiunto tutti gli ingredienti del repertorio.'}
              </div>
            )}
            {disponibili.map((ing) => (
              <button
                key={ing.id}
                type="button"
                onClick={() => aggiungiIngrediente(ing)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 6px', minHeight: 44, borderRadius: 12 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2.6, flex: 'none', background: coloreArea(ing.area) }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{ing.nome}</span>
              </button>
            ))}
            <Link
              href={`/piatti/${id}/ingredienti/nuovo`}
              onClick={riparaBozzaPrimaDiUscire}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 6px', minHeight: 44 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="#14163A" strokeWidth="2.1" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)' }}>
                NUOVO INGREDIENTE
              </span>
            </Link>
          </div>
        </div>
      )}

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
              Eliminare questo piatto?
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


function EtichettaCampo({ children, margine = '0 0 7px' }: { children: ReactNode; margine?: string }) {
  return (
    <div style={{ margin: margine, fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.11em', color: 'var(--ter)' }}>
      {children}
    </div>
  );
}

interface OpzionePillola {
  valore: number | null;
  label: string;
  descrizione: string;
}

/**
 * Fila di pillole a scelta singola, con `null` come prima opzione: è la
 * forma che serve qui, dove "non deciso" è una scelta legittima e va detta
 * esplicitamente invece di essere l'assenza di selezione.
 *
 * L'area di tap è 44px anche se la pillola disegnata è più bassa, come in
 * Segmento: la regola dei bersagli vale ovunque, non solo dove il disegno è
 * già abbastanza alto.
 */
function Pillole({ opzioni, valore, onCambia, gruppo }: {
  opzioni: OpzionePillola[];
  valore: number | null;
  onCambia: (v: number | null) => void;
  gruppo: string;
}) {
  return (
    <div className="sc" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
        {opzioni.map((o) => {
          const attivo = o.valore === valore;
          return (
            <button
              key={o.descrizione}
              type="button"
              onClick={() => onCambia(o.valore)}
              aria-pressed={attivo}
              aria-label={`${gruppo}: ${o.descrizione}`}
              style={{ flex: 'none', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
            >
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 42, height: 36, padding: '0 12px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: attivo ? 700 : 500,
                  letterSpacing: '0.09em',
                  color: attivo ? '#FFFFFF' : 'var(--sec)',
                  background: attivo ? 'var(--ink)' : 'var(--fondo)',
                  border: attivo ? 'none' : '1px solid rgba(20,22,58,0.09)',
                }}
              >
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * L'header minimale degli artboard Piatto/VuotoPiatto: freccia indietro,
 * etichetta centrale, icona a destra. Non è Testata (quella è per le
 * schermate di casa, con marchio e titolo a 52px).
 *
 * Il cestino è quello dell'artboard e deve fare qualcosa di vero: quando
 * `onCestino` non è passato (in caricamento, o piatto non trovato) resta un
 * bottone disattivato — un controllo che sembra fare qualcosa senza fare
 * niente è peggio di uno assente.
 */
function Cornice({ children, onCestino, cestinoAttivo = true }: { children?: ReactNode; onCestino?: () => void; cestinoAttivo?: boolean }) {
  const attivo = cestinoAttivo && !!onCestino;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/piatti"
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          PIATTO
        </span>
        <button
          type="button"
          onClick={onCestino}
          disabled={!attivo}
          aria-label="Elimina piatto"
          style={{
            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 -10px 0 0', background: 'transparent', opacity: attivo ? 1 : 0.35,
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
