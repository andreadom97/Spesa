# DELTA — 26/09/2026 — icone ingrediente (pilota)

Fonte: Claude Design, progetto `5f1a24e3-0c23-4803-b55b-0e11dad820ba`,
file `Icone ingrediente - pilota.dc.html` (montaggio in `Tessera ingrediente.dc.html`).
Brief: `design/brief-icone-ingredienti.md`. Spec: `docs/superpowers/specs/2026-09-26-icone-ingredienti-design.md`.

```
DELTA — 26/09/2026 — icone ingrediente (pilota)
Deciso: icona di solo tratto su griglia 24 a due spessori (contorno 2, dettagli 1,25), fino a tre segni interni, in basso a destra tagliata al 20%, sotto il nome, nel tono medio dell'area (variante 1c)
Valori: tratto contorno 2 (4,3 px a 52, 7 px a 84) — sagoma e ciò che la fa riconoscere
        tratto dettaglio 1,25 (2,7 px a 52, 4,4 px a 84) — segni interni
        taglia normale 52 px · taglia hero 84 px
        taglio 20%: right/bottom −10 px a 52, −17 px a 84; tessera overflow hidden, position absolute, aria-hidden, pointer-events none
        ingrediente del piatto: icona in basso a destra; matita sale in alto accanto alla X (due bersagli 44×44 in riga, X all'esterno, matita all'interno)
        tono medio (stessa tinta OKLCH, luminosità a 2,8:1 su bianco): ortofrutta #7AA838 · macelleria #D88384 · latticini #759EC8 · cereali #BB9609 · dispensa #D48949 · surgelati #9D91D6
        opacità normale 1 · hero bianco 0,42 · spenta #9A9AA6 a 0,5 (spuntata, finita, mai comprato)
        alone: text-shadow a 8 direzioni senza sfocatura + 1 sfocata, colore opaco del fondo; 2 px (sfocata 3) a 17 px, 3 px (sfocata 4) sulla hero; anche sull'etichetta d'area dell'ingrediente del piatto
        colori alone: Lista normale #FFFFFF · hero = colore area · spuntata #F7F7F8 · Dispensa in casa #E8F5D8 #FCE5E5 #E5F0FC #FCF2D4 #FCE7D7 #EDEAFC (ordine aree) · Dispensa finita/mai comprato #FFFFFF · ingrediente del piatto #FFFFFF
        nome opaco sulle tessere spente: spuntata rgba(20,22,58,0.34) -> #ABACB8 · finita -> #ADAEBA
Regole di DESIGN.md toccate: §6 Icone (eccezione «Icone ingrediente»), §12 Cosa non c'è, §2.3 (colonna tono medio)
Scartate: tutto a spessore unico 2 (dettagli pesanti); 1a tratto 1,2 (sparisce su tinta e hero gialla); 1b tratto 1,5 (esile); tono per miscela sRGB verso --ink (fango); pagnotta a cupola, cosciotto con polpa in basso, pesce a coda larga, pomodoro a calice a due lobi, bistecca a osso tondo e a T; icona del piatto in basso a sinistra o che aggira la matita
Aperto: foro del formaggio (grana/feta non ne hanno); fagiolo copre male ceci e lenticchie; branchia vs occhio nel pesce; brik e penna scelti senza provare alternative; X e matita affiancate da provare contro i tocchi sbagliati; bianco 0,42 al limite su hero gialla e verde; regole per composti e ingredienti senza forma propria (spezie, farine, oli)
```

## Grammatica per le altre 58

- La sagoma sta fra 2 e 22.
- Il tratto che fa riconoscere l'ingrediente sta fuori dalla fascia tagliata (x o y oltre 19,2).
- Sagoma e tratto identificativo a 2, tutto il resto a 1,25.
- Fino a tre segni interni (linee, archi, fori) che dicono cosa è l'oggetto.
- Riflesso ad arco a sinistra sugli oggetti tondi.
- Nessun foro sotto raggio 1,6, salvo l'occhio del pesce (0,9).
- Oggetti allungati in diagonale.
- Famiglie con un solo rappresentante generico.
- I composti prendono l'icona dell'ingrediente base (Passata di pomodoro → pomodoro).

## Le 12 sagome

