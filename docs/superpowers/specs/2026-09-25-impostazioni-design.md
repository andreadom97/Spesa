# Fase 5 del redesign: le Impostazioni — design

**Data:** 25/09/2026 · **Stato:** approvata da Andrea il 25/09, aggiornata il 26/09 con le
decisioni 17–20 e con quanto il piano ha misurato · **Base:** `main` `957674c`,
`design/sistema/DESIGN.md` v3, i file in `design/ridisegno/impostazioni/` (scaricati il 25/09
dal progetto Claude Design `5f1a24e3-…`):
- `Impostazioni - pannello completo.dc.html`, frame 00–27. È la fonte principale. Il download si
  ferma a 256 KB: manca la coda della scheda del frame 27, che però il log descrive per intero;
- `LOG modifiche per Claude Code.md`, il delta del designer, schermata per schermata. Qui è
  citato come **log §n**;
- `Avvio - 5 animazioni del marchio.dc.html`, variante **3a** («Pop elastico in testata»). Resta
  nel progetto Claude Design e non è copiato nel repo: i valori che servono sono in §J.

Il brief da cui nasce il disegno è `design/sistema/prompt-impostazioni-pannello.md`.

**Obiettivo.** Portare le Impostazioni nel ridisegno: diventano un pannello che esce dal Menù
utente sopra la pagina corrente, e Piatti esce dalla tab bar.

**Criterio di successo.** Tutto si verifica dal telefono:
- ogni funzione delle Impostazioni di oggi si trova nel pannello, con i suoi testi;
- le quattro funzioni nuove funzionano davvero: Esci, Cancella la dispensa, Esporta, Cadenza;
- da Piatti si torna al pannello;
- il gesto indietro chiude un livello alla volta;
- a 360 px sei pasti stanno nella matrice e nella striscia del Piano senza celle sotto 44 e
  senza sbordare.

A parità di dati, la lista della spesa dà gli stessi numeri; cambia solo se si cambia la
cadenza. La suite resta verde.

**Le decisioni che questa spec applica.**

Di Andrea, 25/09, prima del disegno (nel brief):
1. Piatti esce dalla tab bar. La barra ha tre voci, Lista · Piano · Dispensa. Piatti resta una
   pagina piena, aperta da una tessera del pannello.
2. Il pannello ha due livelli: in cima le funzioni che si usano ogni tanto, sotto le
   impostazioni che si cambiano di rado.
3. Nessuna funzione di oggi si perde (deciso il 20/09): quelle con contenuto proprio diventano
   sotto-schermate.
4. Ci sono quattro funzioni nuove, vere: Esci, Cancella la dispensa, Esporta i tuoi dati,
   Cadenza dei controlli (ogni mese, ogni 2 mesi, ogni 3 mesi; di default ogni 3 mesi).
5. Si tolgono `Arrotonda alle confezioni` e `Unità di misura`.
6. «Da quando usi Dispesa» va nel gruppo I tuoi dati.
7. Da 3 a 6 pasti, a 360 px.

Del designer, nelle note del frame 00:
8. Riparti, Togli ed Esci dalla casa passano dal Dialogo di conferma, e `SICURO?` sparisce.
9. Esci chiede conferma, con `ESCI` primario in `--ink`.
10. Da Piatti si torna con una pillola che riapre il pannello in cima.

Di Andrea, 25/09, dopo il disegno:
11. Il pannello è un componente montato nel guscio dell'app, non una route (§A).
12. Togliere un pasto che ha piatti chiede un dialogo. Senza piatti si toglie al tocco (§C.2).
13. Nel perimetro entrano anche la scansione nell'editor dell'ingrediente, l'animazione d'avvio
    del Marchio e il tasto `COPIA` accanto al codice della casa. La ricerca in Ingredienti resta
    fuori.
14. Le quattro proposte di testo del designer sono accettate: `SETTIMANA {k} DI {n}`, «nel
    Piano», «l'ordine delle aree», «Controlla la connessione e tocca RIPROVA.».
15. Il «finito» della Dispensa resta a due tocchi. Il punto è chiuso.
16. Nell'animazione d'avvio il Marchio atterra sull'icona della voce Lista nella tab bar (§J).

Di Andrea, 26/09, sulle domande del piano:
17. **D1.** Cancella la dispensa riporta a pasti normali quelli «dai pronti» di oggi e dei giorni
    dopo (`data >= current_date`). I pasti passati restano come sono (§E.2).
18. **D2.** Cancella la dispensa azzera anche `shopping_list_item.residuo` nelle liste delle
    settimane non chiuse, così la chiusura della spesa non fa risorgere la dispensa (§E.2).
19. **D3.** Esci esce da questo telefono e basta: `signOut({ scope: 'local' })`. `esci()` lancia
    solo se dopo l'errore la sessione c'è ancora (§E.4). Confermato anche D4: se la condivisione
    del file fallisce per un motivo diverso dall'annullo, il file si scarica (§E.3).
20. **I testi del disegno sono accettati**: le note delle righe Pasti a casa, Cadenza, Ordine
    delle aree e Cancella; il riepilogo della matrice con le sue varianti; `OGNI QUANTO TI
    CHIEDO`; `CODICE DELLA CASA`; `Apri {nome}`; `Togli {email} dalla casa`; l'aria del campo
    `PERS`. **I due testi di oggi che dicevano «90 giorni» dicono la cadenza scelta**: la nota
    della classe «a stima» nell'editor dell'ingrediente e la frase di Lista fatta (§I).

Le scelte del controller del piano (26/09) che cambiano questa spec sono segnate nei paragrafi
che toccano: §A.3, §D, §F, §F.1, §H, §I, §N.

Le etichette **[misurato]** e **[ipotesi]** valgono come sempre. «Misurato» qui vuol dire letto
nel codice o nelle migrazioni il 25/09.

---

## A. Architettura del pannello

### A.1 Dove vive

Il pannello è un componente client montato nel **`Guscio`**
(`src/components/Guscio.tsx`), accanto alla tab bar e allo slot del Dock. Il suo stato vive in
un **`PannelloProvider`**, un contesto nuovo in `src/components/pannello/`:
- `aperto: boolean`;
- `pila: SottoSchermata[]`. È vuota quando si sta in cima. Contiene al più un livello, perché
  nessuna sotto-schermata ne apre un'altra dentro il pannello (l'editor dell'ingrediente è una
  pagina, §F);
- `dialogo: Dialogo | null`;
- le azioni `apri(sotto?)`, `chiudi()`, `entra(sotto)`, `torna()`, `mostraDialogo(d)`,
  `chiudiDialogo()`.

Ci sono otto sotto-schermate, con questi `SottoSchermata`:
- `pasti-a-casa`, `gestione-pasti`, `rotazione`;
- `ingredienti`, `aree`, `cadenza`;
- `casa`, `esporta`.

Porzioni sta nella riga, Cancella ed Esci sono dialoghi, Piatti e Importa sono pagine.

`/impostazioni`, `/impostazioni/ingredienti` e `/impostazioni/reparti` restano come route e
fanno solo da **rimando**. Un componente client fa `router.replace` verso:
- `/lista?impostazioni=cima`;
- `/lista?impostazioni=ingredienti`;
- `/lista?impostazioni=aree`.

Servono a segnalibri, cronologia e test e2e. Il contenuto di `impostazioni/page.tsx` (1050 righe)
si smonta nei componenti del pannello, e i test di quella pagina migrano con lui (§M).

### A.2 Aprire e chiudere

**Il Menù utente apre il pannello.** Nella Testata (`src/components/Testata.tsx:42-60`) diventa
un `button`:
- non è più un `Link` a `/impostazioni`;
- `aria-expanded` segue `aperto`, e `aria-controls` punta al pannello;
- `aria-label="{Nome}: profilo e impostazioni"` (DESIGN.md §8 Menù utente). Oggi dice
  `Impostazioni` [misurato];
- `{Nome}` è `user_metadata.nome` se c'è, altrimenti la parte dell'email prima della `@`;
- con il pannello aperto il bottone prende `--ombra-nav`.

**Si chiude con quattro gesti:** la X della testata del pannello, il velo, il tocco sul Menù
utente, il gesto indietro (§A.4). Alla chiusura il fuoco torna al Menù utente.

**La tab bar è coperta.** Pannello e velo stanno sopra tab bar e Dock (z-index sopra il livello
2 di `FoglioDalBasso`, che vale 60). Il Dialogo di conferma sta sopra il pannello.

### A.3 Aprire da un indirizzo: `?impostazioni=`

**Il provider legge il parametro.** Al montaggio e a ogni cambio di `pathname`, il provider
legge `impostazioni` da `window.location.search`. Non usa `useSearchParams`, così non serve un
`Suspense`: è lo stesso modello di `?torna=` nell'editor, oggi [misurato]. I valori ammessi sono
`cima` e gli otto `SottoSchermata`. Un valore sconosciuto vale `cima`. Nel Guscio il parametro si
legge solo dopo che `PrimoAvvio` ha finito la semina: un utente nuovo da un vecchio segnalibro
`/impostazioni` farebbe seminare i pasti anche al pannello, in parallelo, fino a otto (review
finale, M2).

**Cosa fa quando lo trova:**
1. toglie il parametro con `window.history.replaceState(window.history.state, '', …)`, e solo
   quello: gli altri parametri e l'ancora restano (review finale, M7). Lo fa
   **prima** di aprire. Lo stato della voce si passa com'è, **mai** `null`: l'effetto del
   provider gira prima che l'`AppRouter` di Next avvolga la History API, e con `null` la voce
   perde lo stato di Next (`__NA`), che al primo indietro ricarica la pagina [misurato, sonda
   del Task 2 del piano, misura B e variante B′; registro, decisione 14];
2. apre il pannello su quella sotto-schermata;
3. ripristina lo scorrimento del corpo, se in `sessionStorage` c'è un'altezza salvata per quella
   sotto-schermata (`spesa:pannello-scroll:{sotto}`), e subito dopo la cancella.

**Perché `replaceState` e non `router.replace`** (piano, 26/09). Aprendo, `useIndietroFogli`
mette le sue voci di cronologia nello stesso giro di effetti. `router.replace` è una
transizione: le voci nascerebbero sull'indirizzo col parametro, e un indietro lo ritroverebbe e
riaprirebbe il pannello. Con `replaceState` le voci nascono sull'indirizzo pulito. Next 16
accetta la History API nativa [misurato nella guida `04-linking-and-navigating.md`, «Native
History API»]; il comportamento nel browser lo misura la sonda del Task 2 del piano (misura B).

**Con il parametro, l'animazione non parte.** Il pannello compare aperto, senza la salita di
§B.2. Il gesto di chi torna è la freccia della pagina che lascia, e la salita dal basso
racconterebbe un'apertura che non c'è stata.

**Una sola funzione costruisce questi indirizzi:** `indirizzoPannello(origine, sotto)`. Tutte le
pagine piene la usano per tornare al pannello (§A.5).

### A.4 Il gesto indietro

**`useIndietroFogli` passa a uso comune.** Si sposta da `src/app/(app)/dispensa/` a
`src/components/`, e la Dispensa aggiorna l'import. La firma resta
`useIndietroFogli(profondita, chiudiUltimo)`: è il modello misurato nel browser nella PR #7, una
voce di cronologia sullo stesso URL per ogni livello aperto.

