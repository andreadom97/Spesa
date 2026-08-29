import { giorniTra, lunediDi } from './date';
import { confezioniNecessarie } from './confezioni';
import { righeEffettive } from './opzioni';
import { residuoUtilizzabile } from './pantry';
import { convertiInUnitaBase } from './unita';
import type { ClasseResiduo, Dish, DishIngredient, Ingredient, MealSlot, PantryState, Scelta } from './types';

export interface AssegnaPiattiInput {
  slots: MealSlot[];
  dishes: Dish[];
  /**
   * A che punto del giro è la settimana che si sta pianificando (1..4).
   * `null` o assente = nessun ciclo: i piatti non vengono filtrati, comprese
   * le loro etichette di settimana. Spegnere la rotazione deve tornare al
   * comportamento di prima, non nascondere metà repertorio perché era
   * taggato.
   */
  settimanaCiclo?: number | null;
  /**
   * Quante settimane sono passate dall'origine della rotazione. È l'unica
   * cosa che rende la rotazione continua fra una settimana e l'altra: senza,
   * l'ordinale ripartirebbe da zero ogni lunedì e con quattordici pranzi in
   * repertorio ne userebbe per sempre gli stessi sette.
   */
  settimaneTrascorse?: number;
  /**
   * I quattro input del criterio "residuo prima, rotazione poi". Tutti
   * facoltativi insieme: senza dispensa non c'è costo da confrontare e
   * decide la sola rotazione — il comportamento di prima del design delle
   * alternative.
   */
  ingredients?: Ingredient[];
  pantry?: PantryState[];
  /** ISO yyyy-mm-dd: serve a residuoUtilizzabile per la freschezza. */
  oggi?: string;
  moltiplicatorePorzioni?: number;
}

/** Giorni per settimana: il passo con cui l'ordinale avanza da un lunedì all'altro. */
const GIORNI_SETTIMANA = 7;

/** 0 = lunedì, come `giornoCiclo` e come `assenzeAbituali`. */
function giornoDellaSettimana(data: string): number {
  return giorniTra(lunediDi(data), data);
}

