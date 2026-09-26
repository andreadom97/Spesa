# Fase 5 del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 25/09/2026 · **Ramo:** `fase5-impostazioni` · **Piano:** il piano della fase 5 (Impostazioni) in
`docs/superpowers/plans/` · **Spec:** `docs/superpowers/specs/2026-09-25-impostazioni-design.md`

L'esecuzione subagent-driven tiene il suo registro in `.superpowers/`, una cartella che git
ignora e che a fine lavoro viene cancellata. Questo file la sostituisce: raccoglie le decisioni
prese al posto di Andrea durante l'esecuzione, ognuna con quanto costa se è sbagliata, così
Andrea può rifare quelle che non gli tornano. Ogni task che prende una decisione che la spec
non copre la scrive qui, con `[misurato]` o `[ipotesi]`. Le righe della tabella delle
decisioni si numerano di seguito: ogni task continua dall'ultimo numero che trova, e i numeri
scritti nel piano sono indicativi.

## Le decisioni, con il loro costo

| # | Decisione | Perché | Costo se è sbagliata |
|---|---|---|---|
| 1 | `.barra` passa a larghezza propria già nel Task 1; le voci restano `flex: 1 1 0` con un tetto `max-width` di 96 / 76, invece di una `width` fissa | con tre voci la larghezza è esattamente 96 e 76 [calcolo: (304 − 12 − 4) / 3, (244 − 12 − 4) / 3]; con le quattro voci di oggi le voci sono 71,5 e 56,5, sopra 44, e la barra regge fino al Task 11 senza che il Task 11 tocchi il CSS | se tornasse una quarta voce si stringerebbero invece di sbordare |
| 2 | `.guscio-main` prende `transform` solo a pannello aperto (Task 1) | un `transform` fisso farebbe da contenitore ai `position: fixed` delle pagine (fogli, dialoghi, widget AI) e li sposterebbe | nessuno: col pannello aperto quei fogli non sono aperti, perché il loro velo copre il Menù utente che apre il pannello |
| 3 | La maschera del corpo del pannello sfuma solo gli ultimi 26 px (Task 1) | la spec dice «maschera ferma in fondo, `--fine` non serve» senza un valore; 26 è il padding in fondo al corpo, quindi a fine scorrimento niente resta sfumato | da guardare sul telefono: se la sfumatura non si vede, si toglie |
| 4 | Lo z-index dell'avvio (100) sta inline in `AvvioMarchio.tsx` (Task 14), senza token; il CSS dell'avvio (Task 1) ha solo stati, durate e curve | la spec §K chiede solo `--z-pannello`; l'avvio è un livello unico, sopra pannello (70) e dialogo (80) | nessuno: un numero in un posto solo |
| 5 | In `DESIGN.md` §6 «le quattro icone della tab bar» diventa «le icone della tab bar», con la conta di oggi (Task 1) | la spec §K non lo elenca, ma la barra perde una voce e §6 deve dire una cosa sola (come la decisione 2 della fase 4) | nessuno |
| 6 | L'errore di `DialogoConferma` sta sotto i tasti, con `role="alert"`, anche nel dialogo di eliminazione del lotto (Task 2) | spec §D; `DialogoElimina` è ora un suo uso, coi testi di oggi | nessuno: i test di oggi del dialogo cercano il testo, non la posizione |
| 7 | Il test dell'hook passa da `indietro.test.ts` a `src/components/__tests__/useIndietroFogli.test.tsx` (Task 2) | i test di `chiudiTuttoPoi` montano un componente; i dodici test di oggi sono invariati | nessuno |
| 8 | Una seconda `chiudiTuttoPoi` prima che la prima parta la sostituisce (Task 2) | una navigazione sola alla volta: vale l'ultima intenzione | due tocchi su due tessere diverse in meno di un `popstate` portano alla seconda |
| 9 | Il timer di riserva di `chiudiTuttoPoi` è sempre `ATTESA_POPSTATE_MS` pieno, anche quando un `go()` precedente è già in volo (Task 2) | un'attesa sola, deterministica e testabile coi timer finti | nel caso raro fn parte fino a 1 s più tardi del necessario |
| 10 | `DialogoConferma` ha `erroreTesto` e tiene da sé lo stato in volo e l'errore, invece delle prop `inVolo` ed `errore` della spec §D (Task 2, ruling P1 del controller) | è la forma di `DialogoElimina` della fase 4, già provata; chi lo usa passa solo `onConferma` che rifiuta se fallisce | nessuno: la firma è interna, il comportamento visibile è quello di §D |
| 11 | Nei test di `chiudiTuttoPoi` il «giro dopo» avanza i timer finti di 1 ms, non di 0 (Task 2) | vitest mette a +1 ms un `setTimeout(…, 0)` creato dentro un altro timer (`clock.duringTick ? 1 : 0`), com'è quello della riserva [letto in `node_modules/vitest/dist/chunks/test.DNmyFkvJ.js`, riga 1613] | nessuno: nessun altro timer dell'hook scade entro 1 ms |
| 12 | In `rispondiControllo` il «sì» resta un `update` di `ultimo_check` anche senza riga di dispensa, non un upsert (Task 4, C5) | senza riga l'update tocca zero righe senza errore; `ultimo_check` conta solo accanto a un `ultimo_acquisto`, e un upsert creerebbe una riga «mai comprato» identica all'assenza [misurato, `serveControllo`] | nessuno visibile: il «sì» dato dopo Cancella la dispensa non lascia traccia, ma nessuna lettura lo userebbe |
| 13 | L'evento `spesa:dispensa-cambiata` con la pagina ancora senza dati ricarica con `leggi` (attesa e stato d'errore), non con la rilettura silenziosa; «ha dati» sta in un ref allineato da un effetto (Task 4) | la rilettura silenziosa scarta il caricamento in volo, e se fallisce la pagina resta su `CARICO…` | nessuno: con i dati in pagina il comportamento è quello del piano |
| 14 | `?impostazioni=` si toglie con `window.history.replaceState(window.history.state, '', pathname)`, prima di aprire, e non con `router.replace` come diceva la spec §A.3 del 25/09 (aggiornata il 26/09), né con `null` come dice ancora il suo punto 1 (Task 6, regola B′) | l'hook mette le sue voci nello stesso giro di effetti: con `router.replace`, che è una transizione, le voci nascerebbero sull'indirizzo col parametro e un indietro lo ritroverebbe. Con `null` la voce perde `__NA` di Next e il primo indietro ricarica la pagina [misurato, sonda del Task 2, misura B e variante B′]. Un test di `pannello.test.tsx` controlla che la `replaceState` passi lo stato della voce | se Next non riallineasse il suo stato, `useSearchParams` vedrebbe il parametro vecchio: nessuno lo legge per `impostazioni` |
| 15 | Il contesto del pannello ha un valore inerte fuori dal provider (Task 6) | la Testata sta in ogni pagina, e i test delle pagine la montano senza Guscio | nessuno |
| 16 | Il pannello è sempre nel DOM: chiuso è `visibility: hidden`, `inert` e `aria-hidden` (Task 6) | la spec vuole la chiusura animata e il pannello montato dopo la prima apertura; montarlo sempre toglie il caso della prima apertura senza animazione | un nodo in più in ogni pagina |
| 17 | Il contenuto della cima si monta alla prima apertura e resta; quello di una sotto-schermata si smonta 200 ms dopo la freccia (Task 6) | la chiusura scende col contenuto dentro; l'uscita verso destra ha bisogno della sotto-schermata a schermo | nessuno |
| 18 | I dati del pannello si leggono all'apertura: la prima volta col `CARICO…`, poi in silenzio sopra quelli che ci sono (Task 6) | nessuna lettura per chi non apre il pannello, e nessun lampo di `CARICO…` alla seconda apertura | un dato cambiato da un altro telefono si vede con qualche istante di ritardo |
| 19 | La coda serializzata e «solo l'ultima richiesta tocca lo schermo» valgono anche per i pasti, che riconoscono anche il rifiuto RLS (Task 6) | spec §L: due tocchi veloci su celle diverse non si pestano; la pagina di prima metteva in fila solo le impostazioni | nessuno: le scritture sono le stesse, in fila |
| 20 | `salvaImpostazioni` e `salvaPasti` tornano `false` solo quando la riga deve mostrare l'errore; una richiesta superata e un rifiuto RLS tornano `true` (Task 6) | è il comportamento della pagina di prima: nessun errore per una richiesta superata, solo «La casa è cambiata…» sul rifiuto RLS | chi chiama deve sapere che `true` non vuol dire «scritto»; il valore a schermo è comunque quello giusto |
| 21 | `ricaricaCasa(seFallisce?)`: se la rilettura fallisce, vale lo stato di riserva passato (Task 6) | il test vecchio 43 (dopo `TOGLI` la riga sparisce anche se la rilettura fallisce) ha bisogno di mettere uno stato locale | un parametro facoltativo in più rispetto all'ossatura |
| 22 | Prima che l'utente sia letto, il nome accessibile del Menù è `Profilo e impostazioni` (Task 6) | la spec dà `{Nome}: profilo e impostazioni`, che senza nome comincerebbe con i due punti; deciso dal controller il 26/09, ed è in spec §I | nessuno: dura il tempo di `getUser` |
| 23 | `useIniziale` e `leggiIniziale` escono; restano `leggiUtente`, `useUtente`, `inizialeDi` e `dimenticaIniziale` (Task 6) | l'iniziale è la prima lettera del nome, che il Menù legge comunque; una lettura sola | nessuno |
| 24 | Lo scorrimento salvato si rimette con un `MutationObserver` sul corpo, per 3 s al più (Task 6) | Ingredienti legge i suoi dati dopo l'apertura: l'altezza giusta esiste solo quando la lista è a schermo | se la lista arriva dopo 3 s, il ritorno riparte dall'alto |
| 25 | Se `salvaPasti` fallisce, i pasti si rileggono dal server; la copia locale solo se anche la rilettura fallisce (Task 6, decisione del controller del 26/09) | `salvaSlotDefs` non è atomico: prima il delete dei pasti tolti (a cascata i piatti), poi l'upsert. Tornare alla copia locale rimetterebbe a schermo un pasto già cancellato, che il salvataggio dopo riscriverebbe senza piatti | una lettura in più quando un salvataggio dei pasti fallisce |
| 26 | `cancellataIl` sta nel provider dei dati, e si azzera alla chiusura del pannello (Task 6, decisione del controller del 26/09) | la nota `Cancellata il …` deve durare fino alla chiusura (spec §D) anche se la cima si smonta | nessuno |
| 27 | `vaiA` usa il ramo A (`chiudiTuttoPoi` + `router.push`); il test del ramo B è cancellato, e quello del ramo A aspetta la `push` un giro dopo il `popstate` (Task 6) | esito finale della sonda del Task 2, «regge con `fn` differita»: l'hook fa partire `fn` con `setTimeout(fn, 0)`, quindi subito dopo il `popstate` la `push` non c'è ancora; il test lo controlla prima di aspettarla | nessuno: è il comportamento misurato nel browser |
| 28 | Dopo un rifiuto RLS, se anche la ricarica fallisce il pannello va in errore di caricamento (`RIPROVA`), senza «La casa è cambiata: dati ricaricati. Riprova.» (Task 6, review, I1, contro il testo del piano; decisione del controller) | col testo del piano la ricarica silenziosa falliva in silenzio: restavano a schermo il valore appena rifiutato dal server, di una casa che non è più la sua, e un messaggio che diceva «ricaricati» senza esserlo. La pagina di prima andava in errore (`impostazioni/page.tsx`, righe 182 e 364). `carica` ora dice se è riuscita | nessuno: `RIPROVA` rilegge tutto |
| 29 | Ogni lettura dei dati del pannello aspetta prima la fila delle scritture (Task 6, review, minor a) | una riapertura con una scrittura in volo rileggeva il valore di prima, e la sua lettura, più recente, lo rimetteva a schermo sopra quello del gesto | una riapertura con una scrittura lenta resta sui dati di prima finché la scrittura non arriva |
| 30 | Col pannello aperto sono `inert` `.guscio-main`, lo slot del Dock e la tab bar, che per questo prende la prop `inerte` (Task 6, review, minor b) | `aria-modal` da solo non trattiene il Tab, che usciva verso la pagina e la barra sotto il velo. La review nominava pagina e Dock; la barra ha la stessa fuga, e l'ho aggiunta | nessuno sul telefono: sotto il velo niente è toccabile comunque. Il Menù utente, dentro la pagina, non riceve più il fuoco da tastiera a pannello aperto: si chiude con la X, il velo o il gesto indietro |
| 31 | `useUtente` tiene in cache solo una lettura che ha trovato l'utente (con l'email); una fallita o vuota si scarta, e il montaggio dopo rilegge (Task 6, review, minor c) | una lettura fallita per la rete lasciava il puntino e `Profilo e impostazioni` per tutta la sessione | un `getUser` in più a ogni pagina finché la rete non torna |
| 32 | I testi delle note dal disegno (frame 03, 04, 25), confermati da Andrea il 26/09 e in spec §I: `Il default con cui nasce ogni settimana nuova.` (Pasti a casa), `Ogni quanto ti chiedo se hai ancora olio, sale, farina.` (Cadenza), `L'ordine in cui compaiono in Lista: mettilo come gira il tuo supermercato.` (Ordine delle aree), `Svuota quello che hai in casa. I piatti e il piano restano.` (Cancella la dispensa), e l'aria del campo `Per quante persone cucini, da 1 a 4` (Task 7) | la spec §B.4 non dava le note; il disegno sì | nessuno: sono testi confermati |
| 33 | Gli apostrofi: i testi nuovi della spec hanno l'apostrofo dritto `'`; i testi «di oggi» si copiano dal codice come sono, e lì l'apostrofo è tipografico `’` (Task 7) | la regola dei vincoli (copy carattere per carattere) vale in due direzioni: un testo nuovo non si «corregge» al tipografico, uno di oggi non si raddrizza. La nota delle porzioni, di oggi, non ne ha [misurato, `impostazioni/page.tsx` riga 538] | nessuno: un carattere per testo, se Andrea li vuole uniformi |
| 34 | Il campo `PERS` in volo è a 0,5 e `disabled` (frame 25), e il testo scritto vive nel campo solo durante la modifica: finito il tentativo (riuscito, fallito, fuori range) il campo torna a leggere il provider, così il ritorno a prima si vede senza sincronizzazioni a mano (Task 7) | spec §B.5 e frame 25. Due scritture veloci dallo stesso campo non si possono fare: i quattro test della coda serializzata (righe 6–9 della migrazione) vanno sulla Cadenza (Task 9), dove il segmento resta toccabile | chi scrive subito un altro numero mentre il primo salva aspetta la risposta (una scrittura è di solito sotto il secondo) |
| 35 | `StatoDatiPannello` disegna con `Carico` ed `ErroreCaricamento` di `pezzi.tsx` (Task 7) | un disegno solo per `CARICO…` e per l'errore di caricamento, nella cima e nelle sotto-schermate che leggono dati propri (Casa, Ingredienti, Aree) | nessuno: i test del Task 6 cercano `role="status"`, il testo dell'errore e `RIPROVA`, e restano verdi |
| 36 | La nota `Cancellata il {gg/mm} alle {hh:mm}.` si legge da `cancellataIl` del provider dei dati, non da uno stato della cima; l'ora è quella locale del telefono (Task 7) | la cima si smonta entrando in una sotto-schermata: con uno stato locale la nota sparirebbe al ritorno, prima della chiusura del pannello (spec §D, decisione 26). Un test lo prova passando da Esporta | nessuno |
| 37 | `montaPannello` resta sincrono (restituisce il `RenderResult`, come nel piano), e ogni test aspetta i dati con un `findBy…` prima di toccare le righe (Task 7) | la firma è quella che i Task 8–10 usano nel piano; i mock rispondono subito, e i `findBy`/`waitFor` lasciano arrivare le letture. I test della cima e delle persone girano senza avvisi `act(...)` [misurato: `npx vitest run src/components/pannello`, stderr vuoto, 5 volte di fila] | se un test dei Task 8–10 tocca prima che i dati arrivino e finisce senza aspettare, può uscire un avviso: si aggiunge un `findBy` |
| 38 | Senza email letta, il testo del dialogo di Esci è `I tuoi dati restano. Per rientrare ti mandiamo un link via email.`; con l'email resta quello di §D (Task 7, review, decisione del controller del 26/09) | `leggiUtente` non lancia: se fallisce torna nome ed email vuoti, e il testo di §D diventava «ti mandiamo un link a .». Testo nuovo, fuori dalla spec: è fra le domande per Andrea | nessuno: un testo, da cambiare se Andrea ne vuole un altro |
| 39 | Con nome ed email entrambi vuoti, la riga informativa dell'Account non c'è; la riga Esci resta (Task 7, review, decisione del controller del 26/09) | una riga con nome e nota vuoti è un rettangolo bianco da 56 senza senso; Esci serve comunque. La condizione è un booleano, così `BloccoGruppo` non tiene la stringa vuota come figlio col suo filetto | il blocco Account con una riga sola; da rivedere se Andrea preferisce un segnaposto |
| 40 | Le tre sotto-schermate (Pasti a casa, Gestione dei pasti, Rotazione) passano da `StatoDatiPannello`: il componente esportato avvolge un componente interno che riceve i dati pronti, e gli hook stanno lì (Task 8) | `CARICO…` e l'errore con `RIPROVA` sono quelli del pannello, e nell'interno non ci sono `return` anticipati prima degli hook | nessuno |
| 41 | Gestione dei pasti legge il conteggio dei piatti con `leggiRepertorio()` al montaggio. Se al tocco sulla ✕ il conteggio non c'è (lettura in corso o fallita), la ✕ rilegge il repertorio in quel momento, con la riga a 0,5; se anche questa lettura fallisce non si toglie niente e sotto il blocco compare `Non siamo riusciti a salvare. Riprova.` (Task 8, decisione del controller del 26/09) | il testo del dialogo `rimuovi-pasto` ha bisogno di `{n}` (§D): un dialogo «alla cieca» senza numero non è nella spec. Senza rete il salvataggio fallirebbe comunque, quindi l'errore dice il vero | un tocco sulla ✕ prima che la lettura arrivi aspetta una lettura in più |
| 42 | Se il salvataggio della rimozione fallisce dopo che la cancellazione è avvenuta (`salvaSlotDefs` non è atomico), lo schermo segue il server: il provider rilegge i pasti (decisione 25) e la riga mostra l'errore; un pasto già cancellato non torna a schermo (Task 8) | tornare alla copia locale rimetterebbe un pasto senza più i suoi piatti, che il salvataggio dopo riscriverebbe vuoto. Test: «se il salvataggio fallisce dopo che il pasto è stato cancellato…» | nessuno oltre alla decisione 25 |
| 43 | Il nome del pasto vive in una bozza locale e si salva all'uscita dal campo, come oggi; vuoto (anche solo spazi) vale `Pasto`; un nome uguale a quello salvato non salva (Task 8) | spec §C.2; nessuna scrittura a ogni carattere | nessuno |
| 44 | Il pasto nuovo va a fuoco (con il testo selezionato) appena la sua riga compare, con un ref a callback (Task 8) | nessun effetto che rincorre il fuoco a ogni cambio dei dati; la selezione fa scrivere il nome sopra `Nuovo pasto` | se il salvataggio fallisce la riga sparisce col fuoco: il fuoco torna al documento |
| 45 | Il segmento della rotazione resta toccabile mentre salva, come oggi; il tocco sul segmento già premuto non salva (oggi salvava lo stesso valore) (Task 8) | la coda serializzata del provider (decisione 19) regge i tocchi veloci; riscrivere lo stesso valore è una scrittura inutile | nessuno |
| 46 | L'`aria-label` delle celle della matrice usa il nome lungo del giorno e il nome del pasto com'è scritto: `Lunedì Colazione: di base a casa, tocca per mettere fuori casa` (Task 8) | spec §C.1 dà `{Giorno} {pasto}`; la sigla `L` letta da sola non dice il giorno (e le `M` sono due) | nessuno |
| 47 | `{data}` del dialogo `riparti` è il lunedì **corrente** in forma lunga (`Da lunedì 21 settembre …` il 25/09), non il lunedì successivo del frame 10 (Task 8, decisione del controller del 26/09; spec §D e §N) | la conferma scrive `cicloOrigine = lunedì corrente`, come il codice di oggi: il testo deve dire la data che si scrive | se Andrea vuole ripartire dal lunedì dopo, cambiano insieme il testo e la scrittura |
| 48 | I testi del riepilogo della matrice, confermati da Andrea il 26/09 (spec §I): `Di base sei a casa per {a} pasti su {t}. La Lista conta solo quelli: i {f} fuori casa non entrano nella spesa.`; a zero fuori casa `Di base sei a casa per tutti i {t} pasti.`; a uno fuori casa `… La Lista conta solo quelli: l'unico fuori casa non entra nella spesa.`; a un pasto a casa `Di base sei a casa per 1 pasto su {t}. …` (Task 8) | frame 05 e varianti del piano | nessuno: sono testi confermati |
| 49 | Dopo un rifiuto RLS (la casa è cambiata), Gestione dei pasti scarta il conteggio dei piatti letto al montaggio, e la ✕ lo rilegge al tocco (Task 8, self-review, oltre il piano) | dopo il rifiuto il provider rilegge i pasti in silenzio senza smontare la sotto-schermata: i pasti a schermo sono dell'altra casa, i loro id non sono nel conteggio e valevano 0, quindi un pasto con piatti si toglieva al tocco senza dialogo [misurato: senza la correzione il test «dopo un rifiuto RLS (la casa è cambiata) la ✕ rilegge il repertorio e chiede il dialogo» fallisce con `Unable to find role="alertdialog"`] | una lettura del repertorio in più al primo tocco sulla ✕ dopo il rifiuto |
| 50 | La rimozione che aspetta (la rilettura del repertorio, o il dialogo) calcola i pasti da salvare dagli ultimi a schermo, non da quelli del momento del tocco; se il pasto non c'è più, o toglierlo scenderebbe sotto tre, non salva niente (il dialogo si chiude) (Task 8, self-review, oltre il piano: il piano calcolava `nuovi` al tocco) | durante la rilettura le altre righe restano toccabili: un riordino fatto nel frattempo veniva riscritto dalla rimozione [misurato: senza la correzione il test «un riordino fatto mentre la ✕ rilegge il repertorio non si perde» fallisce]. Per il dialogo copre il ritorno ai dati del server di un salvataggio fallito mentre il dialogo si apriva | un `TOGLI` su un pasto che nel frattempo è sparito chiude il dialogo senza dire niente: caso raro (solo dopo un salvataggio fallito) |
| 51 | Gestione dei pasti fa una rimozione alla volta: una seconda ✕ mentre la prima non ha finito (rilettura del repertorio e salvataggio) si ignora, con un ref `rimozioneInCorso`, non con le ✕ spente. Col dialogo la guardia si libera appena il dialogo è aperto (Task 8, review di correttezza, minor 1, decisione del controller) | con il conteggio assente, due ✕ veloci su pasti diversi fanno partire due riletture; le due continuazioni ripartono nello stesso giro, prima del render, e la seconda legge in `ultimi` i pasti di prima della prima rimozione: salvava `[A, C, D]` dopo `[B, C, D]`, e il pasto appena cancellato (coi piatti andati a cascata) tornava vuoto [misurato: senza la guardia il test «una seconda ✕ mentre la prima rimozione è in corso non parte» fallisce, e a schermo torna Spuntino]. Il ref chiude la finestra subito, senza aspettare un render; le ✕ spente lampeggerebbero in `--icona-spenta`, che nel disegno vuol dire «al minimo». Il dialogo non serve tenerlo: finché è aperto il velo copre il pannello, e si chiude solo quando la conferma ha finito o si annulla | una ✕ toccata mentre un'altra rimozione salva non fa niente, senza avviso: la riga di quella in corso è già a 0,5 o già sparita, e il tocco dopo funziona |
| 52 | La generazione della casa: un contatore che sale quando `casaCambiata` diventa vero. La lettura del repertorio al montaggio, e quella partita dalla ✕, se arrivano con una generazione diversa da quella di partenza non toccano il conteggio; quella della ✕ ferma anche la sua rimozione (il pasto è della casa di prima) (Task 8, review di correttezza, minor 2, decisione del controller; la ✕ è un'estensione mia) | completa la decisione 49: il conteggio si scartava al rifiuto RLS, ma una lettura partita prima e arrivata dopo lo rimetteva, con la casa di prima, e un pasto con piatti della casa nuova valeva di nuovo 0 [misurato: senza il controllo falliscono i test «la lettura del repertorio al montaggio che arriva dopo un rifiuto RLS…» e «la rilettura della ✕ che arriva dopo un rifiuto RLS…»] | un tocco sulla ✕ fatto prima del rifiuto e finito dopo non toglie niente, e va rifatto; il contatore sale in un effetto, dopo il render: una lettura che arriva proprio fra quel render e l'effetto passerebbe [ipotesi, non testato: finestra di un giro] |
| 53 | Lo scorrimento che Ingredienti salva prima di aprire l'editor è quello del primo antenato che scorre (`overflow-y: auto\|scroll`) della riga toccata, cioè il corpo del pannello (Task 9) | l'ossatura non espone il corpo: cercarlo dal DOM invece di passare un ref in più tiene Ingredienti indipendente da come il pannello disegna il suo scorrimento | se il pannello cambiasse struttura (un altro contenitore scorrevole più vicino alla riga), lo scorrimento salvato sarebbe quello sbagliato |
| 54 | Ingredienti legge l'ordine delle aree dal provider (`DatiPannello.impostazioni.ordineAree`) e gli ingredienti da sé (`leggiIngredienti`); `CARICO…` finché manca l'uno o gli altri, errore di caricamento se fallisce l'uno o l'altro (Task 9) | l'ordine delle aree è già nel provider (letto una volta per tutto il pannello); gli ingredienti sono un dato che solo questa sotto-schermata usa | nessuno: due letture invece di una, ma la seconda (gli ingredienti) serve solo qui |
| 55 | Ordine delle aree non legge niente da sé: l'ordine è quello del provider, e il suo errore di caricamento (`stato.stato === 'errore'`) ha un testo proprio, `Non riusciamo a caricare l'ordine delle aree. Riprova più tardi.`, senza `RIPROVA` — non passa da `StatoDatiPannello`. Lo stesso vale per Ingredienti (Task 9) | §C.5 vuole quel testo specifico; `StatoDatiPannello` disegna sempre il testo generico `TESTO_ERRORE_IMPOSTAZIONI` con `RIPROVA`, che qui sarebbe sbagliato | nessuno: un `if` in più sullo stato invece del componente condiviso |
| 56 | Il nome dell'area nella riga di Ordine delle aree è in sentence case (`Latticini, uova e salumi`, frame 13), da `nomeArea` (maiuscolo) passato a `nomeAreaInFrase`; l'`aria-label` dei tondi resta col nome maiuscolo di oggi (`Sposta ORTOFRUTTA in alto`) (Task 9) | il disegno (frame 13) scrive il nome in frase nella riga, ma l'`aria-label` di oggi (e i suoi test) resta quella | nessuno: due usi dello stesso nome, in due forme |
| 57 | Il segmento della Cadenza resta toccabile mentre salva (a differenza del campo `PERS`, spento in volo, frame 25): i quattro test della coda serializzata della vecchia pagina (righe 6–9 della migrazione) tornano qui (Task 9) | §C.6 non dice di spegnerlo, e la Cadenza non può fare due scritture dallo stesso campo come `PERS`: ogni tocco è indipendente, la coda del provider serve proprio a reggere due tocchi veloci | nessuno: la coda del provider (Task 6) regge già lo scenario, provato due volte (qui e in `dati-pannello.test.tsx`) |
| 58 | L'apostrofo è dritto (`l'ordine`) nei due testi nuovi di §C.5 (l'errore di caricamento e quello di salvataggio di Ordine delle aree); la nota in testa a Ordine delle aree è quella di oggi e resta com'è, con l'apostrofo tipografico (`nell’ordine`, `quest’ordine`) (Task 9) | stessa regola della decisione 33: un testo nuovo della spec ha l'apostrofo dritto, uno «di oggi» si copia com'è | nessuno: un carattere per testo |
| 59 | Il chevron sulla riga di Ingredienti c'è, anche se il frame 11 non lo disegna: le sue Misure sì («chevron», «finale 1 senza valore»), coerente con la Riga di impostazione che lo mette sempre sul finale «valore» (Task 9) | le Misure del disegno sono più specifiche del solo frame; senza chevron la riga sembrerebbe un'azione, non un'apertura | nessuno: un'icona in più, coerente col resto del pannello |
| 60 | I testi dal disegno, confermati da Andrea il 26/09 (spec §I): l'etichetta del blocco della Cadenza `OGNI QUANTO TI CHIEDO` (frame 13D) e l'`aria-label` della riga ingrediente `Apri {nome}` (frame 11, stesso schema di «Apri {piatto}» di DESIGN.md §8 Riga piatto) (Task 9) | frame 13D e 11 del disegno | nessuno: sono testi confermati |
| 61 | Aggiunto `vi.mock('@/data/repertorio')` a `pannello.test.tsx` del Task 6 (ruling P8 del controller, preflight.md riga 15) (Task 9) | dal Task 9 la sotto-schermata `ingredienti` monta la vera `Ingredienti`, che legge `leggiIngredienti()` da sé: senza il mock il test `?impostazioni=ingredienti apre sulla sotto-schermata…` avrebbe fatto una lettura vera (fallita in ambiente di test) e stampato un `console.error` di rumore | nessuno: il test non fa asserzioni sul contenuto di Ingredienti, solo su titolo e scorrimento |
| 62 | La scadenza del codice della casa si calcola sul telefono: `scadeAlle = Date.now() + 60 min` dal momento in cui arriva la risposta di `creaInvito()`, controllata ogni minuto e al ritorno in primo piano (`visibilitychange`); `DURATA_CODICE_MS` in `Casa.tsx` (Task 10) | `crea_invito()` scrive `scade_il = now() + interval '1 hour'` ma restituisce solo il codice (`returns text`) [misurato: `0012_casa.sql` righe 137 e 170], e `creaInvito()` restituisce `String(data)` [misurato: `src/data/casa.ts`]. Il conto del telefono può essere indietro di qualche secondo rispetto al server, mai avanti | un orologio del telefono spostato durante l'ora sposta la scadenza a schermo; il server resta l'arbitro: un codice che il telefono mostra ancora ma il server ha già scaduto dà `codice non valido o scaduto` a chi lo usa |
| 63 | Il codice creato sta nello stato della sotto-schermata Casa: uscendo il riquadro si perde, e il codice sul server resta valido fino alla sua ora. Mentre il codice vale, il piede fisso perde `CREA UN CODICE` (da solo e da proprietario); il proprietario lo vede dentro il blocco `LA TUA CASA`, sotto la nota (frame 16) (Task 10) | come oggi, che lo perdeva lasciando la pagina; `CREA UN CODICE` nel piede fisso è il ruling del controller e §C.9 | chi esce e rientra deve crearne un altro, che sostituisce il primo (`crea_invito` tiene un invito per proprietario) |
| 64 | Dopo `ESCI DALLA CASA` la pagina si ricarica su `indirizzoPannello(pathname, 'casa')` (es. `/lista?impostazioni=casa`): una navigazione piena, come oggi, che riapre il pannello su Casa nello stato «da solo» (Task 10, ruling del controller) | tiene insieme il reload di oggi (ogni stato in memoria è dell'altra casa) e «il pannello resta su casa» di §C.7 | nessuno: l'apertura da `?impostazioni=` è quella del Task 6, senza animazione |
| 65 | Dopo `ENTRA` la pagina si ricarica su `/lista`, come oggi (Task 10) | la spec non dice altro | nessuno |
| 66 | Dopo `TOGLI` la casa si rilegge con `ricaricaCasa(senza)`, dove `senza` è la casa di prima senza il membro tolto (`solo` se non ne restano): se la rilettura fallisce vale `senza`, la riga sparisce senza errore e la tessera segue (Task 10) | il caso di oggi «tolto il membro, la rilettura fallisce» (test 43 della migrazione); dire «non siamo riusciti» sarebbe falso | nessuno |
| 67 | Gli errori delle azioni della casa (`TOGLI`, `ESCI DALLA CASA`, `ENTRA`) mostrano i loro testi di oggi, nel dialogo o sotto il campo: non passano da `salvaImpostazioni`, e l'avviso «La casa è cambiata…» non li sostituisce. L'avviso sta in testa alla sotto-schermata solo se l'ha acceso un salvataggio altrove (frame 26B). `TOGLI` ed `ESCI` scrivono il loro `console.error` prima di rilanciare al dialogo, come faceva la pagina di oggi (Task 10, decisione del controller del 26/09) | le tre RPC della casa hanno errori propri (anche il messaggio del server, per `ENTRA`); il `DialogoConferma` non scrive in console | nessuno |
| 68 | `COPIATO` dura 2 s; un secondo tocco riparte da 2 s. Senza `navigator.clipboard` (contesto non sicuro, browser vecchio) vale come un fallimento: `Non siamo riusciti a copiarlo. Dettalo a voce.`. Il timer dei 2 s parte nel gestore del tocco (con un ref, fermato allo smontaggio), non in un effetto su `copia` come nel piano (Task 10, oltre il piano) | con l'effetto il timer nasceva solo quando React eseguiva l'effetto passivo, a volte dopo che il test aveva già avanzato l'orologio [misurato: col piano, «COPIA copia il codice e dice COPIATO per 2 secondi» falliva 5 volte su 7 con `npx vitest run src/components/pannello`; col timer nel gestore 6 su 6 verdi]. Sul telefono la differenza è di un frame [ipotesi, non misurata]: la correzione toglie la finestra, non cambia il comportamento | nessuno |
| 69 | Esporta: se `salvaFile` rigetta (un annullamento non rigetta: torna `'annullato'`, e il tasto resta `SALVA IL FILE`) si va allo stato d'errore, `Non siamo riusciti a preparare il file. Riprova.` con `RIPROVA`, che riprepara (Task 10) | la spec non ha un testo per il salvataggio fallito; questo è il più vicino fra quelli che ha. `salvaFile` rigetta di rado: una condivisione fallita per altro motivo ripiega già sul download (D4) | un testo che dice «preparare» per un errore di salvataggio; da cambiare se Andrea ne vuole uno proprio |
| 70 | Esporta: la riga `Il file è pronto: {nome}.` (`role="status"`) sta **dentro** il piede fisso, sopra il tasto, non «sopra il piede» come dice §C.8. Il nome mostrato è `file.name`, quello scelto da `preparaEsportazione` (Task 10, ruling P3 del controller: scarto dalla spec) | il piede è un portale fuori dallo scorrimento: la riga dentro il piede resta attaccata al tasto che la riguarda anche con il corpo scorso; nome mostrato e nome salvato non possono divergere | nessuno per il comportamento; la spec §C.8 dice ancora «sopra il piede»: da allineare quando si aggiornano gli scarti della spec (§N) |
| 71 | Casa si appoggia a due fatti del provider del Task 6: `ricaricaCasa(seFallisce?)` non rigetta mai (se `statoCasa()` fallisce mette `seFallisce`, se c'è), e `casaCambiata` vale fino al prossimo salvataggio (si spegne solo a ogni apertura), quindi passare da una sotto-schermata all'altra non la spegne (Task 10) | il primo regge la decisione 66; il secondo il test del frame 26B («dopo un rifiuto RLS altrove, Casa mostra l'avviso sopra la casa ricaricata»), verde senza toccare il provider | se il provider cambiasse uno dei due, cadono il test 43 della migrazione o quello del 26B |
| 72 | I testi dal disegno di Casa, confermati da Andrea il 26/09 (spec §I): l'etichetta `CODICE DELLA CASA` sopra il riquadro del codice (frame 15), scritta in maiuscolo nel testo e non solo via CSS, e l'`aria-label` di `TOGLI`, `Togli {email} dalla casa` (frame 16). Il segnaposto del campo resta quello di oggi, `Ho un codice`: il disegno propone `8 CARATTERI`, che la spec non riporta (Task 10) | frame 15 e 16 | nessuno: sono testi confermati |
| 73 | Con Casa ed Esporta `SCHERMATE` non ha più segnaposti: `SottoSchermataVuota` è tolta da `schermate.tsx` (Task 10) | nessuna voce la usava più [misurato: `grep -rn SottoSchermataVuota src` vuoto] | nessuno |
| 74 | Il riquadro del codice della casa ha `role="img"` sul contenitore con l'`aria-label` `Codice della casa: {lettere separate}`; il codice visibile resta testo dentro (Task 10, review, decisione del controller) | su un `div` senza ruolo (generic, ARIA 1.2) il nome non è ammesso, e molti screen reader leggono il testo `K7P3QX2M` invece dell'etichetta: §C.7 vuole il codice compitato. Scelto `role="img"` invece del testo compitato visivamente nascosto + `aria-hidden` sul codice: un elemento solo, nessuna classe `sr-only` da aggiungere, e i figli di un'immagine sono presentazionali. Il test lo cerca con `getByRole('img', { name: … })` [misurato: rosso prima della correzione, verde dopo] | lo screen reader annuncia «immagine» insieme al nome; se Andrea preferisce di no, si passa al testo nascosto |
| 75 | Un ref `montato` in Casa: se la sotto-schermata si smonta mentre `writeText` è in volo, alla fine della copia non nasce il timer di `COPIATO` né cambia lo stato; il cleanup ferma anche un timer già partito (Task 10, review, decisione del controller; completa la decisione 68) | col timer nel gestore (decisione 68) il `setTimeout` poteva nascere dopo il cleanup dello smontaggio. Test «se Casa si smonta mentre la copia è in volo, nessun timer di COPIATO nasce dopo» [misurato: rosso prima della correzione, un `setTimeout` da 2000 dopo lo smontaggio; verde dopo] | nessuno |
| 76 | Casa: l'errore di `creaInvito` (`Non siamo riusciti a creare il codice. Riprova.`) sta **dentro** il piede fisso, sopra `CREA UN CODICE`, come la riga «Il file è pronto…» di Esporta (decisione 70) (Task 10, scarto dalla spec, segnalato dalla review) | §C.7 vuole gli errori «sotto il controllo che li ha causati»; il controllo è nel piede fisso, e nel piede l'errore sta sopra il tasto come quello di `SALVA ORDINE` (Task 9, test «se il salvataggio fallisce l’errore sta sopra il tasto, …» di `aree.test.tsx`): stesso schema per i tre primari del piede | nessuno per il comportamento; da allineare in spec insieme alla decisione 70 |
| 77 | L'editor del piatto (`src/app/(app)/piatti/[id]/page.tsx`) non cambia: torna a `/piatti` senza parametro, e la pillola di Piatti ritrova `da` da `sessionStorage` (`spesa:piatti-da`) (Task 11, ruling P6 del controller) | i ritorni a `/piatti` ci sono già [misurato: `router.push('/piatti')` alle righe 396, 422, 434, 483 e `href="/piatti"` a riga 1364]; la mappa dei file dell'ossatura lo elencava fra i file modificati, la prosa del piano no | se `sessionStorage` non c'è (navigazione privata), tornando dall'editor la pillola dice `IMPOSTAZIONI` invece di `LISTA` o `PIANO` |
| 78 | Piatti legge `da` con `useSyncExternalStore`: sul server e durante l'idratazione vale `impostazioni`, sul client il valore vero (`leggiDaPiatti(window.location.search)`) (Task 11) | è la via di React per un valore che esiste solo nel browser: niente `setState` in un effetto, niente `Suspense`, niente mancata corrispondenza all'idratazione | su un ricaricamento pieno di `/piatti?da=lista` la pillola dice `IMPOSTAZIONI` per un render [ipotesi, non provato nel browser] |
| 79 | **Limite dichiarato.** Chi apre un piatto dal Piano (`router.push` verso `/piatti/{id}` [misurato: `piano/page.tsx` riga 452]) e torna con la freccia dell'editor arriva su Piatti, non sul Piano: è così dalla fase 3. Con Piatti fuori dalla barra, la pillola dice l'ultimo `da` salvato, o `IMPOSTAZIONI` se non ce n'è (Task 11) | correggerlo vuol dire toccare l'editor del piatto, che questo task non tocca (decisione 77) | [ipotesi, non provato nel browser] un giro in più per tornare al Piano, con una pillola che può portare altrove; va anche in «Domande per Andrea» |
| 80 | La coppia del test di Importa: «il secondo tocco di un doppio tocco sul tondo non esce dalla freccia della testata» → `importa/__tests__/page.test.tsx` › Importa: la scelta › il secondo tocco di un doppio tocco sul tondo non esce dalla pillola della testata. La freccia era un link a `/impostazioni`, ora è la pillola (un `button`): il test verifica anche che `push` non parta al tocco annullato e parta dopo. Lo script di copertura dello Step 12, lanciato prima di cancellare i due file vecchi: `test vecchi: 52; senza coppia valida nel registro: 0`, uscita 0 [misurato il 26/09; `grep -c` conferma 47 + 5]. La coppia della Testata sta nella riga 54 della «Migrazione dei test» (Task 11) | i test vecchi si cancellano solo con la coppia (Global Constraints) | nessuno |
| 81 | `Testata.indietro` è `{ etichetta, ariaLabel, onTorna }`, non `{ etichetta, onTorna }` come scrive §G.2: `ariaLabel` è il nome accessibile per intero (`Torna alle impostazioni`, `alla lista`, `al piano`) (Task 11, ruling P2 del controller: scarto dalla spec). In modo indietro la Testata non disegna la pillola settimana: nessuna pagina passa entrambe | §G.2 vuole un `aria-label` che dice dove porta, diverso dall'etichetta visibile: serve il campo | nessuno; la firma di §G.2 va allineata quando si aggiornano gli scarti della spec (§N) |
| 82 | Tre correzioni alle bozze dei test del piano (Task 11): i mock di `next/navigation` usano `vi.hoisted` per `push`/`replace` (come `vista.test.tsx`); il caso `da lista` di Piatti prende la pillola dopo lo stato vuoto (`Da dove partiamo?`), perché `VuotoPiatti` è un altro componente e rimonta la `Cornice`: la pillola del render di caricamento resta staccata dal DOM e il suo click non fa niente [misurato: rosso con la bozza, `push` chiamata 0 volte]; allo Step 3 anche i casi `/piatti` e `/piatti/d-1` di «nessuna voce è attiva» erano rossi prima del codice, non verdi come diceva il piano, perché la voce Piatti c'era ancora ed era attiva | la regola delle Global Constraints: la bozza si corregge sul codice vero | nessuno |
| 83 | La vista di lettura dell'editor è `LettoreCodice` (`src/app/(app)/dispensa/LettoreCodice.tsx`), non `Scanner` come diceva la spec del 25/09, dentro un `FoglioDalBasso` con `TestataFoglio`: la X del foglio fa da annulla (Task 12, decisione del controller del 26/09, spec §F.1 aggiornata) | `LettoreCodice` è la vista della fase 4 (anteprima con la cornice guida, `DIGITA IL CODICE`, campo `Codice a barre`); `Scanner` è il componente di `/lista/confezioni` della fase 2, col tasto `ANNULLA` alto 40, sotto i 44 [misurato]. Stesso schema di `NuovoIngrediente.tsx` | nessuno per il comportamento; se Andrea volesse lo `Scanner`, è un cambio di componente dentro il foglio |
| 84 | Il Dock senza tab bar: `Dock` legge `useBarraNascosta()` e si mette da sé la classe `.dock-senza-barra`; in `globals.css` la regola `.guscio[data-barra] .dock.dock-senza-barra { bottom: var(--barra-fondo); }`, subito dopo quella ridotta. Nessun token nuovo: `--barra-fondo` vale già 22 (Task 12) | spec §F «con la barra nascosta il Dock va a `bottom 22`». La specificità 0,4,0 batte lo 0,3,0 della regola ridotta: `data-barra` cambia con lo scorrimento anche quando la barra non c'è. Chi nasconde la barra lo chiede con `useNascondiBarra`, il Dock lo legge e basta: oggi l'unica altra pagina che la nasconde è la fotocamera di Importa, che non monta un Dock [misurato: `grep useNascondiBarra`, `Camera.tsx` riga 160; il `<Dock>` di Importa sta in `Acquisizione.tsx`, che non si monta insieme alla Camera] | la transizione di `bottom` (`.anim-dock`) resta quella di oggi: non provata nel browser (vedi «Non eseguiti») |
| 85 | L'errore di salvataggio dell'editor sta sopra il Dock, in un riquadro bianco (`--superficie`, `--ombra-pannello`, raggio 14) agganciato alla pillola con `bottom: calc(100% + 8px)`, `role="alert"` (Task 12) | spec §F «l'errore compare sopra il Dock»: sotto il Dock scorre la pagina, e un testo senza fondo si leggerebbe sopra i campi | un riquadro che copre l'ultima riga visibile finché l'errore resta; sparisce al SALVA successivo |
| 86 | `ELIMINA` in coda alla pagina è un `TastoSecondario` col testo in `--errore` e `aria-label="Elimina ingrediente"` (il nome di oggi del cestino); su un ingrediente nuovo non c'è (Task 12) | spec §F «`ELIMINA`, in coda, col suo dialogo di oggi reso con `DialogoConferma`». Oggi il cestino su un nuovo faceva da annulla: ora la freccia fa quel lavoro | il nome accessibile (`Elimina ingrediente`) diverso dal testo visibile (`ELIMINA`): tenuto per continuità con oggi e perché nel dialogo c'è un secondo `ELIMINA` |
| 87 | Un errore generico dell'eliminazione resta nel `DialogoConferma` (`Non siamo riusciti a eliminare l’ingrediente. Riprova.`, sotto i tasti, dialogo aperto); `IngredienteInUsoError` chiude il dialogo e il motivo resta sotto `ELIMINA` in pagina, `role="alert"`, come oggi (Task 12) | prima entrambi chiudevano il dialogo e l'errore andava in pagina [misurato: `page.tsx` di prima, righe 269–277]. Il dialogo di conferma della fase 5 tiene da sé l'errore (§D); il motivo del blocco è una frase da leggere con calma a dialogo chiuso | nessuno |
| 88 | La scansione nell'editor (Task 12, spec §F.1): un codice che è già di un altro ingrediente mostra `Questo codice è di {nome}.` con `NON È QUESTA` e `APRI {NOME}`, che apre il suo editor (con `?torna=impostazioni` se c'era) dopo `chiudiTuttoPoi`; un INTERO tiene formato 1 e PZ anche se il catalogo dà un peso; «trovato ma senza quantità» usa lo stesso messaggio dello sconosciuto (`Non conosciamo questo prodotto: scrivi tu la confezione.`); il catalogo irraggiungibile usa `MSG_CATALOGO` della fase 4 (`Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.`); in tutti e tre i casi l'EAN resta legato al SALVA. Il catalogo che dà la quantità riempie formato **e unità** solo su un ingrediente **nuovo**; su uno che esiste l'unità non cambia mai: il formato si riempie solo se l'unità del catalogo è quella del modulo, altrimenti compare `msgUnitaDiversa` della fase 4 (`Unità diversa (ml contro g): scrivi il formato a mano.`) e formato e unità restano, con l'EAN legato lo stesso (review del Task 12, I1, decisione del controller; scarto dalla spec, decisione 93) | è il comportamento della fase 4 in Nuovo ingrediente (§F.3 fase 4), che la spec chiede di applicare uguale; `MSG_CATALOGO` è un testo esistente, non nuovo. Senza l'elenco degli ingredienti (lettura fallita) il proprietario non si riconosce e si passa al catalogo | con la prima versione (unità presa dal catalogo anche su un ingrediente esistente) un g → ml **rompeva la lista**, non ne cambiava solo il senso: `salvaIngrediente` non converte le righe `dish_ingredient`, e `convertiInUnitaBase` lancia `UnitaIncompatibileError` [letto: `src/domain/unita.ts` righe 18–21], che `generaListe` non cattura [letto: `src/data/lista.ts` riga 94]: la lista della settimana non si generava più [trovato dalla review, non riprodotto su dati veri]. Corretto: resta il cambio a mano del segmento Unità, che ha lo stesso rischio da prima della fase 5 |
| 89 | I punti 5–8 della verifica dello Step 4 del piano (Task 12): (5) la nota del formato (`Quanto ne vendono in una confezione. …`) e le spiegazioni di `SPIEGA_CLASSE`, che il frame 12 non mostra, restano sotto i loro campi (decisione 3: nessuna funzione di oggi si perde; anche in «Domande per Andrea»); (6) la spiegazione «a stima» dice la cadenza, vedi 90; (7) il `Prezzo` passa dal campo a tutta larghezza alto 56 al campo 96 × 44 della `CONFEZIONE`, con `€` come unità in mono 10 `--ter`; etichetta e nota restano uguali; (8) la coda dello scroller è `con-dock`: senza barra il Dock finisce a 22 + 70 = 92 dal fondo, e sotto l'ultima voce restano circa 100 px d'aria in più. Si accetta per non aggiungere un'altra coda | la spec §F elenca i campi del disegno e dice che quelli di oggi restano; il campo 96 × 44 è quello di `CampoConSalva` | (8) un po' di vuoto sotto `ELIMINA`, da guardare sul telefono |
| 90 | La spiegazione «a stima» dice la cadenza scelta: `spiegaClasse(classe, giorni)` con `ogniCadenza` del Task 3. L'editor legge `leggiImpostazioni()` in un effetto a sé, che non blocca il modulo; se la lettura fallisce vale `GIORNI_CONTROLLO_DEFAULT` (ogni 3 mesi) e l'errore va in console (Task 12, decisione di Andrea del 26/09, spec §I) | il resto della frase, apostrofo tipografico compreso, resta quello di oggi | una lettura in più delle impostazioni a ogni apertura dell'editor |
| 91 | Altre scelte del codice del piano, oltre la spec (Task 12): il formato si legge con la virgola come il prezzo (`Number(testo.replace(',', '.'))`, campo `type="text"` con `inputMode="decimal"`; prima era `type="number"`) e `Number.isFinite` al posto di `Number.isNaN`; un caricamento fallito mostra solo il messaggio `Non riusciamo a caricare l’ingrediente. Riprova più tardi.` sotto la freccia, senza modulo né Dock (prima il modulo vuoto restava sotto l'errore); il segnaposto del nome passa da `#c4c4ce` a `var(--icona-spenta)`, che vale `#C4C4CE` [misurato: `globals.css` riga 20; lo `styled-jsx` di Next compila `var()` nel selettore `::placeholder`, misurato trasformando la regola con `styled-jsx/babel`]; la pillola d'area scelta è piena in `--ink` come nel frame 12, e `rgba()` sparisce | il campo di testo evita il `type="number"` che su iOS in italiano rifiuta la virgola (lo stesso motivo del prezzo); con un modulo vuoto sotto l'errore di caricamento, SALVA avrebbe creato un ingrediente nuovo al posto di quello non letto | nessuno |
| 92 | Tre correzioni alla bozza dei test del piano (Task 12): `afterEach` usa `vi.restoreAllMocks()` invece di `mockRestore` sulla sola spia di `history.go`, così anche le spie di `console.error` dei test d'errore si tolgono (`vi.clearAllMocks` non le rimette a posto e la configurazione di Vitest non ha `restoreMocks`); il test della lettura fallita controlla anche che `console.error` sia chiamato; «le tre spiegazioni…» resta, col nuovo atteso per «a stima», accanto a quello della cadenza. Il censimento dei 20 test di prima sta in «Task 12, censimento dei test dell'editor» | la regola delle Global Constraints: la bozza si corregge sul codice vero | nessuno |
| 93 | **Scarto dalla spec §F.1 punto 2** («riempie `CONFEZIONE` e l'unità, se l'API li dà»): su un ingrediente che esiste la scansione non cambia l'unità, e riempie il formato solo nella stessa unità; su uno nuovo vale §F.1 com'è (Task 12, review, I1, decisione del controller) | vedi la decisione 88: un'unità cambiata su un ingrediente usato nei piatti rompe la generazione della lista. È la regola già scritta per il dettaglio della Dispensa (`esitoDaCatalogo` / `formatoProposto` in `src/domain/scansione-dispensa.ts` e `src/domain/ean.ts`), e il testo `msgUnitaDiversa` è quello della fase 4, non nuovo. L'unità confrontata è quella del modulo, cioè quella che SALVA scriverà | chi vuole davvero passare da g a ml lo fa a mano col segmento, e riscrive il formato; da allineare in spec §F.1 (e fra gli scarti di §N) quando si aggiornano |
| 94 | Una lettura in volo si scarta se il foglio di scansione si è chiuso o riaperto nel frattempo: un contatore in un ref (`generazioneScan`) sale a ogni apertura e a ogni chiusura (anche dal gesto indietro), e `letto` controlla dopo ogni `await` che sia lo stesso; se no non tocca niente, nemmeno «Questo codice è di …» né il rinvio a `/entra` (Task 12, review, minor 2) | prima un esito arrivato a foglio chiuso riempiva formato, unità ed EAN, e un «codice di un altro» ricompariva alla riapertura del foglio [misurato: i due test nuovi erano rossi prima della correzione] | una lettura lenta da rifare: si riapre il foglio e si rilegge |
| 95 | `ELIMINA` riuscito naviga con `chiudiTuttoPoi(() => router.push(ritorno()))` e chiude il dialogo nello stesso giro, come `APRI {NOME}` (spec §A.5): prima si consuma la voce del dialogo col `go(-1)`, poi la push. Se il gesto indietro ha già chiuso il dialogo mentre l'eliminazione era in volo, non ci sono voci e la push parte nell'effetto dell'hook, una volta sola e senza altri `go` (Task 12, review, minor 3) | prima la push partiva col dialogo ancora aperto e la sua voce di cronologia restava orfana [misurato: il test chiedeva `go(-1)` prima della push e riceveva 0 chiamate] | il dialogo sparisce un attimo prima della navigazione, per il giro del `popstate` |
| 96 | Il segnale `spesa:ingrediente-creato:{piatto}` ora è provato: c'è creando un ingrediente nuovo dal piatto, e non c'è con `torna=impostazioni`; il test di prima «con torna=impostazioni anche SALVA torna al pannello, e non segnala un ingrediente al piatto» diventa «con torna=impostazioni anche SALVA torna al pannello» (apriva un ingrediente esistente, dove il segnale non può esserci) (Task 12, review, minor 4) | il titolo prometteva un controllo che il test non faceva | nessuno |
| 97 | Test rinominato: `a cinque pasti il gap dei pallini resta il 3 del file di disegno` → `con %i pasti la griglia è a tre colonne da 5 col gap 3` (parametrizzato su 3, 4 e 6) (Task 13, spec §H) | il gap non è più una soglia a due valori (2 a sei pasti, 3 sotto): con la griglia a tre colonne è sempre 3, da tre a sei pasti; il test nuovo lo prova sui tre casi rilevanti (una riga, prima riga piena, due righe piene) invece che sul solo caso a cinque | nessuno: il vecchio titolo parlava di un gap che non esiste più |
| 98 | Test rinominato: `a sei pasti il gap dei pallini scende a 2: è il caso misurato che sbordava` → `a sei pasti due righe da tre` (Task 13, spec §H) | la fila da 45 px che sbordava a 375 e sotto non c'è più: la griglia a tre colonne è larga 21 px a qualunque numero di pasti (frame 27); il test nuovo prova la forma a due righe da tre, non più un gap ridotto | nessuno |
| 99 | I pallini vuoti prendono il colore di `--bordo-tratteggio` (`rgba(20,22,58,0.20)`) e, sul giorno selezionato, di `--banda-bordo` (`rgba(255,255,255,0.62)`) (Task 13) | sono valori già esistenti in `globals.css` [misurato], non nuovi token: il pallino vuoto riusa il contorno del tratteggio della Lista e, da selezionato, l'anello bianco della cella | chi cambia il tratteggio o la banda del bordo cambia anche il colore dei pallini vuoti, senza saperlo |
| 100 | Il gap fra le Righe pasto del Piano resta il 9 di oggi, non l'8 del file di disegno (Task 13, preflight P4 del controller; spec §H aggiornata il 26/09) | misurato: `piano/page.tsx:573`, `className="anim-giorno"`; questo task non tocca `piano/page.tsx` | nessuno: nessun codice cambia, solo la spec si allinea al codice di oggi |
| 101 | `righePallini(slotDefs.length)` non resta solo per i test: la griglia dei pallini dichiara anche `gridTemplateRows: repeat(righePallini(n), 5px)`, invece di lasciare le righe all'auto-placement del grid (Task 13, preflight P12 del controller) | la bozza del piano lasciava `righePallini` senza un uso nel componente («non serve al render: la griglia va a capo da sé»); il ruling P12 chiede che l'export non resti inutilizzato, con preferenza per farlo usare al componente. Righe esplicite e auto-placement disegnano lo stesso risultato (celle da 5px, stesso numero di righe), quindi nessun test rompe | nessuno: stesso output visivo, una riga di CSS in più |
| 102 | L'avvio del Marchio si decide in `useLayoutEffect`, al primo montaggio del Guscio, e un ref tiene la decisione anche col doppio effetto di Strict Mode (Task 14, spec §J) | sul server `AvvioMarchio` rende `null`, quindi niente mancata corrispondenza all'idratazione; l'effetto di layout mette il livello prima del primo disegno dopo l'idratazione | prima dell'idratazione, per un attimo, si vedono il Guscio vuoto e la tab bar (l'HTML del server) [ipotesi, da vedere sul telefono al gate §M.4] |
| 103 | Senza `matchMedia` o senza `sessionStorage` (o se `sessionStorage` lancia) l'avvio non parte (Task 14) | senza `matchMedia` non si sa se il moto è permesso, senza `sessionStorage` non si può promettere «una volta sola»: è un ornamento, e nel dubbio si salta. Per lo stesso motivo in jsdom non parte, e i test che montano il Guscio non lo vedono [misurato: `npx vitest run src/components` verde, 350 test] | nessuno: su un browser senza queste API l'app si apre senza l'animazione |
| 104 | La dissolvenza del fondo è `linear`, 420 ms, da 1200 a 1620 (nel CSS del Task 1, `.anim-avvio-fondo-via`) (Task 14) | la spec §J dà i tempi ma non la curva; `linear` come il velo del pannello (§B.2) | da guardare sul telefono: se lo stacco del fondo si nota, si cambia la curva in `globals.css` |
| 105 | Il Marchio della barra si nasconde con una classe (`anim-avvio-nascosto`, più `anim-avvio-rivela` per la transizione di 120 ms) dal montaggio del livello all'arrivo, a 1700, e torna incrociato col Marchio in volo che va a 0; si tocca con `classList` sul segno `[data-marchio-barra]`, e allo smontaggio (anche anticipato) le due classi si tolgono. Con la barra ridotta o assente a 1200 il volo non parte: il Marchio della barra torna subito e il livello intero si dissolve (`anim-avvio-dissolto`) (Task 14, spec §J) | i due segni non si vedono mai insieme, e la dissolvenza incrociata copre il mezzo pixel di scarto in altezza (35 / 140 = 0,25 in larghezza, 22,5 contro 22 in altezza). React non sovrascrive le classi: il `className` del segno non cambia fra un render e l'altro della barra | se la tab bar si smonta e rimonta durante i 1700 ms (una schermata che la nasconde), il segno nuovo non è nascosto e per un attimo i due Marchi si vedono insieme [ipotesi: su `/lista` all'apertura non succede] |
| 106 | Correzione alla bozza del test «sei caselle…» (Task 14, preflight #60): l'ultima asserzione controllava `coloreArea(ORDINE_MARCHIO[0])`, una costante del dominio; ora controlla il colore reso di ogni casella (`style.backgroundColor` contro la conversione in `rgb()` di `coloreArea(data-area)`) e quello della prima per esteso (`rgb(242, 164, 101)`, la Dispensa) | la bozza non provava il componente [misurato: con `background: 'transparent'` nel componente il test nuovo è rosso, la bozza sarebbe stata verde] | nessuno |

## Misure nel browser

### Sonda del Task 2: `chiudiTuttoPoi` + `router.push` (spec §A.5, §M.3 punto 1)

**Come:** due pagine temporanee, `src/app/auth/sonda-a` e `sonda-b` (fuori dal proxy di
sessione), su `next dev` alla porta 3100 con Supabase finto; il browser del pannello di Claude,
con clic veri sui tasti (`computer left_click`) e l'indietro da `history.back()` o dal browser.
La pagina A usa `useIndietroFogli` vero, già spostato in `src/components/`. Le pagine, `.next/dev`
e `next-env.d.ts` sono stati ripuliti dopo la misura. L0 e L1 sono `history.length` prima di
aprire i livelli. Misurato il 26/09. Dal secondo giro di A1 in poi la pagina registra anche, con
il loro istante in ms, le chiamate a `pushState`, `replaceState`, `go` e `fetch`: sono loro a
dire perché la pagina B non arriva. Il primo giro di A1 aveva prima un `navigate` a vuoto su
`/auth/sonda-a`, per far compilare la pagina (L0 = 3); i giri dopo partono come dice il piano.

| Misura | Atteso se regge | Misurato |
|---|---|---|
| A1. `APRI DUE LIVELLI`: lunghezza e livelli | L0 + 2, `LIVELLI 2` | L0 + 2, `LIVELLI 2` (giro 1: 3 → 5; giro 2: 5 → 7) |
| A1. `VAI A B CON CHIUDITUTTOPOI`, dopo 1,5 s: URL | `/auth/sonda-b` | **`/auth/sonda-a`**, pagina B assente (giro 1 e 2); ancora A dopo altri 3 s (giro 1) |
| A1. … lunghezza | L0 + 1 | **L0 + 2** (giro 1: 5; giro 2: 7) |
| A1. … `popstate` registrati | uno, su `/auth/sonda-a` | uno, su `/auth/sonda-a` |
| A1. indietro da B (`history.back()`) | `/auth/sonda-a`, `LIVELLI 0` | B non c'è: dall'A il `history.back()` porta a `/auth/sonda-b?inizio=1`, con un nuovo caricamento del documento (giro 2) |
| A1. un altro indietro | `/auth/sonda-b?inizio=1` | **NON ESEGUITA**: il primo indietro è già fuori da A |
| A1 bis. indietro da B col browser | `/auth/sonda-a`, `LIVELLI 0` | B non arriva neanche qui (L0 5, dopo `VAI` URL `/auth/sonda-a`, lunghezza 7, un `popstate`); l'indietro del browser porta a `/auth/sonda-b?inizio=1` |
| A2 (controllo). `VAI A B SENZA ASPETTARE`, dopo 1,5 s: URL, lunghezza, `popstate` | nessun atteso: dice perché serve la regola | `/auth/sonda-a`, L0 + 2 (5 → 7), un `popstate` su `/auth/sonda-a`, `LIVELLI 0`, pagina B assente: identico ad A1 |
| B. `/auth/sonda-a?impostazioni=ingredienti`: URL, lunghezza, livelli | `/auth/sonda-a`, L1 + 3, `LIVELLI 2` | `/auth/sonda-a`, L1 + 3 (6 → 9), `LIVELLI 2` |
| B. primo indietro | `/auth/sonda-a`, `LIVELLI 1` | **`/auth/sonda-a`, `LIVELLI 0`, con un ricaricamento della pagina** (lo script è stato interrotto dalla navigazione) |
| B. secondo indietro | `/auth/sonda-a`, `LIVELLI 0` | `/auth/sonda-a`, `LIVELLI 0`, stesso documento |
| B. terzo indietro | `/auth/sonda-b?inizio=1` | `/auth/sonda-b?inizio=1`; in nessun passo l'URL riprende `?impostazioni=` |
| Errori in console | nessuno | nessuno (letti dopo A1, dopo B e a fine sonda) |

**Perché A1 non regge** [misurato, giro 2 di A1; A1 bis e A2 danno la stessa sequenza a
pochi ms]: `go(-2)` a 8860 ms, la `fetch` RSC di `/auth/sonda-b` a 8862 (quindi `fn`, cioè
`router.push`, parte davvero al `popstate`), poi `replaceState('/auth/sonda-a')` di Next a 8871,
e il `popstate` visto dal registro della sonda a 8872. Nel codice di Next
(`node_modules/next/dist/client/components/app-router.js`, `onPopState`, e
`app-router-instance.js`, dove un `ACTION_RESTORE` segna `discarded` l'azione in volo): gli
effetti della pagina girano prima di quello dell'`AppRouter`, quindi l'ascoltatore `popstate`
dell'hook è registrato **prima** di quello di Next. Al `popstate` l'hook fa partire la `push`;
subito dopo Next manda la sua traversata, che scarta la `push` ancora in volo.

**Perché B non regge** [misurato; la causa è letta nel codice di Next, stesso file]: la
`replaceState(null, '', …)` della sonda gira in un effetto della pagina, prima che l'`AppRouter`
avvolga `history.pushState`/`replaceState`, e cancella dalla voce lo stato di Next (`__NA`). Le
due voci dell'hook nascono da quella voce senza `__NA`; al primo indietro l'`onPopState` di Next
trova uno stato senza `__NA` e fa `window.location.reload()`.

**Due varianti, misurate in più, solo nella sonda** (non sono nel piano; non c'è codice nel
commit che le usi):
- **A′, `fn` differita di un giro:** `chiudiTuttoPoi(() => setTimeout(() => router.push('/auth/sonda-b'), 0))`.
  L0 9 → `APRI` 11 → dopo 1,5 s `/auth/sonda-b`, lunghezza 10 (L0 + 1), pagina B presente, un
  solo `popstate`, su `/auth/sonda-a` (sequenza: `go(-2)` 10545, `replaceState` di Next 10555,
  `popstate` 10556, `pushState('/auth/sonda-b')` 10586). Indietro da B con `history.back()`:
  `/auth/sonda-a`, `LIVELLI 0`, stesso documento, un `popstate`; un altro indietro:
  `/auth/sonda-b?inizio=1`. A′ bis, indietro dal browser: `/auth/sonda-a`, `LIVELLI 0`, stesso
  documento. **A′ dà tutti gli attesi di A1 e A1 bis.**
- **B′, la `replaceState` conserva lo stato di Next:** `replaceState(window.history.state, '', pathname)`.
  L1 10 → `/auth/sonda-a`, 13 (L1 + 3), `LIVELLI 2`, la voce ha `__NA`. Tre indietro:
  `/auth/sonda-a` `LIVELLI 1`, `/auth/sonda-a` `LIVELLI 0` (tutti e due nello stesso documento),
  `/auth/sonda-b?inizio=1`. **B′ dà tutti gli attesi di B.**

**Esito della misura del piano: «non regge»**: in A1 e A1 bis la pagina B non arriva e la
lunghezza resta L0 + 2, e B non dà gli attesi al primo indietro.

**Esito finale: «regge con `fn` differita (A′)»** (decisione del controller, 26/09). Il Task 6
usa il **ramo A**: `chiudiTuttoPoi` + `router.push`. Lo Step 11 (`lasciaVoci`) non si fa.
- **Nell'hook:** la `fn` registrata da `chiudiTuttoPoi` parte con `setTimeout(fn, 0)` in tutti e
  tre i casi (al `popstate` atteso, nell'effetto senza voci, allo scadere della riserva), una
  volta sola. Allo smontaggio anche la `fn` già differita si butta, e una seconda chiamata
  sostituisce anche quella.
- **Il motivo:** l'ascoltatore `popstate` dell'hook parte prima di quello di Next, e la
  traversata di Next scarta la navigazione in volo
  (`node_modules/next/dist/client/components/app-router-instance.js`, righe 147–150).
- **Rimisurato col differimento dentro l'hook** [misurato il 26/09, pagina A senza più
  differimento nel chiamante, `chiudiTuttoPoi(() => router.push('/auth/sonda-b'))` come nel
  piano]:
  - **A1:** L0 11, `APRI` porta a 13 e `LIVELLI 2`. Dopo `VAI`: `/auth/sonda-b`, lunghezza 12
    (L0 + 1), pagina B presente, un solo `popstate`, su `/auth/sonda-a`. Sequenza: `go(-2)` 8523,
    `replaceState` di Next 8533, `popstate` 8535, `pushState('/auth/sonda-b')` 8567.
  - **Indietro da B** con `history.back()`: `/auth/sonda-a`, `LIVELLI 0`, stesso documento, un
    `popstate`. Un altro indietro: `/auth/sonda-b?inizio=1`.
  - **A1 bis:** L0 11, poi 13. Dopo `VAI`: `/auth/sonda-b`, lunghezza 12, un `popstate` su A.
    L'indietro del browser porta a `/auth/sonda-a`, `LIVELLI 0`, stesso documento.
  - **Console:** gli unici errori sono i tentativi del WebSocket HMR di `next dev`
    (`ws://localhost:3100/_next/hmr`), rimasti dal server fermato dopo la prima sonda: sono dello
    strumento di sviluppo, non dell'app.

**Regola per il Task 6, `?impostazioni=` (B′):** la `replaceState` che toglie il parametro
conserva lo stato di Next: `window.history.replaceState(window.history.state, '', pathname)`,
**non** `null`. Il `PannelloProvider` sta sotto l'`AppRouter` come la sonda, quindi il suo
effetto gira prima che Next avvolga `history`. Con `null` la voce perde `__NA`, e al primo
indietro l'`onPopState` di Next ricarica la pagina (`app-router.js`, righe 284–292). Con lo stato
conservato, B′ ha dato tutti gli attesi di B (numeri sopra).

### Sonda del Task 15: pannello, tab bar, striscia, avvio (spec §M.3, punti 2–5)

**Come** [misurato il 26/09]: una pagina temporanea `src/app/auth/sonda-fase5/page.tsx` (fuori
dal proxy di sessione) col `Guscio` vero, una `Testata`, due `StrisciaGiorni` (sei e tre pasti)
e `LivelloAvvio` a comando; `next dev` alla porta 3100 con `NEXT_PUBLIC_SUPABASE_URL` e
`ANON_KEY` finte; i finti di Supabase installati al caricamento del modulo, come dice il piano.
In più (vedi «Tre note operative»): un Supabase finto da riga di comando sulla porta 54321, per
far passare il proxy sulle pagine vere (`/lista`, `/piatti`, l'editor), e le misure a–d fatte
su `/lista`, non sulla sonda. Dati finti: sei pasti, 24 ingredienti, casa «da solo». Il browser
è quello del pannello di Claude, **nascosto** per tutta la sonda: le transizioni avanzano solo
quando si disegna un fotogramma (vedi le note). Pagina, `.next/dev` e `next-env.d.ts` ripuliti
dopo; viewport rimessa a `desktop`. Nessun errore in console.

**Esito: tutte le soglie passano. Nessuna correzione dopo la sonda.**

**Punto 2a, la matrice a sei pasti** (`?impostazioni=pasti-a-casa`, 42 celle):

| Finestra | Celle | Larghezza min | Altezza min | Destra max / limite | Sinistra min | Scorre di lato | Esito |
|---|---|---|---|---|---|---|---|
| 360 × 800 | 42 | 44,57 (max 44,58) | 44 | 348 / 348 | 12 | 0 | passa (attesa 44,6 [calcolo, §C.1]) |
| 375 × 812 | 42 | 46,71 | 44 | 363 / 363 | 12 | 0 | passa |
| 393 × 852 | 42 | 49,28 | 44 | 381 / 381 | 12 | 0 | passa |

Lo scroller è `.pannello-corpo`; anche il documento non scorre di lato (0 a 360). Screenshot a
360: le sei righe da sette casette, Pranzo con sabato e domenica fuori casa (bianche), il
riepilogo `Di base sei a casa per 40 pasti su 42. …` in fondo.

**Punto 2b, il piede fisso** (corpo scorso in fondo):

| Finestra | Sotto-schermata | Cima del piede | Fondo del piede | Fondo del contenuto | Coperto | Primario | Esito |
|---|---|---|---|---|---|---|---|
| 360 × 800 | Ordine delle aree | 707 | 800 | 597,5 | no | 54 | passa |
| 360 × 800 | Esporta | 707 | 800 | 241 | no | 54 | passa |
| 360 × 800 | Casa (da solo) | 707 | 800 | 423,5 | no | 54 | passa |
| 375 × 812 | Ordine delle aree · Esporta · Casa | 719 | 812 | 597,5 · 241 · 423,5 | no | 54 | passa |
| 393 × 852 | Ordine delle aree · Esporta · Casa | 759 | 852 | 597,5 · 220 · 402,5 | no | 54 | passa |

A queste tre altezze nessuno dei tre corpi scorre (`scrollHeight − clientHeight` = 0): la
soglia «non copre» è vera ma non messa alla prova. **Misura in più, a 360 × 560**, dove il corpo
scorre: Ordine delle aree scorre di 157 (portato a 156,5), il contenuto finisce a 441 (l'ultimo
tondo a 424), il piede comincia a 467: **non coperto**, 26 px d'aria che sono il padding in
fondo al corpo. Casa a 360 × 560 non scorre (contenuto a 423,5, piede a 467). Screenshot di
Ordine delle aree a 360 × 800: sei righe, `SALVA ORDINE` spento nel piede, il filetto sopra il
piede. Non misurati: il piede con l'errore di salvataggio o con «Il file è pronto…» dentro
(il Supabase finto non fallisce, e il file non è stato preparato).

**Punto 2c, la tastiera sul campo `PERS`: NON ESEGUITO** (il browser della sessione non apre
una tastiera virtuale): resta al telefono, §M.4.

**Punto 3, la tab bar a 360 × 800:**

| Stato | Larghezza × altezza | Voci | Lato sinistro / destro | Dal fondo | Esito |
|---|---|---|---|---|---|
| grande | 304 × 84 | 3 × (96 × 72) | 28 / 28 | 22 | passa |
| ridotta (scrollTop 300) | 244 × 66 | 3 × (76 × 54) | 58 / 58 | 22 | passa |
| grande (di nuovo a 0) | 304 × 84 | 3 × (96 × 72) | 28 / 28 | 22 | passa |

`transition-property`: `height, width` (0,2 s ciascuna), senza `left` né `right`: passa. Le
animazioni della barra erano finite a ogni misura (nessuna attesa scaduta).

**Punto 4, la striscia a sei pasti:**

| Finestra | Giorno più stretto | Somma + 6 gap | Ultimo a destra | Griglia | Dentro | Più alta di tre pasti | Scorre | Esito |
|---|---|---|---|---|---|---|---|---|
| 360 | 44,28 | 328 | 344 | 21 × 13 | sì | 8 (73,5 contro 65,5) | 0 | passa (atteso 44,29) |
| 375 | 46,42 | 343 | 359 | 21 | sì | 8 | 0 | numeri scritti, senza soglia |
| 393 | 49 | 361 | 377 | 21 | sì | 8 | 0 | numeri scritti, senza soglia |

A tre pasti la griglia è 21 × 5 (una riga), a sei 21 × 13 (due righe da 5 e il gap 3).

**Punto 5, l'arrivo dell'avvio** (barra grande, sonda in cima):

| Finestra | dx | dy | dLarghezza | dAltezza | Marchio in volo a fine volo | Marchio della barra | Sotto il centro | Esito |
|---|---|---|---|---|---|---|---|---|
| 360 × 800 | 0 | 0 | 0 | 0,5 | 64,5; 718,5; 35 × 22,5 | 64,5; 718,75; 35 × 22 | un `div` della sonda, non il livello | passa |
| 393 × 852 | 0 | 0 | 0 | 0,5 | 81; 770,5; 35 × 22,5 | 81; 770,75; 35 × 22 | un `div` della sonda, non il livello | passa |

`dAltezza` 0,5 è quella attesa (22,5 contro 22, §J), e non si giudica. Il livello ha
`pointer-events: none`. **Come è stata presa la fine del volo:** col pannello del browser
nascosto la transizione del `transform` (620 ms, confermata da `getTiming()`) resta a
`currentTime` 0 finché non si disegna un fotogramma, e la sua promessa `finished` non si
risolve. La misura chiama `finish()` sull'animazione del `transform` a 1250 ms dal tocco (la
classe è già `anim-avvio-volo`) e legge i rettangoli: è il punto d'arrivo che il componente ha
calcolato, non una posizione a metà. Un primo giro a 360 senza `finish()`, letto a 1965 ms con
la classe `anim-avvio-volo anim-avvio-svanisce`, aveva dato gli stessi numeri. **Lo screenshot a
metà volo non si è potuto prendere**: a 1,4 s dal tocco lo schermo mostrava il solo fondo, con le
caselle ferme a scala 0 (il pop non avanza senza fotogrammi). Uno screenshot dell'avvio vero su
`/lista` (una scheda nuova, quindi prima volta nella sessione) mostra il Marchio 3 × 2 composto
al centro sul fondo, poi la Lista con la tab bar. La variante `reduce`: NON ESEGUITO nel browser
(questo browser non la emula), coperta dal test `non parte … con reduce` del Task 14.

**Misure in più chieste dalle review dei Task 2–14** (a 360 × 800, pagine vere su `/lista`):
- **a. Il ritorno agli Ingredienti rimette l'altezza** (`scorrimentoDi`, decisione 53, e il
  `MutationObserver` della decisione 24). Corpo degli Ingredienti portato a 700 su 1144, tocco
  vero su `Apri Ingrediente di prova 3` (in cima alla vista a 236,4): `sessionStorage` salva
  `700` e l'origine `{"pathname":"/lista","sotto":"ingredienti"}`; l'editor si apre su
  `/piatti/nuovo/ingredienti/i-2?torna=impostazioni`. Tocco vero sulla freccia `Torna agli
  ingredienti`: si torna su `/lista` col pannello aperto sugli Ingredienti, senza animazione
  (`data-istantaneo`), `scrollTop` **700**, la stessa riga a **236,4**, e la chiave salvata
  cancellata. **Passa.** Le voci dopo il ritorno: `/lista`, l'editor, `/lista` e le due voci
  del pannello su una sotto-schermata (il limite noto di §A.4).
- **b. La pillola di Piatti su una navigazione client dal pannello** (decisione 78). Con
  `spesa:piatti-da` = `lista` in `sessionStorage`, tessera Piatti da `/lista`: un
  `MutationObserver` ha visto la pillola nascere con **`LISTA`** e, **3 ms** dopo, diventare
  **`IMPOSTAZIONI`** (5070 e 5073 ms dall'inizio del registro). La decisione 78 sottostimava: non
  solo il ricaricamento pieno, anche la navigazione dal pannello rende un'etichetta vecchia per
  un render. Se quel render arrivi allo schermo non è misurato (con il pannello nascosto i
  fotogrammi non si contano); 3 ms stanno sotto un fotogramma a 60 Hz (16,7 ms) [ipotesi: non si
  vede]. Senza `spesa:piatti-da` salvato il valore di ripiego è `IMPOSTAZIONI`, lo stesso
  dell'URL, e non si vede niente. Dalla sonda sotto `/auth` (primo ingresso nel gruppo `(app)`)
  la pillola nasce già giusta: `PrimoAvvio` monta la pagina dopo la navigazione. **Non
  corretto** (vedi «Rimasto aperto»).
- **c. Il velo copre il Menù utente** (review del Task 6). Col pannello aperto
  `elementFromPoint` al centro del Menù (303,5; 50) è `.pannello-velo`: `rgba(20, 22, 58,
  0.55)`, z 70, tutta la finestra. Il Menù ha `aria-expanded="true"` e l'ombra `--ombra-nav`, ma
  sta sotto il velo; `.guscio-main` è `inert`. Un tocco vero sul Menù **chiude il pannello
  tramite il velo**: `aria-expanded="false"`, `data-stato="chiuso"`, e il fuoco torna al Menù
  (`#menu-utente`). Il gesto funziona come dice §A.2; l'ombra del Menù aperto si vede velata.
- **d. `chiudiTuttoPoi` + `router.push` dal pannello vero** (tessera Piatti, il punto 1 del
  Task 2 rifatto sul componente). Su `/lista` all'indice 1 (L0 = 2): il Menù apre il pannello
  (L 3, indice 2, due voci `/lista`); tocco vero su Piatti: `go(-1)` a 4981 ms, `replaceState`
  di Next a 4992, `popstate` a 4994, `pushState('/piatti?da=impostazioni')` a 5068. Alla fine
  `/piatti?da=impostazioni`, **L0 + 1** (voci: sonda, `/lista`, `/piatti?da=impostazioni`),
  pagina Piatti presente. `history.back()`: `/lista`, pannello **chiuso**, stesso documento, un
  `popstate`. **Passa.** Un primo giro dalla sonda (scheda appena aperta) aveva dato gli stessi
  indirizzi, ma `history.length` di partenza non tornava (2, con l'API Navigation che ne elencava
  una sola prima): si è rifatto su `/lista` leggendo anche `navigation.entries()`.

## Migrazione dei test (spec §M.2)

Nessun test delle vecchie Impostazioni si cancella senza un sostituto. **Una regola sola per le
colonne:**
- «Test vecchio» è il titolo **esatto** dell'`it(...)` di oggi, carattere per carattere:
  apostrofi tipografici `’` compresi, `−` e `+` compresi, senza backtick attorno. Lo script
  del Task 11 (Step 12) cerca la riga col titolo esatto;
- «Va a» è il task che lo migra, e non cambia durante l'esecuzione;
- «Test nuovo» lo scrive il task che migra: il file, poi ` › `, poi il titolo esatto
  dell'`it(...)` nuovo (per un `describe` annidato, i titoli separati da ` › `, l'`it` per
  ultimo). Un test nuovo per riga: gli altri che provano la stessa cosa vanno nella «Nota»;
- «Nota» dice cosa è cambiato: un comportamento tolto dalla spec diventa il test del
  comportamento che lo sostituisce, e la nota lo dice.

La tabella tiene i test delle vecchie Impostazioni e quelli della Testata e di `utente.ts` che
cambiano nome. I test di altre pagine che cambiano nome (Importa, editor dell'ingrediente,
striscia dei giorni) si scrivono come coppia «vecchio → nuovo» nella tabella delle decisioni,
dal task che li tocca.

`P` = `src/app/(app)/impostazioni/__tests__/page.test.tsx` (47 test), `R` =
`src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx` (5 test) [misurato il 26/09:
`grep -c "^\s*it("`]. Le righe 53–57 sono i test della Testata e di `utente.ts` che cambiano
nome. I dodici test di `useIndietroFogli` si spostano senza cambiare (Task 2, decisione 7) e
non stanno qui.

**Nota d'esecuzione (Task 1, riga 9 del preflight del controller; fino al Task 15 qui c'era
scritto per errore «ruling P9», che è un'altra cosa: l'ombra `--ombra-tessera`):** la riga 53 riporta il titolo con il
`describe` davanti (`Testata (spec §D) › …`), perché il test vive dentro quel blocco annidato e
il titolo da solo non basta a identificarlo — la stessa convenzione che la regola sopra chiede
per «Test nuovo». Le altre righe restano al titolo esatto dell'`it(...)`, come la regola dice.

| # | Test vecchio | File | Va a | Test nuovo | Nota |
|---|---|---|---|---|---|
| 1 | mostra i pasti reali letti da leggiSlotDefs, non i quattro cablati nel mock dell’artboard | P | Task 8, Gestione dei pasti | `gestione-pasti.test.tsx` › Gestione dei pasti › mostra i pasti letti da leggiSlotDefs e il contatore | |
| 2 | sta nella sezione CASA, dichiara l’assunzione e parte da 1 con il − spento | P | Task 7, campo `PERS` | `persone.test.tsx` › Per quante persone cucini › sta in Come calcolo la lista, dichiara l’assunzione e parte da 1 senza la seconda nota | lo stepper è tolto (spec §C.10): il − spento diventa «nessun tasto porzioni»; la riga sta in «Come calcolo la lista» |
| 3 | + salva subito le impostazioni intere con 2, mostra 2 e dice per quanti compra la lista | P | Task 7, campo `PERS` | `persone.test.tsx` › Per quante persone cucini › scritto 2 e uscito dal campo salva le impostazioni intere, mostra 2 e dice per quanti compra la lista | il + diventa il campo: si scrive 2 e si esce dal campo |
| 4 | a 4 il + è spento e non salva | P | Task 7, campo `PERS` | `persone.test.tsx` › Per quante persone cucini › 5, 0, 2,5 e abc non si salvano: torna al valore di prima e chiede un numero da 1 a 4 | il tetto è la validazione del campo: 5 torna al valore di prima con `Scrivi un numero da 1 a 4.` |
| 5 | − scende di uno e salva | P | Task 7, campo `PERS` | `persone.test.tsx` › Per quante persone cucini › con Invio salva senza uscire dal campo: da 3 a 2 | si scrive il valore nuovo e si dà Invio |
| 6 | due tap veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo | P | Task 9, Cadenza (la coda del provider) | `cadenza.test.tsx` › Cadenza dei controlli › due tocchi veloci (la coda serializzata del provider) › se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo | la coda sta nel provider; il campo `PERS` è spento in volo (frame 25), il segmento no; provato anche nel provider: `dati-pannello.test.tsx` |
| 7 | due tap veloci: se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore | P | Task 9, Cadenza (la coda del provider) | `cadenza.test.tsx` › Cadenza dei controlli › due tocchi veloci (la coda serializzata del provider) › se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore | idem |
| 8 | due tap veloci: se il primo riesce ma la sua rilettura non è l’ultima e il secondo fallisce, mostra il valore del server | P | Task 9, Cadenza (la coda del provider) | `cadenza.test.tsx` › Cadenza dei controlli › due tocchi veloci (la coda serializzata del provider) › se il primo riesce ma la sua rilettura è superata e il secondo fallisce, mostra il valore del server | idem |
| 9 | due tap veloci: se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono 2 | P | Task 9, Cadenza (la coda del provider) | `cadenza.test.tsx` › Cadenza dei controlli › due tocchi veloci (la coda serializzata del provider) › se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono OGNI 2 MESI | idem |
| 10 | se il salvataggio fallisce e anche la rilettura fallisce, torna all’ultimo valore confermato e lo dice | P | Task 7, campo `PERS` | `persone.test.tsx` › Per quante persone cucini › se falliscono salvataggio e rilettura, torna all’ultimo valore confermato e lo dice | provato anche nel provider: `dati-pannello.test.tsx` |
| 11 | se il salvataggio fallisce torna al valore del server e lo dice | P | Task 7, campo `PERS` | `persone.test.tsx` › Per quante persone cucini › se il salvataggio fallisce torna al valore del server e lo dice sotto la riga | provato anche nel provider: `dati-pannello.test.tsx` |
| 12 | se la RLS rifiuta il salvataggio (la casa è cambiata) scarta l’id della casa, ricarica tutto e lo dice | P | Task 7, campo `PERS` | `persone.test.tsx` › Per quante persone cucini › se la RLS rifiuta (la casa è cambiata) scarta l’id, ricarica tutto e lo dice sopra i blocchi | «Fai la spesa con qualcuno?» diventa la tessera `SOLO TU`; `4 DI 6` diventa `4 PASTI`; provato anche nel provider: `dati-pannello.test.tsx` |
| 13 | un rifiuto RLS riconosciuto dal solo messaggio (senza codice) ricarica allo stesso modo | P | Task 7, campo `PERS` | `persone.test.tsx` › Per quante persone cucini › un rifiuto RLS riconosciuto dal solo messaggio ricarica allo stesso modo | provato anche nel provider: `dati-pannello.test.tsx` |
| 14 | porta all elenco degli ingredienti | P | Task 7, riga Ingredienti | `cima.test.tsx` › La cima del pannello › la riga Ingredienti apre la sotto-schermata degli ingredienti | il link diventa una riga che apre la sotto-schermata; l'elenco è del Task 9 |
| 15 | sotto il minimo di 3 pasti il pulsante di rimozione è disattivato | P | Task 8, Gestione dei pasti | `gestione-pasti.test.tsx` › Gestione dei pasti › a tre pasti le ✕ sono spente e la nota dice il minimo | più la nota nuova `Tre pasti sono il minimo.` |
| 16 | sopra il minimo la rimozione funziona e salva l’insieme aggiornato | P | Task 8, Gestione dei pasti | `gestione-pasti.test.tsx` › Gestione dei pasti › un pasto senza piatti si toglie al tocco e salva l’insieme aggiornato | decisione 12: al tocco solo senza piatti; con piatti i test del dialogo («un pasto con piatti chiede il dialogo…», «TOGLI nel dialogo…», «se TOGLI non riesce…») |
| 17 | al massimo di 6 pasti il pulsante di aggiunta è disattivato | P | Task 8, Gestione dei pasti | `gestione-pasti.test.tsx` › Gestione dei pasti › a sei pasti AGGIUNGI PASTO non c’è e la nota dice il massimo | spento → assente (frame 07): a 6 `AGGIUNGI PASTO` non c'è e c'è `Sei pasti sono il massimo.` |
| 18 | aggiunge un pasto sotto il massimo e lo salva con un id generato | P | Task 8, Gestione dei pasti | `gestione-pasti.test.tsx` › Gestione dei pasti › AGGIUNGI PASTO crea Nuovo pasto in fondo, a casa tutti i giorni, col campo a fuoco | |
| 19 | la prima riga non può salire e l’ultima non può scendere; riordinare aggiorna le posizioni e salva | P | Task 8, Gestione dei pasti | `gestione-pasti.test.tsx` › Gestione dei pasti › su spento sul primo, giù spento sull’ultimo; riordinare aggiorna le posizioni e salva | l'opacità 0,35 diventa `disabled` con l'icona in `--icona-spenta` |
| 20 | la pastiglia del giorno abitualmente fuori casa ha 44px di area di tap sopra una pillola di 36px | P | Task 8, Pasti a casa | `pasti-a-casa.test.tsx` › Pasti a casa › ogni cella è alta 44 e divide la larghezza con le altre (flex: 1) | la pillola da 36 sparisce: la cella della matrice è 44 piena |
| 21 | accende una pastiglia del giorno e salva le assenze abituali aggiornate | P | Task 8, Pasti a casa | `pasti-a-casa.test.tsx` › Pasti a casa › un tocco mette Colazione fuori casa il lunedì e salva le assenze aggiornate | |
| 22 | rinominare un pasto salva il nuovo nome al blur, non a ogni carattere digitato | P | Task 8, Gestione dei pasti | `gestione-pasti.test.tsx` › Gestione dei pasti › il nome si salva all’uscita dal campo, non a ogni carattere | |
| 23 | con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server | P | Task 8, Gestione dei pasti | `gestione-pasti.test.tsx` › Gestione dei pasti › con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva sul server | la semina è del provider (Task 6); provata anche nel provider: `dati-pannello.test.tsx` |
| 24 | il link ordine dei reparti mostra l’anteprima e il riepilogo nell’ordine reale, non un ordine fisso | P | Task 7, riga Ordine delle aree | `cima.test.tsx` › La cima del pannello › la riga Ordine delle aree dice se l’ordine è di base e apre la sotto-schermata | anteprima e riepilogo tolti (spec §C.5, log §4.4, §I): li sostituisce il valore `PERSONALIZZATO` / `DI BASE` |
| 25 | con il ciclo spento la rotazione si può accendere e dice cosa cambia | P | Task 8, Rotazione del piano | `rotazione.test.tsx` › Rotazione del piano › con NESSUNA dice la nota di oggi; 2 SETT. salva le impostazioni intere e compare il contatore | `ORA SEI ALLA` → `SETTIMANA {k} DI {n}` |
| 26 | se il salvataggio del ciclo fallisce torna al valore di prima e lo dice | P | Task 8, Rotazione del piano | `rotazione.test.tsx` › Rotazione del piano › se il salvataggio fallisce il segmento torna a NESSUNA e sotto c’è l’errore | |
| 27 | il copy del giro con origine futura dice "comincia" | P | Task 8, Rotazione del piano | `rotazione.test.tsx` › Rotazione del piano › con l’origine futura la nota dice «comincia» | |
| 28 | il copy del giro con origine passata (o oggi) dice "è cominciato" | P | Task 8, Rotazione del piano | `rotazione.test.tsx` › Rotazione del piano › con l’origine passata la nota dice «è cominciato» | |
| 29 | RIPARTI da lunedì richiede due tocchi: il primo arma senza salvare, il secondo salva davvero | P | Task 8, Rotazione del piano | `rotazione.test.tsx` › Rotazione del piano › RIPARTI apre il dialogo, e RIPARTI DA LUNEDÌ salva l’origine al lunedì corrente | `SICURO?` tolto (decisione 8): diventa il dialogo `riparti`; ANNULLA non salva, `RIPARTI DA LUNEDÌ` salva |
| 30 | RIPARTI armato: un tap fuori dal bottone annulla senza salvare | P | Task 8, Rotazione del piano | `rotazione.test.tsx` › Rotazione del piano › ANNULLA chiude il dialogo senza salvare; il velo non chiude | il tocco fuori diventa ANNULLA; il velo del dialogo non chiude e non salva (spec §N) |
| 31 | RIPARTI armato: un cambio di stato altrove (la rotazione) lo disarma | P | Task 8, Rotazione del piano | `rotazione.test.tsx` › Rotazione del piano › RIPARTI è spento se l’origine è già il lunedì corrente | senza armamento il caso non esiste; protegge la regola di oggi non disegnata: `RIPARTI` spento quando l'origine è già il lunedì corrente |
| 32 | da solo: invita a fare la spesa con qualcuno, offre il codice e il campo per entrare | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › da solo: invita, spiega cosa vuol dire, offre il codice e il campo per entrare | `CASA` non è più un'etichetta: è il titolo della sotto-schermata |
| 33 | CREA UN CODICE chiama creaInvito e mostra il codice grande con la sua durata | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › CREA UN CODICE mostra il codice, compitato per lo screen reader, con la sua durata | `aria-label` lettera per lettera (§C.7) e l'etichetta `CODICE DELLA CASA` sopra il riquadro; COPIA, COPIATO e la scadenza hanno test propri nello stesso file |
| 34 | se creaInvito fallisce lo dice senza rompere la scheda | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › se creaInvito fallisce lo dice e CREA UN CODICE resta | l'errore sta nel piede, sopra `CREA UN CODICE` |
| 35 | ENTRA maiuscola il codice, chiama entraInCasa e ricarica su /lista | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › ENTRA maiuscola il codice, si accende a 8 caratteri, chiama entraInCasa e ricarica su /lista | sei caratteri (il formato vecchio) lasciano ENTRA spento |
| 36 | con un codice sbagliato mostra il messaggio della funzione SQL (P0001) così com’è | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › con un codice sbagliato mostra il messaggio della funzione SQL così com’è | l'errore sta sotto il campo, con `role="alert"`; `messaggioEntrata` ha anche un test puro (`casa.test.tsx` › Casa condivisa, le funzioni pure) |
| 37 | un errore che non è un raise exception della funzione (es. 23505) non mostra il messaggio grezzo di Postgres | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › un errore che non è della funzione non mostra il messaggio grezzo, e si può riprovare | |
| 38 | da proprietario: elenca le email dei membri e offre un altro codice, senza ESCI | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › da proprietario: tu per primo con TU, poi i membri con TOGLI, la nota e un altro codice; niente ESCI né HO UN CODICE | `La tua casa` diventa `LA TUA CASA`; tu per primo con `TU`; `TOGLI` ha l'`aria-label` `Togli {email} dalla casa`; il codice creato dentro il blocco ha il test «da proprietario: il codice creato compare dentro il blocco, sotto la nota» |
| 39 | da proprietario: TOGLI chiede conferma al primo tocco, al secondo toglie per id e rilegge la casa | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › da proprietario: TOGLI apre il dialogo; TOGLI nel dialogo toglie per id e rilegge la casa | diventa il dialogo `togli`: `SICURO?` è tolto (decisione 8) |
| 40 | da proprietario: tolto l’ultimo membro la scheda torna allo stato da solo | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › da proprietario: tolto l’ultimo membro si torna allo stato da solo | |
| 41 | da proprietario: TOGLI armato, un tap fuori disarma senza togliere | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › da proprietario: ANNULLA chiude il dialogo senza togliere | diventa: ANNULLA del dialogo non toglie (il tocco fuori diventa ANNULLA; il velo non chiude) |
| 42 | se togliere fallisce lo dice e il membro resta in elenco | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › se togliere fallisce il dialogo lo dice e il membro resta | l'errore sta nel dialogo (§D), col testo di oggi, non l'avviso «La casa è cambiata…» |
| 43 | se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza dire che non siamo riusciti | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza errore | usa `ricaricaCasa(seFallisce)` del Task 6 |
| 44 | da membro: ESCI DALLA CASA chiede conferma al primo tocco ed esce al secondo | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › da membro: dice di chi è la casa; ESCI DALLA CASA apre il dialogo e l’uscita riapre il pannello su Casa | diventa il dialogo `esci-casa`; il reload va a `/lista?impostazioni=casa` (§C.7), non più a `/lista` |
| 45 | da membro: ESCI armato, un tap fuori disarma senza uscire | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › da membro: ANNULLA chiude il dialogo senza uscire | diventa: ANNULLA del dialogo non esce |
| 46 | se uscire fallisce lo dice e resta nella casa | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › se uscire fallisce il dialogo lo dice e si resta nella casa | l'errore sta nel dialogo (§D) |
| 47 | se statoCasa fallisce la sezione lo dice e il resto delle impostazioni resta usabile | P | Task 10, Casa condivisa | `casa.test.tsx` › Casa condivisa › se statoCasa fallisce: la sotto-schermata ha solo l’errore, la tessera nessun valore, la cima resta usabile | frame 26; `casa: null` nel provider (Task 6), il messaggio nella sotto-schermata senza RIPROVA; provato anche nel provider: `dati-pannello.test.tsx` |
| 48 | mostra le sei righe nell’ordine caricato, con le frecce ai limiti disattivate al 35% di opacità | R | Task 9, Ordine delle aree | `aree.test.tsx` › Ordine delle aree › sei righe nell’ordine salvato; su spento sulla prima, giù spento sull’ultima | lo 0,35 diventa `disabled` con l'icona in `--icona-spenta` |
| 49 | riordinare con le frecce non salva finché non si preme SALVA ORDINE | R | Task 9, Ordine delle aree | `aree.test.tsx` › Ordine delle aree › le frecce riordinano senza salvare; SALVA ORDINE è spento finché l’ordine è quello salvato | la numerazione delle righe è tolta (frame 13): l'ordine si legge dagli `aria-label` |
| 50 | SALVA ORDINE persiste il nuovo ordine lasciando intatto tutto il resto, poi torna a Impostazioni | R | Task 9, Ordine delle aree | `aree.test.tsx` › Ordine delle aree › SALVA ORDINE scrive il nuovo ordine con tutto il resto intatto e resta qui | ora resta sulla sotto-schermata (spec §C.5) |
| 51 | se il salvataggio fallisce, mostra un errore e resta sulla pagina | R | Task 9, Ordine delle aree | `aree.test.tsx` › Ordine delle aree › se il salvataggio fallisce l’errore sta sopra il tasto, che si riaccende, e si resta qui | apostrofo dritto, testo di §C.5 |
| 52 | il link indietro torna alla pagina statica /impostazioni | R | Task 9, Ordine delle aree | `aree.test.tsx` › Ordine delle aree › la freccia torna in cima senza salvare, e l’ordine non salvato si perde | la freccia è del pannello (Task 6) |
| 53 | Testata (spec §D) › il menù utente porta alle impostazioni, si chiama Impostazioni e mostra l'iniziale | `src/components/__tests__/testata.test.tsx` | Task 6, Testata | `testata.test.tsx` › Testata (spec §D) › il Menù utente è un bottone col nome, che apre il pannello e mostra l'iniziale (spec fase 5 §A.2) | il Menù è un `button` che apre il pannello |
| 54 | con indietro c'è il link Indietro e non c'è Impostazioni | `src/components/__tests__/testata.test.tsx` | Task 11, Testata | `testata.test.tsx` › Testata (spec §D) › modo indietro: la pillola (spec fase 5 §G.2) › nessun link a /impostazioni resta nella Testata | più i tre casi di `la pillola dice %s e si chiama «%s»` e il titolo a 52 sotto la pillola |
| 55 | usa il nome se c'è | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` | `utente.test.ts` › leggiUtente (spec fase 5 §A.2) › il nome del profilo se c'è, ripulito | |
| 56 | altrimenti l'email | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` | `utente.test.ts` › leggiUtente (spec fase 5 §A.2) › altrimenti la parte dell'email prima della @ | |
| 57 | senza utente o con errore torna il puntino | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` e `inizialeDi` | `utente.test.ts` › inizialeDi › senza nome il puntino | e `leggiUtente` › senza utente o con errore, nome ed email vuoti: non lancia |

Per task: Task 6 = 4 (53, 55–57); Task 7 = 10 (2–5, 10–14, 24); Task 8 = 17 (1, 15–23,
25–31); Task 9 = 9 (6–9, 48–52); Task 10 = 16 (32–47); Task 11 = 1 (54). Le righe 1–52 sono
i 52 test di `P` e `R`: 10 + 17 + 9 + 16 = 52.

## Non eseguiti: restano per il gate dal telefono

Ogni task aggiunge qui quello che non ha potuto provare fuori dal telefono.

- **`cancella_dispensa()` (Task 4): la SQL NON ESEGUITA.** Nessun runtime SQL su questa macchina;
  controllata solo a mano. Le tre query di «Task 4 › Da fare all'applicazione della 0015» vanno
  lanciate quando si applica la migrazione, oppure si prova Cancella la dispensa dal telefono su
  un account di prova (spec §M.4), con un pasto «dai pronti» di oggi o dopo e una lista aperta.
- **Il `max_rows` di PostgREST (Task 5): NON MISURATO.** `leggiTutteLeSettimane` regge qualunque
  valore (pagina a 1000, e va avanti di quante righe arrivano davvero, non di quante ne ha
  chieste), ma il tetto vero di questo progetto Supabase non è stato letto. Da controllare al
  gate: Dashboard → Settings → API, o `select current_setting('pgrst.db_max_rows', true);`.
- **`salvaFile` e `esci()` (Task 5): la prova vera è dal telefono.** I test coprono `canShare`/
  `share`/download in jsdom, ma il foglio di condivisione del sistema (iOS/Android) e un vero
  logout su un secondo dispositivo con la stessa sessione (per verificare che resti dentro, D3)
  vanno provati dal telefono su un account di prova.
- **Il pannello nel browser vero** (Task 6): salita, velo e scala dell'app dietro, la chiusura
  con `visibility: hidden` alla fine, la variante `reduce`, l'apertura da `?impostazioni=` senza
  animazione, il fuoco al Menù utente alla chiusura, lo scorrimento rimesso negli Ingredienti.
  I test in jsdom controllano attributi e classi, non il movimento: restano alla sonda della
  spec §M.3 punto 2 e al telefono.
- **La cima del pannello sul telefono** (Task 7): le tessere 2 × 2 a 360, il filetto del
  separatore, i Blocchi con le righe da 56, il campo `PERS` con la tastiera numerica
  (`inputMode="numeric"`) e il salvataggio con Invio sulla tastiera del telefono, il piede
  `Versione {x}` coi 26 del corpo sotto. I test in jsdom controllano testi, ruoli e valori, non
  il disegno.
- **La settimana di base sul telefono** (Task 8): la matrice a 360 × 800 con sei pasti (celle
  da 44,6 [calcolo, spec §C.1], non misurate), le sigle dei giorni ferme mentre il corpo scorre
  (`position: sticky` dentro il corpo del pannello), il campo del pasto nuovo a fuoco con la
  tastiera che sale, il segmento a blocco della rotazione. In jsdom i test controllano
  `flex: 1`, `height: 44px`, `position: sticky` e il fuoco, non le misure: restano alla sonda
  della spec §M.3 punto 2.

- **Casa ed Esporta sul telefono** (Task 10): `COPIA` con la clipboard vera (su iOS
  `navigator.clipboard` c'è solo in contesto sicuro e dopo un tocco), il codice che sparisce al
  ritorno in primo piano dopo un'ora, il reload dopo `ESCI DALLA CASA` che riapre il pannello su
  Casa nello stato «da solo» con la tessera `SOLO TU`, il reload dopo `ENTRA` su `/lista`, e il
  foglio di condivisione di `SALVA IL FILE`. In jsdom i test controllano `writeText`,
  `location.assign` e `salvaFile` finti, non il sistema.

- **L'editor dell'ingrediente sul telefono** (Task 12): il Dock che senza tab bar sta a 22 dal
  fondo e ci resta anche quando `data-barra` passa a `ridotta` con lo scorrimento, la sua
  transizione, l'aria sotto `ELIMINA` (decisione 89, punto 8), la fotocamera dentro il foglio
  `Scansiona la confezione` con un codice vero e `/api/prodotto` vero, il gesto indietro che
  chiude prima il foglio o il dialogo, e `APRI {NOME}` che apre l'altro editor con una voce sola
  in più. In jsdom i test controllano la classe `dock-senza-barra`, `history.go` finto e `fetch`
  finto, non il movimento né la fotocamera.

- **L'avvio del Marchio nel browser vero** (Task 14): il pop, il volo, il punto d'arrivo sul
  Marchio della voce Lista e la dissolvenza incrociata degli ultimi 120 ms. In jsdom i test
  controllano classi, tempi (timer finti) e il `transform` calcolato da rettangoli finti, non il
  movimento né la posizione vera. La misura del punto d'arrivo resta alla sonda del Task 15,
  punto 5; il lampo del Guscio prima dell'idratazione (decisione 102) al telefono, gate §M.4.

- **NON ESEGUITO nella sonda del Task 15**, ognuno con la prova di §M.4 che lo copre:
  - **la tastiera sul campo `PERS`** (il browser della sessione non apre una tastiera virtuale):
    nessuna prova di §M.4 la nomina; la proposta è di farla dentro «aprire e chiudere il
    pannello da Lista, Piano e Dispensa», scrivendo un numero nel campo e guardando che la
    tastiera numerica non copra la riga;
  - **la variante `reduce` dell'avvio e del pannello** (questo browser non emula
    `prefers-reduced-motion`): «l'avvio all'apertura della PWA» e «aprire e chiudere il
    pannello», rifatti col moto ridotto acceso nel sistema. In jsdom li coprono i test del
    Task 14 (`non parte … con reduce`) e le classi del Task 6;
  - **la fotocamera che legge un codice nell'editor**: «una scansione nell'editor»;
  - **un tocco vero sul Menù utente, col dito**: nella sonda il tocco è un clic del mouse
    (misura c); col dito, «aprire e chiudere il pannello da Lista, Piano e Dispensa»;
  - **il movimento**: salita del pannello, riduzione della barra, volo del Marchio. Col pannello
    del browser nascosto le transizioni non avanzano senza fotogrammi: la sonda ha misurato i
    punti d'arrivo, non le curve né lo screenshot a metà volo. Al telefono, con le prove sopra;
  - **il piede fisso con un messaggio dentro** (l'errore di `SALVA ORDINE`, «Il file è
    pronto…», l'errore di `creaInvito`): il Supabase finto non fallisce e il file non è stato
    preparato. «Esporta e SALVA IL FILE» e «Casa: creare un codice» lo mostrano al telefono.

## Rimasto aperto, di proposito

Ogni task aggiunge qui i minor che la review lascia aperti, col motivo.

- **Togliere un pasto con piatti cancella a cascata anche i lotti Pronti di quei piatti (Task 8,
  decisione del controller del 26/09).** `porzione_pronta.dish_id … on delete cascade`
  [misurato, `0009_meal_prepping.sql` riga 17]: i pronti di quei piatti spariscono dalla
  Dispensa. Il dialogo `rimuovi-pasto` non lo dice (il testo è quello di §D e non cambia).
  Limite noto.
- **Una bozza di import in corso può puntare a un pasto tolto (Task 8, review di correttezza,
  punto 5; comportamento di prima della fase 5).** `import_draft.stato_revisione.mappaturaPasti`
  tiene gli id dei pasti [misurato: `src/domain/import/commit.ts` riga 211,
  `src/app/(app)/importa/page.tsx` riga 296], e la revisione considera mappato un pasto se l'id
  c'è, senza controllare che esista ancora [misurato: `Revisione.tsx` riga 219]. Togliere un
  pasto con un import a metà lascia un id orfano: al commit l'insert del piatto fallirebbe sulla
  chiave esterna di `dish.slot_def_id` [ipotesi, non testato]. Era così anche con la pagina di
  prima.
- **Gli storni della settimana aperta di un pasto tolto (Task 8, review di correttezza, punto
  1; comportamento di prima della fase 5).** La chiusura della lista rilegge i
  `meal_slot_storno` della sua settimana per riapplicarli al residuo [misurato:
  `src/data/lista.ts` righe 515–530]. Togliere un pasto con la lista della settimana aperta
  porta via a cascata i suoi `meal_slot` e i loro storni, che alla chiusura non si riapplicano
  più [ipotesi, non testato: l'effetto sul numero dipende da quali ingredienti la chiusura
  sovrascrive]. Le settimane già chiuse non si ricalcolano: la riapplicazione ha la sua guardia
  di idempotenza [letto nel commento di `lista.ts`, non testato]. Era così anche con la pagina di prima.
- **La ricerca in Ingredienti (decisione 13 della spec).** La sotto-schermata elenca gli
  ingredienti per area, senza campo di ricerca: resta fuori da questa fase.
- **L'import del file esportato (§E.3).** Esporta scrive un file con `formato: 1`; rileggerlo è
  un'altra funzione, fuori da questa fase.
- **La metà «ultimo salvataggio» del piede (§N).** Il piede dice solo `Versione {x}`: un
  «ultimo salvataggio» non è un dato che esiste.
- **La pillola di Piatti rende un'etichetta vecchia per un render** (misura b del Task 15,
  decisione 78): `LISTA` per 3 ms prima di `IMPOSTAZIONI`, sotto un fotogramma [ipotesi: non si
  vede]. Non corretto: il rimedio (leggere `da` dai `searchParams` della pagina invece che da
  `window.location`) cambia il modo in cui Piatti legge l'indirizzo, per un difetto non visto a
  schermo. Da riaprire se al telefono la pillola lampeggia.
- **I test intermittenti visti durante l'esecuzione, preesistenti o senza nome.** Nessuno è
  stato corretto; nessuno è in un file di questa fase tranne l'ultimo, che lo è solo per lo
  spostamento dell'hook:
  - un fallimento **senza nome** allo Step 9 del Task 2, nel gruppo DialogoConferma /
    FoglioDalBasso / lotto / pagina della Dispensa: una volta, poi 0 su 16 giri [misurato dal
    Task 2; il titolo del test non è stato registrato];
  - `src/app/(app)/lista/__tests__/page.test.tsx` › «il marchio segna mancante…»: 1 su 5 anche
    da solo, e 1 su 10 già prima del Task 6 [misurato dal Task 6]: preesistente; **corretto
    dopo la review finale** (I1, decisione 107);
  - `src/components/pannello/__tests__/gestione-pasti.test.tsx`, i test della ✕ col repertorio
    in attesa e dopo un rifiuto RLS: un `waitFor` scade a 1 s, 2 volte su 6 in suite intera sul
    ramo corretto e 1 su 4 a `d967bae` [misurato dopo la review finale, vedi «Dopo la review
    finale»]: preesistente, non corretto;
  - `src/app/(app)/dispensa/__tests__/widget-ai.test.tsx` (il fuoco del `role="status"` del
    widget AI): una volta in suite intera, verde da solo e alla riesecuzione [misurato dal
    Task 5];
  - `src/app/(app)/dispensa/__tests__/page.test.tsx` › «Dispensa: il gesto indietro › ELIMINA
    dal dialogo (2 → 0) chiama go(-2) una volta»: una volta su quattro in un gruppo di file,
    verde da solo quattro volte su quattro [misurato dal Task 12].
  Nella verifica finale del Task 15 la suite intera è verde (vedi «Chiusura»). La causa comune
  più probabile sono tempi sotto carico con timer veri [ipotesi, non indagata].

## Domande per Andrea (in review)

Le domande che l'esecuzione trova e non decide: ognuna col punto del codice o della spec, e la
proposta. Andrea le vede in review.

- **Piano e Lista si rileggono dopo Cancella la dispensa? (Task 4)** Oggi no: solo la Dispensa
  ascolta `spesa:dispensa-cambiata`, come dice la spec §E.2. Con D1 il Piano aperto sotto il
  pannello mostra `Porzione pronta` su pasti che non lo sono più, con D2 la Lista mostra ancora
  «in casa …», finché non si riaprono. Toccare quei pasti è innocuo (Task 4, limiti).
  **Proposta:** va bene così. Se li vuoi aggiornati subito, Piano e Lista ascoltano lo stesso
  evento con un contatore nelle dipendenze del loro caricamento: un task a parte.
- **I piatti disattivati assenti dal file di Esporta, va bene? (Task 5, §E.3)** `preparaEsportazione`
  legge i piatti con `leggiRepertorio()`, che è solo quelli attivi: un pasto del `piano` esportato
  può citare un `dishId` che il file non elenca fra `piatti`, se quel piatto è stato disattivato
  nel frattempo. **Proposta:** va bene così — il file dice quello che l'app mostra oggi (i piatti
  attivi), non un archivio storico completo; chi lo rilegge un domani (un import, fuori da questa
  fase) troverebbe comunque un `dishId` orfano. Se invece Esporta deve essere un archivio completo,
  serve leggere anche i piatti disattivati: un cambio piccolo, ma cambia cosa promette il file.
- **Account senza utente letto: testo e forma vanno bene? (Task 7, decisioni 38 e 39)** Se la
  lettura dell'utente fallisce (`leggiUtente` torna nome ed email vuoti), il dialogo di Esci
  dice `I tuoi dati restano. Per rientrare ti mandiamo un link via email.` invece di «… un link
  a .», e la riga col nome e l'email non si mostra: nel blocco Account resta solo Esci
  (`src/components/pannello/Cima.tsx`, `testoEsci` e il blocco Account). **Proposta:** va
  bene così — è un caso raro (rete assente all'apertura) e la frase resta vera. Se preferisci
  un altro testo, o un segnaposto al posto della riga, è una riga di codice.
- **La nota di Gestione dei pasti è diventata imprecisa (Task 8, spec §I).** Dice ancora `Da tre a
  sei pasti, nell’ordine in cui li fai. I giorni segnati qui vengono già spenti quando si apre una
  settimana nuova: nel Piano correggi solo le eccezioni — le settimane già create non cambiano.`,
  ma i giorni ora si segnano in Pasti a casa, non in Gestione dei pasti
  (`src/components/pannello/GestionePasti.tsx`, `NOTA_GESTIONE`). Resta com'è in §I (il testo di
  oggi con «nel Piano») finché non dai il testo. **Proposta:** `Da tre a sei pasti, nell’ordine in
  cui li fai. I giorni a casa si segnano in Pasti a casa.` — da confermare, non l'ho scritta.
- ~~**Il Piano aperto sotto il pannello dopo aver tolto un pasto**~~ — **risolta dalla review
  finale (I2, decisioni 108–110)**: Lista e Piano ascoltano `spesa:impostazioni-cambiate`. Il
  testo di prima, per la storia: **(Task 8, review di correttezza,
  punto 4).** Il Piano (o la Lista) sotto il pannello tiene in memoria le righe del pasto tolto
  finché non si rilegge; con la pagina piena delle Impostazioni il problema non c'era, perché si
  tornava al Piano ricaricandolo. La spec non lo dice. **Proposta:** un evento come
  `spesa:dispensa-cambiata` (per esempio `spesa:pasti-cambiati`) che il Piano e la Lista
  ascoltano, in un task a parte; oppure va bene la rilettura al ritorno, se toccare la riga di un
  pasto che non c'è più resta innocuo [ipotesi, non testato: non ho provato cosa fa il Piano su
  un `meal_slot` cancellato].

- **Da un piatto aperto dal Piano si torna su Piatti, non sul Piano (Task 11, decisione 79).**
  L'editor del piatto torna sempre a `/piatti` [misurato: `src/app/(app)/piatti/[id]/page.tsx`
  righe 396, 422, 434, 483, 1364], anche quando lo si è aperto dal Piano
  (`src/app/(app)/piano/page.tsx` riga 452). È così dalla fase 3; ora che Piatti non è nella
  barra, lì la pillola dice l'ultimo `da` salvato (o `IMPOSTAZIONI`), e per tornare al Piano
  serve un tocco in più [ipotesi, non provato nel browser]. **Proposta:** l'editor torna con
  `router.back()` quando la voce precedente è dell'app, oppure il Piano apre l'editor con un
  `?da=piano` che l'editor rispetta: un task a parte, perché tocca l'editor del piatto.

- **Le due spiegazioni che il frame 12 non mostra (Task 12, decisione 89 punto 5).** Il frame 12
  ha solo le etichette e i controlli; l'editor tiene sotto `CONFEZIONE` la nota di oggi sul
  formato (`Quanto ne vendono in una confezione. …`) e sotto `COME SI CONSUMA` la spiegazione
  della classe scelta (`src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx`, `STILE_NOTA`,
  `spiegaClasse`), perché nessuna funzione di oggi si perde (decisione 3). **Proposta:** restano:
  spiegano un concetto che l'utente non conosce (le classi di residuo) e il peso indicativo al
  banco. Se preferisci la pagina asciutta del frame, si tolgono in due righe.

Le domande qui sotto le avevano scritte le review dei Task 4, 8, 10 e 12 nel registro di lavoro
del controller; il Task 15 le riporta qui, così stanno tutte in un posto.

- **Il fuso di `cancella_dispensa()` (Task 4, review).** La funzione riporta a normali i pasti
  «dai pronti» con `data >= current_date`, e `current_date` è il giorno nel fuso del database.
  Al gate la prima query di «Da fare all'applicazione della 0015» lo controlla (`show timezone;`,
  atteso UTC). **Proposta:** va bene così, col controllo al gate. L'alternativa è fissare UTC
  dentro la SQL (`(now() at time zone 'utc')::date`): una riga, ma cambia la migrazione.
- **`TOGLI` su un pasto che nel frattempo è sparito chiude il dialogo senza dire niente (Task 8,
  decisione 50).** Succede solo se un salvataggio fallito, mentre il dialogo si apriva, ha
  riportato i pasti a quelli del server. **Proposta:** va bene così (il pasto non c'è più, e
  il dialogo chiuso lo mostra). Se vuoi una frase, serve un testo nuovo.
- **Il conteggio dei piatti da 0 a 1 per mano di un altro telefono (Task 8, review).** §L copre
  il conteggio vecchio di un piatto nel dialogo; non copre il caso in cui a schermo il pasto
  valeva 0 piatti (si toglie al tocco, senza dialogo) e intanto un altro telefono ci ha messo
  un piatto: quel piatto se ne va senza che nessuno l'abbia confermato. **Proposta:** va bene
  così, com'era con la pagina di prima; rileggere il repertorio a ogni ✕ costerebbe una lettura
  per tocco. (Che `salvaSlotDefs` cancellasse anche i pasti che il client non ha è risolto dalla
  review finale: I4, decisione 111.)
- **L'avvio del Marchio lascia passare i tocchi mentre è opaco (review finale, M3).** Per 1,2 s
  il livello dell'avvio copre la Lista col fondo pieno, ma non intercetta i tocchi (spec §J,
  `pointer-events: none`): un tocco in quel momento arriva alla Lista che non si vede.
  **Proposta:** va bene così — la spec §J lo vuole («Non ritarda niente»: l'avvio è un ornamento
  e non deve far aspettare). Se preferisci bloccarli, è una riga di CSS sul livello, per quei
  1,2 s.
- **Il salvataggio del file che fallisce dice «preparare» (Task 10, decisione 69).** Se
  `salvaFile` rigetta (raro: una condivisione fallita ripiega già sul download), compare
  `Non siamo riusciti a preparare il file. Riprova.`. **Proposta:** un testo proprio, per
  esempio `Non siamo riusciti a salvare il file. Riprova.` — da confermare, non l'ho scritto.
- **Dal piatto, il codice di un altro ingrediente (Task 12, review).** Nell'editor aperto da un
  piatto, scansionando il codice che è già di un altro ingrediente, `APRI {NOME}` apre
  quell'ingrediente; tornando al piatto, l'ingrediente aperto non viene aggiunto al piatto.
  **Proposta:** va bene così (`APRI` apre, non sostituisce); se vuoi che lo aggiunga, serve una
  regola nuova per il ritorno al piatto.
- **Il codice della casa letto come «immagine» (Task 10, decisione 74).** Lo screen reader
  annuncia il ruolo `img` insieme a `Codice della casa: K 7 M …`. **Proposta:** va bene così;
  l'alternativa è un testo nascosto compitato.

## I gate di Andrea, in ordine

1. **L'ok alla migrazione `supabase/migrations/0015_cadenza_e_dispensa.sql`**: la colonna
   `settings.giorni_controllo` e la funzione `cancella_dispensa()`.
2. **La migrazione applicata in produzione prima del merge**, con le query di controllo di
   «Task 4 › Da fare all'applicazione della 0015» (e il `max_rows` di PostgREST, «Non
   eseguiti»). Vercel pubblica da solo al merge su `main`, e il codice nuovo legge
   `giorni_controllo`. La migrazione è additiva: la colonna ha un default e la funzione è nuova,
   quindi il codice di oggi continua a funzionare con la migrazione applicata (spec §O).
   **Dopo averla applicata e prima del merge**, la prova che la colonna c'è:
   `select giorni_controllo from settings limit 1;` deve rispondere senza errore (review
   finale, I3).
   - **La 0015 non si toglie mai dopo il deploy**: il codice nuovo legge `giorni_controllo` e
     chiama `cancella_dispensa()`, e senza la colonna `leggiImpostazioni` fallisce, e con lei la
     Lista e il pannello (review finale, I3) [dal codice: la `select` di `leggiImpostazioni`
     nomina la colonna].
   - **Finché la 0015 non è applicata, le anteprime di Vercel del ramo sono rotte**: puntano al
     Supabase di produzione, dove la colonna non c'è ancora. Non è un difetto del ramo; non si
     provano le anteprime prima del punto 2 (review finale, I3).
3. **Il merge della PR**: va in produzione senza altri comandi. **Prima, la versione**: il piede
   del pannello (e il file di Esporta) dicono `version` di `package.json`, oggi `0.1.0`, scritta
   nel bundle a build (`src/components/pannello/versione.ts`); se al rilascio deve dire altro,
   si alza lì prima del merge (review finale, M5).
4. **Le prove dal telefono** della spec §M.4, una per una, più quelle della sezione «Non
   eseguiti» (il foglio di condivisione di Esporta, un logout D3 verificato dallo stare dentro
   su un secondo dispositivo, la tastiera sul campo `PERS`, il moto ridotto). **Cancella la
   dispensa solo su un account di prova, o dopo un Esporta.**

## Chiusura (Task 15)

**La copertura dei test vecchi, chiusa.** I 52 test delle due pagine vecchie (`P` 47, `R` 5)
hanno ognuno la sua coppia nella tabella «Migrazione dei test»: 52 test nuovi distinti, uno per
riga [misurato il 26/09: 52 titoli diversi nella colonna «Test nuovo» delle righe 1–52]. Lo
script dello Step 12 del Task 11, lanciato prima di cancellare i due file: `test vecchi: 52;
senza coppia valida nel registro: 0`, uscita 0 (decisione 80). Le righe 53–57 (Testata e
`utente.ts`) sono compilate. I test del pannello, oggi: 182 casi in `src/components/pannello`
[misurato il 26/09 con `npx vitest list src/components/pannello`].

**La verifica finale** [misurato il 26/09, a codice del Task 15 fermo]: `npx vitest run` 136 file
verdi e 1 saltato, **2019 test verdi e 1 saltato**; `npx tsc --noEmit`, `npm run lint`,
`npm run design:token` e `npm run build` puliti (i numeri precisi nel rapporto del Task 15).

**Tre note operative per chi viene dopo** (dalla sonda del Task 15):
1. **Le pagine vere dietro il proxy si provano con un Supabase finto da riga di comando.** Un
   server `node:http` di poche righe sulla porta 54321 risponde a `GET /auth/v1/user` (il
   `getUser` del proxy), alle letture di `/rest/v1/*` e alle RPC, con CORS aperto; nel browser
   un cookie `sb-localhost-auth-token=base64-{sessione in base64url}` con `expires_at` lontano
   fa passare il proxy su `/lista`, `/piatti` e l'editor. I finti dentro la pagina della sonda
   (quelli del piano) valgono solo finché quel modulo è caricato: dopo un caricamento pieno di
   un'altra pagina li sostituisce il server finto. Il server sta fuori dal repo.
2. **`history.length` si ferma a 50** in una scheda usata a lungo: la misura d si fa in una
   scheda nuova, e conviene leggere anche `navigation.entries()` e
   `navigation.currentEntry.index`, che dicono le voci per indirizzo.
3. **Col pannello del browser nascosto** le transizioni CSS restano a `currentTime` 0 e le
   promesse `finished` non si risolvono; `requestAnimationFrame` non parte (uno script che lo
   aspetta va in timeout). Per un punto d'arrivo: `animation.finish()` e poi i rettangoli; per
   un'attesa: `setTimeout`. Il movimento vero resta al telefono.

**Per la PR** (la apre chi coordina, dopo la review finale):

```markdown
## Fase 5 del ridisegno: le Impostazioni

Le Impostazioni diventano un pannello a due livelli montato nel Guscio, sopra qualunque pagina:
quattro tessere (Piatti, Importa un piano, Casa condivisa, Esporta i tuoi dati) e otto
sotto-schermate (Pasti a casa, Gestione dei pasti, Rotazione del piano, Ingredienti, Ordine
delle aree, Cadenza dei controlli, Casa, Esporta), con `?impostazioni=` e il gesto indietro.
La tab bar passa a tre voci (Piatti esce), l'editor dell'ingrediente prende il frame 12 con la
scansione, la striscia dei giorni regge sei pasti a 360, e all'apertura il Marchio vola
sull'icona della Lista.

Funzioni nuove: la cadenza dei controlli (30/60/90 giorni), Cancella la dispensa, Esporta i
tuoi dati in JSON, Esci. Migrazione `0015_cadenza_e_dispensa.sql` (additiva): **va applicata
in produzione prima del merge**.

Decisioni, misure nel browser e limiti: `docs/2026-09-25-fase5-decisioni-esecuzione.md`.

### Prove dal telefono (spec §M.4)
- [ ] aprire e chiudere il pannello da Lista, Piano e Dispensa, anche col gesto indietro
- [ ] Piatti dal pannello e ritorno
- [ ] un ingrediente dagli Ingredienti, SALVA e ritorno alla stessa altezza
- [ ] una scansione nell'editor
- [ ] Casa: creare un codice, COPIA
- [ ] Esporta e SALVA IL FILE (iOS e Android)
- [ ] cambiare la cadenza e guardare la Riga di controllo
- [ ] Cancella la dispensa: solo su un account di prova, o dopo un Esporta
- [ ] Esci e rientro col link
- [ ] il Piano a sei pasti su un Android da 360
- [ ] l'avvio all'apertura della PWA
- [ ] (dai «Non eseguiti») la tastiera sul campo PERS, e pannello e avvio col moto ridotto

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Task 3

**Cadenza: la lista si congela, l'[ipotesi] di §E.1 è falsa [misurato 25/09, `src/data/lista.ts`
e `piano/page.tsx`].** I controlli nascono solo in `generaListe`, che gira una volta per
settimana, alla conferma del Piano. `leggiListe` rilegge le righe congelate, e `allineaTopUp` non
aggiunge controlli. Quindi una cadenza cambiata vale dalla lista della prossima settimana
confermata; quella già creata non cambia. Il testo della spec §C.6, «vale dalla prossima lista
costruita», è vero alla lettera, e nessun testo dell'interfaccia promette altro. **Un effetto da
sapere:** l'etichetta `CONTROLLO OGNI …` segue subito l'impostazione (arriva da `leggiListe`),
mentre le righe di controllo già congelate sono state scelte con la cadenza di prima. Per
esempio, si passa da 3 mesi a 1 mese a metà settimana: le righe di questa settimana restano
quelle scelte a 90 giorni, ma dicono `CONTROLLO OGNI MESE`. Scelta accettata: l'etichetta dice la
regola in vigore, e la differenza dura al più fino alla prossima conferma. Se la si volesse
congelare, servirebbe una colonna in `shopping_list`: non vale una migrazione.

Le quattro letture di codice dietro l'esito, tutte confermate rileggendo il codice del ramo
`fase5-impostazioni` (non `feb4551`, ma nessuna delle quattro è cambiata dai Task 1-2):
1. `generaListe` (`src/data/lista.ts`) chiama `costruisciLista` una volta sola e scrive le righe
   in `shopping_list_item`, controlli compresi (`origine: 'controllo'`, `confezioni: 0`).
2. `generaListe` ha un solo chiamante, `confermaEVaiLista` in `src/app/(app)/piano/page.tsx`, e
   solo su una settimana in `bozza` (`CONFERMA E CREA LA LISTA`) [misurato:
   `grep -rn "generaListe(" src --include="*.ts*" | grep -v __tests__`, due righe: la definizione
   e questa sola chiamata].
3. `leggiListe` ricostruisce le sezioni dalle righe congelate e non chiama `costruisciLista`.
4. `allineaTopUp`, chiamata dalla Lista a ogni apertura, chiama `costruisciLista` ma aggiunge solo
   voci del piano (`.flatMap((sezione) => sezione.voci)`), mai controlli.

**Le altre due voci del task, dichiarate qui come da piano:**
- **`src/data/lista.ts`:** `ListaSalvata.giorniControllo?` e il campo in `leggiListe`, per non
  fare una lettura in più — `leggiListe` chiama già `leggiImpostazioni()` per `ordineAree`, e
  `giorniControllo` viaggia accanto, facoltativo come lui (un'istantanea offline salvata prima
  della fase 5 non ce l'ha). La Lista e Lista fatta la leggono da lì, con
  `?? GIORNI_CONTROLLO_DEFAULT`.
- **I due testi di oggi che dicevano «90 giorni»** [misurato: `grep -rn "90 giorni" src`, prima di
  questo task] dicono la cadenza scelta (decisione di Andrea del 26/09): la frase di Lista fatta
  in questo task (`fraCadenza`, `lista/fatta/page.tsx`), e la nota della classe «a stima»
  nell'editor dell'ingrediente che il Task 12 renderà con `ogniCadenza` (fuori dallo scopo di
  questo task: la funzione è pronta in `pantry.ts`, la nota resta «Ogni 90 giorni» finché il
  Task 12 non la tocca).

## Task 4

### Task 4, indagine

Il piano le aveva misurate il 25/09 su `feb4551`. Il Task 4 le ha rilette una per una sul ramo
`fase5-impostazioni` (`6287b4e`), prima di scrivere la SQL: reggono tutte e nove.

- **M1. Nessun pasto punta a un lotto** [misurato, `supabase/migrations/0009_meal_prepping.sql`].
  Il legame va dal lotto al pasto: `porzione_pronta.meal_slot_id references meal_slot(id) on
  delete set null`, `unique (meal_slot_id)`. `meal_slot` non ha colonne verso `porzione_pronta`
  (la 0009 le aggiunge solo `porzioni_preparate` e `da_pronti`). Cancellare i lotti non rompe
  nessun vincolo di `meal_slot`.
- **M2. `da_pronti = true` vuol dire «la porzione è già stata presa»** [misurato,
  `src/data/settimana.ts` `aggiornaSlot`; `src/domain/pronti.ts` `fattoreConsumo`]. Quando si
  accende, il gate FIFO trova il lotto utilizzabile più vecchio dello stesso piatto, e dopo le
  scritture sul pasto lo scala (`porzioni - 1`, o delete a 1). Il pasto non ricorda da quale
  lotto. `fattoreConsumo` dà 0 crudo (`stato === 'casa' && !daPronti ? 1 : 0`): la lista non
  compra niente per lui.
- **M3. Spegnere `da_pronti` restituisce la porzione** [misurato, `aggiornaSlot`, blocco «daPronti
  che si spegne»]. Va al lotto utilizzabile più recente del piatto; se non ce n'è nessuno,
  `insert` di un lotto nuovo da 1, `preparata_il` = la data del pasto, `meal_slot_id` null.
- **M4. `porzioni_preparate = N > 0` produce un lotto, non lo consuma** [misurato, `aggiornaSlot`,
  blocco «I Pronti»]. Crea o aggiorna il lotto legato (`meal_slot_id` = il pasto, `preparata_il`
  = `attuale.data`, `porzioni = N`). Se N cambia e il lotto legato non c'è più, lo ricrea intero
  (`insert … porzioni: porzioniPreparateDopo`). `fattoreConsumo` somma N qualunque sia lo stato.
- **M5. Un lotto con `preparata_il` futura è una cottura pianificata** [misurato,
  `porzioniUtilizzabili`: `if (lotto.preparataIl > oggi) return lotto.porzioni`]. La Dispensa li
  legge tutti con `leggiPronti` e li mostra fra i Pronti.
- **M6. `week.stato = 'chiusa'` non vuol dire «settimana passata»** [misurato, `src/data/lista.ts`
  `chiudiSpesa`: guarda solo `week.stato`, mai la data]. Chiude la settimana quando si tocca
  `HAI PRESO TUTTO`; che succeda di solito il lunedì è [ipotesi dall'uso]. Il filtro giusto per i
  pasti che devono ancora succedere è la data del pasto.
- **M7. Il ledger degli storni** [misurato, `aggiornaSlot`, blocco «Il ledger degli storni»]. Da
  `confermata` in poi (`if (week.stato === 'bozza') return`), ogni `aggiornaSlot` che cambia il
  consumo scrive `deltaStorno(prima, dopo)` in `meal_slot_storno` e lo applica a `pantry_state`.
  Un `update` SQL su `meal_slot` non passa da lì.
- **M8. `chiudiSpesa` scrive il residuo in assoluto, dai numeri congelati** [misurato,
  `chiudiSpesa` e `src/domain/chiusura.ts` `calcolaChiusura`]. `residuo = nuovoResiduo(residuo
  di shopping_list_item, comprato, fabbisogno) + storni della settimana`, in upsert su
  `pantry_state`. Il residuo congelato è quello di `leggiDispensa()` al momento di `generaListe`
  (e di `allineaTopUp` per le voci che aggiunge).
- **M9. Le policy di casa** [misurato, `supabase/migrations/0012_casa.sql`]. Il ciclo su
  `information_schema.columns` cancella tutte le policy di ogni tabella con `user_id` e crea
  `<tabella>_casa for all to authenticated using (user_id = (select casa_id())) with check (…)`.
  Vale per `pantry_state`, `porzione_pronta` (la sua policy della 0009 cade), `meal_slot`,
  `shopping_list_item`, `shopping_list` e `week`. `casa_id()` è `stable security definer`, e dà
  il proprietario a un membro e sé stesso agli altri. Nessuna migrazione revoca `update`/`delete`
  su queste tabelle ad `authenticated` [misurato: `grep -n "revoke\|grant" supabase/migrations/*.sql`,
  le sole revoche toccano `import_uso`, `casa_membro`, `casa_invito` e le funzioni].

**Le conseguenze per la spec:**
- **C1.** Con i soli due `delete`, un pasto di oggi o dopo con `da_pronti = true` resta «dai
  pronti» senza porzione (M2): la lista non lo compra. Spegnerlo dal Piano creerebbe un lotto
  fantasma da 1 (M3). Serve un `update` di `meal_slot`.
- **C2.** Un pasto passato con `da_pronti = true` è una porzione già mangiata: riportarlo a
  normale falserebbe il ledger (M7). Segnarlo poi `fuori` calcolerebbe `prima` = 1 porzione cruda
  e accrediterebbe ingredienti mai consumati. I pasti passati non si toccano.
- **C3.** `porzioni_preparate` è il piano, non dipende dai lotti (M4): non si tocca. Restano due
  effetti, fra i limiti qui sotto.
- **C4.** Le liste già create e non chiuse tengono il residuo di prima (M8), e `chiudiSpesa` lo
  riscrive in `pantry_state`: la dispensa cancellata risorge in parte. Esempio: riso congelato
  con 500 g in casa, servono 820, si compra 1000. Dopo la chiusura il residuo vale 680 (500 +
  1000 − 820), invece di 180 (0 + 1000 − 820).
- **C5, trovata e corretta nel Task 4 (non era nel piano)** [misurato, `src/data/dispensa.ts`
  `rispondiControllo`]. Il «no» a un controllo leggeva `pantry_state.residuo` con `.single()`.
  Prima della fase 5 una riga di controllo aveva sempre la sua riga di dispensa: `serveControllo`
  torna `false` senza `ultimoAcquisto`, e l'acquisto passa da `pantry_state`. Dopo la
  cancellazione, le righe di controllo della lista aperta restano, ma la riga di dispensa non c'è
  più: `.single()` con zero righe torna errore, e la Lista mostrava «Non siamo riusciti a salvare
  la risposta. Riprova.» a ogni tentativo.
  - **Correzione (decisione del controller):** la lettura passa a `.maybeSingle()`, e senza riga
    il residuo vale 0, come lo legge la Dispensa.
  - Il «no» non scrive su `pantry_state`: scrive solo l'upsert della voce in lista, che l'assenza
    della riga non tocca. La riga la ricrea `chiudiSpesa` (upsert) se la voce viene comprata.
  - **Il «sì» resta un `update` di `ultimo_check`:** senza riga tocca zero righe e non dà errore.
    Un upsert creerebbe una riga «residuo 0, mai comprato» che non dice niente di più.
    `ultimo_check` conta solo accanto a un `ultimo_acquisto` (`serveControllo` torna `false`
    senza), e l'acquisto che ricrea la riga è più recente del «sì».
  - Test: `src/data/__tests__/dispensa.test.ts` › `"no" riesce anche senza la riga di dispensa
    (dopo Cancella la dispensa): il residuo vale 0`. Falliva prima della correzione con l'errore
    PGRST116 di `.single()`.
- **La Dispensa e l'evento durante il primo caricamento (corretta nel Task 4, decisione del
  controller).** Nel codice del piano, l'evento chiamava sempre la rilettura silenziosa. Se
  arrivava col primo caricamento in volo, quello si scartava; se poi la rilettura falliva o non
  rispondeva, la pagina restava su `CARICO…` per sempre. Ora, finché la pagina non ha dati,
  l'evento ricarica con `leggi`: si applicano la sua attesa di 8 s e il suo stato d'errore con
  `RIPROVA`. Test: due `it` in `dispensa/__tests__/page.test.tsx` › «la cancellazione dal
  pannello».

### Task 4, decisioni di Andrea

> **D1 = A (Andrea, 26/09).** `cancella_dispensa()` riporta a pasti normali quelli «dai pronti» di oggi e dei giorni dopo (`data >= current_date`); i pasti passati restano come sono. Conseguenza accettata: nelle settimane già confermate l'`update` non passa dal ledger degli storni, e dopo la spesa il residuo sovrastima di una porzione cruda per pasto ritoccato. Si corregge dalla Dispensa.

> **D2 = A (Andrea, 26/09).** `cancella_dispensa()` azzera `shopping_list_item.residuo` nelle liste delle settimane non chiuse: `shopping_list_item.residuo` tiene una copia congelata della dispensa, e senza l'azzeramento `chiudiSpesa` la riscriverebbe in `pantry_state`. Conseguenza accettata: le confezioni della lista aperta restano quelle calcolate sul residuo di prima; gli ingredienti che il residuo copriva del tutto li aggiunge `allineaTopUp` alla prossima apertura della Lista.

### Task 4, limiti noti (da portare in spec §L col Task 15)

- **C3(a).** Una cottura pianificata per domani o dopo perde il suo lotto: dopo la cottura le
  porzioni non compaiono in Dispensa finché N non si cambia dal Piano.
- **C3(b).** Cambiare N su un pasto che aveva il lotto prima della cancellazione lo ricrea intero
  (M4), non solo con la differenza.
- **D1-A.** Nelle settimane già `confermata`/`chiusa`, il residuo dopo la spesa sovrastima di una
  porzione cruda per pasto ritoccato: l'`update` non scrive il ledger (M7). Si corregge dalla
  Dispensa.
- **D2-A.** Le confezioni della lista aperta restano quelle calcolate sul residuo di prima: la
  Lista può chiedere meno del necessario, e lo mostra nei numeri («in casa 0»).
- **Piano e Lista aperti sotto il pannello non si rileggono.** Solo la Dispensa ascolta
  `spesa:dispensa-cambiata`, come dice la spec. Con D1 il Piano mostra `Porzione pronta` su un
  pasto che non lo è più; con D2 la Lista mostra ancora «in casa …», finché non si riaprono.
  Toccare quel pasto dal Piano è innocuo: `aggiornaSlot` rilegge la riga (`attuale.daPronti` è
  già `false`), quindi niente restituzione e niente lotto fantasma.

### Da fare all'applicazione della 0015

La SQL di `cancella_dispensa()` **non è stata eseguita** [misurato 26/09: su questa macchina non ci
sono `psql`, `postgres`, `supabase` CLI né `docker`]. Il controllo fatto è a mano (rapporto del
Task 4). Chi applica la migrazione lancia queste query, e scrive qui quale prova ha fatto e il suo
esito:

```sql
-- 1. Il fuso del database: current_date deve essere il giorno UTC dell'app (D1).
show timezone;  -- atteso: UTC

-- 2. Le policy di casa sulle quattro tabelle che la funzione tocca (M9).
select tablename, policyname, cmd, qual
  from pg_policies
 where schemaname = 'public'
   and tablename in ('pantry_state', 'porzione_pronta', 'meal_slot', 'shopping_list_item')
 order by tablename;
-- atteso: una riga per tabella, <tabella>_casa, cmd ALL, qual (user_id = ( SELECT casa_id() AS casa_id))

-- 3. La funzione, provata come un utente vero e annullata: nessun dato cambia.
--    <id> è l'id di un ACCOUNT DI PROVA (spec §M.4), non quello di Andrea.
begin;
  select set_config('request.jwt.claims', '{"sub":"<id>","role":"authenticated"}', true);
  set local role authenticated;
  select public.cancella_dispensa();
  select count(*) as dispensa from pantry_state;                         -- atteso: 0
  select count(*) as pronti from porzione_pronta;                        -- atteso: 0
  select count(*) as dai_pronti from meal_slot
   where da_pronti and data >= current_date;                             -- atteso: 0
rollback;
```

La terza prova lavora sulle righe visibili a quell'utente, cioè la RLS in azione. In alternativa,
la stessa prova dal telefono su un account di prova dopo il merge (spec §M.4).

**Applicata in produzione il 26/09, con l'ok di Andrea** (Supabase MCP, versione
`20260926060439`). Esito delle prove [misurato 26/09]:
1. `show timezone;` → `UTC`, prima di applicare.
2. Policy `<tabella>_casa`, `ALL`, `user_id = (select casa_id())` su `meal_slot`,
   `pantry_state`, `porzione_pronta`, `shopping_list_item` e `settings`, prima di applicare.
3. Dopo: `settings.giorni_controllo` c'è, le 2 righe valgono 90; `cancella_dispensa()` è
   `security invoker` con `search_path=public`, `execute` negato ad `anon` e concesso ad
   `authenticated`.
4. La funzione eseguita come l'account senza dati (`73da9997…`, 0 righe in dispensa) dentro
   `begin … rollback`: gira senza errori, e nella stessa transazione le dispense delle altre
   due case restano 92 e 76 righe. Dopo il rollback, conteggi identici. Non è stata provata
   su una casa con dati (nessun account di prova ne ha): la prova vera resta quella dal
   telefono su un account di prova (§M.4).

## Task 5

### Task 5, indagine

- **Il tetto di PostgREST e le pagine.** `leggiTutteLeSettimane` (`src/data/settimana.ts`) legge
  `week` in una query e `meal_slot` a pagine con `.range()`, finché una pagina torna vuota: 2 + N
  query invece di 2. PostgREST su Supabase taglia ogni risposta a un massimo di righe (1000 di
  default **[ipotesi: il valore di questo progetto non è misurato]**), e `meal_slot` cresce di
  21-42 righe a settimana (3-6 pasti per 7 giorni): con 6 pasti, 1000 righe sono 24 settimane. Due
  query secche darebbero un file **troncato in silenzio** dopo sei mesi d'uso. La funzione va
  avanti di quante righe riceve davvero (non di quante ne ha chieste), e regge quindi anche un
  `max_rows` più basso della pagina — provato nei test con un tetto finto a 500. **Da verificare
  al gate:** il `max_rows` vero del progetto (Dashboard → Settings → API, o
  `select current_setting('pgrst.db_max_rows', true);`), riportato sopra fra i «Non eseguiti».
- **Esci (misura 2, D3 e D4).** Le righe di decisione sono qui sotto, in «Task 5, decisioni di
  Andrea». La spec §E.4 le riporta già (aggiornata il 26/09).
- **I Pronti nel file** sono `LottoPronto[]` da `leggiPronti()` (misura 3), decaduti compresi:
  nessuna funzione nuova, la stessa che legge già la Dispensa. **I piatti** nel file sono invece
  solo quelli attivi (`leggiRepertorio()`): un pasto del piano esportato può citare un `dishId` di
  un piatto disattivato che nel file non compare. Domanda per Andrea più sotto: se questo va bene.
- **`leggiPronti`, `leggiIngredienti` e `leggiDispensa` non sono paginate.** Solo
  `leggiTutteLeSettimane` legge a pagine (`meal_slot` è la tabella che cresce nel tempo, una riga
  per pasto per giorno). I lotti dei Pronti, gli ingredienti del repertorio e le righe di
  `pantry_state` sono oggi lontani dal migliaio di righe per una casa qualunque **[ipotesi]**, ma
  restano soggetti allo stesso tetto di PostgREST: se in futuro uno di questi volumi lo
  avvicinasse, il file uscirebbe troncato in silenzio come `meal_slot` lo sarebbe stato senza
  paginazione. Non paginate in questo task perché la spec non lo chiede e il volume di oggi non lo
  giustifica; da riconsiderare se i volumi cambiano.
- **Il nome del file usa il giorno locale di chi esporta**, non quello UTC del resto dei dati
  (`giornoLocale` in `src/data/esporta.ts`): a mezzanotte e mezza in Italia il file esportato è
  già del giorno dopo secondo l'orologio del telefono, e il nome deve dirlo a chi lo legge.
  Provato con `TZ=Europe/Rome npx vitest run src/data/__tests__/esporta.test.ts` (5 verdi), oltre
  che in CI (UTC), dove il test non distingue i due fusi ma non fallisce.
- **La revoca dell'URL dopo 40 s** in `salvaFile`/`scarica` (`src/components/salva-file.ts`)
  **[ipotesi sul valore]**: il margine usato dalle librerie di download (FileSaver.js) per non
  interrompere il download in alcuni browser se si revoca subito. Il file di Esporta pesa meno di
  un megabyte: tenerlo vivo 40 s in memoria non costa.
- **La versione (misura 4).** `next.config.ts` importa `package.json` e scrive
  `env: { NEXT_PUBLIC_VERSIONE: pacchetto.version }`; `src/components/pannello/versione.ts` legge
  `process.env.NEXT_PUBLIC_VERSIONE ?? '0.0.0'`. Misurato il 25/09 con una build di prova in una
  copia del repo: il bundle client porta il valore letterale (`"Versione 0.1.0"`), non la
  variabile. Il Task 11 lo riconferma dopo che il Task 7 monta il piede
  (`grep -rho 'Versione [0-9.]*' .next/static | head -1`).

### Task 5, decisioni di Andrea

> **D3 = A (Andrea, 26/09).** `esci()` chiama `signOut({ scope: 'local' })`: esce da questo
> telefono, non dagli altri dispositivi dell'account. Lancia solo se dopo l'errore la sessione c'è
> ancora: `signOut` di auth-js 2.112.4 cancella la sessione locale anche quando il server fallisce
> [misurato in `GoTrueClient._signOut`, righe 3412-3443].

> **D4 (confermata da Andrea, 26/09).** Se la condivisione del file fallisce per un motivo diverso
> dall'annullo, `salvaFile` scarica il file.

### Task 5, verifica

`npx vitest run` (suite intera): **1801 verdi, 1 saltato** [misurato 26/09; una seconda esecuzione
della stessa suite, senza toccare codice, ha dato prima 1800/1 con un fallimento isolato in
`src/app/(app)/dispensa/__tests__/widget-ai.test.tsx` (focus del `role="status"` del widget AI) —
file non toccato da questo task, verde da solo e verde nella riesecuzione: flakiness preesistente,
non di questo task]. `npx tsc --noEmit` e `npm run lint` puliti. Il test del nome del file passa
sia con `TZ=Europe/Rome` sia in CI (`TZ=UTC` implicito).

## Task 12

### Task 12, censimento dei test dell'editor

Il file è `src/app/(app)/piatti/[id]/ingredienti/[ingId]/__tests__/page.test.tsx`. Prima: 20
test, tutti in `Ingrediente (editor)` (16) e `Ingrediente (editor) › prezzo di una confezione`
(4). Dopo: **37 casi** (35 `it` più i due dell'`it.each` della cadenza), 37 verdi
[misurato 26/09, `npx vitest run "src/app/(app)/piatti/[id]/ingredienti"`, stderr pulito].
Dopo la review: **44 casi**, 44 verdi in tre esecuzioni [misurato 26/09]: in più i due del
segnale (decisione 96), i due dell'unità (decisione 93), i due della lettura scartata
(decisione 94) e quello del gesto indietro col dialogo in volo (decisione 95); «ELIMINA in
coda…» controlla anche `go(-1)` prima della push.
I describe nuovi sono `Ingrediente (editor): i campi`, `…: il ritorno (spec fase 5 §F)`,
`…: la scansione (spec fase 5 §F.1)`, `…: ELIMINA (spec fase 5 §F)` e `…: prezzo di una
confezione`. Tutti montano la pagina con `rendi()` (Dock nello slot, `BarraProvider`) e
premono `SALVA` al posto di `SALVA INGREDIENTE`.

| # | Test di prima | Test di dopo | Come |
|---|---|---|---|
| 1 | creazione: il salvataggio è bloccato finché mancano nome, area e formato | i campi › creazione: il salvataggio è bloccato finché mancano nome, area e formato | uguale, col tasto `SALVA` |
| 2 | scegliendo INTERO l'unità passa a PZ e il formato si blocca a 1 | i campi › scegliendo INTERO l'unità passa a PZ e il formato si blocca a 1 | uguale |
| 3 | con INTERO il segmento unità è disabilitato: cliccare G non lo riattiva, PZ resta l'unica scelta | i campi › con INTERO il segmento unità è disabilitato: cliccare G non lo riattiva, PZ resta l'unica scelta | uguale |
| 4 | il segmento unità torna cliccabile appena la classe non è più INTERO | i campi › il segmento unità torna cliccabile appena la classe non è più INTERO | uguale |
| 5 | il guardiano in salva() corregge unità e formato anche per un ingrediente caricato già con la classe INTERO e un'unità diversa da PZ | i campi › stesso titolo | riscritto: prima una modifica al nome, perché SALVA pulito è spento |
| 6 | le tre spiegazioni della classe di residuo sono quelle di Ingrediente.dc.html | i campi › le tre spiegazioni della classe di residuo sono quelle di Ingrediente.dc.html, e «a stima» dice la cadenza | riscritto: «a stima» dice `Ogni 3 mesi`; più i nuovi «la spiegazione «a stima» dice la cadenza delle impostazioni, di default ogni 3 mesi», i due casi a 30 e 60 giorni e «se le impostazioni non si leggono la nota dice ogni 3 mesi, e l'editor funziona» |
| 7 | l'etichetta sotto l'interruttore deperibile segue lo stato: quanto dura dipende dal reparto di default (deperibile), il residuo non scade quando disattivato | i campi › Fresco al posto di Deperibile: SÌ / NO, e la sottoriga segue lo stato | riscritto sul `NO` del gruppo `Fresco` |
| 8 | salva chiama salvaIngrediente con i valori scelti (deperibile true di default) e torna al piatto | i campi › salva chiama salvaIngrediente con i valori scelti (fresco di default) e torna al piatto | uguale, col tasto `SALVA`, e senza la chiave `ean` |
| 9 | modifica: carica le proprietà dell'ingrediente esistente | i campi › modifica: carica le proprietà, e SALVA resta spento finché niente cambia (§F) | riscritto: `SALVA` spento finché niente cambia, acceso a una modifica, di nuovo spento tornando al valore di prima |
| 10 | un ingId sconosciuto mostra un messaggio invece di un modulo vuoto | i campi › un ingId sconosciuto mostra un messaggio invece di un modulo vuoto, e niente Dock | uguale, più: niente Dock |
| 11 | il cestino su un ingrediente nuovo torna al piatto senza chiedere conferma né eliminare nulla | ELIMINA › su un ingrediente nuovo ELIMINA non c'è: la freccia fa quel lavoro | sostituito (§F); il ritorno al piatto della freccia sta in «il ritorno › senza torna la freccia si chiama Torna al piatto e porta al piatto» |
| 12 | il cestino su un ingrediente esistente chiede conferma, poi elimina (hard delete) e torna al piatto | ELIMINA › ELIMINA in coda chiede conferma nel dialogo, poi elimina e torna al piatto | riscritto su `ELIMINA` in coda e sull'`alertdialog`; più: il velo non chiude |
| 13 | un ingrediente con acquisti registrati avvisa che lo storico va perso, per via della on delete cascade su purchase | ELIMINA › stesso titolo | uguale, aperto da `Elimina ingrediente`, il testo dentro l'`alertdialog` |
| 14 | se non si riesce a sapere se ci sono acquisti, il fail-safe assume di sì (Important 3): un errore di rete non fa sparire l'avviso | ELIMINA › stesso titolo | uguale, aperto da `Elimina ingrediente`, il testo dentro l'`alertdialog` |
| 15 | ANNULLA nella conferma chiude il dialogo senza eliminare | ELIMINA › ANNULLA nella conferma chiude il dialogo senza eliminare | uguale, dentro l'`alertdialog` |
| 16 | un ingrediente ancora in uso mostra il motivo del blocco, non un errore Postgres grezzo | ELIMINA › un ingrediente ancora in uso: il dialogo si chiude e il motivo resta sotto ELIMINA | uguale nella sostanza; più il nuovo «un errore qualunque resta nel dialogo, che non si chiude» (decisione 87) |
| 17 | modifica: mostra il prezzo esistente con la virgola decimale (2.5 → "2,5") | prezzo di una confezione › stesso titolo | uguale |
| 18 | campo vuoto: salva prezzoConfezione null, anche su un ingrediente che un prezzo ce l'aveva | prezzo di una confezione › stesso titolo | uguale, col tasto `SALVA` |
| 19 | "2,5" con la virgola si salva come 2.5 | prezzo di una confezione › stesso titolo | uguale, col tasto `SALVA` |
| 20 | un prezzo compilato ma non positivo ("0") o non numerico ("abc") blocca il salvataggio, come il formato non valido | prezzo di una confezione › stesso titolo | la prima attesa diventa `toBeDisabled()`: SALVA pulito è spento |

I 17 casi nuovi, oltre a quelli già nominati nella tabella: «le etichette del frame 12 e la nota
di oggi in fondo; ANNULLA non c'è più», «in volo SALVA dice SALVATAGGIO… a 0,5; se fallisce
l'errore sta sopra il Dock e SALVA torna», «la tab bar è nascosta: il Dock ha dock-senza-barra»,
i quattro del ritorno (freccia e SALVA con `torna=impostazioni`, la freccia senza `torna`, la
freccia che perde le modifiche senza chiedere) e i cinque della scansione (il catalogo dà la
confezione, prodotto sconosciuto, il codice di Tonno con `APRI TONNO`, `NON È QUESTA`, la
sessione scaduta). Il test del difetto di oggi, «con torna=impostazioni la freccia torna al
pannello sugli Ingredienti, non a /piatti/nuovo (il difetto di oggi)», era rosso prima del
codice: `Unable to find an accessible element with the role "button" and name "Torna agli
ingredienti"`, perché la freccia era un `<Link href="/piatti/nuovo">` senza nome [misurato 26/09].

### Task 12, verifica

- `npx vitest run src/components/__tests__/dock.test.tsx`: 6 verdi; il primo dei due nuovi
  era rosso prima di `Dock.tsx` (`dock anim-dock` senza `dock-senza-barra`) [misurato 26/09].
- `npx vitest run src/components/__tests__/dock.test.tsx "src/app/(app)/dispensa" "src/app/(app)/piatti"`:
  346 verdi in tre esecuzioni su quattro. Nella prima è caduto una volta «Dispensa: il gesto
  indietro › ELIMINA dal dialogo (2 → 0) chiama go(-2) una volta» di
  `dispensa/__tests__/page.test.tsx`, file che questo task non tocca: verde da solo quattro
  volte su quattro e verde nelle tre riesecuzioni [misurato 26/09]. La Dispensa non nasconde
  la barra, quindi il suo `<Dock sciolto>` non prende `dock-senza-barra`. Flakiness di tempi
  sotto carico, non di questo task [ipotesi].
- `npx tsc --noEmit`, `npm run lint`, `npm run design:token` (11 verdi): puliti.
- `npx vitest run` (suite intera, prima del commit): **1983 verdi, 1 saltato**, 135 file verdi e 1
  saltato [misurato 26/09].

### Task 12, correzioni della review

- Rossi prima della correzione, verdi dopo [misurato 26/09]: «esistente in g e catalogo in ml:
  unità e formato restano, il messaggio lo dice, SALVA manda l'ean (review del Task 12, I1)»
  (non trovava `Unità diversa (ml contro g): …`), «chiuso il foglio mentre il catalogo risponde,
  l'esito si scarta» (formato 400 invece di 500), «chiuso il foglio mentre si legge l'elenco, il
  codice di un altro si scarta» («Questo codice è di Tonno.» alla riapertura), «ELIMINA in coda
  chiede conferma nel dialogo, poi elimina e torna al piatto» (`go` chiamato 0 volte).
- Verdi già prima, perché provano un comportamento che c'era e non era controllato: i due del
  segnale, «un ingrediente nuovo prende dal catalogo formato e unità, anche in ml», e quello del
  gesto indietro col dialogo in volo.
- `npx vitest run` su editor, `dock.test.tsx` e `src/domain/__tests__/scansione-dispensa.test.ts`:
  59 verdi, tre esecuzioni, stderr pulito; `"src/app/(app)/dispensa" "src/app/(app)/piatti"`: 347
  verdi; `npx tsc --noEmit` e `npm run lint` puliti [misurato 26/09].

## Dopo la review finale (26/09)

La review di tutto il ramo (`f983c43..d967bae`) ha chiesto un'ondata sola di correzioni: I1, I2,
I4, M1, M2, M4b, M7. M3 resta com'è ed è fra le domande; M4a (`RIPROVA` sull'errore di
caricamento dell'ordine) non si fa, perché la spec non la prevede; I3 e M5 vanno fra i gate. Le
decisioni continuano la numerazione della tabella.

| # | Decisione | Perché | Costo se è sbagliata |
|---|---|---|---|
| 107 | **I1.** Nel test «il marchio segna mancante…» della Lista le due attese stanno in `await waitFor(...)` | il marchio si pubblica in un effetto dopo il render che mostra la lista; letto subito dopo `findByText` poteva essere vuoto [misurato: rosso 1 volta sulla suite intera prima della correzione, e 2 su 4 a `d967bae`; dopo, 10 su 10 verdi sul file da solo] | nessuno |
| 108 | **I2.** `EVENTO_IMPOSTAZIONI_CAMBIATE` (`spesa:impostazioni-cambiate`) sta in `src/components/pannello/eventi.ts`, non in `@/data/impostazioni`; lo pubblica `DatiPannello` dopo una scrittura riuscita **e** ultima (impostazioni: dopo la rilettura; pasti: dopo la scrittura), mai dopo un rollback, un rifiuto RLS o una richiesta superata. Lista e Piano ascoltano con `useRileggiDopoImpostazioni` (stesso file): una lettura alla volta, e chi arriva con una in volo ne chiede un'altra sola dopo | `@/data/impostazioni` è finto con una fabbrica esplicita in una ventina di file di test: con la costante lì, ogni finto avrebbe dovuto ripeterla per non far lanciare Vitest a chi la legge. Due salvataggi di fila con due letture in parallelo potrebbero chiudersi al contrario [misurato: i test dell'evento e di Lista e Piano, elencati sotto] | se l'ultima richiesta fallisce dopo che una superata è arrivata al server, la pagina sotto resta coi dati di prima fino alla riapertura |
| 109 | **I2, Lista.** Al segnale la Lista rifà il caricamento intero (`carica`: settimana, `allineaTopUp`, liste), non la sola `leggiListe` del ritorno in primo piano | prima della fase 5 tornare dalla pagina Impostazioni rimontava la Lista, e il caricamento intero riallineava il top-up a pasti, persone e rotazione nuovi; `leggiListe` da sola rileggerebbe solo ordine e cadenza. `carica` non azzera niente prima di leggere e scarta la risposta se nel frattempo c'è stato un tocco | un `allineaTopUp` (una scrittura) in più a ogni salvataggio del pannello; se `carica` fallisce senza istantanea compare l'errore di caricamento, come al montaggio |
| 110 | **I2, Piano.** Il Piano pubblica il suo `carica` in un ref e lo richiama con `silenziosa`: non cambia il giorno selezionato, non mostra l'errore (lo scrive in console), e si scarta se nel frattempo un tocco ha cambiato il piano (`versioneTocchi`, sale in `aggiornaSlotLocale`) | il Piano sotto il pannello non si rimonta; un errore di rete su una rilettura di cortesia non deve sostituire il piano con la schermata d'errore | con un tocco durante la rilettura il Piano resta coi dati di prima fino alla riapertura (in spec §L) |
| 111 | **I4.** `salvaSlotDefs(defs, { soloTolti })`: con `soloTolti` cancella solo quegli id (se non sono tornati nell'elenco) e non legge il server; senza, la semantica di sempre. Il pannello passa gli id che conosceva, **a schermo o confermati** (`pastiSalvati`), meno quelli del nuovo elenco. Semina di `leggiNucleo` e `assicuraDatiIniziali` restano senza (gli unici altri chiamanti, `grep salvaSlotDefs`) | un parametro e non una funzione a parte: il vincolo 3–6 e l'upsert restano in un posto solo, e il vincolo si controlla sempre per primo. Lo schermo copre un pasto aggiunto e tolto prima che la sua scrittura arrivi; i confermati coprono un pasto tolto da una scrittura fallita mentre la successiva era già in fila [misurato: 7 test nuovi fra `impostazioni.test.ts` e `dati-pannello.test.tsx`, 4 rossi prima; con lo schermo soltanto il test della scrittura fallita è rosso] | con `soloTolti` il server può avere più di sei pasti (sei a schermo più quello dell'altro membro): il vincolo è sull'elenco del client, e la colonna non ha un tetto |
| 112 | **M1.** `carica` scarta la lettura (`superata`) se è partita una scrittura mentre era in volo (`scritture`, un contatore che sale all'inizio di `salvaImpostazioni` e `salvaPasti`) | la fila da sola non bastava: una scrittura partita dopo l'attesa della fila correva insieme alla lettura, che poteva tornare dopo coi valori di prima, metterli a schermo e prenderli come confermati [misurato: il test nuovo era rosso, «Porzioni: 2» sostituito da 1] | una riapertura con un gesto subito dopo tiene casa e risparmio della lettura precedente fino alla prossima apertura |
| 113 | **M2.** `PannelloProvider attendiPrimoAvvio` (lo passa il Guscio): `?impostazioni=` si legge solo dopo `primoAvvioFinito()`, che `PrimoAvvio` chiama quando apre il cancello; fino ad allora il parametro resta nell'indirizzo. Senza la prop (i test che montano il pannello da solo) si legge subito, come prima | un segnale nel contesto interno del pannello, perché `PrimoAvvio` sta dentro il Guscio e non aveva un modo di dire che aveva finito; spostare il cancello attorno al Guscio avrebbe cambiato l'avvio del Marchio (§J) [misurato: 2 test nuovi, rossi prima] | il cancello si apre anche per timeout (4 s): con una semina più lenta il pannello può ancora correrle accanto (in spec §L) |
| 114 | **M4b.** `OrdineAree` azzera l'ordine locale quando `casaCambiata` diventa vero, aggiustato durante il render come `GestionePasti` | l'azzeramento c'era già per un'altra strada: dopo un rifiuto RLS `salvaImpostazioni` torna `true` e `if (ok) setOrdine(null)`. Il test nuovo è **verde anche prima** della correzione [misurato]; è rosso solo togliendo tutti e due gli azzeramenti. La correzione toglie la dipendenza dal contratto di ritorno | nessuno |
| 115 | **M7.** La `replaceState` che toglie `?impostazioni=` toglie solo quel parametro: gli altri e l'ancora restano; lo stato della voce resta `window.history.state` | un indirizzo `/lista?da=…&impostazioni=cima` perdeva `da` [misurato: il test nuovo era rosso] | nessuno |

**Test nuovi, rossi e verdi** [misurato il 26/09]:
- rossi prima, verdi dopo: 2 in `src/data/__tests__/impostazioni.test.ts` (soloTolti), 5 in
  `dati-pannello.test.tsx` (evento dopo impostazioni, superata, pasti; soloTolti; M1) più 1
  aggiunto dopo (la scrittura fallita in fila), 1 in `lista/__tests__/page.test.tsx` (cadenza
  nuova dopo l'evento), 3 in `piano/__tests__/page.test.tsx`, 2 in `pannello.test.tsx` (M7, M2),
  1 in `guscio.test.tsx` (M2, rosso togliendo `attendiPrimoAvvio`);
- verdi già prima, perché provano un confine che il codice di prima rispettava da sé: semantica
  di sempre senza soloTolti, id ancora nell'elenco, vincolo 3–6 con soloTolti, rollback e RLS
  senza evento, Lista e Piano smontati che non ascoltano, tre salvataggi che fanno due
  caricamenti, il pannello senza `PrimoAvvio` che apre subito, M4b (decisione 114);
- cinque asserzioni di `gestione-pasti.test.tsx` e `pasti-a-casa.test.tsx` prendono il secondo
  argomento (`{ soloTolti: [...] }`); la semina di `leggiNucleo` controlla di non passarlo.

**Test intermittenti** [misurato il 26/09]: il file della Lista da solo 10 volte su 10 verde. La
suite intera 6 volte: 4 verdi, 2 con un test rosso in `gestione-pasti.test.tsx` («con il
repertorio non ancora letto, la ✕ lo rilegge e poi decide» e «la rilettura della ✕ che arriva
dopo un rifiuto RLS…», tutti e due a 1 s, il tempo di `waitFor`). Lo stesso file è rosso anche a
`d967bae` (1 volta su 4 sulla suite intera, «la lettura del repertorio al montaggio che arriva
dopo un rifiuto RLS…»): non viene da questa ondata. Da solo sul ramo 1 volta su 50, a `d967bae` 0
su 50. La causa non è indagata [ipotesi: tempi sotto carico, come i due di «Rimasto aperto»].

**Correzione dell'intermittenza di `gestione-pasti.test.tsx` (26/09, dopo la review).** Due
cause, non una sola [ipotesi]: (1) le catene asincrone più lunghe del file (✕ → lettura del
repertorio → `salvaPasti` → coda di scrittura → `salvaSlotDefs`; o rifiuto RLS → ricarica con 4
letture → render del `Pannello` intero) possono superare il secondo di `waitFor`/`findBy` sotto
il carico della suite intera, senza che ci sia un difetto; (2) `azzera()` in `aiuti.tsx` puliva i
finti con `vi.clearAllMocks()`, che in vitest 4 non svuota la coda dei
`mockResolvedValueOnce`/`mockReturnValueOnce`: un `Once` messo da un test e mai consumato (una
lettura tenuta apposta in sospeso) restava in coda e vinceva sulla prima chiamata del test dopo,
anche se `preparaDati` aveva già rimesso i default. Corretto: `configure({ asyncUtilTimeout: 3000
})` da `@testing-library/react` in cima a `gestione-pasti.test.tsx` (vitest isola i moduli per
file, quindi non tocca gli altri); e in `azzera()` un `mockReset()` sugli otto finti che
`preparaDati` reimposta comunque a ogni test (`leggiImpostazioni`, `salvaImpostazioni`,
`leggiSlotDefs`, `salvaSlotDefs`, `statoCasa`, `leggiRisparmioTotale`, `leggiRepertorio`,
`leggiIngredienti`), verificato sicuro perché `preparaDati` li sovrascrive comunque subito dopo
dentro `montaPannello`. Gli altri finti condivisi (`cancellaDispensa`, `esci`, `auth.*`,
`idCasa`, `creaInvito`, `preparaEsportazione`, `salvaFile`, …) restano fuori: non hanno un
equivalente di `preparaDati` che li reimposti a ogni test, quindi un `mockReset()` lì rischiava
di togliere il default cablato in `finti.ts` senza che nessuno lo rimettesse.
[Misurato 26/09]: `gestione-pasti.test.tsx` da solo, 30 esecuzioni: 1 fallimento su 30 (era 1 su
50 prima). L'unico caduto, «la rilettura della ✕ che arriva dopo un rifiuto RLS…», eseguito da
solo (`-t`) 20 volte: 0 su 20 — conferma che dipende dal carico della suite, non da un difetto
nuovo. `src/components/pannello` per intero, 1 esecuzione: 195 verdi. Suite intera
(`npx vitest run`), 6 esecuzioni: **0 fallimenti su 6** (2045 verdi, 1 saltato, invariati, in
ognuna). `npx tsc --noEmit` e `npm run lint` puliti. Il timeout a 3 s riduce la probabilità
dell'intermittenza ma non la esclude per costruzione (resta un limite di tempo, non una garanzia):
se dovesse ripresentarsi sotto carico più alto di questo, la causa resta quella di sopra.
