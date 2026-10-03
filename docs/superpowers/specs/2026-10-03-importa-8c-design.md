# Fase 8c — il motore di Importa: unità, q.b., proposte compilate, bozza, riepilogo

Approvata da Andrea in brainstorming il 03/10, sezione per sezione. Nasce dalle prove dal
telefono delle fasi 8a/8b (03/10: 21 OK su 26, KO 7, 10/12, 14, 16).

**Obiettivo.** Un import di una dieta vera arriva al piano salvato chiedendo ad Andrea solo
quello che non si può proporre, senza perdere la lettura se esce dall'app e senza ingredienti
doppi. Si misura così: sul PDF di 10 pagine di Andrea (`Piano-alimentare-Andrea.pdf`) le cose
che bloccano scendono a quelle senza proposta possibile, le zucchine finiscono su quelle che
ha già, e la lettura sopravvive al passaggio a un'altra app.

**Fuori da questa fase (decisi con Andrea):**
- **8d** — Controlla e Ingredienti a step, una cosa per schermata, con barra di completamento.
  Passa da Claude Design e usa le proposte compilate di questa fase. Fino ad allora il «cosa
  manca» resta com'è.
- **8e** — affidabilità della lettura (422 intermittenti: «quantita valorizzata con unita
  mancante», «meno di due opzioni»).
- **Fusione delle due «Zucchine»** già in dispensa (entrambe in pz, nate perché l'unità non si
  poteva cambiare): correzione dati a parte, con l'ok di Andrea prima di toccare la produzione.

## Decisioni di Andrea (03/10)

| Tema | Decisione |
|---|---|
| Unità diversa fra dieta e ingrediente che ho | **Il nuovo piano prevale**: proposta già scelta di passare il mio ingrediente all'unità della dieta; le quantità dei miei piatti e della dispensa si convertono col peso medio |
| Come si mostra una conversione | Sempre i due valori: «150 g, quindi 0,75 pz», «1 cucchiaio, quindi 15 ml» |
| Peso non in tabella | Una cosa da sistemare, una volta per ingrediente: «Quanto pesa una X?» |
| Spezie | «Quanto basta» è un valore: niente grammatura, non blocca |
| Cucchiai e cucchiaini | Unità della dieta, convertite in ml o g |
| Proposte | Ogni cosa aperta arriva con la risposta proposta e già scelta |
| Indietro di Android | Passo prima; da Controlla un dialogo «Esci dall'import?» RESTA / ESCI |
| Tasto finale | Sempre «SALVA IL PIANO»; dialogo solo se c'è un piano attuale, tasto blu notte (`--ink`, tono `primario`), non rosso; attesa con avanzamento; poi il Piano con «Piano salvato» |

## A. L'unità del nuovo piano prevale

### A.1 Pesi medi a pezzo

Nuova tabella `PESO_PEZZO` in `src/domain/import/formati-tipici.ts`, chiavi come la tabella dei
formati (parole intere, `normalizza`): grammi di un pezzo. Valori medi da fonti comuni, segnati
nel file come tali: es. zucchina 200, mela 180, pera 180, banana 120, arancia 200, limone 100,
kiwi 80, uovo 60, carota 80, cipolla 150, patata 200, pomodoro 120, peperone 200, melanzana 300,
finocchio 250, avocado 200. La lista definitiva la scrive il piano; ogni voce è g per pz.

### A.2 Abbinamento

`abbina` (`src/domain/import/mapping.ts`) oggi scarta un ingrediente con unità diversa. Diventa
a due livelli:
1. come oggi, stessa unità (esatto, poi inclusione);
2. se nessuno, lo stesso nome **esatto** normalizzato con unità diversa fra `g` e `pz`
   → abbinamento **con cambio di unità**. Fra `ml` e `pz`, `g` e `ml`: nessun abbinamento (come
   oggi; servirebbe la densità).

L'inclusione non vale al livello 2: «Pasta di farro» non cambia l'unità di «Pasta».

Con due esistenti dallo stesso nome si sceglie il primo in ordine stabile (`id`); il doppione
resta (vedi «Fuori»).

### A.3 Il cambio di unità

