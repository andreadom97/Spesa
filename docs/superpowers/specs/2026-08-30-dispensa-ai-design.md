# Correzioni alla dispensa via AI — design

Data: 2026-08-30 · Stato: spec approvata; **si costruisce ora, col mock dietro
la route** — la chiave API è l'interruttore che accende la chiamata vera
(decisione di Andrea, 30/08 pomeriggio)
Origine: richiesta di Andrea del 30/08. Precede: `2026-08-29-spunta-pasti-design.md` (P2, spedito).

## 1. Obiettivo

Correggere la dispensa parlando come si parla, non compilando campi: si scrive
(o si detta) una nota — "ho finito il riso, l'olio è a metà bottiglia, il
pollo l'ho messo in congelatore" — l'AI la interpreta, applica le modifiche
sicure, propone quelle dubbie, e segnala ciò che non riconosce. È il primo
uso dell'AI in-app su dati vivi: il perimetro è stretto apposta.

Decisioni chiuse in chat (30/08):

| Bivio | Decisione |
|---|---|
| Chiave API | **Si costruisce ora** con un mock deterministico dietro la route (pattern dell'import); `ANTHROPIC_API_KEY` è l'interruttore della chiamata vera |
| Modello | Configurazione, non codice: env `DISPENSA_AI_MODEL`, default `claude-haiku-4-5`; scelta finale con l'eval harness (§6bis) quando la chiave c'è |
| Scope | Solo `residuo` e `congelato` su **ingredienti esistenti**; nomi non riconosciuti segnalati, mai creati |
| Confidence | Per singola modifica: ≥90% applica subito + recap con Annulla; <90% proposta da confermare |
| Audio | Dettatura del browser (Web Speech API) → converge sul percorso testuale; **nessun upload audio, nessuno STT esterno** (la Messages API non accetta audio in input [fonte: skill claude-api, cache 2026-06]) |

## 2. Architettura — l'AI propone, il client applica

Nessun agente che scrive sul database. Il flusso:

```
nota + contesto → POST /api/dispensa/correggi (JWT Supabase obbligatorio)
  → ramo: chiave → Claude · DISPENSA_AI_MOCK=1 → interprete a regole · altrimenti 503
  → { proposte: ModificaProposta[], nonRiconosciuti: string[] }
  → validaProposte (dominio puro) → UI: applica/propone/segnala
  → scritture via correggiResiduo / impostaCongelato esistenti
```

Il **contesto lo manda il client** nel body: la pagina Dispensa ha già in
mano ingredienti e residui, e la route resta senza accesso al database —
niente service key, niente letture server-side. La route valida solo il JWT
della sessione Supabase (header `Authorization: Bearer`, verificato con
`auth.getUser(token)` su un client server con la anon key): senza, `401`.

```ts
interface ModificaProposta {
  ingredientId: string;
  campo: 'residuo' | 'congelato';
  /** residuo: numero in unità base, ≥ 0. congelato: boolean. */
  valoreNuovo: number | boolean;
  /** Letto al momento della chiamata: è ciò che Annulla riscrive. */
  valoreAttuale: number | boolean;
  /** 0..1, per modifica. Soglia di auto-applicazione: 0.9. */
  confidence: number;
  /** Una frase: "«l'olio è a metà» → 500 di 1000 ml". Mostrata nel recap. */
  motivazione: string;
}
```

I tre rami della route, in ordine di controllo (pattern dell'import, col
branch sulla chiave esplicito):

1. **`ANTHROPIC_API_KEY` presente** → chiamata vera al modello
   (`DISPENSA_AI_MODEL`, default `claude-haiku-4-5` — vedi §6) con
   structured output. La chiamata (prompt compreso) vive in
   `interpretaNota(nota, contesto, modello)` in `src/server/dispensa-ai.ts`
   — fuori dal dominio (fa rete), condivisa fra route ed eval harness.
2. **`DISPENSA_AI_MOCK=1`** (solo `.env.local`, MAI su Vercel) →
   `mockCorrezione(nota, contesto)`: un interprete deterministico a regole
   nel dominio puro — match del nome case-insensitive (esatto → confidence
   0.95, per inclusione → 0.7), "finito/finita" → residuo 0, "a metà" →
   `formatoConfezione × 0.5`, "N confezioni" → `formatoConfezione × N`,
   "congelato/in freezer" → congelato true, tutto il resto →
   `nonRiconosciuti`. Serve a E2E e sviluppo, ed è onestamente stupido:
   nessuno lo scambia per AI.
3. **Nessuno dei due** → `503 { errore: 'correzione non disponibile' }` —
   lo stato di produzione finché la chiave non c'è.

Ogni esito (vero o mock) passa da `validaProposte` in
`src/domain/dispensa-ai.ts` (puro): ingredientId esistente nel contesto,
campo ammesso, tipo del valore coerente col campo, residuo finito e ≥ 0,
confidence in [0,1], `valoreAttuale` coerente col contesto. Un esito non
valido è un errore mostrato, mai applicato in parte.

## 3. Il contesto nel prompt

Il client costruisce il contesto dai dati che la pagina Dispensa ha già
caricato e lo manda nel body: l'elenco degli ingredienti dell'utente con
`id, nome, unitaBase, formatoConfezione, residuo attuale, congelato`. Così:

- l'**abbinamento avviene nel modello** ("riso" → l'ingrediente Riso), non
  con string-matching fragile lato codice;
