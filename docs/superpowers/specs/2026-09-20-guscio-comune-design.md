# Fase 1 del redesign: il guscio comune — design

**Data:** 20/09/2026 · **Stato:** bozza per la review di Andrea · **Base:** `main` `6ae73c7`,
`design/sistema/DESIGN.md` v3, `design/sistema/schermate/lista.html`, `design/ridisegno/CLAUDE.md`.

**Obiettivo.** Portare nel codice la parte del redesign che tutte le schermate condividono:
fondo a gradiente, tab bar flottante che si restringe allo scorrimento con il Marchio come
icona della Lista, testata con il menù utente, titoli in sentence case, Settimana che diventa
Piano, contenuto che passa dietro la barra e sfuma. Cambia l'aspetto di tutte e sedici le
schermate; **non cambia il comportamento di nessuna**: stessi dati, stesse azioni, stesse route
(con un redirect). Successo: le sedici schermate si usano dal telefono come il 15/09, con il
guscio nuovo, e la suite resta verde.

**Decisioni di Andrea che questa spec applica:** tab bar B con i nomi (`CLAUDE.md`), Marchio
3×2 in barra, `--fine` 128/110, menù utente con l'iniziale al posto di ingranaggio e marchio,
il tondo porta a `/impostazioni` come oggi (20/09), titoli `Lista` `Piano` `Piatti` `Dispensa`
in sentence case, ordine Lista · Piano · Piatti · Dispensa.

**Fuori scope, esplicitamente:** il Dock (fase 2), la fusione Base/Top-up (fase 2), i widget di
sezione della Lista (fase 2), la vista "oggi e domani" del Piano (fase 2), Piatti e fotocamera
(fase 3), Dispensa (fase 4), il pannello Impostazioni e le sotto-schermate (fase 5), il logout,
le sei schermate non ridisegnate (restano col corpo di oggi dentro il guscio nuovo).

---

## A. Token e fondo

`src/app/globals.css` guadagna, in `:root`:

- i cinque token del 17/09: `--testo-2 #5C5F7A`, `--avviso #9A5C00`, `--errore #C4423E`,
  `--freddo #2F6FBF`, `--icona-spenta #C4C4CE`;
- le tre ombre nuove `--ombra-pannello`, `--ombra-nav`, `--ombra-alta` e le tre vecchie
  rinominate come token `--ombra-tessera`, `--ombra-casetta`, `--ombra-tasto` (i letterali nei
  file restano finché non si toccano: il token è per il codice nuovo);
- `--sfondo-schermata` (il gradiente a quattro fermate), `--barra-*`, `--dock-*`,
  `--fine-barra-grande 128px`, `--fine-barra-piccola 110px`, `--moto-barra 200ms`,
  `--curva-barra cubic-bezier(.2,.8,.25,1)`, `--raggio-casella-barra 2.52px`. Valori e
  commenti copiati da `design/sistema/tokens.css`, che resta la fonte.

Il `body` passa da `background: var(--fondo)` a `background: var(--sfondo-schermata)` con
`background-attachment: fixed` (il gradiente è della schermata, non del contenuto che scorre;
su iOS `fixed` non è affidabile, quindi il gradiente va sul contenitore a tutta altezza del
layout, vedi B, e il body tiene `var(--fondo)` come fallback). `--fondo` resta `#F1F0EE` per
tutto ciò che lo usa come colore pieno (tessera spenta, palchi). `theme_color` in
`public/manifest.json` e `themeColor` in `layout.tsx` passano a `#EDECEA`, la fermata alta del
gradiente, così la barra di stato del telefono si fonde con il fondo.

## B. Il layout: barra sopra il contenuto, non sotto

Oggi `src/app/(app)/layout.tsx` è una colonna: `<main>` che scorre e `<TabBar>` in flusso sotto.
Diventa:

