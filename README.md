# Spesa

App personale che trasforma un piano alimentare già esistente in una lista della spesa
ordinata come cammini nel supermercato. Costruita per uso proprio, con la porta aperta
a un eventuale prodotto.

**In produzione:** <https://spesa-zeta.vercel.app>

**Stato: Fase 1 completa e provata sul campo il 28/08/2026.** Dominio puro
(`list-builder`, `pantry`, `planner`, `ciclo`, `week-shape`, `chiusura`, `opzioni`,
`confezioni`), 338 test automatici verdi, schema su un progetto Supabase vero,
quattordici schermate, PWA installabile con guscio offline sulla lista, in produzione
su Vercel.

### Importa la dieta (29/08/2026)

Da `/impostazioni` → **Importa la dieta**: acquisisci le pagine della dieta del
nutrizionista (foto o PDF), un wizard guida la revisione pasto per pasto, propone i
formati di confezione per gli ingredienti nuovi, e al riepilogo **sostituisce il piano
attuale** — i piatti del nutrizionista disattivati, i nuovi creati, il ciclo settimane
riallineato. L'esecuzione (`eseguiScritture`) è idempotente per costruzione: un errore a
metà si ripara riprovando, non lascia il piano a metà strada.

**Stato: estrattore vero in codice, chiave non ancora su Vercel.** Dal 30/08 l'estrattore
esiste in `src/server/import-ai.ts` (structured output, streaming) e `/api/import/estrai`
ha tre rami, in quest'ordine:

1. `ANTHROPIC_API_KEY` presente → estrazione vera delle foto o del PDF caricati, con il
   modello di `IMPORT_AI_MODEL` (default `claude-sonnet-5`). Su Vercel la chiave non è
   ancora impostata: si accende dopo il run dell'eval che decide il modello (sotto).
2. Altrimenti `IMPORT_MOCK` (solo sviluppo, mai su Vercel) → un fixture al posto della
   lettura; i file caricati vengono ricevuti e scartati, così la firma della route è la
   stessa dell'estrazione vera.
3. Altrimenti 503 `estrazione non disponibile`: è la risposta di produzione oggi.

In sviluppo, senza chiave, il mock si sceglie con la variabile d'ambiente `IMPORT_MOCK`:

| `IMPORT_MOCK` | Cosa serve |
|---|---|
| *(non impostata)* | `diete/estrazioni/piani/dieta6.json` (default) |
| `sintetico` | Il fixture di menu settimanale sintetico usato nei test (`FIXTURE_MENU_SETTIMANALE`) |
| `rifiuto` | Il rifiuto onesto di una dieta solo-macro, senza menu (`FIXTURE_RIFIUTO_MACRO`) |
| un altro nome | `diete/estrazioni/piani/<nome>.json`; 503 se il file non esiste |

Per provarlo in locale: `IMPORT_MOCK=dieta6 npm run dev`, poi aprire `/importa` — le foto
o il PDF scelti nella schermata di acquisizione sono ignorati dal mock, basta arrivare al
bottone ESTRAI LA DIETA.

### Estrazione a pagine (05/09/2026)

**Perché.** Con una chiamata sola per l'intero piano, la dieta 6 (7 foto) ha impiegato
453 s contro i 300 s di `maxDuration` della funzione Vercel. Il tempo è l'output, non il
modello: un piano intero sono 20–25k token di JSON in uscita, le immagini in ingresso si
leggono in pochi secondi e Opus non scrive più veloce di Sonnet. Dividere l'output divide
il tempo.

