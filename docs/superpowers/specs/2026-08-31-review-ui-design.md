# Review UI — design

**Data:** 31/08/2026 · **Base:** audit `docs/2026-08-30-audit-ui.md` (giro completo su mobile 375×812, main `b3760b3`) · **Stato:** approvato da Andrea il 31/08.

**Obiettivo:** allineare struttura, gesti e coerenza dell'app alla sua dimensione reale (8 sezioni, non più 3), eliminando i due rischi sui dati (toggle sul tap, editor sempre attivo) e l'identità da template. Le animazioni chiudono, solo dove spiegano una causa-effetto.

**Decisioni prese con Andrea (31/08):**
1. Tab bar a 4 voci + ingranaggio Impostazioni (Importa resta dentro Impostazioni).
2. In Settimana il tap sulla card apre; la casetta è il toggle esplicito; il kebab resta.
3. Piatto: vista di sola consultazione + bottone MODIFICA che accende l'editor attuale.
4. Dark mode FUORI da questa review (progetto di palette a sé, su UI stabilizzata).

**Fuori scope, esplicitamente:** dark mode; selettore/storico settimane (la pillola perde solo la freccetta); qualunque cambiamento a dominio, dati o API — questa review tocca solo presentazione, gesti, copy e accessibilità.

---

## A. Navigazione e identità

**Tab bar** (`src/components/TabBar.tsx`): quattro voci — LISTA `/lista`, SETTIMANA `/settimana`, PIATTI `/piatti`, DISPENSA `/dispensa` — con icona e stato attivo su ogni pagina dell'app group. Dispensa usa un'icona a scaffale/barattolo coerente con lo stile line-art delle attuali.

**Ingranaggio** (in `src/components/Testata.tsx`): l'attuale link-hamburger diventa un'icona ingranaggio con `aria-label="Impostazioni"`. Compare solo sulle quattro pagine radice; le pagine figlie usano la freccia indietro.

**Pagine fuori tab bar** (Impostazioni e figlie, Importa): testata con freccia indietro (pattern già esistente in Dispensa: bottone "Indietro") + titolo. La tab bar resta visibile ma senza voce attiva — comportamento oggi accidentale, da mantenere deliberatamente.

**Identità:**
- `src/app/layout.tsx`: `title: "Spesa"`, `description: "La spesa e la settimana della tua dieta: piano, lista e dispensa che si tengono aggiornati da soli."`
- `src/app/page.tsx`: `redirect('/lista')` server-side (sostituisce il placeholder; la PWA già parte da /lista via manifest).
- Il logo/marchio in testata linka `/lista`, non `/`.

**Impostazioni** (`src/app/(app)/impostazioni/page.tsx`): resta l'hub di configurazione (pasti, rotazione, ingredienti, reparti, Importa) ma perde la voce "Dispensa" (ora in tab bar) e il doppio titolo: resta solo l'H1 grande, l'eyebrow sparisce.

## B. Settimana

File: `src/app/(app)/settimana/page.tsx`, `src/components/RigaPasto.tsx`, `src/components/StrisciaGiorni.tsx`, `src/components/FoglioAzioniPasto.tsx`.

**Gesti sulla card pasto:**
- Tap sulla card → naviga al piatto assegnato (vista, sezione C); se il pasto non ha piatto, apre il foglio azioni. La card diventa semanticamente un bottone "Apri" col nome del pasto e del piatto.
- La casetta a sinistra diventa un bottone dedicato al toggle casa/fuori, bersaglio ≥44×44px, `aria-label` con lo schema attuale ("Colazione: a casa, tocca per segnare fuori") + `aria-pressed`.
- Il kebab ⋮ resta per il foglio "Com'è andata" / meal prep, invariato nelle funzioni.
- Il bersaglio `›` separato sparisce: il suo compito passa al tap sulla card.

**Striscia giorni:** ogni giorno prende `aria-label` "Domenica 30, selezionato" / "Venerdì 28" (nome giorno esteso + numero + stato). L'`aria-pressed` esistente resta.

**Pillola settimana** (`src/components/Testata.tsx`): la freccetta ⌄ viene rimossa; la pillola resta testo non interattivo. Il commento sul debito si aggiorna: il selettore, se mai, avrà una spec sua.

**Legenda:** la riga "CASA = A CASA · › APRE IL PIATTO" viene rimossa. Resta il contatore "N PASTI A CASA IN SETTIMANA".

## C. Piatto: vista + modifica

File: `src/app/(app)/piatti/[id]/page.tsx` (+ eventuale split in `Vista.tsx`/`Editor.tsx` se la pagina supera le ~400 righe — segue il criterio dei file focalizzati).

