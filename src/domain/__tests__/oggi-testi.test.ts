import { describe, it, expect } from 'vitest';
import type { MealSlot } from '../types';
import {
  nomeGiorno, etichettaPoster, etichettaPoi, sottotitoloPoster, etichettaUso, testoScongela,
  pillolaPronti, dataLunga, testoDispensaFerma,
} from '../oggi-testi';

const OGGI = '2026-10-03'; // sabato
const slot = (extra: Partial<MealSlot> = {}): MealSlot => ({
  id: 's', data: OGGI, slotDefId: 'cen', stato: 'casa', dishId: 'd', fonteStato: 'default',
  scelte: {}, porzioniPreparate: 0, daPronti: false, ...extra,
});

describe('testi di Oggi (spec §H)', () => {
  it('il giorno e le etichette', () => {
    expect(nomeGiorno(OGGI)).toBe('Sabato');
    expect(nomeGiorno('2026-10-05')).toBe('Lunedì');
    expect(etichettaPoster('oggi', OGGI, 'Cena')).toBe('Sabato · Cena');
    expect(etichettaPoster('domani', '2026-10-04', 'Colazione')).toBe('Domani · Colazione');
    expect(etichettaPoi('oggi', 'Dopocena')).toBe('Poi · Dopocena');
    expect(etichettaPoi('domani', 'Colazione')).toBe('Domani · Colazione');
  });
  it('il sottotitolo del poster dice solo le cose vere', () => {
    expect(sottotitoloPoster(slot(), 1)).toBeNull();
    expect(sottotitoloPoster(slot(), 2)).toBe('Per 2');
    expect(sottotitoloPoster(slot({ porzioniPreparate: 2 }), 2)).toBe('Per 2 · Cucina 2 in più');
    expect(sottotitoloPoster(slot({ daPronti: true }), 1)).toBe('Da una porzione pronta');
  });
  it('l\'uso di un ingrediente che scade', () => {
    expect(etichettaUso({ data: OGGI, nomePasto: 'Cena' }, OGGI)).toBe('Cena di oggi');
    expect(etichettaUso({ data: '2026-10-04', nomePasto: 'Pranzo' }, OGGI)).toBe('Pranzo di domani');
    expect(etichettaUso({ data: '2026-10-05', nomePasto: 'Pranzo' }, OGGI)).toBe('Pranzo di lunedì');
    expect(etichettaUso(null, OGGI)).toBe('Nessun pasto lo usa');
  });
  it('scongela, Pronti, date', () => {
    expect(testoScongela('Cena')).toBe('Per cena di domani');
    expect(pillolaPronti(1)).toBe('1 pronto');
    expect(pillolaPronti(3)).toBe('3 pronti');
    expect(dataLunga('2026-08-28')).toBe('28 agosto');
  });
  it('la tessera della dispensa ferma, nei due testi', () => {
    expect(testoDispensaFerma('2026-08-28')).toEqual({
      forte: 'La dispensa è ferma al 28 agosto',
      resto: ', l\'ultima spesa chiusa nell\'app. Chiudi la prossima, e qui compaiono le proposte con quello che hai e le cose che scadono.',
    });
    expect(testoDispensaFerma(null)).toEqual({
      forte: null,
      resto: 'Chiudi la prima spesa nell\'app, e qui compaiono le proposte con quello che hai e le cose che scadono.',
    });
  });
});
