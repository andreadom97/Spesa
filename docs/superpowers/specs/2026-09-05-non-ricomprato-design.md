# Contatore "non hai ricomprato" — design

**Data:** 05/09/2026 · **Stato:** approvata e implementata il 05/09 (piano omonimo); da provare in locale dopo la migrazione 0011
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P2, revisione 05/09),
[2026-08-26-spesa-design.md](2026-08-26-spesa-design.md) (le regole di `list-builder`)

**Obiettivo:** rendere visibile l'unico vantaggio che Spesa ha e nessun'altra app ha, il
residuo derivato, con un numero che l'utente vede ogni settimana senza fare nulla:
quante confezioni **non** ha ricomprato perché ce le aveva già, quanto pesano, e quanto
valgono in euro se ha messo un prezzo. Nessun logging, nessuna domanda: tutto deriva da
dati che la lista calcola già. Successo: alla seconda settimana d'uso, la schermata
"Hai preso tutto" mostra una riga del tipo "3 confezioni · 1,4 kg · circa 11 €", e la
Dispensa un totale che cresce.

## 0. Cosa c'è già e cosa manca

`costruisciLista` (regole 1-6 della spec di prodotto) calcola per ogni ingrediente il
fabbisogno della settimana, il residuo utilizzabile e le confezioni da comprare con
`confezioniNecessarie`. Un ingrediente il cui residuo copre il fabbisogno **non entra
in lista** (`if (confezioni === 0) continue`): è esattamente il caso che vogliamo
contare, e oggi sparisce senza lasciare traccia. `shopping_list_item` congela
fabbisogno, residuo e confezioni solo per le voci comprate. Manca: il confronto con la
lista "senza memoria", la sua persistenza, un prezzo per confezione, e due righe di UI.

## 1. La definizione, una volta per tutte

Per una settimana e per ogni ingrediente con fabbisogno maggiore di zero e classe
diversa da `stima` (la classe che per contratto non tiene residuo, regola 7):

- **confezioni ingenue** = `confezioniNecessarie({ fabbisogno, residuo: 0, classe, formato }).confezioni`.
  È la lista che darebbe qualunque altra app: la somma degli ingredienti del piano.
