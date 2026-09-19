# Spesa — design system

**Versione 2, approvata da Andrea il 17/09/2026.** Questo documento è la fonte di verità per
chi disegna una schermata nuova di Spesa — designer o modello. Contiene i valori, non le
intenzioni: ogni token, taglia, misura e stato è scritto qui, e una schermata che li rispetta
esce coerente con l'app senza ritocchi.

**Regola d'ingresso.** Se serve un componente che qui non c'è, si aggiunge qui prima che
altrove. Un valore fuori dalle scale di §3, §4 e §5 è un errore, non una variante.

**Cosa è Spesa.** Un'app mobile italiana che tiene insieme il piano dei pasti della settimana,
la lista della spesa che ne deriva e la dispensa di casa. La lista si usa in piedi, con una
mano, dentro un supermercato. Non è un'app di fitness, non dà consigli di salute, non parla di
calorie né di risparmio.

---

## 1. I sei principi

1. **Default automatico, correzione facile.** L'utente non inserisce mai lo stato del sistema:
   il sistema propone, l'utente corregge. Ogni schermata nasce con un default sensato e un
   gesto di correzione a portata di pollice.
2. **Zero decisioni in corsia.** La Lista si usa con una mano, di fretta, spesso senza rete.
   Tutto ciò che vive in Lista è leggibile a un metro e toccabile alla cieca: nessun testo
   sotto i 12 px come informazione primaria, nessun bersaglio sotto 44 px.
3. **Lo stato è una luce, non una casella.** Acceso = da fare / a casa; spento = fatto /
   fuori. Niente checkbox, niente switch verdi. Il colore dell'area è l'unico colore "vivo"
   della UI; l'inchiostro blu-notte fa tutto il resto.
4. **Numeri onesti.** Ogni numero mostrato deriva da un dato dell'utente o da un calcolo
   dichiarato. Grammi e confezioni sempre, euro **solo** quando l'utente ha dato un prezzo.
   Quantità esatte ("1250 g", non "1,3 kg").
5. **Calma.** Fondo carta, superfici bianche, un solo inchiostro, sei pastelli. Nessun
   gradiente, nessuna ombra colorata, nessuna emoji, nessuna animazione decorativa. L'app di
   un nutrizionista, non di un influencer.
6. **Italiano, del tu, imperativo, senza esclamativi.** Le etichette di servizio in maiuscolo
   mono; il resto in frasi. I copy spiegano la causa, non l'effetto ("Calcolato da spesa e
   piano: correggi solo se non torna").

---

## 2. Colori

### 2.1 Neutri

| Token | Valore | Ruolo | Contrasto |
|---|---|---|---|
| `--fondo` | `#F1F0EE` | fondo pagina, tema PWA | — |
| `--superficie` | `#FFFFFF` | schede, tessere accese, campi | — |
| `--ink` | `#14163A` | testo primario, tasti pieni, stati attivi, bordo "oggi" | 15,3:1 su fondo · 17,4:1 su bianco |
| `--ink-2` | `#3D4166` | hover dei link, avvisi di scadenza nella riga pasto | — |
| `--testo-2` | `#5C5F7A` | **ogni testo che porta informazione**: note, sottotitoli, righe di stato | 5,5:1 su fondo |
| `--sec` | `#8A8A96` | solo decorazione: etichette mono, contatori, unità | 3,0:1 su fondo · 3,4:1 su bianco |
| `--ter` | `#A6A6B2` | solo decorazione: metadati, unità, testo del tasto spento | 2,4:1 su bianco |
| `--off` | `#9A9AA6` | icone di navigazione inattive | 2,4:1 su fondo |
| `--bordo` | `rgba(20,22,58,0.07)` | bordi di schede, campi, tasto secondario | — |
| `--spento` | `rgba(20,22,58,0.035)` | tessere prese, celle fuori casa | — |

`--sec` e `--ter` sono **sotto la soglia AA** e restano tali di proposito: si usano solo dove il
testo è decorativo. Un testo che informa va in `--testo-2` o in `--ink`. Questa è la regola
che chiude la domanda 1 del 17/09.

