# Spesa — Design

**Data:** 2026-08-26 · **Stato:** in revisione

## Obiettivo

Ridurre la spesa settimanale a una conferma da 60 secondi e a una lista che non richiede decisioni in corsia, partendo dal piano alimentare che l'utente ha già.

Successo misurabile, Fase 1: per tre settimane consecutive la lista viene generata, usata al supermercato e la spesa serale per il singolo giorno non avviene più di una volta a settimana.

## Contesto e utente

Utente singolo (Andrea), poi multi-utente. Ha già un piano da nutrizionista più pasti fitness che si gestisce da solo. Il problema non è pianificare: è che la sera, sotto pressione di tempo, ricade sulla spesa per il giorno singolo. La settimana è irregolare (trasferte Milano-Roma, pranzi fuori, cene fuori), quindi un piano rigido non regge.

Spesa **tutta fisica**, supermercato sotto casa. Modello ibrido: base settimanale sui non deperibili e sulle costanti, top-up per il fresco.

Telefono **Android**. Il codice viene generato quasi interamente tramite AI: il design privilegia file piccoli, confini espliciti e test come rete di sicurezza.

## Cosa NON è

Esplicitamente fuori scope, adesso e come impostazione:

- **Non genera diete né consigli alimentari.** Organizza un piano deciso dall'utente o dal suo nutrizionista. Vincolo di prodotto, non solo legale (Cass. 20281/2017 sull'esercizio abusivo).
- Nessun conteggio di calorie o macro.
- Nessun inventario della dispensa (vedi sotto — è la decisione centrale).
- Nessun rilevamento della posizione.
- Nessuna integrazione con supermercati, cataloghi, prezzi o carrelli online.
- Nessun prodotto non alimentare: casa, igiene, detergenza restano fuori scope.
- Nessuna funzione sociale, community o condivisione.

## Modello concettuale

Cinque pezzi in sequenza:

1. **Repertorio** — i pasti reali dell'utente con ingredienti e grammature. Si costruisce una volta, si tocca raramente.
2. **Forma della settimana** — quali slot pasto saranno "a casa" nei prossimi 7 giorni.
3. **Piano** — assegnazione dei pasti del repertorio agli slot a casa.
4. **Lista** — aggregazione ingredienti, split base/top-up, ordinamento per reparto.
5. **Correzioni** — durante la settimana, in linguaggio naturale.

### Il principio che regge tutto: default automatico + correzione facile

L'utente non inserisce mai lo stato del sistema. Il sistema propone un default e l'utente corregge solo quando sbaglia. Applicato tre volte:

| Dove | Default | Correzione |
|---|---|---|
| Forma settimana | Il calendario deduce gli slot fuori casa | Check-in da 60s, griglia toccabile |
| Piano | Rotazione dei piatti del repertorio | Cambio piatto con un tap |
| Consumi | Consumato come da piano | Frase in linguaggio naturale |

### La dispensa: nessun inventario, solo residuo derivato

Lo stato della dispensa è **derivato, mai inserito**: `residuo = residuo precedente + comprato − consumato dal piano`. L'utente non conta niente e non registra niente; corregge solo quando il calcolo sbaglia. È la decisione che separa questo progetto dai tracker abbandonati (retention a 30 giorni ~30% nella categoria).

**Porzione e confezione sono due cose diverse, ed è lì che nasce il residuo.** Il piano ragiona in porzioni (150 g di yogurt a colazione), il supermercato vende formati (confezione da 500 g). Se non si modella la confezione, la lista è approssimativa e nel giro di due settimane diverge dalla realtà.

Tre classi di ingrediente, distinte da **come si comporta il residuo** — non da quanto sono deperibili:

| Classe | Esempi | Comportamento |
|---|---|---|
| `porzionabile` | Yogurt, latte, pasta, riso, olio, fiocchi d'avena, petto di pollo | La confezione copre più pasti. Residuo calcolato a ogni consumo e riportato alla settimana dopo. Genera acquisto quando il residuo non copre il fabbisogno successivo |
| `intero` | Uova, mele, vasetti monoporzione, filetti già porzionati | Quantità in pezzi, nessun residuo frazionario |
| `stima` | Spezie, sale, aceto, condimenti | L'aritmetica non vale il disturbo. Solo riga di controllo *"ne hai ancora?"* quando si avvicina la soglia di autonomia |

