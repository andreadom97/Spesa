# Lettura offline della lista — design (P7)

**Data:** 06/09/2026 · **Stato:** approvata e implementata il 06/09 (piano omonimo); corretta il 07/09 dopo la review di correttezza (M1, M2, B4) e l'11/09 (coda scritta prima di leggere in `carica()`, service worker senza `/api/`); da provare col telefono in aereo
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P7), README "Limite
noto: la lista non è ancora leggibile offline", `src/offline/coda.ts` (le spunte offline)

**Obiettivo:** riaprire l'app in corsia senza segnale e vedere la lista, non una schermata
vuota. Il guscio (HTML/JS/CSS) è già in cache dal service worker; i **dati** della lista
arrivano da Supabase a ogni caricamento e senza rete oggi si vede "Non riusciamo a caricare
la lista". Le spunte fatte offline si accodano già e si sincronizzano al ritorno della rete:
è la *lettura* a mancare.

## 0. Cosa c'è già e cosa manca

- `public/sw.js` mette in cache le pagine same-origin e non tocca mai Supabase, per
  costruzione: niente dati vecchi spacciati per freschi. Dall'11/09 lascia fuori anche
  le API dell'app (`/api/*`: dati, non guscio — vanno sempre alla rete, niente cache né
  lettura dalla cache) e mette in cache solo le risposte `ok`: un 502 o un 401 non
  viene riservito offline al posto della pagina buona.
- `src/offline/coda.ts` tiene in `localStorage` le spunte in attesa (`spesa:coda`) e la
  Lista le applica sopra a quello che legge dal server.
- La Lista, se `leggiSettimanaCorrente`/`leggiListe` falliscono, mostra un errore. Manca
  una copia locale dell'ultima lista vista, e una regola chiara su quando mostrarla.

## 1. La regola

La rete decide, la copia locale ripara.

