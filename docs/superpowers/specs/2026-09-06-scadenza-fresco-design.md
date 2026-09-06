# Avviso di scadenza del fresco e conflitto alla sostituzione — design

**Data:** 06/09/2026 · **Stato:** approvata e implementata il 06/09 (piano omonimo); da provare in locale con un deperibile in residuo
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P3),
[2026-08-26-spesa-design.md](2026-08-26-spesa-design.md) (il decadimento del fresco in
`residuoUtilizzabile`; il conflitto "se usi lo yogurt qui non ti resta per giovedì"
rinviato a Fase 3)

**Obiettivo:** far vedere il residuo derivato *mentre* la settimana si svolge, non solo
a lista generata. Due momenti: (1) un deperibile che c'è in casa oggi ma che, per il
modello, non ci sarà più il giorno del pasto che lo usa, o che nessun pasto usa prima
che scada (la dimenticanza: 33% dello spreco dichiarato, Waste Watcher 2026); (2) una
sostituzione di piatto che consuma un ingrediente di cui poi non resta abbastanza per
un pasto successivo. Niente push, niente notifiche: righe di testo nelle schermate che
l'utente già apre. Nessuna nuova tabella, nessuna chiamata a modelli.

## 0. Cosa c'è già e cosa manca

`residuoUtilizzabile` azzera il residuo di un deperibile quando
`giorniTra(ultimoAcquisto, oggi) > soglia`, con la soglia di `GIORNI_FRESCO[area]` (o
`GIORNI_CONGELATO` se dichiarato in congelatore, `null` per i surgelati). La lista e il
planner lo usano già; la Dispensa mostra "Troppo tempo per essere ancora buono" quando è
già scaduto. Manca tutto quello che viene *prima* dello zero: il giorno in cui scadrà,
il confronto con i pasti della settimana, e il confronto fra il fabbisogno di un
piatto sostituito e quello che la casa più la lista coprono.

Un fatto che decide il disegno del conflitto: `allineaTopUp` (chiamata a ogni apertura
della Lista) aggiunge al top-up **solo gli ingredienti non ancora in lista**. Se una
sostituzione alza il fabbisogno di un ingrediente già in lista, nessuno lo aggiunge; a
settimana chiusa lo storno di `aggiornaSlot` addebita il sostituto al residuo e clampa a
zero, e il mancante sparisce senza traccia. È il buco che l'avviso deve mostrare.

## 1. Le definizioni

### 1.1 Scadenza del residuo

Per un ingrediente con residuo > 0, deperibile, con `ultimoAcquisto` e soglia non nulla:

- **scadenza** = `ultimoAcquisto + soglia` (ISO), l'ultimo giorno in cui
  `residuoUtilizzabile` lo conta ancora. Contratto da provare nei test: per ogni input,
  `residuoUtilizzabile({...,oggi}) > 0 ⇔ oggi ≤ scadenza`.
- `null` in tutti gli altri casi (non deperibile, mai comprato, surgelati, residuo 0):
  nessuna scadenza da mostrare.

### 1.2 Avvisi di scadenza della settimana

Su una settimana (i suoi `slots`, i piatti, gli ingredienti, la dispensa, `oggi`), per
ogni ingrediente con classe ≠ `stima`, `residuoUtilizzabile(oggi) > 0` e scadenza non
nulla — cioè un residuo che oggi conta e che ha un giorno in cui smetterà di contare:

- **pasti che lo usano** = gli slot con `data ≥ oggi`, `fattoreConsumo > 0` e un piatto
  le cui `righeEffettive` (con le scelte dello slot) contengono l'ingrediente. Stesso
  filtro di `costruisciLista`, ma ristretto ai giorni non ancora passati.
- **pastiDopo** = quelli con `data > scadenza`: il giorno del pasto il residuo non ci
  sarà più, per il modello. Sono i pasti da avvisare in Settimana.
- **usatoInTempo** = esiste un pasto con `oggi ≤ data ≤ scadenza`. Se falso, nessun
  pasto in programma lo usa prima che scada: è la riga anti-dimenticanza della
  Dispensa.

Un avviso per ingrediente, ordinati per scadenza e poi nome. Uno slot con una scelta
che punta a un'opzione rimossa (`OpzioneMancanteError`) si salta: un avviso non è il
posto dove esplodere, come `descriviScelte`.

### 1.3 Conflitto alla sostituzione

In Scegli, per il piatto candidato (con le scelte correnti dei componenti) sullo slot
`(data, slotDefId)`, per ogni ingrediente del candidato con classe ≠ `stima`:

- **Settimana `bozza`** → nessun conflitto, mai: la lista non esiste ancora e nascerà
  dal piano com'è dopo la sostituzione.
- **Ingrediente non in lista** (né base né top-up, qualunque origine e spunta) → nessun
  conflitto: `allineaTopUp` lo aggiunge al top-up alla prossima apertura della Lista.
