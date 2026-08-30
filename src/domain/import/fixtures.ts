import type { EsitoEstrazione, PianoEstratto } from './types';

/** 2 settimane × 2 giorni, con: componente a opzioni, piatti sorella, quantita null, condimenti. Tutto inventato. */
export const PIANO_MENU_SETTIMANALE: PianoEstratto = {
  archetipo: 'menu_settimanale',
  fonte: 'fixture sintetico',
  noteEstrazione: ['dati inventati per i test'],
  settimane: [
    {
      numero: 1,
      giorni: [
        {
          giorno: 0,
          titolo: null,
          pasti: [
            {
              nomeOriginale: 'colazione',
              piatti: [{
                nome: 'Porridge', descrizione: null, componenti: [],
                righeFisse: [
                  { alimento: "fiocchi d'avena", quantita: 30, unita: 'g', quantitaInferita: false, testoOriginale: "30g fiocchi d'avena" },
                  { alimento: 'latte parzialmente scremato', quantita: 150, unita: 'ml', quantitaInferita: false, testoOriginale: '150ml latte parz. scremato' },
                ],
              }],
            },
            {
              nomeOriginale: 'cena',
              piatti: [{
                nome: 'Tacchino con pane', descrizione: null,
                righeFisse: [{ alimento: 'fesa di tacchino', quantita: 120, unita: 'g', quantitaInferita: false, testoOriginale: 'Fesa di tacchino (120g)' }],
                componenti: [{
                  nome: 'pane',
                  nota: null,
                  opzioni: [
                    [{ alimento: 'pane integrale', quantita: 60, unita: 'g', quantitaInferita: false, testoOriginale: 'pane integrale (60g)' }],
                    [{ alimento: 'pane di segale', quantita: 60, unita: 'g', quantitaInferita: false, testoOriginale: 'o di segale (60g)' }],
                  ],
                }],
              }],
            },
            {
              nomeOriginale: 'condimenti',
              piatti: [{
                nome: 'Condimenti', descrizione: null, componenti: [],
                righeFisse: [{ alimento: 'olio extravergine di oliva', quantita: 20, unita: 'ml', quantitaInferita: false, testoOriginale: 'Olio EVO (20ml - 4 cucchiaini)' }],
              }],
            },
          ],
        },
        {
          giorno: 1,
          titolo: null,
          pasti: [
            {
              nomeOriginale: 'colazione',
              piatti: [{
                nome: 'Porridge', descrizione: null, componenti: [],
                righeFisse: [
                  { alimento: "fiocchi d'avena", quantita: 30, unita: 'g', quantitaInferita: false, testoOriginale: "30g fiocchi d'avena" },
                  { alimento: 'latte parzialmente scremato', quantita: 150, unita: 'ml', quantitaInferita: false, testoOriginale: '150ml latte parz. scremato' },
                ],
              }],
            },
            {
              nomeOriginale: 'cena',
              piatti: [
                {
                  nome: 'Merluzzo', descrizione: null, componenti: [],
                  righeFisse: [
                    { alimento: 'filetto di merluzzo', quantita: 120, unita: 'g', quantitaInferita: false, testoOriginale: 'Filetto di merluzzo (120g)' },
                    { alimento: 'olive taggiasche', quantita: null, unita: null, quantitaInferita: false, testoOriginale: '2-3 olive taggiasche' },
                  ],
                },
                {
                  nome: 'Tonno in insalata', descrizione: null, componenti: [],
                  righeFisse: [{ alimento: 'tonno al naturale', quantita: 50, unita: 'g', quantitaInferita: false, testoOriginale: 'tonno al naturale (50g)' }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      numero: 2,
      giorni: [{
        giorno: 0,
        titolo: null,
        pasti: [{
          nomeOriginale: 'colazione',
          piatti: [{
            nome: 'Yogurt e frutta', descrizione: null, componenti: [],
            righeFisse: [{ alimento: 'yogurt greco', quantita: 150, unita: 'g', quantitaInferita: false, testoOriginale: 'Yogurt greco (150g)' }],
          }],
        }],
      }],
    },
  ],
};

export const FIXTURE_MENU_SETTIMANALE: EsitoEstrazione = { tipo: 'piano', piano: PIANO_MENU_SETTIMANALE };

/** Giornata unica già espansa dall'estrattore in 7 giorni identici (qui 2 per brevità dei test). */
export const PIANO_GIORNATA_UNICA: PianoEstratto = {
  archetipo: 'giornata_unica',
  fonte: 'fixture sintetico',
  noteEstrazione: [],
  settimane: [{
    numero: 1,
    giorni: [0, 1].map((giorno) => ({
      giorno,
      titolo: null,
      pasti: [{
        nomeOriginale: 'pranzo',
        piatti: [{
          nome: 'Pasta al pomodoro', descrizione: null, componenti: [],
          righeFisse: [{ alimento: 'pasta di semola', quantita: 80, unita: 'g', quantitaInferita: false, testoOriginale: 'pasta 80g' }],
        }],
      }],
    })),
  }],
};

export const FIXTURE_GIORNATA_UNICA: EsitoEstrazione = { tipo: 'piano', piano: PIANO_GIORNATA_UNICA };

export const FIXTURE_RIFIUTO_MACRO: EsitoEstrazione = {
  tipo: 'rifiuto',
  rifiuto: {
    archetipo: 'solo_macro',
    motivazione: 'La dieta prescrive target di proteine, carboidrati e grassi per pasto, senza alimenti: non c\'è un menu da cui derivare una lista della spesa.',
  },
};
