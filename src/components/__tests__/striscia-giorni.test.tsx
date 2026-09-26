import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StrisciaGiorni, posizionePallino, righePallini } from '../StrisciaGiorni';
import type { MealSlot, MealSlotDef } from '@/domain/types';

// Sette giorni fissi con oggi l'ultimo (domenica): condivisa fra il caso
// storico e i casi della fase 2, così non si ridigita la stessa settimana.
const props = {
  giorni: ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'],
  slotDefs: [],
  slots: [],
  oggi: '2026-08-30',
  selezionato: 6,
  onSeleziona: () => {},
};

describe('StrisciaGiorni', () => {
  it('ogni giorno ha nome accessibile con giorno esteso, numero, parola temporale, pasti a casa e stato', () => {
    render(<StrisciaGiorni {...props} />);
    // Fase 2: l'etichetta non è più solo "giorno numero[, selezionato]", porta
    // anche la parola temporale (quando c'è) e il conteggio dei pasti a casa.
    expect(screen.getByRole('button', { name: 'Domenica 30, oggi, 0 pasti a casa, selezionato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lunedì 24, 0 pasti a casa' })).toBeInTheDocument();
  });

  describe('i quattro stati e l\'etichetta (fase 2)', () => {
    it('tutte e sette le celle hanno lo stesso bordo: lo stato non cambia l\'ingombro', () => {
      render(<StrisciaGiorni {...props} />);
      const bordi = screen.getAllByRole('button').map((b) => b.style.border);
      expect(new Set(bordi).size).toBe(1);
    });

    it('oggi porta un inset 3px anche quando il giorno scelto è un altro', () => {
      render(<StrisciaGiorni {...props} selezionato={0} />);
      const celle = screen.getAllByRole('button');
      const cellaOggi = celle.find((c) => c.dataset.oggi === 'true')!;
      expect(cellaOggi.style.boxShadow).toContain('inset 0 0 0 3px');
    });

    it('oggi e selezionato insieme: fondo pieno più i due inset', () => {
      const iOggi = props.giorni.indexOf(props.oggi);
      render(<StrisciaGiorni {...props} selezionato={iOggi} />);
      const cella = screen.getAllByRole('button')[iOggi];
      expect(cella.style.boxShadow).toContain('inset 0 0 0 3px #FFFFFF');
      expect(cella.style.boxShadow).toContain('inset 0 0 0 4.5px');
    });

    it('l\'etichetta dice giorno, parola temporale, pasti a casa e selezione', () => {
      const iOggi = props.giorni.indexOf(props.oggi);
      render(<StrisciaGiorni {...props} selezionato={iOggi} />);
      // Il numero di pasti a casa dipende dalle fixture del file: si asserisce la forma.
      expect(screen.getAllByRole('button')[iOggi].getAttribute('aria-label'))
        .toMatch(/^\w+ \d+, oggi, \d+ past[oi] a casa, selezionato$/);
    });

    it('i giorni lontani non hanno la parola temporale', () => {
      render(<StrisciaGiorni {...props} />);
      // "Lontano" esclude oggi e i suoi due vicini: parolaTemporale dà un
      // nome anche a ieri e domani (v. src/domain/settimana-label.ts), quindi
      // filtrare solo la cella di oggi lascerebbe dentro "ieri" o "domani" e
      // farebbe fallire l'asserzione anche a implementazione corretta.
      const iOggi = props.giorni.indexOf(props.oggi);
      const lontani = screen.getAllByRole('button')
        .filter((_, i) => Math.abs(i - iOggi) > 1)
        .map((b) => b.getAttribute('aria-label') ?? '');
      expect(lontani.some((l) => /, (oggi|ieri|domani),/.test(l))).toBe(false);
    });

    it('con sei pasti disegna sei pallini per cella', () => {
      const sei = Array.from({ length: 6 }, (_, i) => ({ id: `def-${i}`, nome: `Pasto ${i}`, posizione: i }));
      render(<StrisciaGiorni {...props} slotDefs={sei as typeof props.slotDefs} />);
      expect(screen.getAllByRole('button')[0].querySelectorAll('[data-pallino]')).toHaveLength(6);
    });
  });
});

function pasti(n: number): MealSlotDef[] {
  return Array.from({ length: n }, (_, i) => ({ id: `def-${i}`, nome: `Pasto ${i}`, posizione: i, assenzeAbituali: Array(7).fill(false) }));
}

/** Un pasto a casa con un piatto, il giorno `data`: il suo pallino è pieno. */
function pieno(data: string, slotDefId: string): MealSlot {
  return { id: `${data}-${slotDefId}`, data, slotDefId, stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false };
}

