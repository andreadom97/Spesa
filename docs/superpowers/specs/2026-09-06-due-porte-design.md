# Due porte e primo avvio — design (P4 e P5)

**Data:** 06/09/2026 · **Stato:** approvata
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P4 ingresso
"i miei piatti", P5 onboarding multi-utente), [2026-08-26-spesa-design.md](2026-08-26-spesa-design.md)

**Obiettivo:** una persona diversa da Andrea apre l'app dopo il magic link e in venti
minuti ha una settimana che gira. Oggi non è possibile: senza `seed.sql` non ci sono
pasti (e la Settimana rifiuta di crearsi), senza `seed-ingredienti.sql` il repertorio parte
da zero ingrediente per ingrediente, e lo stato vuoto di Piatti conosce una sola strada,
l'editor completo. P5 toglie i due seed manuali; P4 apre due porte, quella di chi ha una
dieta e quella di chi cucina sempre le stesse cose. Zero affermazioni di salute in ogni
copy: l'app non propone né valuta piani, li trascrive o li rotola.

## 0. Cosa c'è già e cosa manca

- `pastiDiDefault()` e la semina dei pasti esistono, ma solo dentro la pagina
  Impostazioni: chi non la apre non ha pasti. `creaSettimana` lancia senza pasti.
- I 71 ingredienti classificati vivono in `supabase/seed-ingredienti.sql`, eseguibile a
  mano dall'SQL Editor con l'email cablata. Il codice non li conosce.
- `VuotoPiatti` (stato vuoto = onboarding) ha tre passi e un solo bottone, "CREA IL
  PRIMO PIATTO", che porta all'editor completo (nome, pasto, giro, ingredienti con
  ricerca e creazione, componenti, procedimento). L'import esiste ma si raggiunge solo da
  Impostazioni.
- La Lista senza settimana dice "VAI ALLA SETTIMANA"; la Settimana con repertorio vuoto
  mostra "Nessun piatto assegnato" su ogni riga e nient'altro.

## 1. Primo avvio automatico (P5)

`src/data/primo-avvio.ts` → `assicuraDatiIniziali(): Promise<{ pasti: boolean; ingredienti: boolean }>`,
idempotente, chiamata una volta per caricamento dell'app:

1. Nessun utente autenticato → non fa nulla (`{ pasti: false, ingredienti: false }`).
2. `meal_slot_def` dell'utente vuota → `salvaSlotDefs(pastiDiDefault())` (gli stessi
   quattro pasti di `seed.sql` e di Impostazioni). `pasti: true`.
3. `settings` → `upsert({ user_id })` con `ignoreDuplicates` (i default li mette il DB),
   sempre: costa una riga e toglie il caso "riga assente" che `leggiImpostazioni` oggi copre
   in memoria.
4. `ingredient` dell'utente vuota → `insert` in blocco di `INGREDIENTI_BASE` (71, da
   `src/domain/ingredienti-base.ts`, la stessa classificazione del file SQL, `prezzo_confezione`
   null), poi `pantry_state` a residuo zero per gli id restituiti (`upsert` con
   `ignoreDuplicates` su `ingredient_id`, come `salvaIngrediente`). `ingredienti: true`.
   **Solo a tabella vuota**: chi ha già anche un solo ingrediente non riceve niente, le
   correzioni fatte a mano non si toccano (stessa regola del file SQL, che resta per chi
   vuole aggiungere i mancanti a un repertorio esistente).

Conteggi con `select('id', { count: 'exact', head: true })`. Due sole letture in
parallelo prima di qualunque scrittura.

**Dove si chiama.** `src/components/PrimoAvvio.tsx`, componente client montato in
`src/app/(app)/layout.tsx` attorno a `{children}`: all'avvio chiama
`assicuraDatiIniziali()` e mostra i figli **solo dopo** che ha finito, bene o male
(`finally`); un errore va in `console.error` e la pagina si carica comunque (un utente
esistente non deve restare fuori per una semina che non gli serve). Il layout del gruppo
`(app)` non si rimonta fra una navigazione e l'altra, quindi la chiamata avviene una volta
per apertura dell'app, non per pagina. Impostazioni mantiene la sua semina dei pasti:
è ridondante e innocua, e toglierla non è in scope.

**`src/domain/ingredienti-base.ts`.** `INGREDIENTI_BASE: ReadonlyArray<Omit<Ingredient, 'id' | 'prezzoConfezione'>>`
con i 71 del file SQL, nome per nome, nello stesso ordine e con gli stessi valori. E
`predefinitiIngrediente(area, unita)` → `{ classeResiduo, deperibile, formatoConfezione }`
per la mini-creazione della schermata veloce (§2.3): `pz` → `intero`, formato 1;
altrimenti `porzionabile`, formato 500 g / 1000 ml; deperibile vero per ortofrutta,
macelleria, latticini, falso per cereali, dispensa, surgelati. Sono difetti sensati da
correggere in Impostazioni → Ingredienti, non verità.

