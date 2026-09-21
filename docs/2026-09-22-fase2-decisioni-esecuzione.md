# Fase 2 del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 22/09/2026 · **Ramo:** `redesign/lista-piano`, 16 commit da `f97ab26` a `0948640`
**Piano:** `docs/superpowers/plans/2026-09-21-lista-piano.md`
**Spec:** `docs/superpowers/specs/2026-09-21-lista-piano-design.md`

Questo file esiste perché l'esecuzione subagent-driven tiene il suo registro in
`.superpowers/`, che è ignorato da git e viene cancellato alla fine. Le decisioni che ho preso
al posto di Andrea, mentre lui non c'era, devono sopravvivere al registro: le legge, e rifà
quelle che ho sbagliato.

Ognuna ha il costo se è sbagliata. Le prime due riguardano il processo, le altre il prodotto.

## Il piano ha sbagliato più dell'implementazione, e ha sbagliato nei test

Il dato più utile di questa esecuzione: **tredici difetti nel codice di test che il piano
specificava**, contro nessuno nel codice di produzione. Li hanno trovati gli implementatori,
task per task:

| Dove | Cosa | Conseguenza se non trovato |
|---|---|---|
| Task 2 | `import '@testing-library/jest-dom/vitest'` mancante | i matcher non esistono, il test non parte |
| Task 3 | il filtro dei «giorni lontani» escludeva solo oggi | in una settimana di sette giorni anche ieri e domani portano la parola: il test non poteva passare |
| Task 4 | «il portale del Dock si monta in `document.body`» | **falso**: senza `SlotDockProvider` il Dock non si monta, e tutti i casi «il Dock non c'è» sarebbero stati verdi a vuoto |
| Task 4 | `vi.mock('@/data/lista')` non esportava `fondiSezioni` | ogni test del file sarebbe crollato |
| Task 4 | id di lista sbagliato (`lista-topup` invece di `lista-topup-1`) e `expect.any(String)` | l'asserzione non distingueva le due liste |
| Task 4 | due casi nuovi duplicavano test già presenti | lavoro doppio |
| Task 4 | l'asserzione «senza pillola» cercava l'em-dash del formato vecchio | sarebbe passata **con** la pillola a schermo |
| Task 5 | date che le fixture non potevano dare (`SETTIMANA DEL 14 SETTEMBRE`, `GIOVEDÌ 17`) | falliscono sempre |
| Task 5 | una maiuscola che jsdom non applica | falso verde sulla maiuscola |
| Task 5 | conteggio sbagliato per quelle fixture | falliva |
| Task 5 | un caso che non provava il proprio titolo | verde e vuoto |
| Task 5 | l'helper `schermo()` che in quel file non esiste | non compila |
| Tutti | le intestazioni dei quattordici step dicevano «il commit lo fa il coordinatore» mentre il vincolo globale diceva il contrario | un implementatore ha lasciato l'albero non committato, lettura legittima |

**Cosa cambiare la prossima volta.** Scrivere codice di test in un piano è utile — dà il
bersaglio — ma va marcato come bozza da verificare, non come valore da copiare. E un piano che
introduce copy deve aggiornare la tabella delle stringhe della spec nello stesso passaggio:
il vincolo «nessun testo inventato, ogni stringa nuova è quella della spec §I» è stato violato
**dal piano stesso**, nel Task 6, e nessuno dei sette cancelli l'ha visto perché ognuno
guardava il proprio task. L'ha trovato la review finale.

## Le decisioni di processo

**Committa chi implementa, non il coordinatore.** Il piano diceva il contrario, ma la review di
ogni task legge un intervallo `BASE..HEAD` di git: senza il commit dell'implementatore il diff
da rivedere è vuoto e il cancello non esiste. *Costo se sbagliato:* la storia del ramo ha un
commit per task invece di commit rifatti alla fine.

**Ogni task chiude con la suite verde, anche quando rompe i test di un altro.** Il Task 3
pretendeva la suite verde e insieme diceva di lasciare rotti i test di pagina che le sue
modifiche facevano cadere. Ho deciso che aggiusta quello che rompe lui, limitandosi alle
asserzioni sulla resa dei tre componenti. *Costo se sbagliato:* il diff del Task 3 cresce di
qualche riga di test che il 4 o il 5 avrebbero toccato comunque.

**Ho saltato una ri-review.** Il giro di correzione del Task 6 era di sola documentazione, la
review aveva già dato «approvato» senza rilievi, e il fatto su cui poggiava l'avevo verificato
io. *Costo se sbagliato:* una riga di documento non ri-controllata da un terzo.

## Le decisioni sul prodotto

