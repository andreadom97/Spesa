import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient } from '@/domain/types';
import { traduciBozza, BozzaIncompletaError } from '../commit';
import type { StatoRevisione } from '../types';
import { PIANO_MENU_SETTIMANALE, PIANO_GIORNATA_UNICA } from '../fixtures';

const AVENA: Ingredient = { id: 'i-avena', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 };

function statoCompleto(): StatoRevisione {
  // Mappa tutti i nomi pasto del fixture, risolve la riga "2-3 olive" e dichiara i nuovi.
  const oliveRisolte = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
  oliveRisolte.piatti[0].righeFisse[1] = { alimento: 'olive taggiasche', quantita: 3, unita: 'pz', testoOriginale: '2-3 olive taggiasche' };
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
    expect(cene.map((p) => p.giornoCiclo).sort()).toEqual([0, 1, 1]);
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

  it('disattiva i piatti nutrizionista non riusati, mai i propri', () => {
    const vecchio: Dish = { id: 'd-old', nome: 'Vecchio piatto', slotDefId: 's-cena', fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [] };
    const proprio: Dish = { ...vecchio, id: 'd-mio', nome: 'Piatto mio', fonte: 'proprio' };
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [vecchio, proprio], '2026-08-29');
    expect(s.piattiDaDisattivare).toEqual(['d-old']);
  });

  it('gli ingredienti nuovi non usati da nessuna riga non si creano', () => {
    const stato = statoCompleto();
    stato.ingredientiNuovi.push({ alimento: 'zafferano', nome: 'Zafferano', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 1 });
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, stato, [AVENA], [], '2026-08-29');
    expect(s.ingredientiDaCreare.some((i) => i.alimento === 'zafferano')).toBe(false);
  });
});
