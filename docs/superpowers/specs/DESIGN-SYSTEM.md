# Spesa — design system v2 (approvato da Andrea il 17/09/2026)

**Obiettivo del documento:** una sola fonte di verità per chi disegna e per chi scrive
codice (quasi sempre un modello), così che ogni schermata nuova esca coerente senza
ritocchi. La v1 (26/08) fissava i token dalle schermate in `design/`; questa v2 aggiunge
principi, componenti, pattern e **la misura di quanto il codice oggi diverge**, perché un
sistema è a prova di bomba solo se dice anche dove viene violato.

**Come leggerlo.** Tre etichette:
- **[regola]** vale, chi la infrange sbaglia.
- **[deciso 17/09]** una scelta che era aperta e che Andrea ha chiuso il 17/09/2026 sulla
  pagina visiva delle otto domande (artifact "Scelte design system"); dove ha scelto
  diversamente dalla proposta è scritto.
- **[deriva]** il codice fa diversamente dalla regola, con il conteggio misurato il 16/09
  su `src/` (grep, non stime). Nessuna deriva è stata corretta nel codice: si corregge un
  file quando lo si tocca per altri motivi.

Fonte dei valori: `src/app/globals.css` (token), i componenti in `src/components/`, le
pagine in `src/app/(app)/`, gli artboard `design/*.dc.html`. Dove un valore qui diverge da
`globals.css`, vale `globals.css` finché questo documento non è approvato; poi vale questo.

---

## 1. Principi

1. **Default automatico, correzione facile.** L'utente non inserisce mai lo stato del
   sistema: il sistema propone, l'utente corregge. Ogni schermata nasce con un default
   sensato e un gesto di correzione a portata di pollice. [regola, dalla spec del 26/08]
2. **Zero decisioni in corsia.** La Lista si usa con una mano, di fretta, spesso senza
   rete. Tutto ciò che vive in Lista è leggibile a un metro e toccabile alla cieca: nessun
   testo sotto i 12 px come informazione primaria, nessun bersaglio sotto 44 px. [regola]
3. **Lo stato è una luce, non una casella.** Acceso = da fare / a casa; spento = fatto /
   fuori. Niente checkbox, niente switch verdi. Il colore dell'area è l'unico colore
   "vivo" della UI; l'inchiostro blu-notte fa tutto il resto. [regola]
4. **Numeri onesti.** Ogni numero mostrato deriva da un dato dell'utente o da un calcolo
   dichiarato. Niente stime spacciate per misure: grammi e confezioni sempre, euro solo
   quando l'utente ha dato un prezzo (decisione del 16/09). Quantità esatte ("1250 g",
   non "1,3 kg"). [regola]
5. **Calma.** Fondo carta, superfici bianche, un solo inchiostro, sei pastelli. Nessun
   gradiente, nessuna ombra colorata, nessuna emoji, nessuna animazione decorativa.
   L'app di un nutrizionista, non di un influencer. [regola]
6. **Italiano, del tu, imperativo, senza esclamativi.** Le etichette di servizio in
   maiuscolo mono; il resto in frasi. Un'app "che dice cosa fa": i copy spiegano la
   causa, non l'effetto ("Calcolato da spesa e piano: correggi solo se non torna").
   [regola]

---

## 2. Token

### 2.1 Colori neutri

| Token | Valore | Ruolo | Contrasto |
|---|---|---|---|
| `--fondo` | `#F1F0EE` | fondo pagina, tema PWA | — |
| `--superficie` | `#FFFFFF` | schede, tessere accese, campi | — |
| `--ink` | `#14163A` | testo primario, tasti pieni, stati attivi, bordo "oggi" | 15,3:1 su fondo, 17,4:1 su bianco |
| `--ink-2` | `#3D4166` | hover dei link (5 usi) | — |
| `--sec` | `#8A8A96` | testo secondario, etichette mono, note | **3,0:1 su fondo, 3,4:1 su bianco** |
| `--ter` | `#A6A6B2` | metadati, unità | **2,4:1 su bianco** |
| `--off` | `#9A9AA6` | icone di navigazione inattive | 2,4:1 su fondo |
| `--bordo` | `rgba(20,22,58,0.07)` | bordi delle schede | — |
| `--spento` | `rgba(20,22,58,0.035)` | tessere prese, celle fuori casa | — |

[misurato ora: rapporti WCAG calcolati sui valori esatti]

