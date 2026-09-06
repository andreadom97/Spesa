# Casa condivisa — design (P6)

**Data:** 06/09/2026 · **Stato:** approvata e implementata il 06/09 (piano omonimo), tranne "per quante persone" (decisione aperta, §6); da provare con due account dopo la migrazione 0012
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P6),
[2026-08-26-spesa-design.md](2026-08-26-spesa-design.md) (RLS con `user_id` su ogni tabella)

**Obiettivo:** due persone che fanno la spesa insieme vedono lo stesso piano, la stessa
lista, la stessa dispensa, e spuntano dal proprio telefono. Il segmento uno-due persone
è metà coppie, e un prodotto per una persona sola non si consiglia al partner. Nessuna
funzione sociale: una "casa" è un account che ne ospita un altro, e basta.

## 0. Cosa c'è già e cosa manca

Ogni tabella ha `user_id` e una policy RLS `auth.uid() = user_id` (0002, ripetuta in
0006–0011); il data layer legge `sb.auth.getUser()` e scrive `user_id: utente.user!.id`
in 26 punti di 8 file; le due route API ricavano `userId` dal JWT e lo passano a
`registraImport`. Tutto è per account. Manca un modo per dire "questo account agisce
sui dati di quell'altro".

## 1. Il modello: la casa è il proprietario

Nessuna tabella "household" con la migrazione di ogni `user_id`: una casa **è** l'account
del proprietario, e un membro è un account autorizzato ad agire sui dati del proprietario
come se fossero i suoi. Il perno è una funzione SQL:

```sql
create function casa_id() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select proprietario from casa_membro where membro = auth.uid()),
    auth.uid()
  )
$$;
```

- `casa_membro(membro uuid primary key → auth.users, proprietario uuid not null → auth.users,
  entrato_il timestamptz default now(), check (membro <> proprietario))`: un account è
  membro di al più una casa. Un proprietario non può essere membro altrove e un membro
  non può avere membri (le funzioni sotto lo impediscono; `casa_id()` non è ricorsiva).
- `casa_invito(codice text primary key, proprietario uuid not null → auth.users,
  creato_il timestamptz default now(), scade_il timestamptz not null)`: un codice di sei
  caratteri (maiuscole e cifre senza `0 O 1 I`), valido 24 ore, uno per proprietario alla
  volta.
- **Tutte le policy** su tutte le tabelle con `user_id` diventano
  `using (user_id = casa_id()) with check (user_id = casa_id())`. La migrazione 0012 le
  rigenera in un ciclo su `information_schema.columns` (`column_name = 'user_id'`,
  schema `public`), eliminando prima ogni policy esistente di quelle tabelle, così nessuna
  tabella resta con la regola vecchia (le eccezioni di `import_uso`, select e insert
  separate senza update/delete, si conservano con la stessa forma).
- Le due tabelle nuove hanno RLS propria: `casa_membro` leggibile da membro e
  proprietario (`membro = auth.uid() or proprietario = auth.uid()`), nessuna scrittura
  diretta; `casa_invito` nessun accesso diretto. Si passa dalle funzioni.

Conseguenza voluta: chi entra in una casa **non vede più i propri dati** finché non ne
esce, e non li perde. È il comportamento più semplice da spiegare e da testare, e
nessun dato si mescola.

## 2. Le funzioni (RPC, `security definer`, `search_path = public`)

| Funzione | Cosa fa | Rifiuta se |
|---|---|---|
| `crea_invito() returns text` | Cancella gli inviti precedenti del chiamante, ne crea uno nuovo (24 h), restituisce il codice | il chiamante è membro di una casa |
| `entra_in_casa(codice text) returns uuid` | Valida codice e scadenza, inserisce `casa_membro(auth.uid(), proprietario)`, cancella l'invito, restituisce il proprietario | codice inesistente o scaduto; chiamante = proprietario; il chiamante ha membri; il chiamante è già membro; il proprietario è membro altrove |
| `esci_dalla_casa() returns void` | Cancella la riga `casa_membro` del chiamante | (mai: senza riga non fa nulla) |
| `rimuovi_membro(membro uuid) returns void` | Il proprietario toglie un membro | la riga non ha `proprietario = auth.uid()` |
| `stato_casa() returns jsonb` | `{ "ruolo": "solo" \| "proprietario" \| "membro", "email": [...] }`: per un proprietario le email dei membri, per un membro quella del proprietario | — |

Le email vengono da `auth.users` dentro `security definer`: è l'unico modo per mostrarle
e restano dentro la casa. Gli errori delle funzioni hanno messaggi in italiano
(`raise exception 'codice non valido o scaduto'`), mostrati così come sono.

## 3. Il data layer

`src/data/casa.ts`:

```ts
export async function idCasa(): Promise<string>;         // rpc('casa_id'), memorizzata per sessione
export function dimenticaIdCasa(): void;                 // dopo entra/esci, prima del reload
export async function statoCasa(): Promise<{ ruolo: 'solo' | 'proprietario' | 'membro'; email: string[] }>;
export async function creaInvito(): Promise<string>;
export async function entraInCasa(codice: string): Promise<void>;
export async function esciDallaCasa(): Promise<void>;
export async function rimuoviMembro(membro: string): Promise<void>;
```

`idCasa()` sostituisce `utente.user!.id` in ogni punto di `src/data/*.ts` che scrive o
filtra per `user_id` (26 punti in `dispensa`, `importa`, `impostazioni`, `lista`,
`primo-avvio`, `pronti`, `repertorio`, `settimana`). La memoria è una promessa a livello
di modulo: una RPC per apertura dell'app. Il valore cambia solo con entra/esci, che fanno
`dimenticaIdCasa()` e poi un reload completo su `/lista` (`window.location.assign`):
ricaricare tutto è l'unico modo onesto di svuotare ogni stato di pagina.

