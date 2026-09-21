# Pacchetto design system — Dispesa

Questa cartella è il pacchetto da caricare in un progetto **design system** di Claude Design
(claude.ai/design), così che ogni schermata generata lì nasca già dentro il sistema di Dispesa.

Versione del sistema: **v3, aggiornata il 20/09/2026** (la v2 era stata approvata il
17/09/2026). Le otto decisioni del 17/09, il ridisegno del 19/09 e le cinque risposte di Andrea
del 20/09 sono già incorporati: qui non esiste più nessun "da decidere".

## Cosa c'è

| File | Cosa è |
|---|---|
| `DESIGN.md` | **La fonte di verità**, v3 del 20/09/2026. Il design system riscritto per chi genera schermate: principi, token, tipografia, spaziatura, raggi, bordi, ombre, icone, movimento, componenti con anatomia e misure, pattern, copy, accessibilità, esclusioni, e in §13 il registro delle decisioni. |
| `CLAUDE.md` | **Le decisioni prese con Andrea**, con la cronaca di come sono state prese: il ridisegno del 19/09 e le cinque risposte del 20/09. Se contraddice `DESIGN.md`, vince `DESIGN.md`: qui c'è la cronaca, là la regola. |
| `tokens.css` | Tutte le variabili CSS, una per riga con il suo commento: i neutri e le aree di `src/app/globals.css`, i cinque token semantici, le scale (tipografia, spaziatura, raggi, bordi, ombre, tratti, misure dei controlli) e il blocco del **ridisegno** — gradiente, tre ombre nuove, `--fine-barra-grande` 128 e `--fine-barra-piccola` 110, `--moto-barra` 200ms con `--curva-barra`, le misure della tab bar e del dock, raggio cornice 26. |
| `prompt-iniziale.md` | Il testo da incollare come primo messaggio in Claude Design, per fargli adottare il sistema. |
| `prompt-aggiorna-claude-md.md` | Il prompt del 20/09 per far aggiornare a Claude Design il `CLAUDE.md` del progetto: `CLAUDE.md` è un percorso riservato e DesignSync non lo scrive. Già usato. |
| `prompt-nome-dispesa.md` | Il prompt del 21/09 per la stessa ragione: l'app si chiama **Dispesa** e il `CLAUDE.md` del progetto va corretto a mano. |
| `cards/*.html` | Ventidue schede, una per file: la resa visiva dei componenti. Ogni scheda è un HTML autonomo con CSS inline. |
| `schermate/*.html` | Le **schermate assemblate**: una schermata intera dentro la cornice 393 × 852, montata dai pezzi approvati, con sotto i tre blocchi di consegna (Misure, Componenti usati, Regole di `DESIGN.md` che tocca). Oggi c'è `lista.html` (20/09). Stesso formato delle schede, gruppo `Schermate`. |

Le schede sono raggruppate dal marcatore in prima riga, `<!-- @dsCard group="…" -->`:

- **Fondamenta** — `colori-neutri`, `colori-aree`, `colori-semantici`, `spaziatura`, `raggi`, `movimento` (le quattro animazioni in moto, con un tasto PROVA),
  `bordi-ombre`, `icone`
- **Tipografia** — `scala`
- **Componenti** — `testata-marchio`, `tab-bar`, `tasti`, `pillole-segmenti`, `tessere-lista`,
  `riga-controllo`, `riga-pasto-striscia`, `foglio-dal-basso`, `stato-vuoto`, `campo-testo`,
  `messaggi`
- **Pattern** — `gesti-conferme`, `copy`
- **Schermate** — `schermate/lista.html`

Le schede di `cards/` sono ferme alla resa della **v2**: dove mostrano la tab bar senza nomi, il
fondo piatto o l'ingranaggio in testata, vale `DESIGN.md` v3 e la scheda va rifatta. È il debito
aperto di questo pacchetto.

## La regola d'oro

