import { describe, it, expect } from 'vitest';
import type { Ingredient, MealSlotDef } from '@/domain/types';
import { normalizza, abbina, proponiSlot, ingredientiDaAbbinare } from '../mapping';
import { proponi } from '../formati-tipici';
import { PIANO_MENU_SETTIMANALE } from '../fixtures';

const ing = (nome: string, unitaBase: Ingredient['unitaBase'] = 'g'): Ingredient => ({
  id: `i-${normalizza(nome)}`, nome, unitaBase, area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500,
});

describe('normalizza', () => {
  it('minuscole, senza accenti, spazi collassati', () => {
    expect(normalizza('  Caffè   d\'Orzo ')).toBe("caffe d'orzo");
  });
});

describe('abbina', () => {
  it('match esatto sul nome normalizzato', () => {
    const riso = ing('Riso');
    expect(abbina('riso', 'g', [riso, ing('Riso venere')])).toBe(riso);
  });
  it('match per inclusione, preferendo il nome più corto', () => {
    const avena = ing("Fiocchi d'avena");
    expect(abbina("fiocchi d'avena", 'g', [ing("Fiocchi d'avena integrali bio"), avena])).toBe(avena);
  });
  it('unità incompatibile rompe il match: mai una conversione inventata', () => {
    expect(abbina('latte', 'ml', [ing('Latte', 'g')])).toBeNull();
  });
  it('unita null (quantità irrisolta) abbina solo per nome', () => {
    const olive = ing('Olive taggiasche', 'pz');
    expect(abbina('olive taggiasche', null, [olive])).toBe(olive);
  });
  it('nessun fuzzy: "pollo" non abbina "petto di tacchino"', () => {
    expect(abbina('pollo', 'g', [ing('Petto di tacchino')])).toBeNull();
  });
});

describe('proponi', () => {
  it('un alimento in tabella eredita i suoi default', () => {
    const p = proponi('pasta di semola', 'g');
    expect(p.formatoConfezione).toBe(500);
    expect(p.area).toBe('cereali');
    expect(p.alimento).toBe('pasta di semola');
  });
  it('fuori tabella: fallback prudente dispensa/stima/500', () => {
    const p = proponi('alchermes', 'ml');
    expect(p).toMatchObject({ area: 'dispensa', classeResiduo: 'stima', formatoConfezione: 500, unitaBase: 'ml' });
  });
  it('senza unità estratta il fallback è in grammi', () => {
    expect(proponi('cosa ignota', null).unitaBase).toBe('g');
  });
});

describe('proponiSlot', () => {
  const slot = (id: string, nome: string): MealSlotDef => ({ id, nome, posizione: 0, assenzeAbituali: Array(7).fill(false) });
  const defs = [slot('s1', 'Colazione'), slot('s2', 'Spuntino mattina'), slot('s3', 'Pranzo'), slot('s4', 'Cena')];
  it('match diretto e sinonimi', () => {
    expect(proponiSlot('colazione', defs)).toBe('s1');
    expect(proponiSlot('spuntino_mattina', defs)).toBe('s2');
    expect(proponiSlot('merenda', defs)).toBe('s2'); // sinonimo di spuntino
  });
  it('condimenti e nomi ignoti non hanno proposta', () => {
    expect(proponiSlot('condimenti', defs)).toBeNull();
    expect(proponiSlot('pasto libero', defs)).toBeNull();
  });
});

describe('ingredientiDaAbbinare', () => {
  it('unisce righe fisse e di opzione, deduplicate per alimento normalizzato', () => {
    const voci = ingredientiDaAbbinare(PIANO_MENU_SETTIMANALE, {});
    const alimenti = voci.map((v) => v.alimento);
    expect(alimenti).toContain("fiocchi d'avena");
    expect(alimenti).toContain('pane integrale');   // riga di opzione
    expect(alimenti).toContain('pane di segale');   // altra opzione
    // "fiocchi d'avena" compare in 3 pasti del fixture ma una volta sola qui.
    expect(alimenti.filter((a) => a === "fiocchi d'avena")).toHaveLength(1);
  });
  it('le correzioni sostituiscono il pasto originale', () => {
    const correzione = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[0]);
    correzione.piatti[0].righeFisse = [{ alimento: 'muesli', quantita: 40, unita: 'g', quantitaInferita: false, testoOriginale: '40g muesli' }];
    const voci = ingredientiDaAbbinare(PIANO_MENU_SETTIMANALE, { '1-0-0': correzione });
    expect(voci.map((v) => v.alimento)).toContain('muesli');
  });
});