**La profondità del pannello.** Pannello chiuso = 0; aperto in cima = 1; in una sotto-schermata
= 2; con un dialogo sopra = +1 (3 da una sotto-schermata, 2 da cima). `chiudiUltimo` scende di
un livello:
- dal dialogo → `chiudiDialogo()`, come ANNULLA;
- dalla sotto-schermata → `torna()`;
- dalla cima → `chiudi()`.

**Le uscite dai tasti** (X, velo, freccia, ANNULLA, conferme) cambiano solo lo stato. È l'hook a
consumare le voci con un `history.go()`, come in Dispensa.

**Un limite noto.** Se il pannello si apre con `?impostazioni=` su una sotto-schermata, l'hook
mette due voci. Il primo indietro porta in cima al pannello, non alla pagina da cui si veniva:
coerente con la regola «un livello alla volta».

### A.5 Le pagine piene aperte dal pannello

**Tre destinazioni lasciano il pannello per una pagina:** Piatti (`/piatti`), Importa un piano
(`/importa`) e l'editor dell'ingrediente (§F). Tutte e tre tornano al pannello sopra la pagina da
cui si era partiti.

**L'origine.** Prima di navigare il pannello salva in `sessionStorage`
`spesa:origine-pannello = { pathname, sotto }`: `pathname` è quello della pagina sotto il
pannello (per esempio `/dispensa`), `sotto` è `cima` o `ingredienti`. Per gli Ingredienti salva
anche l'altezza di scorrimento (§A.3). Il ritorno va a
`indirizzoPannello(origine.pathname, origine.sotto)`. Se l'origine manca, va a
`/lista?impostazioni=cima`.

**Navigare fuori con voci di cronologia aperte.** Il pannello aperto ne ha 1 o 2 sullo stesso
URL. Se il pannello si chiude e subito si fa `router.push`, il `go(-n)` dell'hook e la `push`
corrono insieme.
- **Regola:** prima si chiude il pannello, poi si naviga, al `popstate` che conclude il
  `go(-n)`. L'hook espone per questo `chiudiTuttoPoi(fn)`: consuma tutte le voci ed esegue `fn`
  **un giro dopo** (`setTimeout(fn, 0)`) il `popstate` atteso, o un giro dopo l'effetto se non
  ci sono voci.
- **Perché un giro dopo [misurato, sonda del Task 2 del piano].** L'ascoltatore `popstate`
  dell'hook è registrato prima di quello di Next: una `router.push` fatta dentro il `popstate`
  parte, e subito dopo la traversata di Next la scarta (la pagina nuova non arriva e la
  cronologia resta con una voce in più). Con `fn` differita di un giro la pagina arriva, con una
  sola voce dopo l'origine, e l'indietro torna all'origine col pannello chiuso, nello stesso
  documento. Rimisurato sul pannello vero dal Task 15 (tessera Piatti da `/lista`): registro,
  «Le misure nel browser».
- Il ripiego che la spec del 25/09 prevedeva (`router.replace` al posto di `push`) non è servito.

---

## B. Il pannello

### B.1 Contenitore (log §4.1)

**Il pannello** è posizionato `fixed`:
- `top 76`, `left 0`, `right 0`, `bottom 0`;
- raggio `22px 22px 0 0`, **senza bordo**;
- fondo `--fondo` pieno, `--ombra-alta`;
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` sul titolo.

**Il velo** è `rgba(20,22,58,0.55)` e chiude.

**La testata** è fissa: titolo di dettaglio 32/800, a sinistra. A destra:
- in cima, il tondo 44 su 0,07 con la X (`aria-label="Chiudi le impostazioni"`);
- in una sotto-schermata, il tondo 44 con la freccia a sinistra del titolo
  (`aria-label="Torna alle impostazioni"`), e il titolo diventa quello della sotto-schermata.

**Il corpo** è l'unico che scorre: padding `0 12 26`, gap 12, con la maschera di scorrimento
ferma in fondo (`--fine` non serve, perché la barra è coperta). Il piede di versione sta in
fondo al corpo, padding `12 18 26`.

**Il piede fisso** vale solo in tre sotto-schermate: Ordine delle aree, Esporta, Casa. Porta il
primario sopra un filetto `--bordo`, fuori dallo scorrimento, padding `12 16 26`. È l'eccezione
«primario nel pannello» (log §7).

### B.2 Animazione `.anim-pannello` (log §4.2, frame 00)

**Apertura, 250 ms `cubic-bezier(.2,.8,.25,1)`:**
- il pannello va da `translateY(100%)` a `0`;
- il velo va da opacità 0 a 1 in 200 ms lineari;
- `.guscio-main` va da `scale(1)` a `scale(.96)`, con `transform-origin: 50% 0`.

**Chiusura, 200 ms `cubic-bezier(.4,0,1,1)`:** il contrario, col velo in 180 ms. Alla fine il
pannello va a `visibility: hidden` e il fuoco torna al Menù utente.

**Sotto-schermate.** Entrano da destra: `translateX(24px)` e opacità, 200 ms. Escono verso
destra con la freccia.

**Con `prefers-reduced-motion: reduce`:** solo opacità in 120 ms, e l'app dietro non si scala.

**Il pannello resta montato** dopo la prima apertura: servono la transizione di chiusura e
`visibility`. Il contenuto delle sotto-schermate invece si smonta quando si esce.

### B.3 Il livello delle funzioni (log §4.3.1, frame 03)

**Quattro tessere in griglia 2 × 2**, sul fondo del pannello e senza Blocco attorno:
- gap 8, minimo 104, raggio 18;
- fondo bianco, `--bordo`, `--ombra-pannello`, padding `12 14 13`;
- nome 17/700, nota 12,5 in `--testo-2`;
- nessuna icona, nessun contatore.

Ogni tessera è un `button`:

| Tessera | Nota | Valore | Porta a |
|---|---|---|---|
| `Piatti` | `Scrivi e correggi i tuoi piatti.` | — | `/piatti?da=impostazioni` (§G.2) |
| `Importa un piano` | `Da PDF o foto. Sostituisce il piano attuale.` | — | `/importa` (§A.5) |
| `Casa condivisa` | `La spesa con chi vive con te.` | mono 11: `SOLO TU` / `CON {N} PERSONE` / `NELLA CASA DI {NOME}` | sotto-schermata `casa` |
| `Esporta i tuoi dati` | `Piatti, piano e dispensa in un file.` | — | sotto-schermata `esporta` |

`{N}` conta te più i membri. `{NOME}` è la parte dell'email del proprietario prima della `@`,
in maiuscolo come ogni mono.

### B.4 Il livello delle impostazioni (log §4.3.2–4, frame 03–04)

**Un separatore apre il livello:** l'etichetta `SI CAMBIANO DI RADO` in `--testo-2`, col suo
filetto `--bordo`.

**Sotto, cinque Blocchi di gruppo di Righe di impostazione** (min 56; nome 15/700; nota 12,5).
Il finale di ogni riga è uno dei quattro di DESIGN.md §8.

1. **La settimana di base**
   - `Pasti a casa` · `{N} FUORI CASA` + chevron → `pasti-a-casa`. `{N}` conta le celle fuori
     casa della matrice; `NESSUNO FUORI CASA` a 0.
   - `Gestione dei pasti` · `Quanti pasti fai al giorno e come si chiamano.` · `{N} PASTI` →
     `gestione-pasti`.
   - `Rotazione del piano` · `Se il tuo piano si ripete a blocchi di settimane.` · `NESSUNA` /
     `{N} SETT.` → `rotazione`.
2. **Come calcolo la lista**
   - `Per quante persone cucini` · campo numerico 78 × 44, unità `PERS` (§C.10).
   - `Cadenza dei controlli` · `OGNI MESE` / `OGNI 2 MESI` / `OGNI 3 MESI` → `cadenza`.
   - `Ingredienti` · `Area, confezione e come si consuma.` → `ingredienti`.
3. **Come la vedi in corsia**
   - `Ordine delle aree` · `PERSONALIZZATO` / `DI BASE` → `aree`. Vale `DI BASE` quando
     l'ordine è `ORDINE_AREE_DEFAULT`.
4. **I tuoi dati**
   - la nota `Da quando usi Dispesa: …` (§C.11), se c'è;
   - `Cancella la dispensa`, riga d'azione → dialogo (§D).
5. **Account**
   - nome + email, informativa, senza chevron e senza azione;
   - `Esci`, riga d'azione col nome in `--errore`, nota `Per rientrare ti serve il link che ti
     mandiamo via email.` → dialogo (§D).

**Piede:** `Versione {x}` in mono.
- `{x}` è la `version` di `package.json`, esposta a build come `NEXT_PUBLIC_VERSIONE` in
  `next.config`. Oggi vale `0.1.0` [misurato].
- La metà «ultimo salvataggio il … alle …» **non si fa** (§N).

### B.5 Stati (log §4.7, frame 23–25)

- **Caricamento (23).** Testata e tessere sono già disegnate e toccabili. Al posto dei blocchi
  c'è `CARICO…` in mono `--sec`, con `role="status"`. Lo stesso schema vale nelle
  sotto-schermate che leggono dati propri: casa, ingredienti, aree.
- **Errore di caricamento (24).** Le tessere restano visibili. Al posto dei blocchi, un Blocco
  con `Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.` e la
  pillola `RIPROVA`, che rilegge.
- **Errore di salvataggio (25).** Vale per ogni controllo che salva al tocco o all'uscita dal
  campo:
  - il valore torna a quello di prima;
  - `Non siamo riusciti a salvare. Riprova.` compare sotto la riga, in 12,5 `--errore`, con
    `role="alert"`;
  - non c'è un tasto RIPROVA: si rifà il gesto, e l'errore sparisce al gesto successivo.

  È il modello ottimistico con rollback di oggi (`persistiImpostazioni`, coda serializzata,
  ricarica sul rifiuto RLS) [misurato], spostato nel provider dei dati del pannello.

**La casa cambiata sotto i piedi.** Oggi la pagina la riconosce con `eRifiutoRls`, chiama
`dimenticaIdCasa()` e ricarica [misurato]. Il pannello fa lo stesso: chiude l'eventuale dialogo
e mostra `La casa è cambiata: dati ricaricati. Riprova.` sopra il blocco ricaricato (frame
26B).

---

## C. Le sotto-schermate

**La testata** di ogni sotto-schermata è §B.1: freccia e titolo 32/800. I testi completi sono in
§I.

**Il salvataggio.** Tutto si salva al gesto, con un'eccezione: Ordine delle aree si salva col
suo tasto.

### C.1 Pasti a casa (frame 05, 360 × 800)

**La matrice** mette i pasti in riga e i giorni in colonna, sulla larghezza piena del corpo,
senza Blocco. Le misure:
- le sigle dei giorni `L M M G V S D` stanno una volta sola in cima, mono 8,5 `--ter`, in
  `position: sticky`;
- il nome del pasto è un'etichetta mono 10, sopra le sue sette celle;
- le celle sono `flex: 1`, gap 4, alte 44, raggio 14.

**Due stati per cella:**
- **a casa:** fondo `--ink`, `--ombra-casetta`, la casetta bianca 16 (la stessa della Riga
  pasto);
- **fuori:** fondo bianco, `--bordo`, vuota.

**L'accesso.** `aria-pressed` e `aria-label="{Giorno} {pasto}: di base a casa, tocca per
mettere fuori casa"`. Dalla cella fuori casa: `…: di base fuori casa, tocca per mettere a casa`.

