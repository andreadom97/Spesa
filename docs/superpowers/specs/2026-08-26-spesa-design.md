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

## Assunzioni da confermare

Quattro fatti che non sono inventabili. Ognuno ha un default dichiarato, così la spec resta eseguibile anche senza risposta — ma vanno confermati prima del design della schermata lista, perché tre su quattro si vedono a schermo.

| # | Domanda | Default assunto |
|---|---|---|
| 1 | ~~Porzioni~~ **Chiuso.** La porzione è la quantità scritta nel piano; il residuo si deriva da porzione vs formato confezione | Moltiplicatore globale, valore iniziale **1**, usato solo per cucinare per più persone |
| 2 | Quali slot pasto contano? | **Tutti e quattro** (colazione, pranzo, cena, spuntino), ciascuno marcabile come "abitualmente fuori" così sparisce dal check-in invece di essere negato ogni settimana |
| 3 | ~~Ordine reparti~~ **Chiuso.** Solo alimentari: casa, igiene e detergenza sono fuori scope | Ordine **e nomi** dei reparti interamente customizzabili dall'utente. Default: ortofrutta → macelleria/pescheria → latticini e uova → salumi e formaggi → pasta, riso e cereali → scatolame e conserve → surgelati → bevande |
| 4 | Repertorio in Fase 1: manuale o import AI? | **Manuale.** ~20 piatti sono circa 40 minuti una tantum e tengono la Fase 1 a zero AI. Se è l'attrito che blocca la partenza, l'import (foto/PDF → piatti strutturati) è mezza giornata e va anticipato a Fase 1.5 |

## Scope del piano di implementazione

Il piano che segue questa spec copre **la sola Fase 1**. Le fasi 2-4 restano descritte qui come direzione, non come lavoro pianificato: si pianificano dopo il gate delle tre settimane.