- **Settimana `confermata`, ingrediente in lista**: disponibile = `residuoUtilizzabile(oggi)`
  + Σ `quantitaTotale` delle sue voci in lista; fabbisogno dopo = Σ `consumoSlot` su
  tutti gli slot della settimana con questo slot che monta il candidato (stato,
  `daPronti` e `porzioniPreparate` dello slot invariati). **mancante** = fabbisogno dopo −
  disponibile, se > 0.
- **Settimana `chiusa`, ingrediente in lista**: il residuo è già al netto di tutta la
  settimana; lo storno restituirà il consumo del piatto attuale e addebiterà il
  candidato. disponibile = `residuoUtilizzabile(oggi)` + `consumoSlot(slot attuale)`;
  fabbisogno = `consumoSlot(slot col candidato)`. **mancante** = fabbisogno −
  disponibile, se > 0.
- **pastiDopo** = gli altri slot della settimana con `data ≥ oggi`, diversi da questo,
  che consumano l'ingrediente: sono quelli che resteranno senza.

Un conflitto per ingrediente, in unità base, ordinati per nome. L'avviso non blocca
SOSTITUISCI: informa. `residuoUtilizzabile` e non il residuo grezzo anche a settimana
chiusa: un residuo scaduto non è disponibile per nessuno.

## 2. Dominio

```ts
// src/domain/scadenza.ts — puro
export function scadenzaResiduo(i: Omit<ResiduoUtilizzabileInput, 'oggi'>): string | null;

export interface AvvisoScadenza {
  ingredientId: string;
  nome: string;
  scadenza: string;                                   // ISO
  pastiDopo: { data: string; slotDefId: string }[];   // data > scadenza
  usatoInTempo: boolean;
}
export function avvisiScadenza(i: {
  slots: MealSlot[]; dishes: Dish[]; ingredients: Ingredient[]; pantry: PantryState[]; oggi: string;
}): AvvisoScadenza[];

/** "oggi", "domani", "martedì" entro sei giorni; oltre, "il 9 set". Mai un giorno passato: chi chiama garantisce scadenza ≥ oggi. */
export function etichettaScadenza(scadenza: string, oggi: string): string;
```

```ts
// src/domain/conflitto.ts — puro
export interface ConflittoResiduo {
  ingredientId: string;
  nome: string;
  unita: UnitaBase;
  mancante: number;                                   // in unita, > 0
  pastiDopo: { data: string; slotDefId: string }[];
}
export function conflittiSostituzione(i: {
  slot: MealSlot;                                     // lo slot che si sta sostituendo, com'è ora
  candidato: Dish;
  scelte: Record<string, Scelta>;                     // le scelte correnti in Scegli
  slots: MealSlot[]; dishes: Dish[]; ingredients: Ingredient[]; pantry: PantryState[];
  impostazioni: Pick<Impostazioni, 'moltiplicatorePorzioni'>;
  statoSettimana: 'bozza' | 'confermata' | 'chiusa';
  vociLista: { ingredientId: string; quantitaTotale: number }[];   // base + topup, tutte
  oggi: string;
}): ConflittoResiduo[];
```

`consumoSlot` di `src/domain/storno.ts` è l'unica aritmetica del consumo: nessuna
seconda formula. Il mese di `etichettaScadenza` usa le stesse abbreviazioni di
`dataBreve` della Dispensa (`gen … dic`).

## 3. Dove si vede

### 3.1 Settimana

Solo nella vista corrente e per i giorni con `data ≥ oggi`. Sotto il sottotitolo della
riga pasto, una riga per ogni avviso il cui `pastiDopo` contiene `(giorno selezionato,
slotDefId)`:

> `Pollo in casa: scade martedì, prima di questo pasto`

`RigaPasto` acquista una prop `avvisi?: string[]` (una riga per elemento, 12px, peso 600,
colore `var(--ink-2)`, mostrata solo a riga accesa). La Settimana legge la dispensa con
`leggiDispensa` in un `try/catch` come fa la Dispensa col non ricomprato: se fallisce,
nessun avviso e la schermata resta usabile. Nessun segno sulla striscia dei giorni (limite
dichiarato, §6).

### 3.2 Dispensa

Nella riga mono dell'ingrediente (`LATTICINI · PRESO IL 3 SET`), per i deperibili con
scadenza non nulla e non ancora decaduti, in coda: `· SCADE OGGI` oppure `· SCADE IL 9 SET`.
Sotto, con lo stile della riga "Troppo tempo per essere ancora buono", solo se l'avviso
di quell'ingrediente ha `usatoInTempo === false` e la scadenza cade entro la domenica
della settimana corrente (oltre, il piano di questa settimana non può dire nulla):

> `Nessun pasto in programma lo usa prima che scada.`

La Dispensa ha già tutto in memoria (settimana corrente, repertorio, ingredienti,
dispensa): nessuna lettura in più. Senza settimana corrente, nessuna riga
anti-dimenticanza; l'etichetta di scadenza resta.

