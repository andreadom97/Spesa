import { describe, it, expect } from 'vitest';
import type { Ingredient, LottoPronto } from '../types';
import {
  avvisoVoce, dataBreve, dataCorta, impegnateLotto, dataScadenzaValida, decaduta, eDimenticato, etichettaQuantita,
  maxScadenza, pillolaStato, scadeVicino, statoTessera, stimaNuovaConfezione, type VoceDispensa,
} from '../dispensa-vista';

const pollo: Ingredient = {
  id: 'pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile',
  deperibile: true, formatoConfezione: 300, prezzoConfezione: null, ean: null,
};
const riso: Ingredient = { ...pollo, id: 'riso', nome: 'Riso', area: 'cereali', deperibile: false, formatoConfezione: 1000 };
function voce(p: Partial<VoceDispensa> = {}): VoceDispensa {
  return { ingrediente: pollo, residuo: 600, ultimoAcquisto: '2026-09-24', congelato: false, scadenzaManuale: null, ...p };
}
const OGGI = '2026-09-25';

describe('statoTessera', () => {
  it('in casa, finita, mai comprata', () => {
    expect(statoTessera(voce())).toBe('inCasa');
    expect(statoTessera(voce({ residuo: 0 }))).toBe('finita');
    expect(statoTessera(voce({ residuo: 0, ultimoAcquisto: null }))).toBe('maiComprata');
  });
});

describe('pillolaStato, con la precedenza della v1', () => {
  it('niente pillola su una tessera a zero', () => {
    expect(pillolaStato(voce({ residuo: 0 }), OGGI, true)).toBeNull();
  });
  it('«dimenticato» vince su tutto', () => {
    expect(pillolaStato(voce(), OGGI, true)).toEqual({ testo: 'NESSUN PASTO LO USA', tono: 'avviso' });
  });
  it('poi la scadenza: oggi, o gg/mm', () => {
    expect(pillolaStato(voce({ ultimoAcquisto: '2026-09-22' }), OGGI, false)).toEqual({ testo: 'Scade oggi', tono: 'avviso' });
    expect(pillolaStato(voce(), OGGI, false)).toEqual({ testo: 'Scade il 27/09', tono: 'avviso' });
  });
  it('la scadenza è quella effettiva, con la data a mano', () => {
    expect(pillolaStato(voce({ scadenzaManuale: '2026-10-02' }), OGGI, false)).toEqual({ testo: 'Scade il 02/10', tono: 'avviso' });
  });
  it('poi «decaduto»', () => {
    expect(pillolaStato(voce({ ultimoAcquisto: '2026-09-10' }), OGGI, false)).toEqual({ testo: 'FORSE NON PIÙ BUONO', tono: 'avviso' });
  });
  it('poi «Congelato», su chi non ha scadenza', () => {
    // Un deperibile congelato ha una stima (+90 giorni) e mostra quella: la
    // pillola «Congelato» resta a chi non ha stima, qui un residuo dichiarato
    // senza acquisto.
    expect(pillolaStato(voce({ ultimoAcquisto: null, congelato: true }), OGGI, false)).toEqual({ testo: 'Congelato', tono: 'freddo' });
    expect(pillolaStato(voce({ congelato: true }), OGGI, false)).toEqual({ testo: 'Scade il 23/12', tono: 'avviso' });
  });
  it('un non deperibile in casa non ha pillola', () => {
    expect(pillolaStato(voce({ ingrediente: riso }), OGGI, false)).toBeNull();
  });
});