**Il salvataggio** avviene al tocco, su `assenze_abituali` del pasto, con lo stesso
`persistiPasti` di oggi.

**Sotto la matrice** ci sono la nota e il riepilogo, che si ricalcola (§I).

**[calcolo]** A 360 il corpo è largo 336 (360 − 2 × 12): celle da (336 − 24) / 7 =
**44,6**. Il log dice 44,1, calcolato sul padding del frame; in entrambi i casi è ≥ 44.

### C.2 Gestione dei pasti (frame 06, 07)

**L'etichetta** è `I TUOI PASTI`, col contatore `{n} DI 6`.

**Ogni riga ha:**
- un campo 44 `flex: 1` (`aria-label="Nome del pasto"`). Salva all'uscita dal campo; vuoto
  vale `Pasto`;
- tre tondi 44 su 0,04, gap 4: `Sposta {nome} in alto`, `Sposta {nome} in basso`,
  `Rimuovi {nome}`.

**Quando i tondi sono spenti** (`--icona-spenta` + `disabled`): «su» sul primo pasto, «giù»
sull'ultimo, ✕ su tutti quando i pasti sono 3.

**I limiti:**
- a 3 pasti compare la nota `Tre pasti sono il minimo.`;
- a 6 pasti `AGGIUNGI PASTO` non c'è, e compare `Sei pasti sono il massimo.`.

**`AGGIUNGI PASTO`** è tratteggiato, alto 56, **in fondo** al blocco. Crea `Nuovo pasto` in
fondo, acceso in tutti i giorni, col campo a fuoco.

**Mentre salva**, la riga va a opacità 0,5.

**Rimuovi (decisione 12).** Oggi rimuovere un pasto cancella a cascata [misurato,
`0001_schema.sql`]:
- i piatti di quel pasto (`dish.slot_def_id … on delete cascade`), con i loro ingredienti, le
  opzioni e le scelte;
- tutte le righe del piano per quel pasto, in tutte le settimane
  (`meal_slot.slot_def_id … on delete cascade`).

Quindi:
- **senza piatti attivi** (`repertorio.filter(p => p.slotDefId === id).length === 0`) si toglie
  al tocco, come nel disegno;
- **con piatti** si apre il dialogo `rimuovi-pasto` (§D). Il testo nomina i piatti che se ne
  vanno;
- i piatti disattivati (`attivo = false`) spariscono a cascata anche loro, ma non si contano:
  l'utente non li vede.

Sotto il blocco c'è la nota di oggi, con «nel Piano» (§I).

### C.3 Rotazione del piano (frame 08–10)

**Il segmento a blocco** ha quattro valori ed è alto 46: `NESSUNA`, `2 SETT.`, `3 SETT.`,
`4 SETT.`. Salva al tocco, senza conferma, con lo stesso comportamento di oggi su
`settimane_ciclo` e `ciclo_origine`: l'origine si ancora al lunedì corrente quando il ciclo
passa sopra 1 [misurato].

**Con un ciclo sopra 1** compare un riquadro 0,04 raggio 14 con:
- `SETTIMANA {k} DI {n}` in mono, da `settimanaDelCiclo`;
- la nota col giro;
- il tasto secondario `RIPARTI DALLA SETTIMANA 1`.

**Con `NESSUNA`** compare la nota di oggi.

**`RIPARTI` apre il dialogo `riparti` (§D).** La conferma scrive
`cicloOrigine = lunedì corrente`, come oggi. Il tasto è spento quando `cicloOrigine` è già il
lunedì corrente (oggi è così [misurato], ed è la regola che il disegno non mostra).

### C.4 Ingredienti (frame 11)

In testa c'è la nota di oggi. Sotto, un Blocco per area, nell'ordine dell'utente, col
quadratino d'area 10.

**Ogni riga** è alta 56 ed è un `button`:
- il nome 15/700;
- `{formato} {UNITÀ} · {PORZIONABILE|INTERO|A STIMA}[ · FRESCO]` in mono 10 `--testo-2`.

Le aree vuote non si mostrano.

**Il vuoto:** `Nessun ingrediente`, più la nota di oggi.

**Il tocco su una riga** salva l'origine (§A.5, con `sotto = 'ingredienti'` e lo scorrimento) e
apre l'editor `/piatti/nuovo/ingredienti/{id}?torna=impostazioni` (§F).

### C.5 Ordine delle aree (frame 13, 13B, 13C)

In testa c'è la nota di oggi. Sotto, sei righe da 56, ognuna con quadratino, nome e due tondi:
`Sposta {AREA} in alto`, `Sposta {AREA} in basso`. I limiti sono spenti.

**Il salvataggio.** `SALVA ORDINE` è un primario da 54 nel **piede fisso** (§B.1):
- è spento finché l'ordine è quello salvato;
- in volo mostra `SALVATAGGIO…` a 0,5;
- se riesce, l'ordine salvato diventa quello nuovo e il pannello resta sulla sotto-schermata. È
  l'unico punto in cui il pannello non torna in cima da solo: il riordino si vede nella riga,
  che diventa `PERSONALIZZATO`, quando si torna.

**Gli errori:**
- `Non siamo riusciti a salvare l'ordine. Riprova.` **dentro** il piede fisso, sopra
  `SALVA ORDINE`: il piede è fuori dallo scorrimento, e l'errore resta attaccato al tasto che lo
  causa anche col corpo scorso (scelta del controller del 26/09, P3; registro, decisione 76);
- se il caricamento fallisce, `Non riusciamo a caricare l'ordine delle aree. Riprova più
  tardi.`.

**Uscire senza salvare** perde l'ordine, senza chiedere.

**L'anteprima della lista si toglie** (log §4.4).

Il salvataggio usa `salvaImpostazioni({...impostazioni, ordineAree})`, come oggi.

### C.6 Cadenza dei controlli (frame 13D)

**Il segmento a tre:** `OGNI MESE`, `OGNI 2 MESI`, `OGNI 3 MESI`, che valgono 30, 60 e 90 giorni.
Sotto c'è la nota (§I).

**Salva al tocco**, e vale dalla prossima lista costruita: §E.1 dice dove.

### C.7 Casa condivisa (frame 14–18, 26)

**I dati** vengono da `statoCasa()`, `creaInvito()`, `entraInCasa()`, `rimuoviMembro()` ed
`esciDallaCasa()` di `src/data/casa.ts`, invariati [misurato].

**Da solo (14):**
- il titolo di blocco `Fai la spesa con qualcuno?`, il testo di oggi, e `CREA UN CODICE`
  primario nel piede fisso;
- un blocco `HO UN CODICE` con un campo 44 in mono maiuscolo, 8 caratteri, e la pillola `ENTRA`,
  spenta finché i caratteri non sono 8.

**Codice creato (15):**
- un riquadro 0,04 alto 64, col codice in mono **21/700/0,16em**;
- l'`aria-label` legge il codice lettera per lettera (`Codice della casa: K 7 M …`);
- **`COPIA`** (decisione 13), una pillola 44 bianca con `--bordo`, a destra del codice dentro il
  riquadro. Chiama `navigator.clipboard.writeText(codice)`. Se riesce, la pillola dice
  `COPIATO` per 2 s. Se fallisce, compare sotto il riquadro `Non siamo riusciti a copiarlo.
  Dettalo a voce.`;
- la nota `Vale un'ora. …`;
- dopo un'ora, quando `scade_il` passa (si controlla ogni minuto e al ritorno in primo piano),
  torna `CREA UN CODICE`.

La scadenza di un'ora sta in `crea_invito()` [misurato]. Il commento di `casa.ts:143` dice «sei
caratteri, 24 ore»: è sbagliato, e si corregge in questa fase.

**Proprietario (16):**
- il blocco `LA TUA CASA`: tu per primo, con la pillola informativa `TU`, poi ogni membro con
  l'email e `TOGLI` (pillola 44), che apre il dialogo `togli` (§D);
- la nota di oggi;
- `CREA UN CODICE` secondario nel piede;
- `HO UN CODICE` non c'è.

**Membro (18):** `Sei nella casa di {email}`, il testo di oggi, e `ESCI DALLA CASA` secondario
nel piede, che apre il dialogo `esci-casa` (§D). Dopo l'uscita il pannello resta su `casa`,
nello stato «da solo», e la tessera dice `SOLO TU`.

**Gli errori** sono i testi di oggi, in 12,5 `--errore`, sotto il controllo che li ha causati.
Dall'errore di `entraInCasa` si mostra il messaggio del server, se c'è. L'errore di
`creaInvito` (`Non siamo riusciti a creare il codice. Riprova.`) sta dentro il piede fisso,
sopra `CREA UN CODICE`, come quelli di Ordine delle aree ed Esporta (registro, decisione 76).

**Lettura fallita (26):** compare solo `Non riusciamo a leggere la casa. Riprova più tardi.`,
senza RIPROVA. La tessera non mostra il valore.

### C.8 Esporta i tuoi dati (frame 19, 19A–C)

In testa c'è il testo (§I). Nel piede fisso, **un primario con quattro stati:**
1. `PREPARA IL FILE`;
2. `PREPARO IL FILE…`: opacità 0,5, `disabled`, `aria-busy`;
3. pronto: dentro il piede fisso, sopra il tasto, compare `Il file è pronto:
   dispesa-{gg-mm-aaaa}.json.`, con `role="status"`, e il tasto diventa `SALVA IL FILE`. Il
   nome mostrato è quello del file preparato (scelta del controller del 26/09, P3; registro,
   decisione 70);
4. errore: `Non siamo riusciti a preparare il file. Riprova.` e il tasto diventa `RIPROVA`.

**Non parte da solo.** Chiudendo la sotto-schermata il file preparato si perde.

Il formato e il salvataggio sono in §E.3.

### C.9 Casa, Esporta e Aree: il piede

I tre primari nel piede sono `SALVA ORDINE`, `PREPARA IL FILE` e `CREA UN CODICE`. Non usano il
`Dock` del Guscio, che sta sotto il pannello: sono un piede proprio del pannello (§B.1).

### C.10 Per quante persone cucini (riga, frame 04 e 25)

**Il campo** è numerico, 78 × 44, con `inputMode="numeric"` e l'unità `PERS` in mono 10.
- Salva all'uscita dal campo, e con Invio.
- Fuori da 1–4, o se non è un intero, torna al valore di prima e sotto la riga compare
  `Scrivi un numero da 1 a 4.`.
- La prima nota della riga è quella di oggi (`Moltiplica ogni porzione…`). Sopra 1 se ne
  aggiunge una seconda: `La lista compra per {n}. …`.

**Lo stepper si toglie** (log §4.4), e con lui `Diminuisci porzioni` e `Aumenta porzioni`.

