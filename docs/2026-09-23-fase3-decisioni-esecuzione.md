# Fase 3 del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 23/09/2026 · **Ramo:** `redesign/piatti-fotocamera`, 15 commit di esecuzione da `ce5049c` a `b09a812` [misurato con `git rev-list`], unito con la PR #5 (`df1e4d1`)
**Piano:** `docs/superpowers/plans/2026-09-23-piatti-fotocamera.md`
**Spec:** `docs/superpowers/specs/2026-09-23-piatti-fotocamera-design.md`

L'esecuzione subagent-driven tiene il suo registro in `.superpowers/`, una cartella che git
ignora e che a fine lavoro viene cancellata. Questo file la sostituisce: raccoglie le decisioni
che ho preso al posto di Andrea durante l'esecuzione, ognuna con quanto costa se è sbagliata,
così Andrea può rifare quelle che non gli tornano.

## Il dato di processo: il piano non ha sbagliato i test, ha sbagliato una riga di prodotto

Nella fase 2, tredici difetti su tredici stavano nel codice di test scritto nel piano. Questa
volta il piano avvertiva che il codice di test era una bozza e partiva da una scansione
preliminare, e i risultati sono stati questi [fonte: i rapporti dei sette task con codice]:

- **Correzioni ai test del piano: zero.** In nessun task l'implementatore ha dovuto correggere
  un test scritto nel piano. Nel Task 8 ne sono cambiati tre, ma perché li aveva resi obsoleti
  la nuova guardia, non perché il piano li avesse scritti male.
- **Un difetto nel codice di produzione del piano.** «Ultimo foglio alle» prendeva l'ora di
  `pagine[n-1]`, cioè della pagina in fondo alla lista. La spec §E chiede quella dell'ultima
  pagina **aggiunta**, e dopo un riordino la banda avrebbe mostrato un'ora falsa. L'ha trovato
  la review del Task 6.
- **Due difetti che il piano non poteva vedere, trovati nel browser e in review:** il doppio
  tocco sul tondo indietro (sotto) e la sovrapposizione del tondo con la freccia della Testata.

La review dopo ogni task ha fermato il difetto del piano, e la sonda nel browser ha fermato gli
altri due. jsdom non avrebbe visto nessuno dei tre.

## Le decisioni, con il loro costo

| # | Decisione | Perché | Costo se è sbagliata |
|---|---|---|---|
| 1 | Il ramo resta rosso fra il commit del Task 6 e quello del Task 7 | il piano lo dichiarava; evitarlo avrebbe richiesto un adattatore temporaneo delle props | un bisect su quel commit vede test rossi |
| 2 | «Ultimo foglio alle» usa l'ora più recente fra tutte le pagine, e non `pagine[n-1]` come scriveva il piano | vale la spec §E, «l'ultima pagina aggiunta» | una riga da riportare indietro |
| 3 | Il Task 8 fa anche lavoro che il piano non prevedeva: misura il doppio `back()` e, visto che si usciva, aggiunge la guardia; aggiunge il test «i fogli non accendono il Dock»; allinea `DESIGN.md` su `.anim-scatto` e sullo 0,09 del bordo foto | li aveva trovati la review del Task 7, e il Task 8 era già il posto per i difetti visti nel browser | tre righe e due test da togliere |
| 4 | Il ponte `DESIGN-SYSTEM.md` dice «chiusa con la PR del ramo», senza data | il merge lo faceva Andrea, la data non si sapeva | una riga |
| 5 | `.anim-scatto` corretto solo in `tokens.css`; restano `design/sistema/CLAUDE.md` e `prompt-iniziale.md` | fanno parte del pacchetto di Claude Design, e lo aggiorna Andrea a mano | quei due file citano ancora un nome che il codice non usa |
| 6 | Il doppio tocco su `Ho finito` non ha una guardia, solo un test | `estrai` cambia la vista già dentro il click, quindi il secondo tocco arriva su un nodo smontato [misurato in jsdom; il test fallisce se si sposta quel `setVista` dopo un `await`] | se un giorno `estrai` diventa asincrono prima di cambiare vista, il test lo segnala |
| 7 | La finestra di 400 ms dopo ogni chiusura della fotocamera scarta tutti i tocchi, non solo quelli sulla Testata | è la correzione più piccola; spostare il tondo avrebbe tradito il mockup | un tocco voluto entro 400 ms dalla chiusura va perso [ipotesi: nessuno lo fa di proposito] |

