# Spunta pasti collegata al residuo — design

Data: 2026-08-29 · Stato: approvato in chat, in attesa di review sul file
Precede: `2026-08-29-import-dieta-design.md` (P1, spedito) · Origine: P2 di `spesa-backlog-nicchia.md`

## 1. Obiettivo

Correggere l'assunzione più falsa del modello attuale: che ogni pasto avvenga
come da piano. Oggi il residuo si scrive una sola volta, a `chiudiSpesa`, come
`residuo + acquistato − consumatoDaPiano`, dove il consumato è il fabbisogno
congelato nella lista — cioè il piano intero, mangiato o no. Un pasto saltato
mercoledì lascia in casa ingredienti che l'app crede consumati, e la settimana
dopo li ricompra.

La correzione è una spunta leggera: "saltato / ho mangiato altro / ho mangiato
un altro piatto" per pasto, che riporta (o sposta) gli ingredienti nel residuo
al momento del tap. **Non è logging da tracker**: il default resta "mangiato
come da piano", si spuntano solo le eccezioni. Niente streak, grafici, foto
pasti, conferme obbligatorie — esclusioni esplicite del backlog.

Decisioni chiuse in chat (29/08):

| Bivio | Decisione |
|---|---|
| Semantica di "sostituito" | Entrambe le vie: piatto del repertorio (via Scegli) **oppure** "ho mangiato altro" (non tracciato) |
| Timing dell'aggiustamento | Subito, al tap; reversibile |
| Conferma dei pasti fatti | No: il default resta "fatto", si spuntano solo le eccezioni |
| Dove vive la spunta | Pagina Settimana, nessuna schermata nuova |
| Quanto indietro | Settimana corrente + precedente (il lunedì "ieri" è domenica: senza la precedente, il weekend sarebbe incorreggibile) |

## 2. L'invariante

Uno slot **consuma** i suoi ingredienti quando `stato === 'casa'` e ha un
piatto assegnato. Da quando la lista è generata (settimana `confermata` o
`chiusa`), ogni mutazione che cambia il consumo di uno slot scrive nel ledger
la differenza `consumoPrima − consumoDopo` e la applica subito a
`pantry_state.residuo`.

Le mutazioni telescopizzano: dopo qualunque sequenza di ripensamenti, il
totale del ledger di uno slot vale `consumo congelato nella lista − consumo
attuale`. Niente doppi conteggi per costruzione: invertire una spunta scrive
il delta opposto, e la somma torna dov'era.

A settimana `bozza` il ledger non si scrive: prima della lista il toggle è
pianificazione, e `costruisciLista` esclude già gli slot non-casa. Accreditare
lì sarebbe un doppio credito (regola: **storno solo a lista generata**).

L'invariante unifica anche il caso `fuori` post-lista, oggi incoerente quanto
il saltato: un pasto spostato fuori casa dopo la spesa viene comunque
"consumato" dalla chiusura. Con questo design ogni transizione via da
"casa con piatto" storna, ogni ritorno addebita — saltato, sostituito, fuori e
cambio piatto passano tutti dallo stesso meccanismo.

## 3. Dominio puro — `src/domain/storno.ts`

Nuovo modulo, stesso contratto degli altri: niente rete, niente DB, niente fs.

```ts
export interface ConsumoSlotInput {
  slot: MealSlot;
  /** Il piatto di slot.dishId, o null se non assegnato. */
  dish: Dish | null;
  ingredients: Ingredient[];
  moltiplicatorePorzioni: number;
}

/**
 * Cosa consuma questo slot, in unità base per ingrediente.
 * Vuota se lo slot non consuma (stato !== 'casa', o nessun piatto).
 * Esclude la classe 'stima': nessuna aritmetica sul residuo (regola 7).
 */
export function consumoSlot(i: ConsumoSlotInput): Map<string, number>;

export interface DeltaStorno {
  ingredientId: string;
  /** Positivo = riaccredito al residuo, negativo = addebito. */
  delta: number;
}

/** prima − dopo, per ingrediente; le voci a delta 0 non compaiono. */
export function deltaStorno(
  prima: Map<string, number>,
  dopo: Map<string, number>,
): DeltaStorno[];
```

