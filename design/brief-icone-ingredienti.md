# Brief per Claude Design — pilota delle icone ingrediente (26/09/2026)

Incolla il testo sotto il separatore in Claude Design, nel progetto del design system.
Spec di riferimento: `docs/superpowers/specs/2026-09-26-icone-ingredienti-design.md`.

---

## Cosa facciamo

Aggiungiamo un'icona che rappresenta l'ingrediente sulle tessere ingrediente. Serve a
riconoscere l'ingrediente a colpo d'occhio e a riempire lo spazio vuoto della tessera, senza
appesantirla. Il catalogo finale ha 70 icone. **Questa sessione non le disegna tutte:** fissa
lo stile su 12 icone pilota, e le regole che escono di qui servono a disegnare le altre 58
in codice.

La sessione è riuscita se:
- le 12 icone sembrano disegnate dalla stessa mano;
- ciascuna si capisce senza leggere il nome;
- nessun nome si legge peggio di oggi, nemmeno quelli lunghi.

## Eccezione al sistema, da dichiarare

DESIGN.md §6 e §12 oggi dicono «nessuna illustrazione» e prevedono icone di 13–18 px dentro le
tessere. Queste icone sono un'**eccezione dichiarata**. Il delta di fine sessione deve riportare
il testo esatto da aggiungere a §6 e §12. Non modificare DESIGN.md prima del `Deciso:`.

## Le 12 icone pilota

| Icona | Ingredienti che copre | Nota |
|---|---|---|
| bistecca | manzo, macinato, vitello | deve distinguersi dal cosciotto |
| cosciotto | pollo, petto di pollo, tacchino | |
| pesce | salmone, merluzzo, branzino, orata | icona di famiglia: un pesce generico |
| carota | carote | |
| pomodoro | pomodori | |
| uovo | uova | |
| latte | latte | brik o bottiglia, decidi tu |
| formaggio | parmigiano, pecorino, grana, feta | spicchio |
| pasta | pasta, pasta integrale | penna o fusillo, decidi tu |
| pane | pane | pagnotta |
| legumi | ceci, fagioli, lenticchie | icona di famiglia |
| piselli | piselli, edamame | baccello aperto; **non deve confondersi con i legumi** |

## Regole di partenza (confermale o cambiale, poi mettile nel delta)

**Stile**
- Solo tratto, niente pieni, per coerenza con le icone di tratto del sistema.
- Griglia 24×24.
- Estremità e giunti arrotondati.
- Una sagoma più al massimo un segno interno. Niente ombre, niente prospettiva, niente
  dettagli che a 50 px diventano rumore.
- **Da fissare:** lo spessore del tratto sulla griglia 24. Tieni conto che l'icona viene
  mostrata molto più grande delle altre icone del sistema.

**Posizione**
- In basso a destra, grande, tagliata dal bordo della tessera per circa il 20%.
- Sta sotto il testo e non sposta il layout.
- Taglie indicative: circa 52 px sulla tessera normale, circa 84 px sulla hero.

**Colore**

| Tessera | Fondo | Icona |
|---|---|---|
| Lista normale | trasparente sopra il widget bianco, filo nel colore d'area al 45% | tono medio dell'area (colore dell'area scurito verso `--ink` #14163A) |
| Lista **hero** (protagonista, due colonne) | colore dell'area pieno | **bianco** al 35–45% |
| Lista spuntata | `rgba(20,22,58,0.035)`, nome barrato | spenta, verso `--off` #9A9AA6, più trasparente |
| Dispensa in casa | colore dell'area al 26% | tono medio dell'area |
| Dispensa finita o mai comprato | nessun fondo, tratteggio 2 px | spenta |
| Ingrediente del piatto | bianco, filo d'area al 45% | tono medio dell'area |

Colori delle aree: ortofrutta #A8D96A, macelleria #F29B9B, latticini #9CC7F2,
cereali #F5CE5B, dispensa #F2A465, surgelati #B9AEF5. Il tono medio va provato su tutte e sei:
il giallo dei cereali e il verde dell'ortofrutta sono i casi più difficili.

**Leggibilità**
- Il nome (17 px bold, 25 px sulla hero, colore `--ink`) passa sopra l'icona.
- Il nome ha un **alone** sottile del colore effettivo del fondo della tessera, che copre
  l'icona solo dove testo e icona si sovrappongono.
- L'alone non deve mai leggersi come un contorno del testo.
- **Da fissare:** lo spessore dell'alone e come calcolarlo sulla tinta al 26% della Dispensa e
  sul colore pieno della hero.

## Tessere su cui provarle (le misure vengono dal codice)

1. **Lista** (`cards/tessere-lista.html`, `Lista.dc.html`)
   - Tessera: min-height 104, padding 12/14/13, raggio 14, griglia a due colonne.
   - Hero: occupa due colonne, padding 13/16/14, raggio 18.
   - Contenuto: pillola delle confezioni in alto, nome sotto.
2. **Dispensa**
   - Tessera: min-height 104, padding 12/14/13, raggio 14.
   - Contenuto: pillola della quantità in alto, nome in basso, a volte una pillola di scadenza
     sotto il nome.
3. **Ingrediente del piatto**
   - Tessera: bianca, min-height 108, padding 13/14/12, raggio 15.
   - Quantità modificabile in alto.
   - Etichetta dell'area in mono 8 px in basso.
   - **La X sta in alto a destra e la matita in basso a destra**, ciascuna con un'area di tocco
     di 44×44. **L'icona non può stare sotto la matita.** Decidi tu: un altro angolo, la matita
     che si sposta, o l'icona che la aggira.

Nomi da provare, in questo ordine:
- corti: Uova, Pane, Latte;
- medi: Petto di pollo, Pomodori;
- lunghi: **Passata di pomodoro**, **Cioccolato fondente**, **Macinato di manzo**,
  **Filetto di merluzzo**.

Sui nomi lunghi che vanno a capo il testo si sovrappone di più all'icona: è lì che si vede se
la leggibilità regge.

## Cosa consegnare

1. **Un foglio con le 12 icone** su griglia, a 24 px e a 52 px, in tono medio sulle sei aree e
   in bianco sui sei colori pieni.
2. **Un foglio di tessere** con tutte le combinazioni: Lista normale, hero e spuntata; Dispensa
   in casa e finita; ingrediente del piatto. Ognuna con un nome corto e uno lungo.
3. Se esplori più stili (per esempio tratto sottile o tratto spesso), **al massimo tre
   varianti**. Poi scegline una.
4. **Il delta**, compilato così:

```
DELTA — 26/09/2026 — icone ingrediente (pilota)
Deciso: <lo stile scelto, una riga>
Valori: tratto <valore su griglia 24> · taglia normale <px> · taglia hero <px> · taglio sul bordo <%> · posizione ingrediente del piatto <angolo/soluzione> · tono medio <formula o hex per area> · opacità normale <valore> · opacità hero <valore> · opacità spenta <valore> · alone <spessore e colore per tessera>
Regole di DESIGN.md toccate: §6 Icone, §12 Cosa non c'è — <testo esatto dell'eccezione>
Scartate: <varianti viste e buttate, col motivo in mezza riga>
Aperto: <icone del pilota che non convincono, dubbi sul catalogo>
```

Aggiungi al delta una riga per ciascuna delle 12 icone, con la descrizione della sagoma
(es. «bistecca: contorno a goccia irregolare con osso a T, un segno interno»). Serve a chi
disegna le altre 58 per restare nella stessa grammatica.