### 2.2 Semantici

| Token | Valore | Uso | Contrasto su bianco |
|---|---|---|---|
| `--avviso` | `#9A5C00` | avviso in linea (riga non risolta o inferita nell'import) | 5,4:1 |
| `--errore` | `#C4423E` | errori di validazione, caricamento, scrittura; fondo del tasto distruttivo | 5,0:1 |
| `--freddo` | `#2F6FBF` | marca il congelato (Dispensa, meal prep) | 5,1:1 |
| `--icona-spenta` | `#C4C4CE` | kebab, chevron, X, icone spente, testo fuori casa | 1,7:1, di proposito |

I tre semantici sono le versioni scurite dei colori nati nel codice (`#C77700`, `#D9534F`,
`#4A90D9`), portate sopra 4,5:1 perché portano informazione. `--icona-spenta` resta com'è:
è decorazione, e non deve competere con l'inchiostro.

### 2.3 Le sei aree

Fisse, non personalizzabili. L'utente personalizza solo l'ordine di apparizione in Lista.

| # | Area | Token | Hex | Ink sopra |
|---|---|---|---|---|
| 1 | Ortofrutta | `--area-ortofrutta` | `#A8D96A` | 10,6:1 |
| 2 | Macelleria e pescheria | `--area-macelleria` | `#F29B9B` | 8,2:1 |
| 3 | Latticini, uova e salumi | `--area-latticini` | `#9CC7F2` | 9,8:1 |
| 4 | Pasta, riso e cereali | `--area-cereali` | `#F5CE5B` | 11,5:1 |
| 5 | Dispensa e conserve | `--area-dispensa` | `#F2A465` | 8,5:1 |
| 6 | Surgelati | `--area-surgelati` | `#B9AEF5` | 8,7:1 |

Il colore d'area si usa in **quattro modi soli**: bordo della tessera accesa (o fondo pieno
sulla protagonista), quadratino 10 px accanto all'etichetta di sezione, tinta al 26% dietro la
riga di controllo, casella del marchio. Mai come colore di testo, mai come fondo di un tasto.

L'ordine del marchio è fisso e non è l'ordine dei numeri: arancio (dispensa), azzurro
(latticini), verde (ortofrutta) / lilla (surgelati), giallo (cereali), corallo (macelleria).

---

## 3. Tipografia

**Famiglie.** Plus Jakarta Sans (400/500/600/700/800) per testo e titoli; JetBrains Mono
(400/500/700) per etichette di servizio, quantità, contatori, tasti. Da Google Fonts, con
fallback dichiarati.

**Nove livelli, e nessun altro:**

| Livello | Taglia / peso / spaziatura | Font | Dove |
|---|---|---|---|
| Titolo di schermata | 52 / 800 / -0.05em / lh 1 | Sans | testata: LISTA, SETTIMANA, PIATTI, DISPENSA, IMPOSTAZIONI |
| Titolo di dettaglio | 32 / 800 / -0.045em / lh 1.05 | Sans | Piatto, Ingrediente |
| Titolo di scheda o stato vuoto | 21 / 800 / -0.035em / lh 1.2 | Sans | stati vuoti, "Hai preso tutto" |
| Nome di voce | 17 / 700 / -0.03em | Sans | tessere, righe pasto |
| Corpo | 14 / 400–500 / lh 1.5 | Sans | testi esplicativi |
| Nota | 12.5 / 400 / lh 1.4 | Sans | note, righe di stato, errori sotto i campi |
| Tasto e pillola | 12 / 700 / 0.09em / MAIUSCOLO | Mono | tasti da 54 px, pillole |
| Etichetta di sezione | 10 / 700 / 0.16em / MAIUSCOLO | Mono | intestazioni di gruppo, etichette dei campi |
| Micro | 8.5 / 500–700 / 0.12em / MAIUSCOLO | Mono | tab bar, unità dentro le tessere |

