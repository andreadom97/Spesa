# Oggi, la home: le decisioni prese durante l'esecuzione

**Data:** 03/10/2026 · **Ramo:** `oggi-home` (da `f3a45c9`, il commit del piano) · **Piano:**
`docs/superpowers/plans/2026-10-03-oggi.md` · **Spec:**
`docs/superpowers/specs/2026-10-03-oggi-design.md` (approvata da Andrea il 03/10, precisata in
esecuzione lo stesso giorno: ogni precisazione è marcata «precisato in esecuzione, 03/10»)

**In una riga.** Oggi è costruita e rivista sul ramo, task per task, ma non è mai stata vista in un
browser né su un telefono: la verifica nel browser del piano è **NON ESEGUITA** (motivo e
checklist sotto), e il merge su `main`, che pubblica da solo (Vercel), aspetta l'ok di Andrea.
Nessuna migrazione.

**Cosa resta, in ordine:**
1. Le prove nel browser (checklist in «La verifica nel browser: NON ESEGUITA»), da fare con
   Andrea, solo in lettura.
2. Sei domande di prodotto e di disegno per Andrea («Le domande aperte»). Nessuna blocca il
   merge; la prima (il flag `congelato`) cambia cosa vede chi ha qualcosa in congelatore.
3. Le prove dal telefono (spec §J.4), dopo il merge.

Questo file sostituisce il registro che l'esecuzione subagent-driven tiene in `.superpowers/`
(cartella ignorata da git, cancellata alla fine). Raccoglie le decisioni di Andrea, i ruling del
controller col loro costo se sbagliati, come sono stati eseguiti i task, i test del piano
cambiati e perché, le misure, i limiti noti e le prove da fare.

Etichette: `[misurato]` per ciò che è stato misurato, `[calcolato]` per ciò che discende da una
formula o dal CSS letto, senza misura a schermo, `[ipotesi, non testata]` per ciò che non lo è,
`[fonte: …]` per ciò che viene da altrove. Una prova non fatta si scrive **NON ESEGUITA**.
**Nessun numero di questo file è stato misurato nel browser o sul telefono.**

## Le decisioni di Andrea (03/10)

Dal brainstorming con i mockup, in testa alla spec; una riga per tema.