`consumoSlot` riusa `righeEffettive(piatto, slot.scelte)` — quindi rispetta le
opzioni scelte per i componenti — e `convertiInUnitaBase`, moltiplicando per
`moltiplicatorePorzioni` esattamente come `costruisciLista` (stessa aritmetica
o lo storno non pareggia il fabbisogno). Un ingrediente citato dal piatto ma
assente dal repertorio lancia `IngredienteMancanteError` (import da
list-builder): il calcolo o è completo o non produce nulla.

**Applicazione dei delta**: sempre `max(0, residuo + delta)`, come
`nuovoResiduo`. Il ledger registra il delta **calcolato**, non quello
applicato: in un caso limite (addebito clampato a zero, poi invertito)
l'inversione può sovra-accreditare. È l'errore dalla parte che costa meno —
una confezione in più, correggibile dalla Dispensa in due secondi — e la
stessa asimmetria dichiarata di `residuoUtilizzabile`.

## 4. Persistenza — migrazione `0008_spunta_pasti.sql`

```sql
-- Il ledger degli storni: la memoria di quanto ogni spunta ha spostato nel
-- residuo. Una riga cumulativa per (slot, ingrediente), aggiornata
-- leggi-somma-scrivi; cancellata quando il cumulo torna a 0.
create table meal_slot_storno (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_slot_id uuid not null references meal_slot(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  delta numeric not null,
  aggiornato_il timestamptz not null default now(),
  unique (meal_slot_id, ingredient_id)
);
-- RLS: stesso blocco di 0002_rls.sql (enable + force + policy proprietario).

-- 'sostituito' = "ho mangiato altro": per il residuo equivale a saltato,
-- a schermo si distingue. Il sostituto DEL REPERTORIO invece non è uno
-- stato: lo slot resta 'casa', cambia dish_id, il ledger pareggia.
alter table meal_slot drop constraint meal_slot_stato_check;
alter table meal_slot add constraint meal_slot_stato_check
  check (stato in ('casa', 'fuori', 'saltato', 'sostituito'));
```

(Nome del constraint verificato sul DB di produzione il 29/08:
`meal_slot_stato_check`.)

`StatoSlot` in `types.ts` guadagna `'sostituito'`. Ogni punto che oggi fa
pattern matching su `StatoSlot` va rivisto: `costruisciLista` e `consumoSlot`
trattano ogni valore ≠ 'casa' come "non consuma" (già vero per costruzione),
la UI ha un'etichetta per ciascuno.

## 5. Flusso di scrittura

### 5.1 `aggiornaSlot` (data/settimana.ts) — l'unico varco

Tutte le mutazioni di slot passano già da qui, e la funzione legge `attuale`
prima di scrivere: `consumoPrima` è gratis. Estensione, dopo le scritture
esistenti:

1. Legge lo stato della `week` dello slot (join o seconda query). Se `bozza`,
   fine: nessun ledger.
2. Calcola `consumoDopo` dallo slot risultante (stato, dishId e scelte come
   scritti) e `deltaStorno(consumoPrima, consumoDopo)`. Servono repertorio,
   ingredienti e impostazioni: si leggono qui, non si iniettano dalla UI.
3. Per ogni delta ≠ 0: aggiorna il ledger (leggi la riga
   `(meal_slot_id, ingredient_id)`, somma, scrivi; cancella se il cumulo è 0)
   e applica a `pantry_state.residuo` con upsert e clamp a zero — upsert per
   lo stesso motivo documentato in `chiudiSpesa` (I1: la riga può non
   esistere).

Ordine: prima le scritture di slot esistenti, poi ledger, poi pantry. Un
fallimento a metà lascia al peggio uno storno registrato ma non applicato o
viceversa — visibile e correggibile dalla Dispensa; nessun ordine è atomico
senza RPC e questo degenera nel caso più benigno (il piano resta la fonte di
verità dello stato slot).