**Regole d'uso.** Il mono è sempre maiuscolo e mai sotto 8,5 px. Il sans non è mai maiuscolo e
mai sotto 12,5 px. I titoli di schermata sono **una parola sola**: a 52 px una seconda parola
va a capo. I numeri in mono usano `font-variant-numeric: tabular-nums`.

Le taglie fuori scala che ricorrono nei componenti storici (25 px sul nome della tessera
protagonista, 17.5 sul nome del piatto nella riga pasto, 15.5 sulle voci del foglio, 16 sul
nome della riga di controllo) sono eccezioni già rese, non licenze: una schermata nuova usa i
nove livelli.

---

## 4. Spaziatura

Scala a base 4: **4 · 8 · 12 · 16 · 20 · 26**, più 22 per il distacco dal fondo dello schermo.

| Cosa | Valore |
|---|---|
| Bordo pagina | 16 |
| Testata | 20 alto / 18 lati / 12 basso |
| Interno di una scheda | 16 (26 verticale / 20 laterale negli stati vuoti) |
| Griglia di tessere | gap 8, con 12 ai lati |
| Tra un gruppo e l'altro | 12 |
| Tab bar | 10 alto / 16 lati / 20 basso |
| Ultimo elemento dal fondo | 22 |
| Foglio dal basso | 16 / 16 / 26 |

Nessun valore intermedio: 13, 14 e 15 diventano 12 o 16.

---

## 5. Raggi, bordi, ombre

**Cinque raggi, e nessun altro:**

| Raggio | Cosa |
|---|---|
| 999 | pillole, tasti SÌ/NO, pillola settimana |
| 22 | schede grandi, fogli dal basso (`22px 22px 0 0`), stato vuoto |
| 18 | tasti da 54 px, schede medie, riga di controllo, riga pasto |
| 14 | tessere, campi di testo, segmenti a blocco, voce attiva della tab bar, voci del foglio |
| 4 | quadratino d'area da 10 px, caselle del marchio (`lato × 0.28`) |

**Quattro bordi:**

| Spessore | Uso |
|---|---|
| 1 px `--bordo` | schede, campi, tasto secondario |
| 1,5 px `--ink` | stato selezionato, avviso sulla riga di revisione |
| 2 px | caselle del marchio; tratteggiato degli "aggiungi" e degli stati vuoti, in `rgba(20,22,58,0.20)` |
| 3 px `--ink` | il giorno corrente nella striscia, **dentro** il riquadro |

**Tre ombre, e nient'altro ha ombra:**

- `0 1px 2px rgba(20,22,58,0.05)` — tessera accesa
- `0 1px 3px rgba(20,22,58,0.28)` — casetta piena della riga pasto
- `0 3px 10px rgba(20,22,58,0.24)` — tasto primario e tasto distruttivo

Nessuna ombra colorata, nessuna ombra su schede, fogli o campi.

---

## 6. Icone

SVG inline, `viewBox="0 0 24 24"`, **solo tratto**, `stroke-linecap="round"`, colore da token
(`--ink` attivo, `--off` inattivo nella tab bar, `--icona-spenta` per kebab e chevron).
`aria-hidden` se accanto a un testo; `aria-label` sul contenitore se l'icona è sola.

**Due spessori:** `1.8` per navigazione e testata, `2.1` per le icone d'azione piccole (X, +,
chevron). Taglie: 21 px in tab bar, 20–24 px in testata, 13–16 px dentro le righe e le tessere.

Le sei icone del sistema sono: lista (tre righe), settimana (calendario), piatti (forchetta e
coltello), dispensa (barattolo), impostazioni (ingranaggio), chevron. Più due forme piene, non
di tratto: la casetta della riga pasto e il kebab a tre punti.

**Mai emoji**, in nessun punto dell'interfaccia. Nessuna illustrazione, nessuna foto, nessun
avatar.

---

## 7. Movimento

