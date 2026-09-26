'use client';

import { Tessera } from '@/components/Tessera';
import { TesseraIngrediente } from '@/components/TesseraIngrediente';
import { TesseraDispensa } from '../dispensa/TesseraDispensa';
import type { AreaId, Ingredient } from '@/domain/types';

const NOMI: [string, AreaId][] = [
  ['Uova', 'latticini'], ['Pane', 'cereali'], ['Latte', 'latticini'],
  ['Petto di pollo', 'macelleria'], ['Pomodori', 'ortofrutta'],
  ['Passata di pomodoro', 'dispensa'], ['Cioccolato fondente', 'dispensa'],
  ['Macinato di manzo', 'macelleria'], ['Filetto di merluzzo', 'surgelati'],
  ['Minestrone surgelato', 'surgelati'], ['Olio extravergine', 'dispensa'],
];

const nulla = () => {};

function ingrediente(nome: string, area: AreaId): Ingredient {
  return { id: nome, nome, area, unitaBase: 'g', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null };
}

/** Le tre tessere vere, in una colonna larga come il telefono (393 − 2×16). */
export function FoglioTessere() {
  const griglia = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 361, padding: 12, background: '#FFFFFF', borderRadius: 22 } as const;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <div style={griglia}>
        {NOMI.map(([n, a], i) => (
          <Tessera key={n} nome={n} area={a} unita="g" confezioni={1} quantitaTotale={500}
            spuntato={i % 4 === 3} protagonista={i === 0} onToggle={nulla} />
        ))}
      </div>
      <div style={griglia}>
        {NOMI.map(([n, a], i) => (
          <TesseraDispensa key={n} pillola={null} onApri={nulla}
            voce={{ ingrediente: ingrediente(n, a), residuo: i % 3 === 2 ? 0 : 300, ultimoAcquisto: i % 6 === 5 ? null : '2026-09-24', congelato: false, scadenzaManuale: null }} />
        ))}
      </div>
      <div style={griglia}>
        {NOMI.map(([n, a]) => (
          <TesseraIngrediente key={n} nome={n} area={a} quantita={100} unita="g"
            onCambiaQuantita={nulla} onRimuovi={nulla} hrefModifica="#" />
        ))}
      </div>
    </div>
  );
}