### C.11 Da quando usi Dispesa (nota in I tuoi dati)

La leggono `leggiRisparmioTotale()` e `riassumiEvitato()` [misurato, `src/domain/risparmio.ts`,
`src/data/risparmio.ts`], con la formattazione che la Dispensa usava prima della fase 4:
- `Da quando usi Dispesa: {n} confezioni non ricomprate · {quantità} · {circa N €}`;
- quantità ed euro compaiono solo se ci sono;
- al singolare, `1 confezione non ricomprata`;
- **con zero confezioni la nota non c'è.**

Dopo Cancella la dispensa la nota non si azzera: legge solo `risparmio_settimana` [misurato].

---

## D. I dialoghi

**Il componente.** `DialogoElimina` della fase 4 si generalizza in un **`DialogoConferma`** in
`src/components/`, con questa interfaccia:

```
{ titolo, testo, azione, tono: 'distruttivo' | 'primario', inVolo, errore, onAnnulla, onConferma }
```

Vive dentro un `FoglioDalBasso` con `ruolo="alertdialog"`, `altezza="contenuto"` e
`chiudiDalVelo={false}`, come oggi [misurato]; `livello={2}` sopra un foglio o una pagina,
`livello={3}` (z 80) sopra il pannello, che sta a 70. Non si avvolge da sé: il foglio lo mette
chi lo usa (il pannello, per i suoi dialoghi). `DialogoElimina` della Dispensa diventa un suo
uso.

**Com'è fatto:**
- titolo 21/800, testo 14/1,5 in `--testo-2`;
- due tasti da 54, `flex: 1`, gap 8: `ANNULLA` secondario a sinistra, l'azione a destra;
- l'azione è piena in `--errore` se distruttiva, in `--ink` se primaria;
- in volo: opacità 0,5 e `disabled` su entrambi;
- l'errore compare in 12,5 sotto i tasti;
- il dialogo si chiude solo quando l'azione riesce.

**Il velo del dialogo non chiude.** Il log (§4.6) dice che chiude come ANNULLA. Vale DESIGN.md
§8 e il codice della fase 4: vedi §N.

**I sei dialoghi:**

| Id | Titolo | Testo | Azione | Tono | Errore |
|---|---|---|---|---|---|
| `rimuovi-pasto` | `Togliere {nome}?` | `Se ne vanno anche i suoi {n} piatti, e il pasto sparisce dal piano. Non si può annullare.` (a 1: `Se ne va anche il suo piatto, …`) | `TOGLI` | distruttivo | `Non siamo riusciti a salvare. Riprova.` |
| `riparti` | `Ripartire dalla settimana 1?` | `Da lunedì {data} il piano riparte dalla settimana 1 di {n}. Le settimane già create non cambiano.` | `RIPARTI DA LUNEDÌ` | distruttivo | `Non siamo riusciti a ripartire. Riprova.` |
| `togli` | `Togliere {email} dalla casa?` | `Non vedrà più la tua lista, il piano e la dispensa, e torna ai suoi dati. Per rientrare le serve un codice nuovo.` | `TOGLI` | distruttivo | `Non siamo riusciti a togliere. Riprova.` |
| `esci-casa` | `Uscire dalla casa di {email}?` | `Torni alla tua lista, al tuo piano e alla tua dispensa, come li avevi lasciati. Per rientrare ti serve un codice nuovo.` | `ESCI DALLA CASA` | distruttivo | `Non siamo riusciti a uscire. Riprova.` |
| `cancella-dispensa` | `Cancellare la dispensa?` | `Tutto quello che risulta in casa torna a zero, anche le confezioni in congelatore e i pronti. Piatti e piano restano. Non si può annullare.` | `CANCELLA` | distruttivo | `Non siamo riusciti a cancellare la dispensa. Riprova.` |
| `esci` | `Uscire da Dispesa?` | `I tuoi dati restano. Per rientrare ti mandiamo un link a {email}.` | `ESCI` | primario | `Non siamo riusciti a farti uscire. Riprova.` |

`{data}` è il lunedì corrente in forma lunga, come nella nota della rotazione (`24 agosto`).

**Senza utente letto** (`leggiUtente` non lancia: se la lettura fallisce torna nome ed email
vuoti), il testo di `esci` è `I tuoi dati restano. Per rientrare ti mandiamo un link via
email.`, invece di «… un link a .»; e con nome ed email entrambi vuoti la riga informativa del
gruppo Account non c'è, resta solo Esci (scelte del controller del 26/09; registro, decisioni
38 e 39, fra le domande per Andrea).

**Dopo `cancella-dispensa`**, la nota della riga diventa `Cancellata il {gg/mm} alle {hh:mm}.`
fino alla chiusura del pannello.

---

## E. Le funzioni nuove: dati e dominio

### E.1 La cadenza dei controlli

**Il dato.** È la migrazione **`0015_cadenza_e_dispensa.sql`**:

```sql
alter table settings
  add column giorni_controllo int not null default 90
  check (giorni_controllo in (30, 60, 90));
```

La RLS di `settings` è già quella della casa (`settings_casa`) e non cambia [misurato].

Nel tipo `Impostazioni` (`src/domain/types.ts`) entra `giorniControllo: GiorniControllo`, col
tipo `GiorniControllo = 30 | 60 | 90` definito lì e riesportato da `pantry.ts`.
`leggiImpostazioni` lo legge (default 90); `salvaImpostazioni` lo scrive e lo valida.

**Il dominio.**
- `GIORNI_CONTROLLO_STAPLE` diventa il **default**, `GIORNI_CONTROLLO_DEFAULT = 90`, e il nome
  vecchio sparisce (piano, Task 3: lo usano solo quattro file, che cambiano tutti).
- `serveControllo` prende `giorniControllo` nell'input
  (`{ ultimoAcquisto, ultimoCheck, oggi, giorniControllo }`).
- `costruisciLista` lo passa da `impostazioni.giorniControllo` (regola 7,
  `src/domain/list-builder.ts:180-192` [misurato]).
- Nessun'altra regola cambia.

**La lista si congela alla conferma del Piano** [misurato il 25/09 dal piano, `src/data/lista.ts`
e `piano/page.tsx`]: l'ipotesi del 25/09, «si ricalcola a ogni lettura», era falsa. I controlli
nascono solo in `generaListe`, che gira una volta per settimana, a `CONFERMA E CREA LA LISTA`;
`leggiListe` rilegge le righe congelate, e `allineaTopUp` non aggiunge controlli. Quindi:
- **la cadenza vale dalla lista della prossima settimana confermata**; quella già creata non
  cambia. Il testo di §C.6 («vale dalla prossima lista costruita») è vero alla lettera;
- **l'etichetta segue subito l'impostazione**: `CONTROLLO OGNI …` arriva da `leggiListe` con la
  cadenza di adesso, mentre le righe già congelate sono state scelte con quella di prima. La
  differenza dura al più fino alla prossima conferma. Congelarla chiederebbe una colonna in
  `shopping_list`, e non vale una migrazione.

**La Riga di controllo.** Oggi `RigaControllo` mostra `CONTROLLO OGNI 90 GIORNI`, preso dalla
costante [misurato]. Diventa `CONTROLLO OGNI MESE`, `CONTROLLO OGNI 2 MESI` o `CONTROLLO OGNI 3
MESI`, da una prop `giorniControllo` che la Lista passa dalle impostazioni. La funzione pura
`testoCadenza(giorni)` sta in `src/domain/pantry.ts` e serve anche al valore della riga nel
pannello. Accanto a lei `ogniCadenza` e `fraCadenza` rendono la cadenza nei due testi che oggi
dicono «90 giorni» (decisione 20, §I).

### E.2 Cancella la dispensa

**Cosa vuol dire** [misurato sulle tabelle]: «cosa c'è in casa» sta in `pantry_state`, che tiene
residuo, date, `congelato` e `scadenza_manuale`, e in `porzione_pronta`, che tiene i lotti dei
Pronti. **`shopping_list_item.residuo` ne tiene una copia congelata** alla creazione della lista
[misurato dal piano il 25/09]: `chiudiSpesa` la riscrive in `pantry_state` alla chiusura della
spesa. `purchase` è lo storico, e resta.

**Una funzione SQL** nella stessa migrazione 0015:

```sql
create function public.cancella_dispensa() returns void
language plpgsql security invoker set search_path = public as $$
declare
  casa uuid := public.casa_id();
begin
  if casa is null then
    raise exception 'non autenticato';
  end if;

  -- (D1) i pasti di oggi e dei giorni dopo «dai pronti» tornano normali
  update meal_slot set da_pronti = false
   where user_id = casa and da_pronti and data >= current_date;

  -- (D2) le liste non chiuse perdono il residuo congelato
  update shopping_list_item set residuo = 0
   where user_id = casa and residuo <> 0
     and shopping_list_id in (
       select sl.id from shopping_list sl join week w on w.id = sl.week_id
        where sl.user_id = casa and w.stato <> 'chiusa');

  delete from porzione_pronta where user_id = casa;
  delete from pantry_state   where user_id = casa;
end $$;

revoke execute on function public.cancella_dispensa() from public, anon;
grant execute on function public.cancella_dispensa() to authenticated;
```

- È `security invoker`: valgono le policy di casa già in vigore, e un membro cancella la
  dispensa della casa in cui sta, come oggi può già cambiarla.
- È una transazione sola: o tutto o niente.
- Si cancellano le righe invece di azzerarle, così gli ingredienti tornano «mai comprati», come
  prima del primo acquisto. È il senso di «torna a zero», e la Dispensa mostra il suo stato
  vuoto.
- Il wrapper è `cancellaDispensa()` in `src/data/dispensa.ts`.

**Perché i due `update`** [misurato dal piano il 25/09, Task 4; decisioni 17 e 18]:
- **D1.** `da_pronti = true` vuol dire «la porzione è già stata presa dal lotto», e il pasto non
  ricorda da quale. Senza l'`update`, un pasto di oggi o dei giorni dopo resterebbe «dai pronti»
  senza porzione: la lista non lo comprerebbe, e spegnerlo dal Piano creerebbe un lotto
  fantasma. Il filtro è la data e non lo stato della settimana: una settimana `chiusa` (spesa
  fatta) ha spesso giorni ancora davanti. I pasti passati sono porzioni già mangiate, e
  toccarli falserebbe il ledger degli storni. Così regge l'invariante: dopo la cancellazione
  nessun pasto del piano dipende da un lotto che non esiste, e i piatti e le scelte restano;
- **D2.** `chiudiSpesa` riscrive il residuo di `pantry_state` da quello congelato in
  `shopping_list_item`: senza l'azzeramento, la dispensa appena cancellata risorgerebbe alla
  chiusura della spesa per gli ingredienti della lista aperta. Le settimane `chiusa` non si
  toccano: la loro chiusura è già avvenuta;
- `porzioni_preparate` non si tocca: è il piano («cucina N in più»), e il piano resta.
- **[ipotesi]** `current_date` è il giorno UTC dell'app solo se il database gira in UTC, il
  default di Supabase: si controlla con `show timezone;` quando si applica la migrazione.

I limiti che restano (una cottura pianificata che perde il suo lotto, la lista aperta calcolata
sul residuo di prima) stanno nel registro dell'esecuzione e, a fine fase, in §L.

