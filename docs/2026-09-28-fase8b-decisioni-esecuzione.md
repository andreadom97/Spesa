# Fase 8b del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 28/09/2026 · **Ramo:** `fase8b-importa-revisione` · **Piano:**
`docs/superpowers/plans/2026-09-28-importa-8b.md` · **Spec:**
`docs/superpowers/specs/2026-09-27-importa-8b-design.md` (approvata da Andrea il 27/09)

L'esecuzione subagent-driven tiene il suo registro in `.superpowers/`, una cartella che git ignora
e che alla fine viene cancellata. Questo file la sostituisce. Raccoglie:
- le decisioni di Andrea, prese prima dell'esecuzione, e quelle prese scrivendo la spec;
- come sono stati eseguiti i task, coi ruling del controller;
- le review di correttezza, coi differenziali misurati dai revisori;
- ciò che resta aperto;
- le prove da fare dal telefono.

Etichette: `[misurato]` per ciò che è stato misurato (sempre con test automatici, mai nel
browser), `[ipotesi]` per ciò che non lo è.

## Le decisioni di Andrea (27/09)

1. **Direzione B, «Solo i dubbi».** Di default tutto è accettato; si tocca solo ciò che l'AI non
   sa; il resto è riassunto e si apre col tocco.
2. **Il giorno aperto corregge quantità e righe.** Nel foglio del giorno si cambia la quantità di
   una riga e si toglie una riga. Nomi dei piatti e piatti interi si sistemano dopo, nell'editor
   del Piatto (fase 7).
3. **Il nome dell'ingrediente viene dalla dieta.** La tabella dei formati presta area, confezione,
   classe e fresco; il nome è il suo solo se l'alimento è esattamente la chiave. Le chiavi si
   confrontano per parole intere. Due proposte che finiscono con lo stesso nome sono un dubbio che
   blocca finché non se ne rinomina una. Unire due ingredienti nuovi in uno: no.
4. **Il ripiego non blocca.** Un ingrediente fuori tabella ha la scheda aperta fra quelli «da
   controllare», ma `VAI AL RIEPILOGO` resta acceso. Il ripiego a pezzi propone 1 pz a confezione;
   in g e ml resta 500.
5. **Una riga irrisolta ripetuta è un dubbio solo.** Le righe con lo stesso alimento e lo stesso
   testo sul foglio diventano un gruppo: una risposta vale per tutte.

## Le decisioni prese scrivendo la spec

Andrea le ha viste nel design e non le ha corrette, o sono nate scrivendo la spec:

6. L'unità si sceglie con le **pillole G / ML / PZ dell'editor dell'ingrediente**
   (`SceltaUnita`), non col Segmento a blocco: Importa non introduce una regola nuova.
7. **Nella scheda di Ingredienti l'unità non si cambia**: è quella delle righe della dieta.
8. **Un gruppo di righe irrisolte ha l'unità fissa se il piano la conosce già** per lo stesso
   alimento (un'altra riga con l'unità), presa fuori da **ogni** gruppo irrisolto dello stesso
   alimento, non solo dal proprio.
9. **Togliere l'ultima riga svuota a cascata**: opzione, componente, piatto, pasto.
10. Il gruppo dei giorni si chiama **«I giorni»**, non «Il resto».
11. **Il titolo è «Importa»** in tutte le schermate di `/importa`, con la pillola del passo sotto
    il titolo nelle schermate dei quattro passi.

## Come sono stati eseguiti i task

Esecuzione subagent-driven, un implementatore alla volta salvo dove annotato. Modello di default
dell'implementatore: sonnet; opus dove il task lo richiedeva esplicitamente (file grossi o
delicati). Per ogni task: commit, modello, giri di correzione, cosa ha trovato la review.

- **Task 1** (`proponi`/`origineProposta`, `231778a`, sonnet). 0 giri di correzione: review opus
  approvata subito. Trovato in review: 4 minor rinviati (punteggiatura attaccata alla chiave che
  rompe l'abbinamento — es. «latte-scremato» → ripiego, «frutta secca,» → voce «frutta»; un
  docstring e un esempio disallineati; test mancanti su `origineProposta` con unità null e nomi
  con maiuscole/spazi; `normalizza` calcolata due volte in `proponi`).
