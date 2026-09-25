# Fase 4 del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 25/09/2026 · **Ramo:** `redesign/dispensa`, 19 commit da `cd74efb` in poi
[misurato con `git rev-list --count dbfb1ea..HEAD` dopo l'ultimo commit del ramo]: 15 di
esecuzione (`cd74efb`–`5bf2dc4`), il primo commit di questo documento (`e146ba2`), la
correzione dei tasti schiacciati (`6af1b63`) e i due del giro di correzione dopo la review
finale (codice, poi documenti)
**Piano:** `docs/superpowers/plans/2026-09-25-dispensa.md`
**Spec:** `docs/superpowers/specs/2026-09-25-dispensa-design.md`

L'esecuzione subagent-driven tiene il suo registro in `.superpowers/`, una cartella che git
ignora e che a fine lavoro viene cancellata. Questo file la sostituisce: raccoglie le decisioni
prese al posto di Andrea durante l'esecuzione, ognuna con quanto costa se è sbagliata, così
Andrea può rifare quelle che non gli tornano.

## Il dato di processo: i test del piano hanno retto, tre righe di prodotto no

Il piano avvertiva di nuovo che il suo codice di test era una bozza. I risultati
[fonte: il registro dell'esecuzione e i rapporti dei nove task con codice]:

- **Test del piano corretti: pochi, e di forma.** Nel Task 6 un test di `USA LA STIMA` usava un
  `rerender` che teneva aperta la riga: diviso in due `render`. Nel Task 7 i test di scansione e
  di Nuovo ingrediente sono stati scritti leggendo le firme vere (mock di `useLettoreCodici`, EAN
  diversi per scenario). Nel Task 4 zero correzioni.
- **Tre difetti nel codice di produzione del piano, fermati dalla review:**
  - Task 3: l'annulla della nota passava come «prima» il valore nuovo. Un «finito» annullato
    diventava un'entrata e scriveva un acquisto di oggi falso (decisione 3).
  - Task 7: il formato letto dallo scanner restava valido anche dopo un cambio d'unità, e un
    formato in g finiva etichettato ml (decisione 6).
  - Task 9: due lotti dello stesso piatto mostravano entrambi tutti gli impegni del piatto
    (decisione 9).
- **Un difetto che il piano non poteva vedere, trovato in review e misurato nel browser:** il
  velo del widget AI che si richiudeva sul click di un tocco breve dal Dock a barra ridotta
  (decisione 8). Nel browser la guardia regge (sotto, misura A).
- **Un difetto trovato solo dalla sonda nel browser**, sotto 812 px di altezza: i tasti alti 54
  in fondo ai fogli si schiacciavano invece di far scorrere il foglio. È descritto più sotto ed
  è **corretto** in `6af1b63` (decisione 14), senza rifare la misura nel browser.
- **Un difetto trovato dalla review finale del ramo:** dopo un `SALVA` fallito del residuo o
  delle porzioni, `RIPROVA` restava spento e il numero scritto spariva, perché il campo seguiva
  il ritorno a prima della pagina. I test dei pezzi non lo vedevano: montavano il campo da solo,
  senza la pagina che fa ottimistico e ritorno. Corretto nel giro finale (decisione 15), con due
  test sulla pagina vera.

## Le decisioni, con il loro costo

| # | Decisione | Perché | Costo se è sbagliata |
|---|---|---|---|
| 1 | `design/ridisegno/**` fra i `globalIgnores` di eslint (Task 1) | il runtime JS dei mockup di Claude Design rompeva il lint, e non è codice dell'app | un JS messo lì in futuro non passa dal lint |
| 2 | Corretto l'elenco delle forme piene in `DESIGN.md` §6 insieme alla «terza forma piena» (Task 1) | il piano cambiava la regola e non l'elenco; `DESIGN.md` deve dire una cosa sola | nessuno |
| 3 | L'annulla della nota riscrive il residuo con `prima = valoreAttuale`, non `valoreNuovo` come scriveva il piano (Task 3) | con `valoreNuovo` un «finito» annullato diventava un'entrata: `ultimo_acquisto` = oggi, e la stima di un fresco si allungava | annullare un «finito» non ripristina la data scritta a mano che il primo gesto aveva cancellato (limite dichiarato nel codice) |
| 4 | Nello stesso giro del Task 3 anche tre minor: validazione di `residuoPrima`, test degli errori di `aggiungiConfezione`, allineamento di §K della spec | costavano poco, e la validazione andava chiusa prima che `AGGIUNGI` avesse un chiamante | tre test e una riga di spec da togliere |
| 5 | `SALVA` a 0 porzioni sul lotto toglie il lotto dallo stato e chiude il foglio (deciso al Task 6, fatto nel 9) | `correggiLotto` a 0 cancella la riga sul server; il foglio resterebbe aperto su un lotto che non c'è | nessun dato perso: un foglio che si chiude |
| 6 | Il formato letto dallo scanner vale solo se l'unità scelta è quella letta; altrimenti il default di `predefinitiIngrediente` (Task 7) | il piano diceva di non azzerarlo, ma un formato in g etichettato ml è un dato sbagliato in silenzio | chi cambia unità dopo lo scan perde il formato letto e lo riscrive in Impostazioni |
| 7 | Un giro di rinforzo sul Task 8 con dieci minor: rete, `pointerId`, fuoco all'esito, tempo `aria-hidden`, niente `autoFocus` allo stop, `bottom` 114 in dettatura, click da screen reader, niente menu sul tenuto, misura della tastiera al montaggio, nome accessibile di riserva | decidono se il gate dal telefono passa, e costavano poco allora | un giro di lavoro in più, nessun rischio sui dati |
| 8 | Il velo del widget AI chiude solo se anche il `pointerdown` è partito sul velo (Task 9) | il click che segue un tocco breve sul microfono del Dock a barra ridotta cade sul velo, e il widget si richiudeva appena aperto | per chi usa la X nessuno; chi tocca il velo con un gesto anomalo (premuto fuori, rilasciato sul velo) deve ritoccarlo |
| 9 | Impegnate di un lotto = `min(porzioni, max(0, impegni del piatto − porzioni degli altri lotti vivi))`, in `impegnateLotto` di `src/domain/dispensa-vista.ts` (Task 9) | due lotti dello stesso piatto mostravano entrambi tutti gli impegni | con più lotti il dialogo avverte meno del dovuto: il calcolo sta dalla parte del vero, non della prudenza |
| 10 | Il ritorno a prima di una scrittura fallita rimette solo le chiavi della patch, e solo dove nessun'altra scrittura le ha cambiate (`ripristina` in `page.tsx`, Task 9) | due scritture in volo sulla stessa voce si annullavano a vicenda a schermo | nessuno; resta il caso limite dei due valori uguali (sotto, «Rimasto aperto») |
| 11 | Il ponte `DESIGN-SYSTEM.md` tiene la riga di Stato «Registro» senza file (Task 10) | la voce è ancora in `DESIGN.md` §8, ma `NotaDispensa.tsx`, l'unico codice che la usava, è cancellato | una riga: se Andrea toglie la voce da `DESIGN.md`, va tolta anche qui |
| 12 | Il ponte dice «chiusa con la PR del ramo», senza data (Task 10) | il merge lo fa Andrea, e la data non si sa | una riga |
| 13 | La sonda ha misurato anche a 375 × 740 e 375 × 667, fuori dal brief (Task 10) | a 812 il dettaglio e Nuovo ingrediente stavano senza scorrere, quindi «raggiungibile scorrendo» non si poteva verificare | nessuno: sono misure in più |
| 14 | I tasti schiacciati si correggono con `.corpo-foglio > * { flex-shrink: 0 }` in `globals.css`, sui corpi che scorrono di dettaglio, lotto, scansione e Nuovo ingrediente (`6af1b63`), non con `flexShrink: 0` su `STILE_TASTO` | copre tutti i figli diretti del corpo, anche pillole e righe, non solo i tasti alti 54; il widget AI non ha figli ad altezza fissa nel riquadro che scorre | la misura a 667 px non è stata rifatta: resta al gate dal telefono. I test in jsdom controllano solo che la classe ci sia, non il layout |
| 15 | `CampoConSalva` non segue `valore` mentre la scrittura è in volo o in errore; nel `catch` rimette il testo tentato; il tasto è `disabled={(!cambiato && !errore) \|\| volo}` come in `RigaScadenza` (giro finale) | la pagina fa l'ottimistico e poi il ritorno a prima: il campo si riallineava al valore vecchio, `cambiato` diventava falso e `RIPROVA` restava spento | in errore il campo non segue un cambio da fuori: dopo un `SALVA` fallito, un `FINITO` o un `SÌ` nello stesso foglio lasciano nel campo il numero tentato, e `RIPROVA` lo scriverebbe sopra; si esce chiudendo il foglio. Dopo un successo il campo torna a seguire `valore` |
| 16 | Il tondo del Dock tratta il click come quello di `WidgetAI`: un click senza `pointerdown` prima è un tocco breve (screen reader con `detail` 1), `detail` 0 sempre (giro finale) | prima il Dock chiamava `onToccaMicrofono` solo con `detail` 0, e uno screen reader che sintetizza il click con `detail` 1 non avviava niente | nessuno sui dati; lo screen reader vero resta da sentire sul telefono |
| 17 | Una seconda scansione senza quantità, in Nuovo ingrediente, azzera formato e unità letti dalla prima (giro finale) | il formato letto era di un altro prodotto: restava in silenzio sul nuovo ingrediente | chi scansiona due volte lo stesso prodotto, la seconda senza catalogo, perde il formato della prima e ha il default del reparto |
| 18 | La prova di equivalenza fra `residuoUtilizzabile` nuovo e la formula di `dbfb1ea` sta in un file suo, `src/domain/__tests__/pantry-equivalenza.test.ts`, con i giorni da −5 a 100 dall'acquisto più il 365, invece dei 400 giorni di fila della review (giro finale) | la formula vecchia copiata nel test è un riferimento fisso; la finestra copre ogni soglia (la più lunga è 90) col giorno prima e quello dopo, e il test gira in 38 ms [misurato ora] | un salto oltre i 100 giorni diverso da 365 non è coperto, ma nessuna soglia sta lì |
| 19 | §K della spec riscritta con l'elenco vero delle scritture che una `0014` mancante ferma, e la regola ripetuta nel gate 1 (giro finale) | la spec diceva che si rompeva solo la correzione della scadenza; scrivono la colonna anche congelatore, `FINITO`/`SÌ`, `AGGIUNGI` e `chiudiSpesa` | nessuno: è documentazione |

## Misure nel browser, a 375 × 812, dati finti [misurato, Task 10]

La sonda montava i componenti veri dentro il `Guscio` vero, con Supabase finto (sessione e
scritture risposte in locale) e un `SpeechRecognition` finto. Il browser della sessione
emulava un telefono (touch, rapporto 2).

- **Dettaglio con la riga di scadenza aperta:** il foglio va da `top` 88 a 812, il contenuto
  da 16 a 359, cioè 343 = 375 − 32, senza nulla fuori. `SCANSIONA UNA CONFEZIONE` finisce a
  740,34, alto 54: a 812 il contenuto sta tutto (`scrollHeight` 664 = `clientHeight` 664) e
  non serve scorrere. Con il messaggio `Scegli una data fra oggi e i prossimi due anni.` il
  tasto scende a 766,47 e resta alto 54.
- **Righe In casa e In congelatore:** il nome e i due tasti su una riga. In casa: nome 16–212,
  tasti 219–275 e 282–359. In congelatore: nome 16–233, tasti 240–296 e 303–359. Tutti i tasti
  alti 44.
- **Nuovo ingrediente:** le sei pillole dei reparti vanno a capo su quattro righe, con il bordo
  destro massimo a 326,37 (limite 359). `CREA L'INGREDIENTE` finisce a 735, alto 54, visibile
  senza scorrere.
- **Widget AI senza tastiera:** `bottom` del riquadro 698 = 812 − 114, anche in dettatura.
  **Con l'esito** (6 applicate, 2 da confermare, 2 non riconosciuti): `top` 88, `bottom` 698,
  alto 610, `overflowY: auto`, `scrollHeight` 784, e scorre di 174 fino a `Cercali in
  dispensa.`. Il fuoco va al contenitore dell'esito.
- **Tenuto premuto dal Dock** (eventi mandati con `dispatchEvent`, `pointerId` 7):
  - rilascio su `window` dopo 508 ms: `start`, poi `stop` 506 ms dopo; la banda sparisce, il
    widget resta aperto;
  - dopo 106 ms: solo `start`, e la riga diventa `TOCCA PER FERMARE`;
  - con un secondo dito (`pointerId` 9) che si alza a 50 ms: ignorato, la dettatura resta
    tenuta fino al rilascio del 7.
  - Il Dock è smontato già al `pointerdown`, e il rilascio arriva lo stesso.
- **A. Tocco breve sul tondo del Dock, poi `pointerup` e `click` sull'elemento sotto il dito**
  (trovato con `document.elementFromPoint`, a 80 ms dal `pointerdown`, col widget ancora
  nell'animazione d'entrata):
  - **barra grande** (tondo 642–698): sotto il dito c'è il widget (a 670, 690 e 696);
  - **barra ridotta** (tondo 660–716): a 700 e 708 c'è il widget, **a 714 c'è il velo**.
  - In tutti i sette casi il widget resta aperto, in dettatura, con `TOCCA PER FERMARE`.
- **A, con il clic vero del browser** (`computer left_click` al centro del tondo): arrivano
  `pointerdown` sul tondo, `pointerup` e `mouseup` sul widget, e **nessun `click`**, perché il
  tondo è stato smontato. Stesso esito a barra ridotta (`pointerdown` sull'icona) e grande: il
  widget resta aperto in dettatura a tocchi. È un clic del mouse, non un dito: il tocco vero
  resta per il telefono.
- **Le luci:** i tre widget vuoti hanno `::after` con `animationName` `luce-widget` (1,4 s), e
  le tre animazioni hanno lo stesso `startTime`, quindi sono in fase. Il testo in volo ha
  `luce-testo` (1,6 s), con `PREPARO LE MODIFICHE…` come `status` e `FAI LE MODIFICHE`
  `disabled`. L'onda ha 22 barre `onda` da 0,22 s, sfasate di 37 ms. Nei fogli di stile, le
  animazioni `.anim-luce-widget::after`, `.anim-luce-testo` e `.onda-barra` stanno solo dentro
  `@media (prefers-reduced-motion: no-preference)`.
- **Il velo copre la tab bar:** a widget aperto, `elementFromPoint` al centro della tab bar
  (187,5; 748) dà il velo del widget. A foglio alto aperto dà il contenuto del foglio, che
  copre la tab bar per intero. Col dialogo di eliminazione dà l'`alertdialog`; un tocco sul
  velo non lo chiude.
- **Il timeout di caricamento:** la pagina vera, montata nella sonda con le letture di Supabase
  lasciate appese, mostra i tre widget vuoti con la ricerca spenta e senza Dock, poi dopo
  8053 ms `Non riusciamo a caricare la dispensa. Riprova.` e `RIPROVA`.
- **Scansione e lotto:** senza `BarcodeDetector`, la scansione parte dal campo con `La
  fotocamera non è disponibile: digita il codice sotto la confezione.`, e `CERCA IL CODICE` è
  spento. Il lotto con 3 porzioni e 2 impegni mostra `2 impegnate`, e il dialogo dice «2 sono
  impegnate dai pasti in programma».

**Non eseguito nel browser:** la variante ferma con `prefers-reduced-motion: reduce`, perché
il browser della sessione non la emula. Resta la prova sui fogli di stile qui sopra.

## Trovato nel browser, e corretto: i tasti in fondo ai fogli si schiacciavano sotto 812 px

Il contenuto di un foglio è un contenitore flex in colonna che scorre (`.sc`, `overflowY:
auto`). I tasti alti 54 (`STILE_TASTO` in `controlli.tsx`) hanno `height: 54` ma nessun
`flexShrink: 0`. Quando il contenuto supera il foglio, il browser prima li schiaccia fino al
loro contenuto, e solo dopo fa scorrere [misurato]:

| Altezza | Foglio | Tasto | Altezza del tasto |
|---|---|---|---|
| 812 | dettaglio con la riga di scadenza aperta | `SCANSIONA UNA CONFEZIONE` | 54 |
| 740 | dettaglio con la riga chiusa | `SCANSIONA UNA CONFEZIONE` | 54 |
| 740 | dettaglio con la riga di scadenza aperta | `SCANSIONA UNA CONFEZIONE` | 27,66 |
| 740 | Nuovo ingrediente | `CREA L'INGREDIENTE` · `SCANSIONA LA CONFEZIONE` | 43,3 · 43,7 |
| 667 | dettaglio con la riga di scadenza aperta | `SCANSIONA UNA CONFEZIONE` | 22 |
| 667 | Nuovo ingrediente | `CREA L'INGREDIENTE` | 18 |

A 740 anche `ELIMINA IL LOTTO` resta a 54, perché il foglio del lotto è più corto. Il
dettaglio con la riga aperta ha bisogno di circa 766 px di finestra, e Nuovo ingrediente di
761, prima che i tasti inizino a schiacciarsi. Il calcolo è `top` del contenuto (148) più
l'altezza naturale del contenuto. Safari sull'iPhone, fuori dalla PWA, lascia meno di 812 px
[ipotesi, non misurata sul telefono].

**Corretto in `6af1b63`** (decisione 14): `.corpo-foglio > * { flex-shrink: 0 }` in
`globals.css`, applicata ai corpi che scorrono di `DettaglioIngrediente`, `DettaglioLotto`,
`ScansioneConfezione` e `NuovoIngrediente` (entrambe le viste). I test controllano che la classe
sia sul corpo; jsdom non calcola il layout. **La misura a 740 e 667 px non è stata rifatta**
dopo la correzione: resta al gate dal telefono.

## Non eseguiti: restano per il gate dal telefono

- La dettatura vera, con il testo provvisorio, sia tenuta sia a tocchi. Nel browser il
  riconoscitore era finto.
- Il tocco breve sul tondo del Dock con un dito vero: col mouse il `click` non arriva, ma con
  un dito il browser può comportarsi diversamente.
- Il widget che poggia sulla tastiera (`visualViewport`, con l'ipotesi della spec su Android).
- La fotocamera che legge un codice: la sonda ha tolto `BarcodeDetector` per provare il modo
  senza fotocamera, e la lettura vera non si è provata.
- Un giro completo: correggere una scadenza e vedere la lista che cambia.
- I fogli su uno schermo più basso di 812: la correzione dei tasti schiacciati (`6af1b63`) non
  è stata misurata nel browser. Sul telefono: dettaglio con la riga di scadenza aperta e Nuovo
  ingrediente, i tasti devono restare alti 54 e il foglio deve scorrere.
- Il tocco breve sul tondo del Dock con VoiceOver o TalkBack (decisione 16): nei test il click
  sintetizzato con `detail` 1 avvia la dettatura a tocchi, lo screen reader vero no.

## Rimasto aperto, di proposito

Dai `minor (deferred)` del registro dell'esecuzione:

- **Scritture:**
  - `aggiungiConfezione` scrive in due tempi: se fallisce la seconda scrittura, la pagina
    torna a formato ed EAN vecchi, ma il server tiene i nuovi.
  - Una rilettura in volo può sovrascrivere una correzione ottimistica fatta subito dopo. Il
    server resta giusto.
  - `ripristina` confronta per valore: se due scritture in volo scrivono lo stesso valore sulla
    stessa chiave (congelatore e poi `FINITO`, entrambe con `scadenzaManuale` a null), il
    fallimento della prima rimette a schermo la data vecchia.
  - `aggiungiConfezione` assorbe un `residuoPrima` negativo con `Math.max(0, …)`, senza errore.
  - L'annulla di un'entrata nella nota AI (0 → 500 → 0) non ripristina `ultimo_acquisto`: un
    mai comprato torna a 0 con l'acquisto di oggi e in pagina compare come «Finito». Limite
    dichiarato nel commento di `annulla` in `WidgetAI.tsx`, senza cambio di codice.
  - `chiudiSpesa` con la `0014` mancante (spec §K): le scritture del passo 1 partono insieme, e
    l'insert in `purchase` può riuscire mentre le voci comprate falliscono. Il ritentativo
    inserisce di nuovo lo storico di quella spesa [da lettura del codice, non provato]. Il
    gate 1 lo evita.
- **Accessibilità:**
  - Gli errori dei fogli non hanno `aria-live` né `role="alert"`.
  - Il `role="status"` della banda di dettatura non ha più contenuto accessibile, perché tempo
    e onda sono `aria-hidden`. Da sentire con VoiceOver e TalkBack.
- **Dominio:**
  - `pantry.ts:117`: il `??` non ricade sulla stima con una stringa vuota. Il mapper la filtra
    prima, e il Task 3 valida il formato.
  - Un `oggi` malformato non lancia più.
  - Il test «contratto» della scadenza è tautologico. Chiuso in parte nel giro finale: la prova
    di equivalenza con la formula vecchia (decisione 18) copre `scadenzaManuale` null; con la
    manuale restano i test a casi.
- **Forma:**
  - `WidgetArea` ha il gap interno a 10, come il mockup v2, contro il 12 di `DESIGN.md` §4 per
    la Tessera widget.
  - Le pillole `g`/`pz`/`ml` sono scritte in minuscolo e le rende maiuscole il CSS.
  - La riga di scadenza con la data vuota mostra il messaggio dell'intervallo.
- **Minori:**
  - `setState` dopo lo smontaggio da percorsi asincroni: innocuo.
  - L'ignore di eslint copre tutta `design/ridisegno`, non solo `support.js`.
  - `ScansioneConfezione` e `NuovoIngrediente` non dicono nel commento che li avvolge un
    `FoglioDalBasso`.
- **Nel widget AI con l'esito** scorre tutto il riquadro, testata compresa. In fondo all'esito
  la X non si vede più, e per chiudere resta il velo. La spec dice «dentro scorre» senza dire
  se la testata resta ferma: da guardare sul telefono.

## Tre note operative per chi viene dopo

- **La sonda nel pannello nascosto:** se il browser della sessione è nascosto, le transizioni
  e le animazioni avanzano a scatti. Il Dock restava a `bottom` 114 per più di un secondo dopo
  il passaggio alla barra ridotta, e il widget restava a `translateY(14px)`. Prima di misurare
  una posizione, controlla che `el.getAnimations()` sia vuoto, o fai uno screenshot, che forza
  il disegno.
- **I finti nella sonda si installano quando si carica il modulo**, non in un effetto:
  `useDettatura` guarda `SpeechRecognition` nel suo effetto, e gli effetti dei figli girano
  prima di quelli del genitore. `createBrowserClient` nel browser è un singleton: basta
  sostituire `auth.getSession` su `client()`. `supabase-js` legge `fetch` globale a ogni
  chiamata, quindi si può intercettare `window.fetch`.
- **Il server di sviluppo nel worktree** parte con le due variabili Supabase finte sulla riga
  di comando. `next dev` riscrive `next-env.d.ts`, che va ripristinato con `git checkout`.
  Dopo si cancellano la sonda e `.next/dev/`.

## I gate di Andrea, in ordine

1. **L'ok alla migrazione `0014`** in produzione
   (`supabase/migrations/0014_scadenza_manuale.sql`: la scadenza scritta a mano).
   **La migrazione PRIMA del deploy, altrimenti anche la chiusura della spesa si ferma:** senza
   la colonna falliscono `HAI PRESO TUTTO` (`chiudiSpesa` la scrive su ogni voce comprata),
   `FINITO` e `SÌ`, il congelatore, `AGGIUNGI` dello scanner e la correzione della scadenza
   (elenco in spec §K). La `0014` **non è rieseguibile**: è un `alter table … add column`
   senza `if not exists`, e una seconda esecuzione fallisce sulla colonna che c'è già.
2. **La migrazione applicata.**
3. **Il merge della PR e il deploy:** prima `git pull`, poi `npx --yes vercel@59.26.0 --prod`,
   rispondendo `n` alla domanda di aggiornamento della CLI.
4. **Le prove dal telefono**, quelle della sezione «Non eseguiti»: dettatura vera tenuta e a
   tocchi, tocco breve sul Dock col dito e con lo screen reader, widget sulla tastiera,
   fotocamera che legge un codice, una scadenza corretta che cambia la lista, i fogli su uno
   schermo più basso di 812 px.
