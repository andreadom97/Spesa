import { describe, it, expect, beforeEach } from 'vitest';
import { leggiDaPiatti, destinazioneDa, PILLOLA_DA } from '../da';
import { salvaOrigine } from '@/components/pannello/indirizzi';

const CHIAVE = 'spesa:piatti-da';

describe('leggiDaPiatti (spec fase 5 §G.2)', () => {
  beforeEach(() => sessionStorage.clear());

  it('dall\'URL vince e si salva in sessionStorage', () => {
    expect(leggiDaPiatti('?da=lista')).toBe('lista');
    expect(sessionStorage.getItem(CHIAVE)).toBe('lista');
  });

  it('senza parametro usa quello salvato: è il ritorno dall\'editor del piatto', () => {
    sessionStorage.setItem(CHIAVE, 'piano');
    expect(leggiDaPiatti('')).toBe('piano');
  });

  it('senza parametro né salvato vale impostazioni', () => {
    expect(leggiDaPiatti('')).toBe('impostazioni');
  });

  it('un valore sconosciuto, nell\'URL o salvato, non vale: si scende al passo dopo', () => {
    sessionStorage.setItem(CHIAVE, 'piano');
    expect(leggiDaPiatti('?da=dispensa')).toBe('piano');
    sessionStorage.setItem(CHIAVE, 'boh');
    expect(leggiDaPiatti('')).toBe('impostazioni');
  });

  it('se sessionStorage lancia, l\'URL vale lo stesso e il resto vale impostazioni', () => {
    const originale = Storage.prototype.getItem;
    const originaleSet = Storage.prototype.setItem;
    Storage.prototype.getItem = () => { throw new Error('negato'); };
    Storage.prototype.setItem = () => { throw new Error('negato'); };
    try {
      expect(leggiDaPiatti('?da=lista')).toBe('lista');
      expect(leggiDaPiatti('')).toBe('impostazioni');
    } finally {
      Storage.prototype.getItem = originale;
      Storage.prototype.setItem = originaleSet;
    }
  });
});

describe('PILLOLA_DA e destinazioneDa', () => {
  beforeEach(() => sessionStorage.clear());

  it('le tre etichette e i tre nomi della spec', () => {
    expect(PILLOLA_DA).toEqual({
      impostazioni: { etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni' },
      lista: { etichetta: 'LISTA', ariaLabel: 'Torna alla lista' },
      piano: { etichetta: 'PIANO', ariaLabel: 'Torna al piano' },
    });
  });

  it('lista e piano tornano alla pagina, impostazioni al pannello sopra l\'origine', () => {
    expect(destinazioneDa('lista')).toBe('/lista');
    expect(destinazioneDa('piano')).toBe('/piano');
    expect(destinazioneDa('impostazioni')).toBe('/lista?impostazioni=cima');
    salvaOrigine({ pathname: '/dispensa', sotto: 'cima' });
    expect(destinazioneDa('impostazioni')).toBe('/dispensa?impostazioni=cima');
  });
});