- **Task 2** (`dubbi.ts`, `a13cf5f` → fix round 1 `ba05e1e`, sonnet; ri-review sonnet). 1 giro di
  correzione. Trovato in review: aderente al brief, ma 1 Important — `unitaFissa` si fissava a
  vicenda fra due gruppi irrisolti dello stesso alimento. Ruling del controller (sotto):
  `unitaNota` salta le righe di ogni chiave irrisolta, non solo la propria. Il giro ha corretto
  anche un minor (test di `pronto` con slot sparito); rinviati: `unitaNota` e
  `chiaviGruppiIrrisolti` ripercorrono il piano più volte per render (costo di prestazioni, non
  di correttezza).
- **Task 5** (`RigaAlimento`, `SceltaUnita` estratta, `c1726dd`, sonnet), dispatched mentre il
  Task 2 era in review (ruling sotto, costo nullo: T5 non dipende da T2–T4). 0 giri di correzione:
  review sonnet approvata, nessun Important. Rinviato: `numeroPositivo` sostituisce solo la prima
  virgola di un input patologico (rifiutato, non accettato per sbaglio).
- **Task 3** (scritture e cascata in `dubbi.ts`, `fc87669`, sonnet). 0 giri di correzione: review
  opus approvata. Rinviati: il differenziale nel repo copre solo una riga fissa (manca un caso
  d'opzione con cascata `[1,0] → [1]`); una bozza vecchia già salvata con piatto/opzione vuoti li
  conserva (la cascata agisce solo sulle rimozioni nuove, annotato nei limiti noti); nessun test
  che congeli il piano per blindare l'immutabilità.
- **Task 4** (`ingredienti.ts`: `calcolaProposte`, `legataA`, nomi doppi, `7bace57` → fix round 1
  `1b1ba76`, sonnet). 1 giro di correzione. Trovato in review: `calcolaProposte` e `passoBloccato`
  aderenti, ma un minor con conseguenza — `legataA` era esatta ma `traduciBozza` aggancia anche
  per inclusione, quindi una proposta come «Pasta di semola» sarebbe finita legata in silenzio
  mentre la schermata diceva «nuovo». Ruling del controller: `legataA` diventa `abbina` come
  `traduciBozza`. Una seconda correzione a questo stesso ruling è arrivata durante la review del
  Task 8 (sotto): `legataA` resta `abbina` ma torna `null` col nome vuoto.
- **Task 6** (`SelettoreFoglio`, `ce128f5`, sonnet). 0 giri di correzione: review sonnet
  approvata. Rinviato: le voci radio non hanno roving tabindex né le frecce del pattern APG.
- **Task 7** (`Controlla.tsx` e `FoglioGiorno.tsx` al posto di `Revisione.tsx`, `2f49564` → fix
  round 1 `978f69f`, opus per «file grossi e delicati»), consegnato `DONE_WITH_CONCERNS`. 1 giro
  di correzione (6 rilievi risolti, 0 aperti). Trovato in review (opus): aderente, con uno
  scostamento dal brief accettato dal controller (il foglio del giorno mostra solo i pasti con
  piatti alla sua apertura, dove il brief avrebbe voluto tutti i pasti: la spec §E vince) e 1
  Important — l'indietro con la tastiera aperta nel foglio del giorno perdeva il numero scritto e
  non salvato, più un rischio [ipotesi, non provato in browser] di scrittura in un giorno sbagliato
  dopo la chiusura. Il giro ha messo i valori in `ref`, un blur esplicito in `chiudiGiorno`, e ha
  aggiunto il Dock spento se non resta nessun pasto da confermare, fra altri minor economici.
  Rinviati: nessun test su chiusura dal velo, ANNULLA/indietro sul dialogo TOGLI, indietro sul
  Selettore; l'accesso da tastiera raggiunge le righe sotto un foglio aperto (preesistente, niente
  `inert` né trappola del fuoco); il blur tardivo di Chrome sull'input rimosso non è provato in
  browser (da confermare nelle prove dal telefono).