- **bistecca**: contorno a goccia inclinata, coda stretta in basso a sinistra e testa larga in alto a destra; a 1,25 le due polpe separate dall'osso, midollo ovale nella polpa grande.
- **cosciotto**: polpa tonda in alto a destra che si stringe in un collo, osso corto in diagonale verso il basso a sinistra con due nodi, riflesso ad arco in cima.
- **pesce**: corpo a lente rivolto a destra, coda a V piccola a sinistra, branchia ad arco, pinna dorsale, occhio.
- **carota**: cono in diagonale, punta in basso a sinistra, tre foglie a raggiera, due righe di traverso.
- **pomodoro**: tondo schiacciato aperto in cima, calice a stella a cinque punte, picciolo dritto, riflesso a sinistra.
- **uovo**: uovo nel portauovo, coppa sulla metà bassa, piede corto, riflesso a sinistra.
- **latte**: brik con timpano e linguetta, riga alla base del timpano, goccia sul fronte.
- **formaggio**: spicchio basso a sinistra e alto a destra, crosta arrotondata, riga faccia/fianco, tre fori.
- **pasta**: penna inclinata di 28°, estremità diagonali parallele, due righe per il lungo.
- **pane**: pane a cassetta con la fetta di testa davanti, due crepe sulla cupola.
- **legumi**: fagiolo a rene inclinato, arco dell'ilo sul lato concavo.
- **piselli**: baccello aperto a falce, tre piselli tondi dal bordo, picciolo arricciato.

## Tracciati (viewBox 0 0 24 24; `d` a tratto 2, `dd` a tratto 1,25)

`circ(x,y,r)` = `M{x-r} {y}a{r} {r} 0 1 0 {2r} 0a{r} {r} 0 1 0 {-2r} 0`.

```js
bistecca:  d: 'M2.8 19C1 17 2.4 13 6 9.6 9.6 6.2 13.8 2.8 17.8 2.6c3.4-.2 4.6 3 4.2 7.4-.4 4-2 7-5 7.2-3.4.2-6.6-.6-9.2.6-2 1-4 2.6-5 1.2Z'
           dd: 'M4.8 16.8c-.6-1.8 1.2-4.2 3.6-5.6 1.8-1 3.2-.6 3.4.8.2 1.6-.8 2.6-2.6 3.2-1.8.6-3.4 2.6-4.4 1.6ZM14 6.8c0-1.6 1.8-2.6 3.8-2.4 2.2.2 2.8 2.6 2.6 5.2-.2 2.6-1.2 5.2-2.8 5.2-1.4 0-1.8-2.2-2.2-3.8-.2-.8-.8-1-1.2-1.6-.3-.5-.2-1.4-.2-2.6ZM16.4 7.6a1.3 .9 0 1 0 2.6 0a1.3 .9 0 1 0-2.6 0'
cosciotto: d: 'M10.69 14.07 8.43 16.33A1.7 1.7 0 1 1 5.81 17.39A1.7 1.7 0 1 1 6.87 14.77L9.13 12.51C8.5 10.5 9.15 7.13 10.15 5.4A5.6 5.6 0 1 1 17.8 13.05C16.07 14.05 12.7 14.7 10.69 14.07Z'
           dd: 'M13.4 5.9c1.5-.4 3 .2 3.9 1.4M12.6 11.6l.9-.9'
pesce:     d: 'M21.4 12C19.4 6.6 12 5.2 7.6 10.2L3.2 7.8 4.6 12 3.2 16.2l4.4-2.4C12 18.8 19.4 17.4 21.4 12ZM10.4 8.3l1.6-2.7c1.5 0 2.9.4 3.9 1.2' + circ(18.2, 10.9, 0.9)
           dd: 'M15.2 8.4c1.3 2.1 1.3 5.1 0 7.2M9.6 12.6l1.2-1.2M11.6 13.4l1.2-1.2'
carota:    d: 'M4.6 19.4C7.4 17.8 14.8 12.6 17 10.3A2.4 2.4 0 0 0 13.7 7C11.4 9.2 6.2 16.5 4.6 19.4ZM15.4 8.6 16.4 3.6M15.4 8.6l3.6-3.4M15.4 8.6l5 -1'
           dd: 'M8.6 13.9l1.3 1.3M11.2 11.3l1.3 1.3M13.4 9.3l1 1'
pomodoro:  d: 'M8 6.8A8.8 7.4 0 1 0 16 6.8M12 12 12.8 8.9 16 9.1 13.3 7.4 14.5 4.4 12 6.4 9.5 4.4 10.7 7.4 8 9.1 11.2 8.9ZM12 6.4V2.8'
           dd: 'M6.4 14.2c.2-1.7 1-3 2.2-3.8M7.4 17.2c.5.6 1.1 1 1.8 1.3'
uovo:      d: 'M7 13.6C7 8.2 9.2 3.4 12 3.4s5 4.8 5 10.2M5.6 13.6h12.8c0 3.2-2.8 5.4-6.4 5.4s-6.4-2.2-6.4-5.4ZM12 19v1.8M9 20.8h6'
           dd: 'M9.4 10.4c0-1.4.4-2.8 1.1-3.8M8.6 15.8c.8.9 2 1.4 3.4 1.4'
latte:     d: 'M5.4 20.8V9.4L8 5h8l2.6 4.4v11.4ZM8 5V3h8v2'
           dd: 'M5.4 9.4h13.2M12 12.2c-1.4 1.9-2.1 2.9-2.1 4a2.1 2.1 0 0 0 4.2 0c0-1.1-.7-2.1-2.1-4ZM8 18.4h8'
formaggio: d: 'M3.2 19V13.4L16.4 5.4c2.8.5 4.6 2.6 4.6 5.4V19Z'
           dd: 'M3.2 13.4H21M16.4 5.4c-.6 1.2-.8 2.3-.6 3.4' + circ(8, 16.3, 1.5) + circ(14.6, 16.1, 1.8) + circ(12.6, 10.6, 1.2)
pasta:     rot: 'rotate(-28 12 12)'
           d: 'M6 8H21L17.4 15H2.4Z'
           dd: 'M6.6 9.8H18.8M5.6 11.5H17.9M4.7 13.2H17'
pane:      d: 'M3 19.2V12.4C1.6 11.6 2 7.4 5.6 7.4H9c3.6 0 4 4.2 2.6 5v6.8ZM9 7.4h8.6c3.6 0 4.6 3.8 3 5v6.8h-9'
           dd: 'M5 17.4v-5.8c-.9-.6-.6-2.4 1-2.4h1.8c1.6 0 1.9 1.8 1 2.4v5.8ZM14.8 7.8 14 9.6M18.2 8.2l-.8 1.6'
legumi:    d: 'M8 5C11.4 3.2 16.8 4.2 19 8.4c2.1 4.1.6 9.4-3.4 10.9-2.7 1-4.6-.9-5-3.1-.4-2-2.2-2.3-3.8-3.1C4 11.6 4.8 6.8 8 5Z'
           dd: 'M8.6 11.6c1 .5 1.8 1.3 2.3 2.3M13.4 6.4c2 .3 3.6 1.5 4.3 3.3'
piselli:   d: 'M3 6.6C5.4 14.2 13.6 17.8 20.6 11.8 15.6 12.2 8.2 11.4 3 6.6Z' + circ(7.4, 8.8, 1.8) + circ(12, 10.4, 1.8) + circ(16.4, 11.2, 1.8)
           dd: 'M20.6 11.8c.9-.4 1.5-1.4 1.4-2.6M3 6.6 2.4 4.6M6.4 13.6c2.6 2 6 2.6 9.4 1.6'
```