- **confezioni reali** = le confezioni che la lista chiede davvero, cioè con il
  residuo utilizzabile (0 se l'ingrediente non è in lista).
- **confezioni evitate** = ingenue − reali, mai sotto zero.
- **quantità evitata** = evitate × formato effettivo (1 per la classe `intero`, che
  conta pezzi), in `unitaBase` dell'ingrediente.
- **euro evitati** = evitate × `prezzoConfezione`, solo per gli ingredienti che ne
  hanno uno; altrimenti l'ingrediente conta in confezioni e quantità ma non in euro.

Il conteggio si fissa **alla generazione della lista**, con lo stesso `costruisciLista`
che genera le voci: è lo stesso residuo, lo stesso istante, la stessa aritmetica. Non si
ricalcola dopo (limite dichiarato in §7). Si **mostra come "settimana"** dalla
generazione in poi, e si **somma nel totale** solo per le settimane con stato `chiusa`:
il totale racconta spese fatte davvero, non liste generate e abbandonate.

## 2. Dominio

```ts
// src/domain/list-builder.ts — ListaRisultato acquista un campo
export interface VoceEvitata {
  ingredientId: string;
  nome: string;
  unita: UnitaBase;
  fabbisogno: number;
  confezioniIngenue: number;
  confezioniReali: number;
  confezioniEvitate: number;     // ingenue − reali, ≥ 0
  quantitaEvitata: number;       // in unita
  prezzoConfezione: number | null;
}
export interface ListaRisultato { base; topup; evitato: VoceEvitata[] }
```

`evitato` contiene **tutti** gli ingredienti con fabbisogno > 0 e classe ≠ `stima`,
anche quelli con zero evitate: è il denominatore ("su 12 ingredienti"). Ordine: per
nome, `localeCompare('it')`.

```ts
// src/domain/risparmio.ts — puro
export interface RiassuntoEvitato {
  confezioni: number;
  quantita: Record<UnitaBase, number>;   // g, ml, pz sommati per unità
  euro: number | null;                    // null se nessun ingrediente evitato ha prezzo
  ingredientiEvitati: number;            // con evitate > 0
  ingredientiConPrezzo: number;          // fra quelli evitati
}
export function riassumiEvitato(voci: VoceEvitata[]): RiassuntoEvitato
export function formattaQuantita(q: Record<UnitaBase, number>): string   // "1,4 kg · 2 pz", "350 g", "" se tutto zero
export function formattaEuro(euro: number): string                        // "circa 11 €", "meno di 1 €"
```

Regole di formattazione: grammi in kg da 1000 in su con una cifra decimale
(`1,4 kg`), sotto in grammi interi; millilitri in litri con la stessa soglia; pezzi
interi con `pz`. Euro arrotondati all'intero, "meno di 1 €" sotto l'unità. Separatore
decimale italiano, spazio prima dell'unità.

## 3. Dati

Migrazione `0011_prezzo_e_risparmio.sql`:

```sql
alter table ingredient add column prezzo_confezione numeric check (prezzo_confezione > 0);

create table risparmio_settimana (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references week(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  fabbisogno numeric not null,
  confezioni_ingenue int not null,
  confezioni_reali int not null,
  confezioni_evitate int not null check (confezioni_evitate >= 0),
  quantita_evitata numeric not null,
  unita text not null check (unita in ('g', 'ml', 'pz')),
  prezzo_confezione numeric,     -- istantanea al momento della generazione
  unique (week_id, ingredient_id)
);
-- RLS: stesso blocco delle altre tabelle (policy for all per il proprietario).
```

- `Ingredient` acquista `prezzoConfezione: number | null`; `aIngrediente` lo legge
  (`null` se assente), `salvaIngrediente` lo scrive.
- `generaListe` dopo aver scritto le voci scrive `risparmio_settimana`: delete per
  `week_id` e insert delle righe di `evitato`, dentro lo stesso guard "settimana non
  chiusa". `allineaTopUp` non la tocca.
- `src/data/risparmio.ts`: `leggiRisparmioSettimana(weekId): Promise<VoceEvitata[]>` e
  `leggiRisparmioTotale(): Promise<VoceEvitata[]>` (join su `week.stato = 'chiusa'`,
  tutte le settimane dell'utente). Il riassunto lo fa il dominio.
- Il prezzo dell'istantanea vive nella riga di risparmio: cambiare il prezzo di un
  ingrediente dopo non riscrive il passato.

## 4. Dove si mette il prezzo

- **Editor ingrediente** (`/piatti/[id]/ingredienti/[ingId]`): campo facoltativo
  "Prezzo di una confezione", input numerico con `€`, vuoto = nessun prezzo. Stessa
  validazione del formato: se compilato dev'essere > 0.
- **Import, passo formati** (`Formati.tsx`): stessa colonna facoltativa accanto al
  formato; `IngredienteProposto.prezzoConfezione: number | null`, normalizzato a
  `null` nelle bozze legacy da `validaStatoRevisione`; `commit.ts` lo passa a
  `salvaIngrediente`.
- Nessuna proposta automatica del prezzo in v1 (limite dichiarato, §7).

## 5. Dove si vede

- **Lista fatta** ("Hai preso tutto"): una scheda sopra "CHIUDENDO LA SPESA", stesso
  stile, etichetta `NON RICOMPRATO QUESTA SETTIMANA`. Corpo:
  - con evitate > 0: `3 confezioni · 1,4 kg · circa 11 €`, e sotto, in piccolo, `su 4
    ingredienti con prezzo` quando non tutti gli evitati hanno prezzo, oppure `metti un
    prezzo agli ingredienti per vederlo in euro` quando nessuno ce l'ha (in quel caso
    la riga principale non ha la parte in euro);
  - con evitate = 0 e almeno un ingrediente nel denominatore: `Niente, questa
    settimana: il residuo si costruisce spesa dopo spesa`;
  - senza righe (settimana senza piano): la scheda non compare.
- **Dispensa**: una riga sotto la testata, prima dell'inventario, solo se il totale
  delle settimane chiuse ha confezioni > 0: `Da quando usi Spesa: 9 confezioni non
  ricomprate · 4,1 kg · circa 32 €`. Con zero, nessuna riga: la Dispensa non fa
  rumore (decisione della review UI del 31/08).

Nessun grafico, nessuna storia per settimana: due righe, e basta.

## 6. Cosa cambia nei file

| File | Cambia |
|---|---|
| `src/domain/list-builder.ts` | `VoceEvitata`, campo `evitato` in `ListaRisultato`, calcolato nello stesso ciclo delle voci |
| `src/domain/risparmio.ts` | Nuovo, puro: `riassumiEvitato`, `formattaQuantita`, `formattaEuro` |
| `src/domain/types.ts` | `Ingredient.prezzoConfezione` |
| `src/domain/import/types.ts`, `valida.ts`, `commit.ts` | `IngredienteProposto.prezzoConfezione`, normalizzazione legacy, scrittura |
| `supabase/migrations/0011_prezzo_e_risparmio.sql` | Colonna e tabella |
| `src/data/mappers.ts`, `repertorio.ts`, `lista.ts` | Lettura/scrittura del prezzo, scrittura di `risparmio_settimana` in `generaListe` |
| `src/data/risparmio.ts` | Nuovo: letture settimana e totale |
| `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx`, `importa/Formati.tsx` | Campo prezzo |
| `src/app/(app)/lista/fatta/page.tsx`, `dispensa/page.tsx` | Le due righe |
| `README.md`, `spesa-backlog-nicchia.md` | P2 consegnato |

## 7. Limiti dichiarati (non bug)

- Il conteggio della settimana è fissato alla generazione: un piano cambiato dopo, un
  top-up allineato o un pasto saltato non lo aggiornano. Il totale conta solo settimane
  chiuse, quindi una lista rigenerata prima della chiusura sovrascrive la sua riga.
- La classe `stima` non conta: non ha residuo per contratto.
- Il prezzo è inserito a mano; nessuna proposta automatica e nessun listino. La stima in
  euro copre solo gli ingredienti con prezzo e lo dice.
- La baseline "senza memoria" è una convenzione: assume che senza Spesa si ricomprerebbe
  ogni settimana tutto il fabbisogno. È generosa per chi ha buona memoria e giusta per
  chi compra a caso; è il confronto con la lista che danno le altre app.
- Le settimane già chiuse prima di questa migrazione non hanno righe di risparmio: il
  totale parte da qui.
