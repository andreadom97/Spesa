import { describe, it, expect } from 'vitest';
import { fondiPagine } from '../fusione';
import type { IndiceEstrazione, PaginaIndice } from '../indice';
import { PIANO_MENU_SETTIMANALE } from '../fixtures';
import { validaEsito } from '../valida';
import type { GiornoEstratto, PianoEstratto, SettimanaEstratta } from '../types';

/** Una copia del giorno (settimana, giorno) del fixture, eventualmente ristretta ai pasti indicati. */
function giorno(settimana: number, giorno: number, pasti?: number[]): GiornoEstratto {
  const s = PIANO_MENU_SETTIMANALE.settimane.find((x) => x.numero === settimana);
  const g = s?.giorni.find((x) => x.giorno === giorno);
  if (!g) throw new Error(`fixture senza giorno ${settimana}-${giorno}`);
  const copia = structuredClone(g);
  if (pasti) copia.pasti = pasti.map((i) => copia.pasti[i]);
  return copia;
}

function settimana(numero: number, giorni: GiornoEstratto[]): SettimanaEstratta {
  return { numero, giorni };
}

function piano(settimane: SettimanaEstratta[], extra: Partial<PianoEstratto> = {}): PianoEstratto {
  return { archetipo: 'menu_settimanale', fonte: 'fixture sintetico', noteEstrazione: [], settimane, ...extra };
}

function indice(pagine: Partial<PaginaIndice>[], extra: Partial<IndiceEstrazione> = {}): IndiceEstrazione {
  return {
    archetipo: 'menu_settimanale',
    fonte: 'fixture sintetico',
    noteEstrazione: [],
    pagine: pagine.map((p, k) => ({ pagina: k + 1, continuaDallaPrecedente: false, contenuto: [], ...p })),
    ...extra,
  };
}

const cenaMartedi = giorno(1, 1).pasti[1];