**[deciso 17/09] Il grigio secondario non passa la soglia AA (4,5:1) e lo usiamo a
9–12,5 px per etichette e note. Scelta (c): nuovo token `--testo-2 = #5C5F7A`** (5,5:1
su fondo carta, [misurato il 17/09]) per ogni testo che porta informazione: note,
sottotitoli, righe di stato. `--sec` resta com'è per la decorazione (etichette mono,
contatori, unità). Scartate: (a) alzare le taglie minime tenendo i colori; (b) scurire
`--sec` a `#6E6E7C`, che ricalcolato fa 4,4:1 e non 4,6:1 come stimato il 16/09, quindi
non avrebbe nemmeno passato la soglia. Da aggiungere a `globals.css` alla prima modifica
utile: `--testo-2: #5C5F7A;`.

### 2.2 Colori delle sei aree

Fisse, non personalizzabili; personalizzabile solo l'ordine di apparizione in Lista.
Definite in `src/domain/aree.ts` e duplicate come `--area-*` in `globals.css`.

| # | Area | Token | Hex | Ink sopra |
|---|---|---|---|---|
| 1 | Ortofrutta | `--area-ortofrutta` | `#A8D96A` | 10,6:1 |
| 2 | Macelleria e pescheria | `--area-macelleria` | `#F29B9B` | 8,2:1 |
| 3 | Latticini, uova e salumi | `--area-latticini` | `#9CC7F2` | 9,8:1 |
| 4 | Pasta, riso e cereali | `--area-cereali` | `#F5CE5B` | 11,5:1 |
| 5 | Dispensa e conserve | `--area-dispensa` | `#F2A465` | 8,5:1 |
| 6 | Surgelati | `--area-surgelati` | `#B9AEF5` | 8,7:1 |

[regola] Il colore d'area si usa in quattro modi soli: bordo della tessera accesa,
quadratino 10 px accanto all'etichetta di sezione, tinta al 26% dietro la riga di
controllo, casella del marchio. Mai come colore di testo, mai come fondo di un tasto.

### 2.3 Colori semantici — esistono nel codice, non nei token

| Uso nel codice | Hex | Dove | Contrasto su bianco |
|---|---|---|---|
| Avviso (riga non risolta o inferita nella revisione import) | `#C77700` | `importa/Revisione.tsx` ×3 | 3,5:1 |
| Errore di validazione | `#D9534F` | `TesseraIngrediente.tsx` | 4,0:1 |
| Congelato | `#4A90D9` | `dispensa/page.tsx` ×2 | 3,3:1 |
| Grigio "decorativo" (kebab, chevron, X, icone spente, testo fuori casa) | `#C4C4CE` / `#BFBFC9` / `#B6B6C0` | 11 + 2 + 1 usi | 1,7:1 |

[deriva] Nessuno di questi è un token: sono letterali ripetuti. **[deciso 17/09]**
quattro token nuovi, con i tre semantici scuriti fino a passare la soglia [misurati il
17/09 su bianco]: `--avviso: #9A5C00` (5,4:1), `--errore: #C4423E` (5,0:1), `--freddo:
#2F6FBF` (5,1:1), `--icona-spenta: #C4C4CE` (invariato: è decorazione, non porta
informazione). I letterali si sostituiscono file per file quando li si tocca.

### 2.4 Tipografia

**Famiglie** [regola]: Plus Jakarta Sans (400/500/600/700/800) per testo e titoli;
JetBrains Mono (400/500/700) per etichette di servizio, quantità, contatori, tasti.
Caricate da Google Fonts in `globals.css`; fallback dichiarati.

**Scala misurata nel codice** [deriva]: 22 taglie diverse tra 8 e 52 px
(8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 17, 21,
22, 32, 52), con 12 valori di letter-spacing. Le più usate: 10 (45), 12,5 (39), 13 (33),
12 (25), 14 (22), 11 (22), 16 (21).

**[deciso 17/09] Scala a 9 livelli, che assorbe le 22 taglie:**

| Livello | Taglia / peso / spaziatura | Font | Usi che assorbe |
|---|---|---|---|
| Titolo di schermata | 52 / 800 / -0.05em / lh 1 | Sans | Testata |
| Titolo di dettaglio | 32 / 800 / -0.045em | Sans | Piatto, Ingrediente |
| Titolo di scheda o stato vuoto | 21 / 800 / -0.035em / lh 1.2 | Sans | stati vuoti, "Hai preso tutto" (assorbe 22) |
| Nome di voce | 17 / 700 / -0.03em | Sans | tessere, righe pasto (assorbe 16, 15.5, 15) |
| Corpo | 14 / 400–500 / lh 1.5 | Sans | testi esplicativi (assorbe 14.5, 13.5, 13) |
| Nota | 12.5 / 400 / lh 1.4 | Sans | note, errori sotto i campi (assorbe 12, 11.5) |
| Tasto e pillola | 12 / 700 / 0.09em / MAIUSCOLO | Mono | tasti 54 px, pillole (assorbe 11, 10.5) |
| Etichetta di sezione | 10 / 700 / 0.16em / MAIUSCOLO | Mono | intestazioni di gruppo (assorbe 9.5, 9, 0.11–0.14em) |
| Micro | 8.5 / 500–700 / 0.12em / MAIUSCOLO | Mono | tab bar, unità dentro le tessere (assorbe 8) |