- **Task 8** (`Ingredienti.tsx` e `SchedaIngrediente.tsx` al posto di `Formati.tsx`, `5d84589` →
  fix round 1 `978f69f..5b3364c` → fix round 2 `bc1182b..d6fb552`, opus), consegnato
  `DONE_WITH_CONCERNS` con 4 dubbi già segnalati dall'implementatore stesso [misurato
  dall'implementatore]. 2 giri di correzione, poi **completo** (commits `1b1ba76..d6fb552`, review
  clean). Il round 1 ha chiuso i 4 dubbi noti più le «Da correggere» della review opus: il campo
  Nome si smontava anche col nome esatto raggiunto a metà parola («Pasta» dentro «Pasta di farro»);
  il Dock si spegneva senza causa visibile; una scheda di «Da controllare» saltava in «Da
  sistemare» mentre si scriveva; le bozze vecchie con l'unità cambiata in Formati non si
  riaprivano. I tre ruling del controller per queste correzioni: la modalità legata della Scheda
  la decide la scelta fatta in «È lo stesso di…» (`sceltiEsistenti`), non il nome; «Da sistemare»
  raccoglie ogni proposta che blocca (nome doppio, nome vuoto, confezione non valida), si entra lì
  solo da «Proposti da me», e il contatore conta tutte le proposte che bloccano, non solo quelle
  della sezione; `calcolaProposte` ripropone da capo una proposta conservata la cui unità non è
  quella delle righe. Il round 1 ha aperto 1 nuovo Important (`formatoTesto` disallineato fra
  l'istanza in pagina e quella nel foglio: la pagina mostrava Confezione vuota col Dock acceso). Il
  round 2 l'ha chiuso con 3 correzioni (`bc1182b..d6fb552`, 3 addressed, 0 open, [misurato dal
  ledger]): la Confezione si riallinea fra la scheda in pagina e quella nel foglio; il contatore di
  «Da sistemare» conta tutte le proposte che bloccano; il titolo di un test dice cosa verifica
  (`ingredienti.test.ts:162`). Rinviati: «No, è un ingrediente nuovo» butta il nome scritto a mano
  (conforme alla spec); l'`aria-live` dell'avviso è montato già col testo; mentre si scrive,
  `abbina` lega per inclusione nei due versi (con «P», con «Pa») e «Finirà su…» cambia lettera per
  lettera; svuotare il nome dal foglio porta la proposta in «Da sistemare» per sempre.
- **Task 9** (titolo «Importa» e pillola del passo, `bc1182b`, sonnet). 0 giri di correzione:
  review sonnet approvata.
- **Task 10** (questo task: i documenti). Nessun codice toccato. BASE `d6fb552`; il Task 8 ha
  chiuso la sua ri-review finale (round 2, review clean) mentre questo task era in corso.

## Le review di correttezza

Le review di correttezza dei Task 1–4 hanno misurato un differenziale automatico (non nel
browser) fra il comportamento nuovo e un riferimento — l'oracolo della spec, la funzione di oggi,
o la Revisione di oggi:

- **Task 1**: 2196 casi, 0 differenze dall'oracolo della spec [misurato dal revisore].
- **Task 2**: 1.347.456 casi, `pronto` contro `tuttoPronto`, 0 differenze inattese (45.095 la
  differenza voluta: lo slot sparito) [misurato dal revisore].
- **Task 3**: cambi e risposte identici alla Revisione di prima (375 + 164 casi), rimozioni
  diverse solo per la cascata, 13.767 passi a catena senza scarti, piano mai mutato [misurato dal
  revisore].
- **Task 4**: `calcolaProposte` uguale a quella di Formati su 4000 casi, `passoBloccato` (il
  cancello) diverso solo per prezzo e doppi su 20000 casi [misurato dal revisore].

**Nessuna di queste misure è stata fatta nel browser**: sono differenziali automatici fra
funzioni, eseguiti dai revisori durante l'esecuzione. Le prove dal telefono (sotto) sono ancora
tutte da fare.

## I ruling del controller

Dal ledger, con il costo dichiarato se il ruling fosse sbagliato:

1. **Ordine dei task**: il Task 5 (componenti, file indipendenti) parte mentre il Task 2 è in
   review, prima dei Task 3–4 — un solo implementatore alla volta, e il Task 3 tocca `dubbi.ts`
   che è sotto review. Costo se sbagliato: nessuno, il Task 5 non dipende dai Task 2–4.
2. **Test dell'Invio (Task 5)**: se `blur()` di jsdom non arriva a `onBlur` di React,
   l'implementatore può far scattare l'uscita nel test con `fireEvent.blur` dopo il `keyDown`,
   purché il componente resti «Invio = uscita dal campo» con una sola chiamata — il comportamento
   chiesto dalla spec è l'uscita, non il mezzo del test. Costo se sbagliato: un test meno fedele
   al telefono. (Non servito: il test del brief passava già senza `fireEvent.blur` extra.)
3. **Unità fissa (Task 2)**: `unitaNota` salta le righe di ogni chiave irrisolta (nel piano
   originale o effettivo), non solo dal proprio gruppo, a firma invariata. Costo se sbagliato: due
   gruppi dello stesso alimento senza altra fonte mostrano entrambi le pillole e l'utente può
   sceglierne due diverse — conflitto di unità al riepilogo (nei limiti noti, sotto).
