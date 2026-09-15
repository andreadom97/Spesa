# Uscire dall'account — design

**Data:** 15/09/2026 · **Stato:** approvata da Andrea il 15/09 (dalle prove in produzione) · **Piano:** `docs/superpowers/plans/2026-09-15-rigenera-e-esci.md`

## 0. Perché

L'app non ha un logout (review di sicurezza dell'11/09; prova del 15/09: per aprire un
secondo account serve una scheda in incognito). Su un telefono condiviso, o per far
entrare un familiare con il suo account, serve un tasto.

## 1. Comportamento

Pagina Impostazioni, sezione nuova in fondo `ACCOUNT`, dopo CASA: la riga `Sei dentro
come {email}` e il tasto `ESCI DALL'ACCOUNT` a due tocchi (`BottoneDueTocchi`, secondo
tap "SICURO?"), stile secondario. Sotto, una riga: `Esci solo da questo telefono: gli
altri restano collegati.`

Al tap confermato: `esciDallAccount()` (§2), poi `router.replace('/entra')`. Errore →
riga `Serve la rete per uscire. Riprova.` e niente cambia. Il messaggio resta solo per
il caso in cui la sessione locale è ancora lì (§2): senza rete la libreria chiude
comunque la sessione locale, e in quel caso si esce e si pulisce lo stesso.

L'email propria viene da `client().auth.getUser()` (o `getSession`), non da
`statoCasa` (che elenca i membri). Se manca (sessione scaduta), la riga dice `Sei
dentro` e basta.

## 2. Dato

```ts
// src/data/sessione.ts (nuovo)
export async function esciDallAccount(): Promise<void>;
export async function emailAccount(): Promise<string | null>;
```

`esciDallAccount`, in quest'ordine:
1. `client().auth.signOut({ scope: 'local' })` chiama `/logout?scope=local`, che revoca
   solo la sessione di questo dispositivo (le altre restano; il default `global` revoca
   tutti i refresh token dell'utente e farebbe uscire anche il telefono quando si esce
   dal PC). Senza rete la libreria (`@supabase/auth-js`, `GoTrueClient._signOut`)
   chiude comunque la sessione locale (cookie `sb-*` rimossi) e poi restituisce
   `{ error }`; il refresh token di questo dispositivo resta valido lato server finché
   scade. In quel caso si esce e si pulisce lo stesso: dopo un `error` si rilegge
   `getSession()`, e se `data.session` è `null` senza errore la sessione locale è
   andata. Si rilancia, senza toccare nulla in locale, solo se la sessione è ancora lì
   (token scaduto e refresh fallito: la libreria esce senza rimuovere; `getSession`
   risponde `null` ma con errore) o se non si riesce a leggerla. Il messaggio "Serve la
   rete per uscire" resta solo per questo caso.
2. `cancellaIstantaneaLista()`, `svuotaCoda()`, `dimenticaIdCasa()`, e le chiavi
   `spesa:*` di `sessionStorage` (le bozze piatto di `bozza.ts`; quella di
   `/piatti/nuovo` ha una chiave fissa): la scheda non deve mostrare al prossimo
   account la lista, le spunte in coda, la casa o la bozza di quello di prima.
   (L'istantanea è già per account e per casa: qui si cancella comunque.) L'accesso a
   `sessionStorage` è protetto con try/catch come in `bozza.ts`.

Il proxy (`src/proxy.ts`) rimanda a `/entra` ogni pagina senza sessione: dopo il
`signOut` i cookie della sessione non ci sono più, e `router.replace('/entra')` serve
solo a non aspettare la prossima navigazione.

## 3. "Per quante persone cucini"

Sotto lo stepper, dopo un cambio riuscito (non all'apertura, non dopo un errore), una
riga: `La lista di questa settimana non cambia da sola: da Lista, RIFAI LA LISTA.`
(spec `2026-09-15-rigenera-lista-design.md`). Sparisce al prossimo caricamento della
pagina.

## 4. Test

- Dato: ordine (signOut prima delle pulizie); signOut che rifiuta → lancia e nessuna
  pulizia; `{ error }` con `getSession` senza sessione → pulizie e nessun lancio;
  `{ error }` con la sessione ancora lì (o `null` con errore) → lancia e nessuna
  pulizia; le chiavi `spesa:*` di `sessionStorage` se ne vanno, le altre restano, e
  uno storage bloccato non fa fallire l'uscita; `scope: 'local'`; `emailAccount` con e
  senza utente.
- Pagina: la sezione ACCOUNT con l'email; primo tap "SICURO?", secondo →
  `esciDallAccount` e `router.replace('/entra')`; errore → riga di errore, nessun
  redirect; la riga sulle porzioni compare solo dopo un cambio riuscito.

## 5. Limiti dichiarati

Il service worker tiene in cache il guscio, non i dati: dopo l'uscita la pagina
`/entra` si apre anche offline ma non si può entrare senza rete. Le bozze di import
sono sul server, per account: non si toccano. Le bozze piatto in `sessionStorage` si
tolgono all'uscita (§2), ma solo in questa scheda: `sessionStorage` è per scheda, e
un'altra scheda aperta sullo stesso account tiene le sue.