Regola d'uso: il mono è sempre maiuscolo e mai sotto 8,5 px; il sans non è mai maiuscolo
e mai sotto 12,5 px. I titoli di schermata sono una parola sola (LISTA, SETTIMANA,
PIATTI, DISPENSA, IMPOSTAZIONI): a 52 px una seconda parola va a capo.

### 2.5 Spaziatura

[misurato] Bordo pagina 16 px (testata 18), interno schede 13–15 px, gap tra tessere
8 px, gap tra sezioni 12 px, respiro sopra la tab bar 20–22 px.

**[deciso 17/09] Scala a base 4:** `4 · 8 · 12 · 16 · 20 · 26`. Regole: pagina 16,
testata 20/18/12 (alto/lati/basso), scheda 16 dentro, griglia di tessere gap 8 con 12 ai
lati, tra un gruppo e l'altro 12, ultimo elemento 22 dal fondo. I valori 13, 14, 15
misurati diventano 12 o 16.

### 2.6 Raggi

[misurato] 15 valori diversi (2, 3, 4, 8, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 999). I
più usati: 18 (55), 14 (37), 999 (30).

**[regola, da v1 confermata]** cinque raggi soli:

| Raggio | Cosa |
|---|---|
| 999 | pillole, tasti SÌ/NO, pillola settimana |
| 22 | schede grandi, fogli dal basso (`22px 22px 0 0`), stato vuoto |
| 18 | tasti da 54 px, schede medie, riga di controllo |
| 14 | tessere, campi di testo, segmenti a blocco, voce attiva della tab bar |
| 4 | quadratino d'area (10 px), caselle del marchio (`lato × 0.28`) |

I valori 8, 10, 11, 12, 13, 15, 16, 20 vanno riportati al più vicino della scala.

### 2.7 Bordi e ombre

| Spessore | Uso |
|---|---|
| 1 px `--bordo` | schede, campi, tasto secondario |
| 1,5 px | stato selezionato, avviso sulla riga di revisione |
| 2 px | caselle del marchio, tratteggiato degli "aggiungi" e degli stati vuoti (`rgba(20,22,58,0.20)`) |
| 3 px `--ink` | il giorno corrente nella striscia |

Ombre, tre e basta [misurato: sono le tre che esistono]:
`0 1px 2px rgba(20,22,58,0.05)` tessera accesa · `0 1px 3px rgba(20,22,58,0.28)` casetta
piena · `0 3px 10px rgba(20,22,58,0.24)` tasto primario. Nient'altro ha ombra.

### 2.8 Icone

[regola] SVG inline, `viewBox 0 0 24 24`, solo tratto, `strokeLinecap round`, colore da
token (`var(--ink)` attivo, `var(--off)` inattivo), `aria-hidden` se accanto a un testo,
`aria-label` sul contenitore se sole. Taglie: 21 px in tab bar, 20–24 px in testata,
14–16 px dentro le tessere. Mai emoji (Mise le usa ovunque: è il contrario del nostro tono).

[deriva] Spessori di tratto misurati: 1.3, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 3.2.
**[deciso 17/09]** due spessori soli: **1.8** per navigazione e testata, **2.1** per
icone d'azione piccole (X, +, chevron). Il 3.2 (probabile spunta) e l'1.3 (contorno casa
fuori) restano da verificare uno per uno quando si tocca il file: o diventano 1.8/2.1 o
si dichiarano qui come eccezione.

### 2.9 Movimento

[regola, da spec review UI §F] Solo CSS, 150–250 ms, easing standard, **tutte dentro
`@media (prefers-reduced-motion: no-preference)`**, solo causa-effetto. Le quattro classi
esistenti in `globals.css`: `.anim-stato` (transizione di colore 180 ms), `.anim-foglio`
(foglio che sale 200 ms), `.anim-apparsa` (fade 180 ms), `.anim-giorno` (fade 160 ms).
Vietato: ingresso pagina, parallax, cascate, qualunque animazione che ritardi un'azione.