/**
 * La rotazione: deterministica, senza storico e senza preferenze.
 * Assegna solo agli slot a casa ancora vuoti — una scelta fatta a mano dalla
 * schermata "Scegli il piatto" non viene mai sovrascritta.
 *
 * Quattro passaggi, in quest'ordine:
 *
 * 1. **Il ciclo filtra**, se c'è. Restano i piatti di questa settimana del
 *    giro più quelli senza settimana dichiarata. Se il filtro non lascia
 *    niente per un pasto, si ripiega su tutti i piatti di quel pasto: meglio
 *    un piatto fuori giro che una cena vuota, e chi ha taggato solo metà
 *    repertorio non deve vedersi mezza settimana in bianco.
 * 2. **Il giorno fisso vince**, ma può avere più di un piatto ("sorelle")
 *    sullo stesso `giornoCiclo`: fra loro decide chi costa meno confezioni
 *    nuove (§ sotto), non il primo trovato nell'array — la spec vieta di far
 *    dipendere il piano dall'ordine con cui i piatti sono stati salvati.
 * 3. **Il resto ruota**, fra i soli piatti senza giorno fisso: qui nessun
 *    costo si confronta, la rotazione resta pura come prima delle
 *    alternative.
 *
 * Stabile rispetto all'ordine dell'array in ingresso: l'ordinale dipende
 * dalla posizione della data nella sequenza ordinata, non dalla posizione
 * dello slot nell'array. Per il criterio del costo la stabilità è ancora più
 * stretta, ma solo *a parità di consumi precedenti*: fra le sorelle di uno
 * stesso pasto il vincitore per confezioni non dipende dall'ordine con cui
 * sono arrivate nell'array (si ordinano per id prima di confrontarle), ma
 * può dipendere da cosa ha già consumato uno slot libero precedente nella
 * sequenza — quello sì pesca dall'ordine dell'array, com'è sempre stato per
 * la rotazione. A parità di costo il tie-break di rotazione si applica ai
 * soli pari-merito ordinati per `id` — così anche il pareggio resta stabile.
 *
 * ## Il criterio del residuo (sorelle e, dal Task 6, opzioni)
 *
 * `ingredients`, `pantry`, `oggi` e `moltiplicatorePorzioni` sono facoltativi
 * insieme: se mancano non c'è dispensa da consultare e ogni piatto "costa"
 * zero, quindi decide sempre e solo la rotazione — il comportamento di prima
 * di questo criterio.
 *
 * Quando ci sono, si tiene una **copia di lavoro del residuo** (non lo stato
 * reale: qui non si scrive nulla in modo permanente) che si scala man mano
 * che il piano procede giorno per giorno. Il costo in confezioni di un
 * piatto usa il residuo di lavoro rimasto *in quel momento della sequenza*:
 * il pranzo di martedì non trova più disponibile ciò che lunedì ha già
 * impegnato, ma trova l'avanzo della confezione che lunedì ha dovuto aprire.
 * Per questo gli slot si processano in ordine di `(data, slotDefId)` — anche
 * se l'array restituito mantiene l'ordine di input, che resta parte del
 * contratto.
 *
 * ## La risoluzione dei componenti (Task 6)
 *
 * Una volta deciso il piatto (per giorno fisso, sorelle, rotazione libera o
 * perché già scelto a mano), ogni componente a scelta ("oppure" nel piatto)
 * viene risolto con lo stesso criterio: costo minimo in confezioni; a parità
 * vince l'opzione indicata dall'ordinale di rotazione dello slot,
 * nell'ordine d'autore delle opzioni (non per id). Le righe fisse del
 * piatto si consumano prima; poi i componenti, uno alla volta, ciascuno
 * subito dopo la sua scelta — così il componente successivo dello stesso
 * piatto (e il pasto successivo) vedono il residuo già scalato. Una scelta
 * già registrata con `fonte: 'manuale'` non viene mai toccata; una scelta
 * `'planner'` può essere ricalcolata.
 */
