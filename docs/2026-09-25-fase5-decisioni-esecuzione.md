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

**Nota d'esecuzione (Task 1, ruling P9 del controller):** la riga 53 riporta il titolo con il
`describe` davanti (`Testata (spec §D) › …`), perché il test vive dentro quel blocco annidato e
il titolo da solo non basta a identificarlo — la stessa convenzione che la regola sopra chiede
per «Test nuovo». Le altre righe restano al titolo esatto dell'`it(...)`, come la regola dice.

| # | Test vecchio | File | Va a | Test nuovo | Nota |
|---|---|---|---|---|---|
| 1 | mostra i pasti reali letti da leggiSlotDefs, non i quattro cablati nel mock dell’artboard | P | Task 8, Gestione dei pasti | | |
| 2 | sta nella sezione CASA, dichiara l’assunzione e parte da 1 con il − spento | P | Task 7, campo `PERS` | | lo stepper è tolto (spec §C.10); la riga sta in «Come calcolo la lista» |
| 3 | + salva subito le impostazioni intere con 2, mostra 2 e dice per quanti compra la lista | P | Task 7, campo `PERS` | | si scrive 2 e si esce dal campo |
| 4 | a 4 il + è spento e non salva | P | Task 7, campo `PERS` | | diventa: 5 torna al valore di prima con `Scrivi un numero da 1 a 4.` |
| 5 | − scende di uno e salva | P | Task 7, campo `PERS` | | si scrive il valore nuovo e si dà Invio |
| 6 | due tap veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo | P | Task 9, Cadenza (la coda del provider) | | il campo `PERS` è spento in volo (frame 25), il segmento della Cadenza no |
| 7 | due tap veloci: se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore | P | Task 9, Cadenza (la coda del provider) | | idem |
| 8 | due tap veloci: se il primo riesce ma la sua rilettura non è l’ultima e il secondo fallisce, mostra il valore del server | P | Task 9, Cadenza (la coda del provider) | | idem |
| 9 | due tap veloci: se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono 2 | P | Task 9, Cadenza (la coda del provider) | | idem |
| 10 | se il salvataggio fallisce e anche la rilettura fallisce, torna all’ultimo valore confermato e lo dice | P | Task 7, campo `PERS` | | |
| 11 | se il salvataggio fallisce torna al valore del server e lo dice | P | Task 7, campo `PERS` | | |
| 12 | se la RLS rifiuta il salvataggio (la casa è cambiata) scarta l’id della casa, ricarica tutto e lo dice | P | Task 7, campo `PERS` | | |
| 13 | un rifiuto RLS riconosciuto dal solo messaggio (senza codice) ricarica allo stesso modo | P | Task 7, campo `PERS` | | |
| 14 | porta all elenco degli ingredienti | P | Task 7, riga Ingredienti | | apre la sotto-schermata, non un link |
| 15 | sotto il minimo di 3 pasti il pulsante di rimozione è disattivato | P | Task 8, Gestione dei pasti | | |
| 16 | sopra il minimo la rimozione funziona e salva l’insieme aggiornato | P | Task 8, Gestione dei pasti | | senza piatti al tocco; con piatti il dialogo (spec §C.2) |
| 17 | al massimo di 6 pasti il pulsante di aggiunta è disattivato | P | Task 8, Gestione dei pasti | | diventa: a 6 `AGGIUNGI PASTO` non c'è e c'è `Sei pasti sono il massimo.` |
| 18 | aggiunge un pasto sotto il massimo e lo salva con un id generato | P | Task 8, Gestione dei pasti | | |
| 19 | la prima riga non può salire e l’ultima non può scendere; riordinare aggiorna le posizioni e salva | P | Task 8, Gestione dei pasti | | |
| 20 | la pastiglia del giorno abitualmente fuori casa ha 44px di area di tap sopra una pillola di 36px | P | Task 8, Pasti a casa | | diventa la cella 44 della matrice |
| 21 | accende una pastiglia del giorno e salva le assenze abituali aggiornate | P | Task 8, Pasti a casa | | |
| 22 | rinominare un pasto salva il nuovo nome al blur, non a ogni carattere digitato | P | Task 8, Gestione dei pasti | | |
| 23 | con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server | P | Task 8, Gestione dei pasti | | la semina sta nel provider (Task 6) |
| 24 | il link ordine dei reparti mostra l’anteprima e il riepilogo nell’ordine reale, non un ordine fisso | P | Task 7, riga Ordine delle aree | | l'anteprima è tolta (spec §C.5): diventa `PERSONALIZZATO` / `DI BASE` |
| 25 | con il ciclo spento la rotazione si può accendere e dice cosa cambia | P | Task 8, Rotazione del piano | | |
| 26 | se il salvataggio del ciclo fallisce torna al valore di prima e lo dice | P | Task 8, Rotazione del piano | | |
| 27 | il copy del giro con origine futura dice "comincia" | P | Task 8, Rotazione del piano | | |
| 28 | il copy del giro con origine passata (o oggi) dice "è cominciato" | P | Task 8, Rotazione del piano | | |
| 29 | RIPARTI da lunedì richiede due tocchi: il primo arma senza salvare, il secondo salva davvero | P | Task 8, Rotazione del piano | | diventa il dialogo `riparti`: ANNULLA non salva, `RIPARTI DA LUNEDÌ` salva |
| 30 | RIPARTI armato: un tap fuori dal bottone annulla senza salvare | P | Task 8, Rotazione del piano | | diventa: il velo del dialogo non chiude e non salva |
| 31 | RIPARTI armato: un cambio di stato altrove (la rotazione) lo disarma | P | Task 8, Rotazione del piano | | diventa: `RIPARTI` spento quando l'origine è già il lunedì corrente |
| 32 | da solo: invita a fare la spesa con qualcuno, offre il codice e il campo per entrare | P | Task 10, Casa condivisa | | |
| 33 | CREA UN CODICE chiama creaInvito e mostra il codice grande con la sua durata | P | Task 10, Casa condivisa | | |
| 34 | se creaInvito fallisce lo dice senza rompere la scheda | P | Task 10, Casa condivisa | | |
| 35 | ENTRA maiuscola il codice, chiama entraInCasa e ricarica su /lista | P | Task 10, Casa condivisa | | |
| 36 | con un codice sbagliato mostra il messaggio della funzione SQL (P0001) così com’è | P | Task 10, Casa condivisa | | |
| 37 | un errore che non è un raise exception della funzione (es. 23505) non mostra il messaggio grezzo di Postgres | P | Task 10, Casa condivisa | | |
| 38 | da proprietario: elenca le email dei membri e offre un altro codice, senza ESCI | P | Task 10, Casa condivisa | | |
| 39 | da proprietario: TOGLI chiede conferma al primo tocco, al secondo toglie per id e rilegge la casa | P | Task 10, Casa condivisa | | diventa il dialogo `togli` |
| 40 | da proprietario: tolto l’ultimo membro la scheda torna allo stato da solo | P | Task 10, Casa condivisa | | |
| 41 | da proprietario: TOGLI armato, un tap fuori disarma senza togliere | P | Task 10, Casa condivisa | | diventa: ANNULLA del dialogo non toglie |
| 42 | se togliere fallisce lo dice e il membro resta in elenco | P | Task 10, Casa condivisa | | l'errore sta nel dialogo |
| 43 | se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza dire che non siamo riusciti | P | Task 10, Casa condivisa | | usa `ricaricaCasa(seFallisce)` del Task 6 |
| 44 | da membro: ESCI DALLA CASA chiede conferma al primo tocco ed esce al secondo | P | Task 10, Casa condivisa | | diventa il dialogo `esci-casa` |
| 45 | da membro: ESCI armato, un tap fuori disarma senza uscire | P | Task 10, Casa condivisa | | diventa: ANNULLA del dialogo non esce |
| 46 | se uscire fallisce lo dice e resta nella casa | P | Task 10, Casa condivisa | | l'errore sta nel dialogo |
| 47 | se statoCasa fallisce la sezione lo dice e il resto delle impostazioni resta usabile | P | Task 10, Casa condivisa | | `casa: null` nel provider (Task 6), il messaggio nella sotto-schermata |
| 48 | mostra le sei righe nell’ordine caricato, con le frecce ai limiti disattivate al 35% di opacità | R | Task 9, Ordine delle aree | | i limiti sono `--icona-spenta` + `disabled` |
| 49 | riordinare con le frecce non salva finché non si preme SALVA ORDINE | R | Task 9, Ordine delle aree | | |
| 50 | SALVA ORDINE persiste il nuovo ordine lasciando intatto tutto il resto, poi torna a Impostazioni | R | Task 9, Ordine delle aree | | diventa: resta sulla sotto-schermata (spec §C.5) |
| 51 | se il salvataggio fallisce, mostra un errore e resta sulla pagina | R | Task 9, Ordine delle aree | | |
| 52 | il link indietro torna alla pagina statica /impostazioni | R | Task 9, Ordine delle aree | | diventa: la freccia torna in cima al pannello |
| 53 | Testata (spec §D) › il menù utente porta alle impostazioni, si chiama Impostazioni e mostra l'iniziale | `src/components/__tests__/testata.test.tsx` | Task 6, Testata | | il Menù è un `button` che apre il pannello |
| 54 | con indietro c'è il link Indietro e non c'è Impostazioni | `src/components/__tests__/testata.test.tsx` | Task 11, Testata | | la pillola con le tre etichette |
| 55 | usa il nome se c'è | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` | | |
| 56 | altrimenti l'email | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` | | |
| 57 | senza utente o con errore torna il puntino | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` e `inizialeDi` | | |

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

## Rimasto aperto, di proposito

Ogni task aggiunge qui i minor che la review lascia aperti, col motivo.

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

## I gate di Andrea, in ordine

1. **L'ok alla migrazione `0015`** in produzione (`supabase/migrations/0015_cadenza_e_dispensa.sql`:
   `settings.giorni_controllo` e `cancella_dispensa()`), **prima del merge**: Vercel pubblica da
   solo al merge (spec §O).
2. **La migrazione applicata**, con le query di controllo di «Task 4 › Da fare all'applicazione
   della 0015».
3. **Il merge della PR**, che va in produzione da solo.
4. **Le prove dal telefono** della spec §M.4, più quelle della sezione «Non eseguiti»: il foglio
   di condivisione di Esporta, e un logout (D3) verificato dallo stare dentro su un secondo
   dispositivo.

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
