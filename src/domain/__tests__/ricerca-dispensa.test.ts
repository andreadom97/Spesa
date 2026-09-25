import { describe, it, expect } from 'vitest';
import type { Ingredient, LottoPronto } from '../types';
import type { VoceDispensa } from '../dispensa-vista';
import {
  cercaInDispensa, etichettaRisultati, nomeGiaUsato, predefinitiNuovo, raggruppaPerArea, vociInPagina,
} from '../ricerca-dispensa';

function ing(id: string, nome: string, area: Ingredient['area']): Ingredient {
  return { id, nome, unitaBase: 'g', area, classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500, prezzoConfezione: null, ean: null };
}
function voce(i: Ingredient, residuo: number, ultimoAcquisto: string | null = '2026-09-20'): VoceDispensa {
  return { ingrediente: i, residuo, ultimoAcquisto, congelato: false, scadenzaManuale: null };
}
const parmigiano = voce(ing('p', 'Parmigiano', 'latticini'), 200);
const panna = voce(ing('pa', 'Panna', 'latticini'), 0);
const patate = voce(ing('pt', 'Patate', 'ortofrutta'), 1000);
const papaya = voce(ing('py', 'Papaya', 'ortofrutta'), 0, null);
const zucchine = voce(ing('z', 'Zucchine', 'ortofrutta'), 0, null);
const tutte = [parmigiano, panna, patate, papaya, zucchine];
const lotto: LottoPronto = { id: 'l1', dishId: 'd1', porzioni: 4, congelato: false, preparataIl: '2026-09-12', mealSlotId: null };

describe('vociInPagina e raggruppaPerArea', () => {
  it('in pagina restano in casa e finite, non i mai comprati', () => {
    expect(vociInPagina(tutte).map((v) => v.ingrediente.id)).toEqual(['p', 'pa', 'pt']);
  });
  it('le aree seguono l’ordine delle Impostazioni, e dentro vale il nome A–Z', () => {
    const gruppi = raggruppaPerArea(vociInPagina(tutte), ['ortofrutta', 'latticini']);
    expect(gruppi.map((g) => g.area)).toEqual(['ortofrutta', 'latticini']);
    expect(gruppi[1]!.voci.map((v) => v.ingrediente.nome)).toEqual(['Panna', 'Parmigiano']);
  });
  it('un’area che manca dall’ordine finisce in coda, non sparisce', () => {
    expect(raggruppaPerArea(vociInPagina(tutte), ['latticini']).map((g) => g.area)).toEqual(['latticini', 'ortofrutta']);
  });
  it('i mai comprati, fra i risultati, vanno dopo le altre tessere della loro area', () => {
    const gruppi = raggruppaPerArea([papaya, patate], ['ortofrutta']);
    expect(gruppi[0]!.voci.map((v) => v.ingrediente.nome)).toEqual(['Patate', 'Papaya']);
  });
});

describe('cercaInDispensa', () => {
  const nome = () => 'Ragù di lenticchie';
  it('query vuota o di soli spazi: null', () => {
    expect(cercaInDispensa('', tutte, [lotto], nome)).toBeNull();
    expect(cercaInDispensa('   ', tutte, [lotto], nome)).toBeNull();
  });
  it('contiene, senza maiuscole né accenti, mai comprati compresi', () => {
    const r = cercaInDispensa('PA', tutte, [lotto], nome)!;
    expect(r.voci.map((v) => v.ingrediente.id).sort()).toEqual(['p', 'pa', 'pt', 'py'].sort());
    expect(r.totale).toBe(4);
  });
  it('trova i lotti per nome del piatto, anche senza accento', () => {
    const r = cercaInDispensa('ragu', tutte, [lotto], nome)!;
    expect(r.lotti).toEqual([lotto]);
    expect(r.totale).toBe(1);
  });
  it('zero risultati', () => {
    expect(cercaInDispensa('zenzero', tutte, [lotto], nome)!.totale).toBe(0);
  });
  it('etichettaRisultati', () => {
    expect(etichettaRisultati(1)).toBe('1 risultato');
    expect(etichettaRisultati(5)).toBe('5 risultati');
  });
});

describe('Nuovo ingrediente', () => {
  it('un nome degli ingredienti di base porta i suoi default', () => {
    expect(predefinitiNuovo('  banane ')).toEqual({ area: 'ortofrutta', unitaBase: 'pz', deperibile: true });
  });
  it('un nome sconosciuto: nessun reparto, grammi, deperibile da decidere', () => {
    expect(predefinitiNuovo('Zenzero')).toEqual({ area: null, unitaBase: 'g', deperibile: null });
  });
  it('nomeGiaUsato confronta i nomi normalizzati', () => {
    const ingredienti = tutte.map((v) => v.ingrediente);
    expect(nomeGiaUsato('parmigiano ', ingredienti)).toBe(true);
    expect(nomeGiaUsato('Zenzero', ingredienti)).toBe(false);
  });
});