## 2. Le due porte (P4)

### 2.1 Stato vuoto di Piatti

`VuotoPiatti` diventa la schermata delle due porte (sostituisce i tre passi
dell'artboard `VuotoPiatti.dc.html`, disegnato prima che l'import esistesse: l'artboard
va aggiornato in un secondo momento, limite dichiarato).

- Titolo `Da dove partiamo?`, sotto: `Spesa costruisce la lista dai piatti che mangi. Ce
  li dici una volta sola, in uno di questi due modi.`
- Scheda 1, titolo `Ho una dieta`, testo `Fotografa le pagine del piano che ti hanno
  dato: piatti e grammature li legge l'app, tu controlli e confermi.`, bottone pieno
  `IMPORTA LA DIETA` → `/importa`.
- Scheda 2, titolo `Cucino sempre le stesse cose`, testo `Scrivi otto o dieci piatti che
  fai davvero, con gli ingredienti e quanto ne usi. Da lì la settimana gira da sola.`,
  bottone pieno `SCRIVI I MIEI PIATTI` → `/piatti/veloce`.
- Riga in fondo, piccola: `Preferisci fare a modo tuo?` con link `Crea un piatto
  dall'editor completo` → `/piatti/nuovo`.

Stile delle schede: quello della scheda bianca dell'attuale `VuotoPiatti` (raggio 22,
bordo `var(--bordo)`), una sopra l'altra, bottoni 54px come gli altri.

### 2.2 Inserimento veloce: `/piatti/veloce`

Una schermata, un piatto alla volta, che resta aperta finché non si dice basta.

