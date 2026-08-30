import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient } from '@/domain/types';
import { traduciBozza, BozzaIncompletaError } from '../commit';
import type { StatoRevisione } from '../types';
import { PIANO_MENU_SETTIMANALE, PIANO_GIORNATA_UNICA } from '../fixtures';

const AVENA: Ingredient = { id: 'i-avena', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 };

function statoCompleto(): StatoRevisione {
  // Mappa tutti i nomi pasto del fixture, risolve la riga "2-3 olive" e dichiara i nuovi.
  const oliveRisolte = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
  oliveRisolte.piatti[0].righeFisse[1] = { alimento: 'olive taggiasche', quantita: 3, unita: 'pz', quantitaInferita: false, testoOriginale: '2-3 olive taggiasche' };
  return {
    passo: 'riepilogo',
    mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' },
    pastiConfermati: [],
    correzioni: { '1-1-1': oliveRisolte },
    ingredientiNuovi: [
      { alimento: 'latte parzialmente scremato', nome: 'Latte parz. scremato', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 },
      { alimento: 'fesa di tacchino', nome: 'Fesa di tacchino', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
      { alimento: 'pane integrale', nome: 'Pane integrale', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
      { alimento: 'pane di segale', nome: 'Pane di segale', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
      { alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
      { alimento: 'filetto di merluzzo', nome: 'Filetto di merluzzo', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 300 },
      { alimento: 'olive taggiasche', nome: 'Olive taggiasche', unitaBase: 'pz', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 30 },
      { alimento: 'tonno al naturale', nome: 'Tonno al naturale', unitaBase: 'g', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 160 },
      { alimento: 'yogurt greco', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 170 },
    ],
  };
}

describe('traduciBozza', () => {
  it('risolve le righe: abbinate a esistenti o dichiarate nuove', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29');
    const colazione = s.piattiDaCreare.find((p) => p.nome === 'Porridge' && p.settimanaCiclo === 1)!;
    expect(colazione.righe).toContainEqual({ ingredientId: 'i-avena', quantita: 30, unita: 'g' });
    expect(colazione.righe).toContainEqual({ nuovoAlimento: 'latte parzialmente scremato', quantita: 150, unita: 'ml' });
  });

  it('una riga irrisolta o una mappatura mancante fermano tutto', () => {
    const senzaOlive = statoCompleto();
    delete senzaOlive.correzioni['1-1-1']; // le olive restano quantita: null
    expect(() => traduciBozza(PIANO_MENU_SETTIMANALE, senzaOlive, [AVENA], [], '2026-08-29')).toThrow(BozzaIncompletaError);
    const senzaMappa = statoCompleto();
    delete senzaMappa.mappaturaPasti['cena'];
    expect(() => traduciBozza(PIANO_MENU_SETTIMANALE, senzaMappa, [AVENA], [], '2026-08-29')).toThrow(BozzaIncompletaError);
  });

  it('un pasto svuotato in revisione non produce piatti e non pretende mappatura', () => {
    const stato = statoCompleto();
    stato.correzioni['1-0-2'] = { nomeOriginale: 'condimenti', piatti: [] };
    delete stato.mappaturaPasti['condimenti'];
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, stato, [AVENA], [], '2026-08-29');
    expect(s.piattiDaCreare.every((p) => !p.righe.some((r) => 'nuovoAlimento' in r && r.nuovoAlimento === 'olio extravergine di oliva'))).toBe(true);
    // Il pasto svuotato non deve far sparire gli altri piatti dello stesso giorno.
    expect(s.piattiDaCreare.some((p) => p.nome === 'Porridge')).toBe(true);
    expect(s.piattiDaCreare.some((p) => p.nome === 'Tacchino con pane')).toBe(true);
  });

  it('condimenti senza sorella nello slot mappato diventano un piatto a sé', () => {
    const piano = {
      archetipo: 'giornata_unica' as const,
      fonte: 'test',
      noteEstrazione: [],
      settimane: [{
        numero: 1,
        giorni: [{
          giorno: 0,
          titolo: null,
          pasti: [{
            nomeOriginale: 'condimenti',
            piatti: [{
              nome: 'Condimenti', descrizione: null, componenti: [],
              righeFisse: [{ alimento: 'olio extravergine di oliva', quantita: 20, unita: 'ml' as const, quantitaInferita: false, testoOriginale: '20ml olio' }],
            }],
          }],
        }],
      }],
    };
    const stato: StatoRevisione = {
      passo: 'riepilogo', mappaturaPasti: { condimenti: 's-pranzo' }, pastiConfermati: [], correzioni: {},
      ingredientiNuovi: [{ alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 }],
    };
    const s = traduciBozza(piano, stato, [], [], '2026-08-29');
    expect(s.piattiDaCreare).toHaveLength(1);
    expect(s.piattiDaCreare[0]).toMatchObject({ nome: 'Condimenti', slotDefId: 's-pranzo' });
    expect(s.piattiDaCreare[0].righe).toContainEqual({ nuovoAlimento: 'olio extravergine di oliva', quantita: 20, unita: 'ml' });
  });

  it('fonde le righe con la stessa chiave (fissa + condimenti) sommando le quantità', () => {
    const piano = {
      archetipo: 'giornata_unica' as const,
      fonte: 'test',
      noteEstrazione: [],
      settimane: [{
        numero: 1,
        giorni: [{
          giorno: 0,
          titolo: null,
          pasti: [
            {
              nomeOriginale: 'pranzo',
              piatti: [{
                nome: 'Riso', descrizione: null, componenti: [],
                righeFisse: [{ alimento: 'olio extravergine di oliva', quantita: 10, unita: 'ml' as const, quantitaInferita: false, testoOriginale: '10ml olio' }],
              }],
            },
            {
              nomeOriginale: 'condimenti',
              piatti: [{
                nome: 'Condimenti', descrizione: null, componenti: [],
                righeFisse: [{ alimento: 'olio extravergine di oliva', quantita: 5, unita: 'ml' as const, quantitaInferita: false, testoOriginale: '5ml olio' }],
              }],
            },
          ],
        }],
      }],
    };
    const stato: StatoRevisione = {
      passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo', condimenti: 's-pranzo' }, pastiConfermati: [], correzioni: {},
      ingredientiNuovi: [{ alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 }],
    };
    const s = traduciBozza(piano, stato, [], [], '2026-08-29');
    const riso = s.piattiDaCreare.find((p) => p.nome === 'Riso')!;
    expect(riso.righe).toEqual([{ nuovoAlimento: 'olio extravergine di oliva', quantita: 15, unita: 'ml' }]);
  });

  it('un alimento nuovo con unità diversa dalla proposta ferma tutto', () => {
    const piano = {
      archetipo: 'giornata_unica' as const,
      fonte: 'test',
      noteEstrazione: [],
      settimane: [{
        numero: 1,
        giorni: [{
          giorno: 0,
          titolo: null,
          pasti: [{
            nomeOriginale: 'pranzo',
            piatti: [{
              nome: 'Riso', descrizione: null, componenti: [],
              righeFisse: [{ alimento: 'zenzero fresco', quantita: 5, unita: 'g' as const, quantitaInferita: false, testoOriginale: '5g zenzero' }],
            }],
          }],
        }],
      }],
    };
    const stato: StatoRevisione = {
      passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {},
      ingredientiNuovi: [{ alimento: 'zenzero fresco', nome: 'Zenzero fresco', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'stima', deperibile: true, formatoConfezione: 1 }],
    };
    expect(() => traduciBozza(piano, stato, [], [], '2026-08-29')).toThrow(BozzaIncompletaError);
  });

  it('la rete di sicurezza della regola 2 rispetta l\'unità: un omonimo per inclusione con unità diversa non esclude il nuovo', () => {
    // Repro della review: proposta 'zenzero fresco'/pz, esistente 'Zenzero in polvere'/g.
    // Il nome pulito ('Zenzero') è incluso in quello dell'esistente per inclusione, ma le
    // unità sono diverse: la riga si risolve come nuovoAlimento (nessun match compatibile
    // per unità) e il proposto NON deve sparire da ingredientiDaCreare.
    const piano = {
      archetipo: 'giornata_unica' as const,
      fonte: 'test',
      noteEstrazione: [],
      settimane: [{
        numero: 1,
        giorni: [{
          giorno: 0,
          titolo: null,
          pasti: [{
            nomeOriginale: 'pranzo',
            piatti: [{
              nome: 'Riso allo zenzero', descrizione: null, componenti: [],
              righeFisse: [{ alimento: 'zenzero fresco', quantita: 1, unita: 'pz' as const, quantitaInferita: false, testoOriginale: '1 pz zenzero fresco' }],
            }],
          }],
        }],
      }],
    };
    const zenzeroInPolvere: Ingredient = { id: 'i-zenzero-polvere', nome: 'Zenzero in polvere', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 50 };
    const stato: StatoRevisione = {
      passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {},
      ingredientiNuovi: [{ alimento: 'zenzero fresco', nome: 'Zenzero', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'stima', deperibile: true, formatoConfezione: 1 }],
    };
    const s = traduciBozza(piano, stato, [zenzeroInPolvere], [], '2026-08-29');
    const riso = s.piattiDaCreare.find((p) => p.nome === 'Riso allo zenzero')!;
    expect(riso.righe).toContainEqual({ nuovoAlimento: 'zenzero fresco', quantita: 1, unita: 'pz' });
    expect(s.ingredientiDaCreare.some((i) => i.alimento === 'zenzero fresco')).toBe(true);
  });

  it('una quantità non risolta dentro un\'opzione di componente ferma tutto', () => {
    const stato = statoCompleto();
    // giorni[0].pasti[1] = cena di lunedì sett.1 ("Tacchino con pane"), col componente 'pane'.
    const cenaConOpzioneRotta = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[1]);
    cenaConOpzioneRotta.piatti[0].componenti[0].opzioni[0][0] = { alimento: 'pane integrale', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'una fetta' };
    stato.correzioni['1-0-1'] = cenaConOpzioneRotta;
    expect(() => traduciBozza(PIANO_MENU_SETTIMANALE, stato, [AVENA], [], '2026-08-29')).toThrow(BozzaIncompletaError);
  });

  it('re-run: un ingrediente già creato con il nome pulito si aggancia per nome, non ricrea', () => {
    const latteEsistente: Ingredient = { id: 'i-latte', nome: 'Latte parz. scremato', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 };
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA, latteEsistente], [], '2026-08-29');
    const colazione = s.piattiDaCreare.find((p) => p.nome === 'Porridge' && p.settimanaCiclo === 1)!;
    expect(colazione.righe).toContainEqual({ ingredientId: 'i-latte', quantita: 150, unita: 'ml' });
    expect(s.ingredientiDaCreare.some((i) => i.alimento === 'latte parzialmente scremato')).toBe(false);
  });

  it('i condimenti si accodano ai piatti dello slot mappato, non diventano sorelle', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29');
    // Lunedì sett.1: condimenti mappati su cena -> l'olio finisce nelle righe del piatto di cena.
    const cenaLun = s.piattiDaCreare.find((p) => p.nome === 'Tacchino con pane')!;
    expect(cenaLun.righe).toContainEqual({ nuovoAlimento: 'olio extravergine di oliva', quantita: 20, unita: 'ml' });
    expect(s.piattiDaCreare.some((p) => p.nome === 'Condimenti')).toBe(false);
  });

  it('compatta i giorni identici: la giornata unica produce un piatto con giornoCiclo null', () => {
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 }] };
    const s = traduciBozza(PIANO_GIORNATA_UNICA, stato, [], [], '2026-08-29');
    expect(s.piattiDaCreare).toHaveLength(1);
    expect(s.piattiDaCreare[0]).toMatchObject({ nome: 'Pasta al pomodoro', giornoCiclo: null, settimanaCiclo: null });
  });

  it('la colazione uguale nei 2 giorni della sett.1 si compatta; le cene diverse no', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29');
    const colazioni = s.piattiDaCreare.filter((p) => p.nome === 'Porridge' && p.settimanaCiclo === 1);
    expect(colazioni).toHaveLength(1);
    expect(colazioni[0].giornoCiclo).toBeNull();
    // Le cene di lun e mar sono diverse: restano per giorno. Martedì ha due sorelle.
    const cene = s.piattiDaCreare.filter((p) => p.slotDefId === 's-cena' && p.settimanaCiclo === 1);
    expect(cene.map((p) => p.giornoCiclo).sort((a, b) => a! - b!)).toEqual([0, 1, 1]);
  });

  it('uno slot presente in un solo giorno della settimana non si compatta (settimana da 1 giorno)', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29');
    // Sett.2 ha un solo giorno: anche se lo slot ricorre "in tutti i giorni che ce l'hanno"
    // (uno solo), non è una vera compattazione - il planner lo servirebbe ogni giorno.
    const yogurt = s.piattiDaCreare.find((p) => p.nome === 'Yogurt e frutta')!;
    expect(yogurt.settimanaCiclo).toBe(2);
    expect(yogurt.giornoCiclo).toBe(0);
  });

  it('multi-settimana: settimanaCiclo dal numero, settimaneCiclo dal conteggio, origine il lunedì prossimo', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29'); // sabato
    expect(s.impostazioni).toEqual({ settimaneCiclo: 2, cicloOrigine: '2026-08-31' });
    expect(s.piattiDaCreare.some((p) => p.settimanaCiclo === 2)).toBe(true);
  });

  it('idempotenza: piatti già creati vengono riusati, ingredienti già esistenti non ricreati', () => {
    const gemello: Dish = {
      id: 'd-gia', nome: 'Pasta al pomodoro', slotDefId: 's-pranzo', fonte: 'nutrizionista', attivo: true,
      descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    };
    const pasta: Ingredient = { id: 'i-pasta', nome: 'Pasta di semola', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 };
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 }] };
    const s = traduciBozza(PIANO_GIORNATA_UNICA, stato, [pasta], [gemello], '2026-08-29');
    expect(s.piattiDaCreare[0].riusaDishId).toBe('d-gia');
    expect(s.piattiDaDisattivare).toHaveLength(0);
    expect(s.ingredientiDaCreare).toHaveLength(0);
  });

  it('riuso: due piatti sorella identici sullo stesso slot non consumano lo stesso dishId', () => {
    const piano = {
      archetipo: 'giornata_unica' as const,
      fonte: 'test',
      noteEstrazione: [],
      settimane: [{
        numero: 1,
        giorni: [{
          giorno: 0,
          titolo: null,
          pasti: [{
            nomeOriginale: 'pranzo',
            piatti: [
              { nome: 'Pasta al pomodoro', descrizione: null, componenti: [], righeFisse: [{ alimento: 'pasta di semola', quantita: 80, unita: 'g' as const, quantitaInferita: false, testoOriginale: 'pasta 80g' }] },
              { nome: 'Pasta al pomodoro', descrizione: null, componenti: [], righeFisse: [{ alimento: 'pasta di semola', quantita: 80, unita: 'g' as const, quantitaInferita: false, testoOriginale: 'pasta 80g' }] },
            ],
          }],
        }],
      }],
    };
    // Settimana da 1 giorno: non si compatta (regola 4), quindi entrambe le sorelle
    // escono con giornoCiclo 0 - il gemello in repertorio deve avere lo stesso pin.
    const gemello: Dish = {
      id: 'd-gia', nome: 'Pasta al pomodoro', slotDefId: 's-pranzo', fonte: 'nutrizionista', attivo: true,
      descrizione: null, settimanaCiclo: null, giornoCiclo: 0, ingredienti: [], componenti: [],
    };
    const pasta: Ingredient = { id: 'i-pasta', nome: 'Pasta di semola', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 };
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };
    const s = traduciBozza(piano, stato, [pasta], [gemello], '2026-08-29');
    const sorelle = s.piattiDaCreare.filter((p) => p.nome === 'Pasta al pomodoro');
    expect(sorelle).toHaveLength(2);
    expect(sorelle.map((p) => p.riusaDishId).sort()).toEqual(['d-gia', null]);
    expect(s.piattiDaDisattivare).toHaveLength(0);
  });

  it('disattiva i piatti nutrizionista non riusati, mai i propri', () => {
    const vecchio: Dish = { id: 'd-old', nome: 'Vecchio piatto', slotDefId: 's-cena', fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [] };
    const proprio: Dish = { ...vecchio, id: 'd-mio', nome: 'Piatto mio', fonte: 'proprio' };
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [vecchio, proprio], '2026-08-29');
    expect(s.piattiDaDisattivare).toEqual(['d-old']);
  });

  it('fonde due righe sullo stesso ingrediente dentro la stessa opzione di un componente', () => {
    const piano = {
      archetipo: 'giornata_unica' as const,
      fonte: 'test',
      noteEstrazione: [],
      settimane: [{
        numero: 1,
        giorni: [{
          giorno: 0,
          titolo: null,
          pasti: [{
            nomeOriginale: 'pranzo',
            piatti: [{
              nome: 'Riso con condimento', descrizione: null, righeFisse: [],
              componenti: [{
                nome: 'condimento',
                nota: null,
                opzioni: [
                  [
                    { alimento: 'olio extravergine di oliva', quantita: 10, unita: 'ml' as const, quantitaInferita: false, testoOriginale: '10ml olio' },
                    { alimento: 'olio extravergine di oliva', quantita: 5, unita: 'ml' as const, quantitaInferita: false, testoOriginale: '5ml olio' },
                  ],
                  [{ alimento: 'olio extravergine di oliva', quantita: 8, unita: 'ml' as const, quantitaInferita: false, testoOriginale: '8ml olio' }],
                ],
              }],
            }],
          }],
        }],
      }],
    };
    const stato: StatoRevisione = {
      passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {},
      ingredientiNuovi: [{ alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 }],
    };
    const s = traduciBozza(piano, stato, [], [], '2026-08-29');
    const piatto = s.piattiDaCreare.find((p) => p.nome === 'Riso con condimento')!;
    expect(piatto.componenti[0].opzioni[0]).toEqual([{ nuovoAlimento: 'olio extravergine di oliva', quantita: 15, unita: 'ml' }]);
    expect(piatto.componenti[0].opzioni[1]).toEqual([{ nuovoAlimento: 'olio extravergine di oliva', quantita: 8, unita: 'ml' }]);
  });

  it('gli ingredienti nuovi non usati da nessuna riga non si creano', () => {
    const stato = statoCompleto();
    stato.ingredientiNuovi.push({ alimento: 'zafferano', nome: 'Zafferano', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 1 });
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, stato, [AVENA], [], '2026-08-29');
    expect(s.ingredientiDaCreare.some((i) => i.alimento === 'zafferano')).toBe(false);
  });
});