### 3.3 Scegli

Sotto l'elenco dei componenti (o dei piatti, se il candidato non ne ha), sopra la nota,
solo quando il piatto o le scelte sono cambiati e `conflittiSostituzione` non è vuota,
una riga per conflitto, 12.5px, peso 600, `var(--ink-2)`:

> `Con questo piatto lo yogurt non basta: ne mancano 150 g, e serve anche giovedì (Cena).`
> `Con questo piatto il pollo non basta: ne mancano 200 g.`

Il nome va in minuscolo dopo l'articolo? No: nessun articolo, per lo stesso motivo del
genere dei pasti già discusso nel file (nomi liberi dell'utente). Copy esatto:

> `Con questo piatto {Nome} non basta: ne mancano {quantità}{, e serve anche {giorno} ({pasto})}.`

con `{giorno}` da `etichettaScadenza(data, oggi)` (oggi/domani/nome del giorno) e più pasti
separati da ` e ` (al massimo due, poi `e altri N`). La quantità con `formattaQuantita`
di `src/domain/risparmio.ts` sull'unità dell'ingrediente. Scegli legge in più
`leggiListe(settimana.id)` (stesso `try/catch` di tolleranza: senza lista, nessun
conflitto) e ha già settimana (con `stato`), repertorio, dispensa e impostazioni.

**Correzione della nota di Scegli.** La frase "Se la lista della spesa è già stata
creata, non si aggiorna da sola: va rigenerata dalla Settimana" non è più vera da quando
esiste `allineaTopUp` (la Settimana non rigenera una settimana non bozza). Diventa:

> `Cambia solo {pasto} di {giorno}. Gli altri giorni restano come sono. Se la lista è già fatta, quello che manca entra nel top-up quando la riapri.`

## 4. Cosa cambia nei file

| File | Cambia |
|---|---|
| `src/domain/scadenza.ts` | Nuovo: `scadenzaResiduo`, `avvisiScadenza`, `etichettaScadenza` |
| `src/domain/conflitto.ts` | Nuovo: `conflittiSostituzione` |
| `src/components/RigaPasto.tsx` | Prop `avvisi` |
| `src/app/(app)/settimana/page.tsx` | Legge la dispensa (tollerante), calcola gli avvisi, li passa alle righe del giorno |
| `src/app/(app)/dispensa/page.tsx` | `SCADE …` nella riga mono; riga anti-dimenticanza |
| `src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx` | Legge la lista (tollerante), mostra i conflitti, nota corretta |
| `README.md`, `spesa-backlog-nicchia.md` | P3 consegnato |

Nessuna migrazione, nessuna variabile d'ambiente.

## 5. Test che contano

- `scadenzaResiduo`: la proprietà del §1.1 contro `residuoUtilizzabile` su una griglia di
  giorni intorno alla soglia, per area fresca, congelato, surgelati, non deperibile, mai
  comprato.
- `avvisiScadenza`: pasto dopo la scadenza → in `pastiDopo`; pasto entro → `usatoInTempo`;
  pasti passati ignorati; slot fuori/saltato/`daPronti` senza porzioni ignorato;
  `porzioniPreparate` su slot spento conta; scelte dei componenti rispettate; classe
  `stima` esclusa; residuo già scaduto escluso; ordine.
- `conflittiSostituzione`: i quattro rami del §1.3 con numeri verificabili a mano;
  `pastiDopo` esclude lo slot stesso e i giorni passati; il candidato uguale al piatto
  attuale con scelte diverse.
- Le tre pagine: copy esatti del §3, assenza dell'avviso nei casi esclusi, tolleranza al
  fallimento delle letture aggiunte, nota di Scegli nuova.

## 6. Limiti dichiarati (non bug)

- La scadenza è quella del modello (soglie per area, dal giorno dell'ultimo acquisto),
  non la data sulla confezione: dice quando l'app smetterà di contare il residuo, che è
  l'informazione che serve per capire la lista. Il residuo ha una sola data per
  ingrediente: due acquisti in giorni diversi decadono insieme, come già oggi.
- Gli avvisi non tengono conto delle quantità lungo la settimana: un pasto entro la
  scadenza "usa" l'ingrediente anche se ne consuma una parte. Il modello non simula il
  residuo giorno per giorno.
- Il conflitto assume che la lista venga comprata tutta e che i pasti passati siano
  stati mangiati; a settimana chiusa non distingue chi, fra i pasti successivi,
  resterà senza: li elenca tutti.
- Niente segno sulla striscia dei giorni: l'avviso si vede aprendo il giorno, e in
  Dispensa nell'insieme.
- Nessuna riga anti-dimenticanza per scadenze oltre la domenica corrente (congelati,
  freschi appena comprati con soglia lunga): la settimana dopo non esiste ancora.
