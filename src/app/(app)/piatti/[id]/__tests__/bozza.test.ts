import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { salvaBozza, riprendiBozza, scartaBozza } from '../bozza';

const BOZZA = {
  nome: 'Riso condito',
  slotDefId: 'pranzo-1',
  descrizione: 'Lessa il riso, condisci a freddo.',
  settimanaCiclo: 2,
  giornoCiclo: 4,
  ingredienti: [{ ingredientId: 'olio-1', quantita: 10, unita: 'ml' as const }],
  componenti: [{ id: 'c-1', nome: 'Pane', opzioni: [{ id: 'o-1', righe: [{ ingredientId: 'farina-1', quantita: 60, unita: 'g' as const }] }] }],
};

describe('bozza del piatto', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restituisce quello che ha salvato', () => {
    salvaBozza('nuovo', BOZZA);
    expect(riprendiBozza('nuovo')).toEqual(BOZZA);
  });

  it('consuma la bozza: una seconda ripresa non trova più niente', () => {
    // Serve a non far riapparire lavoro vecchio sopra modifiche fatte dopo
    // il rientro nell'editor.
    salvaBozza('nuovo', BOZZA);
    riprendiBozza('nuovo');
    expect(riprendiBozza('nuovo')).toBeNull();
  });

  it('tiene separate le bozze di piatti diversi', () => {
    salvaBozza('nuovo', BOZZA);
    expect(riprendiBozza('altro-piatto')).toBeNull();
    expect(riprendiBozza('nuovo')).toEqual(BOZZA);
  });

  it('scarta senza restituire niente', () => {
    salvaBozza('nuovo', BOZZA);
    scartaBozza('nuovo');
    expect(riprendiBozza('nuovo')).toBeNull();
  });

  it('ignora una bozza malformata invece di propagare l\'errore', () => {
    sessionStorage.setItem('spesa:bozza-piatto:nuovo', '{non json');
    expect(riprendiBozza('nuovo')).toBeNull();
  });

  it('ignora una bozza con i campi del tipo sbagliato', () => {
    sessionStorage.setItem('spesa:bozza-piatto:nuovo', JSON.stringify({ nome: 42, slotDefId: 'x', ingredienti: [] }));
    expect(riprendiBozza('nuovo')).toBeNull();
  });

  it('non lancia quando sessionStorage è inaccessibile', () => {
    // Navigazione privata o dati di sito bloccati: il solo accedere lancia.
    // Perdere la bozza è accettabile, non aprire la schermata no.
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('accesso negato');
    });
    expect(() => salvaBozza('nuovo', BOZZA)).not.toThrow();
    expect(() => scartaBozza('nuovo')).not.toThrow();
    expect(riprendiBozza('nuovo')).toBeNull();
  });

  it('una bozza scritta prima dei campi del ciclo resta valida', () => {
    // Chi ha una bozza aperta mentre l'app si aggiorna non deve perderla:
    // i campi nuovi si leggono con un default, non si butta tutto.
    sessionStorage.setItem(
      'spesa:bozza-piatto:nuovo',
      JSON.stringify({ nome: 'Vecchia', slotDefId: 'pranzo-1', ingredienti: [] }),
    );
    expect(riprendiBozza('nuovo')).toEqual({
      nome: 'Vecchia', slotDefId: 'pranzo-1', descrizione: '',
      settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    });
  });

  it('una bozza scritta prima di componenti resta valida', () => {
    // Stesso caso di sopra, isolato su `componenti`: è il campo aggiunto più
    // di recente (Task 11, review round 1) e deve leggersi con [] su una
    // bozza vecchia, non far scartare l'intera bozza.
    sessionStorage.setItem(
      'spesa:bozza-piatto:nuovo',
      JSON.stringify({
        nome: 'Riso condito', slotDefId: 'pranzo-1', descrizione: '',
        settimanaCiclo: null, giornoCiclo: null, ingredienti: [],
      }),
    );
    expect(riprendiBozza('nuovo')?.componenti).toEqual([]);
  });

  it('conserva i componenti della bozza, con i loro id', () => {
    // Il motivo per cui il campo esiste: senza, uscire dall'editor per
    // creare o modificare un ingrediente perdeva silenziosamente ogni
    // componente aggiunto fino a quel momento (review round 1, finding HIGH).
    salvaBozza('nuovo', BOZZA);
    expect(riprendiBozza('nuovo')?.componenti).toEqual(BOZZA.componenti);
  });
});