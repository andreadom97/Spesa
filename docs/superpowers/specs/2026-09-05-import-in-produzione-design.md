# Import in produzione: estrazione a pagine, limite per utente, confronto modelli — design

**Data:** 05/09/2026 · **Stato:** approvata da Andrea il 05/09, implementata in remoto lo stesso giorno (piano omonimo); da provare in locale con la chiave
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P0 e P1, revisione 05/09),
[2026-08-30-estrattore-claude-design.md](2026-08-30-estrattore-claude-design.md) (la v1 che questa spec completa)

**Obiettivo:** portare l'estrattore da "funziona in eval" a "funziona su Vercel per un
utente che non è Andrea": la durata deve stare sotto il limite della funzione, ogni
utente deve avere un tetto di import, e la scelta del modello deve uscire da un run
dell'eval che produce un confronto leggibile, non da un'opinione. Successo: la dieta 6
(7 foto) importata in produzione senza mock in meno di 150 secondi; un secondo account
bloccato con un messaggio onesto al quarto import in 30 giorni; un report dell'eval con
Sonnet e Opus affiancati su almeno due diete e due set di foto.

## 0. Cosa sappiamo dal 30/08 (misurato, non ipotizzato)

| Fatto | Valore | Fonte |
|---|---|---|
| Durata di un'estrazione della dieta 6, foto compresse, Sonnet 5 | 453 s | commit 55faad0 |
| Alimenti del ground truth abbinati | 61/82 | idem |
| Quantità esatte sulle righe estratte | 80/148 | idem |
| Quantità fabbricate | 1, poi regola di prompt, effetto non rimisurato | idem |
| `maxDuration` della route | 300 s | `route.ts` |
| Ground truth dieta 6 compattato | 77 KB | spec 30/08 §3 |
| Deriva di schema con JSON nel prompt | 4 run su 4 | commit f96cf2e → structured output |
| Flake del JSON lungo | ~1 su 3-4 | commit 9aabf3a → retry singolo |

La spec del 30/08 aveva già scritto la condizione: "se la durata reale su dieta 6
supera ~250 s, la v2 a lotti anticipa". È superata di un terzo. Questa è la v2.

## 1. Diagnosi: il tempo è l'output

Una chiamata sola produce tutto il piano: 77 KB di JSON compatto sono nell'ordine di
20–25k token in uscita. A una velocità di generazione di poche decine di token al
secondo, il conto torna con i 453 s misurati. Le immagini in ingresso non c'entrano:
si leggono in pochi secondi. Non c'entra neanche il modello: Opus non scrive più
veloce di Sonnet.

Le conseguenze:

- **Alzare `maxDuration` non basta.** Il piano Hobby di Vercel con Fluid Compute
  ferma la funzione a 300 s [ipotesi dalla spec 30/08, da riverificare sul
  pannello]; il piano Pro arriva a 800 s ma costa e non risolve la dieta da 12 foto.
- **Un job in background non aiuta** su Vercel senza infrastruttura aggiuntiva: la
  funzione che fa il lavoro ha lo stesso limite.
- **Dividere l'output divide il tempo.** Se ogni chiamata trascrive una pagina sola,
  l'output per chiamata è un settimo e le chiamate girano in parallelo. È la strada
  già prevista come "estrazione a lotti con merge" nella spec 30/08 §9.

## 2. Architettura: indice, pagine in parallelo, fusione in codice

Tre passaggi. I primi due sono chiamate al modello, il terzo è una funzione pura.

### 2.1 Passaggio A — l'indice

