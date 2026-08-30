# Correzioni alla dispensa via AI — design

Data: 2026-08-30 · Stato: spec approvata in chat, **costruzione rimandata** (vedi §9)
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
| Chiave API | **Non ancora**: la spec si scrive ora, la costruzione parte quando Andrea mette ANTHROPIC_API_KEY |
| Scope | Solo `residuo` e `congelato` su **ingredienti esistenti**; nomi non riconosciuti segnalati, mai creati |
| Confidence | Per singola modifica: ≥90% applica subito + recap con Annulla; <90% proposta da confermare |
| Audio | Dettatura del browser (Web Speech API) → converge sul percorso testuale; **nessun upload audio, nessuno STT esterno** (la Messages API non accetta audio in input [fonte: skill claude-api, cache 2026-06]) |

## 2. Architettura — l'AI propone, il client applica

Nessun agente che scrive sul database. Il flusso:

```
nota (testo) → POST /api/dispensa/correggi → modello con structured output
  → { proposte: ModificaProposta[], nonRiconosciuti: string[] }
  → validaProposte (dominio puro) → UI: applica/propone/segnala
  → scritture via correggiResiduo / impostaCongelato esistenti
```

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

Stesso pattern della route import (`/api/import/estrai`): senza
`ANTHROPIC_API_KEY` la route risponde `503 { errore: 'correzione non
disponibile' }`; il branch sulla chiave è esplicito. Ogni esito del modello
passa da `validaProposte` in `src/domain/dispensa-ai.ts` (puro): ingredientId
esistente, campo ammesso, tipo del valore coerente col campo, residuo finito
e ≥ 0, confidence in [0,1], `valoreAttuale` coerente con lo stato letto.
Un esito non valido è un errore mostrato, mai applicato in parte.

## 3. Il contesto nel prompt

La route legge repertorio e dispensa e passa al modello l'elenco degli
ingredienti dell'utente: `nome, unitaBase, formatoConfezione, residuo
attuale, congelato`. Così:

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

Default in spec: **Haiku 4.5** (`claude-haiku-4-5`, $1/$5 per MTok
[fonte: skill claude-api, cache 2026-06]) — estrazione strutturata da una
nota breve con contesto di ~100 ingredienti, structured output
(`output_config.format`), niente thinking. Costo per correzione nell'ordine
dei decimi di centesimo. [ipotesi, non testata: da validare col primo giro
reale; se l'abbinamento sbaglia, salire di modello è un cambio di stringa]

## 7. Errori e limiti

- **Route senza chiave**: 503, messaggio "correzione non disponibile" (lo
  stato di produzione finché la chiave non c'è).
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
- **Auth sulla route**: obbligatoria dal primo giorno (stesso requisito già
  a backlog per la route import — qui non si spedisce senza).

## 8. Test

- **Dominio** (`dispensa-ai.test.ts`): `validaProposte` — id inesistente,
  campo/tipo incoerenti, residuo negativo/NaN, confidence fuori range,
  conflitto stesso ingrediente+campo (vince l'ultima), esito vuoto valido.
- **Route** (mock del client Anthropic): branch senza chiave → 503; esito
  valido → pass-through validato; esito malformato → errore.
- **UI**: tre gruppi del recap; Annulla riscrive `valoreAttuale`; conferma
  applica; microfono nascosto senza SpeechRecognition; nota preservata su
  errore.
- **Prompt/abbinamento**: NON ESEGUIBILI senza chiave — al primo giro
  reale, un piccolo set di note vere di Andrea come casi di collaudo.

## 9. Prerequisiti e fuori scope

**Si costruisce quando**: (1) Andrea mette `ANTHROPIC_API_KEY` (Vercel +
`.env.local`, mai in git né in chat); (2) auth sulla route. Sblocca anche
estrattoreClaude (stessa infrastruttura: chiave, branch esplicito, auth).

**Fuori scope**: creazione di ingredienti nuovi via AI; upload di file
audio e STT esterni; correzioni a piatti, piani o liste via nota; cronologia
delle correzioni; qualunque scrittura server-side diretta da parte del
modello.