**Dopo il successo**, la Dispensa aperta sotto il pannello si rilegge. Il pannello pubblica un
evento `spesa:dispensa-cambiata` sul `window`, e la pagina Dispensa lo ascolta. Il risparmio non
si tocca.

### E.3 Esporta i tuoi dati

**Il formato è JSON** (log §8, deciso qui): leggibile, senza librerie, e rileggibile un domani.
Il file si chiama `dispesa-{gg-mm-aaaa}.json` e ha questa forma:

```
{
  "formato": 1,
  "app": "dispesa",
  "versione": "<NEXT_PUBLIC_VERSIONE>",
  "esportatoIl": "<ISO 8601>",
  "impostazioni": { ...Impostazioni },
  "pasti": [ ...MealSlotDef ],
  "ingredienti": [ ...Ingredient ],
  "piatti": [ ...Dish con ingredienti e opzioni ],
  "piano": [ { "lunedi": "aaaa-mm-gg", "stato": "...", "pasti": [ ...MealSlot ] } ],
  "dispensa": { "stato": [ ...PantryState ], "pronti": [ ...porzione_pronta ] }
}
```

**Da dove vengono i dati:**
- `leggiImpostazioni`, `leggiSlotDefs`, `leggiIngredienti`, `leggiRepertorio`, `leggiDispensa`
  [misurato, tutte lato client];
- una funzione nuova, `leggiTutteLeSettimane()` in `src/data/settimana.ts`, perché oggi si
  leggono solo per `weekId`. Legge `week` in una query e `meal_slot` **a pagine** (`range()`),
  finché una pagina torna vuota: PostgREST taglia ogni risposta a un massimo di righe (1000 di
  default **[ipotesi: il valore di questo progetto non è misurato]**), e con sei pasti al giorno
  1000 righe sono 24 settimane. Una query secca darebbe un file troncato in silenzio;
- i Pronti con `leggiPronti()` di oggi, che restituisce tutti i lotti, decaduti compresi
  [misurato dal piano il 25/09]: nessuna funzione nuova.

**La composizione** è una funzione pura, `componiEsportazione(...)`, in
`src/domain/esporta.ts`, e si testa senza rete.

**`SALVA IL FILE`:**
- se `navigator.canShare?.({ files: [file] })` è vero, apre il foglio di condivisione del
  sistema con `navigator.share({ files: [file] })`;
- se no, fa un download: `URL.createObjectURL` e un `<a download>` cliccato da codice, poi
  `revokeObjectURL`;
- se l'utente annulla la condivisione (`AbortError`), non è un errore e il tasto resta
  `SALVA IL FILE`;
- se la condivisione fallisce per un altro motivo, il file si scarica (D4, confermato da Andrea
  il 26/09).

**Resta fuori:** l'import del file esportato. Non c'è in questa fase, e il testo non lo promette.

### E.4 Esci

**Il logout, che oggi non esiste** (`signOut` non compare nel repo [misurato]). Alla conferma del
dialogo:
1. `client().auth.signOut({ scope: 'local' })` (decisione 19): esce da questo telefono, non
   dagli altri dispositivi dell'account (il default di auth-js è `global`). **`esci()` lancia
   solo se dopo l'errore la sessione c'è ancora**: `signOut` di auth-js 2.112.4 cancella la
   sessione locale anche quando la chiamata al server fallisce, e poi restituisce l'errore
   [misurato dal piano il 25/09 in `GoTrueClient._signOut`]. Se la sessione c'è ancora, il
   dialogo resta aperto con l'errore, senza pulizia; se non c'è più, l'uscita è avvenuta e si
   va avanti come se fosse andata liscia.
2. `cancellaIstantaneaLista()` e `svuotaCoda()`, come fanno già `entraInCasa` ed `esciDallaCasa`
   [misurato]: su questo telefono non resta la lista di un account che non c'è più.
   **[ipotesi]** Se ci sono spunte in coda non ancora mandate, si perdono. Oggi succede lo
   stesso uscendo dalla casa. Si scrive fra i limiti (§L).
3. `dimenticaIdCasa()` e `dimenticaIniziale()`.
4. `window.location.replace('/entra')`: una navigazione piena, che svuota le cache di modulo e
   non passa dalla Lista.

La funzione è `esci()` in un file nuovo, `src/data/sessione.ts`.

---

## F. L'editor dell'ingrediente dal pannello (frame 12)

**La route resta** `/piatti/[id]/ingredienti/[ingId]` (con `id = nuovo` e `?torna=impostazioni`)
[misurato]: è anche l'editor degli ingredienti dei piatti. **Le modifiche di questa sezione
valgono per entrambi gli ingressi.** Cambia solo il ritorno, che dipende da `torna`.

**Testata e tab bar:**
- la testata ha un tondo 44 con la freccia
  (`aria-label="Torna agli ingredienti"` con `torna=impostazioni`, altrimenti `Torna al
  piatto`), sotto il reparto in etichetta mono col quadratino, poi il nome 32/800;
- il nome è il campo di oggi, reso a 32/800;
- la tab bar è nascosta con `useNascondiBarra`, come nella fotocamera della fase 3 [misurato].

**I campi del disegno**, nell'ordine:
1. `AREA`: sei pillole da 44;
2. `CONFEZIONE`: campo da 96 + segmento `G / ML / PZ`;
3. `SCANSIONA LA CONFEZIONE` (§F.1);
4. `COME SI CONSUMA`: segmento a tre;
5. `Fresco`: `Sì / No` (oggi si chiama `Deperibile`);
6. la nota di oggi.

**I campi di oggi che il disegno non mostra restano (§N):**
- `Prezzo di una confezione`, facoltativo, dopo Fresco;
- `ELIMINA`, in coda, col suo dialogo di oggi reso con `DialogoConferma`.

**`SALVA` sta nel Dock**, e il tasto dice `SALVA`, come nel frame 12 e nel log §4.5 [misurato
sul disegno]; oggi dice `SALVA INGREDIENTE` (confermato dal controller il 26/09). Con la barra
nascosta il Dock va a `bottom 22`.
- È spento finché niente cambia; in volo mostra `SALVATAGGIO…` a 0,5.
- L'errore compare sopra il Dock.
- `ANNULLA` si toglie: la freccia fa quel lavoro.

**Il ritorno:**
- **con `torna=impostazioni`**, freccia e SALVA riaprono il pannello su `ingredienti`
  all'altezza salvata (§A.3, §A.5). La freccia non chiede niente, e le modifiche si perdono;
- **senza `torna`**, vale il comportamento di oggi verso il piatto.

**Il difetto di oggi [misurato].** La freccia della testata porta sempre a `/piatti/{dishId}`: con
`dishId = nuovo` finisce nell'editor di un piatto nuovo. Si corregge: la freccia segue `torna`,
come già fanno ANNULLA e SALVA.

### F.1 Scansione nell'editor

**Il tasto** `SCANSIONA LA CONFEZIONE` è un secondario da 54, sempre visibile. Apre la vista di
lettura della fase 4, **`LettoreCodice`** (`src/app/(app)/dispensa/LettoreCodice.tsx`), col campo
per digitare il codice [misurato], in un `FoglioDalBasso` con `TestataFoglio` sopra l'editor. Il
foglio ha profondità 1 per `useIndietroFogli`. Fino al 26/09 qui c'era `Scanner`
(`src/components/Scanner.tsx`): è il componente di `/lista/confezioni` della fase 2, non la
vista della fase 4, e ha un `ANNULLA` alto 40 (scelta del controller del 26/09).

**Letto il codice:**
1. chiede il formato a `/api/prodotto/[ean]`, come fa la fase 4 in Nuovo ingrediente;
2. su un ingrediente **nuovo** riempie `CONFEZIONE` e l'unità, se l'API li dà. Su un
   ingrediente che **esiste** l'unità non cambia mai: il formato si riempie solo se l'unità del
   catalogo è quella del modulo, altrimenti compare il messaggio della fase 4 (`Unità diversa
   (ml contro g): scrivi il formato a mano.`) e formato e unità restano. Un'unità cambiata su
   un ingrediente usato nei piatti rompe la generazione della lista (`convertiInUnitaBase`
   lancia `UnitaIncompatibileError`, che `generaListe` non cattura): è la regola della fase 4
   per il dettaglio della Dispensa (`esitoDaCatalogo`, `formatoProposto`) (registro, decisioni
   88 e 93, scelta del controller del 26/09);
3. tiene l'EAN nello stato del modulo;
4. chiude il foglio.

**Niente si scrive fino a SALVA**, che passa `ean` a `salvaIngrediente`: la funzione lo accetta
già [misurato, `repertorio.ts:172-193`]. Qui non si usa `aggiornaFormatoDaScansione`, che tocca
le righe della lista della settimana.

**Se il prodotto è sconosciuto**, sotto il tasto compare `Non conosciamo questo prodotto: scrivi
tu la confezione.`, e l'EAN resta comunque legato al SALVA.

**Se l'EAN è già legato a un altro ingrediente:** il comportamento è quello della fase 4 in Nuovo
ingrediente. Il piano lo legge in `src/data/confezioni.ts` e nella spec della fase 4 §F, e lo
applica uguale.

---

## G. Tab bar a tre voci e Piatti fuori dalla barra

### G.1 Tab bar (log §3, frame 01–02)

**Le voci** in `TabBar.tsx` diventano tre: Lista, Piano, Dispensa.

**Le misure:**

| | Grande | Ridotta |
|---|---|---|
| Larghezza | 304 | 244 |
| Altezza | 84 | 66 |
| Voci | 96 × 72 | 76 × 54 |

- La barra è centrata con `left: 0; right: 0; margin: 0 auto`.
- Restano `bottom 22`, padding 6, gap 2.
- La voce attiva sta su 0,07.
- `--fine` passa da 128 a 110, come prima.

**I token cambiano:**
- `--barra-lato` e `--barra-lato-giu` escono;
- entrano `--barra-larga: 304px`, `--barra-larga-giu: 244px`, `--barra-voce-larga: 96px`,
  `--barra-voce-larga-giu: 76px`;
- `.anim-barra` anima `width` e `height`, non più `left` e `right`.

La modifica tocca `tokens.css`, `globals.css` e `DESIGN.md`, e `npm run design:token` resta
verde.

**Il Dock** resta a 16 dai lati.

**Nessuna voce attiva** su `/piatti`, `/importa` e nell'editor dell'ingrediente.

### G.2 Piatti aperto dal pannello (log §5, frame 22)

**`Testata` in modo indietro** diventa una pillola:
- alta 44, su 0,07, con la freccia 20 e un'etichetta mono 11;
- `aria-label` dice dove porta;
- sotto, il titolo 52;
- niente Menù utente.

La prop `indietro` di oggi, che porta sempre a `/impostazioni`, diventa
`indietro?: { etichetta: string; onTorna: () => void }`.

**Piatti** legge `da` da `window.location.search`:

| `da` | Etichetta | `aria-label` | Porta a |
|---|---|---|---|
| `impostazioni` (o assente) | `IMPOSTAZIONI` | `Torna alle impostazioni` | il pannello sopra l'origine (§A.5) |
| `lista` | `LISTA` | `Torna alla lista` | `/lista` |
| `piano` | `PIANO` | `Torna al piano` | `/piano` |