```
<Guscio>                      client; position: relative; height 100%; fondo gradiente
  <main>                      flex 1, minHeight 0: contiene la pagina, che ha il suo scroller
    <PrimoAvvio>{children}</PrimoAvvio>
  </main>
  <TabBar />                  position: absolute; bottom 22; left/right 16 (o 46 ridotta)
</Guscio>
```

`Guscio` (`src/components/Guscio.tsx`, nuovo) possiede lo **stato della barra**
(`grande | ridotta`) e lo espone come `data-barra` sul proprio elemento, così il CSS decide
`--fine` e la barra decide le misure senza contesti React. Ascolta lo scorrimento con
`document.addEventListener('scroll', h, { capture: true })`: gli eventi `scroll` non risalgono
ma si catturano, quindi un solo ascoltatore vede tutti gli scroller delle pagine senza che le
pagine sappiano nulla. Regola: **ridotta** quando lo scroller ha `scrollTop > 24` e l'ultimo
movimento è verso il basso di almeno 6 px; **grande** quando il movimento è verso l'alto di
almeno 6 px o `scrollTop < 8`. Il cambio di route riporta a grande. Il listener è passivo e
il calcolo è un confronto di due numeri: niente `requestAnimationFrame`, niente throttling.

**Gli scroller delle pagine.** Ogni pagina ha già il proprio contenitore `className="sc"`
con `overflowY: auto` (17 occorrenze in 15 file). Ognuno prende la classe `scroll-app`, definita
in `globals.css`:

```css
.scroll-app {
  -webkit-mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - var(--fine)),
    rgba(0,0,0,.55) calc(100% - 74px), rgba(0,0,0,0) calc(100% - 30px));
  mask-image: /* idem */;
  padding-bottom: var(--coda, 140px) !important;
}
[data-barra="grande"]  { --fine: var(--fine-barra-grande); }
[data-barra="ridotta"] { --fine: var(--fine-barra-piccola); }
```

`--coda` è 140 (84 di barra + 22 + 34 di respiro) e diventa 194 in fase 2 dove c'è il Dock.
L'`!important` serve perché i padding sono inline nei file: toccare 17 stili inline per un
solo valore è la modifica che questa spec vuole evitare; la classe vince e il padding
orizzontale inline resta (si applica solo `padding-bottom`). Le pagine non cambiano altro.
Una pagina senza `scroll-app` funziona comunque: il contenuto finisce sotto la barra senza
sfumatura. Il censimento delle 17 occorrenze è nel piano.

## C. La tab bar

`src/components/TabBar.tsx` riscritta. Misure da `lista.html` e `tokens.css`:

- Pillola bianca `position: absolute`, `left/right 16`, `bottom 22`, altezza **84**, raggio
  999, padding 6, gap 2, `--ombra-nav`. Ridotta: altezza **66**, `left/right 46`.
- Quattro voci `<Link>` `flex: 1`, alte 72 (54 ridotta), colonna, gap 4, raggio 999; attiva
  su `rgba(20,22,58,.07)`. Dentro: `.segno` alto fisso 26 con l'icona, poi l'etichetta mono
  8,5 / 0,12em, maiuscola via `text-transform` con testo `Lista` `Piano` `Piatti` `Dispensa`;
  spenta `--off` peso 500, accesa `--ink` peso 700. Ridotta: etichetta `max-height 0;
  opacity 0`, la voce resta alta 54 e cliccabile.
- **Icone piene a 26** per Piano, Piatti, Dispensa: gli SVG di `lista.html` copiati, colore
  `#9A9AA6` spente e `--ink` accesa. **La voce Lista porta il Marchio**: `<Marchio lato={9}>`
  con gap 4 e raggio `--raggio-casella-barra`, pieno/contornato per area come oggi.
- `aria-label="Sezioni"` sul `<nav>`; ogni voce ha il nome dal testo; `aria-current="page"`
  sulla voce attiva. L'attivazione resta `pathname.startsWith(href)`.
- Transizioni in `globals.css`, classe `.anim-barra`, solo dentro
  `@media (prefers-reduced-motion: no-preference)`: altezza, lati, `max-height` e `opacity`
  dell'etichetta, 200 ms `--curva-barra`.

