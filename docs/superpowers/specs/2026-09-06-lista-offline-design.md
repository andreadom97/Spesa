# Lettura offline della lista — design (P7)

**Data:** 06/09/2026 · **Stato:** approvata e implementata il 06/09 (piano omonimo); da provare col telefono in aereo
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P7), README "Limite
noto: la lista non è ancora leggibile offline", `src/offline/coda.ts` (le spunte offline)

**Obiettivo:** riaprire l'app in corsia senza segnale e vedere la lista, non una schermata
vuota. Il guscio (HTML/JS/CSS) è già in cache dal service worker; i **dati** della lista
arrivano da Supabase a ogni caricamento e senza rete oggi si vede "Non riusciamo a caricare
la lista". Le spunte fatte offline si accodano già e si sincronizzano al ritorno della rete:
è la *lettura* a mancare.

## 0. Cosa c'è già e cosa manca

- `public/sw.js` mette in cache le pagine same-origin e non tocca mai Supabase, per
  costruzione: niente dati vecchi spacciati per freschi.
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
  trovata" con l'istantanea cancellata; se fallisce di nuovo, si ripiega
  sull'istantanea come al caricamento. Con la rete (`offline` falso) il ritorno in
  primo piano rilegge solo le liste, come prima.
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
  bloccato) l'account non si verifica e l'istantanea si mostra, come per la casa.
- L'istantanea **scade**: più vecchia di 30 giorni (`salvataIl`) si scarta e si cancella
  alla lettura. Non è più "l'ultima lista vista", è un dato vecchio.

## 2. Il modulo

```ts
// src/offline/lista-cache.ts — solo localStorage, niente rete
export interface IstantaneaLista { casaId: string; userId: string; weekId: string; settimanaLabel: string; lista: ListaSalvata; salvataIl: number }
export function leggiIstantaneaLista(opzioni?: { casaId?: string; userId?: string }): IstantaneaLista | null;   // null se assente, malformata, più vecchia di 30 giorni o senza localStorage; con casaId (o userId), se l'istantanea è di un'altra casa (o di un altro account) la cancella e torna null; senza, la restituisce comunque (casa o account non verificabili)
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
  `leggiIstantaneaLista({ casaId, userId })` è non nulla → `setStato({ ...istantanea,
  lista: applicaCodaLista(istantanea.lista), offline: true })`, altrimenti l'errore di oggi.
  Un tocco arrivato mentre `leggiListe` è in volo fa scartare la risposta, come in
  `rileggi`.
- `StatoCarico` acquista `offline: boolean`. Con `offline` la riga sotto la testata (12.5px,
  `var(--sec)`, come le altre righe di spiegazione), copy esatto di §1.
- Con `stato.offline`, sia il listener `online` sia quello di `visibilitychange` rifanno
  `carica()` intero (§1); con `offline` falso il ritorno in primo piano rilegge solo le
  liste (`rileggi`), e al successo salva l'istantanea e mette `offline: false`.
- `sw.js`: aggiungere `/dispensa` e `/impostazioni` al guscio precaricato? No: il guscio si
  riempie visitando le pagine, e la promessa è la Lista. Nessun cambio al service worker.

## 4. Test che contano

- `lista-cache.ts`: salva/legge/cancella; malformata → null; senza `localStorage` → null e
  nessun errore; quota superata → non propaga.
- Lista: lettura fallita con istantanea → lista mostrata, riga offline, coda applicata; senza
  istantanea → errore di oggi; lettura riuscita → istantanea salvata (contenuto senza coda);
  `nonTrovata` → istantanea cancellata; `online` con `offline` → caricamento intero
  (`leggiSettimanaCorrente` riletta, `allineaTopUp` chiamata) e riga che sparisce, e con
  la settimana corrente cambiata senza lista → "non trovata" e istantanea cancellata;
  istantanea di un altro account → non mostrata e cancellata; `entraInCasa` cancella
  l'istantanea (test in `casa.test.ts`).
- `lista-cache.ts`: `userId` diverso → null e cancellata; più vecchia di 30 giorni →
  null e cancellata.

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
  come per la casa a freddo: è un dato che chi usa quel browser ha già visto.
- Un membro **tolto dal proprietario** che apre la Lista **senza rete** prima di averla
  riaperta con rete vede ancora l'ultima lista della casa che ha lasciato: a freddo
  `idCasa()` fallisce e la casa non è verificabile, quindi l'istantanea si mostra senza
  controllo. Alla prima apertura con rete l'id arriva, l'istantanea risulta di un'altra
  casa e si cancella. È un dato che quella persona ha già visto con i suoi occhi, non
  un dato nuovo.
- Il service worker resta com'è: guscio same-origin, mai Supabase.