**I testi informativi della Lista stanno in `--testo-2`, non nel `--sec` che la spec
prescriveva.** La spec §D diceva «la riga offline resta `--sec`» e me lo sono portato nel
piano, ma `--sec` (#8A8A96) sta sotto la soglia di contrasto per un testo su cui una persona
agisce in corsia, e la decisione del 17/09 aveva fissato `--testo-2` proprio per questo. Era la
spec a sbagliare. *Costo se sbagliato:* due righe di testo più scure del mockup.

**La riga offline è stata riformulata.** L'etichetta nuova della settimana finiva dentro una
frase preposizionale e la rompeva: «questa è la lista di **Settimana del 24 agosto** salvata
l'ultima volta che l'hai aperta». Ora l'etichetta sta in apposizione dopo l'em-dash. Ho
scartato una seconda forma dell'etichetta, perché l'istantanea offline salva solo la stringa
già formattata e non la data: servirebbe un campo nuovo nella cache per un problema di
grammatica. *Costo se sbagliato:* l'ordine di una frase.

**Il contatore settimanale del Piano è stato cancellato** (decisione di Andrea del 21/09, qui
solo applicata): al momento di confermare non si legge più su quanti pasti si sta chiudendo la
settimana. Il riassunto resta la striscia dei giorni coi pallini pieni.

**La riga che spiega «va comprato fresco?» diceva il falso, e l'ho riscritta.** Il piano l'aveva
portata a `IL RESIDUO NON ARRIVA ALLA SETTIMANA DOPO`: falso per i surgelati, dove
`GIORNI_FRESCO.surgelati` è `null` e il residuo non decade mai; falso per il congelato, dove la
soglia è 90 giorni; falso a esattamente sette giorni, dove il confronto stretto lo lascia
vivere. Ora dice `QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO` / `IL RESIDUO NON SCADE`, ed è
verificato in `pantry.ts` e `scadenza.ts`. **Resta un limite dichiarato:** se un giorno quella
schermata esporrà anche `congelato`, la sottoriga va rivista, perché con il congelatore la
durata non dipende dal reparto. *Costo se sbagliato:* una riga che spiega un interruttore.

**La coda di scorrimento degli scroller col Dock è una sola.** La sonda nel browser ha misurato
che nel Piano l'ultima riga pasto finiva **7,75 px dietro il Dock** nello stato assestato dello
scorrimento — irraggiungibile in corsia — e che la Lista aveva lo stesso difetto e si salvava
per **quattro pixel**, cioè per caso. La causa era che `--coda-dock` cambiava con lo stato della
barra, quindi `con-dock` era il solo scroller dell'app la cui corsa dipende da `data-barra`: il
browser ritagliava `scrollTop`, e il ritaglio è un evento di scorrimento a delta negativo che
la barra legge come risalita. Ho scelto di togliere la causa (una coda sola, 194 px) invece
dell'alternativa misurata (aggiustare `calcolaStatoBarra`), che avrebbe toccato il guscio della
fase 1 — in produzione, usato da sedici schermate, con le soglie provate da Andrea dal telefono.
*Costo accettato e dichiarato:* 18 px di aria in fondo alla lista a barra ridotta, uno stato
transitorio.

**Il gap dei pallini della striscia: una decisione che ho preso sbagliata.** A sei pasti il gap
3 del file di disegno lascia 0,71 px per lato a 375 px e sborda a 360, che è la larghezza di
metà degli Android in circolazione, e «da 3 a 6 pasti» è una decisione di prodotto del 20/09.
Ho fatto stringere il gap a 2 **oltre i quattro pasti** — ma la soglia misurata era **sei**: a
cinque pasti il gap 3 sta dentro con 4,7 px per lato. Abbandonavo il valore del disegno in un
caso che non lo richiedeva, e nessun test lo notava. L'ha trovato la review finale; ora è
`> 5`, con due asserzioni che coprono i due casi. Questa scelta **non deriva dai file di
design**: il caso a sei pasti non è reso in nessuno di loro, e vale farlo disegnare.
*Costo se ancora sbagliato:* un pixel di gap in un caso che nessun mockup mostra.

**La firma di `rispondi` ha perso il parametro `listaId`**, che la voce già porta. Con due
sorgenti per lo stesso dato un chiamante poteva dissociarle — ed era esattamente la mutazione
con cui l'implementatore aveva falsificato il proprio test. Ora quella classe di bug non è
rappresentabile nel tipo, non solo assente. *Costo se sbagliato:* due punti di chiamata.

## Le derive che restano aperte, e dove

La review finale ha triagiato dodici rilievi minori rinviati. Nessuno blocca il merge. I tre
che vale la pena ricordare:

- **`src/domain/list-builder.ts:238-242`** contiene una **terza** copia letterale del
  comparatore di ordinamento che questa fase ha unificato fra `raggruppaInSezioni` e
  `fondiSezioni`. Fuori dal ridisegno, giusto come task a sé.
- **Il predicato «pasto a casa con un piatto» è scritto tre volte**: il pallino della striscia,
  il conteggio nell'`aria-label`, l'etichetta del Piano. Oggi coincidono, e una `on delete
  cascade` nel database garantisce che non ci siano slot orfani. Vale unificarlo prima che la
  fase 5 aggiunga la matrice dei pasti come quarto consumatore.
- **Il primario del Dock sta fuori da ogni landmark.** Chi naviga per regioni con lo screen
  reader non incontra l'azione principale della schermata: la trova solo scorrendo il focus. Con
  un Dock è difendibile; le fasi 3, 4 e 5 ne monteranno altri nello stesso slot, e la decisione
  va presa adesso, non alla quarta.

## La nota operativa che costa mezz'ora a chi non la sa

Dopo aver cancellato una pagina-sonda temporanea va rimossa anche `.next/dev/`, altrimenti
`tsc` falisce con `TS2307` su un `validator.ts` generato che cita la pagina morta.

E per chi scriverà la prossima sonda: **mai usare `scrollHeight − clientHeight` come bersaglio
del fondo di uno scroller.** Sono interi arrotondati, `scrollTop` non lo è: qui la differenza
dava 217 mentre il fondo vero era 217,5, e mezzo pixel è finito in una tabella di misure. Va
riportata sempre la posizione accanto alla misura.