Un abbinamento con cambio di unità produce una **proposta di cambio**: ingrediente, unità da →
a, peso di un pezzo (dalla tabella, o chiesto). È già scelta (Andrea: «il nuovo piano deve
prevalere»), non blocca se il peso è noto, e si mostra nella Scheda dell'ingrediente con i due
valori, es. «Zucchine passa a grammi: 1 pz = 200 g. "Pasta e zucchine": 2 pz, quindi 400 g.»
Si può rifiutare («Tienile a pezzi»): allora le righe della dieta si convertono loro, nell'unità
dell'ingrediente, con lo stesso peso («150 g, quindi 0,75 pz»).

Peso non in tabella → motivo di blocco nuovo `peso`: «Quanto pesa una X?», campo numerico in g,
una volta per ingrediente.

Arrotondamento: in pz al quarto (0,25); in g all'intero.

### A.4 Dove si applica — atomico, nel database

Il cambio tocca dati vivi fuori dall'import. Si fa in **una funzione Postgres** (migrazione
0016), chiamata da `eseguiScritture` prima di creare i piatti, una per ingrediente:

`cambia_unita_ingrediente(p_ingrediente uuid, p_unita text, p_fattore numeric)` — `security
invoker` (vale la RLS per casa), in una transazione:
- `ingredient.unita_base` = nuova unità; `formato_confezione` × fattore;
- `dish_ingredient.quantita` × fattore e `unita` = nuova (tutte le righe dell'ingrediente,
  anche dei piatti propri e delle opzioni);
- `pantry_state.residuo` × fattore;
- `meal_slot_storno.delta` × fattore;
- `purchase.quantita` × fattore (lo storico serve ai ritmi della dispensa).

Restano com'erano, perché portano la loro unità e sono istantanee: `shopping_list_item`,
`risparmio_settimana`. Il fattore è g per pz (pz → g) o il suo inverso (g → pz).

`salvaIngrediente` continua a vietare il cambio di unità di un ingrediente in uso
(`UnitaInUsoError`): l'editor dell'ingrediente non cambia in questa fase.

## B. «Quanto basta»

- **Migrazione 0016**: `dish_ingredient.quantita` diventa facoltativa: `null` = q.b.; il check
  diventa `quantita is null or quantita > 0`. `DishIngredient.quantita: number | null`.
- **Import**: una riga con `quantita null` il cui `testoOriginale` contiene «q.b.», «qb»,
  «quanto basta» o «a piacere» (normalizzato, parole intere) è q.b. da sola: non è un dubbio,
  non blocca. Le altre righe senza quantità restano dubbi, con la proposta (D).
- **Lista** (`list-builder.ts`): un ingrediente solo in q.b. nella settimana compare senza
  quantità, e solo se in dispensa il residuo è 0. Se compare anche con quantità, vale la somma
  delle quantità (il q.b. non aggiunge nulla).
- **Planner, storno, Scegli**: una riga q.b. non sposta residui né delta.
- **Editor del piatto**: la pillola della quantità ha la voce «Q.B.»; una riga q.b. mostra
  «Q.B.» al posto del numero.
- Le conversioni (`convertiInUnitaBase`) non vedono mai una riga q.b.: si esce prima.

## C. Cucchiai e cucchiaini

- Il lettore (`SCHEMA_ESITO` in `src/server/import-ai.ts`, `UNITA` in `valida.ts`) accetta
  `unita` anche `cucchiaio` e `cucchiaino`. Il prompt lo dice con un esempio. `RigaEstratta.unita`
  si allarga; `UnitaBase` no.
- L'import converte nell'unità dell'ingrediente con `CUCCHIAIO` in `formati-tipici.ts`:
  generico 15 ml / 5 ml; in grammi per alimento (es. miele 21/7, zucchero 12/4, olio 13/4,
  sale 18/6 — valori medi, segnati come tali). Ingrediente in ml → ml generici; in g → la
  tabella, e senza voce un dubbio con proposta 15 g / 5 g. Si mostra «1 cucchiaio, quindi
  15 ml».
