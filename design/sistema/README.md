# Pacchetto design system — Spesa

Questa cartella è il pacchetto da caricare in un progetto **design system** di Claude Design
(claude.ai/design), così che ogni schermata generata lì nasca già dentro il sistema di Spesa.

Versione del sistema: **v2, approvata il 17/09/2026**. Le otto decisioni di quel giorno sono
già incorporate: qui non esiste più nessun "da decidere".

## Cosa c'è

| File | Cosa è |
|---|---|
| `DESIGN.md` | **La fonte di verità.** Il design system riscritto per chi genera schermate: principi, token, tipografia, spaziatura, raggi, bordi, ombre, icone, movimento, componenti con anatomia e misure, pattern, copy, accessibilità, esclusioni. |
| `tokens.css` | Tutte le variabili CSS, una per riga con il suo commento: i neutri e le aree di `src/app/globals.css`, i cinque token nuovi, e le scale (tipografia, spaziatura, raggi, bordi, ombre, tratti, misure dei controlli). |
| `prompt-iniziale.md` | Il testo da incollare come primo messaggio in Claude Design, per fargli adottare il sistema. |
| `cards/*.html` | Ventuno schede, una per file: la resa visiva del sistema. Ogni scheda è un HTML autonomo con CSS inline. |

Le schede sono raggruppate dal marcatore in prima riga, `<!-- @dsCard group="…" -->`:

- **Fondamenta** — `colori-neutri`, `colori-aree`, `colori-semantici`, `spaziatura`, `raggi`, `movimento` (le quattro animazioni in moto, con un tasto PROVA),
  `bordi-ombre`, `icone`
- **Tipografia** — `scala`
- **Componenti** — `testata-marchio`, `tab-bar`, `tasti`, `pillole-segmenti`, `tessere-lista`,
  `riga-controllo`, `riga-pasto-striscia`, `foglio-dal-basso`, `stato-vuoto`, `campo-testo`,
  `messaggi`
- **Pattern** — `gesti-conferme`, `copy`

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
3. `DESIGN.md`, `tokens.css` e `prompt-iniziale.md` viaggiano insieme come documenti del
   progetto.

Ogni file in `cards/` deve iniziare **esattamente** con la riga
`<!-- @dsCard group="…" -->`, dove `group` è uno di Fondamenta, Tipografia, Componenti,
Pattern. Un file senza quel marcatore in prima riga non entra nell'indice.

### Via 2 — caricamento manuale

1. Apri claude.ai/design e crea (o apri) il progetto **design system** di Spesa.
2. Carica `DESIGN.md` e `tokens.css` come documenti del progetto.
3. Carica i file di `cards/` come anteprime: il pannello Design System legge il marcatore in
   prima riga e li raggruppa da sé.
4. Apri una conversazione nuova e incolla `prompt-iniziale.md` come primo messaggio.

## Vincoli del formato delle schede

- Marcatore `@dsCard` in **prima riga**, prima del doctype.
- File HTML completo e autonomo: doctype, `html lang="it"`, `head`, `body`.
- CSS **inline** nel `<style>` del file; nessun foglio esterno, nessuno script.
- Font da Google Fonts (Plus Jakarta Sans, JetBrains Mono) con fallback dichiarati.
- Larghezza: **393 px** per le schede di componenti (la cornice del telefono), **720 px** per
  token, scale e pattern.
- Titolo piccolo in mono in cima, didascalia sotto quando serve.
- Le schede obbediscono al sistema che mostrano: fondo `#F1F0EE`, superfici bianche, inchiostro
  `#14163A`, niente emoji, niente gradienti, niente ombre colorate.

## Rapporto con il codice

Il codice dell'app (`src/`) non è toccato da questo pacchetto. I cinque token nuovi
(`--testo-2`, `--avviso`, `--errore`, `--freddo`, `--icona-spenta`) sono decisi ma non ancora
in `src/app/globals.css`: entrano alla prima modifica utile di quel file. Il documento sorgente
del sistema, con i conteggi della deriva del codice, resta
`docs/superpowers/specs/DESIGN-SYSTEM.md`: quella parte riguarda il codice, non il disegno, e
per questo non è finita in `DESIGN.md`.
