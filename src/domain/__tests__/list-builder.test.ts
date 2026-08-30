import { describe, it, expect } from 'vitest';
import { costruisciLista, IngredienteMancanteError, OrdineAreeNonValidoError } from '../list-builder';
import { UnitaIncompatibileError } from '../unita';
import {
  INGREDIENTI, PIATTI, IMPOSTAZIONI, dispensaVuota, cinqueColazioni,
  colazione, wrap,
} from './fixtures';

const OGGI = '2026-08-30';

function base(over: Partial<Parameters<typeof costruisciLista>[0]> = {}) {
  return costruisciLista({
    slots: cinqueColazioni(),
    dishes: PIATTI,
    ingredients: INGREDIENTI,
    pantry: dispensaVuota(),
    impostazioni: IMPOSTAZIONI,
    oggi: OGGI,
    ...over,
  });
}

function voce(r: ReturnType<typeof costruisciLista>, id: string) {
  return [...r.base, ...r.topup].flatMap((s) => s.voci).find((v) => v.ingredientId === id);
}

describe('costruisciLista — aggregazione', () => {
  it('somma le porzioni degli slot a casa', () => {
    expect(voce(base(), 'yogurt')!.fabbisogno).toBe(750); // 150 × 5
  });

  it('ignora gli slot fuori casa: quel piatto non consuma', () => {
    const slots = cinqueColazioni();
    slots[0].stato = 'fuori';
    expect(voce(base({ slots }), 'yogurt')!.fabbisogno).toBe(600); // 150 × 4
  });

  it('ignora gli slot senza piatto assegnato', () => {
    const slots = cinqueColazioni();
    slots[0].dishId = null;
    expect(voce(base({ slots }), 'yogurt')!.fabbisogno).toBe(600);
  });

  it('applica il moltiplicatore porzioni per cucinare in due', () => {
    const impostazioni = { ...IMPOSTAZIONI, moltiplicatorePorzioni: 2 };
    expect(voce(base({ impostazioni }), 'yogurt')!.fabbisogno).toBe(1500);
  });

  it('il fabbisogno segue fattoreConsumo: porzioni preparate moltiplicano, daPronti azzera', () => {
    // Fixture: cinqueColazioni() sono 5 slot 'casa' col piatto colazione-yogurt
    // (150 g yogurt ciascuno) → fabbisogno base 750 (visto sopra). Qui si
    // altera un solo slot per volta e si osserva lo scarto.
    const conPreparate = cinqueColazioni();
    conPreparate[0].porzioniPreparate = 2; // fattore 1 + 2 = 3 invece di 1
    // quello slot contribuisce 150×3=450 anziché 150: 450 + 150×4 = 1050
    expect(voce(base({ slots: conPreparate }), 'yogurt')!.fabbisogno).toBe(1050);

    const conDaPronti = cinqueColazioni();
    conDaPronti[0].daPronti = true; // fattore 0 + 0 = 0: quello slot non consuma
    // 150×4 = 600 (il quinto slot non contribuisce più nulla)
    expect(voce(base({ slots: conDaPronti }), 'yogurt')!.fabbisogno).toBe(600);
  });

  it('normalizza le unità miste sullo stesso ingrediente', () => {
    const dishes = [{
      ...colazione,
      ingredienti: [
        { ingredientId: 'yogurt', quantita: 150, unita: 'g' as const },
        { ingredientId: 'yogurt', quantita: 0.1, unita: 'kg' as const },
      ],
    }];
    expect(voce(base({ dishes }), 'yogurt')!.fabbisogno).toBe(1250); // (150 + 100) × 5
  });

  it('rifiuta un\'unità incompatibile invece di indovinare', () => {
    const dishes = [{
      ...colazione,
      ingredienti: [{ ingredientId: 'uova', quantita: 100, unita: 'g' as const }],
    }];
    expect(() => base({ dishes })).toThrow(UnitaIncompatibileError);
  });

  it('segnala un ingrediente che il piatto cita ma che non esiste', () => {
    const dishes = [{
      ...colazione,
      ingredienti: [{ ingredientId: 'fantasma', quantita: 1, unita: 'g' as const }],
    }];
    expect(() => base({ dishes })).toThrow(IngredienteMancanteError);
  });
});

