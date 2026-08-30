# Meal prepping — design

Data: 2026-08-30 · Stato: design approvato in chat, spec in review
Poggia su: `2026-08-29-spunta-pasti-design.md` (P2: ledger degli storni, spedito).
Ordine deciso il 30/08: meal prepping si costruisce **prima** della dispensa-AI
(`2026-08-30-dispensa-ai-design.md`, in attesa della chiave API).

## 1. Obiettivo

Cucinare oggi quello che si mangia un altro giorno, senza rompere la
contabilità del residuo: porzioni multiple quando si cucina ("stasera ne
preparo 3"), batch pianificato ("domenica cucino per la settimana"), porzioni
congelate che sopravvivono alla settimana. Il prepping non cambia COSA si
mangia — il piano resta quello del nutrizionista — cambia solo QUANDO si
cucina e da dove arriva il pasto.

Decisioni chiuse in chat (30/08):

| Bivio | Decisione |
|---|---|
| Semantica | Entrambi i casi: porzioni extra al momento della cucina E batch pianificato |
| Inventario | Sezione "Pronti" nella Dispensa: piatto × porzioni × frigo/freezer |
| Dichiarazione | Dal foglio azioni del pasto ("ne preparo N") e dallo slot ("uso una porzione pronta"); niente schermata di prep dedicata |
| Scadenza | Fresche 3 giorni, congelate 90 — stesso meccanismo di decadimento del residuo |

## 2. L'idea portante: una formula sola per il consumo

Tutta la contabilità passa da un'estensione di cosa "consuma" uno slot:

```
fattoreConsumo(slot) = (slot.stato === 'casa' && !slot.daPronti ? 1 : 0)
                     + slot.porzioniPreparate
```

`consumoSlot` (dominio storno, P2) e le regole 1-3 di `costruisciLista`
leggono ENTRAMBE questa formula — da un helper condiviso, non duplicata.
Conseguenze automatiche, senza meccanismi nuovi:

- dichiarato **prima** della lista → la lista compra il giusto (il batch
  domenicale da 3 compra 3× gli ingredienti; lo slot coperto da porzione
  pronta compra 0);
- dichiarato **dopo** la spesa → il ledger degli storni del P2 vede il
  consumo cambiare e addebita/accredita il residuo col telescopio esistente;
- la chiusura non cambia di una riga (riapplica gli storni come oggi).

La matrice dei casi:

| Gesto | stato | daPronti | porzioniPreparate | Consumo crudo | Pronti |
|---|---|---|---|---|---|
| Pasto normale | casa | no | 0 | 1× | — |
| "Ne preparo 2 in più" | casa | no | 2 | 3× | +2 |
| "Uso una porzione pronta" | casa | sì | 0 | 0× | −1 |
| Saltato | saltato | no | 0 | 0× | — |
| "Cucinato ma non mangiato" | saltato | no | 1 | 1× | +1 |
| Fuori, ma ho cucinato per dopo | fuori | no | N | N× | +N |

`porzioniPreparate` conta qualunque sia lo stato: cucinare per il futuro è
indipendente dal dove si mangia oggi.

## 3. Dominio — `src/domain/pronti.ts`

```ts
export interface LottoPronto {
  id: string;
  dishId: string;
  /** > 0; il lotto a 0 si cancella. */
  porzioni: number;
  congelato: boolean;
  /** ISO yyyy-mm-dd: il giorno dello slot che l'ha creato, o di oggi per i lotti manuali. Può essere futuro (batch pianificato). */
  preparataIl: string;
}

export const GIORNI_PRONTO_FRESCO = 3;   // il cotto in frigo: linee guida conservazione domestica
export const GIORNI_PRONTO_CONGELATO = 90; // come GIORNI_CONGELATO del residuo

/** Porzioni ancora davvero disponibili: 0 se il lotto fresco ha più di 3 giorni (congelato: 90). Un lotto con preparataIl futura è utilizzabile (pianificato). */
export function porzioniUtilizzabili(lotto: LottoPronto, oggi: string): number;

/** La formula di §2. Unico punto di verità: storno.consumoSlot e costruisciLista la importano da qui. */
export function fattoreConsumo(slot: MealSlot): number;
```

`MealSlot` in `types.ts` guadagna `porzioniPreparate: number` e
`daPronti: boolean`. `consumoSlot` sostituisce il suo gate attuale
(`stato !== 'casa' → vuoto`) con `fattoreConsumo === 0 → vuoto` e moltiplica
le quantità per il fattore; `costruisciLista` fa lo stesso nelle regole 1-3.
Il decadimento non tocca il residuo crudo: vale solo per i lotti dei Pronti.

## 4. Persistenza — migrazione 0009

```sql
alter table meal_slot add column porzioni_preparate integer not null default 0
  check (porzioni_preparate >= 0);
alter table meal_slot add column da_pronti boolean not null default false;

create table porzione_pronta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id uuid not null references dish(id) on delete cascade,
  porzioni integer not null check (porzioni > 0),
  congelato boolean not null default false,
  preparata_il date not null,
  /** Il lotto creato da una dichiarazione sullo slot: cambiare N su quello slot aggiorna QUESTO lotto. Null per i lotti creati/corretti a mano dalla Dispensa. */
  meal_slot_id uuid references meal_slot(id) on delete set null,
  unique (meal_slot_id)
);
-- RLS: blocco standard enable + force + policy proprietario (come 0002/0008).
```

Come per la 0008: file soltanto durante l'esecuzione del piano, applicazione
in produzione al gate esplicito di Andrea.

## 5. Scritture — tutte da `aggiornaSlot`

Il patch di `aggiornaSlot` guadagna `porzioniPreparate?: number` e
`daPronti?: boolean`. Ordine: scritture slot → scritture Pronti → ledger →
pantry (il ledger legge `fattoreConsumo` prima/dopo, quindi gli storni degli
ingredienti crudi escono da soli).

**porzioniPreparate = N**: upsert del lotto legato allo slot
(`meal_slot_id`): N > 0 crea/aggiorna con `porzioni = N`,
`preparata_il = slot.data`; N = 0 lo cancella. `congelato` del lotto si
imposta col gesto (default frigo) e si cambia dalla Dispensa.

**daPronti = true**: richiede una porzione utilizzabile del piatto dello
slot (`porzioniUtilizzabili > 0` sommando i lotti); decrementa 1 dal lotto
utilizzabile più vecchio (FIFO), cancellandolo se arriva a 0. Il gesto
imposta anche `stato: 'casa'` (fonte `checkin`) se lo slot era spento:
mangiare una porzione pronta è mangiare a casa. Senza porzioni disponibili
il gesto non è offerto dalla UI e la scrittura fallisce con errore chiaro.
**daPronti = false** (ripensamento): incrementa 1 sul lotto utilizzabile
più recente dello stesso piatto; se non ne esiste più uno (decaduto nel
frattempo), ricrea un lotto con `preparata_il = slot.data`. Best-effort
dichiarato: la Dispensa corregge in due tap.

**Cambio piatto (via Scegli)**: azzera `daPronti` (restituendo la porzione
del piatto vecchio) e `porzioniPreparate` (cancellando il lotto legato) —
stessa logica della cancellazione delle scelte: i valori del piatto vecchio
non hanno significato sul nuovo.

**"Torna al piano"** (P2): riporta `stato` a casa e azzera `daPronti` (con
restituzione); NON tocca `porzioniPreparate` — le porzioni cucinate sono un
fatto fisico, si correggono col gesto porzioni o dalla Dispensa.

## 6. UI

**Foglio azioni del pasto** (esteso, dopo un separatore "MEAL PREP"):
- *"Ne preparo di più"* → stepper 1-6 porzioni extra + toggle
  frigo/freezer; per i giorni futuri l'etichetta è la stessa (dichiarazione
  anticipata: la lista comprerà per tutte).