---

## 3. Componenti

Per ogni componente: anatomia, misure, stati, dove vive. Le misure sono quelle del codice
il 16/09.

### Testata (`Testata.tsx`)
Marchio 3×2 (link a `/lista`) + titolo 52/800 a sinistra; ingranaggio 24 px con
`aria-label="Impostazioni"` a destra (area 44×44); sotto, facoltativa, la **pillola
settimana**: 34 px, raggio 999, fondo ink, mono 10.5/700/0.13em bianco, testo
informativo non interattivo. Modalità `indietro`: freccia 20 px al posto del marchio,
niente ingranaggio (pagine figlie). Padding `20px 18px 12px`.

### Marchio (`Marchio.tsx`)
Griglia 3×2, lato 16 px, gap 4, ordine fisso (arancio, azzurro, verde / lilla, giallo,
corallo). Ogni casella sempre nel colore della sua area: piena = in quell'area non manca
niente, contornata 2 px = manca qualcosa. Mai grigia. Solo la Lista passa `aree`.

### Tab bar (`TabBar.tsx`)
Quattro voci fisse (LISTA, SETTIMANA, PIATTI, DISPENSA), icona 21 px + micro mono 8.5;
attiva: ink, peso 700, fondo `rgba(20,22,58,0.06)` raggio 14; inattiva: `--off`, peso 500.
Padding `10px 16px 20px`. Su Impostazioni e Importa nessuna voce attiva, di proposito.

### Tasti (`piatti/veloce/page.tsx` definisce le tre basi, riusate a mano altrove)
Altezza **54**, raggio **18**, mono 12/700/0.09em maiuscolo, larghezza piena o `flex:1`
in coppia.
- **Primario**: fondo ink, testo bianco, ombra `0 3px 10px rgba(20,22,58,0.24)`. Uno per
  schermata, in fondo.
- **Secondario**: bianco, testo ink, bordo 1 px `--bordo`, nessuna ombra. Deve sembrare un
  tasto: nella prova del 15/09 HO FINITO in grigio chiaro sembrava disabilitato.
- **Spento**: `rgba(20,22,58,0.10)`, testo `--ter`, bordo trasparente, `disabled` nativo.
- **Distruttivo** [deciso 17/09, diverso dalla proposta]: **primario pieno in `--errore`**
  (`#C4423E`, testo bianco, stesse misure 54/18, stessa ombra del primario), usato solo
  dentro un dialogo di conferma a due tasti accanto ad ANNULLA secondario; mai come
  tasto libero in pagina. Andrea ha scelto la versione piena perché l'azione deve
  vedersi per quello che è.

[deriva] Le tre basi sono ridefinite in ogni pagina che le usa (piatti, settimana,
scegli, ingrediente): stessa misura copiata otto volte. Vedi §6.

### Pillole d'azione (`RigaControllo.tsx`, `Segmento.tsx` variante pillola)
Visibile 38 px (o 44 nei SÌ/NO), raggio 999, mono 11/700/0.08em, `padding 0 15px`;
**area di tap sempre 44 px** anche quando il disegno è 38 (il bottone è trasparente e più
alto della pillola). Attiva: fondo ink testo bianco; inattiva: bianco con bordo
`rgba(20,22,58,0.09)`.

### Segmento a blocco (`Segmento.tsx` variante blocco)
Rettangoli `flex:1`, alti 46, raggio 14, gap 7, mono 11/700/0.08em; stessi colori delle
pillole. Un attivo alla volta, `aria-pressed`. Disabilitato: `disabled` + opacità 0,5
sull'intera fila.

### Tessera della Lista (`Tessera.tsx`)
Griglia a due colonne, gap 8; **la prima voce di ogni area è "protagonista"**: due
colonne, fondo pieno, nome a 25 px. Pillola delle confezioni in cima, poi nome 17/700,
poi eventuale dettaglio "serve X · in casa Y" in mono. **Accesa** (da prendere): bianco,
bordo 1 px nel colore dell'area, ombra minima. **Spenta** (presa): fondo `--spento`,
bordo trasparente, nome barrato a `rgba(20,22,58,0.34)`. Il tap sulla tessera intera è
l'interruttore: è l'unica eccezione dichiarata alla regola "tap = apre".

### Riga di controllo (`RigaControllo.tsx`)
"Olio: ne hai ancora?" sotto le tessere della sua area. Fondo colore d'area al 26%,
raggio 18, `padding 14px 15px`, margine `0 12px 12px`; nome 16/700 + due pillole SÌ/NO
bianche 44 px.