## Misure nel browser, a 375 × 812, dati finti [misurato, rapporto del Task 8]

- **Gesto indietro** (Task 5): `pushState(null, '')` sullo stesso URL, poi indietro. Arriva
  solo un `popstate`: niente ricaricamento, niente rimontaggio, URL invariato. Vale sia per
  `history.back()` sia per l'indietro del browser. Next riscrive `history.state` anche dopo
  `pushState(null)`, quindi la voce non si riconosce da `history.state`.
- **Piatti:** con `scrollTop` a 706,5, l'ultima riga finisce 33,92 px sopra la barra grande e
  51,92 px sopra la ridotta. Le righe sono alte 75,9, l'aggiungi 56. Il campo di ricerca resta
  fermo a `top` 92.
- **PDF scelto:** a 812 px di altezza la porta finisce 151,77 px sopra il Dock; a 375 × 600
  finisce 9,77 px sopra, con `scrollTop` 70. Il nome del file va in ellissi, e `Cambia file` è
  alto 44.
- **Fotocamera:**
  - la radice è alta quanto `.guscio`, e la tab bar è assente dal DOM;
  - nel caso peggiore la banda arriva a 258 px dal fondo, contro il limite di 268;
  - «Rivedi» con 12 fogli è alto 724 px, cioè 812 − 88.
- **Doppio `back()`:** prima della guardia si usciva verso la pagina precedente; con la guardia
  si resta. Il `popstate` arriva dopo 16–33 ms.

**Non eseguiti, restano per il gate dal telefono:** la fotocamera vera, perché il browser della
sonda non ne aveva una e il modo camera l'ho provato con uno stream finto disegnato su canvas;
lo swipe indietro di iOS; i tocchi veri.

## Rimasto aperto, di proposito

- **`FogliPresi`:** togliendo una riga che non è l'ultima si perde il fuoco. Spostando una riga
  in giù probabilmente anche [ipotesi]. Il Tab esce dal dialogo, anche se il dialogo è dichiarato
  `aria-modal`.
- **Miniature rotte in sviluppo:** le miniature seminate da `iniziali` si rompono con lo
  StrictMode, perché il cleanup revoca URL ancora in uso. C'era già su `main`, e in produzione
  non succede [ipotesi logica]. Correggerlo vorrebbe dire toccare una parte che la spec vuole
  conservata così com'è.
- **Tasto Avanti:** dopo aver chiuso la fotocamera, l'Avanti del browser lascia una voce di
  cronologia orfana. È la stessa classe di problema che la spec §K accetta per il
  ricaricamento.
- **Tetto dei 12 fogli:** due scatti rapidi a 11 fogli lo superano. C'era già; la route risponde
  413 e nessun dato si perde.
- **`useNascondiBarra` è un booleano**, non un contatore: col secondo chiamante va cambiato.
- **Il flake di `lista/__tests__/page.test.tsx`:** fallisce a volte nella suite intera, a
  seconda dell'ordine dei file, per via di `localStorage`. Non riguarda questo ramo: da
  guardare in un task a parte.
- **Un avviso di jsdom**, `Not implemented: navigation`, nell'output del test sul secondo tocco.
  Il test passa.

## Tre note operative per chi viene dopo

- **In un worktree nuovo `tsc` fallisce** su `LayoutProps` finché non si lancia
  `npx next typegen`. I tipi generati da Next non stanno in git.
- **Il server di sviluppo nel worktree** non ha `.env.local`: per una sonda sotto `/auth`
  bastano due variabili Supabase finte passate sulla riga di comando. `next dev` riscrive
  `next-env.d.ts`: va ripristinato prima di committare.
- **Deploy:** `npx vercel --prod` ha cercato di scaricare una versione nuova della CLI e si è
  piantato per otto minuti. Poi, alla domanda «upgrade now?», il sì ha installato la CLI
  **dentro il progetto**, tra le dipendenze di runtime, con circa 8000 righe di lockfile.
  Annullato prima di committare. Il comando da usare è
  `npx --yes vercel@59.26.0 --prod`, rispondendo `n` alla domanda di aggiornamento.