| # | Tema | Decisione |
|---|---|---|
| 1 | Che home | Operativa, niente statistiche: né calorie né aderenza al piano (con 233 pasti passati, 0 saltati e 3 spunte in tutto, l'aderenza uscirebbe ~100% per costruzione [fonte: spec, misurato il 03/10]) |
| 2 | Tab | Nuova «Oggi», prima voce della barra, e l'app parte da lì: Oggi · Lista · Piano · Dispensa |
| 3 | Quale pasto | Dall'ora, con fasce stimate dal nome del pasto: senza impostazioni né migrazione |
| 4 | Che azioni | Cambiare piatto (Scegli), segnare com'è andata (foglio azioni), proposte «con quello che hai» |
| 5 | Fattibile | Tutto in casa, poi «manca solo una cosa»; al massimo 2 proposte |
| 6 | Dalla dispensa, in home | Scade presto, da scongelare, Pronti; ogni blocco sparisce quando è vuoto |
| 7 | Forma | C2b «Bento», con le alternative B1 «Carte chiare» in un carosello dentro il poster |
| 8 | Dispensa non aggiornata | La home nasconde tutto ciò che ne deriva e si riempie col piano, più una tessera che spiega perché |
| 9 | Aggiornata | Ultima spesa chiusa nell'app entro 9 giorni; le modifiche a mano in Dispensa non contano |
| 10 | Il poster | Salta i buchi: sempre il prossimo pasto a casa con un piatto |
| 11 | Dal mockup al codice | Diretto, senza giro in Claude Design; i pezzi nuovi si scrivono in DESIGN.md |

Due correzioni ai mockup: via la riga «Hai tutto in casa» dal poster (dopo una spesa chiusa è vera
per costruzione); nessun avviso a tempo dopo `SCAMBIA`, l'annullo sta dentro il poster.

## Come è stato eseguito, task per task

Ogni task ha avuto un implementatore e una review (spec e qualità); i commit dei task:

| Task | Commit | Cosa |
|---|---|---|
| 1 | `eb2d8fe`, `c03af5e` | il tempo della giornata: fasce, prossimo pasto, caselle |
| 2 | `f0bd6c6`, `22355e6` | dispensa aggiornata, ingrediente principale, alternative |
| 3 | `e5ad09d` | scade presto, da scongelare, Pronti per piatto |
| 4 | `924f5ff` | i testi della home |
| 5 | `8851fc3` | l'ultima spesa chiusa e l'apertura della settimana |
| 6 | `990a59a`, `8e365ce` | token del poster, poster, carosello, tessere |
| 7 | `d321729`, `839c816` | la pagina `/oggi`, con scambio, annullo e foglio azioni |
| 8 | `dde7531` | la tab bar a quattro voci |
| 9 | `556043e` | gli ingressi, Scegli da Oggi, la Dispensa aperta su una voce |
| 10 | questo commit | i documenti |

Sotto, per ogni task: i ruling (una riga del ledger ciascuno, **in ordine**, col costo se
sbagliati), le deviazioni dell'implementatore accettate dalla review, e l'esito della review.

### Prima dei task (il controller)

Gate e pre-flight [fonte: ledger del controller]: la 8c è su `main` (`quantita: number | null` in
`src/domain/types.ts:42`); l'helper della data locale del lavoro «data locale» (task_6f8e8d7e) non
c'è in `src/domain/date.ts`, quindi `oggiLocale` formatta da sé; le firme delle funzioni e dei
componenti esistenti che il piano usa verificate contro il codice; nessuna coppia di task con
interfacce incompatibili. Nel worktree nuovo `tsc` dava un `LayoutProps` mancante (i tipi generati di Next
assenti): `npx next typegen` li genera in `.next`, ignorata da git.

- **Ruling.** `CARICO…` resta maiuscolo letterale in `oggi/page.tsx`: è l'idioma di tutte le
  pagine (Scegli, Lista fatta, Dispensa) e i loro test lo cercano così; il vincolo «sentence
  case» vale per i testi nuovi del poster e della griglia. *Se sbagliato:* una stringa da cambiare.
- **Ruling.** `etichetta: 'OGGI'` nell'indietro di Scegli: l'API `Indietro` di `Testata` prende
  l'etichetta già maiuscola (precedente `'PIANO'` nello stesso file). *Se sbagliato:* una stringa.
- **Ruling.** `'#fff'` nell'icona di Oggi in `TabBar.tsx` è ammesso: è il bianco che usano le
  altre icone dello stesso file, e `var()` negli attributi SVG di presentazione non è affidabile.
  *Se sbagliato:* un token in `style`.
- **Ruling.** `oggiLocale` formatta la data da sé (l'helper locale manca): task_6f8e8d7e non è
  atterrato. *Se sbagliato:* quando il fix della data arriva, `oggiLocale` va riallineata al suo
  helper (pochi minuti).

### Task 1: il tempo della giornata (`eb2d8fe`, `c03af5e`)

`oggiLocale`, `fasceDi`, `prossimoPasto`, `pastoDopo`, `caselleGiornata`, in `src/domain/oggi.ts`.
Review 1: spec ❌ con due Important (la regex di `normalizza` aveva i caratteri combinanti
letterali invece dell'escape; il «senza piatto» di §B.3 non era fissato da un test) e sette
minor. Giro di correzione: tre punti risolti, zero aperti.
- **Ruling.** §B.3 «Senza piatto → come futuro» si legge con la precedenza della spec (poster >
  fuori > fascia finita > futuro): un pasto senza piatto non ha un aspetto suo, quindi è «futura»
  se la fascia non è finita e «passata» se è finita. Il codice resta; un test lo fissa. *Se
  sbagliato:* una riga in `caselleGiornata` e un'attesa nel test. Precisato nella spec §B.3.
- **Deviazione accettata:** le firme della spec §G.3 e §G.4 (`fasciaDi`, `oggi.test.ts`,
  `caselleGiornata({ data, adesso, slotPoster })`) sono state precisate dal piano in `fasceDi`,
  `oggi.tempo.test.ts`, `caselleGiornata({ slots, defs, minuti, slotPosterId })` e nell'unione
  `Prossimo`. La spec è allineata in §G.3 e §G.4.
- L'implementatore aveva lasciato `src/domain/oggi.ts.bak` non tracciato (una modifica via shell,
  contro il vincolo «solo Edit e Write»): il controller l'ha controllato e cancellato, e ha
  verificato il risultato sui byte.

### Task 2: dispensa aggiornata, ingrediente principale, alternative (`f0bd6c6`, `22355e6`)

Review: spec ✅, qualità Approved (col fix pre-review).
- **Ruling.** `ingredientePrincipale` non lancia mai: se `righeEffettive` o `convertiInUnitaBase`
  lanciano (opzione rimossa, unità incompatibile) restituisce `null`, perché l'icona è decorativa;
  in `alternative`, `consumoSlot` del piatto di stasera a settimana chiusa è avvolto: se lancia,
  `liberato` è una mappa vuota (prudente: meno proposte, mai un falso «tutto in casa»). Più test
  per i due casi e per il candidato illeggibile, perché la pagina del Task 7 li chiama nel render
  e un piatto corrotto renderebbe bianca tutta la home. *Se sbagliato:* due `try/catch` da togliere.
- **Spec precisata** (§C.3): la lettura «× persone» della spec è in realtà `× persone ×
  fattoreConsumo(slot)`, cioè `1 + porzioniPreparate`, perché lo storno di `aggiornaSlot` conta
  così le porzioni da preparare. Il test del piano era già giusto.
- **Spec precisata** (§G.4): `ingredientePrincipale` restituisce `{ ingrediente, icona } | null` e
  `alternative` prende `AlternativeInput`.

### Task 3: scade presto, da scongelare, Pronti (`e5ad09d`)

Review: spec ✅, qualità Approved; le due deviazioni accettate dal revisore.
- **Verifica richiesta dalla spec §D.2** [misurato, leggendo il codice]: `chiudiSpesa`
  (`src/data/lista.ts`, righe 547–557), a un riacquisto, scrive `residuo` e `ultimo_acquisto` e
  azzera `scadenza_manuale`, ma **non tocca `congelato`**: il flag resta vero dopo un riacquisto
  fresco.
- **Ruling.** La tessera `SCONGELA` segue il flag così com'è: la home dice quello che dice la
  Dispensa, che mostra lo stesso ingrediente «in congelatore» e ne stima la durata a 90 giorni
  (`GIORNI_CONGELATO` in `src/domain/pantry.ts`). Azzerare il flag alla chiusura cambia la
  semantica della spesa ed è una scelta di prodotto fuori da questo piano. *Se sbagliato:* una
  tessera `SCONGELA` a torto per un ingrediente ricomprato fresco dopo essere stato congelato;
  oggi in produzione non c'è niente in congelatore [fonte: spec, misurato il 03/10]. È la
  domanda 1 per Andrea.
- **Deviazione accettata:** un lotto congelato compare una volta sola: due pasti `daPronti` di
  domani sullo stesso piatto davano due tessere uguali sullo stesso lotto, con chiave React
  doppia. Un test lo fissa.
- **Deviazione accettata:** un test in più, «piatto illeggibile non fa lanciare `daFare`».
- **Risolto dal controller:** `daFare` vede domani anche quando cade nella settimana dopo, perché
  il Task 7 passa `tuttiGliSlot` = settimana + settimana di domani. Coperto da un test della
  pagina (domenica sera, tessera «Scongela» da un'altra settimana).

### Task 4: i testi della home (`924f5ff`)

Review: spec ✅, qualità Approved. Nessun test cambiato; il codice non importa `sommaGiorni`
(le interfacce del piano lo citavano, il codice non lo usa).

### Task 5: l'ultima spesa chiusa e l'apertura della settimana (`8851fc3`)

Review: spec ✅, qualità Approved. Nessuna deviazione dal piano.
- **Ruling.** Oggi non chiama `completaAssegnazioni`: `creaSettimana` assegna già i piatti col
  planner, `completaAssegnazioni` ripara solo le bozze con buchi ed è una scrittura di
  pianificazione che sta al Piano; la home salta comunque i pasti senza piatto (§B.1). *Se
  sbagliato:* in una bozza coi buchi la home mostra meno pasti finché non si apre il Piano.
- **Spec precisata** (§F e §G.3): l'helper è `apriSettimanaCorrente(oggi)` in
  `src/data/apertura.ts`, non `apriSettimanaCorrente()` in `src/data/settimana.ts`.

### Task 6: token, poster, carosello, tessere (`990a59a`, `8e365ce`)

Implementatore DONE_WITH_CONCERNS. Review 1: spec ❌ con un Important imposto dal piano (l'area di
tap di `.pillola-poster` era 42, non 44) e sei minor. Giro di correzione: due punti risolti.
- **Ruling.** L'etichetta della banda usa `--poster-testo-3` (66%), non un decimo token al 60%
  come dice §C.5: sei punti di alfa su un'etichetta mono non giustificano un token in più.
  *Se sbagliato:* un token e una riga. Precisato nella spec §C.5 e scritto in DESIGN.md.
- **Ruling.** Con la banda delle alternative il poster non mostra la sua icona (il Task 7 passa
  `icona = null` quando ci sono voci): è il mockup B1 approvato
  (`oggi-caroselli-v2.html:116-128`, poster con banda senza icona hero), e l'icona finirebbe
  coperta dalle carte. *Se sbagliato:* il poster con proposte perde un'icona decorativa.
  Precisato nella spec §B.4.6 e scritto in DESIGN.md.
- **Ruling.** `larga` resta la lettura del piano: `span 2` e altezza minima 64, il contenuto
  decide il resto (una forma davvero compatta, nome a 14–17 su una riga, sarebbe da disegnare).
- **Ruling.** `.pillola-poster::before` passa a `inset: -4px 0`: il bordo da 1 px riduce il
  padding box su cui si posiziona il `::before` a 36, e con −3 l'area era 42. Il vincolo globale
  «tap ≥ 44» vince sul codice del piano. *Se sbagliato:* 2 px di area di tap in più.
- **Ruling.** L'etichetta di `TesseraBianca` (`POI · {PASTO}`, `DOMANI · {PASTO}`) passa da `--sec`
  a `--testo-2`: porta un'informazione, e DESIGN.md §2.1 e §11 riservano `--sec` alla
  decorazione (3,41:1 contro 6,23:1 su bianco [calcolato ora]). La spec tace sul colore. *Se
  sbagliato:* un'etichetta un po' più scura.
- **Correzioni dichiarate dall'implementatore, tutte confermate dalla review:** l'alone del nome
  in `TesseraPiena` usa `coloreArea` (come `Tessera.tsx` della Lista) e non `tintaOpacaArea`;
  `role="list"` esplicito sul carosello (spec §C.5); `RIMETTI QUELLO DEL PIANO` su una riga sua
  (spec §C.6, «sotto le azioni»); `APRI LA LISTA` come pillola d'azione 38 con tap 44; il
  sottotitolo di `TesseraPiena` in `--ink-2` quando c'è l'area (4,63–6,46:1 contro 2,95–4,11:1 di
  `--testo-2` [calcolato ora]); sottotitolo con `maxWidth: 80%` e `lineHeight: 1.5`; `minHeight`
  tolto da `sopra()` (ridondante); `data-puntini` sul gruppo dei puntini (serve ai test).
- **Aggiunte non nel piano:** `.pillola-poster:disabled` e `.tasto-scambia:disabled`, senza
  opacità. `.tasto-scambia:disabled` usa `--tinta-neutra` (0,06) dove DESIGN.md §8 «Spento» dice
  0,10: dichiarata come eccezione in DESIGN.md §2.5, non allineata.
- **Concern all'epoca, ora nei documenti:** `.pillola-poster` a 0,09em e padding 14 contro 0,08em
  e 15 delle pillole d'azione (eccezione dichiarata); `--ink-2` in un ruolo nuovo (dichiarato in
  §2.1 e §2.5); `SCONGELA` a 4,3:1 (§D.2 alla lettera, sotto 4,5: domanda 2).

### Task 7: la pagina `/oggi` (`d321729`, `839c816`)

Review 1 (opus): spec ✅ nei percorsi normali, un Important (una ricarica silenziosa che sostituisce
una non silenziosa: se fallisce, la pagina resta su `CARICO…` senza `RIPROVA`, o mostra lo stato
prima dello scambio senza errore) e otto minor. Le sette scritture del foglio azioni sono
identiche al Piano (verificato riga per riga). Giro di correzione: tre punti risolti.
- **Ruling.** Il minor «scritture concorrenti sullo stesso slot» (`scriviDalFoglio` senza
  `inVolo`, `COM'È ANDATA` mai spento durante uno scambio) sale a Important: `aggiornaSlot` è
  read-modify-write, e due azioni ravvicinate calcolano lo storno su uno stato vecchio, cioè un
  ledger della dispensa sbagliato. *Se sbagliato:* due righe in più.
- **Deviazioni dal piano, accettate:** (1) l'annullo si legge in `carica`, non nel render
  (`leggiPianoPrima` può cancellare l'annotazione di un altro slot, e il render non scrive in
  `sessionStorage`); (2) un piatto non più nel repertorio (`attivo = false`, soft delete) vale
  «senza piatto» e il poster lo salta: la bozza avrebbe mostrato un titolo vuoto; (3) la
  rilettura al ritorno in primo piano è silenziosa, e dopo una scrittura un fallimento mostra
  l'errore; (4) un contatore scarta le risposte superate (ritorno in primo piano, Strict Mode);
  (5) `APRI LA LISTA` nell'errore di caricamento è una pillola (spec §F), non un link di testo;
  (6) `settimanaDelPasto` usa `settimanaDomani ?? settimana` invece di un'asserzione di tipo;
  (7) la tessera «Domani» con la dispensa ferma esclude anche il caso in cui sia il pasto del
  poster stesso (oltre la lettera della spec, §D.5, che dice «se è diverso da Poi»).
- **Le note per l'implementatore** (`iconaIngrediente`, `LargaInCoda`, il commento `eslint-disable`)
  sono in «Le note per l'implementatore dei Task 6–9». Inoltre `CARICO…` esce dal componente
  `Carico` di `pannello/pezzi`, lo stesso di Lista fatta e Piatto, invece di un `<p>` in linea.
- **Trailer:** il commit del primo giro portava `Co-Authored-By: Claude Sonnet 5.5`, contro il
  vincolo; emendato (`0923065` → `d321729`, commit non pubblicato).
- Il giro di correzione ha aggiunto un ref `letturaAttesa` (un errore si mostra se manca una
  lettura non silenziosa riuscita), `inVolo` anche nel foglio azioni, `COM'È ANDATA` spento in
  volo.

### Task 8: la tab bar a quattro voci (`dde7531`)

Review: spec ✅, qualità Approved. Nessun'altra misura derivava dalla larghezza a tre voci: il Dock
è ancorato a `--dock-lato` e `AvvioMarchio` misura dal vivo. Cambiato anche
`src/app/__tests__/token.test.ts`, che ha i valori scritti a mano.
- **Ruling.** La verifica nel browser del Task 8 (barra a riposo e ridotta, larghezza misurata di
  `DISPENSA`) passa al Task 10 insieme alle altre prove nel browser: un solo avvio del dev server,
  con tutte le route pronte. *Se sbagliato:* un difetto di barra si scopre due task dopo.

### Task 9: gli ingressi, Scegli da Oggi, la Dispensa su una voce (`556043e`)

Implementatore DONE_WITH_CONCERNS. Review: spec ✅, qualità Approved. Il revisore conferma sul
sorgente di Next 16 (`app-router.js`, righe 268–279 e 84–96) che `{}` è giusto e che la lettera
del brief avrebbe fatto riaprire il foglio al ricaricamento.
- **Ruling.** Nella Dispensa la pulizia dell'indirizzo usa `replaceState({}, '', '/dispensa')` al
  posto di `window.history.state`: in Next 16 uno stato con `__NA` salta il wrapper del router e
  `canonicalUrl` resterebbe col parametro; è lo stesso schema di `vaiA` in
  `PannelloProvider.tsx:174-178`. *Se sbagliato:* una riga. **Da verificare nel browser:**
  l'indietro chiude il foglio e resta su `/dispensa`; uscire e rientrare non riapre il foglio.
- **Deviazione accettata:** cinque file di test fuori dal brief, che codificavano `/lista`
  (`guscio`, `rimando`, `piatti/da`, `piatti/page`, `importa/page`): il piano non li elencava, li
  ha fatti emergere la suite intera (7 fallimenti in 5 file); cambia solo il percorso atteso.
- **Concern:** con `useState` + `useEffect` (il codice del brief) Scegli può mostrare per un
  istante la pillola `PIANO` prima di `OGGI`; `piatti/page.tsx` evita il caso con
  `useSyncExternalStore`. Lasciato per tenere minimo il diff di Scegli (accordo con la 8c).

### Le note per l'implementatore dei Task 6–9, e come sono finite

Il piano lasciava all'implementatore alcune scelte, da annotare:
- **Task 6, il nome accessibile** di `CAMBIA` e `COM'È ANDATA` è il loro testo nel DOM: il
  maiuscolo lo fa `.pillola-poster` con `text-transform`, e il JSX scrive `Com&apos;è andata`
  (`react/no-unescaped-entities`). Eseguita come scritta.
- **Task 6, `tintaOpacaArea` o `coloreArea` per l'alone** di `TesseraPiena`. La firma di
  `tintaOpacaArea` era quella attesa, ma la tessera ha il colore d'area pieno come fondo, non la
  sua tinta al 26% (che è il fondo della tessera di dispensa): su un fondo saturo l'alone chiaro si
  vedrebbe come un contorno del testo. Scelto `coloreArea`, come `Tessera.tsx` della Lista.
- **Task 7, `iconaIngrediente`:** il piatto finto di una riga è sostituito da `trovaIcona(nome)`.
  Differenza voluta: la ricerca diretta dà l'icona anche a un ingrediente di classe `stima` che
  scade, che `ingredientePrincipale` scarta.
- **Task 7, `LargaInCoda`:** tolto il contenitore; la tessera dispari riceve la prop `larga`.
- **Task 7, il commento `eslint-disable-next-line react-hooks/set-state-in-effect`:** tenuto,
  perché serve (tolto per prova, il lint dà un errore su `void carica()`).
- **Task 8, la larghezza di `DISPENSA`** da misurare nel browser: **NON ESEGUITA** (vedi
  «La verifica nel browser»).
- **Task 9, `window.history.state` nella pulizia dell'indirizzo della Dispensa:** sostituito da
  `{}`, ruling sopra.

### Task 10: i documenti (questo commit)

Scritto, senza toccare logica: in `design/sistema/DESIGN.md` le sezioni §8 «Poster del pasto»,
«Carta alternativa e carosello nel poster» e «Tessere di Oggi», la «Tab bar» a quattro voci, gli
alfa di Oggi in §2.5, le due eccezioni in §12 e §13 «Decisioni del 03/10/2026 (Oggi)»; il ponte
`docs/superpowers/specs/DESIGN-SYSTEM.md`; le precisazioni della spec (B.3, B.4.6, C.3, C.5, D.2,
D.4, F, G.2, G.3, G.4); l'intestazione di `design/sistema/tokens.css`; due commenti di
`AvvioMarchio.tsx` che dicevano ancora Lista (solo commenti).
- **Oltre il brief, per non lasciare falsità** (ritocchi di una frase, nessuna riscrittura):
  DESIGN.md §2.1 (la riga di `--ink-2`), §4 (tab bar 338 / 274), §6 (le icone piene della barra),
  §7 (`.anim-avvio` parte su `/oggi`, non su `/lista`).
- **Da segnalare:** il codice mette l'icona dell'ingrediente principale anche sulle tessere `Poi`
  e `Domani` e sul lotto da scongelare; la spec §G.2 ne elenca tre luoghi. L'ho scritto come
  costruito in DESIGN.md §12 e nella spec, marcato «da confermare con Andrea» (domanda 3).

## I test del piano corretti, e perché

La regola: il codice di test del piano è una bozza da verificare, e se contraddice la spec vince la
spec. **Nessuna asserzione del piano è stata tolta o allentata**; i test sono stati aggiunti
[fonte: i report dei task e le review; non riverificato test per test in questo task].

| Task | Test | Cambiamento | Perché |
|---|---|---|---|
| 1, 2, 3, 4, 5, 6 | quelli del piano | nessuno | nessuna contraddizione con la spec; più test aggiunti (Task 1: accenti e «senza piatto»; Task 2: tre; Task 3: due; Task 6: otto più un'asserzione sul colore dell'etichetta di Poi) |
| 7 | «SCAMBIA fallito» | `vi.spyOn(console, 'error')` e `expect(log).toHaveBeenCalled()`; in più, il poster resta com'era | la pagina fa un `console.error` voluto; la spec §C.6 dice che il poster resta com'era |
| 7 | «errore di caricamento» | lo stesso spy e la stessa attesa | stesso `console.error` voluto |
| 7 | `beforeEach` / `afterEach` | default `leggiSettimana` → `null`; `vi.restoreAllMocks()`; due import in più | la pagina chiama `leggiSettimana` solo quando domani cade nella settimana dopo; gli spy vanno ripristinati |
| 7 | `componenti.test.tsx`, RIMETTI in volo | controlla anche `COM'È ANDATA` spento e riacceso | la correzione delle scritture concorrenti |
| 8 | `tabbar.test.tsx`, il primo | quattro voci nell'ordine Oggi, Lista, Piano, Dispensa con gli href; più un test su `/oggi` attiva | il piano aveva tre voci |
| 8 | `token.test.ts` | i valori scritti a mano (338, 274, 80, 64) e un commento | fuori dal brief: il file ha le misure della barra |
| 9 | Scegli, `describe` di `?da=oggi` | `window.history.replaceState(null, '', '/')` nel `beforeEach` | un test con `?da=oggi` che fallisce prima di ripulire non sporca gli altri |
| 9 | Dispensa | `afterEach` che azzera l'indirizzo; tre test oltre ai due del brief | la pulizia dell'indirizzo prima del foglio, un id inesistente, nessun parametro |
| 9 | cinque file fuori brief | il percorso atteso passa da `/lista` a `/oggi` | conseguenza diretta di §A.3; non cambiano altro |

Prove che i test nuovi mordono, dal report del Task 7 [fonte: mutazioni temporanee, poi
ripristinate]: icona sempre passata al poster → cade il test della banda; `larga` mai passata →
cade il test della tessera dispari; `settimanaDelPasto = settimana` → cade il test di lunedì in
bozza; `tuttiGliSlot = settimana.slots` → cade il test «Scongela» di domenica sera.

## Le misure

| Cosa | Valore | Provenienza |
|---|---|---|
| Suite di base, prima dei task | 163 file passati + 1 saltato; 2680 test passati + 1 saltato; 41 s | [misurato dal controller, nel worktree] |
| Suite intera sul ramo | 172 file passati + 1 saltato (173); 2803 test passati + 1 saltato (2804); 33,9 s | [misurato ora, il 03/10, sul ramo con i documenti di questo task non ancora committati; la stessa suite era 172 + 1 e 2803 + 1 a `556043e`, misurata dall'agente del Task 9] |
| Crescita rispetto alla base | +9 file (i nove file di test nuovi), +123 test | [calcolato: 172 − 163, 2803 − 2680] |
| `npx tsc --noEmit` | exit 0, nessun output | [misurato ora] |
| `npx eslint .` | exit 0, nessun output | [misurato ora] |
| `npm run design:token` | 11 test su 11 | [misurato ora] |
| `npx vitest run src/components/__tests__/avvio-marchio.test.tsx` | 19 su 19 | [misurato ora] |
| `npx next build` | compilato; `/oggi` fra le route (statica, client); tipi ok | [misurato dal controller prima del Task 10, nel worktree, con `.env.local` copiato dal repo principale]; non rilanciato dopo, perché da allora cambiano solo documenti e due commenti |
| Instabili noti (`gestione-pasti.test.tsx`, «ELIMINA dal dialogo» nella Dispensa) | non sono falliti in nessuna delle corse registrate | [misurato dagli agenti dei Task 7 e 9 e ora] |
| Conti della barra | 4 × 80 + 3 × 2 + 2 × 6 = 338; 4 × 64 + 3 × 2 + 2 × 6 = 274; con le misure di prima, 4 × 96 + 3 × 2 + 12 = 402, più dei 393 della cornice | [calcolato, spec §A.2] |
| Area di tap | `.pillola-poster` 38 − 2 (bordo) + 4 + 4 = 44; `.tasto-scambia` 36 + 4 + 4 = 44 | [calcolato dal CSS, non misurato nel browser] |
| Contrasti | `--ink-2` sulle sei aree 4,63–6,46:1 (`--testo-2` 2,95–4,11:1); `--poster-testo-3` su `--ink` 8,1:1; `--testo-2` su bianco 6,2:1 (`--sec` 3,4:1); `--avviso` su `--tinta-avviso` 4,7:1; `--freddo` su `--tinta-freddo` 4,3:1; `--errore` su `--ink` 3,5:1 | [calcolato ora con la formula WCAG sugli hex dei token; non misurato a schermo] |
| La seconda carta, a riposo | larghezza visibile = lista − 260: 56 px a 360, 71 a 375, 89 a 393 | [calcolato dal CSS, con il poster largo come lo schermo meno 28; non misurato] |
| Il secondo puntino | non si accende mai oltre circa 442 px | [calcolato dal CSS, stesso modello; non misurato] |
| Larghezza di `DISPENSA` in mono 8,5 / 0,12em | la spec dice circa 49 px in 80 | [fonte: spec, stima] **NON ESEGUITA** |
| Stato dei dati di Andrea | ultima spesa chiusa il 28/08; quindi dispensa «non aggiornata» il 03/10 | [fonte: spec, misurato il 03/10 in produzione] |

## I limiti noti

Dalla spec §I, che l'esecuzione non ha chiuso:
- **Il residuo è un avanzo, non un inventario.** A metà settimana `pantry_state.residuo` è ciò che
  resta dopo il piano della settimana: per questo le proposte non rubano ai pasti dopo, e il
  poster non dice «hai tutto».
- **Le fasce sbagliano a cavallo:** una cena alle 21:45 risulta già passata. Si corregge solo se
  succede davvero.
- **Data UTC nel resto dell'app.** Fra mezzanotte e le 2 Oggi (data locale) e il Piano (UTC)
  possono dire due giorni diversi. Difetto preesistente, fuori da questo piano; `oggiLocale` va
  riallineata all'helper quando il fix arriva (ruling del pre-flight).
- **Da scongelare non provato coi dati veri**, perché in produzione non c'è niente in congelatore.
- **Android:** il carosello scorre in orizzontale dentro il poster, lontano dai bordi (padding 16
  e margine 14), per non pestare il gesto Indietro dal bordo. **NON ESEGUITA** la prova.
- **Spesa ponte e scansione libera** sono i sotto-progetti 2 e 3: la home non ha né il tasto per
  rigenerare la lista né il tondo dello scan.

Emersi dall'esecuzione:
- **`SCONGELA` segue il flag `congelato`** anche dopo un riacquisto fresco (Task 3, domanda 1).
  In più, un lotto da scongelare compare anche se un lotto fresco più vecchio dello stesso piatto
  verrebbe mangiato prima, e due lotti congelati dello stesso piatto con due pasti domani danno
  una tessera sola (dedup sul lotto più vecchio): due domande di prodotto, non difetti provati.
- **Il secondo puntino non si accende oltre circa 442 px** di larghezza: il carosello funziona, il
  puntino no (Task 6) [calcolato].
- **`inVolo` si libera solo quando il `carica()` della scrittura si chiude** (Task 7): se una
  lettura superata si blocca, i tasti restano spenti anche con dati freschi a schermo
  [ipotesi, non testata].
- **Scegli aperto da Oggi può mostrare per un frame la pillola `PIANO` prima di `OGGI`** (Task 9)
  [ipotesi, non visto]. Nella barra, su Scegli, resta accesa la voce Piano, perché il percorso è
  `/piano/…` e l'attiva è un `startsWith` [letto dal codice, non visto].
- **Un errore inline sopravvive alle ricariche riuscite e al cambio di slot del poster; `RIPROVA`
  toglie l'errore prima che arrivino i dati e mostra lo stato vecchio con i tasti attivi** (Task 7).
- **La forma «compatta» a due colonne non ha un disegno proprio** (Task 6): `larga` allarga la
  tessera e ne abbassa l'altezza minima, il contenuto decide il resto.
- **`SCONGELA` a 4,3:1**, sotto 4,5 (spec §D.2 alla lettera, Task 6) [calcolato].
- **Oggi non chiama `completaAssegnazioni`** (ruling del Task 5): una bozza coi buchi mostra meno
  pasti finché non si apre il Piano.
- **La Dispensa apre il foglio da `?ingrediente=` e `?lotto=` una volta per montaggio**, e quello
  di un lotto anche se non è più «vivo» (Task 9): oggi si entra sempre da un'altra pagina, e il
  lotto del link è il vivo più vecchio.
- **Il caricamento fa tre giri in sequenza** (settimana, settimana di domani, le sette letture in
  parallelo): le sette letture non dipendono dalla settimana (Task 7). `page.tsx` è di 458 righe
  [misurato, `git diff --stat`] con quattro responsabilità (caricamento, scritture, poster,
  griglia): un hook `useGiornata` e una funzione pura per la griglia lo alleggerirebbero.
- **Rischi di deriva nel dominio** (Task 2 e 5): `alternative` ricalcola a mano l'aritmetica di
  `consumoSlot` (`oggi.ts` contro `storno.ts`), e le `catch` di `oggi.ts` non discriminano (un
  errore di programmazione verrebbe inghiottito come un piatto illeggibile);
  `apriSettimanaCorrente` inghiotte qualunque errore se la settimana poi esiste (una creazione
  parziale sembra un successo), con la stessa guardia del Piano per mandato della spec.
- **Test che mancano** (minori rinviati): il ramo «da domani non si va a dopodomani» di
  `pastoDopo`; i confini di fascia (10:30, 12:00, 15:00); un pasto da Pronti come poster; gli
  slot orfani; i tetti a 2 di scongela e Pronti; l'uso con `fattoreConsumo` 0; i rami di
  `alternative` coperti solo dal caso chiuso (q.b., priorità di scadenza, scala persone); `select`
  e `limit` di `leggiUltimaChiusura`; domenica e giorni a una cifra in `dataLunga`; il test «su
  /oggi» della barra non rimette il percorso se fallisce; il ramo «Settimana non disponibile
  dopo la creazione» e il doppio fallimento concorrente di `apriSettimanaCorrente`; lo scarto delle
  letture superate e
  «scambio ok, ricarica ko, RIPROVA → RIMETTI» nella pagina; la pulizia dell'indirizzo con
  `?lotto=` e «una volta sola» dopo `spesa:dispensa-cambiata`; il testo `OGGI` della pillola in
  Scegli (solo l'`aria-label`); il colore di `alone()`.

## Le domande aperte per Andrea

1. **Il flag `congelato` dopo un riacquisto.** Azzerarlo quando una chiusura ricompra
   l'ingrediente, o lasciarlo com'è? Oggi la tessera `SCONGELA` segue il flag e può comparire per
   un ingrediente comprato fresco dopo essere stato congelato (spec §D.2).
2. **`SCONGELA` a 4,3:1.** Scurire il testo o abbassare l'alfa della tinta, per arrivare a 4,5:1?
3. **L'icona sulle tessere `Poi`, `Domani` e sul lotto da scongelare.** Il piano la mette, la spec
   §G.2 non la elenca: tenerla o toglierla?
4. **Le due eccezioni minori:** `SCAMBIA` spento a 0,06 invece di 0,10 e le pillole del poster a
   0,09em e padding 14 invece di 0,08em e 15. Restano dichiarate, o si allineano (una riga di CSS
   ciascuna)?
5. **La forma compatta a due colonne** per la tessera dispari in coda: oggi è solo più larga e più
   bassa di altezza minima. Serve un disegno vero?
6. **Il fix della data locale** (13 punti UTC, quattro test [fonte: memoria del progetto, audit
   del 03/10]) può ripartire ora che la 8c è su `main` [fonte: `git log`, PR #25]; `oggiLocale`
   va riallineata al suo helper quando arriva.

## La verifica nel browser: NON ESEGUITA

**Cosa non è stato fatto:** la verifica nel browser del piano, Task 8 passo 4 e Task 10 passo 4.
**Perché:** l'app richiede l'accesso con il link via email sull'account vero di Andrea, contro il
Supabase di produzione: non posso farlo io, e le prove che scrivono (`SCAMBIA`, la conferma in
Scegli, il foglio azioni) toccherebbero i dati veri. In più il preview `spesa-worktree` di
`.claude/launch.json` parte dalla cartella del repo principale, non dal worktree: servirebbe il
codice sbagliato (fermato) [fonte: ledger del controller]. **Cosa vale al suo posto:** i test
(jsdom), `tsc`, `eslint`, `npm run design:token` e `next build`, tutti verdi; niente di visivo.

**Da fare con Andrea**, con l'accesso fatto nel pannello browser e **solo prove in lettura**
(nessuno `SCAMBIA`, nessuna conferma in Scegli, nessuna scelta nel foglio azioni):
- [ ] `/` porta a `/oggi`.
- [ ] La barra a quattro voci a riposo (338 × 84, voci 80 × 72) e ridotta (274 × 66, voci 64 × 54),
      nessun testo tagliato, le quattro icone allineate, `OGGI` attiva su `/oggi`.
- [ ] **La larghezza di `DISPENSA`**, misurata con `javascript_tool` (un `Range` sul nodo di testo
      dell'etichetta, `getBoundingClientRect().width`) e annotata qui: la spec dice circa 49 px in
      80 [stima].
- [ ] Il poster con i dati veri; con la dispensa non aggiornata di Andrea (ultima spesa chiusa il
      28/08) la banda delle alternative e le tessere Scade, Scongela e Pronti **non** ci sono:
      c'è la tessera tratteggiata, e «Poi».
- [ ] Il carosello (serve una dispensa aggiornata o un utente di prova): scorre e si ferma su ogni
      carta (scroll-snap), la seconda carta spunta dal bordo, i puntini seguono; con una proposta
      sola niente puntini.
- [ ] Nessun elemento finisce sotto la barra in fondo alla pagina (`scroll-app` con la coda), a
      barra grande e ridotta.
- [ ] `CAMBIA` apre Scegli con la pillola `OGGI`; la pillola riporta a `/oggi` senza scrivere
      (la conferma di Scegli scrive: non farla sui dati veri).
- [ ] Una tessera Scade o Pronti apre la Dispensa col foglio giusto, e l'indietro lo chiude
      restando su `/dispensa` (il punto del ruling `replaceState({})` del Task 9); uscire e
      rientrare non riapre il foglio.
- [ ] Il Marchio d'avvio parte su `/oggi`, una volta per sessione, e atterra sul segno della Lista.
- [ ] Screenshot del poster con le alternative e della tessera tratteggiata, da incollare qui.

## Le prove dal telefono da fare

Su Chrome Android con l'indietro di sistema, dopo il merge. Spec §J.4. Tutte **NON ESEGUITE**.
Nota: con i dati del 03/10 la home di Andrea è «non aggiornata», quindi le proposte e le scadenze
si vedono solo dopo una spesa chiusa nell'app [calcolato dalla regola §E].

- [ ] **L'app installata si apre su Oggi**, dopo l'aggiornamento del service worker a
      `dispesa-v2` (l'`activate` cancella da sé la cache `dispesa-v1`). Se la PWA installata si
      apre ancora su `/lista`, **reinstallarla è la prova** [fonte: piano di Oggi, «Dopo il
      piano»: la PWA installata prende il nuovo `start_url` al prossimo aggiornamento].
- [ ] Il poster giusto **in tre momenti della giornata**, a confronto con le fasce dal nome del
      pasto (per esempio mattina, primo pomeriggio, sera).
- [ ] `COM'È ANDATA` → saltato fa passare al pasto dopo (scrive un dato vero: il pasto si rimette
      a casa dal foglio azioni del Piano).
- [ ] `CAMBIA` → Scegli → conferma → torna a Oggi; la pillola dice `OGGI` e non `PIANO` (nessun
      lampo di `PIANO`, il minor del Task 9).
- [ ] **L'indietro di sistema da Scegli torna a Oggi.**
- [ ] **L'indietro di sistema dal foglio della Dispensa aperto da una tessera** (Scade o Pronti)
      **chiude il foglio e resta su `/dispensa`**; uscire dalla Dispensa e rientrare non riapre il
      foglio e l'indirizzo non ha più il parametro.
- [ ] **Con la dispensa non aggiornata (il suo caso al 03/10) la tessera tratteggiata dice «28
      agosto»** («La dispensa è ferma al 28 agosto»).
- [ ] Dopo una spesa chiusa compaiono le proposte e le scadenze.
- [ ] `SCAMBIA` cambia il piatto e la dispensa si corregge da sola (storno); `RIMETTI QUELLO DEL
      PIANO` rimette piatto e scelte.
- [ ] La barra a quattro voci sul telefono vero: `DISPENSA` non tagliata, a riposo e ridotta.
- [ ] Il carosello scorre col dito e non pesta il gesto Indietro dal bordo (§I, Android).
- [ ] Dopo il login con il link via email e dopo `Entra in una casa` dal pannello, si arriva su
      Oggi.
- [ ] Con la rete spenta, Oggi dice «Non riusciamo a caricare la giornata.» con `APRI LA LISTA`, e
      la Lista si apre (spec §F).

## Prima del merge

Merge e deploy **solo con l'ok di Andrea**: il merge su `main` va in produzione da solo (Vercel).
Nessuna migrazione, quindi nessun ordine da rispettare con il database. Il service worker passa a
`dispesa-v2`. Restano da fare, in quest'ordine: le prove nel browser sopra, le sei domande, il
merge, le prove dal telefono.
