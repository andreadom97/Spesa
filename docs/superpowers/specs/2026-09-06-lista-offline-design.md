# Lettura offline della lista — design (P7)

**Data:** 06/09/2026 · **Stato:** approvata
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
  **salva** in `localStorage` (`spesa:lista`) un'istantanea: `{ weekId, settimanaLabel,
  lista, salvataIl }`, dove `lista` è la `ListaSalvata` **come letta dal server**, senza la
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
  rilegge; al successo la riga sparisce e l'istantanea si aggiorna.
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

## 2. Il modulo

```ts
// src/offline/lista-cache.ts — solo localStorage, niente rete
export interface IstantaneaLista { weekId: string; settimanaLabel: string; lista: ListaSalvata; salvataIl: number }
export function leggiIstantaneaLista(): IstantaneaLista | null;   // null se assente, malformata o senza localStorage
export function salvaIstantaneaLista(i: Omit<IstantaneaLista, 'salvataIl'>): void; // salvataIl = Date.now(); un errore di quota va in console e non propaga
export function cancellaIstantaneaLista(): void;
```

Stesso stile di `coda.ts`: chiave `spesa:lista`, `try/catch` intorno al parse, una forma
minima validata (`weekId` stringa, `lista.base`/`topup` array).

## 3. La pagina

- `carica()`: al successo `salvaIstantaneaLista({ weekId, settimanaLabel, lista })` prima di
  `setStato`; sul ramo `nonTrovata` `cancellaIstantaneaLista()`; nel `catch`, se
  `leggiIstantaneaLista()` è non nulla → `setStato({ ...istantanea, lista:
  applicaCodaLista(istantanea.lista), offline: true })`, altrimenti l'errore di oggi.
- `StatoCarico` acquista `offline: boolean`. Con `offline` la riga sotto la testata (12.5px,
  `var(--sec)`, come le altre righe di spiegazione), copy esatto di §1.
- Il listener `online` esistente, oltre a sincronizzare la coda, se `stato.offline` rilegge
  come al ritorno in primo piano; il ritorno in primo piano, al successo, salva
  l'istantanea e mette `offline: false`.
- `sw.js`: aggiungere `/dispensa` e `/impostazioni` al guscio precaricato? No: il guscio si
  riempie visitando le pagine, e la promessa è la Lista. Nessun cambio al service worker.

## 4. Test che contano

- `lista-cache.ts`: salva/legge/cancella; malformata → null; senza `localStorage` → null e
  nessun errore; quota superata → non propaga.
- Lista: lettura fallita con istantanea → lista mostrata, riga offline, coda applicata; senza
  istantanea → errore di oggi; lettura riuscita → istantanea salvata (contenuto senza coda);
  `nonTrovata` → istantanea cancellata; `online` con `offline` → rilettura e riga che
  sparisce; `entraInCasa` cancella l'istantanea (test in `casa.test.ts`).

## 5. Limiti dichiarati (non bug)

- Offline si vede l'ultima lista aperta, non l'ultima generata: chi genera la lista dalla
  Settimana e non apre mai la Lista con rete non la trova in corsia. La riga lo dice.
- I controlli staple non si rispondono offline. Le risposte non passano dalla coda.
- L'istantanea è per dispositivo e per casa; il totale è qualche decina di KB in
  `localStorage`, cancellata con i dati del sito.
- Il service worker resta com'è: guscio same-origin, mai Supabase.