**Il Marchio in barra sa cosa manca.** Oggi solo la Lista calcola `aree` e le passa alla
Testata. La Testata non ha più il Marchio, quindi il dato deve arrivare alla barra:
`src/components/marchio-context.tsx` (nuovo) espone `MarchioProvider` (montato in `Guscio`) e
`useAreeMancanti(aree)`, che la Lista chiama con il suo array; le altre pagine non chiamano
nulla e il default è vuoto, cioè marchio tutto pieno. Il valore si azzera quando la Lista si
smonta.

`Marchio.tsx` guadagna il prop facoltativo `raggio` (default `lato * 0.28`, che a 9 dà
proprio 2,52) e `gap` (default 4): nessun cambiamento per chi lo usa a 16.

## D. La testata

`src/components/Testata.tsx` riscritta, stessa firma più un prop:

- `titolo` in sentence case, 52/800/-0.05em; i chiamanti passano `Lista` (Lista e Hai preso
  tutto, oggi `Spesa`), `Piano` (oggi `Settimana`), `Piatti`, `Dispensa` (nuovo chiamante),
  `Importa la dieta` (invariato).
- **Menù utente** a destra al posto dell'ingranaggio: pillola `rgba(20,22,58,.07)` alta 50,
  raggio 999, padding `0 12px 0 6px`, con dentro il tondo 38 in `--ink` e l'iniziale mono
  16/700 bianca maiuscola, e a destra i tre punti kebab 20 in `--ink`. È un `<Link
  href="/impostazioni" aria-label="Impostazioni">`: il nome accessibile resta quello di oggi,
  così inventario e test non cambiano. Tap ≥ 44.
- **L'iniziale** viene da `useUtente()` (`src/data/utente.ts`, nuovo): legge l'utente
  Supabase una volta (`getUser`), ritorna la prima lettera di `user_metadata.nome` se c'è,
  altrimenti dell'email, maiuscola; finché non arriva, o se manca, il tondo mostra il glifo
  `·`. Nessuna scrittura, nessun dato nuovo salvato.
- Il **Marchio esce dalla Testata** e con lui il link "Vai alla lista": la Lista si raggiunge
  dalla barra. Il prop `aree` sparisce dalla firma; i chiamanti che lo passano smettono.
- `settimana` (pillola) invariata: 34, raggio 999, fondo ink, mono 10,5/700/0,13em. Formato
  del testo invariato in questa fase (`31 AGO — 6 SET`); "Settimana del 21 settembre" è copy
  della fase 2.
- Modalità `indietro` invariata nel comportamento (freccia 20 a sinistra del titolo, verso
  `/impostazioni`, niente menù utente); usata da Importa.
- Padding `20px 18px 12px`, gap 15, come oggi.