### Riga pasto (`RigaPasto.tsx`)
Tre zone: **casetta 60 px** a sinistra = toggle casa/fuori con `aria-pressed` (casa piena
ink e ombra 0 1px 3px a casa; contorno 1,3 px grigio fuori); **corpo** = apre il piatto,
`aria-label="Apri {piatto}"`; **destra 44 px** = kebab (tre punti `#C4C4CE`) o chevron
verso Scegli. Fuori casa il testo scende a `#B6B6C0`/`#C4C4CE`.

### Striscia dei giorni (`StrisciaGiorni.tsx`)
Sette riquadri, `aria-pressed`, `aria-label` "Venerdì 28" / "…, selezionato". Il giorno
corrente ha il **bordo 3 px ink dentro il riquadro**, non un contorno esterno.

### Foglio dal basso (`FoglioAzioniPasto.tsx`)
`role="dialog"` con `aria-label` che dice il contesto, overlay `rgba(20,22,58,0.35)`,
foglio bianco `borderRadius 22px 22px 0 0`, `padding 16px 16px 26px`, voci alte 44 con
fondo `rgba(20,22,58,0.04)` raggio 15 (→ 14 con la scala), separatori mono. Classe
`.anim-foglio`.

### Scheda
Bianco, raggio 22, bordo 1 px `--bordo`, `padding 26px 20px` se stato vuoto, 16 se
contenuto. Nessuna ombra.

### Stato vuoto
Scheda 22 centrata verticalmente; quadrato 46 px raggio 14 con bordo 2 px tratteggiato e
un'icona spenta dentro; titolo 21/800; testo 14 `--sec` lh 1.5; sotto, un tasto primario
che porta alla prossima azione (Lista e Settimana vuote rimandano a Piatti).

### Campo di testo
Altezza 44, raggio 14, `padding 0 14px`, bianco, bordo 1 px `--bordo` (o
`rgba(20,22,58,0.12–0.16)` nei campi numerici: [deriva], da unificare a `--bordo`).
Etichetta sopra in mono 10/700/0.16em. Campo numerico: largo 68–96, allineato a destra.
Textarea: raggio 13 → 14, `resize: none`, cresce con il contenuto.

### Etichetta di sezione
Mono 10/700/0.16em maiuscola, `--ink` se titola un gruppo, `--sec` se è un contatore a
destra ("N VOCI", peso 500, 0.10em); quadratino 10×10 raggio 4 nel colore dell'area
davanti alle sezioni della Lista.