- "**a metà bottiglia**" diventa `formatoConfezione × 0.5` perché il formato
  è nel contesto; "finito" = 0; "ne ho ancora due confezioni" =
  `formatoConfezione × 2`;
- le quantità escono **sempre in unità base**;
- un nome che non abbina nessun ingrediente finisce in `nonRiconosciuti`,
  con l'istruzione esplicita di non inventare né creare.

Il prompt fissa anche la calibrazione del confidence: alto solo quando nome
e quantità sono entrambi inequivocabili; un abbinamento per sinonimo o una
quantità inferita ("quasi finito") stanno sotto soglia.

## 4. Confidence e applicazione

Per **singola modifica**, non per nota:

- **≥ 0.9**: il client applica subito (`correggiResiduo` /
  `impostaCongelato`) e la mostra nel recap col tasto **Annulla** —
  l'inversione riscrive `valoreAttuale`, che viaggia nella proposta: nessuno
  stato di undo lato server.
- **< 0.9**: proposta nel recap con tap di conferma; senza tap non si
  scrive nulla.
- **Non riconosciuti**: elencati nel recap ("non ho trovato «farro perlato»
  nel repertorio"), nessuna azione.

Il recap mostra i tre gruppi insieme, nell'ordine: applicate, da
confermare, non riconosciuti. Ogni riga: nome ingrediente, prima → dopo,
motivazione. Conflitto interno (due modifiche sullo stesso ingrediente e
campo nella stessa nota): `validaProposte` tiene l'ultima e scarta le
precedenti — l'ordine della nota è l'ordine delle proposte.

## 5. UI — sezione in cima alla Dispensa

Nella pagina Dispensa esistente, sopra le tessere: campo nota multiriga +
invio, e un bottone microfono che attiva la **dettatura del browser**
(SpeechRecognition / dettatura di sistema iOS): il testo compare nel campo,
si corregge a mano, si invia — un solo percorso verso la route. Dove la
dettatura non è supportata il microfono non compare (feature detection),
resta la nota scritta. Stati: invio in corso (campo disabilitato), errore
rete/503 con messaggio e nota preservata, recap come da §4.

## 6. Modello ed economia

Il modello è **configurazione**: env `DISPENSA_AI_MODEL`, default
`claude-haiku-4-5` — cambiarlo è un edit su Vercel, zero deploy di codice.
La chiamata usa l'SDK ufficiale `@anthropic-ai/sdk` (dipendenza aggiunta con
questo lavoro) con structured output (`output_config.format`), niente
thinking. I candidati [fonte: reference API, cache 06/2026; costi = stime
da validare con l'harness]:

| Modello | $/MTok in/out | ~Costo per correzione* | Quando |
|---|---|---|---|
| `claude-haiku-4-5` | 1 / 5 | ~$0.004 | Default: estrazione strutturata da nota breve |
| `claude-sonnet-5` | 2 / 10 | ~$0.008 | Se Haiku sbaglia gli abbinamenti sui sinonimi |
| `claude-opus-5` | 5 / 25 | ~$0.02 | Overkill qui; sensato per l'estrattore diete (vision) |

*\*~2.5k token di contesto (~100 ingredienti + prompt + nota) + ~300 di
output. A ~30 note/mese, sotto 1€ con qualunque modello: la scelta è di
qualità, non di costo.*

## 6bis. Eval harness — la valutazione dei modelli

`scripts/eval-dispensa.ts`: una batteria di ~10 note sintetiche con esiti
attesi (`{ nota, contesto, attesi: { ingredientId, campo, valoreNuovo }[],
attesiNonRiconosciuti }`), che gira la stessa `interpretaNota` su uno o più
modelli (`--modelli claude-haiku-4-5,claude-sonnet-5`) e stampa per ciascuno:
abbinamenti corretti/sbagliati/mancati, quantità esatte, calibrazione del
confidence (le proposte sbagliate DEVONO stare sotto 0.9), costo dal campo
`usage`. Richiede `ANTHROPIC_API_KEY` nell'ambiente: **senza chiave lo
script esce subito spiegandolo — alla consegna è NON ESEGUITO**, ed è
l'esatto strumento con cui Andrea sceglie il modello quando la mette. Le
fixture sono sintetiche e committate (nessun dato reale necessario).

## 7. Errori e limiti

- **Route senza chiave né mock**: 503, messaggio "correzione non
  disponibile" (lo stato di produzione finché la chiave non c'è; il mock si
  accende solo con `DISPENSA_AI_MOCK=1` in `.env.local`, mai su Vercel).