**La Dispensa adotta la Testata.** Oggi ha un header di sottopagina con la freccia verso
`/impostazioni` (l'inventario lo segnala come incoerente per una voce di tab bar). In questa
fase la sua `Cornice` locale monta `<Testata titolo="Dispensa" />`; il resto della pagina non
cambia. Le altre pagine con header proprio (Impostazioni e figlie, Piatto, Ingrediente,
Piatti veloce, Confezioni) **non cambiano**: sono sottopagine o schermate di fasi successive.

## E. Settimana diventa Piano

- La cartella `src/app/(app)/settimana/` si rinomina `piano/` (con `[data]/[slotDefId]/scegli`
  dentro). Tutti i link interni (`/settimana`, `/settimana/${data}/${slot}/scegli`, i redirect
  di `lista/fatta`, `lista/confezioni`, `importa`, `piatti/veloce`: 13 occorrenze in 8 file)
  passano a `/piano`. `public/sw.js` aggiorna il guscio offline (`'/piano'` al posto di
  `'/settimana'`).
- **Redirect permanenti** in `next.config.ts`: `/settimana` → `/piano` e `/settimana/:path*` →
  `/piano/:path*`, così i link salvati e la PWA installata continuano a funzionare. Il proxy
  di autenticazione non cambia: protegge per esclusione (`/entra`, `/auth/*`), non per elenco.
- Il titolo della schermata è `Piano`; il nome del file di dominio `week-shape` e la parola
  "settimana" nel copy interno ("N pasti a casa in settimana", la pillola) **non cambiano**:
  la settimana resta il periodo, il Piano è la sezione (`CLAUDE.md`).

## F. Copy e nomi che cambiano

| Dove | Oggi | Diventa |
|---|---|---|
| Testata Lista, Hai preso tutto | `Spesa` | `Lista` |
| Testata Settimana | `Settimana` | `Piano` |
| Tab bar | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` (testo maiuscolo) | `Lista` `Piano` `Piatti` `Dispensa` (testo, maiuscolo via CSS) |
| Dispensa header | freccia + `DISPENSA` mono | Testata `Dispensa` + menù utente |
| Ingranaggio | icona ingranaggio, `aria-label="Impostazioni"` | tondo con l'iniziale, stesso `aria-label` |

Nessun altro copy cambia.

## G. Errori e casi limite

- Utente senza email né nome (non dovrebbe esistere: l'accesso è per magic link): tondo con `·`.
- `getUser` che fallisce: come sopra, senza errore a schermo; il tondo resta un link valido.
- `mask-image` non supportata: il contenuto passa dietro la barra senza sfumatura; il
  `padding-bottom` garantisce che l'ultima voce resti raggiungibile.
- `prefers-reduced-motion`: la barra cambia stato senza transizione.
- Pagina che monta due scroller (Piatto: elenco e foglio): la classe va solo sullo scroller
  principale; il foglio non sfuma.
- Il redirect `/settimana` → `/piano` è 308: un `fetch` da vecchi service worker segue il
  redirect; il guscio offline nuovo mette in cache `/piano`.

## H. Test

- `tabbar.test.tsx`: quattro voci con i testi nuovi, voce attiva per prefisso, `aria-current`,
  Marchio presente nella voce Lista, etichette presenti anche a barra ridotta (`data-barra`
  impostato dal test sul contenitore).
- `guscio.test.tsx` (nuovo): eventi `scroll` sintetici su uno scroller figlio cambiano
  `data-barra` secondo le soglie; il cambio di route lo riporta a grande.
- `testata.test.tsx`: titolo, pillola, menù utente con `aria-label="Impostazioni"` e `href`
  `/impostazioni`, iniziale da un `useUtente` finto, modalità `indietro`, assenza del Marchio.
- `marchio-context` : la Lista pubblica `aree`, la barra le riflette, lo smontaggio azzera.
- Test di pagina esistenti che citano `/settimana`, `SETTIMANA`, `Spesa`, `Torna alle
  impostazioni` (Dispensa) e `Vai alla lista`: aggiornati ai nuovi valori (13 file).
- `identita.test.tsx`: invariato (root → `/lista`).
- Verifica nel browser a 375×812 su tutte e sedici le schermate: fondo, barra, sfumatura,
  restringimento allo scorrimento e ritorno, etichette nascoste ma tappabili, `/settimana` che
  reindirizza, iniziale nel tondo, Marchio in barra che riflette le aree in Lista.
- **Gate finale (Andrea):** le prove del 15/09 rifatte dal telefono con il guscio nuovo.

## I. Esecuzione

Un piano in `docs/superpowers/plans/2026-09-20-guscio-comune.md`, subagent-driven, task
disgiunti: (1) token e fondo; (2) `Guscio` + `scroll-app` + censimento dei 17 scroller;
(3) `TabBar` + `Marchio` + contesto; (4) `Testata` + `useUtente` + Dispensa; (5) rinomina
Piano + redirect + sw; (6) aggiornamento dei test di pagina; (7) verifica browser e README.
Prima della PR: review di correttezza e di sicurezza (il `useUtente` legge dati dell'utente;
il listener globale è l'unico pezzo con stato condiviso).