Solo CSS, 150–250 ms, easing standard, **tutte dentro
`@media (prefers-reduced-motion: no-preference)`**, e solo causa-effetto. Le quattro animazioni
che esistono:

- `.anim-stato` — transizione di colore su un cambio di stato, 180 ms
- `.anim-foglio` — il foglio dal basso che sale, 200 ms
- `.anim-apparsa` — comparsa di un elemento nuovo, 180 ms
- `.anim-giorno` — cambio di giorno nella Settimana, 160 ms

Vietati: animazione d'ingresso della pagina, parallax, cascate, contatori animati, e qualunque
animazione che ritardi un'azione dell'utente.

**Direzione aperta (Andrea, 17/09):** il carattere del moto può diventare **più dinamico,
senza esagerare**. Le durate restano 150–250 ms e il divieto di animazioni senza gesto
resta; quello che si può esplorare è la qualità del moto (easing con una leggera
decelerazione, un piccolo spostamento accanto al fade, la sincronia tra due elementi). Il
**Marchio** in Testata è il primo candidato: Andrea vuole vederlo animato in Claude Design
prima di decidere, e **non è deciso che si riempia**: proporre almeno due idee diverse, una
delle quali non tocca il riempimento delle caselle.

La scheda `cards/movimento.html` le mostra in moto. Un'animazione nuova si propone come
prototipo HTML/CSS nella stessa forma (gesto → effetto, durata, easing, cosa succede con
reduced-motion) e si aggiunge qui e a `globals.css` solo dopo l'approvazione di Andrea.

---

## 8. Componenti

Cornice di riferimento: **393 px** di larghezza, fondo `--fondo`.

### Testata
Marchio 3×2 (link a `/lista`) + titolo 52/800 a sinistra; ingranaggio 24 px con
`aria-label="Impostazioni"` a destra, in un'area 44×44. Sotto, facoltativa, la **pillola
settimana**: alta 34, raggio 999, fondo `--ink`, mono 10.5/700/0.13em in bianco — testo
informativo, non interattivo, senza freccetta. Padding `20px 18px 12px`, gap interno 15.
Modalità `indietro`: freccia 20 px al posto del marchio, niente ingranaggio.

### Marchio
Griglia 3×2, lato 16 px (20 nelle rese grandi), gap 4, raggio `lato × 0.28`. Ogni casella
sempre nel colore della sua area, bordo 2 px dello stesso colore: **piena** = in quell'area non
manca niente; **contornata** = manca qualcosa. Mai grigia. Solo la Lista passa le aree
mancanti; altrove il marchio è pieno.

### Tab bar
Quattro voci fisse: LISTA, SETTIMANA, PIATTI, DISPENSA. Icona 21 px + micro mono 8.5/0.12em.
Attiva: `--ink`, peso 700, fondo `rgba(20,22,58,0.06)`, raggio 14. Inattiva: `--off`, peso 500,
fondo trasparente. Padding `10px 16px 20px`, gap 4, ogni voce `flex: 1`. Su Impostazioni e
Importa nessuna voce è attiva, di proposito.

### Tasti
Altezza **54**, raggio **18**, mono 12/700/0.09em maiuscolo, larghezza piena o `flex: 1` in
coppia.

- **Primario** — fondo `--ink`, testo bianco, bordo 1 px `--ink`, ombra
  `0 3px 10px rgba(20,22,58,0.24)`. Uno per schermata, in fondo.
- **Secondario** — fondo bianco, testo `--ink`, bordo 1 px `--bordo`, nessuna ombra. Deve
  sembrare un tasto: un secondario grigio su grigio viene letto come disabilitato.
- **Spento** — fondo `rgba(20,22,58,0.10)`, testo `--ter`, bordo trasparente, `disabled` nativo.
- **Distruttivo** — **primario pieno in `--errore`** (`#C4423E`), testo bianco, stesse misure
  54/18, stessa ombra del primario. Vive **solo dentro un dialogo di conferma a due tasti**,
  accanto ad ANNULLA secondario. Mai come tasto libero in pagina.

