# Le alternative nel dominio — design

**Data:** 29/08/2026 · **Stato:** approvato da Andrea nel brainstorm dello stesso giorno
**Perché esiste:** lo spike sul parsing di 6 diete vere ([spesa-spike-parsing-diete.md](../../../spesa-spike-parsing-diete.md))
ha mostrato che 5 diete su 6 sono piene di "oppure" — alternative per pasto, per piatto e
per singolo componente — e che il modello attuale (piatti fissi ruotati dal planner) non
sa rappresentarle. Senza questo pezzo, l'import P1 appiattirebbe ogni dieta su una
variante sola e la lista comprerebbe sempre le stesse cose: l'opposto del "varia il più
possibile" che i nutrizionisti scrivono ovunque. È il prerequisito del P1 nel
[backlog di nicchia](../../../spesa-backlog-nicchia.md).

## Le decisioni prese, con il perché

| Decisione | Scelta | Perché (e cosa è stato scartato) |
|---|---|---|
| Quando si scioglie la scelta | **Al check-in, dal planner**, override manuale in Scegli | La lista può comprare esatto solo se alla spesa è tutto risolto; il residuo resta aritmetica esatta. Scartati: risoluzione al pasto (residuo indeterminato), risoluzione all'import (dieta appiattita, anti-goal) |
| Criterio di scelta del planner | **Residuo prima, rotazione poi** | Vince il candidato che richiede meno confezioni nuove; a parità ruota. La varietà si fa dove non costa spreco. Scartate: rotazione pura (compra doppioni), veto ibrido (non spiegabile all'utente) |
| Grammature in range (70/80g) | **Collassate all'import**, default estremo alto | Il dominio resta su numeri esatti; comprare per l'alto è l'errore giusto (meglio piccolo residuo che mancante). Scartato il range nel dominio: tocca ogni calcolo per precisione minima |
| Modellazione | **Ibrido (approccio C)** | Fra pasti: piatti distinti, meccanismo esistente. Dentro il piatto: componenti con opzioni. Scartati: esplosione in piatti (54 combo per una colazione della Dieta 5), tutto-a-componenti (ristruttura repertorio e UX per uniformità che non serve) |

## Modello dati

### Alternative fra pasti: nessun campo nuovo

Due o più piatti fissati sullo stesso `slotDefId + giornoCiclo + settimanaCiclo` **sono**
il gruppo di alternative. Oggi `assegnaPiatti` fa `find` e prende il primo; con questo
design sceglie (vedi Planner). L'import di "3 combinazioni per il pranzo del giovedì"
crea 3 piatti fissati al giovedì, punto.

### Alternative dentro il piatto: componenti con opzioni

```ts
interface OpzioneComponente {
  id: string;
  /** Le righe ingrediente che questa opzione comporta (>=1: "ricotta 50g + noci 20g" è UNA opzione). */
  righe: DishIngredient[];
}

interface Componente {
  id: string;
  /** Etichetta mostrata in Scegli e nell'editor: "pane", "farcitura". */
  nome: string;
  /** >=1. La prima è il default quando nessuna scelta è registrata. */
  opzioni: OpzioneComponente[];
}

interface Dish {
  // ...campi attuali invariati...
  /** Righe fisse, sempre nel piatto: il campo di oggi, immutato. */
  ingredienti: DishIngredient[];
  /** Componenti a scelta. [] = piatto senza alternative = comportamento identico a oggi. */
  componenti: Componente[];
}
```

Il caso degenere è la garanzia di compatibilità: **un piatto con `componenti: []` deve
attraversare planner e list-builder producendo byte per byte il risultato di oggi.**
I 33 piatti del piano vegetariano non si toccano e non si migrano.

### La scelta vive sullo slot

```ts
interface Scelta {
  opzioneId: string;
  /** Come fonteStato: una scelta 'manuale' non viene mai sovrascritta dal planner. */
  fonte: 'planner' | 'manuale';
}

interface MealSlot {
  // ...campi attuali invariati...
  /** componenteId -> scelta. Vuoto finché il planner non risolve. La fonte è
   *  per singola scelta: si può correggere a mano un solo componente e
   *  lasciare gli altri al planner. */
  scelte: Record<string, Scelta>;
}
```

La scelta è un fatto della settimana, non del piatto: lo stesso wrap può essere con
ricotta questa settimana e con bresaola la prossima, ed è esattamente ciò che vogliamo
ricordare (anche per la spunta pasti P2, che leggerà da qui cosa era previsto).

### Migrazione `0006_alternative.sql` — additiva, zero backfill

- `dish_option` (id, dish_id, componente_nome, componente_id, posizione): un record per opzione,
  raggruppate per componente.
- `dish_ingredient.option_id` **nullable** FK → `dish_option`: riga fissa = `null` (tutte
  le righe esistenti restano valide senza toccarle).
- `meal_slot_choice` (slot_id, componente_id, option_id, fonte): le scelte.
- RLS con `user_id` su tutto, come le migrazioni precedenti. Nessun dato esistente da convertire.

## Planner

`assegnaPiatti` estende la firma con `ingredients`, `pantry` e `oggi` (servono per il
conta-confezioni) e diventa anche il risolutore delle scelte. Resta una funzione pura e
deterministica.

**Il criterio, operativo.** Per ogni candidato (piatto sorella, o opzione di un
componente) si calcola: quante confezioni nuove servirebbero per coprire il suo
fabbisogno al netto del residuo utilizzabile (stessa aritmetica del list-builder:
`ceil(max(0, fabbisogno − residuo) / formato)`, classe `stima` esclusa). **Vince chi ne
richiede meno; a parità decide la rotazione** con l'ordinale esistente
(`settimaneTrascorse * 7 + indice data`), che resta l'unico meccanismo della varietà.

**Scalatura sequenziale del residuo.** Gli slot si valutano in ordine di data e ogni
scelta scala una copia di lavoro del residuo prima della valutazione successiva:
altrimenti due pasti della stessa settimana vincerebbero entrambi grazie alla stessa
mezza tavoletta in dispensa. La copia di lavoro è interna al planner: la dispensa vera
non si tocca (si aggiorna solo alla chiusura della spesa, come oggi).

**Ordine dei tre passaggi attuali, aggiornato:**
1. Il ciclo filtra (invariato).
2. Il giorno fisso vince — ma se i fissati per quel giorno sono più di uno, si sceglie
   col criterio sopra invece del `find` sul primo.
3. Il resto ruota (invariato). Poi, per il piatto assegnato, si risolvono i componenti
   uno per uno, sempre col criterio sopra.

**Cosa il planner non sovrascrive mai:** `dishId` scelto a mano (regola di oggi) e
`scelte` con `fonteScelte: 'manuale'` (regola nuova, stesso principio).

## List-builder

Un solo punto cambia: l'espansione dello slot in righe ingrediente (regole 1-3).

- Righe = `piatto.ingredienti` (fisse) + per ogni `componente`, le `righe` dell'opzione
  indicata da `slot.scelte[componente.id]`.
- Scelta assente → **prima opzione** del componente: la lista non si rompe mai per uno
  slot irrisolto.
- Scelta che punta a un'opzione inesistente (piatto modificato dopo la pianificazione) →
  `OpzioneMancanteError`, gemella di `IngredienteMancanteError`: errore esplicito, mai un
  salto silenzioso di riga.

A valle dell'espansione (residuo, confezioni, base/top-up, aree, controlli staple) non
cambia nulla: il calcolo vede solo righe ingrediente, come oggi.

## UX — schermate esistenti, nessuna nuova

- **Scegli**: i piatti sorella del giorno appaiono come scelte alla pari (pattern già
  esistente). Dentro il piatto, ogni componente è una riga che mostra l'opzione corrente
  e al tap cicla le altre. Un chip **"in casa"** marca l'opzione coperta dal residuo:
  una parola che spiega la proposta del planner, non un motore di spiegazioni.
- **Settimana**: sottotitolo con le opzioni scelte quando esistono ("Wrap — ricotta e noci").
- **Piatto** (editor): sezione componenti sotto gli ingredienti fissi; ogni componente
  elenca le opzioni, ogni opzione le sue righe.
- Le schermate seguono DESIGN-SYSTEM.md; Scegli e Piatto hanno artboard di riferimento,
  la sezione componenti è un'estensione dei loro pattern.

## Test (TDD, dominio prima delle schermate)

**Planner** — sorelle sullo stesso giorno: vince chi chiede meno confezioni; parità →
rotazione con l'ordinale; scalatura sequenziale (il secondo pasto non conta il residuo
già impegnato dal primo); determinismo (stessi input → stesse scelte); scelte e `dishId`
manuali mai sovrascritti; piatto senza componenti → output identico a prima.

