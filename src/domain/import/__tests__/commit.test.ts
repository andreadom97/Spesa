import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient } from '@/domain/types';
import { traduciBozza, BozzaIncompletaError, riassuntoScritture, type RigaTradotta, type ScrittureImport } from '../commit';
import type { StatoRevisione, PianoEstratto, RigaEstratta } from '../types';
import { SCELTA_NUOVO } from '../types';
import { proponi } from '../formati-tipici';
import { calcolaProposte, cambiUnita, motiviBlocco, passoBloccato, pesiProposte } from '../ingredienti';
import { PIANO_MENU_SETTIMANALE, PIANO_GIORNATA_UNICA } from '../fixtures';

const AVENA: Ingredient = { id: 'i-avena', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 , prezzoConfezione: null, ean: null};

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
      { alimento: 'latte parzialmente scremato', nome: 'Latte parz. scremato', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 , prezzoConfezione: null},
      { alimento: 'fesa di tacchino', nome: 'Fesa di tacchino', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 , prezzoConfezione: null},
      { alimento: 'pane integrale', nome: 'Pane integrale', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 , prezzoConfezione: null},
      { alimento: 'pane di segale', nome: 'Pane di segale', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 , prezzoConfezione: null},
      { alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 , prezzoConfezione: null},
      { alimento: 'filetto di merluzzo', nome: 'Filetto di merluzzo', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 300 , prezzoConfezione: null},
      { alimento: 'olive taggiasche', nome: 'Olive taggiasche', unitaBase: 'pz', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 30 , prezzoConfezione: null},
      { alimento: 'tonno al naturale', nome: 'Tonno al naturale', unitaBase: 'g', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 160 , prezzoConfezione: null},
      { alimento: 'yogurt greco', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 170 , prezzoConfezione: null},
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
      ingredientiNuovi: [{ alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 , prezzoConfezione: null}],
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
      ingredientiNuovi: [{ alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 , prezzoConfezione: null}],
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
      ingredientiNuovi: [{ alimento: 'zenzero fresco', nome: 'Zenzero fresco', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'stima', deperibile: true, formatoConfezione: 1 , prezzoConfezione: null}],
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
    const zenzeroInPolvere: Ingredient = { id: 'i-zenzero-polvere', nome: 'Zenzero in polvere', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 50 , prezzoConfezione: null, ean: null};
    const stato: StatoRevisione = {
      passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {},
      ingredientiNuovi: [{ alimento: 'zenzero fresco', nome: 'Zenzero', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'stima', deperibile: true, formatoConfezione: 1 , prezzoConfezione: null}],
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
    const latteEsistente: Ingredient = { id: 'i-latte', nome: 'Latte parz. scremato', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 , prezzoConfezione: null, ean: null};
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

  it('il prezzo per confezione dichiarato al passo formati arriva intatto in ingredientiDaCreare', () => {
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: 1.2 }] };
    const s = traduciBozza(PIANO_GIORNATA_UNICA, stato, [], [], '2026-08-29');
    expect(s.ingredientiDaCreare).toEqual([expect.objectContaining({ alimento: 'pasta di semola', prezzoConfezione: 1.2 })]);
  });

  it('la giornata unica (un solo giorno) produce un piatto con giornoCiclo null', () => {
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 , prezzoConfezione: null}] };
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
    const pasta: Ingredient = { id: 'i-pasta', nome: 'Pasta di semola', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 , prezzoConfezione: null, ean: null};
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 , prezzoConfezione: null}] };
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
    // archetipo 'giornata_unica': il singolo giorno vale ogni giorno, quindi entrambe le
    // sorelle escono con giornoCiclo null - il gemello in repertorio deve avere lo stesso pin.
    const gemello: Dish = {
      id: 'd-gia', nome: 'Pasta al pomodoro', slotDefId: 's-pranzo', fonte: 'nutrizionista', attivo: true,
      descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    };
    const pasta: Ingredient = { id: 'i-pasta', nome: 'Pasta di semola', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 , prezzoConfezione: null, ean: null};
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
      ingredientiNuovi: [{ alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 , prezzoConfezione: null}],
    };
    const s = traduciBozza(piano, stato, [], [], '2026-08-29');
    const piatto = s.piattiDaCreare.find((p) => p.nome === 'Riso con condimento')!;
    expect(piatto.componenti[0].opzioni[0]).toEqual([{ nuovoAlimento: 'olio extravergine di oliva', quantita: 15, unita: 'ml' }]);
    expect(piatto.componenti[0].opzioni[1]).toEqual([{ nuovoAlimento: 'olio extravergine di oliva', quantita: 8, unita: 'ml' }]);
  });

  it('gli ingredienti nuovi non usati da nessuna riga non si creano', () => {
    const stato = statoCompleto();
    stato.ingredientiNuovi.push({ alimento: 'zafferano', nome: 'Zafferano', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 1 , prezzoConfezione: null});
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, stato, [AVENA], [], '2026-08-29');
    expect(s.ingredientiDaCreare.some((i) => i.alimento === 'zafferano')).toBe(false);
  });
});