describe('costruisciLista — residuo e confezioni', () => {
  it('sottrae il residuo dal fabbisogno', () => {
    const pantry = dispensaVuota().map((p) =>
      p.ingredientId === 'yogurt' ? { ...p, residuo: 50 } : p);
    const v = voce(base({ pantry }), 'yogurt')!;
    expect(v.fabbisogno).toBe(750);
    expect(v.residuo).toBe(50);
    expect(v.daComprare).toBe(700);
  });

  it('arrotonda per eccesso a confezioni intere', () => {
    const v = voce(base(), 'yogurt')!;
    expect(v.daComprare).toBe(750);
    expect(v.confezioni).toBe(2);       // ceil(750 / 500)
    expect(v.quantitaTotale).toBe(1000);
  });

  it('calcola il residuo che resterà a fine settimana', () => {
    // Il caso yogurt della spec: 50 in casa, servono 750, compri 1000 → restano 300.
    const pantry = dispensaVuota().map((p) =>
      p.ingredientId === 'yogurt' ? { ...p, residuo: 50 } : p);
    expect(voce(base({ pantry }), 'yogurt')!.residuoPrevisto).toBe(300);
  });

  it('sparisce dalla lista quando il residuo copre già tutto', () => {
    const pantry = dispensaVuota().map((p) =>
      p.ingredientId === 'avena' ? { ...p, residuo: 900 } : p);
    expect(voce(base({ pantry }), 'avena')).toBeUndefined();
  });

  it('conta la classe intero a pezzi, con formato uno', () => {
    const slots = [{
      id: 'c1', data: '2026-08-31', slotDefId: 'cen', stato: 'casa' as const,
      dishId: 'cena-frittata', fonteStato: 'default' as const,
      scelte: {},
      porzioniPreparate: 0, daPronti: false,
    }];
    const v = voce(base({ slots }), 'uova')!;
    expect(v.confezioni).toBe(3);
    expect(v.quantitaTotale).toBe(3);
    expect(v.unita).toBe('pz');
  });

  it('non mette mai in lista un ingrediente di classe stima', () => {
    const slots = [{
      id: 'c1', data: '2026-08-31', slotDefId: 'cen', stato: 'casa' as const,
      dishId: 'cena-frittata', fonteStato: 'default' as const,
      scelte: {},
      porzioniPreparate: 0, daPronti: false,
    }];
    expect(voce(base({ slots }), 'olio')).toBeUndefined();
  });
});

describe('costruisciLista — controlli staple', () => {
  it('chiede dell\'olio dopo novanta giorni, anche se non è in nessun piatto', () => {
    const pantry = dispensaVuota().map((p) =>
      p.ingredientId === 'olio' ? { ...p, ultimoAcquisto: '2026-01-10' } : p);
    const controlli = base({ pantry }).base.flatMap((s) => s.controlli);
    expect(controlli.map((c) => c.ingredientId)).toEqual(['olio']);
  });

  it('non chiede niente prima dei novanta giorni', () => {
    const pantry = dispensaVuota().map((p) =>
      p.ingredientId === 'olio' ? { ...p, ultimoAcquisto: '2026-08-01' } : p);
    expect(base({ pantry }).base.flatMap((s) => s.controlli)).toHaveLength(0);
  });

  it('mette il controllo nella lista che compete al suo ingrediente', () => {
    const pantry = dispensaVuota().map((p) =>
      p.ingredientId === 'olio' ? { ...p, ultimoAcquisto: '2026-01-10' } : p);
    const r = base({ pantry });
    expect(r.topup.flatMap((s) => s.controlli)).toHaveLength(0); // olio non è deperibile
    expect(r.base.flatMap((s) => s.controlli)).toHaveLength(1);
  });
});

