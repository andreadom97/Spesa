'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AreaId, Dish, Ingredient, MealSlotDef } from '@/domain/types';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { coloreArea } from '@/domain/aree';
import { Testata } from '@/components/Testata';
import { Segmento } from '@/components/Segmento';

const TUTTI = 'TUTTI';

/**
 * Confronto tollerante agli accenti: chi cerca "caffe" deve trovare "Caffè",
 * perché sulla tastiera del telefono l'accento costa un tocco in più e
 * nessuno lo mette per cercare. Pattern copiato da
 * src/app/(app)/piatti/[id]/page.tsx.
 */
function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const FONTE_LABEL: Record<Dish['fonte'], string> = {
  nutrizionista: 'NUTRIZIONISTA',
  proprio: 'PROPRIO',
};

interface Repertorio {
  piatti: Dish[];
  ingredienti: Ingredient[];
  slotDefs: MealSlotDef[];
  ordineAree: AreaId[];
}

/**
 * Il repertorio: i piatti reali dell'utente, filtrabili per pasto.
 *
 * Il marchio in questa schermata è sempre tutto pieno (aree=[]): solo la
 * Lista calcola le aree mancanti.
 */
export default function Piatti() {
  const [repertorio, setRepertorio] = useState<Repertorio | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>(TUTTI);
  const [ricerca, setRicerca] = useState<string>('');

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiRepertorio(), leggiIngredienti(), leggiSlotDefs(), leggiImpostazioni()])
      .then(([piatti, ingredienti, slotDefs, impostazioni]) => {
        if (vivo) setRepertorio({ piatti, ingredienti, slotDefs, ordineAree: impostazioni.ordineAree });
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
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{errore}</p>
      </Cornice>
    );
  }

  if (!repertorio) {
    // Nessuno stato di caricamento è nell'artboard: la testata basta finché i dati non arrivano.
    return <Cornice />;
  }

  if (repertorio.piatti.length === 0) {
    return <VuotoPiatti />;
  }

  const areaPerIngrediente = new Map(repertorio.ingredienti.map((i) => [i.id, i.area]));
  const nomeSlot = new Map(repertorio.slotDefs.map((s) => [s.id, s.nome]));

  const opzioni = [
    { id: TUTTI, label: TUTTI },
    ...repertorio.slotDefs.map((s) => ({ id: s.id, label: s.nome })),
  ];

  const mostrati = (
    filtro === TUTTI ? repertorio.piatti : repertorio.piatti.filter((p) => p.slotDefId === filtro)
  ).filter((p) => normalizza(p.nome).includes(normalizza(ricerca)));

  return (
    <Cornice>
      {/* Campo di ricerca sopra i filtri */}
      <div style={{ padding: '8px 16px 10px' }}>
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca un piatto"
          aria-label="Cerca un piatto"
          style={{
            width: '100%', height: 44, padding: '0 14px',
            borderRadius: 14, border: '1px solid var(--bordo)',
            background: 'var(--fondo)', color: 'var(--ink)',
            fontSize: 15, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      {/* Bottom ridotto a 6px (era 12): il bottone di Segmento è ora alto 44px invece di
          38 (area di tap, non disegno) — si compensano i +6px per non spostare il resto
          della schermata rispetto all'artboard. */}
      <div className="sc" style={{ padding: '0 16px 6px', overflowX: 'auto' }}>
        <Segmento opzioni={opzioni} valore={filtro} onCambia={setFiltro} />
      </div>

      <div
        className="sc"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '2px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        {mostrati.map((piatto) => (
          <SchedaPiatto
            key={piatto.id}
            piatto={piatto}
            nomeSlot={nomeSlot.get(piatto.slotDefId) ?? ''}
            aree={areeDelPiatto(piatto, areaPerIngrediente, repertorio.ordineAree)}
          />
        ))}
        {mostrati.length === 0 && (
          <div style={{ padding: '44px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              Nessun piatto qui
            </div>
            <div style={{ fontSize: 14, color: 'var(--sec)' }}>Cambia filtro, oppure aggiungine uno.</div>
          </div>
        )}
      </div>

      <div style={{ padding: '4px 16px 0' }}>
        <Link
          href="/piatti/nuovo"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: 54, borderRadius: 18,
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            background: 'var(--ink)', color: '#FFFFFF',
          }}
        >
          + NUOVO PIATTO
        </Link>
      </div>
    </Cornice>
  );
}