describe('giorni_tipo', () => {
  it('ogni scenario emette piatti sempre validi (cicli null) col titolo nel nome', () => {
    const piano: PianoEstratto = {
      archetipo: 'giorni_tipo' as const,
      fonte: 'test',
      noteEstrazione: [],
      settimane: [{
        numero: 1,
        giorni: [
          {
            giorno: 0,
            titolo: 'Piano 1',
            pasti: [{ nomeOriginale: 'pranzo', piatti: [{ nome: 'Riso e pollo', descrizione: null, componenti: [], righeFisse: [
              { alimento: 'riso', quantita: 80, unita: 'g', quantitaInferita: false, testoOriginale: 'riso 80g' },
            ] }] }],
          },
          {
            giorno: 1,
            titolo: 'Allenamento',
            pasti: [{ nomeOriginale: 'pranzo', piatti: [{ nome: 'Pasta e tonno', descrizione: null, componenti: [], righeFisse: [
              { alimento: 'riso', quantita: 120, unita: 'g', quantitaInferita: false, testoOriginale: 'riso 120g' },
            ] }] }],
          },
        ],
      }],
    };
    const stato: StatoRevisione = {
      passo: 'riepilogo',
      mappaturaPasti: { pranzo: 's-pranzo' },
      pastiConfermati: [],
      correzioni: {},
      ingredientiNuovi: [{ alimento: 'riso', nome: 'Riso', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 , prezzoConfezione: null}],
    };
    const scritture = traduciBozza(piano, stato, [], [], '2026-08-30');
    expect(scritture.impostazioni.settimaneCiclo).toBe(1);
    expect(scritture.piattiDaCreare).toHaveLength(2);
    for (const p of scritture.piattiDaCreare) {
      expect(p.settimanaCiclo).toBeNull();
      expect(p.giornoCiclo).toBeNull();
    }
    expect(scritture.piattiDaCreare.map((p) => p.nome).sort()).toEqual(['Allenamento — Pasta e tonno', 'Piano 1 — Riso e pollo']);
  });
});

describe('giornata_unica e griglia_alternative: un solo giorno vale ogni giorno', () => {
  it('la giornata unica con un solo giorno emette cicli null, senza prefisso nel nome', () => {
    const piano: PianoEstratto = {
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
              nome: 'Riso e pollo', descrizione: null, componenti: [],
              righeFisse: [{ alimento: 'riso', quantita: 80, unita: 'g', quantitaInferita: false, testoOriginale: 'riso 80g' }],
            }],
          }],
        }],
      }],
    };
    const stato: StatoRevisione = {
      passo: 'riepilogo',
      mappaturaPasti: { pranzo: 's-pranzo' },
      pastiConfermati: [],
      correzioni: {},
      ingredientiNuovi: [{ alimento: 'riso', nome: 'Riso', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 , prezzoConfezione: null}],
    };
    const scritture = traduciBozza(piano, stato, [], [], '2026-08-30');
    expect(scritture.piattiDaCreare).toHaveLength(1);
    expect(scritture.piattiDaCreare[0]).toMatchObject({ nome: 'Riso e pollo', settimanaCiclo: null, giornoCiclo: null });
  });
});