**Testata**: freccia indietro → `/piatti`; etichetta mono `PIATTO {n+1}` dove `n` = piatti
già nel repertorio (letti all'apertura) + salvati in questa sessione. Sotto, una riga:
con `n < 8` → `{n} piatti salvati · ne bastano 8 per far girare la settimana` (con `n = 0`:
`Nessun piatto ancora · ne bastano 8 per far girare la settimana`; con `n = 1`: `1 piatto
salvato · …`); con `n ≥ 8` → `Ne hai {n}: la settimana può girare. Aggiungine quanti vuoi.`
Otto perché quattro pasti di default per due piatti ciascuno: il planner ruota per pasto.

**Il modulo**:
- Campo `Dai un nome al piatto` (stesso placeholder dell'editor).
- Pasto: `Segmento` in variante pillola con i `slotDefs` reali, preselezionato il primo
  (poi resta l'ultimo usato: chi scrive tre cene di fila non lo ritocca).
- Ingredienti: campo `Cerca un ingrediente` (accent-insensitive come `normalizza` di
  Piatti); sotto, al massimo 8 risultati fra gli ingredienti dell'utente non ancora nel
  piatto, ognuno con pallino dell'area e nome; il tap aggiunge una riga. Se il testo
  cercato non è vuoto e nessun ingrediente ha esattamente quel nome (normalizzato),
  l'ultima voce è `Crea «{testo}»` e apre la mini-creazione (§2.3).
- Righe aggiunte: nome, campo quantità (`type="text" inputMode="decimal"`, virgola o
  punto, vuoto all'inizio con focus), unità fissa = `unitaBase` dell'ingrediente (le
  conversioni in kg/l restano all'editor completo), X per togliere.
- Sotto le righe, quando non ce ne sono: `Un piatto senza ingredienti non entra nella
  lista della spesa` (prima frase di `TESTO_SENZA_INGREDIENTI`).

**Salvataggio**: bottone pieno `SALVA E AVANTI`. Valido se nome non vuoto, almeno una
riga, ogni quantità > 0; altrimenti il bottone è disattivato e sotto compare la ragione
(`Manca il nome`, `Aggiungi almeno un ingrediente`, `Manca la quantità di {nome}`), una
sola, la prima. Salva con `salvaPiatto({ nome, slotDefId, fonte: 'proprio', attivo: true,
descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti, componenti: [] })`.
Al successo: `n` aumenta, il modulo si svuota (il pasto resta), una riga sopra il modulo
dice `Salvato: {nome}` finché non si ricomincia a scrivere. Errore → `Non siamo riusciti
a salvare il piatto. Riprova.` con i dati intatti.

Bottone secondario `HO FINITO` → `/settimana` (è lì che si vede la settimana girare).

### 2.3 Mini-creazione di un ingrediente

Nello stesso posto dei risultati di ricerca, un riquadro: nome (precompilato col testo
cercato, modificabile), area (`Segmento` a pillole con le sei aree in `ordineAree`,
etichette `nomeArea`, preselezionata `dispensa`), unità (`Segmento` a blocco `G / ML /
PZ`, default `g`), deperibile (interruttore con le stesse due frasi dell'editor
ingrediente: `Sì, va comprato fresco` / `No, si conserva a lungo`), formato confezione
(campo numerico, disattivato e fisso a 1 con `pz`). Cambiare area o unità riapplica i
`predefinitiIngrediente` ai campi che l'utente non ha ancora toccato. `CREA E AGGIUNGI` →
`salvaIngrediente` (classe da `predefinitiIngrediente`, prezzo null) → la riga entra nel
piatto e l'ingrediente nell'elenco locale; `ANNULLA` chiude il riquadro. Sotto, in
piccolo: `Formato e reparto li puoi correggere dopo in Impostazioni → Ingredienti.`

### 2.4 Stati vuoti collegati alle porte

- **Lista** senza settimana: se il repertorio è vuoto (una `leggiRepertorio` in più solo
  in questo ramo, tollerante), la scheda dice `Prima servono i piatti` / `La lista nasce
  dai piatti che mangi: dicci quali sono e da lì la settimana e la spesa si costruiscono
  da sole.` e il bottone è `COMINCIA DAI PIATTI` → `/piatti`. Con piatti, la scheda e il
  bottone restano quelli di oggi.
- **Settimana** con repertorio vuoto (`piatti.length === 0`), vista corrente: sopra le
  righe del giorno, una scheda breve `Nessun piatto ancora` / `Le righe si riempiono
  da sole appena ce n'è qualcuno.` con link `COMINCIA DAI PIATTI ›` → `/piatti`.

## 3. Cosa cambia nei file

| File | Cambia |
|---|---|
| `src/domain/ingredienti-base.ts` | Nuovo: i 71 ingredienti, `predefinitiIngrediente` |
| `src/data/primo-avvio.ts` | Nuovo: `assicuraDatiIniziali` |
| `src/components/PrimoAvvio.tsx`, `src/app/(app)/layout.tsx` | Il cancello del primo avvio |
| `src/app/(app)/piatti/page.tsx` | Le due porte |
| `src/app/(app)/piatti/veloce/page.tsx` | Nuovo: inserimento veloce |
| `src/app/(app)/lista/page.tsx`, `src/app/(app)/settimana/page.tsx` | Stati vuoti collegati |
| `README.md`, `spesa-backlog-nicchia.md` | Passo 0 semplificato, P4 e P5 consegnati |

Nessuna migrazione, nessuna API, nessuna variabile d'ambiente. `seed.sql` e
`seed-ingredienti.sql` restano come strumenti manuali, non più necessari.

## 4. Test che contano

- `INGREDIENTI_BASE`: 71 voci, nomi unici (normalizzati), aree e classi valide, `intero`
  ⇒ `pz` e formato 1, formato > 0; `predefinitiIngrediente` su ogni area × unità.
- `assicuraDatiIniziali`: senza utente non tocca nulla; con pasti e ingredienti già
  presenti scrive solo `settings`; con tabelle vuote scrive i quattro pasti, i 71
  ingredienti e 71 righe di dispensa; un errore di scrittura propaga.
- `PrimoAvvio`: i figli compaiono dopo la promessa, anche se rigetta.
- Le due porte: i due link e il link all'editor.
- Veloce: ricerca, aggiunta riga, validazione con le tre ragioni, payload di
  `salvaPiatto`, reset e contatore, copy del contatore ai tre livelli (0, 1–7, ≥ 8),
  mini-creazione con i default e `salvaIngrediente`, `HO FINITO`.
- Stati vuoti: Lista a repertorio vuoto → `COMINCIA DAI PIATTI`; con piatti → `VAI ALLA
  SETTIMANA`; Settimana a repertorio vuoto → la scheda.

## 5. Limiti dichiarati (non bug)

- Due schede aperte da un utente nuovissimo nello stesso istante possono seminare due
  volte gli ingredienti (nessun vincolo di unicità sul nome): si cancellano da
  Impostazioni → Ingredienti. Non vale la pena di una migrazione con indice univoco
  sul nome finché non succede.
- La schermata veloce non conosce componenti, giorno fisso, giro, procedimento,
  conversioni di unità: sono nell'editor completo, raggiungibile dal piatto salvato.
- I default della mini-creazione sono per area e unità, non per ingrediente: "Pane" nasce
  non deperibile perché sta in cereali. Il copy lo dice e Impostazioni corregge.
- La porta dell'import in produzione risponde 503 finché la chiave non è su Vercel: la
  pagina Importa lo mostra già con il suo messaggio.
- L'artboard `VuotoPiatti.dc.html` non è aggiornato: la schermata delle due porte è la
  prima senza artboard dopo Ingredienti e Dispensa.