### Messaggi
- **Errore di caricamento o di scrittura** [deciso 17/09]: `<p>` 12.5 in **`--errore`**,
  margine `0 4px`, testo del server mostrato così com'è quando è scritto per l'utente
  (429 dell'import, 400 del PDF). Oggi è in `--sec` e ha lo stesso colore di una nota:
  con la scelta di Andrea un errore si distingue da una nota (`--testo-2`) e da una
  riga di stato. Il 16/09 il documento si contraddiceva su questo punto (§2.1 diceva
  `--testo-2`): risolto.
- **Avviso in linea** (Revisione import): 11.5 in `#C77700` con `aria-live="polite"`.
- **Riga di stato** (offline, "Sei offline: la lista è quella dell'ultima apertura"):
  corpo 12.5 `--sec` sopra la lista, mai un toast.
- Niente toast, niente snackbar, niente banner colorati: lo stato si legge dove sta il
  dato.

---

## 4. Pattern

**Gesti** [regola, review UI 31/08]: tap sulla card = apre; cambiare stato ha sempre un
controllo suo (casetta, pillola); eccezione dichiarata: la tessera della Lista è essa
stessa l'interruttore. Nessuno swipe, nessun long-press: non si scoprono e non si
annunciano.

**Conferme** [regola]: ogni azione distruttiva o non reversibile (elimina piatto, riparti
dalla settimana 1, rigenera la lista) passa da un dialogo con due tasti, la distruttiva
evidenziata, mai un solo tap. Le azioni reversibili (spunta, toggle casa) non chiedono
niente e si annullano rifacendo il gesto.

**Feedback di scrittura** [regola]: un'azione che scrive mostra lo stato sul controllo
stesso (opacità 0,5 e `disabled` mentre è in volo), e la conferma è il cambio di stato
del dato, non un messaggio ("Formato confermato" compare solo dopo la scrittura riuscita,
con RIPROVA in caso di errore).

**Caricamento** [deciso 17/09]: nessuno spinner, nessuno scheletro. Al posto del
contenuto una sola riga mono "CARICO…" in `--sec`, sotto la testata che è già disegnata.
Il cancello `PrimoAvvio` resta com'è per il primo accesso.

**Stati vuoti** [regola]: ogni lista vuota dice perché è vuota e qual è la prossima
azione, con un tasto primario. Mai una pagina bianca.

**Offline** [regola]: la Lista si legge sempre dall'istantanea; una riga di stato lo
dice; le spunte si accodano e non si perdono. Le altre pagine possono fallire, la Lista no.

**Copy** [regola]:
- Etichette e tasti in maiuscolo mono, verbo all'imperativo o sostantivo secco: CONFERMA
  E CREA LA LISTA, ESTRAI LA DIETA, HO FINITO, SCANSIONA.
- Frasi in sans, del tu, senza esclamativi, senza "per favore". Il copy spiega la causa
  ("Calcolato da spesa e piano: correggi solo se non torna con la realtà").
- Numeri esatti con unità: "1250 g", "2 confezioni", "3 pasti a casa". Plurali corretti
  (1 VOCE / 2 VOCI). Date in italiano ("il prossimo dal 12/09/2026").
- Nessun claim di salute, nessun "risparmia", nessun numero in euro senza prezzo
  dell'utente. Il risparmio si chiama "non hai ricomprato".
- Un errore dice cosa fare, non cosa è successo: "il PDF non si apre: prova con le foto".

**Accessibilità** [regola]: ogni controllo ha un nome (`aria-label` se non ha testo);
`aria-pressed` su ogni toggle e segmento; `role="dialog"` con nome sui fogli; bersagli
≥ 44 px anche quando il disegno è più piccolo; `lang="it"`; contrasto ≥ 4,5:1 su ogni
testo che porta informazione: `--testo-2` per note e sottotitoli, `--errore` per gli
errori, `--ink` per tutto il resto; `--sec` e `--ter` solo su testo decorativo (§2.1).

**Dark mode**: fuori scope, come deciso il 31/08. I token esistono, il tema scuro no.

---

## 5. Cosa non c'è, di proposito

Gradienti, glassmorphism, ombre colorate, emoji, illustrazioni, foto, avatar, toast,
onboarding a quiz, paywall, badge "novità", contatori animati, conferme a un tap per
azioni distruttive, swipe nascosti, dark mode (per ora), caratteri sotto 8,5 px.

---

## 6. Deviazioni misurate nel codice (16/09/2026)

| Cosa | Misura | Regola violata | Rimedio proposto |
|---|---|---|---|
| Stile inline ovunque: `style={{}}` in ogni pagina (81 in Piatto, 78 in Impostazioni), Tailwind usato solo per `font-mono` (171), `.sc` e `.anim-*` | grep su `src/` | nessuna, è la scelta del progetto | [deciso 17/09] si tiene così com'è, **senza** un modulo di basi condivise: questo documento è l'unica guardia, e le otto copie dei tasti restano finché non si tocca il file |
| `#FFFFFF` letterale | 84 usi contro 39 `var(--superficie)` | token | sostituire |
| `#14163A` e `#8A8A96` letterali | 20 e 17 usi (a fronte di 195 e 149 con `var()`) | token | sostituire; `Tessera`, `RigaControllo`, `RigaPasto` ridefiniscono `INK`/`MUT` come costanti locali |
| Grigi decorativi `#C4C4CE` `#BFBFC9` `#B6B6C0` | 14 usi, nessun token | §2.3 | un token `--icona-spenta` |
| Avviso/errore/congelato senza token | 3 + 1 + 2 usi | §2.3 | tre token, scuriti a 4,5:1 — i token esistono in globals.css dal 20/09 (guscio comune); i letterali nei file restano finché non si toccano |
| 22 taglie di carattere, 12 spaziature | grep `fontSize`/`letterSpacing` | §2.4 | scala a 9 livelli |
| 15 raggi | grep `borderRadius` | §2.6 | scala a 5 |
| 8 spessori di tratto SVG | grep `strokeWidth` | §2.8 | 1.8 e 2.1 |
| Bordo dei campi numerici `0.12`–`0.16` invece di `--bordo` | 2 file | §3 Campo | `--bordo` |
| Le tre basi dei tasti copiate in 8 punti | grep ombra primario | §3 Tasti | [deciso 17/09] restano copiate; si allineano a mano a questo documento quando si tocca il file |
| `rgba(hex, alpha)` ridefinita in tre componenti | commento nel codice: "per scelta del progetto" | — | lasciare, o una funzione in `src/ui/colore.ts` |
| Testo secondario sotto AA | 3,0:1 su fondo | §4 Accessibilità | `--testo-2` sui testi che informano (§2.1) |

Nessuna di queste è un bug visibile: sono il costo di due settimane di sviluppo a
velocità. Il documento serve a fermare la crescita del debito, non a imporre un
refactor: **si corregge un file quando lo si tocca per altri motivi**, e ogni componente
nuovo nasce già sulla scala.

---

## 7. Come si applica, per chi scrive codice

1. Prima di disegnare una schermata nuova: leggere §1, §3 e §4; se serve un componente
   che non c'è, aggiungerlo qui prima che nel codice.
2. Colori solo via `var(--…)`. Un hex letterale nel `tsx` è un errore di review.
3. Taglie, raggi e spaziature solo dalla scala. Un valore fuori scala va motivato in un
   commento o riportato alla scala.
4. Ogni controllo nasce con nome accessibile, `aria-pressed` se è un toggle, 44 px di tap.
5. Ogni numero mostrato ha una provenienza nel dato; gli euro solo da un prezzo
   dell'utente.
6. Ogni testo nuovo passa dal §4 Copy: maiuscolo mono per etichette e tasti, frasi
   altrove, niente esclamativi, niente claim.
7. Ogni animazione nuova va in `globals.css`, dentro il media di reduced-motion, e va
   aggiunta a §2.9.

---

## 8. Decisioni del 17/09/2026

Prese da Andrea sulla pagina visiva delle otto domande (ogni alternativa era resa, non
descritta). Lette dal database della pagina il 17/09 alle 19:26.

| # | Domanda | Scelta | Rispetto alla proposta |
|---|---|---|---|
| 1 | Contrasto del testo secondario | (c) nuovo token `--testo-2 = #5C5F7A` | come proposto |
| 2 | Colori semantici | quattro token, i tre semantici scuriti a ≥ 4,5:1 | come proposto |
| 3 | Scala tipografica | 9 livelli | come proposto |
| 4 | Spaziatura, raggi, tratto | scala 4·8·12·16·20·26, cinque raggi, tratti 1.8 e 2.1 | come proposto |
| 5 | Tasto distruttivo | **primario pieno in `--errore`**, solo dentro il dialogo | diverso dalla proposta |
| 6 | Caricamento | riga mono "CARICO…" | come proposto |
| 7 | Messaggi di errore | **in `--errore`** | il documento non aveva una proposta unica |
| 8 | Basi condivise | **lasciare com'è**, nessun modulo `stili.ts` | diverso dalla proposta |

Token da aggiungere a `globals.css` alla prima modifica utile (non ancora nel codice):

```css
--testo-2: #5C5F7A;
--avviso: #9A5C00;
--errore: #C4423E;
--freddo: #2F6FBF;
--icona-spenta: #C4C4CE;
```

---

## 9. Redesign del 19–20/09: cosa cambia

**La fonte di verità per il design non è più questo file: è `design/sistema/DESIGN.md` v3
(20/09/2026).** Questo documento resta il **registro delle derive del codice** — §6 con i
conteggi misurati su `src/` e §7 con le regole per chi scrive codice — e va letto insieme a
`DESIGN.md` v3, non al posto suo. Dove i due divergono, per il **disegno** vale `DESIGN.md` v3;
per **quanto il codice si scosta**, vale §6 qui. La cronaca delle decisioni sta in
`design/sistema/CLAUDE.md`, l'analisi che le ha prodotte in `design/ridisegno/ANALISI.md`.

Le dieci regole cambiate, in una riga ciascuna:

1. **Gradiente** — il fondo della schermata è `linear-gradient(180deg,#EDECEA,#F2F1EF 34%,#F8F8F7 70%,#FCFCFB)`: cade il «Nessun gradiente» di §1 principio 5 e la prima voce di §5, e l'unica eccezione è l'anteprima della fotocamera (nessun gradiente resta ammesso **sugli oggetti**).
2. **Ombre** — da tre a **sei**: restano le tre di §2.7 e si aggiungono `--ombra-pannello`, `--ombra-nav` e `--ombra-alta`, a due strati, sulle superfici flottanti; cade «Nient'altro ha ombra».
3. **Tab bar** — pillola **flottante** `left/right 16` `bottom 22` alta **84**, raggio 999, icone **26 piene**, voce attiva a 0,07, e un **secondo stato** a 66 con i lati a 46 e le etichette nascoste ma cliccabili: cadono i 21 px, il raggio 14 e il `padding 10 16 20` nel flusso di §3.
4. **Nomi della barra** — `SETTIMANA` diventa **Piano**, l'ordine è **Lista · Piano · Piatti · Dispensa**, e l'**icona della Lista è il Marchio** (3 × 2, lato 9, raggio 2,52): il Marchio esce dalla Testata e con lui il link `Vai alla lista`.
5. **Menù utente** — l'ingranaggio 24 px di §3 Testata è sostituito da una pillola 81 × 50 col tondo 38 e l'iniziale in mono 16, che apre il pannello delle impostazioni.
6. **Piano** — la schermata Settimana si chiama Piano, guadagna la pillola settimana e l'etichetta del giorno scelto, e la cella della striscia ha un **quarto stato** («oggi e selezionato»). **[chiuso, fase 2]**
7. **Sentence case** — i titoli di schermata sono `Lista`, `Piano`, `Piatti`, `Dispensa`, `Impostazioni`: chiude la divergenza n. 1 di «Non determinato dal codice» contro il maiuscolo di §2.4 (il codice oggi passa `Spesa`).
8. **Dock** — il tasto primario non sta più in coda al contenuto ma in un componente condiviso sopra la tab bar (`bottom` 114 → 96), che si restringe con lei: nella Lista ci stanno `HAI PRESO TUTTO` e i primari dei due stati vuoti (`COMINCIA DAI PIATTI`, `VAI AL PIANO`) **[chiuso, fase 2]**; nel Piano ci sta solo il primario di conferma (`CONFERMA E CREA LA LISTA` / `VAI ALLA LISTA`) **[chiuso, fase 2]** — il suo stato vuoto (repertorio senza piatti) resta la scheda «Nessun piatto ancora» con un link in linea nello scroller, **invariata di proposito**, non un primario nel Dock. `HO FINITO` (Piatti) e i primari degli stati vuoti delle altre schermate restano aperti, ciascuno nella fase della sua schermata (fase 3 Piatti, fase 4 Dispensa, fase 5 Impostazioni).
9. **Componenti nuovi** — Menù utente **[chiuso, fase 1: `Testata.tsx`]**, Dock **[chiuso, fase 2]**, Tessera widget di sezione **[chiuso, fase 2]**, Riga piatto (fase 3), Tessera di dispensa (tinta d'area al 26%: **quinto** uso del colore, contro i quattro di §2.2) (fase 4), Pannello impostazioni (fase 5), Riga di impostazione (fase 5), Matrice dei pasti (fase 5), Tasto di scatto (fase 3), Banda dei comandi (fase 3), Striscia dei fogli presi (fase 3), stato «Registro» (fase 4).
10. **Scale ed eccezioni** — due raggi fuori dai cinque, **dichiarati** (26 sulla cornice, 2,52 sulle caselle del Marchio in barra, che rispetta `lato × 0,28`); la tabella degli alfa ammessi è aperta a 0,26 · 0,55 · 0,62 · 0,72; la maschera di scorrimento (`--fine` 128 / 110) e `.anim-barra` a 200 ms sono il quinto momento di movimento.

Le cinque risposte di Andrea del **20/09**, che chiudono le domande di `ANALISI.md` §6:

1. **Dispensa** — il dock `Fai una modifica` apre un **foglio dal basso con tre vie**: a mano (campo residuo, congelatore, Pronti), con una nota (testo o voce), scansione. **Nessuna funzione attuale si perde.**
2. **Impostazioni** — casa condivisa, rotazione del piano, gestione dei pasti, ingredienti, reparti e importa **restano nel prodotto**, in **sotto-schermate** del pannello; la riga `Esci` resta ma è **spenta** (il logout arriva dopo).
3. **Tasti primari** — quelli che il ridisegno non collocava vanno nel **Dock**.
4. **Matrice dei pasti** — regge **da 3 a 6 pasti**: pasti in riga, giorni in colonna, celle mai sotto 44 px.
5. **Titoli** — restano in **sentence case**.

E le tre incoerenze fra scheda di decisione e file HTML, risolte **a favore dei file**: il
Marchio in barra è **3 × 2** (non 3 × 3); `--fine` vale **128** a barra grande (non 140); il
tasto di scatto è **76 / 62 bianco** (non 72 / 52 in `--ink`).

**Cosa vuol dire per il codice.** Alla chiusura della fase 2 (Lista e Piano), le parti annotate
**[chiuso, fase 2]** sopra sono in `src/`. Il resto — comprese le parti non annotate degli
stessi item 8 e 9 — restano derive *future*, con la fase che le chiude segnata accanto; §6 non
le conta finché non sono misurabili nel codice consegnato.