describe('traduciBozza — una riga a cucchiai non convertita (spec 8c §C)', () => {
  it('ferma tutto: i cucchiai si convertono in Controlla', () => {
    const piano = structuredClone(PIANO_GIORNATA_UNICA);
    piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse = [
      { alimento: 'olio extravergine di oliva', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di olio' },
    ];
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-1' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };
    expect(() => traduciBozza(piano, stato, [], [], '2026-10-05')).toThrow('Cucchiai non convertiti per "1 cucchiaio di olio"');
  });
});

describe('traduciBozza — fase 8c', () => {
  const ingrediente = (id: string, nome: string, unitaBase: Ingredient['unitaBase']): Ingredient => ({
    id, nome, unitaBase, area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500, prezzoConfezione: null, ean: null,
  });
  const ZUCCHINE = ingrediente('i-zucc', 'Zucchine', 'pz');
  function pianoCon(righe: RigaEstratta[]): PianoEstratto {
    const piano = structuredClone(PIANO_GIORNATA_UNICA);
    piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse = righe;
    return piano;
  }
  const riga = (alimento: string, quantita: number | null, unita: RigaEstratta['unita'], testoOriginale = alimento): RigaEstratta => ({
    alimento, quantita, unita, quantitaInferita: false, testoOriginale,
  });
  const stato = (extra: Partial<StatoRevisione> = {}): StatoRevisione => ({
    passo: 'riepilogo', mappaturaPasti: { pranzo: 's-1' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [], ...extra,
  });
  const righe = (s: ScrittureImport) => s.piattiDaCreare[0].righe;
  const OGGI = '2026-10-05';

  it('il cambio accettato: la riga resta in g, e il cambio va nelle scritture col fattore g per pz', () => {
    const s = traduciBozza(pianoCon([riga('zucchine', 150, 'g')]), stato(), [ZUCCHINE], [], OGGI);
    expect(righe(s)).toEqual([{ ingredientId: 'i-zucc', quantita: 150, unita: 'g' }]);
    expect(s.cambiUnita).toEqual([{ ingredientId: 'i-zucc', nome: 'Zucchine', da: 'pz', a: 'g', pesoPezzo: 200, fattore: 200 }]);
    expect(s.ingredientiDaCreare).toEqual([]);
  });

  it('«Tienile a pezzi»: la riga si converte, arrotondata al quarto, e nessun cambio', () => {
    const s = traduciBozza(pianoCon([riga('zucchine', 150, 'g')]), stato({ cambiUnita: { 'i-zucc': { tieni: true, pesoPezzo: null } } }), [ZUCCHINE], [], OGGI);
    expect(righe(s)).toEqual([{ ingredientId: 'i-zucc', quantita: 0.75, unita: 'pz' }]);
    expect(s.cambiUnita).toEqual([]);
  });

  it('da g a pz il fattore è l\'inverso del peso', () => {
    const s = traduciBozza(pianoCon([riga('uova', 2, 'pz')]), stato(), [ingrediente('i-uova', 'Uova', 'g')], [], OGGI);
    expect(s.cambiUnita).toEqual([{ ingredientId: 'i-uova', nome: 'Uova', da: 'g', a: 'pz', pesoPezzo: 60, fattore: 1 / 60 }]);
    expect(righe(s)).toEqual([{ ingredientId: 'i-uova', quantita: 2, unita: 'pz' }]);
  });

  it('senza il peso di un pezzo non si scrive; col peso scritto sì', () => {
    const cavolo = ingrediente('i-cav', 'Cavolo nero', 'pz');
    const piano = pianoCon([riga('cavolo nero', 200, 'g')]);
    expect(() => traduciBozza(piano, stato(), [cavolo], [], OGGI)).toThrow('Manca il peso di un pezzo di "Cavolo nero"');
    const s = traduciBozza(piano, stato({ cambiUnita: { 'i-cav': { tieni: false, pesoPezzo: 300 } } }), [cavolo], [], OGGI);
    expect(s.cambiUnita[0]).toMatchObject({ pesoPezzo: 300, fattore: 300 });
  });

  it('il q.b.: senza quantità, nell\'unità dell\'ingrediente; e un ingrediente nuovo se non c\'è', () => {
    const piano = pianoCon([riga('sale', null, null, 'sale q.b.')]);
    expect(righe(traduciBozza(piano, stato(), [ingrediente('i-sale', 'Sale', 'g')], [], OGGI))).toEqual([{ ingredientId: 'i-sale', quantita: null, unita: 'g' }]);
    const nuovo = proponi('sale', null);
    const s = traduciBozza(piano, stato({ ingredientiNuovi: [nuovo] }), [], [], OGGI);
    expect(righe(s)).toEqual([{ nuovoAlimento: 'sale', quantita: null, unita: 'g' }]);
    expect(s.ingredientiDaCreare).toEqual([nuovo]);
  });

  it('senza quantità e senza q.b. ferma tutto, come prima', () => {
    // Non una spezia: per sale e pepe senza quantità vale il q.b. (correzione 8c-bis A).
    expect(() => traduciBozza(pianoCon([riga('zucchero', null, null, 'un pizzico di zucchero')]), stato(), [ingrediente('i-zucchero', 'Zucchero', 'g')], [], OGGI))
      .toThrow('Quantità non risolta per "un pizzico di zucchero"');
  });

  it('una spezia senza quantità passa q.b., anche con una stima del lettore (correzione 8c-bis A)', () => {
    const sale = ingrediente('i-sale', 'Sale', 'g');
    expect(righe(traduciBozza(pianoCon([riga('sale', null, null, 'Sale')]), stato(), [sale], [], OGGI))).toEqual([{ ingredientId: 'i-sale', quantita: null, unita: 'g' }]);
    const stimata: RigaEstratta = { alimento: 'sale', quantita: 1, unita: 'g', quantitaInferita: true, testoOriginale: 'Sale' };
    expect(righe(traduciBozza(pianoCon([stimata]), stato(), [sale], [], OGGI))).toEqual([{ ingredientId: 'i-sale', quantita: null, unita: 'g' }]);
  });

  it('un q.b. con la quantità stimata dal lettore si scrive q.b.; una quantità trascritta resta (correzione S1)', () => {
    const sale = ingrediente('i-sale', 'Sale', 'g');
    const stimata: RigaEstratta = { alimento: 'sale', quantita: 2, unita: 'g', quantitaInferita: true, testoOriginale: 'sale q.b.' };
    expect(righe(traduciBozza(pianoCon([stimata]), stato(), [sale], [], OGGI))).toEqual([{ ingredientId: 'i-sale', quantita: null, unita: 'g' }]);
    const trascritta: RigaEstratta = { ...stimata, quantitaInferita: false, testoOriginale: 'sale q.b. 2 g' };
    expect(righe(traduciBozza(pianoCon([trascritta]), stato(), [sale], [], OGGI))).toEqual([{ ingredientId: 'i-sale', quantita: 2, unita: 'g' }]);
  });

  it('q.b. e una quantità sullo stesso ingrediente nello stesso piatto: vale la quantità', () => {
    const s = traduciBozza(pianoCon([riga('sale', null, null, 'sale q.b.'), riga('sale', 2, 'g', 'sale 2 g')]), stato(), [ingrediente('i-sale', 'Sale', 'g')], [], OGGI);
    expect(righe(s)).toEqual([{ ingredientId: 'i-sale', quantita: 2, unita: 'g' }]);
  });

  it('la scelta «nuovo» crea l\'ingrediente anche se il suo nome ne include uno che hai', () => {
    const p = { ...proponi('courgette', 'g'), nome: 'Zucchine trifolate' };
    const piano = pianoCon([riga('courgette', 100, 'g')]);
    const esistenti = [ingrediente('i-z', 'Zucchine', 'g')];
    // Senza scelta, come prima: il nome include «Zucchine», e la riga finisce lì.
    expect(righe(traduciBozza(piano, stato({ ingredientiNuovi: [p] }), esistenti, [], OGGI))).toEqual([{ ingredientId: 'i-z', quantita: 100, unita: 'g' }]);
    const s = traduciBozza(piano, stato({ ingredientiNuovi: [p], scelti: { courgette: SCELTA_NUOVO } }), esistenti, [], OGGI);
    expect(righe(s)).toEqual([{ nuovoAlimento: 'courgette', quantita: 100, unita: 'g' }]);
    expect(s.ingredientiDaCreare).toEqual([p]);
  });

  it('un nuovo «intero» in g o ml si scrive «porzionabile»; a pezzi resta «intero» (review finale, I3)', () => {
    // La rete per una bozza salvata prima della correzione della tabella: «intero» = formato 1 a
    // pezzi, in g conterebbe una confezione per grammo.
    const inG = { ...proponi('ricotta', 'g'), classeResiduo: 'intero' as const };
    const inMl = { ...proponi('latte', 'ml'), classeResiduo: 'intero' as const };
    const aPezzi = { ...proponi('uova', 'pz'), classeResiduo: 'intero' as const };
    const piano = pianoCon([riga('ricotta', 100, 'g'), riga('latte', 150, 'ml'), riga('uova', 2, 'pz')]);
    const s = traduciBozza(piano, stato({ ingredientiNuovi: [inG, inMl, aPezzi] }), [], [], OGGI);
    expect(s.ingredientiDaCreare).toEqual([
      { ...inG, classeResiduo: 'porzionabile' },
      { ...inMl, classeResiduo: 'porzionabile' },
      aPezzi,
    ]);
  });

  it('riassuntoScritture: nuovi, aggiornati, tolti, ingredienti, cambi, e se c\'è un piano attuale (spec 8c §H)', () => {
    const base = traduciBozza(pianoCon([riga('zucchine', 150, 'g')]), stato(), [ZUCCHINE], [], OGGI);
    expect(riassuntoScritture(base)).toEqual({ piattiNuovi: 1, piattiAggiornati: 0, piattiTolti: 0, ingredientiNuovi: 0, cambi: base.cambiUnita, pianoAttuale: false });
    const conVecchi: ScrittureImport = { ...base, piattiDaDisattivare: ['d-1', 'd-2'], piattiDaCreare: [{ ...base.piattiDaCreare[0], riusaDishId: 'd-0' }] };
    expect(riassuntoScritture(conVecchi)).toMatchObject({ piattiNuovi: 0, piattiAggiornati: 1, piattiTolti: 2, pianoAttuale: true });
  });

  it('«Tienile» da g a pz: le uova restano in g, la riga a pezzi si converte col peso, e nessun cambio', () => {
    const s = traduciBozza(pianoCon([riga('uova', 2, 'pz')]), stato({ cambiUnita: { 'i-uova': { tieni: true, pesoPezzo: null } } }), [ingrediente('i-uova', 'Uova', 'g')], [], OGGI);
    expect(righe(s)).toEqual([{ ingredientId: 'i-uova', quantita: 120, unita: 'g' }]);
    expect(s.cambiUnita).toEqual([]);
  });

  describe('l\'unità finale viene dalle righe della dieta, mai dall\'unità di oggi (ruling 8c, Task 8, fix 1)', () => {
    /** Lo stato del database dopo la RPC: l'ingrediente nell'unità nuova, e il piatto del primo giro già scritto. */
    const dopoLaRpc = (ing: Ingredient, unita: Ingredient['unitaBase'], righePiatto: RigaTradotta[]) => {
      const convertito = { ...ing, unitaBase: unita };
      const piatto: Dish = {
        id: 'd-1', nome: 'Pasta al pomodoro', slotDefId: 's-1', fonte: 'nutrizionista', attivo: true, descrizione: null,
        settimanaCiclo: null, giornoCiclo: null, componenti: [],
        ingredienti: righePiatto.map((r) => ({ ingredientId: (r as { ingredientId: string }).ingredientId, quantita: r.quantita, unita: r.unita })),
      };
      return { esistenti: [convertito], repertorio: [piatto] };
    };

    it('(a) il ritentativo dopo la RPC: «courgette» legata per scelta alle zucchine, nessun cambio inverso e righe identiche', () => {
      const piano = pianoCon([riga('zucchine', 150, 'g'), riga('courgette', 1, 'pz')]);
      const st = stato({ ingredientiNuovi: [{ ...proponi('courgette', 'pz'), nome: 'Courgette' }], scelti: { courgette: 'i-zucc' } });
      const primo = traduciBozza(piano, st, [ZUCCHINE], [], OGGI);
      // Pari merito fra g e pz: vince la prima riga del piano, in g.
      expect(primo.cambiUnita).toEqual([{ ingredientId: 'i-zucc', nome: 'Zucchine', da: 'pz', a: 'g', pesoPezzo: 200, fattore: 200 }]);
      expect(righe(primo)).toEqual([{ ingredientId: 'i-zucc', quantita: 350, unita: 'g' }]);
      expect(primo.ingredientiDaCreare).toEqual([]);

      const { esistenti, repertorio } = dopoLaRpc(ZUCCHINE, 'g', righe(primo));
      const secondo = traduciBozza(piano, st, esistenti, repertorio, OGGI);
      expect(secondo.cambiUnita).toEqual([]);
      expect(righe(secondo)).toEqual(righe(primo));
      expect(secondo.piattiDaCreare[0].riusaDishId).toBe('d-1');
    });

    it('(b) «zucchine grigliate» per inclusione: al ritentativo resta sulle zucchine, niente «Ingrediente non risolto»', () => {
      const piano = pianoCon([riga('zucchine', 150, 'g'), riga('zucchine grigliate', 1, 'pz')]);
      const primo = traduciBozza(piano, stato(), [ZUCCHINE], [], OGGI);
      expect(primo.cambiUnita).toEqual([expect.objectContaining({ ingredientId: 'i-zucc', da: 'pz', a: 'g', fattore: 200 })]);
      expect(righe(primo)).toEqual([{ ingredientId: 'i-zucc', quantita: 350, unita: 'g' }]);

      const { esistenti, repertorio } = dopoLaRpc(ZUCCHINE, 'g', righe(primo));
      const secondo = traduciBozza(piano, stato(), esistenti, repertorio, OGGI);
      expect(secondo.cambiUnita).toEqual([]);
      expect(righe(secondo)).toEqual(righe(primo));
    });

    it('righe miste su un ingrediente già nell\'unità che prevale: nessun cambio, l\'altra riga convertita (concern 1)', () => {
      const piano = pianoCon([riga('zucchine', 150, 'g'), riga('zucchine', 1, 'pz')]);
      const s = traduciBozza(piano, stato(), [ingrediente('i-zucc', 'Zucchine', 'g')], [], OGGI);
      expect(s.cambiUnita).toEqual([]);
      expect(righe(s)).toEqual([{ ingredientId: 'i-zucc', quantita: 350, unita: 'g' }]);
    });

    it('vince l\'unità più frequente, anche contro la prima riga: due righe a pezzi e una in g restano a pezzi', () => {
      const piano = pianoCon([riga('zucchine', 150, 'g'), riga('zucchine', 1, 'pz'), riga('zucchine', 2, 'pz')]);
      const s = traduciBozza(piano, stato(), [ZUCCHINE], [], OGGI);
      expect(s.cambiUnita).toEqual([]);
      expect(righe(s)).toEqual([{ ingredientId: 'i-zucc', quantita: 3.75, unita: 'pz' }]);
    });

    it('righe miste senza il peso di un pezzo: ferma tutto anche senza cambio di unità; col peso scritto si scrive', () => {
      const cavolo = ingrediente('i-cav', 'Cavolo nero', 'g');
      const piano = pianoCon([riga('cavolo nero', 200, 'g'), riga('cavolo nero', 1, 'pz')]);
      expect(() => traduciBozza(piano, stato(), [cavolo], [], OGGI)).toThrow('Manca il peso di un pezzo di "Cavolo nero"');
      const s = traduciBozza(piano, stato({ cambiUnita: { 'i-cav': { tieni: false, pesoPezzo: 300 } } }), [cavolo], [], OGGI);
      expect(s.cambiUnita).toEqual([]);
      expect(righe(s)).toEqual([{ ingredientId: 'i-cav', quantita: 500, unita: 'g' }]);
    });

    it('(c) una proposta nuova con righe in g e in pz: l\'unità più frequente, l\'altra riga convertita col peso della tabella', () => {
      const piano = pianoCon([riga('zucchine romanesche', 1, 'pz'), riga('zucchine romanesche', 150, 'g'), riga('zucchine romanesche', 100, 'g')]);
      const proposte = calcolaProposte(piano, stato(), []);
      expect(proposte.map((p) => p.unitaBase)).toEqual(['g']);
      const st = stato({ ingredientiNuovi: proposte });
      expect(passoBloccato(proposte, [], {}, cambiUnita(piano, st, []), pesiProposte(piano, st, []))).toBe(false);
      const s = traduciBozza(piano, st, [], [], OGGI);
      expect(righe(s)).toEqual([{ nuovoAlimento: 'zucchine romanesche', quantita: 450, unita: 'g' }]);
      expect(s.ingredientiDaCreare).toEqual(proposte);
      expect(s.cambiUnita).toEqual([]);
    });

    it('(c) senza il peso in tabella la proposta ha il motivo «peso»; col peso scritto per l\'alimento si scrive', () => {
      const piano = pianoCon([riga('cavolo nero', 200, 'g'), riga('cavolo nero', 1, 'pz')]);
      const proposte = calcolaProposte(piano, stato(), []);
      const st = stato({ ingredientiNuovi: proposte });
      const pesi = pesiProposte(piano, st, []);
      expect(pesi).toEqual([{ alimento: 'cavolo nero', nome: 'Cavolo nero', pesoPezzo: null, pesoDaTabella: false }]);
      expect(motiviBlocco(proposte, [], {}, [], pesi).get('cavolo nero')).toEqual(['peso']);
      expect(() => traduciBozza(piano, st, [], [], OGGI)).toThrow('Manca il peso di un pezzo di "Cavolo nero"');
      const conPeso = stato({ ingredientiNuovi: proposte, cambiUnita: { 'cavolo nero': { tieni: false, pesoPezzo: 300 } } });
      expect(motiviBlocco(proposte, [], {}, [], pesiProposte(piano, conPeso, [])).size).toBe(0);
      expect(righe(traduciBozza(piano, conPeso, [], [], OGGI))).toEqual([{ nuovoAlimento: 'cavolo nero', quantita: 500, unita: 'g' }]);
    });

    it('(c) al ritentativo l\'ingrediente creato dalla proposta ritrova il peso scritto per l\'alimento', () => {
      const piano = pianoCon([riga('cavolo nero', 200, 'g'), riga('cavolo nero', 1, 'pz')]);
      const proposte = calcolaProposte(piano, stato(), []);
      const st = stato({ ingredientiNuovi: proposte, cambiUnita: { 'cavolo nero': { tieni: false, pesoPezzo: 300 } } });
      const creato = ingrediente('i-nuovo', 'Cavolo nero', 'g');
      const s = traduciBozza(piano, st, [creato], [], OGGI);
      expect(s.ingredientiDaCreare).toEqual([]);
      expect(s.cambiUnita).toEqual([]);
      expect(righe(s)).toEqual([{ ingredientId: 'i-nuovo', quantita: 500, unita: 'g' }]);
    });
  });
});