const pallini = (cella: HTMLElement) => [...cella.querySelectorAll<HTMLElement>('[data-pallino]')];
const griglia = (cella: HTMLElement) => cella.querySelector<HTMLElement>('[data-pallino]')!.parentElement!;

describe('la griglia dei pallini (spec fase 5 §H)', () => {
  it('posizionePallino: tre colonne, riga e colonna da 1, la prima riga sempre piena', () => {
    expect([0, 1, 2, 3, 4, 5].map(posizionePallino)).toEqual([
      { riga: 1, colonna: 1 }, { riga: 1, colonna: 2 }, { riga: 1, colonna: 3 },
      { riga: 2, colonna: 1 }, { riga: 2, colonna: 2 }, { riga: 2, colonna: 3 },
    ]);
  });

  it('righePallini: una riga fino a tre pasti, due da quattro a sei', () => {
    expect([1, 2, 3, 4, 5, 6].map(righePallini)).toEqual([1, 1, 1, 2, 2, 2]);
  });

  it.each([3, 4, 6])('con %i pasti la griglia è a tre colonne da 5 col gap 3', (n) => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(n)} />);
    const g = griglia(screen.getAllByRole('button')[0]);
    expect(g.style.display).toBe('grid');
    expect(g.style.gridTemplateColumns).toBe('repeat(3, 5px)');
    expect(g.style.gap).toBe('3px');
    expect(g).toHaveAttribute('aria-hidden', 'true');
  });

  it('con tre pasti una riga sola', () => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(3)} />);
    expect(pallini(screen.getAllByRole('button')[0]).map((p) => p.style.gridRow)).toEqual(['1', '1', '1']);
  });

  it('con quattro pasti la prima riga è piena e il quarto va a capo, in prima colonna', () => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(4)} />);
    const p = pallini(screen.getAllByRole('button')[0]);
    expect(p.map((x) => x.style.gridRow)).toEqual(['1', '1', '1', '2']);
    expect(p[3].style.gridColumn).toBe('1');
  });

  it('a sei pasti due righe da tre', () => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(6)} />);
    const p = pallini(screen.getAllByRole('button')[0]);
    expect(p).toHaveLength(6);
    expect(p.map((x) => x.style.gridRow)).toEqual(['1', '1', '1', '2', '2', '2']);
  });

  it('i colori: pieno in --ink, vuoto a contorno 0,20; sul giorno selezionato bianco e contorno bianco 0,62', () => {
    const lun = props.giorni[0];
    // Selezionato il lunedì (indice 0), di confronto il martedì (indice 1): lo stesso pasto pieno in entrambi.
    const slots = [pieno(lun, 'def-0'), pieno(props.giorni[1], 'def-0')];
    render(<StrisciaGiorni {...props} slotDefs={pasti(3)} slots={slots} selezionato={0} />);
    const [sel, altro] = screen.getAllByRole('button');

    const [pienoAltro, vuotoAltro] = pallini(altro);
    expect(pienoAltro.style.backgroundColor).toBe('var(--ink)');
    expect(['0', '0px']).toContain(pienoAltro.style.borderWidth);
    expect(vuotoAltro.style.backgroundColor).toBe('transparent');
    expect(vuotoAltro.style.borderWidth).toBe('1px');
    expect(vuotoAltro.style.borderColor).toBe('var(--bordo-tratteggio)');

    const [pienoSel, vuotoSel] = pallini(sel);
    expect(pienoSel.style.backgroundColor).toBe('var(--superficie)');
    expect(vuotoSel.style.backgroundColor).toBe('transparent');
    expect(vuotoSel.style.borderColor).toBe('var(--banda-bordo)');
  });

  it('i pallini sono tutti da 5 con box-sizing border-box: il contorno non li ingrandisce', () => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(6)} />);
    for (const p of pallini(screen.getAllByRole('button')[0])) {
      expect(p.style.width).toBe('5px');
      expect(p.style.height).toBe('5px');
      expect(p.style.boxSizing).toBe('border-box');
    }
  });

  it('l\'aria-label del giorno conta ancora i pasti a casa, a sei pasti', () => {
    const lun = props.giorni[0];
    render(<StrisciaGiorni {...props} slotDefs={pasti(6)} slots={[pieno(lun, 'def-0'), pieno(lun, 'def-4')]} selezionato={6} />);
    expect(screen.getByRole('button', { name: 'Lunedì 24, 2 pasti a casa' })).toBeInTheDocument();
  });
});
