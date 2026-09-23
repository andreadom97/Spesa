import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StrisciaGiorni } from '../StrisciaGiorni';

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

    // Il gap dei pallini è il solo numero della fase 2 non preso dai file di
    // disegno: la riduzione a 2 esiste per una misura (a sei pasti il 3 sta
    // dentro per 0,71 px per lato a 375), quindi la soglia va fissata da un
    // test, non dalla memoria di chi l'ha scritta.
    it('a cinque pasti il gap dei pallini resta il 3 del file di disegno', () => {
      const cinque = Array.from({ length: 5 }, (_, i) => ({ id: `def-${i}`, nome: `Pasto ${i}`, posizione: i }));
      render(<StrisciaGiorni {...props} slotDefs={cinque as typeof props.slotDefs} />);
      const fila = screen.getAllByRole('button')[0].querySelector('[data-pallino]')!.parentElement!;
      expect(fila.style.gap).toBe('3px');
    });

    it('a sei pasti il gap dei pallini scende a 2: è il caso misurato che sbordava', () => {
      const sei = Array.from({ length: 6 }, (_, i) => ({ id: `def-${i}`, nome: `Pasto ${i}`, posizione: i }));
      render(<StrisciaGiorni {...props} slotDefs={sei as typeof props.slotDefs} />);
      const fila = screen.getAllByRole('button')[0].querySelector('[data-pallino]')!.parentElement!;
      expect(fila.style.gap).toBe('2px');
    });
  });
});