Le spunte scrivono `fonte: 'checkin'`: la gerarchia esistente le fa vincere
sul default e sul calendario, e perdere contro una `correzione`.

### 5.2 `chiudiSpesa` (data/lista.ts) — il buco da chiudere

Oggi la chiusura sovrascrive il residuo **in assoluto** dai dati congelati
(`calcolaChiusura` legge `v.residuo` dalla riga di lista, non il live). Uno
storno applicato tra generazione della lista e chiusura — salti il pranzo di
lunedì, spesa la sera — verrebbe cancellato dall'overwrite.

Fix nel passo 1 (i DATI): dopo `calcolaChiusura`, si leggono gli storni di
tutti gli slot della settimana, si sommano per ingrediente e si aggiungono al
residuo in scrittura: `max(0, residuoCalcolato + sommaStorni)` — ma **solo
per gli ingredienti che la chiusura sovrascrive** (aggiornamenti con residuo
non-null). Gli storni su ingredienti fuori dalla lista congelata (piatto
sostituito con ingredienti mai in lista) sono già stati applicati al residuo
vivo al momento del tap, e la chiusura non li tocca: riapplicarli li
conterebbe due volte. La riapplicazione compensa esattamente ciò che
l'overwrite cancella, niente di più.

L'idempotenza non cambia: il guard `week.stato === 'chiusa'` fa girare la
chiusura una volta sola, e la riapplicazione è dentro quel giro.

`allineaTopUp` non si tocca: ricalcola dal vivo con slot e pantry correnti,
che dopo uno storno sono già coerenti tra loro.

## 6. UI — pagina Settimana

Le tre zone di `RigaPasto` restano quelle documentate nel componente:

- **Sinistra (60px)**: toggle casa/fuori, invariato.
- **Centro**: apre il piatto, invariato.
- **Destra (44px)**: per i giorni **≤ oggi** a settimana non-`bozza`, invece
  del link diretto a Scegli apre un **action sheet**:
  *Saltato · Ho mangiato altro · Ho mangiato un altro piatto (→ Scegli) ·
  Torna al piano* (l'ultima voce solo se lo slot è già `saltato` o
  `sostituito`). Per i giorni futuri la freccia resta il link diretto a
  Scegli.

A schermo: `saltato` → "Saltato" barrato, `sostituito` → "Ho mangiato altro",
entrambi con lo stile spento già usato per "Fuori casa". La zona sinistra su
uno slot saltato/sostituito mostra la casa spenta (lo slot non consuma).

"Ho mangiato un altro piatto" porta alla schermata Scegli esistente: il cambio
di `dishId` passa da `aggiornaSlot`, che genera da solo la coppia
storno/addebito. Nessuna logica di residuo nella UI.

**Settimana precedente.** La pagina guadagna un link "‹ settimana scorsa"
(e il ritorno alla corrente) che carica la settimana di `lunediDi(oggi) − 7`
con una variante `leggiSettimana(lunedi)` del data layer — stessa lettura di
`leggiSettimanaCorrente`, lunedì parametrico. Vista in sola correzione:

- tutti i giorni sono ≤ oggi, quindi ogni riga ha l'action sheet;
- nessuna creazione: se la settimana precedente non esiste su DB (app mai
  aperta), stato vuoto con una riga di spiegazione — `creaSettimana` non si
  chiama mai per il passato;
- niente bottone di conferma né rigenerazione lista: la settimana passata è
  tipicamente `chiusa`, e gli storni si applicano direttamente al residuo
  vivo. Attenzione però al limite cross-settimana descritto in §7: se la
  settimana corrente è confermata ma non ancora chiusa, la sua chiusura può
  cancellare il credito per gli ingredienti presenti nella lista congelata.

## 7. Errori e casi limite

- **Ingrediente mancante durante lo storno**: `IngredienteMancanteError`,
  nessuna scrittura parziale di ledger/pantry (§3).
- **Classe `stima`**: esclusa da `consumoSlot`; uno slot fatto solo di staple
  non genera righe di ledger.