describe('costruisciLista — split e ordinamento', () => {
  it('manda i deperibili nel top-up e il resto nella base', () => {
    const r = base();
    expect(r.topup.flatMap((s) => s.voci).map((v) => v.ingredientId)).toEqual(['yogurt']);
    expect(r.base.flatMap((s) => s.voci).map((v) => v.ingredientId)).toEqual(['avena']);
  });

  it('ordina le sezioni secondo l\'ordine dei reparti scelto dall\'utente', () => {
    const impostazioni = {
      ...IMPOSTAZIONI,
      ordineAree: ['surgelati', 'dispensa', 'cereali', 'latticini', 'macelleria', 'ortofrutta'] as const,
    };
    const pantry = dispensaVuota();
    const slots = [
      ...cinqueColazioni(),
      { id: 'c1', data: '2026-08-31', slotDefId: 'cen', stato: 'casa' as const,
        dishId: 'cena-frittata', fonteStato: 'default' as const, scelte: {},
        porzioniPreparate: 0, daPronti: false },
    ];
    const r = costruisciLista({
      slots, dishes: PIATTI, ingredients: INGREDIENTI, pantry,
      impostazioni: { ...impostazioni, ordineAree: [...impostazioni.ordineAree] },
      oggi: OGGI,
    });
    expect(r.base.map((s) => s.area)).toEqual(['cereali']);
    expect(r.topup.map((s) => s.area)).toEqual(['latticini']);
  });

  it('non produce sezioni vuote', () => {
    const r = base();
    expect([...r.base, ...r.topup].every((s) => s.voci.length + s.controlli.length > 0)).toBe(true);
  });

  it('mette per prima la voce con più confezioni, così la protagonista è l\'acquisto più grosso', () => {
    const slots = [
      ...cinqueColazioni(),
      { id: 'c1', data: '2026-08-31', slotDefId: 'cen', stato: 'casa' as const,
        dishId: 'cena-frittata', fonteStato: 'default' as const, scelte: {},
        porzioniPreparate: 0, daPronti: false },
    ];
    // Nella stessa area: uova 3 confezioni (3 pezzi), yogurt 2 (2 × 500 g).
    // L'ordine è per confezioni, non per importanza percepita dell'ingrediente.
    const sezione = base({ slots }).topup.find((s) => s.area === 'latticini')!;
    expect(sezione.voci.map((v) => v.ingredientId)).toEqual(['uova', 'yogurt']);
  });

  it('a parità di confezioni ordina per nome', () => {
    const ingredients = INGREDIENTI.map((i) =>
      i.id === 'avena' ? { ...i, area: 'cereali' as const } : i);
    const dishes = [{
      ...colazione,
      ingredienti: [
        { ingredientId: 'avena', quantita: 100, unita: 'g' as const },
        { ingredientId: 'passata', quantita: 140, unita: 'g' as const },
      ],
    }];
    // Entrambi 1 confezione: avena 500 g copre 500, passata 700 g copre 700.
    const r = costruisciLista({
      slots: cinqueColazioni(), dishes, ingredients,
      pantry: dispensaVuota(), impostazioni: IMPOSTAZIONI, oggi: OGGI,
    });
    const cereali = r.base.find((s) => s.area === 'cereali')!;
    expect(cereali.voci.every((v) => v.confezioni === 1)).toBe(true);
  });
});

describe('costruisciLista — validazione ordineAree', () => {
  it('rifiuta un ordineAree a cui manca un\'area', () => {
    const impostazioni = {
      ...IMPOSTAZIONI,
      ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa'] as const,
    };
    expect(() => base({ impostazioni: { ...impostazioni, ordineAree: [...impostazioni.ordineAree] } }))
      .toThrow(OrdineAreeNonValidoError);
  });

  it('rifiuta un ordineAree con un\'area duplicata', () => {
    const impostazioni = {
      ...IMPOSTAZIONI,
      ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'dispensa'] as const,
    };
    expect(() => base({ impostazioni: { ...impostazioni, ordineAree: [...impostazioni.ordineAree] } }))
      .toThrow(OrdineAreeNonValidoError);
  });

  it('rifiuta un ordineAree più lungo di sei elementi', () => {
    const impostazioni = {
      ...IMPOSTAZIONI,
      ordineAree: [
        'ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati', 'dispensa',
      ] as const,
    };
    expect(() => base({ impostazioni: { ...impostazioni, ordineAree: [...impostazioni.ordineAree] } }))
      .toThrow(OrdineAreeNonValidoError);
  });

  it('accetta un ordineAree valido anche se diverso dal default', () => {
    const impostazioni = {
      ...IMPOSTAZIONI,
      ordineAree: ['surgelati', 'dispensa', 'cereali', 'latticini', 'macelleria', 'ortofrutta'] as const,
    };
    expect(() => base({ impostazioni: { ...impostazioni, ordineAree: [...impostazioni.ordineAree] } }))
      .not.toThrow();
  });
});

describe('costruisciLista — componenti a scelta', () => {
  it('con una scelta registrata compra per l\'opzione scelta, non per il default', () => {
    const slots = [{
      id: 's1', data: '2026-08-31', slotDefId: 'pra', stato: 'casa' as const,
      dishId: 'pranzo-wrap', fonteStato: 'default' as const,
      scelte: { farcitura: { opzioneId: 'farcitura-uova', fonte: 'planner' as const } },
      porzioniPreparate: 0, daPronti: false,
    }];
    const r = base({ slots, dishes: [...PIATTI, wrap], pantry: dispensaVuota() });
    expect(voce(r, 'avena')).toBeDefined();
    expect(voce(r, 'uova')).toBeDefined();
    expect(voce(r, 'passata')).toBeDefined();
    expect(voce(r, 'yogurt')).toBeUndefined();
  });

  it('senza scelta registrata compra per il default: la prima opzione', () => {
    const slots = [{
      id: 's1', data: '2026-08-31', slotDefId: 'pra', stato: 'casa' as const,
      dishId: 'pranzo-wrap', fonteStato: 'default' as const,
      scelte: {},
      porzioniPreparate: 0, daPronti: false,
    }];
    const r = base({ slots, dishes: [...PIATTI, wrap], pantry: dispensaVuota() });
    expect(voce(r, 'avena')).toBeDefined();
    expect(voce(r, 'yogurt')).toBeDefined();
    expect(voce(r, 'uova')).toBeUndefined();
  });
});