### Pillole d'azione
Disegno 38 px (44 nei SÌ/NO), raggio 999, mono 11/700/0.08em maiuscolo, `padding 0 15px`.
**Area di tap sempre 44 px** anche quando il disegno è 38: il bottone è trasparente e più alto
della pillola. Attiva: fondo `--ink`, testo bianco. Inattiva: bianco, testo `--sec`, bordo
1 px `rgba(20,22,58,0.09)`.

### Segmento a blocco
Rettangoli `flex: 1`, alti 46, raggio 14, gap 7, mono 11/700/0.08em maiuscolo; stessi colori
delle pillole. Un attivo alla volta, `aria-pressed`. Disabilitato: `disabled` nativo più
opacità 0,5 sull'intera fila.

### Tessera della Lista
Griglia a due colonne, gap 8, altezza minima 104. La **prima voce di ogni area è
"protagonista"**: due colonne (`span 2`), fondo pieno nel colore dell'area, nome a 25 px,
raggio 18, padding `13px 16px 14px`. Le altre: raggio 14, padding `12px 14px 13px`.

Anatomia dall'alto: pillola delle confezioni (mono 10.5/700/0.07em, raggio 999, padding
`5px 10px`) + quantità totale in mono 10, poi il nome 17/700/-0.032em, poi il dettaglio
facoltativo "serve X · in casa Y" in mono 8.5.

- **Accesa** (da prendere) — fondo bianco, bordo 1 px nel colore dell'area al 45%, ombra
  `0 1px 2px rgba(20,22,58,0.05)`.
- **Spenta** (presa) — fondo `--spento`, bordo trasparente, nome barrato a
  `rgba(20,22,58,0.34)` con tratto 1,6 px, nessuna ombra, nessun dettaglio.

Il tap sulla tessera intera è l'interruttore: è l'**unica eccezione dichiarata** alla regola
"tap = apre". `aria-pressed` porta lo stato, `aria-label` dice cosa fa il tap.

### Riga di controllo
"Olio: ne hai ancora?" sotto le tessere della sua area. Fondo colore d'area al 26%, raggio 18,
padding `14px 15px`, margine `0 12px 12px`. Nome 16/700/-0.024em, sotto una riga mono 8.5/0.11em
che dice la cadenza del controllo. A destra due pillole bianche SÌ/NO da 44 px, min-width 52,
gap 7. Mentre la risposta è in volo: opacità 0,5 e `disabled`.

### Riga pasto
Raggio 18, fondo bianco con bordo 1 px `rgba(20,22,58,0.09)` a casa, fondo
`rgba(20,22,58,0.04)` con bordo trasparente fuori casa. Tre zone, larghezze non negoziabili:

1. **Casetta 60 px** a sinistra — toggle casa/fuori con `aria-pressed`. A casa: casetta piena
   `--ink` con ombra `0 1px 3px`. Fuori: casetta bianca con contorno grigio (senza contorno
   sparisce sul fondo chiaro).
2. **Corpo** — apre il piatto, `aria-label="Apri {piatto}"`. Dall'alto: nome del pasto in mono
   9/700/0.13em maiuscolo, nome del piatto 17.5/700 troncato con ellissi, sottotitolo mono 9,
   eventuali avvisi di scadenza 12/600 in `--ink-2`, pallini delle aree 8×8 raggio 2.6.
3. **Destra 44 px** — kebab a tre punti (apre il foglio) o chevron (va a Scegli), in
   `--icona-spenta`.

Fuori casa il nome scende a barrato in grigio e l'etichetta dice il motivo: "Fuori casa",
"Saltato", "Ho mangiato fuori piano".

### Striscia dei giorni
Sette riquadri `flex: 1`, gap 3, raggio 14, padding `9px 0 10px`. Dentro: sigla del giorno mono
8.5/700/0.08em in `--ter`, numero 15/800, e sotto un pallino da 5 px per pasto (pieno se quel
pasto è a casa e ha un piatto). Selezionato: fondo `--ink`, testi in bianco, ombra
`0 2px 6px rgba(20,22,58,0.20)`. **Oggi**: bordo 3 px `--ink` dentro il riquadro — vale sempre,
anche quando oggi non è il giorno selezionato. `aria-pressed` e `aria-label` "Venerdì 28" /
"…, selezionato".