**La deperibilità è un asse separato**, e serve a una cosa sola: decidere se l'ingrediente va nella lista base settimanale o nel top-up del fresco. Non ha nulla a che vedere con il residuo.

**Punto di partenza del residuo: zero.** Nessun inventario iniziale da inserire — la prima lista compra tutto, e da lì il residuo si deriva da solo. Se in futuro serve, una schermata opzionale una tantum per dichiarare cosa c'è già in casa resta possibile, ma non è in Fase 1.

Uno slot che passa a "fuori" non consuma i suoi ingredienti: il residuo resta alto e la lista successiva compra di meno. È lo stesso meccanismo, non un caso speciale.

## Componenti

Sette moduli con confini espliciti. L'LLM entra in **un punto solo**; tutto il resto è deterministico.

| Modulo | Interfaccia | Natura |
|---|---|---|
| `repertorio` | CRUD piatti, ingredienti, grammature, reparti | Nessuna logica |
| `week-shape` | `(eventiCalendario, oggi) → SlotProposto[]` | Regole esplicite |
| `planner` | `(slotACasa, repertorio, storico) → assegnazioni` | Deterministico |
| `list-builder` | `(slot, repertorio, statoStaple, impostazioni, oggi) → {base, topup}` | **Funzione pura** |
| `corrections` | `(testo) → EventoTipizzato` | **Unico punto LLM** |
| `pantry` | `(residuoPrecedente, acquistato, consumatoDaPiano) → nuovoResiduo` + controlli classe `stima` | Deterministico |
| `notifier` | `(stato, oggi) → notificaOrNull` | Regole |

### Regole di `list-builder`

