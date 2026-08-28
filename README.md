# Spesa

App personale che trasforma un piano alimentare già esistente in una lista della spesa
ordinata come cammini nel supermercato. Costruita per uso proprio, con la porta aperta
a un eventuale prodotto.

**In produzione:** <https://spesa-zeta.vercel.app>

**Stato: Fase 1 completa e provata sul campo il 28/08/2026.** Dominio puro
(`list-builder`, `pantry`, `planner`, `week-shape`, `chiusura`), 258 test automatici
verdi, schema su un progetto Supabase vero, quattordici schermate, PWA installabile con
guscio offline sulla lista, in produzione su Vercel.

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

## Dove sta cosa

| File | Cosa contiene |
|---|---|
| [`spesa-one-pager.md`](spesa-one-pager.md) | Analisi di mercato e go/no-go. Conclusione: no-go come business allo stato attuale, go come strumento personale |
| [`docs/superpowers/specs/2026-08-26-spesa-design.md`](docs/superpowers/specs/2026-08-26-spesa-design.md) | **La spec.** Modello dati, componenti, fasi, e tutte le decisioni prese durante il design con il loro perché |
| [`docs/superpowers/specs/DESIGN-SYSTEM.md`](docs/superpowers/specs/DESIGN-SYSTEM.md) | Colori, tipografia, forme, regole di stato — valori estratti dalle schermate reali |
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