describe('avvisi', () => {
  it('avvisoVoce: dimenticato, decaduto, niente', () => {
    expect(avvisoVoce(voce(), OGGI, true)).toBe('dimenticato');
    expect(avvisoVoce(voce({ ultimoAcquisto: '2026-09-10' }), OGGI, false)).toBe('decaduto');
    expect(avvisoVoce(voce(), OGGI, false)).toBeNull();
    expect(avvisoVoce(voce({ residuo: 0 }), OGGI, true)).toBeNull();
  });
  it('decaduta: residuo > 0 e niente di utilizzabile', () => {
    expect(decaduta(voce({ ultimoAcquisto: '2026-09-10' }), OGGI)).toBe(true);
    expect(decaduta(voce(), OGGI)).toBe(false);
  });
  it('eDimenticato vuole la stessa scadenza, entro domenica, e nessun uso in tempo', () => {
    const avviso = { ingredientId: 'pollo', nome: 'Petto di pollo', scadenza: '2026-09-27', pastiDopo: [], usatoInTempo: false };
    expect(eDimenticato('2026-09-27', avviso, '2026-09-27')).toBe(true);
    expect(eDimenticato('2026-09-27', { ...avviso, usatoInTempo: true }, '2026-09-27')).toBe(false);
    expect(eDimenticato('2026-09-28', avviso, '2026-09-27')).toBe(false);
    expect(eDimenticato(null, avviso, '2026-09-27')).toBe(false);
    expect(eDimenticato('2026-09-27', undefined, '2026-09-27')).toBe(false);
  });
});

describe('etichette e date', () => {
  it('etichettaQuantita: intero, decimale con la virgola, senza separatore delle migliaia', () => {
    expect(etichettaQuantita(600, 'g')).toBe('600 g');
    expect(etichettaQuantita(1250, 'g')).toBe('1250 g');
    expect(etichettaQuantita(1.5, 'pz')).toBe('1,5 pz');
  });
  it('dataCorta e dataBreve', () => {
    expect(dataCorta('2026-09-07')).toBe('07/09');
    expect(dataBreve('2026-09-12')).toBe('12 set');
  });
  it('scadeVicino: oggi o domani', () => {
    expect(scadeVicino('2026-09-25', OGGI)).toBe(true);
    expect(scadeVicino('2026-09-26', OGGI)).toBe(true);
    expect(scadeVicino('2026-09-27', OGGI)).toBe(false);
  });
  it('la data a mano sta fra oggi e due anni', () => {
    expect(maxScadenza(OGGI)).toBe('2028-09-25');
    expect(dataScadenzaValida('2026-09-25', OGGI)).toBe(true);
    expect(dataScadenzaValida('2028-09-25', OGGI)).toBe(true);
    expect(dataScadenzaValida('2026-09-24', OGGI)).toBe(false);
    expect(dataScadenzaValida('2028-09-26', OGGI)).toBe(false);
    expect(dataScadenzaValida('', OGGI)).toBe(false);
  });
  it('stimaNuovaConfezione: oggi + soglia, null per chi non scade', () => {
    expect(stimaNuovaConfezione(pollo, false, OGGI)).toBe('2026-09-28');
    expect(stimaNuovaConfezione(pollo, true, OGGI)).toBe('2026-12-24');
    expect(stimaNuovaConfezione(riso, false, OGGI)).toBeNull();
  });
});

describe('impegnateLotto', () => {
  function lotto(id: string, porzioni: number, dishId = 'd-ragu'): LottoPronto {
    return { id, dishId, porzioni, congelato: false, preparataIl: OGGI, mealSlotId: null };
  }

  it('un lotto solo: gli impegni del piatto, al massimo le sue porzioni', () => {
    const a = lotto('a', 4);
    expect(impegnateLotto(a, [a], 0)).toBe(0);
    expect(impegnateLotto(a, [a], 2)).toBe(2);
    expect(impegnateLotto(a, [a], 6)).toBe(4);
    // Un lotto di un altro piatto non copre niente.
    expect(impegnateLotto(a, [a, lotto('x', 5, 'd-altro')], 2)).toBe(2);
  });

  it('due lotti, impegni che stanno nell\'altro: nessuno dei due è impegnato', () => {
    const a = lotto('a', 3);
    const b = lotto('b', 2);
    expect(impegnateLotto(a, [a, b], 2)).toBe(0);
    expect(impegnateLotto(b, [a, b], 2)).toBe(0);
  });

  it('due lotti, impegni che li superano: ciascuno porta quello che l\'altro non copre', () => {
    const a = lotto('a', 3);
    const b = lotto('b', 2);
    expect(impegnateLotto(a, [a, b], 4)).toBe(2);
    expect(impegnateLotto(b, [a, b], 4)).toBe(1);
    expect(impegnateLotto(a, [a, b], 6)).toBe(3);
    expect(impegnateLotto(b, [a, b], 6)).toBe(2);
  });
});
