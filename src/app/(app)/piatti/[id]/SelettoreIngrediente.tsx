'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Ingredient } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { Etichetta } from '@/components/controlli';

/**
 * Sopra questa soglia compare la ricerca. Niente autoFocus: su un telefono
 * aprirebbe la tastiera addosso alla lista, e chi vuole solo scorrere si
 * troverebbe metà schermo occupato senza averlo chiesto. Compare solo quando
 * la lista è abbastanza lunga da rendere lo scorrimento peggiore della
 * digitazione.
 */
const SOGLIA_RICERCA = 8;

/**
 * Confronto tollerante agli accenti: chi cerca "caffe" deve trovare "Caffè",
 * perché sulla tastiera del telefono l'accento costa un tocco in più e
 * nessuno lo mette per cercare. Non è la `normalizza` di
 * `@/domain/import/mapping`, che comprime anche gli spazi interni: questa è
 * quella di oggi dell'editor, spostata identica.
 */
function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export interface PropsSelettoreIngrediente {
  /**
   * Gli ingredienti che si possono ancora aggiungere: il catalogo meno quelli
   * già nella lista di destinazione. Li filtra la pagina, che sa se il
   * selettore è aperto sugli ingredienti del piatto o su un'opzione.
   */
  ingredienti: Ingredient[];
  /** Il tocco su una voce: la pagina aggiunge la riga e chiude il selettore. */
  onScegli: (ingrediente: Ingredient) => void;
  /** La X e il velo: chiude senza aggiungere. */
  onChiudi: () => void;
  /** Dove si crea un ingrediente nuovo: `/piatti/{id}/ingredienti/nuovo`. */
  hrefNuovo: string;
  /** Chiamata prima di seguire `hrefNuovo`: mette al riparo la bozza del piatto, che vive solo in memoria. */
  onPrimaDiCreare: () => void;
}

/**
 * Il selettore degli ingredienti dell'editor del Piatto, in un Foglio dal
 * basso (spec fase 7 §B.4, DESIGN.md §8). Prima era un foglio scritto a mano
 * dentro la pagina; il comportamento è lo stesso: la ricerca solo con la
 * lista lunga, il filtro senza accenti dentro il nome, il vuoto che propone di
 * creare, il link alla creazione con la bozza messa al riparo.
 *
 * La ricerca vive qui e non nella pagina: la pagina monta il selettore solo
 * quando è aperto, quindi chiuderlo (o aggiungere un ingrediente) la azzera, e
 * riaprendolo si riparte dall'elenco intero, come prima.
 */
export function SelettoreIngrediente({ ingredienti, onScegli, onChiudi, hrefNuovo, onPrimaDiCreare }: PropsSelettoreIngrediente) {
  const [ricerca, setRicerca] = useState('');
  // La ricerca cerca dentro il nome, non solo all'inizio: "pomo" trova sia
  // "Pomodori" sia "Passata di pomodoro".
  const disponibili = ricerca.trim()
    ? ingredienti.filter((i) => normalizza(i.nome).includes(normalizza(ricerca)))
    : ingredienti;

  return (
    <FoglioDalBasso etichetta="Aggiungi ingrediente" onChiudi={onChiudi}>
      <TestataFoglio onChiudi={onChiudi}>
        <Etichetta>AGGIUNGI INGREDIENTE</Etichetta>
      </TestataFoglio>

      {/* Fuori dallo scroller: resta ferma mentre la lista scorre. */}
      {ingredienti.length > SOGLIA_RICERCA && (
        <div style={{ padding: '12px 16px 0' }}>
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca"
            aria-label="Cerca un ingrediente"
            style={{
              display: 'block', width: '100%', height: 44, boxSizing: 'border-box', padding: '0 14px',
              borderRadius: 14, border: '1px solid var(--bordo)', background: 'var(--superficie)',
              boxShadow: 'var(--ombra-pannello)', fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)', outline: 'none',
            }}
          />
        </div>
      )}

      <div
        className="sc corpo-foglio"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 26px', display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        {disponibili.length === 0 && (
          <p style={{ margin: 0, padding: '8px 6px', fontSize: 13, lineHeight: 1.45, color: 'var(--testo-2)' }}>
            {ricerca.trim()
              ? `Nessun ingrediente per "${ricerca.trim()}". Puoi crearlo qui sotto.`
              : 'Hai già aggiunto tutti gli ingredienti del repertorio.'}
          </p>
        )}
        {disponibili.map((ing) => (
          <button
            key={ing.id}
            type="button"
            onClick={() => onScegli(ing)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 6px', minHeight: 44, borderRadius: 14 }}
          >
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2.6, flex: 'none', background: coloreArea(ing.area) }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{ing.nome}</span>
          </button>
        ))}
        {/* Disponibile anche aprendo il selettore da un'opzione: `onPrimaDiCreare`
            mette al riparo anche `componenti` (vedi BozzaPiatto in bozza.ts), quindi
            il viaggio verso la creazione dell'ingrediente e ritorno non perde le
            modifiche fatte ai componenti fino a quel momento. */}
        <Link
          href={hrefNuovo}
          onClick={onPrimaDiCreare}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 6px', minHeight: 44, textDecoration: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)' }}>
            NUOVO INGREDIENTE
          </span>
        </Link>
      </div>
    </FoglioDalBasso>
  );
}