- Verifica prima del merge con l'eval delle diete di prova (`npm run eval:import`): nessuna
  regressione sui casi esistenti, e le righe a cucchiai lette come tali. Costo dichiarato ad
  Andrea prima del lancio. Se il manifest dell'eval (`diete/eval-manifest.json`) manca, il
  piano lo ricrea o lo dichiara NON ESEGUITO.

## D. Proposte già compilate

Ogni cosa aperta arriva con la risposta proposta e già scelta; resta segnata «proposta da me»
e non blocca:
- **Riga senza quantità (non q.b.)**: la quantità inferita dal lettore se c'è (già oggi), poi
  una porzione tipica da tabella `PORZIONE_TIPICA` in `formati-tipici.ts` (stessa forma della
  tabella dei formati), altrimenti resta un dubbio senza proposta.
- **Unità diverse nello stesso gruppo**: l'unità più frequente nelle righe del gruppo; a pari
  merito quella della prima riga.
- **Pasto**: la proposta di `proponiSlot` (già oggi).
- **Ingrediente**: la proposta di `proponi` (già oggi), più il cambio di unità (A).

`pronto` / `motiviBlocco` contano come bloccanti solo i dubbi **senza** proposta.

## E. La bozza la salva il server

- `mappaturaPastiIniziale` passa da `page.tsx` a `src/domain/import/mapping.ts`, tipizzata su
  `PianoEstratto`.
- La route `/api/import/estrai`, dopo `validaEsito` e solo per un piano (non un rifiuto),
  legge le slot defs e fa l'upsert di `import_draft` con il client col JWT dell'utente
  (`user_id` = `casa_id`, come `import_uso`), poi risponde `{ ...esito, bozzaSalvata: true }`.
  Funzioni dati con il client come parametro (come `import-uso.ts`).
- Salvataggio fallito → si risponde comunque con l'esito, `bozzaSalvata: false`, e il telefono
  salva come oggi. Mai un'estrazione pagata persa per un errore di scrittura.
- La nota sotto il titolo durante l'attesa cambia: «Puoi uscire dall'app: quando torni, la
  dieta letta ti aspetta.» — **solo dopo** la prova dal telefono che lo conferma; fino ad
  allora resta quella di oggi. [ipotesi da verificare: Vercel completa la funzione anche con il
  client scollegato.]

## F. L'indietro di Android

- Ogni passo (`revisione` → `formati` → `riepilogo`) ha una voce di cronologia: entrare in un
  passo spinge una voce; l'indietro torna al passo prima (e salva lo stato come il tasto
  indietro di oggi).
- Da Controlla l'indietro apre `DialogoConferma` tono `primario`: titolo «Esci dall'import?»,
  testo «Lo ritrovi com'è: riprendi quando vuoi.», tasti RESTA / ESCI. ESCI → `tornaA` verso la
  pagina di provenienza, come la freccia di oggi.
- I fogli aperti si chiudono prima, come oggi. Un solo `useIndietroFogli` per schermata
  (lezione 8b). I passi sono gestiti dalla pagina, non dai fogli.
- Copre il KO 7: dopo TOGLI l'indietro resta in Importa.

## G. «È lo stesso di…»

- `SelettoreFoglio`: altezza massima (come `foglio-alto`) e lista con `overflowY: auto`; vale
  per ogni uso del Selettore.
- La scelta «nuovo» / «ce l'ho già» si salva in `scelti` anche per «nuovo» (valore esplicito),
  e `legataA` la rispetta: il nome non riporta più la scelta indietro.
- «No, è nuovo» rimette il nome proposto **con gli accenti** (`grezzo`, come
  `calcolaProposte`) e la Scheda mostra subito i campi dell'ingrediente nuovo.
- La riga del selettore dice la scelta: «Ingrediente nuovo» o il nome di quello che hai.
- Il selettore elenca anche gli ingredienti abbinabili con cambio di unità (A.2), con la nota
  della conversione.

## H. Riepilogo e scrittura

- Tasto del Dock sempre «SALVA IL PIANO».
- Dialogo solo se c'è un piano attuale (piatti del nutrizionista attivi): titolo «Salvare il
  nuovo piano?», testo in chiaro con i numeri (es. «3 piatti nuovi, 12 aggiornati, 4 tolti da
  Piatti. I tuoi piatti restano.»), tasto SALVA tono `primario`.