export function assegnaPiatti(input: AssegnaPiattiInput): MealSlot[] {
  const settimanaCiclo = input.settimanaCiclo ?? null;
  const settimaneTrascorse = input.settimaneTrascorse ?? 0;
  const moltiplicatore = input.moltiplicatorePorzioni ?? 1;

  const perSlotDef = new Map<string, Dish[]>();
  for (const d of input.dishes) {
    if (!d.attivo) continue;
    const arr = perSlotDef.get(d.slotDefId) ?? [];
    arr.push(d);
    perSlotDef.set(d.slotDefId, arr);
  }

  // Serve a ritrovare il piatto di uno slot già assegnato a mano, per
  // registrarne comunque il consumo prima di valutare gli slot successivi
  // (altrimenti la scalatura sequenziale mentirebbe sul residuo restante).
  const piattoPerId = new Map(input.dishes.map((d) => [d.id, d]));

  // Anagrafica ingredienti per il criterio del costo: assente se
  // `ingredients` non è stato passato, e allora ogni riga risulta
  // sconosciuta e costa zero (vedi costoInConfezioni/consumaDaResiduo).
  const ingredientiPerId = new Map((input.ingredients ?? []).map((i) => [i.id, i]));

  // Il criterio del costo è acceso solo se TUTTI e tre gli input di dispensa
  // sono presenti — sono facoltativi insieme per contratto. Non basta
  // dedurlo da "residuoLavoro non è vuota": con `ingredients` presente ma
  // senza `pantry`/`oggi`, `consumaDaResiduo` popolerebbe comunque la mappa
  // simulando acquisti contro una dispensa fantasma, accendendo il
  // confronto costi in silenzio. Guardia esplicita, usata da entrambe le
  // funzioni sotto.
  const criterioAttivo = Boolean(input.ingredients && input.pantry && input.oggi);

  const residuoLavoro = new Map<string, number>();
  if (input.ingredients && input.pantry && input.oggi) {
    const oggi = input.oggi;
    const dispensaPerId = new Map(input.pantry.map((p) => [p.ingredientId, p]));
    for (const ing of input.ingredients) {
      const statoDispensa = dispensaPerId.get(ing.id);
      residuoLavoro.set(ing.id, residuoUtilizzabile({
        residuo: statoDispensa?.residuo ?? 0,
        deperibile: ing.deperibile,
        area: ing.area,
        ultimoAcquisto: statoDispensa?.ultimoAcquisto ?? null,
        congelato: statoDispensa?.congelato ?? false,
        oggi,
      }));
    }
  }

  /**
   * Il costo in confezioni di un elenco di righe, dato il residuo di lavoro
   * corrente. Riusata dal Task 6 per confrontare le opzioni di un
   * componente con lo stesso criterio.
   *
   * Righe di ingrediente sconosciuto o di classe `stima` non contano: costo
   * zero e nessun conteggio. Il planner non deve mai far fallire la
   * creazione della settimana per un dato mancante — a quello (e all'errore
   * esplicito) pensa il list-builder. Criterio spento (input facoltativi non
   * TUTTI presenti) → zero sempre: tutte le opzioni pari, decide la
   * rotazione.
   */
  function costoInConfezioni(righe: DishIngredient[], residuoLavoro: Map<string, number>): number {
    if (!criterioAttivo) return 0;
    let totale = 0;
    for (const riga of righe) {
      const ing = ingredientiPerId.get(riga.ingredientId);
      if (!ing || ing.classeResiduo === 'stima') continue;
      const fabbisogno = convertiInUnitaBase(riga.quantita, riga.unita, ing.unitaBase) * moltiplicatore;
      const residuo = residuoLavoro.get(riga.ingredientId) ?? 0;
      totale += confezioniNecessarie({
        fabbisogno,
        residuo,
        classeResiduo: ing.classeResiduo as Exclude<ClasseResiduo, 'stima'>,
        formatoConfezione: ing.formatoConfezione,
      }).confezioni;
    }
    return totale;
  }

  /**
   * Scala il residuo di lavoro per le righe di un piatto assegnato: è la
   * scalatura sequenziale che rende il criterio del costo coerente lungo la
   * settimana, non solo pasto per pasto. Se il residuo copre il fabbisogno
   * lo scala; altrimenti simula l'acquisto necessario (stessa aritmetica di
   * `confezioniNecessarie`) e l'avanzo della confezione aperta resta
   * disponibile per il pasto successivo. Riusata dal Task 6 per registrare
   * il consumo dell'opzione davvero scelta in un componente.
   *
   * Criterio spento (input facoltativi non TUTTI presenti) → no-op: senza
   * `pantry`/`oggi` non c'è un residuo reale da cui partire, e simulare
   * comunque un acquisto per la sola presenza di `ingredients` accenderebbe
   * il confronto costi contro una dispensa fantasma.
   */
  function consumaDaResiduo(righe: DishIngredient[], residuoLavoro: Map<string, number>): void {
    if (!criterioAttivo) return;
    for (const riga of righe) {
      const ing = ingredientiPerId.get(riga.ingredientId);
      if (!ing || ing.classeResiduo === 'stima') continue;
      const fabbisogno = convertiInUnitaBase(riga.quantita, riga.unita, ing.unitaBase) * moltiplicatore;
      const residuo = residuoLavoro.get(riga.ingredientId) ?? 0;
      if (residuo >= fabbisogno) {
        residuoLavoro.set(riga.ingredientId, residuo - fabbisogno);
        continue;
      }
      const { quantitaTotale } = confezioniNecessarie({
        fabbisogno,
        residuo,
        classeResiduo: ing.classeResiduo as Exclude<ClasseResiduo, 'stima'>,
        formatoConfezione: ing.formatoConfezione,
      });
      residuoLavoro.set(riga.ingredientId, residuo + quantitaTotale - fabbisogno);
    }
  }

  /**
   * Task 6: risolve le opzioni dei componenti di un piatto al check-in. Per
   * ogni componente senza una scelta 'manuale' già registrata, sceglie
   * l'opzione che costa meno confezioni nuove; a parità vince l'opzione
   * indicata da `posizioneRotazione % opzioni.length`, nell'ordine d'autore
   * delle opzioni (non per id: la posizione è già una scelta d'autore, la
   * prima è il default). Consuma la riga scelta dal residuo di lavoro subito
   * dopo averla decisa — un componente alla volta — così il componente
   * successivo dello stesso piatto vede il residuo già scalato.
   *
   * Le scelte con fonte 'manuale' non si toccano mai: `scelte[componente.id]`
   * non si riscrive. Ma quel pasto si mangia lo stesso, quindi la riga scelta
   * a mano consuma comunque il residuo di lavoro — altrimenti la scalatura
   * sequenziale mentirebbe ai pasti successivi su quanto è rimasto.
   * Un'opzione manuale che punta a un id non più esistente nel piatto non
   * consuma nulla (fallback silenzioso): all'errore esplicito ci pensa
   * `righeEffettive`, non il planner. Riusata su tutti i rami che assegnano o
   * trovano un piatto (sorelle, rotazione libera, slot scelto a mano): il
   * `dishId` non viene mai toccato qui, solo `scelte`.
   */
  function risolviComponenti(
    piatto: Dish,
    scelteEsistenti: Record<string, Scelta>,
    posizioneRotazione: number,
    residuoLavoro: Map<string, number>,
  ): Record<string, Scelta> {
    const scelte: Record<string, Scelta> = { ...scelteEsistenti };
    for (const componente of piatto.componenti) {
      const esistente = scelte[componente.id];
      if (esistente?.fonte === 'manuale') {
        // Non si sovrascrive la scelta, ma il pasto si mangia lo stesso: la
        // riga dell'opzione scelta a mano va comunque scalata dal residuo.
        const opzioneScelta = componente.opzioni.find((o) => o.id === esistente.opzioneId);
        if (opzioneScelta) consumaDaResiduo(opzioneScelta.righe, residuoLavoro);
        continue;
      }
      let migliore = componente.opzioni[0];
      let costoMigliore = Infinity;
      componente.opzioni.forEach((opzione, i) => {
        const costo = costoInConfezioni(opzione.righe, residuoLavoro);
        // A parità vince l'opzione indicata dall'ordinale di rotazione,
        // nell'ordine d'autore delle opzioni. Modulo normalizzato come per
        // le altre due occorrenze in questo file: posizioneRotazione può
        // essere negativo (settimaneTrascorse negativo è un caso testato).
        const n = componente.opzioni.length;
        const preferita = i === ((posizioneRotazione % n) + n) % n;
        if (costo < costoMigliore || (costo === costoMigliore && preferita)) {
          migliore = opzione;
          costoMigliore = costo;
        }
      });
      scelte[componente.id] = { opzioneId: migliore.id, fonte: 'planner' };
      consumaDaResiduo(migliore.righe, residuoLavoro);
    }
    return scelte;
  }

  // Calcola le sequenze di date ordinate per ogni slotDef (solo slot a casa).
  // Usato per determinare l'ordinale di rotazione indipendente dall'ordine dell'array.
  const datesPerSlotDef = new Map<string, string[]>();
  for (const slot of input.slots) {
    if (slot.stato !== 'casa') continue;
    const arr = datesPerSlotDef.get(slot.slotDefId) ?? [];
    if (!arr.includes(slot.data)) arr.push(slot.data);
    datesPerSlotDef.set(slot.slotDefId, arr);
  }
  for (const [slotDefId, dates] of datesPerSlotDef) {
    datesPerSlotDef.set(slotDefId, dates.sort());
  }

  /** L'ordinale di rotazione per uno slot: stabile rispetto all'ordine dell'array. */
  function ordinale(slot: MealSlot): number {
    const datesSequence = datesPerSlotDef.get(slot.slotDefId) ?? [];
    return settimaneTrascorse * GIORNI_SETTIMANA + datesSequence.indexOf(slot.data);
  }

  // Si processa in ordine di (data, slotDefId): la scalatura del residuo di
  // lavoro deve seguire la sequenza reale dei pasti, non l'ordine in cui gli
  // slot sono arrivati nell'array. L'array restituito mantiene però l'ordine
  // di input: fa parte del contratto attuale.
  const risultato: MealSlot[] = [...input.slots];
  const indiciOrdinati = input.slots
    .map((_, indice) => indice)
    .sort((a, b) => {
      const sa = input.slots[a];
      const sb = input.slots[b];
      return sa.data.localeCompare(sb.data) || sa.slotDefId.localeCompare(sb.slotDefId);
    });

  for (const indice of indiciOrdinati) {
    const slot = input.slots[indice];
    if (slot.stato !== 'casa') continue; // niente consumo: non si mangia in casa

    if (slot.dishId !== null) {
      // Scelto a mano: il dishId non si tocca, ma i suoi componenti si
      // risolvono comunque (Task 6), e il consumo va registrato in ogni
      // caso, altrimenti i pasti successivi vedrebbero un residuo che non
      // c'è più.
      const piatto = piattoPerId.get(slot.dishId);
      if (piatto) {
        consumaDaResiduo(piatto.ingredienti, residuoLavoro);
        const scelte = risolviComponenti(piatto, slot.scelte, ordinale(slot), residuoLavoro);
        risultato[indice] = { ...slot, scelte };
      }
      continue;
    }

    const tutti = perSlotDef.get(slot.slotDefId);
    if (!tutti || tutti.length === 0) continue;

    const delCiclo = settimanaCiclo === null
      ? tutti
      : tutti.filter((d) => d.settimanaCiclo === null || d.settimanaCiclo === settimanaCiclo);
    const candidati = delCiclo.length > 0 ? delCiclo : tutti;

    const giorno = giornoDellaSettimana(slot.data);
    const fissati = candidati.filter((d) => d.giornoCiclo === giorno);

    let scelto: Dish;
    if (fissati.length === 1) {
      scelto = fissati[0];
    } else if (fissati.length > 1) {
      // Le sorelle: si confrontano ordinate per id, così il vincitore per
      // costo non dipende dall'ordine con cui sono arrivate nell'array, e il
      // tie-break di rotazione (qui sotto) resta stabile allo stesso modo.
      const ordinatiPerId = [...fissati].sort((a, b) => a.id.localeCompare(b.id));
      let costoMigliore = Infinity;
      let pariMerito: Dish[] = [];
      for (const d of ordinatiPerId) {
        // Le opzioni si valutano col default: la risoluzione fine dei
        // componenti (Task 6) verrà dopo, su chi ha già vinto qui.
        const costo = costoInConfezioni(righeEffettive(d, {}), residuoLavoro);
        if (costo < costoMigliore) {
          costoMigliore = costo;
          pariMerito = [d];
        } else if (costo === costoMigliore) {
          pariMerito.push(d);
        }
      }
      scelto = pariMerito.length === 1
        ? pariMerito[0]
        : pariMerito[((ordinale(slot) % pariMerito.length) + pariMerito.length) % pariMerito.length];
    } else {
      const liberi = candidati.filter((d) => d.giornoCiclo === null);
      // Tutti i piatti rimasti hanno un giorno fisso, ma non questo: si ruota
      // comunque fra loro invece di lasciare il pasto vuoto. Qui nessun
      // costo si confronta: la rotazione dei liberi resta pura come prima.
      const pool = liberi.length > 0 ? liberi : candidati;
      const posizione = ((ordinale(slot) % pool.length) + pool.length) % pool.length;
      scelto = pool[posizione];
    }

    // Il consumo delle righe fisse avviene prima della risoluzione dei
    // componenti (Task 6): quelle si valutano e si consumano opzione per
    // opzione, con l'opzione davvero scelta e non col default usato sopra
    // per valutare il costo delle sorelle.
    consumaDaResiduo(scelto.ingredienti, residuoLavoro);
    const scelte = risolviComponenti(scelto, slot.scelte, ordinale(slot), residuoLavoro);
    risultato[indice] = { ...slot, dishId: scelto.id, scelte };
  }

  return risultato;
}
