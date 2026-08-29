# Import della dieta da foto/PDF — design

**Data:** 29/08/2026 · **Stato:** approvato in brainstorm, in revisione scritta
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P1),
[spesa-spike-parsing-diete.md](../../../spesa-spike-parsing-diete.md) (P0),
[2026-08-29-alternative-design.md](2026-08-29-alternative-design.md) (il dominio che l'import scrive)

**Obiettivo:** l'utente fotografa i fogli della sua dieta (o carica un PDF), l'AI la
estrae, una revisione guidata pasto per pasto la conferma, e alla fine il piano
importato sostituisce quello attivo — con i formati confezione assegnati, perché è
il dato che nessun foglio contiene e senza il quale il residuo non funziona.

## Decisioni prese nel brainstorm (chiuse, non riaprire)

| Decisione | Scelta di Andrea |
|---|---|
| Chiave API Anthropic | **Niente chiave per ora**: pipeline completa con estrattore mock sulle estrazioni dello spike; `estrattoreClaude` si innesta dopo senza toccare la UI |
| Import su account con repertorio | **Sostituisce il piano** (con conferma esplicita): disattiva i piatti esistenti `fonte='nutrizionista'`, ingredienti e residuo restano |
| Acquisizione foto | **Camera in-app multi-scatto** (getUserMedia), fallback al picker nativo se il permesso è negato |
| Assegnazione formati confezione | **Step finale unico per ingrediente**, non dentro la revisione pasto per pasto |
| Architettura | **A — bozza persistita** (`import_draft`), revisione ripristinabile, commit finale atomico |

Decisioni ereditate dal backlog/spike: AI + revisione guidata; foto = caso
principale, PDF secondario, docx fuori dal P1; range di grammature collassati
all'import sull'estremo alto; l'archetipo "solo macro" va riconosciuto e rifiutato
onestamente, mai importato vuoto.

## 1. Il contratto dati: `PianoEstratto`

Vive in `src/domain/import/types.ts`. È il formato intermedio fra estrazione e
revisione: speculare al dominio (piatti sorella, componenti con opzioni) ma con
**nomi di alimenti**, non id ingrediente — il mapping è compito della revisione.

```ts
type Archetipo =
  | 'menu_settimanale'      // un menu per giorno, eventualmente su più settimane
  | 'giornata_unica'        // uno schema giornaliero ciclizzato
  | 'griglia_alternative'   // griglia giorni × pasti con liste di alternative
  | 'solo_macro';           // target macro senza alimenti → rifiuto

interface RigaEstratta {
  alimento: string;            // "fiocchi d'avena"
  quantita: number | null;     // null = non-gramme irrisolto ("q.b.", "1 scatoletta piccola")
  unita: 'g' | 'ml' | 'pz' | null;
  testoOriginale: string;      // "30g fiocchi d'avena" — sempre mostrato in revisione
}

interface ComponenteEstratto {
  nome: string;                        // "farcitura"
  opzioni: RigaEstratta[][];           // ogni opzione = >=1 righe
}

interface PiattoEstratto {
  nome: string;
  righeFisse: RigaEstratta[];
  componenti: ComponenteEstratto[];
  descrizione: string | null;          // procedimento se il foglio lo riporta
}

interface PastoEstratto {
  nomeOriginale: string;               // "spuntino_mattina" — la revisione lo mappa su un MealSlotDef
  piatti: PiattoEstratto[];            // >1 = piatti sorella (alternative fra pasti)
}

interface GiornoEstratto {
  giorno: number;                      // 0 = lunedì
  pasti: PastoEstratto[];
}

interface SettimanaEstratta {
  numero: number;                      // 1..4
  giorni: GiornoEstratto[];
}

interface PianoEstratto {
  archetipo: Exclude<Archetipo, 'solo_macro'>;
  fonte: string;                       // descrizione dell'input ("7 foto", "PDF 3 pagine")
  settimane: SettimanaEstratta[];
  noteEstrazione: string[];            // ambiguità dichiarate dall'estrattore
}

interface RifiutoImport {
  archetipo: 'solo_macro';
  motivazione: string;                 // cosa è stato letto e perché non è importabile
}
```

Regole di estrazione (valgono per mock e Claude allo stesso modo):

- **Range → estremo alto** già all'estrazione: "120–150g" arriva come `quantita: 150`.
- **Non-gramme → `quantita: null`** con `testoOriginale` integro. La revisione le
  evidenzia e non lascia confermare il pasto finché non sono risolte.
- **Condimenti giornalieri** (l'olio della dieta 6): pasto sintetico con
  `nomeOriginale: 'condimenti'` in coda al giorno. In revisione si tratta come
  ogni altro pasto: si mappa su uno slot (tipicamente la cena) o se ne eliminano
  le righe — non sparisce mai in silenzio. Nessun meccanismo di ripartizione fra
  pasti in v1.
- **Giornata unica ciclizzata** (dieta 5): l'estrattore la espande in una
  `SettimanaEstratta` con 7 giorni identici — la revisione mostra la ripetizione,
  non la nasconde.
- **Diete su più settimane** (dieta 2): una `SettimanaEstratta` per settimana,
  max 4 (il limite di `settimaneCiclo` del dominio).

## 2. L'estrattore: interfaccia e due implementazioni

```ts
type InputImport =
  | { tipo: 'foto'; immagini: Blob[] }     // JPEG dalla camera in-app o dal picker
  | { tipo: 'pdf'; documento: Blob };

type Estrattore = (input: InputImport) => Promise<PianoEstratto | RifiutoImport>;
```

- **`estrattoreMock`** (ora): API route `/api/import/estrai` che ignora l'input e
  serve un fixture `PianoEstratto` scelto via env `IMPORT_MOCK` (default `dieta6`).
  I fixture derivati dalle diete vere vivono in `diete/estrazioni/piani/` —
  **fuori da git come tutto `diete/`**: sono dati sanitari. Funzionano solo in
  locale; in produzione senza chiave l'import mostra "estrazione non disponibile".
- **Fixture sintetici committati** per i test: 2-3 `PianoEstratto` inventati che
  coprono gli archetipi (menu settimanale con componenti, giornata unica, rifiuto
  macro), in `src/domain/import/__tests__/fixtures/`. Nessun dato di persone vere
  entra in git.
- **`estrattoreClaude`** (dopo, quando Andrea mette `ANTHROPIC_API_KEY`): stessa
  route, immagini in input a un modello con visione, prompt che produce
  `PianoEstratto` e classifica l'archetipo. Fuori dal perimetro di questo piano
  di implementazione: il design lo prevede, il codice si aggiunge in un task a sé
  quando c'è la chiave.

La UI non sa quale implementazione sta parlando: il seam è la route.

## 3. Persistenza della bozza: migrazione `0007_import_draft.sql`

Una tabella, RLS come le altre (blocco identico a 0002/0006):

```sql
create table import_draft (
  user_id uuid primary key references auth.users(id) on delete cascade,
  piano jsonb not null,              -- il PianoEstratto
  stato_revisione jsonb not null,    -- avanzamento e decisioni (schema sotto)
  creato_il timestamptz not null default now()
);
```

Una riga per utente (`user_id` primary key): un solo import in corso alla volta.
"Ricomincia" e il commit finale cancellano la riga. `stato_revisione` contiene:

```ts
interface StatoRevisione {
  passo: 'revisione' | 'formati' | 'riepilogo';
  mappaturaPasti: Record<string, string>;      // nomeOriginale -> slotDefId
  pastiConfermati: string[];                    // chiavi "settimana-giorno-indicePasto"
  correzioni: Record<string, PastoEstratto>;   // stessa chiave -> pasto editato
  ingredientiNuovi: IngredienteProposto[];     // compilati entrando nel passo formati
}

interface IngredienteProposto {
  alimento: string;                  // il nome estratto, normalizzato
  nome: string;                      // editabile
  unitaBase: 'g' | 'ml' | 'pz';
  area: AreaId;
  classeResiduo: ClasseResiduo;
  deperibile: boolean;
  formatoConfezione: number;
}
```

Il piano estratto resta immutato in `piano`; le modifiche della revisione vivono in
`correzioni`. Così "ricomincia la revisione" non richiede una nuova estrazione e il
`testoOriginale` non si perde mai.

## 4. Mapping alimento → ingrediente

In `src/domain/import/mapping.ts`, funzioni pure:

- `normalizza(alimento: string): string` — minuscole, senza accenti, trim,
  singolare semplice (regole italiane basilari: -i→-o, -e→-a solo su match di
  dizionario interno, niente stemming spinto).
- `abbina(alimento: string, ingredienti: Ingredient[]): Ingredient | null` —
  match esatto sul nome normalizzato, poi match per inclusione ("fiocchi d'avena"
  ⊂ "fiocchi d'avena integrali") con preferenza al più corto. Nessun fuzzy a
  distanza: un abbinamento sbagliato silenzioso è peggio di un ingrediente doppio,
  e l'utente vede comunque l'esito nel passo formati.
- `proponi(alimento: string): IngredienteProposto` — per i non abbinati: default
  da una tabella statica dei formati tipici del supermercato italiano
  (`src/domain/import/formati-tipici.ts`, ~40 voci: pasta 500g, riso 1000g, latte
  1000ml, uova 6pz, …) con fallback prudente (`dispensa`, `stima`, 500g). Quando
  arriverà `estrattoreClaude`, la proposta AI rimpiazzerà la tabella per i casi
  non coperti — il fallback resta.

Le quantità estratte con `unita: 'pz'` si agganciano solo a ingredienti con
`unitaBase: 'pz'`; un conflitto di unità (alimento estratto in ml su ingrediente
in g) rompe l'abbinamento e produce una proposta di ingrediente nuovo, mai una
conversione inventata.

## 5. Il flusso UI: rotta `/importa`, wizard a 5 passi

Ingresso da Impostazioni ("Importa la dieta"); l'aggancio all'empty state
`VuotoPiatti` è P6. Con una bozza in `import_draft` la rotta riprende dal passo
salvato e offre "ricomincia da capo".

**Passo 1 — Acquisizione.** Due tab:
- *Foto*: camera in-app — `getUserMedia({ video: { facingMode: 'environment' } })`,
  anteprima live, scatto → canvas → JPEG (max 2048px lato lungo, qualità 0.8),
  striscia di miniature con riordino ed eliminazione, "aggiungi pagina".
  Permesso negato o API assente → fallback automatico al
  `<input type="file" accept="image/*" multiple capture="environment">`.
- *PDF*: upload singolo.
Le immagini non si persistono: vivono in memoria fino alla risposta
dell'estrattore. Un refresh durante il passo 1 le perde — accettato, il costo di
rifarle è basso e salvarle nel DB porterebbe dati sanitari in una tabella.

**Passo 2 — Estrazione.** POST alla route, attesa con indicazione di progresso.
Tre uscite: `PianoEstratto` → crea `import_draft` e va al passo 3;
`RifiutoImport` → schermata onesta ("Questa dieta non prescrive alimenti ma
target di macronutrienti: Spesa non può derivarne una lista della spesa") con la
motivazione dell'estrattore; errore → messaggio e riprova, foto conservate in
memoria.

**Passo 3 — Revisione pasto per pasto.** Un giorno per schermata (navigazione
avanti/indietro, indicatore "giorno 3 di 7 · settimana 1 di 2"). Per ogni pasto:
- `nomeOriginale` → select sui 6 `MealSlotDef`; la proposta automatica va per
  nome normalizzato, e la correzione su un pasto si riapplica a tutti i giorni
  con lo stesso `nomeOriginale`.
- Piatti con righe editabili (nome alimento, quantità, unità); `testoOriginale`
  sempre visibile sotto la riga in corpo minore.
- Righe con `quantita: null` evidenziate: bloccano "Conferma pasto".
- Componenti e opzioni mostrati col pattern dell'editor piatto esistente;
  piatti sorella come schede affiancate.
- Eliminare un piatto o una riga è permesso (pasto libero, voci non alimentari).
"Conferma pasto" scrive la chiave in `pastiConfermati` e ogni modifica va in
`correzioni`; il passo 4 si sblocca quando tutti i pasti sono confermati.

**Passo 4 — Formati.** Costruisce (o ricarica da `stato_revisione`) l'elenco dei
soli ingredienti **nuovi** via `abbina`/`proponi` sull'unione delle righe
confermate. Una card per ingrediente col pattern della schermata Ingrediente
esistente: nome, unità base, area, classe residuo, deperibile, formato
confezione — tutto precompilato, tutto correggibile. Qui si decide anche se un
abbinamento proposto va invece spezzato in un ingrediente nuovo ("non è lo
stesso ingrediente").

**Passo 5 — Riepilogo e commit.** "N piatti su M settimane, K ingredienti nuovi.
Il piano attuale (X piatti) verrà disattivato." Conferma esplicita, poi il commit
(sezione 6). Successo → redirect a `/settimana` con il piano nuovo.

## 6. Il commit: bozza → dominio

`src/domain/import/commit.ts` espone una funzione pura
`traduciBozza(piano, statoRevisione, ingredientiEsistenti): ScrittureImport` che
produce la lista delle scritture senza eseguirle — è il pezzo testabile. Output:

```ts
interface ScrittureImport {
  ingredientiDaCreare: IngredienteProposto[];
  piattiDaDisattivare: string[];        // dish.id esistenti con fonte='nutrizionista'
  piattiDaCreare: BozzaPiatto[];        // il tipo già usato dall'editor piatto,
                                        // con componenti/opzioni, settimanaCiclo,
                                        // giornoCiclo, fonte='nutrizionista'
  impostazioni: { settimaneCiclo: number; cicloOrigine: string };  // lunedì prossimo
}
```

Regole di traduzione:
- Ogni `PiattoEstratto` confermato → un `Dish` con `settimanaCiclo` e
  `giornoCiclo` fissati dal punto del piano in cui sta. Piatti sorella → più
  `Dish` sullo stesso slot/giorno/settimana, come da spec alternative.
- Righe e opzioni → `DishIngredient` con l'`ingredientId` risolto (abbinato o
  appena creato).
- Piatti identici ripetuti (la colazione uguale tutti i giorni, i 7 giorni della
  giornata unica) → **un solo `Dish`** con `giornoCiclo: null` quando compare in
  tutti i giorni della settimana su quello slot; altrimenti un `Dish` per giorno.
  Il confronto è strutturale (stesse righe, stessi componenti, stesso nome).
- `cicloOrigine` = il lunedì successivo alla data del commit: il piano nuovo
  parte dalla prossima settimana, le settimane già congelate non si toccano.

L'esecuzione (in `src/data/import.ts`) applica le scritture in ordine:
ingredienti → disattivazioni → piatti (via `salvaPiatto`, che già gestisce le
opzioni) → impostazioni → delete della bozza. Non c'è transazione unica
attraverso più chiamate Supabase: l'ordine è scelto perché un'interruzione a
metà lasci al peggio ingredienti in più e piatti disattivati — mai un piano
mezzo scritto attivo. Il commit è ripetibile: rieseguirlo con la stessa bozza
non duplica ingredienti (l'abbinamento li ritrova) né piatti (i creati della
run precedente vengono riconosciuti per nome+slot+giorno e riusati).

## 7. Errori e casi limite

| Caso | Comportamento |
|---|---|
| Permesso camera negato / getUserMedia assente | Fallback al picker nativo, nessun vicolo cieco |
| Estrazione fallita (rete, timeout) | Riprova; foto in memoria conservate |
| Archetipo `solo_macro` | Schermata di rifiuto con motivazione; nessuna bozza creata |
| `quantita: null` | Evidenziata, blocca la conferma del pasto |
| Conflitto di unità nell'abbinamento | Ingrediente nuovo proposto, mai conversione inventata |
| Refresh durante la revisione | Riprende dal passo e dal punto salvati in `import_draft` |
| Refresh durante il passo 1 | Foto perse (accettato: non si persistono dati sanitari grezzi) |
| Bozza esistente + nuovo import | "Riprendi o ricomincia?" — ricominciare cancella la bozza |
| Interruzione a metà commit | Riesecuzione idempotente dalla bozza ancora presente |
| Produzione senza chiave API | "Estrazione non disponibile" al passo 2; il resto dell'app non è toccato |

## 8. Testing

- **Dominio puro** (la maggior parte del valore): `mapping.ts` (normalizzazione,
  abbinamento, proposta), `commit.ts` (traduzione bozza→scritture: piatti
  sorella, compattazione dei ripetuti, `giornoCiclo: null`, idempotenza),
  validazioni di `PianoEstratto`. Fixture sintetici committati, mai dati veri.
- **UI**: test delle schermate col pattern esistente (Vitest + Testing Library),
  in particolare il blocco su `quantita: null` e la ripresa della bozza.
- **E2E manuale**: giro completo col mock su dieta6 (l'unica estrazione
  verificata al 100% da Andrea) in locale, fino al piano sostituito e alla
  lista generata. La camera si prova sul telefono vero via rete locale o deploy
  preview.

## Fuori perimetro (esplicito)

`estrattoreClaude` e il prompt di estrazione (aspettano la chiave); parsing
strutturale docx; foto annotate a penna (campione futuro); onboarding
multi-utente (P6); qualunque forma di suite aderenza o macro/calorie.
