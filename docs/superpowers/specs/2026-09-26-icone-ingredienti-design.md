# Icone ingrediente sulle tessere — design

**Obiettivo.** Riempire lo spazio vuoto delle tessere ingrediente con un'icona che fa riconoscere
l'ingrediente a colpo d'occhio, senza togliere leggibilità al nome e senza rompere il sistema.
Funziona se tutte le icone sembrano della stessa mano e nessun nome si legge peggio di oggi.

Decisioni prese con Andrea il 26/09/2026 in brainstorming.

## 1. Perimetro

- **Tre tessere:** Lista (`src/components/Tessera.tsx`, compresa la protagonista/hero),
  Dispensa (`src/app/(app)/dispensa/TesseraDispensa.tsx`), ingredienti del piatto
  (`src/components/TesseraIngrediente.tsx`). `TesseraLotto` resta fuori.
- **Catalogo:** 70 icone che coprono ~135 nomi, in
  [`2026-09-26-icone-ingredienti-lista.md`](2026-09-26-icone-ingredienti-lista.md).
  "I 100 più usati" non si ricava dai dati: in produzione ci sono 2 utenti e ~95 nomi distinti,
  quasi tutti dal seed (query del 26/09). La lista unisce produzione, `INGREDIENTI_BASE`,
  `formati-tipici`, estrazioni delle diete e aggiunte ragionate.
- **Icone di famiglia ammesse** dove la differenza non si vede (tonno e salmone → pesce;
  ceci, fagioli, lenticchie → legumi). **Icone proprie** dove si vede (manzo → bistecca,
  pollo → cosciotto, piselli → baccello).
- **Tessera ingrediente del piatto:** la matita sta in basso a destra (area di tocco 44×44,
  `TesseraIngrediente.tsx`), la X in alto a destra. Il pilota decide dove va l'icona lì.
- **Fuori catalogo: nessuna icona.** Niente segnaposto generico; la tessera resta com'è oggi.

## 2. Processo

| # | Passo | Chi | Gate |
|---|---|---|---|
| 1 | Lista delle icone e dei sinonimi | Claude Code | **Andrea rivede la lista** |
| 2 | Pilota di 12 icone in Claude Design sulle tre tessere vere | Andrea (brief preparato da Claude Code) | Delta di fine sessione (`docs/design-delta/`) |
| 3 | Produzione delle restanti in SVG seguendo il delta + foglio di controllo HTML | Claude Code | **Andrea rivede il foglio** |
| 4 | Integrazione su branch + regola in DESIGN.md | Claude Code | Merge = deploy: ok di Andrea |

**Pilota (12):** bistecca, cosciotto, pesce, carota, pomodoro, uovo, latte, formaggio, pasta,
pane, legumi, piselli. Coprono sagome diverse (carne, frutta/verdura, contenitori, pezzi), un
caso di famiglia (legumi) e il caso più a rischio di confusione (legumi vs piselli).

## 3. Regole visive — valori di partenza, li fissa il delta del pilota

- **Tratto, non pieno.** Griglia 24, estremità e giunti arrotondati, dettaglio minimo (sagoma +
  al massimo un segno interno). Coerente con le icone di tratto del sistema.
- **Posizione:** in basso a destra, grande, tagliata dal bordo della tessera per ~20%.
  Indicativo: 52 px sulla tessera normale, 84 px sulla hero (due colonne). Assoluta, sotto il
  testo, non sposta il layout; `pointer-events: none`, `aria-hidden`.
- **Colore:**
  - normale / Dispensa in casa / ingrediente del piatto: tono medio dell'area (colore dell'area
    scurito verso `--ink`, es. `color-mix(in oklab, <area> 60%, var(--ink))`), opacità da tarare;
  - hero: bianco al 35–45%;
  - tessera spuntata / Dispensa "manca": `--off`, più trasparente.
- **Alone sul nome:** contorno sottile del colore effettivo del fondo della tessera
  (`paint-order: stroke` o `text-shadow` multiplo), che buca l'icona solo dove si sovrappone.
  Il colore dell'alone va calcolato sul fondo reale: la tessera Lista normale ha fondo
  trasparente sopra il widget bianco; la Dispensa ha la tinta al 26% sopra il bianco; la hero ha
  il colore pieno. L'alone non deve mai leggersi come un bordo.

## 4. Architettura

- `src/domain/icone-ingredienti.ts`: catalogo `chiave → sinonimi[]` e `trovaIcona(nome):
  ChiaveIcona | null`. Riusa `normalizza()` di `src/domain/import/mapping.ts`. Ordine di
  ricerca: nome intero → sinonimo intero → singolare/plurale → prima parola significativa
  ("petto di pollo" → pollo, "pasta integrale" → pasta). Puro, senza React.
- `src/components/IconaIngrediente.tsx`: tracciati SVG (una mappa `chiave → elementi`) e
  componente `IconaIngrediente({ chiave, area, tono: 'area' | 'hero' | 'spento', taglia })`.
- Le tre tessere chiamano `trovaIcona(nome)` e, se c'è una chiave, rendono l'icona e applicano
  l'alone al nome. Le tessere diventano `position: relative; overflow: hidden` se non lo sono.
- **Niente migrazioni:** il collegamento è sul nome, a runtime. Rinominare un ingrediente cambia
  l'icona di conseguenza.
- **Peso:** i tracciati inline di ~70 icone sono stimati in qualche decina di KB (non misurato).
  Si misura sul build; se pesano troppo si caricano a parte.

## 5. Design system

La regola §6 e §12 di `design/sistema/DESIGN.md` ("nessuna illustrazione", icone 13–18 px) va
aggiornata con un'eccezione dichiarata: **icone ingrediente**, di tratto, decorative, solo sulle
tre tessere, colori e taglie come da delta del pilota. Ponte col codice in
`docs/superpowers/specs/DESIGN-SYSTEM.md`.

## 6. Test

- Unitari su `trovaIcona`: accenti, maiuscole, plurali, nomi composti, sinonimi di famiglia,
  nomi fuori catalogo → `null`, nessuna collisione (un sinonimo appartiene a una sola chiave).
- Foglio di controllo HTML (non in produzione): ogni icona su tessera normale di ogni area,
  Dispensa in casa/manca, hero, spuntata, con un nome corto e uno lungo.
- Verifica nel browser delle tre schermate, in larghezza telefono, con nomi lunghi reali
  ("Passata di pomodoro", "Cioccolato fondente", "Minestrone surgelato").

## 7. Rischi aperti (non testati)

- Leggibilità delle icone a 52 px: la verifica il pilota.
- Tenuta dell'alone sulla tinta della Dispensa e sulla hero.
- Icone che nel foglio di controllo non si capiscono: passano a un'icona di famiglia o escono
  dal catalogo.