/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre. */
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Piatti" aree={[]} />
      {children}
    </div>
  );
}

/** Le aree distinte presenti negli ingredienti del piatto, nell'ordine impostato dall'utente. */
function areeDelPiatto(
  piatto: Dish,
  areaPerIngrediente: Map<string, AreaId>,
  ordineAree: AreaId[],
): AreaId[] {
  const presenti = new Set(
    piatto.ingredienti
      .map((i) => areaPerIngrediente.get(i.ingredientId))
      .filter((a): a is AreaId => a !== undefined),
  );
  return ordineAree.filter((a) => presenti.has(a));
}

interface PropsScheda {
  piatto: Dish;
  nomeSlot: string;
  aree: AreaId[];
}

function SchedaPiatto({ piatto, nomeSlot, aree }: PropsScheda) {
  return (
    <Link
      href={`/piatti/${piatto.id}`}
      style={{
        width: '100%', background: 'var(--superficie)', borderRadius: 20, border: '1px solid var(--bordo)',
        padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span
          style={{
            fontSize: 19, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--ink)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {piatto.nome}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--ink)',
              border: '1px solid rgba(20,22,58,0.18)', borderRadius: 999, padding: '4px 8px',
            }}
          >
            {nomeSlot}
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {aree.map((a) => (
              <span
                key={a}
                data-area={a}
                style={{ width: 8, height: 8, borderRadius: 2.6, display: 'inline-block', background: coloreArea(a) }}
              />
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.09em', color: 'var(--ter)' }}>
            {piatto.ingredienti.length} INGR. · {FONTE_LABEL[piatto.fonte]}
          </span>
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--ter)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
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
function VuotoPiatti() {
  return (
    <Cornice>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px' }}>
        <div
          style={{
            fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2,
            color: 'var(--ink)', margin: '8px 6px 6px',
          }}
        >
          Da dove partiamo?
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--sec)', margin: '0 6px 16px' }}>
          Spesa costruisce la lista dai piatti che mangi. Ce li dici una volta sola, in uno di questi due modi.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Porta
            titolo="Ho una dieta"
            testo="Fotografa le pagine del piano che ti hanno dato: piatti e grammature li legge l'app, tu controlli e confermi."
            azione="IMPORTA LA DIETA"
            href="/importa"
          />
          <Porta
            titolo="Cucino sempre le stesse cose"
            testo="Scrivi otto o dieci piatti che fai davvero, con gli ingredienti e quanto ne usi. Da lì la settimana gira da sola."
            azione="SCRIVI I MIEI PIATTI"
            href="/piatti/veloce"
          />
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

interface PropsPorta {
  titolo: string;
  testo: string;
  azione: string;
  href: string;
}

/** Una delle due porte: scheda bianca con titolo, spiegazione e il proprio bottone pieno. */
function Porta({ titolo, testo, azione, href }: PropsPorta) {
  return (
    <div
      style={{
        padding: '20px 18px 18px', borderRadius: 22,
        background: 'var(--superficie)', border: '1px solid var(--bordo)',
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--ink)' }}>
        {titolo}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--sec)', margin: '6px 0 16px' }}>{testo}</div>
      <Link
        href={href}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: 54, borderRadius: 18,
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
          background: 'var(--ink)', color: '#FFFFFF',
          boxShadow: '0 3px 10px rgba(20,22,58,0.24)',
        }}
      >
        {azione}
      </Link>
    </div>
  );
}