## Testo per DESIGN.md (dal delta, da applicare in integrazione)

**§6, paragrafo dei due spessori:** «13–18 px dentro le righe e le tessere» → «13–18 px dentro
le righe e le tessere, salvo le icone ingrediente (sotto)».

**§6, dopo il paragrafo delle forme piene:**

> **Icone ingrediente (eccezione dichiarata, 26/09).** Sulle tessere ingrediente (Lista, Dispensa, ingrediente del piatto) un'icona di tratto fa riconoscere l'ingrediente. Griglia 24, due spessori: `2` per la sagoma, `1.25` per i segni interni; estremità e giunti arrotondati, al massimo tre segni interni (linee, archi, fori). **52 px** sulla tessera, **84 px** sulla protagonista, in basso a destra, tagliata dal bordo per il **20%**, sotto il nome e fuori dal layout (`position: absolute`, `aria-hidden`). Colore: tono medio dell'area (§2.3), bianco a 0,42 sulla protagonista, `--off` a 0,5 su spuntata, finita e mai comprato. Il nome passa sopra con un alone di 2 px (3 px sulla protagonista) nel colore opaco del fondo della tessera. Sono le sole icone sopra i 26 px; non si estendono ad altri componenti.

**§6:** «Nessuna illustrazione, nessuna foto, nessun avatar» → «Nessuna illustrazione, nessuna
foto, nessun avatar: le icone ingrediente sono icone, non illustrazioni».

**§12, dopo il paragrafo sulle foto dell'utente:**

> **Le icone ingrediente sono un'eccezione dichiarata** (26/09): sono icone di tratto del sistema (§6), non illustrazioni. Niente pieni, ombre, prospettiva o scene, e nessun uso fuori dalle tessere ingrediente. Le illustrazioni restano fuori.

**§2.3:** colonna del tono medio (i sei hex) come ulteriore uso del colore d'area.
