'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Dish, DishIngredient, Ingredient, MealSlotDef } from '@/domain/types';
import { salvaPiatto, leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs } from '@/data/impostazioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { giorniDellaSettimana } from '@/domain/date';
import { coloreArea } from '@/domain/aree';
import { Segmento } from '@/components/Segmento';
import { TesseraIngrediente } from '@/components/TesseraIngrediente';

const GIORNI_LABEL = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

const TESTO_SENZA_INGREDIENTI =
  'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ' +
  'ingrediente a dire quanto comprare. Aggiungine almeno uno.';

const TESTO_NON_IN_PROGRAMMA =
  'Non ancora in programma. Comparirà qui appena lo assegni a un pasto dalla Settimana.';

/**
 * La frase di riepilogo sotto la striscia dei giorni. Il caso "non in
 * programma" è copiato alla lettera da VuotoPiatto.dc.html; gli altri casi
 * non hanno un testo imposto dall'artboard (lì è un dato di mock), quindi
 * qui si genera una frase onesta sui numeri reali senza provare a
 * riprodurre il gioco di parole "Sei... sei al bar" del mock, che non
 * regge con un nome di pasto o un conteggio qualsiasi.
 */
function testoRiepilogo(nCasa: number, nFuori: number): string {
  if (nCasa === 0 && nFuori === 0) return TESTO_NON_IN_PROGRAMMA;
  if (nCasa === 0) {
    const volte = nFuori === 1 ? '1 volta' : `${nFuori} volte`;
    return `In programma ${volte} questa settimana, ma sempre fuori casa: non entra nella lista.`;
  }
  const volteCasa = nCasa === 1 ? '1 volta' : `${nCasa} volte`;
  let frase = `Il piatto entra ${volteCasa} nella lista questa settimana.`;
  if (nFuori > 0) {
    const volteFuori = nFuori === 1 ? '1 volta' : `${nFuori} volte`;
    frase += ` In più è in programma, ma fuori casa, ${volteFuori}.`;
  }
  return frase;
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
  const [ingredienti, setIngredienti] = useState<DishIngredient[]>([]);
  const [selettoreAperto, setSelettoreAperto] = useState(false);
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
        const [defs, catalogoIngredienti, settimana, repertorio] = await Promise.all([
          leggiSlotDefs(),
          leggiIngredienti(),
          leggiSettimanaCorrente(),
          nuovo ? Promise.resolve(null) : leggiRepertorio(),
        ]);
        if (!vivo) return;
        setSlotDefs(defs);
        setCatalogo(catalogoIngredienti);
        if (settimana) setDataInizioSettimana(settimana.dataInizio);

        if (!nuovo) {
          const trovato = (repertorio ?? []).find((p) => p.id === id) ?? null;
          if (!trovato) {
            setErrore('Piatto non trovato.');
          } else {
            setPiattoOriginale(trovato);
            setNome(trovato.nome);
            setSlotDefId(trovato.slotDefId);
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
      } catch {
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
  }

  function cambiaQuantita(ingredientId: string, quantita: number) {
    setIngredienti((prev) => prev.map((r) => (r.ingredientId === ingredientId ? { ...r, quantita } : r)));
  }

  function rimuoviIngrediente(ingredientId: string) {
    setIngredienti((prev) => prev.filter((r) => r.ingredientId !== ingredientId));
  }

  async function salva() {
    if (ingredienti.length === 0 || salvando) return;
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
        ingredienti,
      });
      router.push('/piatti');
    } catch {
      setErrore('Non siamo riusciti a salvare il piatto. Riprova.');
      setSalvando(false);
    }
  }

  if (errore && !caricamento && !piattoOriginale && !nuovo) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{errore}</p>
      </Cornice>
    );
  }

  if (caricamento) return <Cornice />;

  const catalogoPerId = new Map(catalogo.map((i) => [i.id, i]));
  const disponibili = catalogo.filter((i) => !ingredienti.some((r) => r.ingredientId === i.id));

  const giorniSettimana = dataInizioSettimana ? giorniDellaSettimana(dataInizioSettimana) : [];
  const giorni = GIORNI_LABEL.map((label, i) => {
    const iso = giorniSettimana[i];
    return { label, inProgramma: iso ? giorniCasa.has(iso) : false };
  });
  const nCasa = giorni.filter((g) => g.inProgramma).length;
  const nFuori = giorniFuori.size;

  const senzaIngredienti = ingredienti.length === 0;

  return (
    <Cornice>
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
          disabled={senzaIngredienti || salvando}
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
            background: senzaIngredienti ? 'rgba(20,22,58,0.10)' : 'var(--ink)',
            color: senzaIngredienti ? 'var(--ter)' : '#FFFFFF',
          }}
        >
          SALVA PIATTO
        </button>
      </div>

      {selettoreAperto && (
        <div
          onClick={() => setSelettoreAperto(false)}
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
            {disponibili.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--sec)', padding: '8px 6px' }}>
                Hai già aggiunto tutti gli ingredienti del repertorio.
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
    </Cornice>
  );
}

/**
 * L'header minimale degli artboard Piatto/VuotoPiatto: freccia indietro,
 * etichetta centrale, icona a destra. Non è Testata (quella è per le
 * schermate di casa, con marchio e titolo a 52px).
 *
 * L'icona a destra è quella del cestino nell'artboard ma resta inerte: non
 * esiste ancora una funzione di eliminazione del piatto nel data layer di
 * questo task (fuori scope, da valutare in un task futuro).
 */
function Cornice({ children }: { children?: ReactNode }) {
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
        <span style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 -10px 0 0' }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
            <path
              d="M4.6 6.6h14.8M9.6 6.6V4.4h4.8v2.2M6.6 6.6l.9 12.2a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-12.2"
              stroke="var(--ink)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {children}
    </div>
  );
}
