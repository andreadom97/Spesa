'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import type { Ingredient } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';
import { leggiIngredienti } from '@/data/repertorio';
import { usePannello } from './PannelloProvider';
import { useDatiPannello } from './DatiPannello';
import { salvaScrollPannello } from './indirizzi';
import { Carico, ErroreCaricamento, Nota, STILE_BLOCCO } from './pezzi';

const CLASSE: Record<Ingredient['classeResiduo'], string> = {
  porzionabile: 'PORZIONABILE',
  intero: 'INTERO',
  stima: 'A STIMA',
};

const NOTA_INGREDIENTI = 'Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.';
const ERRORE_INGREDIENTI = 'Non riusciamo a caricare gli ingredienti. Riprova più tardi.';

/** `{formato} {UNITÀ} · {PORZIONABILE|INTERO|A STIMA}[ · FRESCO]` (§C.4). */
export function dettaglioIngrediente(i: Ingredient): string {
  return `${i.formatoConfezione} ${i.unitaBase.toUpperCase()} · ${CLASSE[i.classeResiduo]}${i.deperibile ? ' · FRESCO' : ''}`;
}

/** Lo scorrimento del corpo del pannello: il primo antenato della riga che scorre. */
function scorrimentoDi(el: HTMLElement): number {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if (y === 'auto' || y === 'scroll') return p.scrollTop;
  }
  return 0;
}

/**
 * Ingredienti (§C.4, frame 11): un Blocco per area, nell'ordine dell'utente,
 * e le aree vuote non si mostrano. Il tocco su una riga salva l'origine e lo
 * scorrimento (§A.5) e apre l'editor, che è una pagina piena (§F): al ritorno
 * il pannello riapre qui, alla stessa altezza.
 *
 * L'ordine delle aree viene dal provider (`DatiPannello.impostazioni.ordineAree`);
 * gli ingredienti si leggono da sé: `CARICO…` finché manca l'uno o gli altri.
 */
export function Ingredienti() {
  const { vaiA } = usePannello();
  const { stato } = useDatiPannello();
  const pathname = usePathname();
  const [ingredienti, setIngredienti] = useState<Ingredient[] | null>(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    let vivo = true;
    leggiIngredienti()
      .then((lista) => {
        if (vivo) setIngredienti(lista);
      })
      .catch((e) => {
        console.error('pannello/ingredienti: caricamento fallito.', e);
        if (vivo) setErrore(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (errore || stato.stato === 'errore') return <ErroreCaricamento testo={ERRORE_INGREDIENTI} />;
  if (!ingredienti || stato.stato === 'carico') return <Carico />;

  if (ingredienti.length === 0) {
    return (
      <section style={{ ...STILE_BLOCCO, borderRadius: 22, padding: '26px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
        <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 14, border: '2px dashed var(--bordo-tratteggio)' }} />
        <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--ink)' }}>Nessun ingrediente</h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)', maxWidth: '30ch' }}>
          Nascono dai piatti: il primo che aggiungi a un piatto compare qui.
        </p>
      </section>
    );
  }

  function apri(ing: Ingredient, e: MouseEvent<HTMLButtonElement>) {
    salvaScrollPannello('ingredienti', scorrimentoDi(e.currentTarget));
    vaiA(`/piatti/nuovo/ingredienti/${ing.id}?torna=impostazioni`, { pathname, sotto: 'ingredienti' });
  }

  const perArea = stato.dati.impostazioni.ordineAree
    .map((area) => ({
      area,
      voci: ingredienti.filter((i) => i.area === area).sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    }))
    .filter((g) => g.voci.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Nota>{NOTA_INGREDIENTI}</Nota>
      {perArea.map(({ area, voci }) => (
        <section key={area} aria-label={nomeArea(area)} style={{ ...STILE_BLOCCO, padding: '12px 12px 6px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: 0, padding: '0 4px 6px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: coloreArea(area) }} />
            {nomeArea(area)}
          </h3>
          {voci.map((ing, i) => (
            <button
              key={ing.id}
              type="button"
              aria-label={`Apri ${ing.nome}`}
              onClick={(e) => apri(ing, e)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, width: '100%', boxSizing: 'border-box',
                border: 0, borderTop: i > 0 ? '1px solid var(--bordo)' : 0, background: 'none', padding: '8px 4px',
                textAlign: 'left', font: 'inherit', color: 'var(--ink)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ing.nome}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--testo-2)' }}>
                  {dettaglioIngrediente(ing)}
                </span>
              </span>
              {/* Il chevron: il frame 11 non lo disegna, le sue Misure sì («chevron», «finale 1 senza
                  valore»). Coerente con la Riga di impostazione, che lo mette sempre sul finale «valore». */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
                <path d="M9 5l7 7-7 7" stroke="var(--icona-spenta)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