Le route API (`/api/import/estrai`) usano il client con il JWT dell'utente: `userId` per
`registraImport`/`contaImportRecenti` diventa `sbUtente.rpc('casa_id')`. Il tetto di
import è quindi per casa (limite dichiarato, §7).

`primo-avvio`: i conteggi e le scritture usano `idCasa()`. Un membro che apre l'app conta
i dati della casa, che non sono vuoti: non semina niente. Un account nuovo semina i
propri, poi entrando in una casa li lascia da parte.

## 4. Dove si vede: Impostazioni → CASA

Nuova sezione fra REPERTORIO e SUPERMERCATO, etichetta `CASA`, una scheda:

- **Solo** (`ruolo: 'solo'`): titolo `Fai la spesa con qualcuno?`, testo `Chi entra nella
  tua casa vede e spunta la tua lista dal suo telefono. Il suo piano resta da parte finché
  non esce.` Bottone `CREA UN CODICE` → mostra il codice grande in mono (`K7P3QX`) con
  sotto `Vale 24 ore. Dalle sue Impostazioni, l'altra persona lo inserisce qui sotto.`
  Sotto la scheda, campo `Ho un codice` (6 caratteri, maiuscole automatiche) e bottone
  `ENTRA`; con codice sbagliato, il messaggio della funzione.
- **Proprietario**: titolo `La tua casa`, elenco delle email dei membri con bottone
  `TOGLI` (conferma in due tocchi, come RIPARTI), testo `Ognuno spunta dal suo telefono.
  La lista si aggiorna quando la riapri.`, e sempre `CREA UN CODICE` per un altro membro.
- **Membro**: titolo `Sei nella casa di {email}`, testo `Vedi la sua lista, il suo piano e
  la sua dispensa. I tuoi restano da parte.`, bottone `ESCI DALLA CASA` (due tocchi).

Entrare o uscire → `dimenticaIdCasa()` → `window.location.assign('/lista')`.

## 5. La lista in due

Le spunte passano già da `spunta(itemId, spuntato)` e dalla coda offline per `itemId`:
due telefoni che spuntano la stessa lista scrivono la stessa riga, l'ultimo vince, e
nessuno dei due si accorge dell'altro finché non ricarica. Per non far sembrare rotta la
lista, la pagina Lista rilegge le liste quando torna visibile (`visibilitychange` →
`visible`, con la coda offline applicata sopra come già fa al caricamento). Niente
realtime: limite dichiarato.

## 6. Decisione aperta: "per quante persone"

Il backlog abbina a P6 il "fattore porzioni per casa". Il moltiplicatore esiste
(`settings.moltiplicatore_porzioni`, `list-builder` lo applica) ma il 28/08 è stato tolto
dall'interfaccia dopo la prova sul campo, con un test che lo blinda: "un moltiplicatore
unico presuppone che tutti a tavola mangino la stessa porzione". Una casa di due persone
con due diete diverse è esattamente il caso in cui non vale.

Proposta, **da decidere prima di costruirla**: reintrodurlo in CASA come `Per quante
persone cucini` (1–4), dichiarando che vale quando tutti mangiano la stessa porzione,
com'è per chi cucina un piatto per due. È quello che fanno EasyPlan e Bring!. Se invece
la casa serve a due diete diverse, la strada giusta è un secondo piano nella stessa casa
(piatti e pasti per persona, una lista sola): un'altra spec. Questo documento non
implementa né l'uno né l'altro.

## 7. Limiti dichiarati (non bug)

- Un membro non vede i propri dati finché è nella casa; uscendo li ritrova. Nessuna
  fusione, mai.
- Un account è membro di una casa sola; un proprietario non può entrare altrove finché
  ha membri.
- Il tetto di import (3 in 30 giorni) è per casa.
- La lista si aggiorna al ritorno in primo piano, non in tempo reale; due spunte
  contemporanee sulla stessa riga: l'ultima vince.
- Il codice d'invito è di sei caratteri e dura 24 ore: chi lo ha, entra. È un rischio
  accettato per un'app fra persone che vivono insieme; il proprietario vede chi c'è e lo
  toglie.
- Le email dei membri si vedono dentro la casa e da nessun'altra parte.

## 8. Cosa cambia nei file

| File | Cambia |
|---|---|
| `supabase/migrations/0012_casa.sql` | Tabelle, `casa_id()`, le cinque funzioni, tutte le policy rigenerate |
| `src/data/casa.ts` | Nuovo |
| `src/data/{dispensa,importa,impostazioni,lista,primo-avvio,pronti,repertorio,settimana}.ts` | `idCasa()` al posto di `utente.user!.id` |
| `src/app/api/import/estrai/route.ts` | `casa_id` per il tetto |
| `src/app/(app)/impostazioni/page.tsx` | Sezione CASA |
| `src/app/(app)/lista/page.tsx` | Rilettura al ritorno in primo piano |
| `README.md`, `spesa-backlog-nicchia.md` | P6 consegnato, migrazione 0012 nel deploy |

## 9. Test che contano

- SQL: non testabile qui; la migrazione va letta due volte e provata in locale sul progetto
  Supabase prima del deploy (checklist).
- `casa.ts`: memoria di `idCasa` (una RPC per due chiamate), `dimenticaIdCasa`, mappatura
  di `stato_casa`, errori delle RPC propagati col messaggio.
- I test esistenti del data layer restano verdi mockando `./casa` al posto di
  `auth.getUser` dove serve; nessuna funzione cambia firma.
- Impostazioni: i tre stati della scheda, il codice mostrato, `ENTRA` con codice
  maiuscolato, gli errori, le conferme in due tocchi, il reload.
- Lista: rilettura su `visibilitychange`.