- **Route senza JWT valido**: 401 — la chiamata costa denaro e legge il
  contesto dell'utente, non esiste percorso anonimo.
- **Esito malformato dal modello**: `validaProposte` rifiuta tutto, la UI
  mostra "non ho capito la nota, riprova" — mai applicazioni parziali di un
  esito invalido.
- **Annulla è last-write-wins**: se fra applicazione e annullo l'utente
  corregge a mano lo stesso ingrediente, l'annullo riscrive `valoreAttuale`
  della proposta (perde la correzione manuale). Mono-utente, finestra di
  secondi: accettato.
- **La nota non è un inventario**: lo scope resta la correzione puntuale
  (spec Fase 1, riga 53: «l'utente non conta niente»). Note-fiume da 30
  righe funzionano ma non sono il caso di design.
- **Auth sulla route**: obbligatoria dal primo giorno, e siccome si spedisce
  ora, si costruisce ora (la route import resta senza auth a backlog: oggi è
  solo mock e non costa nulla — si allinea quando arriverà estrattoreClaude).

## 8. Test

- **Dominio** (`dispensa-ai.test.ts`): `validaProposte` — id inesistente,
  campo/tipo incoerenti, residuo negativo/NaN, confidence fuori range,
  conflitto stesso ingrediente+campo (vince l'ultima), esito vuoto valido;
  `mockCorrezione` — le regole di §2 una per una, incluso il non
  riconosciuto.
- **Route** (SDK Anthropic mockato con vi.mock): 401 senza JWT; ordine dei
  rami (chiave batte mock batte 503); esito valido → pass-through validato;
  esito malformato → errore; il corpo della richiesta al modello contiene
  contesto e nota.
- **UI**: tre gruppi del recap; Annulla riscrive `valoreAttuale`; conferma
  applica; microfono nascosto senza SpeechRecognition; nota preservata su
  errore.
- **Prompt/abbinamento reale + eval harness**: NON ESEGUIBILI senza chiave
  — dichiarati NON ESEGUITI alla consegna; l'harness (§6bis) è lo strumento
  del primo giro reale.

## 9. Prerequisiti e fuori scope

**Si costruisce ora, tutto**: dominio, route (con auth), UI, mock, harness.
La `ANTHROPIC_API_KEY` (Vercel + `.env.local`, mai in git né in chat) è
solo l'interruttore finale: quando Andrea la mette, la produzione passa da
503 alla chiamata vera senza deploy, e l'harness diventa eseguibile per la
scelta del modello. La stessa infrastruttura (chiave, SDK, branch esplicito,
pattern auth) sblocca estrattoreClaude.

**Fuori scope**: creazione di ingredienti nuovi via AI; upload di file
audio e STT esterni; correzioni a piatti, piani o liste via nota; cronologia
delle correzioni; qualunque scrittura server-side diretta da parte del
modello.