### Foglio dal basso
`role="dialog"` con `aria-label` che dice il contesto. Overlay `rgba(20,22,58,0.35)`, foglio
bianco ancorato in basso, raggio `22px 22px 0 0`, padding `16px 16px 26px`, gap 9. Voci alte
almeno 50 (mai sotto 44), raggio 14, fondo `rgba(20,22,58,0.04)`, testo 15.5/700 centrato.
Separatori di sezione in mono 10/700/0.13em. Classe `.anim-foglio`. Il tap sull'overlay chiude.

### Scheda
Bianco, raggio 22, bordo 1 px `--bordo`, padding 16 con contenuto, `26px 20px` negli stati
vuoti. Nessuna ombra.

### Stato vuoto
Scheda da 22 centrata verticalmente; dentro, in colonna e centrati: quadrato 46 px raggio 14
con bordo 2 px tratteggiato e un'icona spenta dentro; titolo 21/800; testo 14/lh 1.5 in
`--testo-2`, largo al massimo 30ch; un tasto primario che porta alla prossima azione (Lista e
Settimana vuote rimandano a Piatti). Mai una pagina bianca.

### Campo di testo
Altezza 44, raggio 14, padding `0 14px`, fondo bianco, bordo 1 px `--bordo`, testo 14.
Etichetta sopra in mono 10/700/0.16em maiuscolo, gap 7. Campo numerico: largo 68–96, testo in
mono 14/700 allineato a destra, unità accanto in mono 10 `--ter`. Textarea: raggio 14,
`resize: none`, cresce con il contenuto. Errore: nota 12.5 in `--errore` sotto il campo.

### Etichetta di sezione
Mono 10/700/0.16em maiuscola, in `--ink` quando titola un gruppo. A destra, il contatore in
mono 10/500/0.10em in `--sec` ("4 VOCI"). Davanti alle sezioni della Lista, un quadratino
10×10 raggio 4 nel colore dell'area.

### Messaggi
Nessun toast, nessuna snackbar, nessun banner colorato: lo stato si legge dove sta il dato.

- **Errore** di caricamento, scrittura o validazione — `<p>` 12.5 in **`--errore`**, margine
  `0 4px`. Il testo del server si mostra così com'è quando è scritto per l'utente.
- **Avviso in linea** — 11.5 in **`--avviso`**, con `aria-live="polite"`.
- **Nota** — 12.5 in `--testo-2`: spiega la provenienza di un numero o il perché di un default.
- **Riga di stato** — 12.5 in `--testo-2`, sopra il contenuto ("Sei offline: la lista è quella
  dell'ultima apertura").
- **Caricamento** — una sola riga mono "CARICO…" in `--sec`, al posto del contenuto, sotto la
  testata che è già disegnata. Nessuno spinner, nessuno scheletro.

---

## 9. Pattern

**Gesti.** Tap sulla card = apre. Cambiare stato ha sempre un controllo suo (casetta, pillola).
Eccezione dichiarata e unica: la tessera della Lista è essa stessa l'interruttore. **Nessuno
swipe, nessun long-press**: non si scoprono e non si annunciano.

**Conferme.** Ogni azione distruttiva o non reversibile (elimina piatto, riparti dalla
settimana 1, rigenera la lista) passa da un dialogo a due tasti: il distruttivo pieno in
`--errore`, ANNULLA secondario accanto. Mai un solo tap. Le azioni reversibili (spunta, toggle
casa) non chiedono niente e si annullano rifacendo il gesto.

**Feedback di scrittura.** Un'azione che scrive mostra lo stato sul controllo stesso (opacità
0,5 e `disabled` mentre è in volo) e la conferma è il cambio di stato del dato, non un
messaggio. In caso di errore, un messaggio in `--errore` e un RIPROVA.