**Come.** Tre passaggi. Una chiamata di **indice** con tutte le pagine in ingresso e un
output piccolo: l'archetipo deciso una volta sola, cosa contiene ogni pagina, il rifiuto
immediato di una dieta di soli macro (`src/domain/import/indice.ts`). Poi **una chiamata
per pagina, in parallelo** (al massimo `IMPORT_CONCORRENZA` in volo, default 4), ognuna
con tutte le pagine in ingresso ma l'istruzione di trascrivere solo la sua, nello stesso
schema della chiamata singola: il prefisso `system → pagine` è identico fra le chiamate e
va in cache (`cache_control` sull'ultimo blocco pagina), così l'indice la scrive e le
pagine la leggono al 10% del prezzo. Infine la **fusione in codice**
(`src/domain/import/fusione.ts`, funzione pura: giorni identificati da `(settimana, giorno)`,
pasti spezzati fra due pagine ricomposti se l'indice li segnala), il cui risultato passa da
`validaEsito` come qualsiasi estrazione. Una pagina che fallisce dopo i retry fa fallire
l'import intero: mai un piano parziale spacciato per intero. Un PDF multipagina si divide
server-side in PDF a pagina singola con `pdf-lib` (`src/server/pdf-pagine.ts`) e segue la
stessa pipeline; una pagina sola (una foto, o un PDF a una pagina) resta la chiamata
singola di prima (`estraiPiano`), che è anche la baseline dell'eval. Il disegno completo,
con la stima dei costi, è in
[`docs/superpowers/specs/2026-09-05-import-in-produzione-design.md`](docs/superpowers/specs/2026-09-05-import-in-produzione-design.md).

Consegnato il 05/09: indice e validatore, `validaPianoParziale`, fusione, `dividiPdf`,
tabella `import_uso`, l'orchestratore `estraiPianoAPagine` in `src/server/import-ai.ts`
(indice → pagine con cache → fusione, con `usage` aggregato), la route che compone tutto
(limite → PDF diviso → pipeline a pagine) e l'eval con report. Non ancora provato con una
chiave vera: la checklist locale è in coda al piano
[`docs/superpowers/plans/2026-09-05-import-in-produzione.md`](docs/superpowers/plans/2026-09-05-import-in-produzione.md).

### Tetto di import per utente

Il costo di un import non giustifica un limite: lo giustifica una chiave in produzione
raggiungibile da chiunque abbia un account. Il tetto è una difesa, e va dichiarato.

- **Tabella `import_uso`** (migrazione `supabase/migrations/0010_import_uso.sql`, modulo
  `src/data/import-uso.ts`): `id`, `user_id`, `avviato_il`, `pagine`, `modello`. Solo
  metadati, mai contenuto della dieta. RLS abilitata e forzata, policy `select` e `insert`
  per il proprietario e **nessuna policy di update o delete**: un utente non può azzerarsi
  il contatore (Andrea può, dal pannello Supabase).
- **Regola**: al massimo `IMPORT_LIMITE_30GG` import (default 3) nei 30 giorni precedenti;
  `0` disattiva il limite (solo sviluppo). La riga si scrive prima delle chiamate al
  modello, con il client Supabase che porta il JWT dell'utente così che la RLS valga: si
  contano i tentativi, non i successi, quindi due invii concorrenti contano due e un import
  fallito consuma comunque uno slot. Il mock e il 503 non consumano niente.
- **Oltre il limite**: 429 con `hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026`,
  dove la data è il più vecchio import nella finestra più 30 giorni; la pagina Importa lo
  mostra così com'è, come già fa per il 413. Controllo e registrazione vivono nella route,
  dentro il ramo con la chiave, prima di qualunque chiamata al modello.
- **Rete di sicurezza fuori dal codice**: spend limit mensile sul workspace Anthropic,
  impostato dal pannello prima di mettere la chiave su Vercel. Il tetto contiene un
  utente; lo spend limit contiene tutti.

### Variabili d'ambiente dell'import

| Variabile | Default | Cosa fa |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(assente)* | Accende l'estrazione vera. Non ancora su Vercel |
| `ANTHROPIC_WORKSPACE_ID` | *(assente)* | Opzionale: header `anthropic-workspace-id` per le chiavi identity-linked (`src/server/anthropic.ts`); con una chiave di workspace non serve |
| `IMPORT_AI_MODEL` | `claude-sonnet-5` | Il modello dell'estrattore. È configurazione, non codice |
| `IMPORT_AI_EFFORT` | *(assente)* | Opzionale, `low`/`medium`/`high` → `output_config.effort` su tutte le chiamate. Consigliato `low` con Opus: è trascrizione, non ragionamento |
| `IMPORT_LIMITE_30GG` | `3` | Import massimi per utente nei 30 giorni precedenti; `0` disattiva (solo sviluppo). Letta a ogni richiesta |
| `IMPORT_CONCORRENZA` | `4` | Chiamate di pagina in volo insieme. Un'ipotesi sul tier API: la verifica è il primo run reale |
| `IMPORT_MOCK` | *(assente)* | Solo sviluppo, mai su Vercel: un fixture al posto del modello (tabella sopra). Ignorata se c'è la chiave |

## Spunta pasti

Il piano assume che ogni pasto avvenga com'è scritto; la spunta corregge le
eccezioni. Dalla Settimana, per i giorni già passati (e per la settimana
precedente, dal link "‹ settimana scorsa"): **Saltato**, **Ho mangiato
altro**, oppure **Ho mangiato un altro piatto** scegliendolo dal repertorio.
Un pasto saltato riporta subito i suoi ingredienti nel residuo; un piatto
sostituito storna il previsto e addebita il sostituto. Il default resta
"mangiato come da piano": si spuntano solo le eccezioni, niente streak né
diari.

### Le alternative (29/08/2026)

Le diete vere sono piene di "oppure": dal 29/08 il dominio le rappresenta. Due piatti
fissati sullo stesso giorno sono sorelle fra cui il planner sceglie; dentro il piatto,
i **componenti con opzioni** ("Bevanda: latte *oppure* yogurt greco") si risolvono al
check-in col criterio *meno confezioni nuove vince, a parità rotazione*, e la scelta
della settimana vive sullo slot (`meal_slot_choice`, migrazione 0006 — già applicata
in produzione). Un piatto senza componenti si comporta esattamente come prima. Spec:
[`docs/superpowers/specs/2026-08-29-alternative-design.md`](docs/superpowers/specs/2026-08-29-alternative-design.md).

### Il piano vero è caricato

Dal 28/08/2026 il repertorio non è più di prova: sono i **33 piatti del piano
vegetariano di Andrea** (`supabase/seed-piano-vegetariano.sql`), con il procedimento
di ogni ricetta nella descrizione, su **due settimane che ruotano** a partire da lunedì
31 agosto. Ogni piatto dice a quale settimana del giro appartiene e in che giorno; il
planner li rispetta e ruota solo su quello che resta libero.

Serviva perché il planner ruotava sull'indice del giorno *dentro* la settimana, che
riparte da zero ogni lunedì: con quattordici pranzi in repertorio ne avrebbe usati per
sempre gli stessi sette. I pasti configurabili salgono da cinque a sei, per tenere
separati i due spuntini della giornata invece di accorparli in uno.

### Il ciclo del residuo è chiuso

È la cosa che il prodotto deve saper fare, e la fa. Verificata il 28/08/2026 attraverso
l'app, sul database reale:

| | settimana 1 | settimana 2 |
|---|---|---|
| Riso (serve 80 g, confezione 1000 g) | 1 conf in lista | **assente**, ne restano 920 |
| Olio EVO (serve 10 ml, confezione 1 l) | 1 conf in lista | **assente**, ne restano 990 |
| Olio di semi | 1 conf in lista | **assente**, ne restano 990 |
| Pomodorini (servono 750 g, conf. 500 g) | — | 2 conf, 1000 g |

La seconda settimana la lista base è **vuota**: «Niente da comprare qui». L'app ha smesso
di chiedere quello che c'è già in casa, che è l'intero punto del modello.

Le date sono state fatte invecchiare di sette giorni con `supabase/simula-lunedi.sql` per
non aspettare il lunedì: **le date sono simulate, il calcolo no** — stessi dati, stessa
app, stesso `list-builder`.

### Cosa è stato verificato dal vivo

Login col magic link, creazione di ingredienti e piatti, check-in settimanale,
generazione della lista, split base/top-up sul flag deperibile, spunta, chiusura della
spesa con accumulo del residuo, allineamento del top-up quando il piano cambia a spesa
già fatta, correzione manuale del residuo, ricerca fra 70 ingredienti.

### Cosa resta non provato

Classe `stima` e il controllo staple a 90 giorni (serve far invecchiare una data di tre
mesi), decadimento del fresco e congelatore su dati veri (nessun deperibile ha ancora un
residuo), riordino delle aree, lettura offline — che **non funziona** ed è un traguardo
a sé, vedi sotto.

## Meal prepping

Cucinare oggi quello che mangi un altro giorno. Dal foglio azioni di un
pasto: **Ne preparo di più** (le porzioni extra escono subito dal residuo ed
entrano nei Pronti, frigo o freezer), **Uso una porzione pronta** (il pasto
non consuma ingredienti crudi), **Cucinato ma non mangiato** (la tua
porzione finisce nei Pronti). La sezione **Pronti** della Dispensa mostra i
lotti: le porzioni fresche durano 3 giorni, le congelate 90, poi spariscono
da sole. Dichiarare il prep prima di confermare la settimana fa comprare
alla lista le quantità giuste; dopo la spesa, ci pensa il registro degli
storni.

## Correggi la dispensa con una nota

In cima alla Dispensa: scrivi (o detti col microfono) "ho finito il riso,
l'olio è a metà" e l'AI propone le correzioni — quelle sicure si applicano
subito con un tasto Annulla, quelle dubbie chiedono conferma, i nomi
sconosciuti vengono segnalati e mai inventati. In produzione la funzione si
accende impostando `ANTHROPIC_API_KEY` (il modello si sceglie con
`DISPENSA_AI_MODEL`, default `claude-haiku-4-5`); prima di scegliere, gira
`npm run eval:dispensa` con la chiave nell'ambiente per confrontare i
modelli sulla batteria di note di prova. In locale, `DISPENSA_AI_MOCK=1` in
`.env.local` accende un interprete a regole per lo sviluppo.

Lo stesso vale per l'estrattore della dieta: `npm run eval:import` gira solo in locale,
con la cartella `diete/` (gitignored, dati sanitari veri) e la chiave nell'ambiente —
senza, stampa NON ESEGUITO ed esce 0. Confronta i modelli elencati in
`EVAL_IMPORT_MODELLI` (es. `claude-sonnet-5,claude-opus-5`) sulle diete del manifest
`diete/eval-manifest.json` (senza manifest: la dieta 6), con `EVAL_IMPORT_PIPELINE`
(`pagine`, `singola`, `entrambe`) e `EVAL_IMPORT_SET` (`originali`, `compresse`,
`entrambi`), e produce un report in `diete/estrazioni/` con una tabella per
dieta × set di foto e righe per modello × pipeline: solo contatori,
percentuali, token e costo stimato, mai un testo della dieta. La regola di decisione sul
modello è scritta nella spec 05/09, §4.

## Dove sta cosa

| File | Cosa contiene |
|---|---|
| [`spesa-one-pager.md`](spesa-one-pager.md) | Analisi di mercato e go/no-go. Conclusione: no-go come business allo stato attuale, go come strumento personale |
| [`spesa-backlog-nicchia.md`](spesa-backlog-nicchia.md) | Backlog della nicchia "dieta dal nutrizionista", rivisto il 05/09: ordine di costruzione delle feature e priorità |
| [`docs/superpowers/specs/2026-08-26-spesa-design.md`](docs/superpowers/specs/2026-08-26-spesa-design.md) | **La spec.** Modello dati, componenti, fasi, e tutte le decisioni prese durante il design con il loro perché |
| [`docs/superpowers/specs/DESIGN-SYSTEM.md`](docs/superpowers/specs/DESIGN-SYSTEM.md) | Colori, tipografia, forme, regole di stato — valori estratti dalle schermate reali |
| [`docs/superpowers/specs/2026-09-05-import-in-produzione-design.md`](docs/superpowers/specs/2026-09-05-import-in-produzione-design.md) | Import in produzione: estrazione a pagine in parallelo, tetto per utente, eval che decide il modello, checklist locale |
| `design/*.dc.html` | 69 artboard. Le 12 definitive sono elencate sotto; il resto è l'archivio delle direzioni esplorate |
| `design/canvas.json` | Impaginazione del canvas: pagina 1 = v1 definitiva, pagina 2 = archivio |
| `design/build.sh` | Rigenera il canvas da tutti gli artboard |

**Canvas pubblicato:** <https://claude.ai/code/artifact/154c7e8b-23fb-4300-bd72-5d71733e4b30>
Per aggiornarlo: `bash design/build.sh`, poi ripubblicare quello stesso URL con lo strumento Artifact.

## Le schermate della v1

Definitive: `Lista`, `Settimana`, `Piatti`, `Piatto`, `Ingrediente`, `Impostazioni`,
`Reparti`, `Scegli`, più gli stati vuoti `VuotoPiatti` (primo avvio/onboarding),
`VuotoLista`, `VuotoFatta`, `VuotoPiatto`.

Due schermate sono nate dopo, dall'uso reale, e **non hanno un artboard**: l'elenco degli
ingredienti (`/impostazioni/ingredienti`) e la Dispensa (`/dispensa`). Seguono i token e i
pattern del design system, ma chi le tocca non ha una specifica visiva contro cui
confrontarsi — a differenza di tutte le altre.

Tutto il resto in `design/` è archivio: direzioni visive scartate (`Dir*`, `Mag*`,
`Rail*`, `Hero*`), prove di testata e logo (`Hdr*`, `Logo*`, `Grid*`, `Casa*`, `Ico*`),
e varianti di interazione (`Int*`, `Set*`). Servono a non riaprire discussioni già chiuse.

## Le decisioni che non si deducono dal codice

- **Sei aree fisse**, personalizzabile solo il loro ordine. Il marchio dipende da questo:
  se il numero di aree cambia, il logo va rifatto.
- **Niente inventario**: il residuo è derivato da `porzione vs formato confezione`,
  mai inserito a mano. È il cuore del prodotto.
- **Controllo staple a 90 giorni fissi**, non una stima appresa. Ma la v1 registra
  comunque ogni acquisto, così la Fase 4 non parte da zero.
- **Il selettore settimana non naviga** in v1 (la freccia c'è ma è inerte). Le settimane
  vanno comunque salvate.
- **Macro e calorie fuori dalla v1**, con le colonne già previste su `ingredient`.
- **Stack**: Next.js + TypeScript, Supabase con RLS e `user_id` su tutto fin dal primo
  giorno, PWA installabile su Android, offline-first sulla schermata lista.

## Sviluppo locale

```bash
npm install
cp .env.local.example .env.local   # valorizzare con URL e anon key del progetto Supabase
npm run dev                        # http://localhost:3000, Turbopack
```

Verifica prima di ogni commit:

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
```

## Deploy — istruzioni per il proprietario

Fatto il 28/08/2026: <https://spesa-zeta.vercel.app>. Le variabili d'ambiente sono già
impostate su Vercel per production, preview e development. Per ripubblicare dopo una
modifica basta `npx vercel --prod` dalla cartella del progetto.

### Passo 0 — prima di aprire l'app

Nell'ordine, altrimenti l'app non è usabile (senza schema non c'è nulla su cui
autenticarsi, senza un utente non c'è un uuid da mettere in seed.sql, senza seed.sql
non c'è repertorio):

1. **Applicare lo schema.** Nell'SQL Editor del progetto Supabase, eseguire per intero
   `supabase/migrations/0001_schema.sql` e poi `supabase/migrations/0002_rls.sql`, in
   quest'ordine. Sono idempotenti solo la prima volta: non ri-eseguirli su un database
   già inizializzato.
2. **Registrarsi col magic link.** Aprire l'app (in locale con `npm run dev`, o sull'URL
   di produzione dopo il deploy sotto) e inserire la propria email in `/entra`. Il link
   arriva via mail: cliccarlo crea l'utente in `auth.users` e apre una sessione.
3. **Eseguire `supabase/seed.sql`** nell'SQL Editor, per intero. Trova l'utente per
   email (quella del login), quindi non serve copiare nessun uuid; è rieseguibile senza
   danno. Inserisce i quattro pasti di default e la riga `settings`.
3b. **Facoltativo: `supabase/seed-ingredienti.sql`.** Settantuno ingredienti di base di un
   supermercato italiano, già classificati per area, classe di residuo e formato confezione
   — i tre campi che nessun database pubblico espone e che vanno decisi comunque. Salta
   quelli che esistono già e non sovrascrive mai le correzioni fatte a mano.
4. **Solo ora aprire l'app per usarla davvero.** Senza questo passo, le Impostazioni
   seminano comunque quattro pasti di default al primo accesso (vedi C3 nel report della
   revisione finale), ma repertorio e dispensa restano vuoti finché non li popoli a mano.

Per il deploy vero e proprio:

```bash
npx vercel --prod
```

Poi, nel progetto Vercel:
1. Impostare le variabili d'ambiente `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (gli stessi valori di `.env.local`).
2. Aggiungere l'URL di produzione alle Redirect URL di Supabase Auth — altrimenti il
   magic link di login rimanda a `localhost`. L'URL da autorizzare è
   `https://<dominio-produzione>/auth/callback`, non solo la root: è lì che il link
   atterra e scambia il code per una sessione (vedi C1 nel report della revisione finale).

L'URL di produzione è <https://spesa-zeta.vercel.app>; quello autorizzato in Supabase è
`https://spesa-zeta.vercel.app/auth/callback`.

### Limite noto: la lista non è ancora leggibile offline

Il guscio dell'app (l'HTML/JS/CSS) è in cache dal service worker e si apre anche senza
rete. I **dati** della lista no: arrivano da Supabase a ogni caricamento. Riaprire l'app
in corsia, senza segnale, mostra la schermata ma non la lista della spesa — non uno
stato di errore chiaro, semplicemente niente da vedere. Le spunte fatte offline si
accodano e si sincronizzano al ritorno della rete (questo funziona); è la *lettura*
della lista a non funzionare offline. Non è un difetto da correggere in questa fase:
è un traguardo distinto, deliberatamente fuori dalla Fase 1.

## Il gate

Fase 1 = repertorio + check-in + lista. Poi **tre settimane di uso reale** prima di
costruire la Fase 2. Se la Fase 1 non viene aperta per tre settimane di fila, le fasi
successive automatizzano un rituale che non esiste e non vanno costruite.

Il criterio è misurabile e va misurato davvero: per tre settimane consecutive la lista
viene generata, usata al supermercato, e la spesa serale per il singolo giorno non
avviene più di una volta a settimana.

**La misurazione può cominciare dal 31/08/2026**: l'app è in produzione, installata sul
telefono, il repertorio è popolato e il ciclo del residuo è provato. Quello che manca non
è più il software: sono tre settimane di spesa vera. Attenzione a non confondere le due
cose — che il modello funzioni (dimostrato) non dice ancora che il rituale regga
(da dimostrare), ed è quest'ultimo il vero gate.