- **Deperibili riaccreditati**: nessuna logica nuova. Il credito entra nel
  residuo; `residuoUtilizzabile` lo azzererà da solo se `ultimoAcquisto` è
  oltre soglia — il pollo del martedì saltato spesso vale zero la settimana
  dopo, ed è il comportamento voluto (asimmetria dichiarata).
- **Settimana `bozza`**: nessun ledger; il toggle resta pianificazione.
- **Settimane passate**: spuntabili la corrente e la precedente (§6); più
  indietro no. Accettato: a distanza di due settimane i deperibili sono
  decaduti e la correzione non sposta quasi nulla — navigare uno storico è
  roba da tracker.
- **Cumulo a zero**: la riga di ledger si cancella; la tabella resta piccola.
- **Piatto eliminato o riscritto fra lista e spunta**: `leggiRepertorio` filtra
  i piatti attivi, quindi lo storno di un piatto soft-deleted viene saltato in
  silenzio — il residuo resta addebitato. È lo stesso comportamento di
  `costruisciLista` (`if (!piatto) continue`): l'invariante telescopica
  assume un repertorio stabile fra generazione della lista e spunta, e
  l'errore residuo si corregge dalla Dispensa. Accettato.
- **Doppio tap / due schede**: leggi-somma-scrivi non è atomico, ma l'app è
  mono-utente e il danno peggiore è uno storno doppio, visibile in Dispensa
  e invertibile con "Torna al piano". Nessun RPC per questo.
- **allineaTopUp dopo uno storno (limite noto, 29/08)**: una riga aggiunta da
  `allineaTopUp` congela il residuo *vivo*, che dopo un tap include già lo
  storno — mentre il suo fabbisogno conta la stessa consumazione un'altra
  volta, e la riapplicazione della chiusura una terza. Colpisce solo il
  percorso "sostituto con ingrediente nuovo → riapertura Lista → acquisto →
  chiusura nella stessa settimana"; l'errore va nella direzione economica
  (residuo sottostimato → si ricompra, si corregge dalla Dispensa). Il
  doppio conteggio alla radice precede la spunta pasti. A backlog il fix
  dell'interazione `allineaTopUp` × ledger.
- **Storno cross-settimana e chiusura della corrente (limite noto, 29/08)**:
  la riapplicazione di `chiudiSpesa` somma solo gli storni della settimana
  che si chiude. Una correzione sulla settimana precedente fatta DOPO la
  conferma della corrente accredita il residuo vivo, ma la chiusura della
  corrente lo sovrascrive dai dati congelati per gli ingredienti in lista —
  il credito sparisce. Sopravvive se la correzione precede la conferma (il
  caso tipico del lunedì mattina). Errore in direzione economica (si
  ricompra); fix a backlog, gemello del limite `allineaTopUp` qui sopra.

## 8. Test

- **Dominio** (`storno.test.ts`): `consumoSlot` con scelte di componenti,
  moltiplicatore, classe stima, slot che non consuma; `deltaStorno` e la
  proprietà telescopica su sequenze di mutazioni (casa→saltato→sostituito→
  casa torna a zero); clamp a zero.
- **Data** (`vi.mock` dei moduli): `aggiornaSlot` non scrive ledger a
  settimana bozza e lo scrive a settimana confermata; inversione che
  cancella la riga a cumulo zero; `chiudiSpesa` che riapplica gli storni
  dopo l'overwrite congelato; storno su ingrediente senza riga pantry
  (upsert).
- **UI**: action sheet visibile solo per giorni ≤ oggi a settimana
  non-bozza; etichette "Saltato"/"Ho mangiato altro"; "Torna al piano" solo
  su slot spuntato; settimana precedente in sola correzione (niente
  conferma, niente creazione se assente, stato vuoto con spiegazione).

## 9. Fuori scope (esclusioni vincolanti)

Streak, grafici, foto pasti, punteggi di aderenza; conferma esplicita dei
pasti fatti come da piano; spunta oltre la settimana precedente e ogni
navigazione libera dello storico; modifica manuale del ledger; qualunque
forma di notifica o promemoria. Il backlog le esclude e questa spec le
conferma escluse.