- *"Uso una porzione pronta"* → visibile solo se il piatto dello slot ha
  porzioni utilizzabili; mostra quante ("2 pronte"). Se lo slot è già
  coperto, la voce diventa *"Non uso la porzione pronta"* (restituzione).
- *"Cucinato ma non mangiato"* → solo per giorni ≤ oggi: stato saltato +
  porzione nei Pronti.

**RigaPasto**: slot `daPronti` → sottotitolo "Porzione pronta" (riga
accesa: si mangia a casa); slot con `porzioniPreparate > 0` → sottotitolo
"+N porzioni" accodato.

**Dispensa — sezione "Pronti"** sopra le aree, visibile solo se non vuota:
una tessera per piatto con porzioni disponibili totali e dettaglio lotti
(data, frigo/freezer con toggle come il congelato attuale, correzione del
numero, elimina). Gli impegni della settimana corrente ("1 impegnata
giovedì") derivati dagli slot `daPronti` futuri. I lotti scaduti non
compaiono (come il residuo decaduto).

## 7. Casi limite

- **Batch pianificato e poi saltato** (salti la domenica di prep senza
  azzerare le porzioni): lo slot saltato con `porzioniPreparate = 2`
  continua a consumare 2× — coerente con la matrice ("cucinato ma non
  mangiato" in versione doppia). Se invece NON hai cucinato affatto, porti
  a 0 le porzioni dal gesto o cancelli il lotto dalla Dispensa: il
  telescopio restituisce gli ingredienti. Il calcolo si corregge, non si
  tiene un diario.
- **Porzione impegnata da uno slot poi saltato**: `daPronti` resta, la
  porzione resta consumata dai Pronti finché non riapri lo slot ("Torna al
  piano" la restituisce). Niente crediti automatici di crudo: il consumo
  era già zero.
- **Lotto fresco che decade con impegni futuri**: lo slot `daPronti` di
  dopodomani può trovarsi senza porzione (decaduta). Nessun ricalcolo
  d'ufficio: il pasto è comunque coperto a occhio dall'utente, e l'errore
  possibile (una porzione che non c'è più) si vede in Dispensa. Asimmetria
  accettata, stesso costo del residuo fresco.
- **Piatto eliminato con lotti nei Pronti**: il lotto resta (fk su dish,
  soft delete non cancella); la tessera mostra il nome del piatto anche se
  inattivo. Un piatto hard-deleted cascadera il lotto.
- **Due schede / doppio tap**: leggi-somma-scrivi come il ledger P2; danno
  massimo un lotto sbagliato di 1, correggibile. Mono-utente, accettato.
- **Il lotto legato è un set assoluto (limite noto, 30/08)**: se un altro
  slot consuma FIFO una porzione dal lotto legato dello slot A, una
  successiva modifica di `porzioniPreparate` su A riscrive il lotto al
  valore dichiarato e "resuscita" la porzione consumata (sovrastima di 1
  per porzione consumata da terzi). Percorso raro, visibile in Dispensa,
  correggibile in due tap — coerente con "il calcolo si corregge, non si
  tiene un diario". Un'eventuale semantica a delta è a backlog.

## 8. Test

- **Dominio** (`pronti.test.ts`): `fattoreConsumo` sull'intera matrice di
  §2; `porzioniUtilizzabili` (fresco entro/oltre 3 giorni, congelato,
  preparataIl futura).
- **Dominio** (aggiornamenti a `storno.test.ts` e `list-builder.test.ts`):
  consumo moltiplicato, slot daPronti a consumo zero, telescopio su
  sequenze con porzioni (preparo 2 → annullo → preparo 1).
- **Data**: aggiornaSlot — lotto creato/aggiornato/cancellato al variare di
  N; FIFO del daPronti e restituzione; gate "nessuna porzione disponibile";
  cambio piatto che azzera entrambi; ledger che riflette il fattore.
- **UI**: voci del foglio con le rispettive condizioni di visibilità;
  sezione Pronti (lotti, toggle congelato, correzione, impegni); sottotitoli
  di RigaPasto.

## 9. Fuori scope

Schermata di sessione prep dedicata; ricette scalate o istruzioni di
cottura per N porzioni; porzioni parziali (mezza porzione); scadenze
personalizzate per piatto; notifiche di scadenza; prepping di piatti fuori
dal repertorio.
