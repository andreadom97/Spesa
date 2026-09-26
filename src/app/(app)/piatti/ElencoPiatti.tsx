'use client';

import { useState } from 'react';
import type { AreaId, Dish, Ingredient } from '@/domain/types';
import { areeDelPiatto, cercaPiatti } from '@/domain/ricerca-piatti';
import { AggiungiTratteggiato } from '@/components/AggiungiTratteggiato';
import { CampoRicercaPiatti } from '@/components/CampoRicercaPiatti';
import { RigaPiatto } from '@/components/RigaPiatto';
import { VuotoRicercaPiatti } from '@/components/VuotoRicercaPiatti';

interface Props {
  piatti: Dish[];
  ingredienti: Ingredient[];
  ordineAree: AreaId[];
}

/**
 * Il corpo di Piatti a repertorio pieno (spec fase 3 §A–§C): il campo di
 * ricerca fermo in alto, e sotto lo scroller con l'aggiungi tratteggiato in
 * cima, le righe piatto e, se la ricerca non trova niente, il vuoto di
 * ricerca. Niente dati: li carica la pagina. Un file a sé, e non dentro
 * `page.tsx`, perché la sonda del browser lo possa montare con dati finti.
 *
 * Dalla fase 7 (§A.3) il campo, la riga, l'aggiungi e il vuoto di ricerca sono
 * pezzi condivisi con Scegli (`CampoRicercaPiatti`, `RigaPiatto`,
 * `AggiungiTratteggiato`, `VuotoRicercaPiatti`): qui `RigaPiatto` è in modo
 * 'apri', e la resa è identica a prima della condivisione.
 */
export function ElencoPiatti({ piatti, ingredienti, ordineAree }: Props) {
  const [ricerca, setRicerca] = useState('');
  const areaPerIngrediente = new Map(ingredienti.map((i) => [i.id, i.area]));
  const mostrati = cercaPiatti(piatti, ingredienti, ricerca);

  return (
    <>
      {/* Fuori dallo scroller: resta fermo mentre la lista scorre, e con la
          tastiera aperta si vede cosa si sta scrivendo (spec §A, §M.3). */}
      <CampoRicercaPiatti valore={ricerca} onCambia={setRicerca} />

      <div
        className="sc scroll-app"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '2px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <AggiungiTratteggiato etichetta="Nuovo piatto" href="/piatti/nuovo" />

        {mostrati.map((piatto) => (
          <RigaPiatto
            key={piatto.id}
            modo="apri"
            href={`/piatti/${piatto.id}`}
            piatto={piatto}
            aree={areeDelPiatto(piatto, areaPerIngrediente, ordineAree)}
          />
        ))}

        {mostrati.length === 0 && <VuotoRicercaPiatti />}
      </div>
    </>
  );
}