**List-builder** — espansione dell'opzione scelta; fallback alla prima opzione; somma
corretta di righe fisse + opzioni; `OpzioneMancanteError` sull'opzione fantasma; piatto
degenere → lista identica a prima.

**Regressione**: i 291 test esistenti devono restare verdi **senza modifiche** — è la
prova che il caso degenere è davvero degenere.

## Fuori dal perimetro, esplicitamente

- UI di import foto/PDF (P1 del backlog: questo design è il suo prerequisito, non il suo contenuto).
- Spunta pasti (P2) — ma `scelte` sullo slot è pensata per essere letta da lì.
- Range di grammature nel dominio (decisione: collassati all'import).
- Qualunque cambiamento alle sei aree, al marchio, alla rotazione dei piatti liberi.

## Gap noti

- Il conta-confezioni del planner duplica in piccolo l'aritmetica del list-builder:
  valutare in implementazione se estrarre una funzione condivisa (`confezioniNecessarie`)
  invece di due copie. Da decidere nel piano, non qui.
- Il chip "in casa" richiede di sapere in UI quale opzione era coperta dal residuo al
  momento della pianificazione: o si ricalcola alla lettura, o il planner lo annota.
  Scelta rimandata al piano di implementazione (preferenza: ricalcolo alla lettura,
  niente stato in più).
- Con soli maxi-formati in dispensa il criterio residuo-prima può ripetere la stessa
  opzione per settimane (rischio accettato nel brainstorm): se l'uso reale lo confermerà
  fastidioso, la correzione candidata è un tie-break che penalizza l'opzione scelta la
  settimana precedente. Non si costruisce ora.