**Caricamento.** Riga mono "CARICO…" in `--sec`. Niente spinner, niente scheletro.

**Stati vuoti.** Ogni lista vuota dice **perché** è vuota e qual è la prossima azione, con un
tasto primario.

**Offline.** La Lista si legge sempre dall'istantanea locale; una riga di stato lo dice; le
spunte si accodano e non si perdono. Le altre pagine possono fallire, la Lista no.

**Dark mode.** Fuori scope. I token esistono, il tema scuro no: non disegnare varianti scure.

---

## 10. Copy

- **Etichette e tasti** in maiuscolo mono, verbo all'imperativo o sostantivo secco: CONFERMA E
  CREA LA LISTA, ESTRAI LA DIETA, HO FINITO, SCANSIONA, SALVA.
- **Frasi** in sans, del tu, senza esclamativi, senza "per favore", senza corporate speak. Il
  copy spiega la causa: "Calcolato da spesa e piano: correggi solo se non torna con la realtà".
- **Numeri** esatti con unità: "1250 g", "2 confezioni", "3 pasti a casa". Plurali corretti
  (1 VOCE / 2 VOCI). Date in italiano ("il prossimo dal 12/09/2026").
- **Vietati**: claim di salute, "risparmia", qualunque cifra in euro senza un prezzo dato
  dall'utente. Il risparmio si chiama "non hai ricomprato".
- **Un errore dice cosa fare**, non cosa è successo: "il PDF non si apre: prova con le foto".

---

## 11. Accessibilità

- Ogni controllo ha un nome: testo visibile o `aria-label`.
- `aria-pressed` su ogni toggle e ogni segmento; `role="dialog"` con nome su ogni foglio.
- Bersagli ≥ 44 px anche quando il disegno è più piccolo.
- `lang="it"` sul documento.
- Contrasto ≥ 4,5:1 su ogni testo che porta informazione: `--testo-2` per note e sottotitoli,
  `--errore` per gli errori, `--avviso` per gli avvisi, `--ink` per tutto il resto. `--sec`,
  `--ter`, `--off` e `--icona-spenta` solo su testo e icone decorativi.
- Nessun contenuto affidato al solo colore: lo stato ha sempre anche una forma (pieno /
  contornato, barrato / non barrato, casetta piena / contornata).

---

## 12. Cosa non c'è, di proposito

Gradienti, glassmorphism, ombre colorate, emoji, illustrazioni, foto, avatar, toast, snackbar,
banner colorati, onboarding a quiz, paywall, badge "novità", contatori animati, conferme a un
tap per azioni distruttive, swipe nascosti, long-press, spinner, scheletri, dark mode,
caratteri sotto 8,5 px, checkbox, switch verdi.

---

## 13. Le decisioni del 17/09/2026

Prese da Andrea su una pagina visiva dove ogni alternativa era resa, non descritta. Sono già
incorporate nelle sezioni qui sopra: questo elenco serve solo a dire che non sono più aperte.

| # | Domanda | Decisione |
|---|---|---|
| 1 | Contrasto del testo secondario | nuovo token `--testo-2 = #5C5F7A` (5,5:1) per ogni testo che informa; `--sec` resta per la decorazione |
| 2 | Colori semantici | quattro token: `--avviso #9A5C00`, `--errore #C4423E`, `--freddo #2F6FBF`, `--icona-spenta #C4C4CE` |
| 3 | Scala tipografica | nove livelli (§3) |
| 4 | Spaziatura, raggi, tratto | 4·8·12·16·20·26 · cinque raggi · tratti 1.8 e 2.1 |
| 5 | Tasto distruttivo | primario **pieno** in `--errore`, solo dentro il dialogo di conferma |
| 6 | Caricamento | riga mono "CARICO…" |
| 7 | Messaggi di errore | in `--errore` |
| 8 | Basi condivise nel codice | nessun modulo di stili condivisi: questo documento è l'unica guardia |