1. Considera solo gli slot con stato `casa`.
2. Espande piatto → ingredienti × quantità. **La quantità nel piatto è la porzione del piano** (150 g di yogurt). Il moltiplicatore globale serve solo a cucinare per più persone: default 1, non tocca la definizione di porzione.
3. Aggrega per ingrediente sommando le porzioni → `fabbisogno`, con normalizzazione delle unità.
4. Sottrae la dispensa: `da_comprare = max(0, fabbisogno − residuo)`.
5. Converte in confezioni: `confezioni = ceil(da_comprare / formato_confezione)`. Il residuo previsto a fine settimana è `residuo + confezioni × formato_confezione − fabbisogno`, e diventa il residuo iniziale della settimana dopo.
6. Classe `intero`: stessa aritmetica con `formato_confezione = 1`, quindi in pratica conteggio a pezzi.
7. Classe `stima`: nessuna aritmetica. Riga di controllo (*"ne hai ancora?"*) solo se `giorni_da_ultimo_acquisto >= giorni_stimati × 0.8`. Rispondere "no" la converte in riga d'acquisto di una confezione; "sì" allunga `giorni_stimati`. Il valore iniziale è per categoria (olio 60, pasta 21, caffè 30) e si corregge a ogni risposta; senza almeno un acquisto a storico non genera controlli.
8. Split: `deperibile` → lista top-up; non deperibile → lista base.
9. Ordina per reparto secondo l'ordine configurato dall'utente (l'ordine fisico del suo supermercato).

Funzione pura: niente rete, niente LLM, niente accesso al DB. È la parte più testabile del sistema ed è il cuore del prodotto.

### Precedenza sullo stato di uno slot

`correzione` > `check-in` > `calendario` > `default`. Ogni slot registra la fonte del proprio stato; una fonte a priorità più bassa non sovrascrive mai una più alta.

## Data model

Multi-utente dal giorno uno: `user_id` e row-level security su ogni tabella.

| Tabella | Campi principali |
|---|---|
| `ingredient` | `nome`, `unita_base` (g/ml/pz), `reparto`, `classe_residuo` (porzionabile/intero/stima), `deperibile` (bool), `formato_confezione` (quantità in `unita_base`) |
| `dish` | `nome`, `slot_type`, `fonte` (nutrizionista/proprio), `attivo` |
| `dish_ingredient` | `dish_id`, `ingredient_id`, `quantita`, `unita` |
| `week` | `data_inizio`, `stato` (bozza/confermata/chiusa) |
| `meal_slot` | `week_id`, `data`, `slot_type`, `stato` (casa/fuori/saltato), `dish_id`, `fonte_stato` |
| `shopping_list` | `week_id`, `tipo` (base/topup), `creata_il`, `chiusa_il` |
| `shopping_list_item` | `ingredient_id`, `quantita`, `unita`, `confezioni`, `reparto`, `spuntato`, `origine` (piano/controllo/manuale) |
| `pantry_state` | `ingredient_id`, `residuo`, `ultimo_acquisto`, `giorni_stimati` (solo classe `stima`), `ultimo_check` |
| `correction` | `testo_grezzo`, `evento_tipo`, `evento_payload` (jsonb), `applicata` |

`correction` conserva sia il testo grezzo sia l'evento interpretato: se il parsing sbaglia, l'errore è ispezionabile e rigiocabile. È l'audit trail dell'unico componente non deterministico.

## Stack

- **Next.js** (App Router) + TypeScript, deploy su Vercel
- **Supabase**: Postgres, Auth, RLS
- **PWA installabile** su Android: manifest + service worker. La schermata lista è offline-first — nei supermercati il segnale manca e le spunte vanno accodate e sincronizzate dopo
- **Tailwind** per lo stile
- **Vitest** per i test unitari sulle funzioni pure
- LLM: Claude Opus 5 via API, solo in `corrections` e nell'eventuale import. Costo stimato sotto 1 $/mese all'uso previsto. Nessun prompt caching: con poche chiamate a settimana la cache non farebbe mai hit

Perché PWA e non nativo: il collo di bottiglia è far funzionare il loop, non la finitura. Su Android la PWA ha Web Push affidabile, share target per l'import e nessun attrito di distribuzione. Stesso codice se il progetto va sul mercato.

## Fasi

**Fase 1 — zero AI, zero integrazioni**
Repertorio (inserimento manuale), check-in settimanale manuale su griglia 7×4, `list-builder`, schermata lista con reparti e spunta offline.
Risolve già il problema dichiarato.

**Gate: tre settimane di uso reale prima della Fase 2.** Se la Fase 1 non viene aperta per tre settimane consecutive, le fasi successive automatizzano un rituale che non esiste e non vanno costruite.

**Fase 2** — Google Calendar in lettura: precompila il check-in.
**Fase 3** — Correzioni vocali: Web Speech API (`it-IT`) → parsing LLM → eventi tipizzati.
**Fase 4** — Classe `stima` con autonomia e controlli, reminder di riordino via Web Push.

**Dopo, non prima: prodotto preferito e prezzo stimato.** Un ingrediente oggi
e' generico ("Pasta") con un solo formato confezione. L'idea, di Andrea il
28/08/2026, e' di legargli il prodotto che compra davvero fra i dieci formati
che stanno a scaffale, e con quello un prezzo indicativo, cosi' la lista
mostra anche quanto verra' a costare. Sta qui e non prima per due ragioni: e'
un secondo livello sotto l'ingrediente (variante scelta, con il suo formato e
il suo prezzo) e tocca quindi il modello dati, e i prezzi invecchiano — vanno
o mantenuti a mano o presi da una fonte, e nessuna fonte italiana aperta li
espone per supermercato (verificato il 28/08/2026: Open Food Facts cataloga
prodotti per codice a barre senza prezzi; i dataset con corsia e prezzo sono
statunitensi). Da riprendere quando il resto e' in piedi.