**`da` si conserva** in `sessionStorage` (`spesa:piatti-da`). Così l'editor del piatto, che
torna a `/piatti` [misurato: `href="/piatti"` e `router.push('/piatti')`], ritrova la stessa
pillola.

**I link degli stati vuoti** prendono `da`:
- `lista/page.tsx:518` (`COMINCIA DAI PIATTI`) → `/piatti?da=lista`;
- `piano/page.tsx:562` → `/piatti?da=piano`.

**Il resto di Piatti non cambia:** ricerca, `Nuovo piatto`, Righe piatto, stato vuoto.

### G.3 Importa

Importa ha oggi `Testata indietro` verso `/impostazioni` [misurato, `importa/page.tsx:718`].
Prende la pillola `IMPOSTAZIONI`, che riapre il pannello sopra l'origine (§A.5).

`TORNA A IMPOSTAZIONI` nella schermata «Questa dieta non ha un menu» (riga 465) fa lo stesso.

Il successo va ancora a `/piano`.

---

## H. Il Piano a sei pasti a 360 (log §6, frame 27)

**`StrisciaGiorni.tsx`:**
- i pallini da 5 stanno in una griglia a 3 colonne, gap 3;
- fino a tre pasti una riga, da quattro a sei due righe; la prima riga è sempre piena;
- da quattro pasti il riquadro del giorno cresce di 8;
- **decade `gapPallini = slotDefs.length > 5 ? 2 : 3`** (riga 39 [misurato]): il gap torna 3
  per tutti.

**I pallini:**
- pieno in `--ink`, bianco sul giorno selezionato;
- vuoto a contorno 1 px a 0,20, bianco a 0,62 sul selezionato.

L'`aria-label` del giorno resta col numero di pasti a casa.

**[misurato sul disegno]** A 360 ogni giorno è largo 44,3 e la griglia occupa 21: 3 × 5 + 2 × 3.

**Il giorno** mostra le sue Righe pasto (68, gap 9 come nel codice di oggi [misurato:
`piano/page.tsx:573`]; il disegno diceva 8, e resta 9 per scelta del controller del 26/09), fino
a sei. I pasti fuori casa restano senza apertura né kebab, come oggi. La coda sotto il Dock è
194.

**DESIGN.md §4.** 360 entra nel mandato per le schermate coi pasti: matrice, striscia, giorno
del Piano. Il paragrafo sul gap 2 si riscrive.

---

## I. Copy che cambia

**Testi nuovi o cambiati.** Quelli che non sono qui restano quelli di oggi.

| Dove | Oggi | Dopo |
|---|---|---|
| Menù utente, `aria-label` | `Impostazioni` | `{Nome}: profilo e impostazioni`; prima che il nome sia letto, `Profilo e impostazioni` (scelta del controller del 26/09) |
| Pannello, X | — | `Chiudi le impostazioni` |
| Sotto-schermata, freccia | — | `Torna alle impostazioni` |
| Tessere | — | §B.3 |
| Separatore | — | `SI CAMBIANO DI RADO` |
| Titoli dei blocchi | `I TUOI PASTI` · `ROTAZIONE DEL PIANO` · `REPERTORIO` · `CASA` · `SUPERMERCATO` · `DIETA DEL NUTRIZIONISTA` | `La settimana di base` · `Come calcolo la lista` · `Come la vedi in corsia` · `I tuoi dati` · `Account` |
| Riga Pasti a casa | — | `Pasti a casa` · `Il default con cui nasce ogni settimana nuova.` · `{N} FUORI CASA` / `NESSUNO FUORI CASA` (nota dal disegno, decisione 20) |
| Riga Gestione | — | `Gestione dei pasti` · `Quanti pasti fai al giorno e come si chiamano.` · `{N} PASTI` |
| Riga Rotazione | — | `Rotazione del piano` · `Se il tuo piano si ripete a blocchi di settimane.` · `NESSUNA` / `{N} SETT.` |
| Riga Ingredienti | `Ingredienti` · `AREA, CONFEZIONE, COME SI CONSUMA` | `Ingredienti` · `Area, confezione e come si consuma.` |
| Riga Ordine | `Ordine dei reparti` | `Ordine delle aree` · `L'ordine in cui compaiono in Lista: mettilo come gira il tuo supermercato.` · `PERSONALIZZATO` / `DI BASE` (nota dal disegno, decisione 20) |
| Riga Cadenza | — | `Cadenza dei controlli` · `Ogni quanto ti chiedo se hai ancora olio, sale, farina.` · `OGNI MESE` / `OGNI 2 MESI` / `OGNI 3 MESI` (nota dal disegno, decisione 20) |
| Riga Esci | — | `Esci` · `Per rientrare ti serve il link che ti mandiamo via email.` |
| Riga Cancella | — | `Cancella la dispensa` · `Svuota quello che hai in casa. I piatti e il piano restano.`; dopo: `Cancellata il {gg/mm} alle {hh:mm}.` fino alla chiusura del pannello (nota dal disegno, decisione 20) |
| Piede | — | `Versione {x}` |
| Matrice, nota | `Acceso vuole dire a casa. …` (DESIGN.md) | `La casetta vuol dire che quel pasto lo fai a casa. Ogni settimana nuova nasce così: nel Piano puoi correggere il singolo giorno senza cambiare questo default.` |
| Matrice, cella fuori | — | `{Giorno} {pasto}: di base fuori casa, tocca per mettere a casa` |
| Matrice, riepilogo | — | `Di base sei a casa per {a} pasti su {t}. La Lista conta solo quelli: i {f} fuori casa non entrano nella spesa.`; a zero fuori casa `Di base sei a casa per tutti i {t} pasti.`; a uno fuori casa la seconda frase è `La Lista conta solo quelli: l'unico fuori casa non entra nella spesa.`; a un pasto a casa la prima è `Di base sei a casa per 1 pasto su {t}.` (disegno e varianti del piano, decisione 20) |
| Gestione, limiti | — | `Tre pasti sono il minimo.` · `Sei pasti sono il massimo.` |
| Gestione, nota | `… nella Settimana correggi solo le eccezioni …` | `… nel Piano correggi solo le eccezioni …` |
| Rotazione, contatore | `ORA SEI ALLA {k} DI {n}` | `SETTIMANA {k} DI {n}` |
| Rotazione, riparti | `RIPARTI DALLA SETTIMANA 1` → `SICURO? RIPARTI DA LUNEDÌ` | `RIPARTI DALLA SETTIMANA 1` → dialogo `riparti` (§D) |
| Porzioni | stepper, `Diminuisci porzioni` / `Aumenta porzioni` | campo `PERS`, `aria-label="Per quante persone cucini, da 1 a 4"` (dal disegno, decisione 20); errore `Scrivi un numero da 1 a 4.` |
| Cadenza, etichetta | — | `OGNI QUANTO TI CHIEDO` (dal disegno, decisione 20) |
| Cadenza, nota | — | `Ogni quanto ti chiedo se hai ancora olio, sale, farina. La domanda compare in Lista, nell'area del prodotto.` |
| Riga di controllo (Lista) | `CONTROLLO OGNI 90 GIORNI` | `CONTROLLO OGNI MESE` / `… OGNI 2 MESI` / `… OGNI 3 MESI` |
| Lista fatta, `CHIUDENDO LA SPESA` | `… Serve solo a ricordarti fra 90 giorni che l’olio sta per finire: …` | `… fra un mese …` / `… fra 2 mesi …` / `… fra 3 mesi …`, con la cadenza scelta; il resto della frase non cambia (decisione 20) |
| Editor ingrediente, spiegazione «a stima» | `Non vale la pena contarlo a grammi. Ogni 90 giorni dall’ultimo acquisto la lista ti chiede se ne hai ancora.` | `Non vale la pena contarlo a grammi. Ogni mese / Ogni 2 mesi / Ogni 3 mesi dall’ultimo acquisto la lista ti chiede se ne hai ancora.`, con la cadenza scelta (decisione 20) |
| Ordine, errore di caricamento | `Non riusciamo a caricare l'ordine dei reparti. Riprova più tardi.` | `Non riusciamo a caricare l'ordine delle aree. Riprova più tardi.` |
| Ordine, anteprima | `ANTEPRIMA DELLA LISTA` / `DALL'ALTO IN BASSO` | tolta |
| Impostazioni, errore di caricamento | `Non riusciamo a caricare le impostazioni. Riprova più tardi.` | `Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.` + `RIPROVA` |
| Casa, proprietario | `TOGLI` → `SICURO?` | `TOGLI` → dialogo `togli`; tu per primo con `TU` |
| Casa, membro | `ESCI DALLA CASA` → `SICURO?` | `ESCI DALLA CASA` → dialogo `esci-casa` |
| Casa, codice | `aria-label` `Codice della casa` | etichetta `CODICE DELLA CASA` sopra il riquadro (dal disegno, decisione 20); `Codice della casa: {lettere separate}`; `COPIA` / `COPIATO`; `Non siamo riusciti a copiarlo. Dettalo a voce.` |
| Casa, proprietario, `TOGLI` | `aria-label` assente | `Togli {email} dalla casa` (dal disegno, decisione 20) |
| Ingredienti, riga | — | `aria-label="Apri {nome}"` (dal disegno, decisione 20) |
| Esporta | — | `Un file con i tuoi piatti, il piano e la dispensa, da tenere: serve se cambi telefono o vuoi una copia.` · `PREPARA IL FILE` · `PREPARO IL FILE…` · `Il file è pronto: dispesa-{gg-mm-aaaa}.json.` · `SALVA IL FILE` · `Non siamo riusciti a preparare il file. Riprova.` · `RIPROVA` |
| Dialoghi | — | §D |
| Importa, tessera | `Importa la dieta` · `DA FOTO O PDF, SOSTITUISCE IL PIANO ATTUALE` | `Importa un piano` · `Da PDF o foto. Sostituisce il piano attuale.` |
| Testata indietro | freccia, `aria-label` `Indietro` | pillola `IMPOSTAZIONI` / `LISTA` / `PIANO`, `Torna alle impostazioni` / `alla lista` / `al piano` |
| Editor ingrediente, freccia | `Indietro` verso `/piatti/{id}` | `Torna agli ingredienti` / `Torna al piatto` |
| Editor ingrediente | `Deperibile` · `ANNULLA` · `SALVA INGREDIENTE` | `Fresco` · via `ANNULLA` · `SALVA` · `SCANSIONA LA CONFEZIONE` · `Non conosciamo questo prodotto: scrivi tu la confezione.` |
| Tab bar | `Piatti` | tolta |

---

## J. L'animazione d'avvio del Marchio (log §1, Avvio 3a)

**Quando parte.** All'apertura dell'app: il primo montaggio del `Guscio` in un caricamento di
pagina, **solo su `/lista`** (lo `start_url` della PWA [misurato]) e solo una volta per sessione
di navigazione (flag `spesa:avvio-visto` in `sessionStorage`). Con
`prefers-reduced-motion: reduce` non parte: il Marchio è già al suo posto.