describe('fondiPagine', () => {
  it('due pagine con giorni diversi si accodano in ordine di giorno', () => {
    const fuso = fondiPagine(indice([{}, {}]), [
      { pagina: 1, piano: piano([settimana(1, [giorno(1, 0)])]) },
      { pagina: 2, piano: piano([settimana(1, [giorno(1, 1)])]) },
    ]);
    expect(fuso.settimane).toEqual([settimana(1, [giorno(1, 0), giorno(1, 1)])]);
  });

  it('stesso giorno su due pagine: i pasti si accodano', () => {
    const fuso = fondiPagine(indice([{}, {}]), [
      { pagina: 1, piano: piano([settimana(1, [giorno(1, 0, [0])])]) },
      { pagina: 2, piano: piano([settimana(1, [giorno(1, 0, [1, 2])])]) },
    ]);
    expect(fuso.settimane).toEqual([settimana(1, [giorno(1, 0)])]);
    expect(fuso.settimane[0].giorni[0].pasti.map((p) => p.nomeOriginale)).toEqual(['colazione', 'cena', 'condimenti']);
  });

  it('continuaDallaPrecedente + stesso nome pasto: i piatti si concatenano in un pasto solo', () => {
    // La cena di martedì ha due piatti sorella: il primo chiude la pagina 1, il secondo apre la pagina 2.
    const primaMeta = giorno(1, 1);
    primaMeta.pasti[1].piatti = [cenaMartedi.piatti[0]];
    const secondaMeta = giorno(1, 1, [1]);
    secondaMeta.pasti[0].nomeOriginale = 'CENA ';
    secondaMeta.pasti[0].piatti = [cenaMartedi.piatti[1]];
    const fuso = fondiPagine(indice([{}, { continuaDallaPrecedente: true }]), [
      { pagina: 1, piano: piano([settimana(1, [primaMeta])]) },
      { pagina: 2, piano: piano([settimana(1, [secondaMeta])]) },
    ]);
    // Il nome resta quello della prima metà; il confronto è su normalizza (maiuscole e spazi non contano).
    expect(fuso.settimane).toEqual([settimana(1, [giorno(1, 1)])]);
    expect(fuso.settimane[0].giorni[0].pasti).toHaveLength(2);
    expect(fuso.settimane[0].giorni[0].pasti[1].piatti.map((p) => p.nome)).toEqual(['Merluzzo', 'Tonno in insalata']);
  });

  it('continuaDallaPrecedente ma nome diverso: due pasti', () => {
    const primaMeta = giorno(1, 1);
    primaMeta.pasti[1].piatti = [cenaMartedi.piatti[0]];
    const secondaMeta = giorno(1, 1, [1]);
    secondaMeta.pasti[0].nomeOriginale = 'pranzo';
    secondaMeta.pasti[0].piatti = [cenaMartedi.piatti[1]];
    const fuso = fondiPagine(indice([{}, { continuaDallaPrecedente: true }]), [
      { pagina: 1, piano: piano([settimana(1, [primaMeta])]) },
      { pagina: 2, piano: piano([settimana(1, [secondaMeta])]) },
    ]);
    const pasti = fuso.settimane[0].giorni[0].pasti;
    expect(pasti.map((p) => p.nomeOriginale)).toEqual(['colazione', 'cena', 'pranzo']);
    expect(pasti[1].piatti).toHaveLength(1);
    expect(pasti[2].piatti).toHaveLength(1);
  });

  it('senza continuaDallaPrecedente lo stesso nome pasto resta un pasto doppio', () => {
    const primaMeta = giorno(1, 1);
    primaMeta.pasti[1].piatti = [cenaMartedi.piatti[0]];
    const secondaMeta = giorno(1, 1, [1]);
    secondaMeta.pasti[0].piatti = [cenaMartedi.piatti[1]];
    const fuso = fondiPagine(indice([{}, {}]), [
      { pagina: 1, piano: piano([settimana(1, [primaMeta])]) },
      { pagina: 2, piano: piano([settimana(1, [secondaMeta])]) },
    ]);
    expect(fuso.settimane[0].giorni[0].pasti.map((p) => p.nomeOriginale)).toEqual(['colazione', 'cena', 'cena']);
  });

  it('continuaDallaPrecedente vale solo per il primo pasto del primo giorno della pagina', () => {
    // Pagina 2: apre con un giorno nuovo (martedì), poi torna su lunedì con una "cena" omonima: niente concatenazione.
    const fuso = fondiPagine(indice([{}, { continuaDallaPrecedente: true }]), [
      { pagina: 1, piano: piano([settimana(1, [giorno(1, 0, [0, 1])])]) },
      { pagina: 2, piano: piano([settimana(1, [giorno(1, 1), giorno(1, 0, [1])])]) },
    ]);
    const lunedi = fuso.settimane[0].giorni[0];
    expect(lunedi.pasti.map((p) => p.nomeOriginale)).toEqual(['colazione', 'cena', 'cena']);
    expect(fuso.settimane[0].giorni[1]).toEqual(giorno(1, 1));
  });

  it("archetipo e fonte dall'indice; pagina che contraddice → nota", () => {
    const fuso = fondiPagine(indice([{}, {}], { fonte: '2 foto' }), [
      { pagina: 1, piano: piano([settimana(1, [giorno(1, 0)])], { fonte: '2 foto' }) },
      { pagina: 2, piano: piano([settimana(1, [giorno(1, 1)])], { archetipo: 'giornata_unica', fonte: 'una foto' }) },
    ]);
    expect(fuso.archetipo).toBe('menu_settimanale');
    expect(fuso.fonte).toBe('2 foto');
    expect(fuso.noteEstrazione).toEqual([
      "pagina 2: archetipo diverso dall'indice (giornata_unica)",
      "pagina 2: fonte diversa dall'indice (una foto)",
    ]);
  });

  it('titolo: primo non nullo vince, secondo diverso → nota', () => {
    const conTitolo = (titolo: string | null, pasti: number[]) => ({ ...giorno(1, 0, pasti), titolo });
    const ind = indice([{}, {}, {}, {}], { archetipo: 'giorni_tipo' });
    const giorniTipo = (g: GiornoEstratto) => piano([settimana(1, [g])], { archetipo: 'giorni_tipo' });
    const fuso = fondiPagine(ind, [
      { pagina: 1, piano: giorniTipo(conTitolo(null, [0])) },
      { pagina: 2, piano: giorniTipo(conTitolo('Piano 1', [1])) },
      { pagina: 3, piano: giorniTipo(conTitolo(null, [2])) },
      { pagina: 4, piano: giorniTipo(conTitolo('Piano 2', [2])) },
    ]);
    expect(fuso.settimane[0].giorni[0].titolo).toBe('Piano 1');
    expect(fuso.noteEstrazione).toEqual(['pagina 4: titolo diverso per settimana 1 giorno 0 ("Piano 2" invece di "Piano 1")']);
    expect(fuso.settimane[0].giorni[0].pasti.map((p) => p.nomeOriginale)).toEqual(['colazione', 'cena', 'condimenti', 'condimenti']);
  });

  it('note prefissate con "pagina k:"', () => {
    const fuso = fondiPagine(indice([{}, {}], { noteEstrazione: ['dall\'indice'] }), [
      { pagina: 1, piano: piano([settimana(1, [giorno(1, 0)])], { noteEstrazione: ['prima', 'seconda'] }) },
      { pagina: 2, piano: piano([settimana(1, [giorno(1, 1)])], { noteEstrazione: ['terza'] }) },
    ]);
    expect(fuso.noteEstrazione).toEqual(["dall'indice", 'pagina 1: prima', 'pagina 1: seconda', 'pagina 2: terza']);
  });

  it('settimane e giorni ordinati anche se le pagine arrivano in disordine', () => {
    const fuso = fondiPagine(indice([{}, {}, {}], { noteEstrazione: [] }), [
      { pagina: 3, piano: piano([settimana(2, [giorno(2, 0)])], { noteEstrazione: ['terza'] }) },
      { pagina: 1, piano: piano([settimana(1, [giorno(1, 1)])], { noteEstrazione: ['prima'] }) },
      { pagina: 2, piano: piano([settimana(1, [giorno(1, 0)])]) },
    ]);
    expect(fuso.settimane.map((s) => s.numero)).toEqual([1, 2]);
    expect(fuso.settimane[0].giorni.map((g) => g.giorno)).toEqual([0, 1]);
    expect(fuso.noteEstrazione).toEqual(['pagina 1: prima', 'pagina 3: terza']);
  });

  it('con le pagine in disordine i pasti dello stesso giorno seguono il numero di pagina, non l\'array', () => {
    const fuso = fondiPagine(indice([{}, {}]), [
      { pagina: 2, piano: piano([settimana(1, [giorno(1, 0, [1, 2])])]) },
      { pagina: 1, piano: piano([settimana(1, [giorno(1, 0, [0])])]) },
    ]);
    expect(fuso.settimane[0].giorni[0].pasti.map((p) => p.nomeOriginale)).toEqual(['colazione', 'cena', 'condimenti']);
  });

  it('non muta gli input', () => {
    const ind = indice([{}, { continuaDallaPrecedente: true }], { noteEstrazione: ['nota'] });
    const primaMeta = giorno(1, 1);
    primaMeta.pasti[1].piatti = [cenaMartedi.piatti[0]];
    const secondaMeta = giorno(1, 1, [1]);
    secondaMeta.pasti[0].piatti = [cenaMartedi.piatti[1]];
    const pagine = [
      { pagina: 1, piano: piano([settimana(1, [primaMeta, giorno(1, 0)])], { noteEstrazione: ['x'] }) },
      { pagina: 2, piano: piano([settimana(1, [secondaMeta])]) },
    ];
    const indPrima = structuredClone(ind);
    const paginePrima = structuredClone(pagine);
    const fuso = fondiPagine(ind, pagine);
    expect(ind).toEqual(indPrima);
    expect(pagine).toEqual(paginePrima);
    // Nemmeno per condivisione di riferimenti: toccare il risultato non tocca le pagine.
    fuso.settimane[0].giorni[1].pasti[1].piatti[0].nome = 'cambiato';
    fuso.noteEstrazione.push('altra');
    expect(pagine).toEqual(paginePrima);
    expect(ind).toEqual(indPrima);
  });

  it('il risultato della dieta spezzata e rifusa passa validaEsito ed è deep-equal all\'originale', () => {
    // Quattro pagine: lunedì spezzato per pasti fra 1 e 2; la cena di martedì spezzata per piatti fra 2 e 3
    // (continuaDallaPrecedente); la settimana 2 sulla pagina 4. Le note stanno tutte nell'indice.
    const martediPrimaMeta = giorno(1, 1);
    martediPrimaMeta.pasti[1].piatti = [cenaMartedi.piatti[0]];
    const martediSecondaMeta = giorno(1, 1, [1]);
    martediSecondaMeta.pasti[0].piatti = [cenaMartedi.piatti[1]];
    const ind = indice([{}, {}, { continuaDallaPrecedente: true }, {}], { noteEstrazione: PIANO_MENU_SETTIMANALE.noteEstrazione });
    const fuso = fondiPagine(ind, [
      { pagina: 1, piano: piano([settimana(1, [giorno(1, 0, [0, 1])])]) },
      { pagina: 2, piano: piano([settimana(1, [giorno(1, 0, [2]), martediPrimaMeta])]) },
      { pagina: 3, piano: piano([settimana(1, [martediSecondaMeta])]) },
      { pagina: 4, piano: piano([settimana(2, [giorno(2, 0)])]) },
    ]);
    expect(fuso).toEqual(PIANO_MENU_SETTIMANALE);
    expect(validaEsito({ tipo: 'piano', piano: fuso })).toEqual({ tipo: 'piano', piano: PIANO_MENU_SETTIMANALE });
  });
});