**Il markdown è la fonte di verità; le schede sono la sua resa.**

Se una scheda e `DESIGN.md` non concordano, vince `DESIGN.md` e la scheda va corretta. Quando
cambia una regola, l'ordine è sempre lo stesso: prima `DESIGN.md`, poi `tokens.css`, poi la
scheda che la mostra. Mai il contrario — una scheda ritoccata a mano che nessuno ha scritto nel
markdown è un valore perso alla prossima generazione.

Chi genera una schermata legge `DESIGN.md`. Le schede servono a fargli vedere com'è fatta una
tessera, non a definirla.

## Come si carica

### Via 1 — DesignSync da Claude Code

1. In una sessione interattiva di Claude Code: `/design-login`.
2. Chiedi di sincronizzare questa cartella verso il progetto design system; lo strumento
   DesignSync legge `cards/` e costruisce l'indice dai marcatori `@dsCard` in prima riga.
3. `DESIGN.md`, `CLAUDE.md`, `tokens.css` e `prompt-iniziale.md` viaggiano insieme come
   documenti del progetto; `schermate/` entra nell'indice come le `cards/`.

Ogni file in `cards/` e in `schermate/` deve iniziare **esattamente** con la riga
`<!-- @dsCard group="…" -->`, dove `group` è uno di Fondamenta, Tipografia, Componenti,
Pattern, Schermate. Un file senza quel marcatore in prima riga non entra nell'indice.

### Via 2 — caricamento manuale

1. Apri claude.ai/design e crea (o apri) il progetto **design system** di Dispesa.
2. Carica `DESIGN.md`, `CLAUDE.md` e `tokens.css` come documenti del progetto. Carica anche
   `docs/2026-09-19-inventario-schermate.md` col nome `INVENTARIO-SCHERMATE.md`: il prompt
   iniziale lo cita e ogni schermata nuova deve poterlo nominare.
3. Carica i file di `cards/` e di `schermate/` come anteprime: il pannello Design System legge
   il marcatore in prima riga e li raggruppa da sé.
4. Apri una conversazione nuova e incolla `prompt-iniziale.md` come primo messaggio.

## Vincoli del formato delle schede

- Marcatore `@dsCard` in **prima riga**, prima del doctype.
- File HTML completo e autonomo: doctype, `html lang="it"`, `head`, `body`.
- CSS **inline** nel `<style>` del file; nessun foglio esterno, nessuno script.
- Font da Google Fonts (Plus Jakarta Sans, JetBrains Mono) con fallback dichiarati.
- Larghezza: **393 px** per le schede di componenti e per le schermate (la cornice del
  telefono), **720 px** per token, scale e pattern. Le schermate dichiarano
  `viewport="393x1100"` nel marcatore, perché sotto la cornice ci stanno i tre blocchi di
  consegna.
- Titolo piccolo in mono in cima, didascalia sotto quando serve.
- Le schede obbediscono al sistema che mostrano: fondo `#F1F0EE`, superfici bianche, inchiostro
  `#14163A`, niente emoji, niente ombre colorate. Il **gradiente del fondo** vale per le
  schermate dentro la cornice (`DESIGN.md` §2.4), non per il fondo delle schede di token.

## Rapporto con il codice

Il codice dell'app (`src/`) non è toccato da questo pacchetto, ma dal 21/09 lo segue: i cinque
token semantici (`--testo-2`, `--avviso`, `--errore`, `--freddo`, `--icona-spenta`) e i token
del blocco "ridisegno" di `tokens.css` sono **in** `src/app/globals.css`, entrati con la fase 1
del ridisegno (guscio comune, commit `7f6bfb0`). Il registro delle **derive del codice** resta
`docs/superpowers/specs/DESIGN-SYSTEM.md`, che dal 20/09 rimanda a `DESIGN.md` v3 come fonte di
verità per il design e tiene solo la parte che riguarda il codice.