4. **`legataA` (Task 4)**: diventa `abbina(proposta.nome, proposta.unitaBase, esistenti)`, lo
   stesso criterio di `traduciBozza` — la schermata deve dire il vero su cosa crea. Costo se
   sbagliato: una proposta agganciata per inclusione non si stacca con «No, è nuovo» (nei limiti
   noti, sotto).
5. **Scostamento del Task 7 accettato**: il foglio del giorno mostra solo i pasti con piatti
   all'apertura, e «Pasto tolto» solo per quelli svuotati nel foglio, coerente con la spec §E
   («fino alla chiusura») contro il brief. Costo se sbagliato: un pasto già vuoto non compare nel
   foglio del giorno (ma compare comunque nel riassunto come pasto in meno).
6. **Correzione del ruling 4 (durante il Task 8)**: `legataA` resta `abbina` ma torna `null` se il
   nome normalizzato è vuoto; la Scheda passa in modalità legata (campi nascosti) **solo** se il
   nome coincide esattamente con l'esistente scelto in «È lo stesso di…»; una legata per sola
   inclusione resta con la scheda intera e la nota «Finirà su…». Costo se sbagliato: una scheda in
   più, piena di campi, per i casi di inclusione — rari.
7. **Modalità legata decisa dalla scelta (Task 8)**: la modalità legata della Scheda la decide la
   scelta fatta in «È lo stesso di…» (`sceltiEsistenti`), non il nome: decisa dal nome, il campo
   Nome si smonterebbe mentre lo si scrive. Costo se sbagliato: una scelta fatta prima di un
   aggiornamento e poi rinominata a mano torna scheda completa.
8. **«Da sistemare» con tre avvisi (Task 8)**: raccoglie ogni proposta che blocca — nome doppio,
   nome vuoto, confezione non valida — ciascuna col suo avviso; si entra nella sezione solo da
   «Proposti da me»; `passoBloccato` salta il campo Confezione per le legate. Costo se sbagliato:
   una sezione con più tipi di problema misti.
9. **Bozze vecchie con l'unità cambiata (Task 8)**: `calcolaProposte` ripropone da capo una
   proposta conservata se la sua unità non è quella delle righe. Costo se sbagliato: si perdono le
   correzioni manuali fatte a quella sola proposta.
10. **Dock spento senza scheda visibile (Task 8)**: accettato che il Dock si spenga con «Da
    sistemare» vuota quando a bloccare è una Scheda già aperta in pagina — resta dov'è, con
    l'avviso sotto il campo appena toccato. Costo se sbagliato: chi ha scorso lontano da quella
    scheda non vede perché il Dock è spento.
11. **Contatore globale (Task 8)**: il contatore di «Da sistemare» conta tutte le proposte che
    bloccano (`motiviBlocco`), non solo quelle della sezione — «FATTO» col Dock spento sarebbe
    copy falso. Costo se sbagliato: il numero può includere una scheda che sta in «Da
    controllare».

## I limiti noti

Dalla spec §J, tutti confermati validi a fine esecuzione:

- **Chi conferma senza aprire i giorni non vede le righe lette con sicurezza**: un 120 g letto
  come 12 g passa. Prezzo scelto della direzione B. [ipotesi, non testata]
- **Il conflitto di unità letto dall'AI resta**: se l'estrazione scrive lo stesso alimento in g in
  una riga e in pz in un'altra, il riepilogo va in `BozzaIncompletaError` e Controlla non ha un
  dubbio che lo spieghi. [ipotesi, derivato dal codice, non osservato su una dieta vera]
- **«Da sistemare» dei pasti dipende dagli slot di oggi**: un nome può passare da «Da sistemare» a
  «Dove vanno i pasti» se l'utente aggiunge uno slot fra una sessione e l'altra; la mappatura
  scelta resta. Nota dal Task 7: nelle bozze vecchie un nome riconosciuto ma senza mappatura sta
  in «Da sistemare» e dopo la scelta salta in «Dove vanno i pasti».
- **Il foglio del giorno perde le modifiche se l'app si chiude col foglio aperto**, perché
  risalgono alla chiusura — regola di oggi per il cambio di giorno.
- **Due gruppi irrisolti dello stesso alimento, senza nessun'altra riga con l'unità, mostrano
  entrambi le pillole** (ruling 3): scegliendo due unità diverse il riepilogo va in
  `BozzaIncompletaError`. [ipotesi, derivato dal codice, non osservato su una dieta vera]
- **Una proposta agganciata per inclusione non si stacca con «No, è un ingrediente nuovo»**
  (ruling 4/6): si stacca solo rinominando la proposta in qualcosa che `abbina` non trovi più.
  [derivato dal codice: `legataA`/`abbina`]