- A ogni lettura riuscita della lista (caricamento, ritorno in primo piano), la Lista
  **salva** in `localStorage` (`spesa:lista`) un'istantanea: `{ casaId, userId, weekId,
  settimanaLabel, lista, salvataIl }`, dove `lista` è la `ListaSalvata` **come letta dal server**, senza la
  coda applicata (la coda si riapplica sempre al momento di mostrare, così una spunta
  ancora in volo non viene "disfatta" né duplicata).
- Se la lettura **fallisce** (rete assente, Supabase giù, sessione da rinfrescare senza
  rete) e c'è un'istantanea, la Lista **la mostra**, con la coda applicata sopra, e una
  riga sotto la testata: `Sei offline: questa è la lista di {settimanaLabel} salvata
  l'ultima volta che l'hai aperta. Le spunte si sincronizzano appena torna la rete.` Le
  spunte funzionano come sempre (coda). I controlli staple (SÌ/NO) restano visibili ma un
  tap senza rete fallisce come oggi, con il messaggio già esistente.
- Se la lettura fallisce e **non** c'è un'istantanea: l'errore di oggi.
- Quando la rete torna (`online`, o il ritorno in primo piano già presente), la Lista
  **rifà il caricamento intero** (`carica()`: settimana corrente, `allineaTopUp`,
  liste), non la sola rilettura della settimana dell'istantanea: quella settimana può
  essere già chiusa (lunedì mattina senza rete) e le sue liste restano sul server, che
  rilette da sole tornerebbero come vive. Al successo la riga sparisce e l'istantanea
  si aggiorna; se la settimana corrente è un'altra si mostra la sua lista, o "non
  trovata" con l'istantanea cancellata; se fallisce di nuovo, **la lista a schermo
  resta com'è**. Con la rete (`offline` falso) il ritorno in primo piano rilegge solo
  le liste, come prima.
- **L'istantanea non sovrascrive mai una lista già a schermo**: entra solo quando
  non c'è ancora niente (il caricamento al montaggio fallito). Al ritorno della rete
  partono insieme la sincronizzazione della coda e `carica()`: se la coda scrive una
  spunta e si svuota e `carica()` fallisce di nuovo, l'istantanea — salvata prima di
  quel tocco — con la coda ormai vuota da riapplicare disfarebbe a schermo una spunta
  che sul server è fatta, e un ritocco la annullerebbe. La lista mostrata è sempre
  almeno aggiornata quanto l'istantanea, perché ogni spunta locale ci passa sopra.
- **`carica()` scrive la coda prima di leggere**, come `rileggi`: subito dopo aver
  fissato la versione dei tocchi aspetta `sincronizzaCoda()` (si accoda al giro già in
  volo lanciato dal listener di montaggio), poi legge. Letta in parallelo, la lista
  potrebbe rispondere prima che la spunta in coda atterri, e la conferma svuoterebbe
  la coda prima che venga riapplicata: la lista andrebbe a schermo senza la spunta
  mentre sul server c'è. A freddo senza rete la scrittura fallisce in fretta e la
  spunta resta in coda; un tocco durante la sincronizzazione fa scartare la risposta.
- Un tocco arrivato **mentre `carica()` è in volo** (in qualunque sua fase: settimana
  corrente, `allineaTopUp`, liste) rende la risposta più vecchia di quella a schermo
  e la fa scartare: la versione dei tocchi si fissa in testa al giro, non prima della
  sola lettura delle liste.
- Un'istantanea di una **settimana diversa** da quella corrente (ad esempio lunedì
  mattina senza rete: la settimana nuova non esiste ancora) si mostra lo stesso, perché
  la rete non ha risposto e la settimana corrente non è nota: la riga dice di quale
  settimana è. Non si tenta di indovinare.
- Le letture che vanno a buon fine con lista assente (`nonTrovata`) **cancellano**
  l'istantanea: non deve ricomparire una lista vecchia dopo che la settimana è stata
  chiusa e la lista non esiste più.
- Uscendo o entrando in una casa (reload da `/lista`) l'istantanea è di un'altra casa:
  `entraInCasa`/`esciDallaCasa` in `casa.ts` la cancellano insieme alla memoria di
  `idCasa` (una chiamata a `cancellaIstantaneaLista()`).
- L'istantanea **porta l'id della casa** (`casaId`, da `idCasa()`), perché un membro
  **tolto dal proprietario** non passa da `entraInCasa`/`esciDallaCasa` e nessuno gli
  cancellerebbe la copia: si terrebbe sul telefono l'ultima lista della casa che ha
  lasciato. Nel `catch` la Lista legge l'istantanea passando `idCasa()`: se è di un'altra
  casa, `lista-cache` la cancella e si mostra l'errore di oggi. Così un membro tolto non
  la vede più alla prossima apertura con rete (`idCasa` riesce, l'istantanea è di
  un'altra casa → cancellata). **Senza rete** a freddo `idCasa()` fallisce (non è ancora
  memorizzata nella sessione): la casa non è verificabile, si legge senza id e
  l'istantanea si mostra, perché è la migliore informazione disponibile — limite
  dichiarato in §5.
- L'istantanea porta anche **l'id dell'account** (`userId`, da
  `client().auth.getSession()`, `''` se la sessione non si legge): due account sullo
  stesso browser condividono `localStorage`, e senza l'id chi entra dopo vedrebbe
  offline la lista di chi c'era prima. `getSession` legge il token locale, quindi
  risponde anche senza rete finché il token è valido; se non risponde (scaduto, storage
  bloccato) l'account non si verifica e l'istantanea si mostra, come per la casa. Vale
  nei due versi: un'istantanea salvata con `userId` vuoto non è di un altro account, è
  di un account non verificato al salvataggio, e si mostra anche quando alla lettura
  la sessione si legge ("non verificabile si mostra", §5); la casa si verifica
  comunque.
- L'istantanea **scade**: più vecchia di 30 giorni (`salvataIl`) si scarta e si cancella
  alla lettura. Non è più "l'ultima lista vista", è un dato vecchio.

## 2. Il modulo

```ts
// src/offline/lista-cache.ts — solo localStorage, niente rete
export interface IstantaneaLista { casaId: string; userId: string; weekId: string; settimanaLabel: string; lista: ListaSalvata; salvataIl: number }
export function leggiIstantaneaLista(opzioni?: { casaId?: string; userId?: string }): IstantaneaLista | null;   // null se assente, malformata, più vecchia di 30 giorni o senza localStorage; con casaId (o userId), se l'istantanea è di un'altra casa (o di un altro account) la cancella e torna null; senza, la restituisce comunque (casa o account non verificabili); un'istantanea con userId '' si restituisce anche con userId (account non verificato al salvataggio)
export function salvaIstantaneaLista(i: Omit<IstantaneaLista, 'salvataIl'>): void; // salvataIl = Date.now(); un errore di quota va in console e non propaga
export function cancellaIstantaneaLista(): void;
```

Stesso stile di `coda.ts`: chiave `spesa:lista`, `try/catch` intorno al parse, una forma
minima validata (`casaId`, `userId` e `weekId` stringhe, `lista.base`/`topup` array):
un'istantanea salvata prima di `casaId` o di `userId` non passa la validazione e si
comporta come assente.

## 3. La pagina

- `carica()` (dichiarata nell'effetto di montaggio, dove vive il flag `vivo`, e
  pubblicata in un ref perché serva anche ai listener): al successo `salvaIstantaneaLista({ casaId: await idCasa(), userId, weekId,
  settimanaLabel, lista })` prima di `setStato` (`idCasa` è memorizzata per sessione e
  `getSession` legge il token locale: costano niente); sul ramo `nonTrovata`
  `cancellaIstantaneaLista()`; nel `catch`, si tentano `idCasa()` e `getSession()`
  (senza propagare: a freddo offline la prima fallisce) e se
  `leggiIstantaneaLista({ casaId, userId })` è non nulla → `setStato((prev) => prev ??
  { ...istantanea, lista: applicaCodaLista(istantanea.lista), offline: true })`,
  altrimenti l'errore di oggi. Il `prev ??` è la regola di §1: l'istantanea entra solo a
  schermo vuoto; con una lista già mostrata (il giro al ritorno della rete fallito di
  nuovo) resta quella, che è almeno aggiornata quanto l'istantanea e ha sopra le spunte
  fatte nel frattempo.
  La versione dei tocchi (`versioneTocchi`) si fissa **come prima riga di `carica()`**:
  un tocco arrivato in qualunque fase del giro (settimana corrente, `allineaTopUp`,
  liste) fa scartare la risposta, come in `rileggi`. Subito dopo, `await
  sincronizzaCoda()` (che non lancia mai: `allSettled` e coda tollerante), e solo poi
  `leggiSettimanaCorrente`.
- `StatoCarico` acquista `offline: boolean`. Con `offline` la riga sotto la testata (12.5px,
  `var(--sec)`, come le altre righe di spiegazione), copy esatto di §1.
- Con `stato.offline`, sia il listener `online` sia quello di `visibilitychange` rifanno
  `carica()` intero (§1); con `offline` falso il ritorno in primo piano rilegge solo le
  liste (`rileggi`), e al successo salva l'istantanea e mette `offline: false`.
- `sw.js`: aggiungere `/dispensa` e `/impostazioni` al guscio precaricato? No: il guscio si
  riempie visitando le pagine, e la promessa è la Lista. Il solo cambio al service worker
  (11/09) è di sicurezza: `/api/*` fuori dalla cache e dalla lettura dalla cache, e
  `cache.put` solo su risposte `ok` (vedi §0).

## 4. Test che contano

- `lista-cache.ts`: salva/legge/cancella; malformata → null; senza `localStorage` → null e
  nessun errore; quota superata → non propaga.
- Lista: lettura fallita con istantanea → lista mostrata, riga offline, coda applicata; senza
  istantanea → errore di oggi; lettura riuscita → istantanea salvata (contenuto senza coda);
  `nonTrovata` → istantanea cancellata; `online` con `offline` → caricamento intero
  (`leggiSettimanaCorrente` riletta, `allineaTopUp` chiamata) e riga che sparisce, con la
  coda scritta prima della lettura (la spunta confermata nel frattempo non si disfa), e con
  la settimana corrente cambiata senza lista → "non trovata" e istantanea cancellata;
  istantanea di un altro account → non mostrata e cancellata; `entraInCasa` cancella
  l'istantanea (test in `casa.test.ts`); al ritorno della rete con la coda che si
  svuota e `carica()` che fallisce di nuovo → la spunta a schermo resta; tap durante
  `leggiSettimanaCorrente` al ritorno della rete → risposta scartata.
- `lista-cache.ts`: `userId` diverso → null e cancellata; salvata con `userId` vuoto →
  si rilegge anche con un id; più vecchia di 30 giorni → null e cancellata.

## 5. Limiti dichiarati (non bug)

- Offline si vede l'ultima lista aperta, non l'ultima generata: chi genera la lista dalla
  Settimana e non apre mai la Lista con rete non la trova in corsia. La riga lo dice.
- I controlli staple non si rispondono offline. Le risposte non passano dalla coda.
- L'istantanea è per dispositivo, per casa e per account; il totale è qualche decina di
  KB in `localStorage`, cancellata con i dati del sito o dopo 30 giorni alla prima
  lettura.
- Un altro account sullo stesso browser (`userId` diverso) non la vede: alla lettura
  con la sessione leggibile si cancella. Se la sessione non si legge (token scaduto
  senza rete, storage bloccato) l'account non è verificabile e l'istantanea si mostra,
  come per la casa a freddo: è un dato che chi usa quel browser ha già visto. Lo stesso
  se era la sessione al **salvataggio** a non leggersi (`userId` vuoto): quell'istantanea
  si mostra a chiunque apra la Lista su quel browser senza rete, finché una lettura
  riuscita non la sovrascrive con l'id giusto.
- Un membro **tolto dal proprietario** che apre la Lista **senza rete** prima di averla
  riaperta con rete vede ancora l'ultima lista della casa che ha lasciato: a freddo
  `idCasa()` fallisce e la casa non è verificabile, quindi l'istantanea si mostra senza
  controllo. Alla prima apertura con rete l'id arriva, l'istantanea risulta di un'altra
  casa e si cancella. È un dato che quella persona ha già visto con i suoi occhi, non
  un dato nuovo.
- Il service worker resta com'è: guscio same-origin, mai Supabase, mai `/api/*`, solo risposte `ok`.