**Vista (default all'apertura):** nome piatto, chip dei pasti in sola lettura, "settimana N del giro · GIO" testuale, ingredienti come elenco non editabile (quantità + nome + area), "per 1 porzione". Nessun campo di input, nessuna X, nessun cestino. Testata: freccia indietro + bottone `MODIFICA`.

**Modifica:** il bottone MODIFICA monta l'editor attuale così com'è (chip selezionabili, X, SALVA/ANNULLA). Il cestino vive SOLO qui e chiede conferma prima di eliminare (dialogo con doppio bottone, distruttiva evidenziata). ANNULLA torna alla vista senza salvare; SALVA salva e torna alla vista.

**Chip giorno nell'editor:** `LIBERO · LUN · MAR · MER · GIO · VEN · SAB · DOM` — tre lettere, niente ambiguità M/M, tutti visibili senza scroll orizzontale (due righe se serve).

**Lista Piatti** (`src/app/(app)/piatti/page.tsx`): campo di ricerca testuale sopra i filtri (filtra per nome, case/accents-insensitive col `normalizza` già in `src/domain/import/mapping.ts` se riesportabile senza dipendenze incrociate, altrimenti normalizzazione locale equivalente); i titoli delle card passano a max 2 righe prima del troncamento.

## D. Dispensa

File: `src/app/(app)/dispensa/page.tsx`, `src/components/NotaDispensa.tsx`.

Ordine delle sezioni dall'alto: **IN CASA** → **PRONTI** (invariata, quando ci sono lotti) → **MAI COMPRATI** → **card correzione AI**. La card AI parte compressa ("Il conto non torna? Correggi con una nota") e si espande al tap mostrando textarea, mic e Correggi; comportamento interno invariato. Il paragrafo esplicativo attuale si riduce a una riga sotto l'intestazione IN CASA: "Calcolato da spesa e piano: correggi solo se non torna con la realtà." Lo stato disabilitato di "Correggi" si distingue visivamente da quello attivo (opacità ridotta + niente colore pieno).

## E. Coerenza e copy (lotto meccanico)

| Dove | Oggi | Diventa |
|---|---|---|
| `lista/page.tsx:421` | "1 VOCI" | "1 VOCE" / "N VOCI" |
| Foglio azioni | "Ho mangiato altro" | "Ho mangiato fuori piano" |
| Foglio azioni | "Cucinato ma non mangiato" su pasto senza piatto | voce nascosta se il pasto non ha piatto |
| Foglio azioni | link camuffato da bottone | stessa resa visiva, ruolo dichiarato (resta `<a>`, ok) |
| Impostazioni | "RIPARTI DALLA SETTIMANA 1" senza conferma | dialogo di conferma prima di eseguire |
| Impostazioni, rotazione | "Il giro è cominciato lunedì 31 agosto" anche se futuro | "comincia/è cominciato" scelto in base alla data |
| Importa fallback | input file nativo "Choose files" | input nascosto + label-bottone nello stile dell'app ("SCEGLI LE FOTO") |
| BASE/TOP-UP (`Segmento.tsx` o dove vive) | bottoni senza nome | `aria-label` "Base, N da prendere" / "Top-up, N da prendere" |
| Tessere Lista | — | invariate nel comportamento; la "protagonista" resta, ma acceso/spento restano gli unici segnali di stato (nessun nuovo segnale) |

Nomi accessibili: censimento finale con un giro di `read_page` — ogni bottone/link interattivo deve avere un nome; il pattern di riferimento è quello già usato in Impostazioni.

## F. Animazioni

Tutte CSS (transition/animation), durate 150–250ms, easing standard, e TUTTE dentro `@media (prefers-reduced-motion: no-preference)`. Solo causa-effetto:

1. Tessera Lista che si spegne alla spunta (colore→neutro + barratura) e contatore BASE/TOP-UP che si aggiorna in sincrono.
2. Toggle casetta in Settimana (transizione di stato della card: piena↔attenuata).
3. Apertura/chiusura del foglio azioni e della card AI in Dispensa (slide/fade breve).
4. Cambio giorno nella striscia (slide orizzontale breve del contenuto giorno).
5. Comparsa della riga "+N porzioni" da un lotto Pronti (fade-in).

Vietato: animazioni di ingresso pagina, parallax, delay a cascata, qualunque animazione che ritardi un'azione.

## G. Test e verifica

- Test di componente per i pattern nuovi: la vista piatto non emette scritture; il tap sulla card pasto naviga (o apre il foglio) e NON cambia lo stato casa/fuori; la casetta lo cambia; conferma richiesta per cestino e riparti; la ricerca Piatti filtra.
- Test esistenti aggiornati dove cambiano gesti, label e copy (camera.test, revisione, lista, settimana).
- `/` reindirizza a /lista (test di route o verifica manuale).
- Verifica finale nel browser su viewport mobile, stessa procedura dell'audit, con giro `read_page` per il censimento dei nomi accessibili.

## Esecuzione

Una spec, un piano in due lotti: **Lotto 1** = A+B+C+D (struttura e gesti), **Lotto 2** = E+F (coerenza e animazioni). Il lotto 2 non parte se il lotto 1 non è verde (suite + giro browser).