**Vedere la dispensa e correggere il residuo.** Non e' una fase nuova: la
correzione e' gia' il principio di riga 53 ("l'utente corregge solo quando il
calcolo sbaglia"), e mancava solo la schermata. Costruita il 28/08/2026 su
richiesta di Andrea, in anticipo sul gate delle tre settimane. Il passo
successivo — suggerire con cosa sostituire un pasto in base a cosa c'e' in
casa — resta oltre l'avviso di conflitto gia' rinviato a Fase 3: serve la
simulazione del residuo in avanti piu' un criterio di equivalenza fra piatti.

## Testing

- `list-builder` e `pantry` sono funzioni pure: test unitari in TDD, nessun mock. Casi obbligatori: porzione < formato con residuo che si accumula su più settimane (il caso yogurt), slot che passa a "fuori" e alza il residuo, arrotondamento a confezioni intere, unità miste sullo stesso ingrediente.
- `corrections`: set fisso di frasi italiane reali con output atteso — "stasera cena fuori", "ho finito l'olio", "ne ho mangiato il doppio", "salto il pranzo di giovedì e venerdì".
- `week-shape` (da Fase 2): casi calendario con eventi ambigui (evento tutto il giorno, trasferta a cavallo di due giorni, evento senza luogo).
- Il resto: integrazione leggera.

## Rischi

| Rischio | Perché conta | Mitigazione |
|---|---|---|
| Il repertorio non resta aggiornato | L'app diverge dalla realtà e la lista diventa sbagliata | Le correzioni (Fase 3) alimentano il repertorio; in Fase 1, revisione esplicita al check-in |
| Il check-in settimanale non viene fatto | Si torna al punto di partenza | È il gate delle tre settimane: se non accade, il progetto si ferma lì per scelta |
| Unità di misura (pz vs g vs confezione) | Pantano classico che rende la lista inutilizzabile | `unita_base` per ingrediente, conversioni esplicite, niente inferenza |
| Sync offline delle spunte | Doppioni o spunte perse | Coda locale con id idempotenti |

## Assunzioni — tutte confermate il 2026-08-26

Quattro fatti non inventabili, chiusi con l'utente. Restano qui perché il piano di implementazione ci si appoggia.

| # | Domanda | Default assunto |
|---|---|---|
| 1 | ~~Porzioni~~ **Chiuso.** La porzione è la quantità scritta nel piano; il residuo si deriva da porzione vs formato confezione | Moltiplicatore globale, valore iniziale **1**, usato solo per cucinare per più persone |
| 2 | ~~Slot pasto~~ **Chiuso.** | **Tutti e quattro** (colazione, pranzo, cena, spuntino), ciascuno marcabile come "abitualmente fuori" così sparisce dal check-in invece di essere negato ogni settimana |
| 3 | ~~Ordine reparti~~ **Chiuso.** Solo alimentari: casa, igiene e detergenza sono fuori scope | Ordine **e nomi** dei reparti interamente customizzabili dall'utente. Default: ortofrutta → macelleria/pescheria → latticini e uova → salumi e formaggi → pasta, riso e cereali → scatolame e conserve → surgelati → bevande |
| 4 | ~~Repertorio Fase 1~~ **Chiuso.** | **Manuale.** ~20 piatti sono circa 40 minuti una tantum e tengono la Fase 1 a zero AI. Se è l'attrito che blocca la partenza, l'import (foto/PDF → piatti strutturati) è mezza giornata e va anticipato a Fase 1.5 |

## Decisioni di design chiuse il 2026-08-26

Prese dopo il ciclo di design; hanno precedenza sulle assunzioni della sezione precedente dove divergono.

**Regola del marchio (definitiva).** Ogni casella è sempre nel colore della sua area: **piena** quando in quell'area non manca niente — o l'hai completata, o non era in questa spesa — e **contornata nello stesso colore** quando manca ancora qualcosa. Nessun grigio. Il marchio si riempie durante la spesa invece di svuotarsi, ed è pieno negli stati in cui non c'è una lista in corso. Conseguenza accettata: il marchio è tutto vuoto solo se devi comprare qualcosa in tutte e sei le aree.

**Le sei aree sono fisse e non personalizzabili.** Ortofrutta (verde), macelleria e pescheria (corallo), latticini/uova/salumi (azzurro), pasta/riso/cereali (giallo), dispensa e conserve (arancio), surgelati (lilla). Sostituiscono l'elenco a otto della sezione Assunzioni. È personalizzabile **solo l'ordine di apparizione** nella lista, per seguire il percorso fisico nel supermercato. Il marchio dell'app è una griglia 3×2 dei sei colori in ordine fisso, dove ogni casella è accesa finché quell'area ha qualcosa da prendere: quindi il set di aree non può variare senza rompere il marchio.

**Conseguenza accettata:** le bevande non hanno un'area in v1 — acqua, vino, birra e succhi restano scoperti; il caffè sta in dispensa. Se serviranno, si passa a otto aree in griglia 4×2 senza rifare il marchio.

**Il controllo degli staple è a intervallo fisso di 90 giorni, non una stima.** La classe `stima` in Fase 1 non impara i ritmi: chiede conferma ogni 90 giorni dall'ultimo acquisto. `giorni_stimati` resta nel modello ma è costante. **La v1 registra comunque ogni acquisto** (cosa e quando) alla chiusura di una lista: serve ad alimentare lo storico su cui la Fase 4 potrà imparare davvero, altrimenti quella fase ripartirebbe da zero.

**Il selettore settimana in testata non naviga.** La freccia è presente ma inerte: la v1 conosce solo la settimana corrente. Le settimane passate vanno comunque **salvate**, non scartate — servono allo storico acquisti e ad accendere la navigazione in seguito senza migrazioni. Debito consapevole: l'affordance promette più di quanto l'app faccia.

**Stato delle voci senza checkbox.** Nessun pallino: la tessera accesa significa da prendere, la tessera spenta e depennata significa presa, il tap sulla tessera è l'interruttore. Sulla voce protagonista di ogni area la regola è letterale — accesa ha il colore pieno dell'area, presa il colore si svuota.

### Revisione del 2026-08-26, secondo giro

**I pasti non sono un elenco fisso.** `slot_type` smette di essere l'enum colazione/pranzo/cena/spuntino e diventa una tabella `meal_slot_def` per utente: da 3 a 5 righe, con nome e posizione ordinabile. Lo spuntino può stare fra colazione e pranzo, o fra pranzo e cena, o entrambi. Ogni schermata che rende i pasti deve reggere un numero variabile di colonne o righe.

**"Abitualmente fuori" esce dalla schermata Settimana.** Non è uno stato della settimana ma un default per slot, e vive nelle Impostazioni. La griglia settimanale ha **due soli stati**: acceso (mangi a casa) e spento. Il tratteggio sparisce.

**Settimana diventa il piano alimentare, non solo un check-in.** Ogni pasto acceso mostra il piatto in programma. È la risposta a una lacuna vera: fino a qui nessuna schermata mostrava *cosa* si mangia, solo *se* si è a casa. Tap sul pasto = spegni/accendi; freccia = apri il piatto (da lì lo si potrà sostituire).

**Rinviato a Fase 3, non scartato:** l'avviso di conflitto in dispensa quando si sostituisce un piatto ("se usi lo yogurt qui non ti resta per giovedì"). Richiede di simulare il residuo in avanti su tutta la settimana; è calcolabile con i dati che già abbiamo, ma non è lavoro da Fase 1.

**Macronutrienti e calorie: fuori dalla v1, con il posto riservato.** Servirebbe un database nutrizionale per ingrediente, sposterebbe il prodotto verso il tracker nutrizionale (con il rischio legale già documentato nell'analisi) e aggiungerebbe lavoro di inserimento su ogni ingrediente — che è la causa principale di abbandono in questa categoria. La tabella `ingredient` prevede da ora colonne facoltative `kcal_100`, `prot_100`, `carb_100`, `gras_100`, mai popolate né lette in v1: costano zero e evitano una migrazione dopo.

### Schermate della v1 — elenco definitivo

Otto schermate più quattro stati vuoti. Tre tab in barra (Lista, Settimana, Piatti), il resto sono schermate di dettaglio o impostazione.

| # | Schermata | Da dove | Note |
|---|---|---|---|
| 1 | Lista | tab | Base/Top-up, aree, tessere accese/spente |
| 2 | Settimana | tab | Striscia giorni + giorno espanso; è il piano alimentare |
| 3 | Piatti | tab | Repertorio, filtro per pasto |
| 4 | Piatto | da 3 | Editor della ricetta: ingredienti a tessere, grammature per una porzione |
| 5 | Ingrediente | da 4 | Area, unità, formato confezione, classe residuo, deperibile |
| 6 | Impostazioni | burger | Porzioni, pasti 3–5 riordinabili con giorni di abituale assenza, link a 7 |
| 7 | Ordine dei reparti | da 6 | Sequenza delle sei aree fisse |
| 8 | Scegli il piatto | da 2 | **Agganciata al pasto, non al piatto**: sostituisce solo quel giorno |

**Stati vuoti:** repertorio vuoto (è l'onboarding: spiega il giro in tre passi e dichiara il costo iniziale), settimana non confermata, spesa finita, piatto nuovo. Nei primi tre il marchio è tutto spento — coerente con la regola: casella accesa significa "in quell'area ti resta qualcosa".

**"Chiudi la spesa" vive nello stato "spesa finita".** È l'azione che scrive il record d'acquisto (cosa, quando) su cui si regge il controllo a 90 giorni. Senza quell'azione la registrazione silenziosa decisa in precedenza non ha un momento in cui avvenire.

**La sostituzione di un piatto è per-pasto, non per-piatto.** Il dettaglio del piatto (4) è l'editor della ricetta e non conosce il giorno; la sostituzione ha una schermata propria (8) che nasce dal pasto, mostra solo i piatti di quello slot e non tocca il repertorio.

## Scope del piano di implementazione

Il piano che segue questa spec copre **la sola Fase 1**. Le fasi 2-4 restano descritte qui come direzione, non come lavoro pianificato: si pianificano dopo il gate delle tre settimane.