Aperti dai `minor (deferred)` del ledger, non toccati:

- **Prestazioni** (correttezza non in dubbio): `unitaNota` e `chiaviGruppiIrrisolti` ripercorrono
  il piano più volte per render, O(gruppi × righe) (Task 2).
- **`formati-tipici.ts`** (Task 1): la punteggiatura attaccata alla chiave rompe l'abbinamento
  («latte-scremato» finisce nel ripiego, «frutta secca,» diventa la voce «frutta», non «ortofrutta
  1000 g»); un docstring e un esempio disallineati; test mancanti su `origineProposta` con unità
  null e nomi con maiuscole/spazi; `normalizza` calcolata due volte in `proponi`.
- **`numeroPositivo`** (Task 5) sostituisce solo la prima virgola: un input patologico è
  rifiutato, non accettato per sbaglio — non un difetto verso la spec.
- **Il differenziale della cascata** (Task 3) copre solo una riga fissa, non un caso d'opzione
  `[1,0] → [1]`; una bozza vecchia già salvata con piatto/opzione vuoti li conserva (la cascata
  agisce solo sulle rimozioni nuove, non su quelle già in bozza); nessun test che congeli il piano
  per blindare l'immutabilità.
- **Accessibilità delle voci radio** (Task 6, `SelettoreFoglio`): niente roving tabindex né le
  frecce del pattern APG.
- **Test mancanti sul foglio del giorno** (Task 7): chiusura dal velo, ANNULLA/indietro sul
  dialogo TOGLI, indietro sul Selettore; il giorno senza pasti resta apribile su un foglio vuoto;
  le righe di «Da controllare» hanno la X (da confermare con Andrea se è voluto); l'accesso da
  tastiera raggiunge le righe sotto un foglio aperto, preesistente; il blur tardivo di Chrome
  sull'input rimosso non è provato in browser.
- **Ingredienti** (Task 8): «No, è un ingrediente nuovo» butta il nome scritto a mano (conforme
  alla spec); l'`aria-live` dell'avviso è montato già col testo; mentre si scrive, `abbina` lega
  per inclusione nei due versi («P», «Pa») e «Finirà su…» cambia lettera per lettera; svuotare il
  nome dal foglio porta la proposta in «Da sistemare» per sempre.

## Le prove dal telefono da fare

Su Chrome Android, con una dieta vera. Nessuna di queste prove è stata eseguita: sono **NON
ESEGUITE**.

1. Importa una dieta con i condimenti: in Controlla i condimenti sono in «Da sistemare», abbinali
   dal foglio, la voce scelta piena.
2. Rispondi a una riga senza peso scrivendo numero e pillola in ordine inverso: il dubbio resta al
   suo posto come fatto.
3. Trova una riga ripetuta in più pasti («In N pasti»): una risposta vale per tutti; togli il
   gruppo e passa dal dialogo.
4. Apri un giorno, cambia una quantità, chiudi con l'indietro di Android: la modifica c'è ancora
   riaprendo il giorno.
5. Tocca `CONFERMA I PASTI` e poi vai in Ingredienti: le olive (o un altro alimento fuori tabella)
   sono in «Da controllare» con la nota del ripiego.
6. Apri un ingrediente dalla riga, scegli l'area dal foglio sopra il foglio: l'indietro chiude
   prima il selettore, poi la scheda.
7. Rinomina un ingrediente come un altro: il Dock si spegne e l'avviso compare.
8. Scegli «È lo stesso di…» verso un ingrediente che hai già, poi torna su «No, è nuovo».
9. Arriva al riepilogo e crea il piano: la lista nasce giusta.
10. Riprendi una bozza salvata prima dell'8b (se ce n'è una): si apre in Controlla.
11. Nel foglio del giorno scrivi una quantità e fai indietro **con la tastiera aperta**. La
    quantità deve esserci riaprendo il giorno, e non deve comparire in un altro giorno (copre
    l'Important del Task 7 e il minor sul blur tardivo di Chrome, sopra).
12. In Ingredienti rinomina un ingrediente scrivendo lettera per lettera un nome che ne contiene
    uno che hai già (es. «Pasta di farro» con «Pasta» in dispensa): il campo non deve sparire
    (copre l'Important I1 del Task 8, la modalità legata decisa dalla scelta e non dal nome).
13. Svuota la confezione di un ingrediente dal foglio, poi riscrivila: la riga e la scheda devono
    mostrare lo stesso numero (copre l'Important del round 1 del Task 8, `formatoTesto`
    disallineato fra le due istanze).