Una chiamata con **tutte** le pagine in ingresso e un output piccolo: per ogni pagina,
cosa contiene. Serve a tre cose: decidere l'archetipo una volta sola per tutto il
documento; dire a ogni chiamata di pagina cosa aspettarsi ("qui ci sono lunedì e
martedì della settimana 1"); rifiutare subito e a costo quasi zero una dieta di soli
macro.

```ts
// src/domain/import/indice.ts
export interface VocePagina {
  settimana: number;          // 1..4
  giorno: number;             // 0..6, o indice progressivo per giorni_tipo
  titolo: string | null;      // solo giorni_tipo
  pasti: string[];            // nomi dei pasti come scritti, nell'ordine
}
export interface PaginaIndice {
  pagina: number;                       // 1-based, ordine di invio
  continuaDallaPrecedente: boolean;     // il primo pasto è la coda di un pasto iniziato sulla pagina prima
  contenuto: VocePagina[];
}
export interface IndiceEstrazione {
  archetipo: ArchetipoImportabile;
  fonte: string;
  pagine: PaginaIndice[];
  noteEstrazione: string[];
}
export type EsitoIndice =
  | { tipo: 'indice'; indice: IndiceEstrazione }
  | { tipo: 'rifiuto'; rifiuto: RifiutoImport };
```

Structured output con schema dedicato (stessa beta della v1). `max_tokens` basso
(4000): l'indice di una dieta da 12 pagine sta in poche centinaia di token. Durata
attesa: 15–30 s [ipotesi, l'eval misura].

`validaIndice` (in `indice.ts`, stessa disciplina di `valida.ts`): pagine numerate
1..N contigue e tutte presenti; per gli archetipi settimanali `giorno` in 0..6 e
`titolo` null; per `giorni_tipo` `titolo` non vuoto; una pagina può essere vuota
(`contenuto: []`, per copertine e regolamenti) ma dev'essere dichiarata.

### 2.2 Passaggio B — una chiamata per pagina, in parallelo

Per ogni pagina k con `contenuto` non vuoto, una chiamata che riceve **tutte** le
pagine come prima e l'istruzione: "trascrivi solo la pagina k; contiene [voci
dall'indice]; l'archetipo è X". Output: un `PianoEstratto` parziale nello **stesso
schema della v1**, limitato a quella pagina. Stesso structured output, stesso prompt di
regole (mai inventare, `testoOriginale`, quantità inferite marcate), stesso retry.

Perché tutte le pagine in ingresso anche per la trascrizione di una sola: il contesto
delle altre serve (la tabella delle porzioni sulla pagina 1 spiega le grammature della
pagina 4, come nella dieta 2), e il costo è quasi nullo grazie alla cache (§2.5).

Concorrenza limitata da `IMPORT_CONCORRENZA` (default 4): sette pagine sono due
ondate. Il limite protegge dai rate limit del tier API; l'SDK riprova da solo sui 429
con backoff, `maxRetries` portato a 4 sulle chiamate di pagina. **Una pagina che
fallisce dopo i retry fa fallire l'import intero**: mai un piano parziale spacciato
per intero (502 `estrazione non riuscita, riprova`).

Durata attesa: A (≤30 s) + due ondate da ~40–60 s + fusione (ms) ≈ 100–150 s
[ipotesi, l'eval misura]. Se una singola pagina è enorme (una griglia che copre
l'intera dieta), la sua chiamata è lunga quanto la v1: è il limite dichiarato in §8.

### 2.3 Passaggio C — la fusione, funzione pura

```ts
// src/domain/import/fusione.ts
export function fondiPagine(indice: IndiceEstrazione, pagine: { pagina: number; piano: PianoEstratto }[]): PianoEstratto
```

Regole, nell'ordine:

1. `archetipo` e `fonte` vengono dall'indice; le pagine che li contraddicono
   producono una nota, non un errore.
2. I giorni si identificano per `(settimana.numero, giorno)`. Stesso giorno su due
   pagine → i pasti della pagina successiva si accodano a quelli della precedente.
3. Se la pagina k ha `continuaDallaPrecedente: true` e il suo primo pasto ha lo stesso
   `nomeOriginale` (normalizzato) dell'ultimo pasto già fuso per quel giorno, i piatti
   si concatenano dentro quel pasto invece di creare un pasto doppio.
4. `titolo`: il primo non nullo vince; un secondo diverso finisce in nota.
5. `noteEstrazione`: quelle dell'indice, poi quelle di ogni pagina prefissate
   `pagina k:`.
6. Settimane ordinate per numero, giorni per indice. Nessun'altra normalizzazione:
   il risultato passa da `validaEsito` come qualsiasi estrazione, e se non passa è un
   422 come oggi.

Le pagine parziali non passano da `validaEsito` prima della fusione (una pagina può
contenere solo la settimana 2, e la contiguità è una regola del tutto): passano da
`validaPianoParziale`, che controlla la sola forma e normalizza i campi legacy.

### 2.4 Il caso a una pagina e il PDF

- **Una sola immagine** (o PDF a una pagina): niente indice, chiamata singola come
  oggi (`estraiPiano` resta). La v1 non sparisce: è il caso base e la baseline
  dell'eval.
- **PDF multipagina**: si divide server-side in PDF a pagina singola con `pdf-lib`
  (JavaScript puro, nessuna dipendenza nativa, gira nelle funzioni Vercel), ogni
  pagina diventa un blocco `document`. Pipeline identica alle foto. Se `pdf-lib` non
  riesce a leggere il file (cifrato, corrotto), 400 `richiesta non valida` con
  messaggio in pagina "il PDF non si apre: prova con le foto". I PDF di sole
  immagini (scansioni) funzionano come documenti, non serve OCR a monte.

### 2.5 Costo e cache

Le N+1 chiamate condividono lo stesso prefisso: system prompt e blocchi immagine
(o documento), nell'ordine `system → pagine → testo dell'istruzione`. `cache_control`
sull'ultimo blocco pagina: l'indice scrive la cache, le chiamate di pagina la leggono
al 10% del prezzo. Con 7 foto il prefisso vale ~10k token, ben oltre il minimo
cacheabile di Sonnet 5 (1024) e Opus 5 (512) [fonte: riferimento API Anthropic,
09/2026].

Stima per la dieta 6 (7 foto, ~10k token di immagini, ~22k token di output totali):

| | v1, una chiamata | v2, indice + 7 pagine |
|---|---|---|
| Input a prezzo pieno | ~12k | ~12k (l'indice) |
| Input da cache | 0 | ~70k al 10% ≈ 7k equivalenti |
| Output | ~22k | ~22k + ~1k (indice) |
| Costo Sonnet 5 (2 €/M in, 10 €/M out) | ~0,25 € | ~0,27 € |
| Costo Opus 5 (5 €/M in, 25 €/M out) | ~0,61 € | ~0,67 € |

La v2 costa il 5–10% in più e dura un terzo. I prezzi sono di listino al 09/2026
[fonte: riferimento API Anthropic]; l'eval li usa per la stima nel report (§4) e
vanno aggiornati a mano se cambiano. `estraiPianoAPagine` restituisce anche `usage`
aggregato (token in, out, cache letta e scritta, numero chiamate, durata) così la
stima non è più un'ipotesi.

## 3. Limite per utente

Il costo di un import non giustifica un limite: lo giustifica una chiave in produzione
raggiungibile da chiunque abbia un account. Il limite è una difesa, e va dichiarato.

- **Tabella `import_uso`** (migrazione 0010): `id`, `user_id`, `avviato_il`, `pagine`,
  `modello`. Nessun contenuto della dieta. RLS abilitata e forzata; policy `select` e
  `insert` per il proprietario; **nessuna policy di update o delete**: un utente non
  può azzerarsi il contatore.
- **Regola**: al massimo `IMPORT_LIMITE_30GG` import (default 3) nei 30 giorni
  precedenti, contati sulle righe di `import_uso`. `0` disattiva il limite (solo
  sviluppo). Un import si registra **prima** delle chiamate al modello, con il client
  Supabase che porta il JWT dell'utente (così la RLS vale): due invii concorrenti
  contano due. Un import fallito per colpa nostra consuma comunque uno slot: è un
  limite dichiarato, non un bug, e il tetto è generoso rispetto all'uso reale (un
  import per cambio dieta). Andrea può ripristinare a mano dal pannello Supabase.
- **Route**: il controllo sta dopo auth e cap dimensione e prima di qualunque chiamata.
  Oltre il limite → 429 `{ errore: 'hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026' }`,
  con la data = il più vecchio import nella finestra + 30 giorni, in `it-IT`.
- **Pagina Importa**: 429 mostra il messaggio della route così com'è, come già fa
  per il 413.
- **Rete di sicurezza fuori dal codice**: spend limit mensile sul workspace Anthropic
  dal pannello, impostato da Andrea prima di mettere la chiave su Vercel. Il limite
  per utente contiene un utente; lo spend limit contiene tutti.

## 4. L'eval che decide il modello

`npm run eval:import` resta l'unico posto dove si spende denaro vero su dati veri, e
resta eseguibile solo in locale (la cartella `diete/` non esiste altrove). Cambia
cosa produce.

- **Manifest** `diete/eval-manifest.json` (dentro la cartella gitignored): una voce
  per dieta con nome, cartella delle foto originali, cartella delle foto compresse
  (opzionale, prodotte con la stessa funzione della Camera o salvate dall'app), PDF
  (opzionale, alternativo alle foto) e ground truth. Senza manifest, l'harness usa i
  default di oggi (dieta 6) così il comando esistente non si rompe.
- **Dimensioni del confronto**: modelli (`EVAL_IMPORT_MODELLI`, default
  `claude-sonnet-5`), pipeline (`EVAL_IMPORT_PIPELINE`: `pagine` default, `singola`
  per la baseline v1), set (originali, compresse). Ogni combinazione è un caso.
- **Metriche per caso**: le stesse di oggi (durata, archetipo, settimane, abbinati,
  estranei, esatte, inferite, fabbricate) più token in/out/cache e costo stimato da
  `usage` con i prezzi di §2.5.
- **Report**: oltre alla console, un file `diete/estrazioni/report-<data-ora>.md`
  con una tabella per dieta × set, righe = modello × pipeline. Solo contatori e
  percentuali: mai un alimento, mai un testo della dieta (regola della spec 30/08 §7).
- **Gate duri**: invariati (esito valido, zero fabbricate, nessuna chiamata a vuoto).
  La soglia del 90% di abbinati **non è un gate**: è la riga del report su cui
  Andrea decide.
- **Regola di decisione**, scritta qui perché non si rinegozi dopo aver visto i
  numeri: si passa a Opus solo se porta gli abbinati sopra il 90% dove Sonnet resta
  sotto, sullo stesso set. Se Sonnet sta sotto il 90% solo sulle compresse e sopra
  sulle originali, il problema è la compressione della Camera (1568 px, qualità
  0,75) e si alza la qualità prima di cambiare modello. Se si sceglie Opus,
  `output_config.effort` a `low`: è trascrizione, non ragionamento. Il modello resta
  configurazione (`IMPORT_AI_MODEL`), mai codice.

## 5. Cosa cambia nei file esistenti

| File | Cambia |
|---|---|
| `src/server/import-ai.ts` | Nascono `estraiIndice`, `estraiPagina`, `estraiPianoAPagine` (orchestratore con concorrenza e `usage`); `estraiPiano` resta per il caso a una pagina e per la baseline dell'eval; `cache_control` sull'ultimo blocco pagina in tutte le chiamate; `IMPORT_AI_EFFORT` opzionale → `output_config.effort` |
| `src/server/pdf-pagine.ts` | Nuovo: `dividiPdf(base64) → base64[]` con `pdf-lib` |
| `src/domain/import/indice.ts`, `fusione.ts` | Nuovi, puri, testati senza rete |
| `src/domain/import/valida.ts` | `validaPianoParziale` esportata (forma sola) |
| `src/app/api/import/estrai/route.ts` | Limite per utente (429) dopo i cap; PDF diviso; `estraiPianoAPagine` al posto di `estraiPiano` oltre una pagina; `maxDuration` resta 300 |
| `src/data/import-uso.ts` | Nuovo: `contaImportRecenti`, `registraImport`, sul client che porta il JWT |
| `supabase/migrations/0010_import_uso.sql` | Nuova tabella con RLS senza update/delete |
| `src/app/(app)/importa/page.tsx` | 429 mostrato verbatim |
| `scripts/eval-import.eval.ts` | Manifest, pipeline, set, `usage`, report su file |
| `README.md` | Il paragrafo "l'estrazione è mockata" dice il vero: estrattore in codice, chiave non su Vercel, mock solo in sviluppo; sezione eval aggiornata |

## 6. Sicurezza e privacy

Invariati dalla spec 30/08 §8: `diete/` mai in git né in report; immagini solo in
transito; chiave solo in env. In più: `import_uso` non contiene contenuto della
dieta; il report dell'eval vive dentro `diete/estrazioni/` ed eredita il gitignore;
le pagine divise del PDF vivono in memoria per la durata della richiesta.

## 7. Cosa resta da fare in locale (non automatizzabile da remoto)

1. Applicare la migrazione 0010 sul progetto Supabase.
2. Impostare lo spend limit sul workspace Anthropic.
3. Lanciare l'eval con `EVAL_IMPORT_MODELLI=claude-sonnet-5,claude-opus-5` su dieta 6
   originali e compresse, più almeno una seconda dieta con ground truth; leggere il
   report; decidere il modello con la regola di §4.
4. Su Vercel: `ANTHROPIC_API_KEY`, `IMPORT_AI_MODEL` (se non Sonnet),
   `IMPORT_LIMITE_30GG` (se non 3), `IMPORT_CONCORRENZA` (se il tier lo richiede),
   `IMPORT_AI_EFFORT=low` (solo con Opus).
5. Import della dieta 6 in produzione da telefono, cronometro alla mano.

## 8. Limiti dichiarati (non bug)

- Il cap di 12 immagini e 4 MB resta: la dieta 7 (28 foto) resta fuori finché non
  c'è uno staging su storage. Il body limit delle funzioni Vercel è il tetto vero.
- Una pagina che contiene da sola quasi tutta la dieta (una griglia densa) ha una
  chiamata lunga quanto la v1: la pipeline non può dividere quello che il foglio non
  divide.
- Un pasto spezzato su due pagine si ricompone solo se l'indice lo segnala
  (`continuaDallaPrecedente`) e i nomi coincidono; altrimenti compare come due pasti
  con lo stesso nome, correggibili in revisione.
- Il limite per utente conta i tentativi, non i successi.
- I prezzi nel report sono costanti nel codice, con la data: se il listino cambia,
  cambiano a mano.
- `IMPORT_CONCORRENZA` è un'ipotesi sul tier API: la verifica è il primo run reale.