**Com'è fatta.** È un livello `fixed`, sopra tutto, con `pointer-events: none` e fondo a
gradiente (§2.4). Al centro c'è il Marchio grande: caselle 40, gap 10, raggio 11,2, bordo 2,
`box-sizing: border-box`, nei sei colori pieni in ordine fisso. I tempi:

| Tempo | Cosa succede |
|---|---|
| 0–1045 ms | ogni casella fa il pop `pb`: 620 ms `linear`, scala `0 → 1,32 (40%) → 0,93 (62%) → 1,05 (80%) → 0,99 (92%) → 1`, opacità 0 → 1 entro il 40%. Ritardi in ordine di griglia `0, 340, 170, 255, 85, 425` ms |
| 1045–1200 ms | pausa |
| 1200–1820 ms | il Marchio va al suo posto in 620 ms `cubic-bezier(.2,.8,.25,1)`: `translate` + `scale` calcolati al volo |
| 1200–1620 ms | il fondo del livello si dissolve, e la Lista, già pronta sotto, si vede |
| 2100 ms | il livello si smonta |

**Dove va il Marchio (deciso da Andrea il 25/09, decisione 16).** Sull'icona della voce Lista
nella tab bar, non in testata come nella variante 3a: DESIGN.md §8 Testata dice che il Marchio
**non è più in testata** (19/09). Il punto d'arrivo si calcola dal `getBoundingClientRect` del
Marchio della barra; negli ultimi 120 ms il Marchio in volo si dissolve in quello della barra,
perché il rapporto fra gap e lato non è identico (10/40 contro 4/9). Con la barra ridotta o
assente (nessuna delle due all'apertura su `/lista`) il volo non parte e il livello si dissolve.

**Non ritarda niente.** Il livello non intercetta tocchi, e `PrimoAvvio` e i dati caricano sotto
di lui come oggi. La Lista non ha un'animazione d'ingresso propria: il titolo e le tessere della
3a che salgono di 12 px non si fanno, perché DESIGN.md §7 vieta gli ingressi di pagina (§N).

**È un'eccezione dichiarata a §7:** dura oltre 250 ms e non segue un gesto. Si scrive in
DESIGN.md §7 e §13 come `.anim-avvio`, con la ragione: accade una volta sola, all'apertura, ed è
il marchio.

---

## K. `DESIGN.md`, token e ponte

**Prima del codice**, primo task del piano, si aggiorna `DESIGN.md` con le eccezioni del log §7:
- **§4** cornice: 360 entra nel mandato per le schermate coi pasti; si riscrive il paragrafo sul
  gap 2;
- **§7** movimento: `.anim-pannello` e `.anim-avvio`;
- **§8 Tab bar:** tre voci, larghezza propria 304 / 244, voci fisse;
- **§8 Testata:** modo indietro a pillola con etichetta;
- **§8 Pannello impostazioni:** a tutta larghezza, senza bordo, raggio solo in alto, due livelli
  (tessere + `SI CAMBIANO DI RADO`), piede fisso col primario nelle tre sotto-schermate, riga
  Esci **accesa** e in `--errore`, piede senza «ultimo salvataggio»;
- **§8 Riga di impostazione:** il finale «campo numerico» usato per le porzioni;
- **§8 Matrice dei pasti:** la casetta al posto del pallino, la nota nuova, 360;
- **§8 Striscia dei giorni:** i pallini in griglia a 3 colonne;
- **§8 Aggiungi tratteggiato** in fondo, in Gestione dei pasti;
- **§8 Dock:** a `bottom 22` quando la barra è nascosta (editor ingrediente);
- **§8 Dialogo di conferma:** il tono `primario` in `--ink` (Esci), e il componente generico;
- **§3:** mono 21/700/0,16em per il codice della casa;
- **§2.2:** `--errore` sul nome della riga Esci;
- **§9 Conferme:** Esci chiede conferma pur essendo reversibile; Togli pasto solo con piatti;
  sparisce il doppio tocco `SICURO?`;
- **§13:** «Decisioni del 25/09/2026 (fase 5: Impostazioni)», con le decisioni 1–16.

Le eccezioni del log §7 che riguardano la Dispensa (`lucev`, `lucet`, onda, long-press, icona AI,
scheletro) sono **già** in DESIGN.md dalla fase 4 [misurato]. Non si riscrivono.

**I token nuovi** vanno in `tokens.css` e `globals.css`, verificati da
`npm run design:token`:
- le larghezze della barra (§G.1);
- `--z-pannello`, se serve un token per lo z-index.

**Il ponte** `docs/superpowers/specs/DESIGN-SYSTEM.md`: le righe Pannello impostazioni, Riga di
impostazione, Matrice, Tab bar, Testata, Dialogo di conferma e Marchio (avvio) vanno allo stato
«in codice», col loro file.

---

## L. Errori e casi limite

- **Salvataggi che si incrociano.** La coda serializzata delle scritture di oggi resta
  [misurato]: due tocchi veloci su celle diverse non si pestano. Una rilettura silenziosa del
  pannello che vede partire una scrittura mentre è in volo si scarta (review finale, M1).
- **La pagina sotto il pannello.** Dopo un salvataggio riuscito (ordine, cadenza, persone,
  rotazione, pasti) il pannello pubblica `spesa:impostazioni-cambiate`; la Lista rifà il
  caricamento intero, il Piano si rilegge in silenzio (review finale, I2) [misurato nei test].
- **Pasti in una casa condivisa.** Dal pannello si cancellano solo i pasti tolti a schermo: un
  pasto aggiunto dall'altro membro dopo l'apertura resta, coi suoi piatti (review finale, I4)
  [misurato nei test]. La semina del primo avvio cancella come prima.
- **Rifiuto RLS** (la casa è cambiata): si ricarica tutto e si mostra il messaggio di §B.5.
- **Pannello aperto e cambio di casa da un altro telefono:** vale la stessa regola al primo
  salvataggio. Non c'è un ascolto in tempo reale.
- **Il codice della casa scade col pannello aperto:** il controllo al minuto o al ritorno in
  primo piano riporta `CREA UN CODICE` (§C.7).
- **Esporta con molti dati:** tutto sta in memoria sul telefono. Con i volumi di un utente vero
  (centinaia di piatti, decine di settimane) è sotto il megabyte **[ipotesi]**.
- **Esci con spunte in coda:** si perdono (§E.4). Con la rete la coda si svuota in pochi
  secondi, quindi il caso è stretto; si scrive e non si corregge.
- **Cancella la dispensa da un membro:** cancella la dispensa della casa (§E.2), come il testo
  lascia intendere.
- **Rimuovi pasto mentre un altro telefono ci aggiunge un piatto:** il conteggio del dialogo può
  essere vecchio di un piatto. Si accetta: il dialogo dice già che i piatti se ne vanno.
- **Link a `/impostazioni*` da vecchie schede:** fanno da rimando (§A.1).
- **Gesto indietro dopo `?impostazioni=` su una sotto-schermata:** porta in cima al pannello,
  prima di chiuderlo (§A.4).
- **Avvio su una pagina diversa da `/lista`** (un link profondo): l'animazione non parte.

**I limiti trovati durante l'esecuzione** (26/09; il dettaglio e le prove stanno nel registro
`docs/2026-09-25-fase5-decisioni-esecuzione.md`, alla sezione del task):
- **Una cottura pianificata per domani o dopo perde il suo lotto** con Cancella la dispensa:
  dopo la cottura le porzioni non compaiono in Dispensa finché N non si cambia dal Piano (C3(a),
  Task 4) [ipotesi, dal codice letto (`aggiornaSlot`, `porzioniUtilizzabili`), non provato su
  dati veri].
- **Cambiare N su un pasto che aveva il lotto prima della cancellazione lo ricrea intero**, non
  solo con la differenza (C3(b), Task 4) [ipotesi, dal codice letto, non provato su dati veri].
- **Con D1 = A, nelle settimane già confermate o chiuse il residuo dopo la spesa sovrastima di
  una porzione cruda per ogni pasto «dai pronti» riportato a normale**: l'`update` della
  funzione non scrive il ledger degli storni. Si corregge dalla Dispensa (Task 4, decisione di
  Andrea) [ipotesi, dal codice letto, non provato su dati veri].
- **Con D2 = A, le confezioni della lista aperta restano quelle calcolate sul residuo di prima**:
  la Lista può chiedere meno del necessario, e lo mostra nei numeri (Task 4, decisione di
  Andrea) [ipotesi, dal codice letto, non provato su dati veri].
- **Piano e Lista aperti sotto il pannello non si rileggono dopo Cancella la dispensa**: solo la
  Dispensa ascolta `spesa:dispensa-cambiata` (§E.2). Il Piano mostra `Porzione pronta` su un
  pasto che non lo è più, la Lista «in casa …», finché non si riaprono; toccare quel pasto è
  innocuo (Task 4) [misurato: chi ascolta l'evento; l'innocuità letta in `aggiornaSlot`].
- ~~**Lo stesso dopo aver tolto un pasto**~~: dalla review finale (I2) Piano e Lista si
  rileggono dopo ogni salvataggio del pannello, pasti compresi (Task 8; vedi sopra).
- **Togliere un pasto con piatti cancella a cascata anche i lotti Pronti di quei piatti**
  (`porzione_pronta.dish_id … on delete cascade`), e il dialogo `rimuovi-pasto` non lo dice
  (Task 8) [misurato, `0009_meal_prepping.sql` riga 17].
- **Togliere un pasto con un import a metà o con la lista della settimana aperta** lascia un id
  orfano nella bozza dell'import e porta via gli storni della settimana aperta; era così anche
  con la pagina di prima (Task 8) [ipotesi, non testato].
- **`current_date` di `cancella_dispensa()` dipende dal fuso del database**: al gate si controlla
  che sia UTC (`show timezone;`) (Task 4) [ipotesi, da misurare al gate].
- **La rilettura silenziosa della Dispensa dopo l'evento, se fallisce, lascia a schermo i dati di
  prima** senza segnale (Task 4) [dal codice del piano, non testato nel browser].
- **Esporta legge a pagine solo `meal_slot`**: `leggiPronti`, `leggiIngredienti` e
  `leggiDispensa` non sono paginate, e oltre il tetto di righe di PostgREST il file uscirebbe
  troncato in silenzio. Oggi i volumi ne sono lontani (Task 5) [ipotesi sui volumi; il tetto del
  progetto è da leggere al gate].
- **Esporta contiene solo i piatti attivi**: un pasto del piano può citare un `dishId` che il file
  non elenca (Task 5) [misurato, `leggiRepertorio()`; fra le domande per Andrea].
- **La cadenza cambiata vale dalla lista della prossima settimana confermata**, mentre
  l'etichetta `CONTROLLO OGNI …` della Riga di controllo segue subito l'impostazione (Task 3)
  [misurato nel codice, `generaListe` e `leggiListe`].
- **Lo scorrimento salvato degli Ingredienti si rimette per 3 s al più**: se la lista arriva dopo,
  il ritorno riparte dall'alto (Task 6, decisione 24) [misurato nel browser il 26/09 con dati
  finti: rimesso a 700 su 700, vedi il registro].