- Un riassunto sempre visibile al posto della riga «da disattivare»: piatti nuovi, aggiornati,
  tolti; ingredienti nuovi; ingredienti che cambiano unità (con i due valori).
- Dopo il tocco: stato «Salvo il piano…» con avanzamento a passi (ingredienti, piatti, fine) e
  `aria-busy`; poi `router.replace('/piano')` e sul Piano «Piano salvato» (avviso breve, §7
  del design per il movimento).
- `eseguiScritture`: si raggruppano le scritture dove possibile (upsert in blocco degli
  ingredienti, della dispensa e delle disattivazioni; i piatti restano uno per uno se serve
  l'id). La durata si misura prima e dopo sul piano di Andrea [misura da fare: oggi stimata,
  non misurata].

## I. Migrazione 0016

`supabase/migrations/0016_import_unita_e_qb.sql`: il check di `dish_ingredient.quantita`
(`null` = q.b.) e la funzione `cambia_unita_ingrediente` (A.4), `security invoker`, `grant
execute` ad `authenticated`. Si applica in produzione **prima** del merge, con l'ok di Andrea
(Supabase MCP), e si verifica con una lettura.

## J. Test e misure

- Dominio: abbinamento a due livelli, pesi, arrotondamenti, q.b. riconosciuto, cucchiai,
  proposte compilate, `pronto` con le proposte; differenziale vecchio contro nuovo su `pronto`
  e `motiviBlocco` per i casi senza unità diverse né q.b. (devono coincidere).
- Lista: q.b. con e senza residuo, q.b. più quantità.
- Route: bozza salvata, salvataggio fallito con esito comunque restituito.
- Pagina: voci di cronologia dei passi, dialogo di uscita da Controlla.
- Migrazione: la funzione su un database locale o con un test SQL dove possibile; altrimenti
  la verifica è la lettura dopo l'applicazione.
- Misure dichiarate [misurato]/[ipotesi]: durata di `eseguiScritture` prima/dopo; numero di
  cose che bloccano sul PDF di Andrea prima/dopo (con la bozza di una lettura salvata in
  locale, nessuna chiamata al modello in più).

## K. Prove dal telefono (dopo il merge)

1. Import del PDF di 10 pagine; durante l'attesa passa a un'altra app per 30 s, torna: la
   dieta letta c'è (RIPRENDI).
2. Le zucchine: nessun avviso di doppione; la Scheda dice «Zucchine passa a grammi…» con i
   due valori; dopo il salvataggio la lista e i tuoi piatti sono in grammi.
3. Sale, pepe, spezie: nessuna domanda; in lista solo se in dispensa non ci sono.
4. Una riga a cucchiai: «1 cucchiaio, quindi 15 ml».
5. In Controlla apri TOGLI, conferma, indietro: resti in Controlla. Ancora indietro: il dialogo
   «Esci dall'import?». RESTA.
6. Da Ingredienti indietro: Controlla. Da Riepilogo indietro: Ingredienti.
7. «È lo stesso di…» con molti ingredienti: la lista scorre; «No, è nuovo» funziona e rimette
   il nome con gli accenti.
8. SALVA IL PIANO: dialogo blu notte con i numeri; «Salvo il piano…» con avanzamento; il Piano
   con «Piano salvato».

## Rischi e obiezioni

- **Il cambio di unità tocca dati vivi.** Per questo è una funzione unica in transazione, con
  test, e la migrazione passa da Andrea. Le istantanee (liste e risparmio) non si toccano.
- **Pesi e cucchiai sono medie.** Si mostrano sempre i due valori, e Andrea può correggere
  il peso nella Scheda.
- **Il lettore cambia (cucchiai).** È l'unico tocco al lettore; verificato con l'eval prima
  del merge, costo dichiarato.
- **La 8d rifarà l'interfaccia.** Qui si cambia solo quello che serve al motore e ai KO; i testi
  nuovi passano dal design system (DESIGN.md §13).