- **La pillola di Piatti, su una navigazione dal pannello, può rendere per un istante l'etichetta
  vecchia**: letta da `sessionStorage` prima che l'URL nuovo ci sia (Task 11, decisione 78)
  [misurato nel DOM il 26/09: `LISTA` per 3 ms, poi `IMPOSTAZIONI`; se arrivi allo schermo non è
  misurato].
- **Cambiare a mano l'unità di un ingrediente usato nei piatti rompe la generazione della
  lista**, come prima della fase 5: la scansione non lo fa più (§F.1), il segmento sì (Task 12)
  [letto nel codice, non riprodotto su dati veri].
- **Il cancello di `PrimoAvvio` si apre comunque dopo 4 s**: con una semina più lenta il pannello
  aperto da indirizzo può ancora correrle accanto (review finale, M2, residuo) [dal codice, non
  riprodotto].
- **La rilettura del Piano dopo le Impostazioni si scarta se nel frattempo tocchi il piano**:
  resta coi dati di prima finché non si riapre (review finale, I2) [misurato nei test].

---

## M. Test

### M.1 Unità (Vitest)

- **Dominio:**
  - `serveControllo` con 30, 60 e 90, e il default;
  - `testoCadenza`;
  - `componiEsportazione` (forma, `formato: 1`, nome del file);
  - `settimanaDelCiclo` è invariato;
  - la posizione dei pallini in griglia (una riga fino a 3, due da 4 a 6).
- **Dati** (con client finto, come i test di oggi):
  - `leggiImpostazioni` e `salvaImpostazioni` con `giorniControllo`;
  - `cancellaDispensa` chiama la RPC;
  - `leggiTutteLeSettimane`;
  - `esci` (ordine: signOut → pulizia → navigazione; `scope: 'local'`; se signOut fallisce e la
    sessione resta, niente pulizia; se la sessione non c'è più, pulizia e navigazione).
- **`useIndietroFogli` spostato:** i test della PR #7 migrano senza cambiare, più
  `chiudiTuttoPoi`.

### M.2 Componenti e pagine (Testing Library, `fireEvent`)

- **Pannello:**
  - si apre dal Menù utente (`aria-expanded`);
  - si chiude con X, velo e Menù, e il fuoco torna al Menù;
  - le quattro tessere e le righe coi valori;
  - `?impostazioni=ingredienti` apre sulla sotto-schermata e toglie il parametro;
  - `popstate` scende di un livello: dialogo → sotto-schermata → cima → chiuso.
- **Migrazione dei test di `impostazioni/__tests__/page.test.tsx`** (oltre 40 test [misurato]).
  Ogni test si riporta sulla sotto-schermata corrispondente. Quelli su `SICURO?` diventano test
  sul dialogo, e quelli sullo stepper diventano test sul campo `PERS`. **Nessun test si
  cancella senza un sostituto.** Il registro elenca le coppie vecchio → nuovo.
- **Rimuovi pasto:** senza piatti al tocco; con piatti il dialogo, e ANNULLA non tocca niente.
- **Casa:** i tre ruoli; i tre dialoghi; `COPIA` (clipboard finta, riuscita e rifiuto); la
  scadenza del codice con timer finto.
- **Esporta:** i quattro stati; `share` disponibile, non disponibile, `AbortError`.
- **Ordine delle aree:** piede fisso, spento finché è invariato, errore.
- **Tab bar:** tre voci, nessuna attiva su `/piatti` e `/importa`.
- **Testata:** la pillola indietro con le tre etichette.
- **Piatti:** `da` da URL e da `sessionStorage`.
- **Editor ingrediente:**
  - la freccia segue `torna`, e c'è un test che fallisce sul difetto di oggi;
  - SALVA nel Dock, spento finché è pulito;
  - la scansione riempie la confezione e SALVA manda `ean`.
- **StrisciaGiorni:** gap 3 a sei pasti, e la griglia.
- **RigaControllo:** i tre testi.
- **Avvio:** parte su `/lista` una volta sola; non parte con `reduce`, né su altre pagine; si
  smonta.

### M.3 Sonda nel browser (lezione della fase 4)

**Come si fa:** sotto `src/app/auth/`, con `NEXT_PUBLIC_SUPABASE_URL` e `ANON_KEY` finte da riga
di comando. Poi si cancellano la sonda e `.next/dev`, e si ripristina `next-env.d.ts`. Si
misura:
1. `chiudiTuttoPoi` + `router.push`: due voci aperte, `go(-2)`, la push al `popstate` → quante
   voci restano e dove porta l'indietro dalla pagina nuova (§A.5);
2. il pannello a 360 × 800, 375 × 812 e 393 × 852: la matrice a sei pasti con celle ≥ 44, il
   piede fisso che non copre l'ultima riga, la tastiera sul campo `PERS`;
3. la tab bar a 304 e 244 a 360 (non deve toccare i bordi) e la transizione di `width`;
4. la striscia a sei pasti a 360: la somma delle larghezze, e se sborda;
5. l'avvio: il punto d'arrivo sul Marchio della barra, a 360 e a 393.

### M.4 Prove dal telefono (dopo il merge)

- aprire e chiudere il pannello da Lista, Piano e Dispensa, anche col gesto indietro;
- Piatti dal pannello e ritorno;
- un ingrediente dagli Ingredienti, SALVA e ritorno alla stessa altezza;
- una scansione nell'editor;
- Casa: creare un codice, COPIA;
- Esporta e SALVA IL FILE (iOS e Android);
- cambiare la cadenza e guardare la Riga di controllo;
- Cancella la dispensa: **solo su un account di prova**, o dopo un Esporta;
- Esci e rientro col link;
- il Piano a sei pasti su un Android da 360;
- l'avvio all'apertura della PWA.

---

## N. Dove la spec si discosta dal disegno

| Punto | Disegno | Spec | Perché |
|---|---|---|---|
| Velo del Dialogo di conferma | chiude come ANNULLA (log §4.6) | non chiude | DESIGN.md §8 e il componente della fase 4: un dialogo distruttivo non si chiude per un tocco sbagliato sul velo |
| Piede di versione | `Versione {x} · ultimo salvataggio il {data} alle {ora}` | `Versione {x}` | «Ultimo salvataggio» non è un dato che esiste, e i salvataggi sono per singolo controllo |
| Rimuovi pasto | senza conferma | dialogo se ha piatti | decisione 12: la cascata cancella i piatti e le righe del piano |
| Editor ingrediente | Area, Confezione, Scansiona, Consumo, Fresco | lo stesso, più Prezzo ed Elimina, e il nome modificabile | nessuna funzione di oggi si perde (decisione 3) |
| Avvio 3a | Marchio in testata, titolo e tessere che salgono | Marchio sull'icona Lista della tab bar; nessun ingresso della Lista | DESIGN.md §8 Testata (19/09) e §7 (niente ingressi di pagina); decisione 16 |
| Riparti spento | non disegnato | spento se l'origine è già il lunedì corrente | è il comportamento di oggi |
| `COPIA` | proposto, non disegnato | pillola 44 nel riquadro del codice | decisione 13 |
| Matrice a 360 | celle 44,1 | 44,6 | calcolo sul corpo reale del pannello (§C.1) |
| Riparti, `{data}` del dialogo | il lunedì successivo («28 settembre» il 25/09, frame 10) | il lunedì corrente | è quello che la conferma scrive oggi (`cicloOrigine = lunedì corrente`); scelta del controller del 26/09 |
| Piede fisso del pannello | padding `12 12 26` [misurato sul disegno, frame 13] | `12 16 26` (§B.1) | i 16 dai lati del Dock (§G.1), che il piede sostituisce dentro il pannello |
| Righe pasto del Piano | gap 8 (log §6) | gap 9, come il codice di oggi | nessun task tocca `piano/page.tsx` per un pixel; scelta del controller del 26/09 (§H) |
| Scansione nell'editor | «come nella Dispensa v2» (frame 12) | `LettoreCodice`, non `Scanner` | è la vista della fase 4; `Scanner` è della fase 2 e ha un tasto sotto 44 (§F.1) |

**Dove l'esecuzione si è discostata dalla spec del 25/09** (26/09; ognuna è una decisione del
registro, qui allineata nel testo della spec):

| Punto | Spec del 25/09 | Adesso | Perché |
|---|---|---|---|
| `replaceState` di `?impostazioni=` (§A.3) | `replaceState(null, …)` | `replaceState(window.history.state, …)` | con `null` il primo indietro ricarica la pagina [misurato, Task 2]; decisione 14 |
| `chiudiTuttoPoi` (§A.5) | `fn` al `popstate` atteso | `fn` un giro dopo | dentro il `popstate` Next scarta la push [misurato, Task 2]; decisione 27 |
| Scansione su un ingrediente esistente (§F.1, punto 2) | riempie formato e unità | l'unità non cambia; il formato solo nella stessa unità | un'unità cambiata rompe la lista; decisioni 88 e 93 |
| Errore dell'ordine, «Il file è pronto…», errore di `creaInvito` (§C.5, §C.8, §C.7) | «sopra il piede» | dentro il piede fisso, sopra il tasto | restano attaccati al tasto col corpo scorso; decisioni 70 e 76, P3 |
| Esci senza email (§D) | `… un link a {email}.` | `… un link via email.` | senza email letta la frase diceva «a .»; decisione 38 |
| Riga dell'Account senza utente (§B.4) | la riga c'è sempre | senza nome né email non c'è | una riga vuota da 56 non dice niente; decisione 39 |
| `DialogoConferma` (§D) | `inVolo` ed `errore` fra le prop | `erroreTesto`, e lo stato in volo lo tiene il componente | è la forma di `DialogoElimina` della fase 4; decisione 10 |
| `Testata.indietro` (§G.2) | `{ etichetta, onTorna }` | `{ etichetta, ariaLabel, onTorna }` | il nome accessibile dice dove porta, diverso dall'etichetta; decisione 81 |

---

## O. Esecuzione

- **Il metodo è quello della fase 4:** piano in `docs/superpowers/plans/`, esecuzione
  subagent-driven in un worktree, review dopo ogni task, review di correttezza sui task di dato
  (migrazione 0015, `cancella_dispensa`, cadenza nella lista, esporta, esci, rimuovi pasto),
  review finale su opus, registro delle decisioni in
  `docs/2026-09-2x-fase5-decisioni-esecuzione.md`.
- **L'ordine:**
  1. DESIGN.md e token;
  2. componenti comuni (spostamento di `useIndietroFogli`, `DialogoConferma`, `controlli`);
  3. dati e dominio;
  4. il provider e il guscio del pannello;
  5. le sotto-schermate;
  6. tab bar, Testata e Piatti;
  7. l'editor;
  8. la striscia;
  9. l'avvio;
  10. il rimando delle vecchie route e la pulizia di `impostazioni/page.tsx`.
- **La migrazione 0015** va in produzione **prima del merge**, con l'ok di Andrea (Vercel
  pubblica da solo al merge). È additiva: la colonna ha un default, e la funzione è nuova. Il
  codice vecchio continua a funzionare con la migrazione applicata.
- **Una PR sola** alla fine, con CI verde (test, tsc, lint, build), e la lista delle prove dal
  telefono (§M.4) nel corpo.
