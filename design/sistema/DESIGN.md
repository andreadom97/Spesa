# Dispesa — design system

**Versione 3, aggiornata il 20/09/2026.** La v2 è stata approvata da Andrea il 17/09/2026; la
v3 incorpora il ridisegno fatto in Claude Design il 19/09 e le cinque risposte di Andrea del
20/09. Questo documento è la fonte di verità per chi disegna una schermata nuova di Dispesa —
designer o modello. Contiene i valori, non le intenzioni: ogni token, taglia, misura e stato è
scritto qui, e una schermata che li rispetta esce coerente con l'app senza ritocchi.

**Regola d'ingresso.** Se serve un componente che qui non c'è, si aggiunge qui prima che
altrove. Un valore fuori dalle scale di §3, §4 e §5 è un errore, non una variante — salvo le
**eccezioni dichiarate**, che sono elencate una per una in §5 e non si estendono per analogia.

**Cosa è Dispesa.** Un'app mobile italiana che tiene insieme il piano dei pasti della settimana,
la lista della spesa che ne deriva e la dispensa di casa. La lista si usa in piedi, con una
mano, dentro un supermercato. Non è un'app di fitness, non dà consigli di salute, non parla di
calorie né di risparmio.

**Cosa è cambiato dalla v2.** Il fondo è a gradiente; la tab bar è flottante, porta i nomi e ha
due stati; il Marchio è l'icona della Lista; l'ingranaggio è sostituito dal Menù utente; le
Impostazioni sono un pannello con sotto-schermate, non una schermata; i titoli di schermata
sono in sentence case; la seconda sezione si chiama **Piano**; i tasti primari che il fondo
schermo non ospita più vivono nel **Dock**. Il registro completo è in §13.

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
5. **Calma.** Fondo carta con **un solo gradiente verticale tenue** (§2.4), superfici bianche,
   un solo inchiostro, sei pastelli. Nessuna ombra colorata, nessuna emoji, nessuna animazione
   decorativa. L'app di un nutrizionista, non di un influencer.
6. **Italiano, del tu, imperativo, senza esclamativi.** Le etichette di servizio in maiuscolo
   mono; il resto in frasi. I copy spiegano la causa, non l'effetto ("Calcolato da spesa e
   piano: correggi solo se non torna").

---

## 2. Colori

### 2.1 Neutri

| Token | Valore | Ruolo | Contrasto |
|---|---|---|---|
| `--fondo` | `#F1F0EE` | fondo delle superfici piatte e tema PWA; **non** più il fondo della schermata (§2.4) | — |
| `--superficie` | `#FFFFFF` | schede, tessere accese, campi, tab bar, dock | — |
| `--ink` | `#14163A` | testo primario, tasti pieni, stati attivi, bordo "oggi" | 15,3:1 su fondo · 17,4:1 su bianco |
| `--ink-2` | `#3D4166` | hover dei link, avvisi di scadenza nella riga pasto | — |
| `--testo-2` | `#5C5F7A` | **ogni testo che porta informazione**: note, sottotitoli, righe di stato | 5,5:1 su fondo |
| `--sec` | `#8A8A96` | solo decorazione: etichette mono, contatori, unità | 3,0:1 su fondo · 3,4:1 su bianco |
| `--ter` | `#A6A6B2` | solo decorazione: metadati, unità, testo del tasto spento | 2,4:1 su bianco |
| `--off` | `#9A9AA6` | icone e etichette di navigazione inattive | 2,4:1 su fondo |
| `--bordo` | `rgba(20,22,58,0.07)` | bordi di schede, campi, tasto secondario | — |
| `--spento` | `rgba(20,22,58,0.035)` | tessere prese, celle fuori casa | — |

`--sec` e `--ter` sono **sotto la soglia AA** e restano tali di proposito: si usano solo dove il
testo è decorativo. Un testo che informa va in `--testo-2` o in `--ink`.

### 2.2 Semantici

| Token | Valore | Uso | Contrasto su bianco |
|---|---|---|---|
| `--avviso` | `#9A5C00` | avviso in linea, data di scadenza nella Dispensa | 5,4:1 |
| `--errore` | `#C4423E` | errori di validazione, caricamento, scrittura; fondo del tasto distruttivo | 5,0:1 |
| `--freddo` | `#2F6FBF` | marca il congelato (Dispensa, meal prep) | 5,1:1 |
| `--icona-spenta` | `#C4C4CE` | kebab, chevron, X, icone spente, testo fuori casa | 1,7:1, di proposito |

`--avviso` e `--freddo` **scendono a 4,7:1 e 4,2:1 su una tinta d'area al 26%**: su quel fondo
vanno sempre dentro una pillola bianca (§8, Tessera di dispensa). Mai direttamente sulla tinta.

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

Il colore d'area si usa in **cinque modi**, e nessun altro:

1. bordo della tessera accesa (al 45%) o fondo pieno sulla protagonista della Lista;
2. quadratino 10 px accanto all'etichetta di sezione, e pallini 8 px sulla Riga piatto;
3. tinta al **26%** dietro la riga di controllo;
4. casella del Marchio (piena o contornata 2 px);
5. **tinta al 26% come fondo della Tessera di dispensa** in casa — uso aggiunto il 19/09, e
   **solo** lì.

Mai come colore di testo. Mai come fondo di un tasto, con l'unica deroga della protagonista
della Lista e della Tessera di dispensa, che sono tessere-interruttore e non tasti.

L'ordine del Marchio è fisso e non è l'ordine dei numeri: arancio (dispensa), azzurro
(latticini), verde (ortofrutta) / lilla (surgelati), giallo (cereali), corallo (macelleria).

### 2.4 Il fondo della schermata: gradiente

**[regola dal 19/09]** Il fondo della cornice è un gradiente verticale a quattro fermate:

```css
background: linear-gradient(180deg,#EDECEA 0%,#F2F1EF 34%,#F8F8F7 70%,#FCFCFB 100%);
```

In alto grigio carta, in basso quasi bianco ma mai bianco puro: la barra flottante e il dock
appoggiano su un fondo che si schiarisce sotto di loro, e le superfici bianche restano
distinguibili. Questa regola **sostituisce** il "nessun gradiente in nessun punto" della v2.

Due sole eccezioni:

- **L'anteprima della fotocamera** (Fotografa il piano) non ha fondo di design: l'immagine del
  dispositivo occupa tutta la cornice, e il gradiente non si vede.
- Le **superfici** (schede, tessere, pannelli, tab bar, dock) restano a tinta piena: il
  gradiente è del fondo, non degli oggetti. Nessun gradiente su un oggetto, mai.

### 2.5 Gli alfa in uso, dichiarati

Fuori dalle quattro alfe della v2 (`0,035` · `0,07` · `0,20` · `0,35`) valgono, e solo dove è
scritto:

| Alfa | Dove |
|---|---|
| `0,045` su `--ink` | fondo della riga pasto fuori casa |
| `0,06` su `--ink` | pillola delle confezioni sulla tessera spenta |
| `0,07` su `--ink` | voce attiva della tab bar, fondo del Menù utente, tondo della X nel pannello |
| `0,09` su `--ink` | bordo delle pillole d'azione, della Riga piatto, della Riga pasto |
| `0,12` su `--ink` | Menù utente premuto |
| `0,26` su un colore d'area | tinta della riga di controllo e della Tessera di dispensa |
| `0,32` su un colore d'area | pillola delle confezioni dentro una tessera accesa |
| `0,34` su `--ink` | nome barrato di una tessera spenta |
| `0,45` su un colore d'area | bordo della tessera accesa |
| `0,55` su `--ink` | velo dietro il Pannello impostazioni |
| `0,55` su `--ink` | testo secondario sopra una protagonista in tinta piena |
| `0,72` su `--ink` | Banda dei comandi sopra l'anteprima fotocamera |
| `0,62` su bianco | bordo del tasto secondario sopra l'anteprima fotocamera |
| `0,62` su bianco | tempo di registrazione nello stato "Registro" |

Un'alfa che non è in questa tabella non si usa: si aggiunge prima qui.

---

## 3. Tipografia

**Famiglie.** Plus Jakarta Sans (400/500/600/700/800) per testo e titoli; JetBrains Mono
(400/500/700) per etichette di servizio, quantità, contatori, tasti. Da Google Fonts, con
fallback dichiarati.

**Nove livelli, e nessun altro:**

| Livello | Taglia / peso / spaziatura | Font | Dove |
|---|---|---|---|
| Titolo di schermata | 52 / 800 / -0.05em / lh 1 | Sans | testata: Lista, Piano, Piatti, Dispensa |
| Titolo di dettaglio | 32 / 800 / -0.045em / lh 1.05 | Sans | Piatto, Ingrediente, testata del Pannello impostazioni |
| Titolo di scheda o stato vuoto | 21 / 800 / -0.035em / lh 1.2 | Sans | stati vuoti, "Hai preso tutto" |
| Nome di voce | 17 / 700 / -0.03em | Sans | tessere, righe pasto, Riga piatto, riga di impostazione |
| Corpo | 14 / 400–500 / lh 1.5 | Sans | testi esplicativi, testo dentro i campi |
| Nota | 12.5 / 400 / lh 1.4 | Sans | note, righe di stato, errori sotto i campi |
| Tasto e pillola | 12 / 700 / 0.09em / MAIUSCOLO | Mono | tasti da 54 px, pillole |
| Etichetta di sezione | 10 / 700 / 0.16em / MAIUSCOLO | Mono | intestazioni di gruppo, etichette dei campi |
| Micro | 8.5 / 500–700 / 0.12em / MAIUSCOLO | Mono | tab bar, unità dentro le tessere |

**Titoli di schermata in sentence case.** **[deciso 20/09]** I titoli si scrivono `Lista`,
`Piano`, `Piatti`, `Dispensa`, `Impostazioni`: una parola sola, sans 52/800, **prima lettera
maiuscola e il resto minuscolo**. La v2 li voleva tutti maiuscoli: quella regola è superata.
Resta il vincolo della parola sola — a 52 px una seconda parola va a capo.

**Regole d'uso.** Il mono è sempre maiuscolo e mai sotto 8,5 px. Il sans non è mai maiuscolo
(oltre all'iniziale) e mai sotto 12,5 px. I numeri in mono usano
`font-variant-numeric: tabular-nums`. Contatori, unità, quantità, cadenze e tasti sono
**sempre** mono maiuscolo: confermato il 19/09.

**Le taglie intermedie ammesse**, dove un componente le porta e solo lì: mono 11 (pillola
d'azione, segmento, etichetta del dock e dei tasti dentro le bande), mono 10,5 (pillola delle
confezioni, pillola settimana), mono 9 (nome del pasto sulla riga pasto, sottoriga della Riga
piatto), sans 25 (nome della protagonista), sans 17,5 (nome del piatto nella riga pasto), sans
16 (nome della riga di controllo), sans 15,5 (voci del foglio dal basso). Sono eccezioni già
rese e censite: una schermata nuova usa i nove livelli.

**Mono 16** è ammesso in un punto solo: l'iniziale dentro il Menù utente. È una lettera, non un
testo.

---

## 4. Spaziatura

Scala a base 4: **4 · 8 · 12 · 16 · 20 · 26**, più 22 per il distacco dal fondo dello schermo.

| Cosa | Valore |
|---|---|
| Bordo pagina | 16 |
| Testata | 20 alto / 18 lati / 12 basso, gap interno 15 |
| Interno di una scheda | 16 (26 verticale / 20 laterale negli stati vuoti) |
| Interno di una Tessera widget di sezione | 14 alto / 12 lati / 12 basso, gap 12 |
| Griglia di tessere | gap 8, con 12 ai lati |
| Tra un gruppo e l'altro | 12 |
| Tab bar flottante | 16 dai lati, 22 dal fondo, padding 6, gap 2 |
| Dock | 16 dai lati, 8 sopra la tab bar, padding 8, gap 8 |
| Ultimo elemento dal fondo | 22 |
| Foglio dal basso | 16 / 16 / 26 |
| Coda di scorrimento sotto l'ultimo contenuto | 118 senza dock · 140 col dock a una riga · 248 col dock a due righe (124 + 114 + 10) |

Nessun valore intermedio: 13, 14 e 15 diventano 12 o 16, tranne dentro l'anatomia di un
componente dove il valore è dichiarato (padding `12 14 13` della tessera, `13 16 14` della
protagonista, `14 15` della riga di controllo).

---

## 5. Raggi, bordi, ombre

**Cinque raggi, più due eccezioni dichiarate:**

| Raggio | Cosa |
|---|---|
| 999 | pillole, tasti SÌ/NO, pillola settimana, tab bar, voci della tab bar, dock della Dispensa, tondo del Menù utente, anello e disco del tasto di scatto |
| 22 | schede grandi, Tessera widget di sezione, Pannello impostazioni, fogli dal basso (`22px 22px 0 0`), Banda dei comandi (`22px 22px 0 0`), contenitore del Dock, stato vuoto |
| 18 | tasti da 54 px, schede medie, riga di controllo, riga pasto, Blocco di gruppo del pannello |
| 14 | tessere, campi di testo, segmenti a blocco, celle della matrice dei pasti, Riga piatto, miniatura della Striscia dei fogli, voci del foglio |
| 4 | quadratino d'area da 10 px, quadrato dello stop nel Registro |
| **26 — eccezione** | **la cornice del dispositivo** (393 × 852). È il telaio del mockup e la cornice della PWA, non un elemento di prodotto: nessun altro oggetto usa 26. |
| **2,52 — eccezione** | **le caselle del Marchio quando è icona di tab bar** (lato 9). Rispetta la formula `lato × 0,28` che governa il raggio 4 sul lato 16: è la stessa regola, applicata a un lato più piccolo. Nessun altro oggetto usa 2,52. |

Il Marchio a lato 16 (testata e rese grandi) tiene il raggio 4. I pallini d'area da 8 px sulla
Riga piatto e sulla riga pasto restano a 2,6, come nella v2.

**Quattro bordi:**

| Spessore | Uso |
|---|---|
| 1 px `--bordo` | schede, campi, tasto secondario, Tessera widget di sezione, Blocco di gruppo |
| 1,5 px `--ink` | stato selezionato, avviso sulla riga di revisione, **e il perimetro di una superficie che deve staccarsi dal contenuto sotto**: il Pannello impostazioni. Sopra l'anteprima fotocamera lo stesso spessore è bianco al 62% |
| 2 px | caselle del Marchio; tratteggiato degli "aggiungi", degli stati vuoti e della Tessera di dispensa finita, in `rgba(20,22,58,0.20)`; bordo bianco dell'anello di scatto |
| 3 px `--ink` | il giorno corrente nella striscia, **dentro** il riquadro (`inset`) |

**Sei ombre.** Le tre della v2 restano e valgono dove valevano; le tre del 19/09 sono a due
strati e governano le superfici flottanti.

| Token | Valore | Su cosa |
|---|---|---|
| `--ombra-tessera` | `0 1px 2px rgba(20,22,58,0.05)` | tessera accesa della Lista, quando non è dentro una Tessera widget |
| `--ombra-casetta` | `0 1px 3px rgba(20,22,58,0.28)` | casetta piena della riga pasto |
| `--ombra-tasto` | `0 3px 10px rgba(20,22,58,0.24)` | tasto primario e tasto distruttivo |
| `--ombra-pannello` | `0 1px 2px rgba(20,22,58,.05), 0 6px 16px rgba(20,22,58,.06)` | Tessera widget di sezione, Riga piatto, campi, celle della striscia, Blocco di gruppo |
| `--ombra-nav` | `0 2px 6px rgba(20,22,58,.08), 0 12px 30px rgba(20,22,58,.16)` | tab bar, Dock, Menù utente aperto, chrome sopra la fotocamera |
| `--ombra-alta` | `0 8px 24px rgba(20,22,58,.28), 0 26px 64px rgba(20,22,58,.26)` | Pannello impostazioni |

Più una, locale e sola: `0 2px 6px rgba(20,22,58,.20)` sulla cella selezionata della striscia
dei giorni. Nessuna ombra colorata, mai. Niente ombra sui fogli dal basso, sui tasti secondari,
sulle tessere dentro una Tessera widget (il widget porta l'ombra per tutte).

---

## 6. Icone

SVG inline, `viewBox="0 0 24 24"`, colore da token (`--ink` attivo, `--off` inattivo nella tab
bar, `--icona-spenta` per kebab e chevron). `aria-hidden` se accanto a un testo; `aria-label`
sul contenitore se l'icona è sola.

**Due spessori di tratto:** `1.8` per navigazione e testata, `2.1` per le icone d'azione
piccole (X, +, chevron). Taglie: **26 px in tab bar**, 20–24 px in testata, 13–18 px dentro le
righe e le tessere.

**Le icone di tratto del sistema:** lista (tre righe), settimana/piano (calendario), piatti
(forchetta e coltello), dispensa (barattolo), chevron, X, più, lente, **matita** (aggiunta il
19/09 per il Dock), microfono.

**Le forme piene ammesse:** la casetta della riga pasto, il kebab a tre punti, e **le quattro
icone della tab bar**, che dal 19/09 sono piene: a 26 px, appoggiate su bianco e in mezzo a
quattro nomi, il tratto si perdeva. La regola "solo tratto" vale ancora fuori dalla tab bar.

**Mai emoji**, in nessun punto dell'interfaccia. Nessuna illustrazione, nessuna foto, nessun
avatar — l'iniziale del Menù utente è testo, non un avatar.

---

## 7. Movimento

Solo CSS, **150–250 ms**, easing standard o `cubic-bezier(.2,.8,.25,1)`, **tutte dentro
`@media (prefers-reduced-motion: no-preference)`**, e solo causa-effetto. Le animazioni che
esistono:

- `.anim-stato` — transizione di colore su un cambio di stato, 180 ms
- `.anim-foglio` — il foglio dal basso che sale, 200 ms
- `.anim-apparsa` — comparsa di un elemento nuovo, 180 ms
- `.anim-giorno` — cambio di giorno nella Settimana, 160 ms
- **`.anim-barra`** — la tab bar che si restringe e il Dock che la segue, **200 ms**
  `cubic-bezier(.2,.8,.25,1)`, opacità delle etichette in 150 ms lineari. Il gesto è lo
  **scorrimento**: soglia 8 px per cambiare stato, ritorno a barra grande sotto i 4 px di
  scroll. **[aggiunto 19/09]**
- **`.anim-scatto`** — anello `scale(.96)` e disco `scale(.88)` sul tasto di scatto, 180 ms
- **`.anim-registro`** — le quattro barre del metro nello stato "Registro": da 7 a 22 px in
  220 ms `ease-in-out` `infinite alternate`, sfasature 40 / 70 / 140 ms. È l'**unica animazione
  in loop del sistema**, ammessa perché dice che il microfono sta ascoltando: dura quanto la
  registrazione e finisce col gesto di stop. Con `prefers-reduced-motion: reduce` le barre
  restano ferme a 13 px e lo stato si legge dal testo `Registro…` con `role="status"`.

Vietati: animazione d'ingresso della pagina, parallax, cascate, contatori animati, e qualunque
animazione che ritardi un'azione dell'utente.

**Direzione aperta (Andrea, 17/09, ancora aperta).** Il carattere del moto può diventare più
dinamico senza esagerare: durate sempre 150–250 ms, mai un'animazione senza gesto. Il
**Marchio** è il primo candidato, e va proposto in almeno due idee, una delle quali non tocca
il riempimento delle caselle.

**La maschera di scorrimento non è un'animazione.** È una `mask-image` ferma sul contenitore
che scorre: il contenuto sfuma entrando sotto la tab bar invece di essere tagliato.

```css
.scroll{
  mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - var(--fine)),
    rgba(0,0,0,.55) calc(100% - 74px), rgba(0,0,0,0) calc(100% - 30px));
}
```

`--fine` vale **128 px** a barra grande e **110 px** a barra piccola: cambia con la barra, nello
stesso tempo e con la stessa curva. Va scritta anche in `-webkit-mask-image`. Una schermata che
ha il Dock tiene comunque 128: il Dock è opaco e copre da sé il contenuto che gli passa dietro.

---

## 8. Componenti

Cornice di riferimento: **393 × 852**, raggio 26, `overflow: hidden`, fondo a gradiente (§2.4).

### Testata
Titolo di schermata 52/800 in sentence case a sinistra; **Menù utente** a destra, allineato al
piede del titolo. Il Marchio **non è più in testata**: è l'icona della Lista in tab bar, e con
lui è sparito il link "Vai alla lista" da ogni schermata. Sotto, facoltativa, la **pillola
settimana**: alta 34, raggio 999, fondo `--ink`, mono 10.5/700/0.13em in bianco, testo
informativo e non interattivo, senza freccetta (`Settimana del 21 settembre`). Padding
`20px 18px 12px`, gap interno 15. Modalità `indietro`: freccia 20 px a sinistra, niente Menù
utente.

### Menù utente
**Nuovo il 19/09.** Sostituisce l'ingranaggio: dice anche **di chi** è l'account, non solo che
esistono preferenze.

- **Anatomia:** pillola alta **50**, raggio 999, fondo `rgba(20,22,58,0.07)` — la stessa tinta
  della voce attiva della tab bar — padding `0 12 0 6`, gap 5, larghezza risultante **81**.
  Dentro: tondo **38** in `--ink` con l'iniziale dell'utente in mono **16 / 700 / 0.06em**
  bianca (17,4:1), e il **kebab pieno 20 px** in `--ink`. Nessun bordo, nessuna ombra a riposo.
- **Stati:** riposo come sopra; premuto `rgba(20,22,58,0.12)`; aperto `aria-expanded="true"` e
  `--ombra-nav`.
- **Misure e accesso:** un solo bersaglio 81 × 50, `aria-label="{Nome}: profilo e
  impostazioni"`. Apre il **Pannello impostazioni**.
- L'iniziale è **testo**, non un avatar: nessuna immagine, nessun colore assegnato per persona.

### Tab bar
Pillola bianca **flottante**: `left/right 16`, `bottom 22`, altezza **84**, raggio 999, padding
6, gap 2, `--ombra-nav`. Quattro voci `flex: 1` alte **72**, in colonna, gap 4, raggio 999;
attiva su `rgba(20,22,58,0.07)`.

- **Ordine e nomi:** **Lista · Piano · Piatti · Dispensa**. `SETTIMANA` non esiste più: la
  sezione si chiama **Piano** perché è la pianificazione dei pasti, e la settimana è il periodo,
  che lo dice la pillola sotto il titolo.
- **Icone 26 px, piene**; spente `#9A9AA6`, accesa `--ink`. Il segno sta in uno `.segno` ad
  **altezza fissa 26**, così le quattro icone e il Marchio hanno la stessa linea di base e i
  quattro nomi sono allineati fra loro.
- **Etichette** mono **8,5 / 0,12em**, spente `--off` a 500, accesa `--ink` a 700, rese
  maiuscole da `text-transform`.
- **Stato ridotto:** scorrendo giù la barra diventa alta **66**, voci **54**, `left/right 46`;
  le etichette vanno a `max-height: 0; opacity: 0` ma **restano cliccabili**. 200 ms,
  `cubic-bezier(.2,.8,.25,1)`; `--fine` passa da 128 a 110.
- **L'icona della Lista è il Marchio**, non un'icona di lista: deciso esplicitamente.
- Su Impostazioni la barra è **coperta dal pannello**: la navigazione è sospesa finché il
  pannello è aperto. Su Importa nessuna voce è attiva.

### Marchio
Griglia **3 colonne × 2 righe, sei caselle**, nell'**ordine fisso** arancio (dispensa), azzurro
(latticini), verde (ortofrutta), lilla (surgelati), giallo (cereali), corallo (macelleria). Ogni
casella sempre nel colore della sua area, bordo 2 px dello stesso colore: **piena** = in
quell'area non manca niente; **contornata** = manca qualcosa. Mai grigia.

- In **tab bar**, come icona della Lista: lato **9**, gap 4, raggio **2,52**, bordo 2.
- Nelle **rese grandi** (copertine, schede di sistema): lato 16 o 20, gap 4, raggio
  `lato × 0,28`.
- Solo la Lista passa le aree mancanti; altrove il Marchio è pieno.

### Dock
**Nuovo il 19/09, generalizzato il 20/09.** Il fondo schermo è occupato dalla tab bar
flottante: il tasto primario non ha più il suo posto in coda al contenuto. Il Dock è quel posto.

- **Cos'è:** un contenitore **a portata di pollice, sopra la tab bar**, che porta l'azione
  principale della schermata e **si restringe con la barra**. Non scorre: sta fermo sopra il
  contenuto, opaco, e il contenuto gli passa dietro.
- **Posizione:** `left/right 16`; `bottom` **114** a barra grande (84 + 22 di distacco + 8 di
  respiro) e **96** a barra ridotta (66 + 22 + 8). La transizione è `bottom 200ms
  cubic-bezier(.2,.8,.25,1)`, la stessa `.anim-barra`.
- **Due forme, una regola:**
  - **A una riga** (Dispensa): nessun contenitore, i controlli sono pillole alte **56** che
    galleggiano direttamente sul fondo, raggio 999, `--ombra-nav`, gap 8.
  - **A due righe** (Lista, Piano, Importa: dove c'è un primario e un selettore): contenitore
    bianco raggio **22**, padding 8, gap 8, `--ombra-nav`; sopra il selettore (segmento a
    blocco, 46), sotto il **tasto primario** a larghezza piena (54, raggio 18). Altezza
    risultante **124**.
- **Cosa ci vive:** `HAI PRESO TUTTO` (Lista), `CONFERMA E CREA LA LISTA` (Piano), `HO FINITO`
  (Importa, sopra l'anteprima è la Banda dei comandi a farlo), il primario di ogni stato vuoto,
  `Fai una modifica` e il vocale (Dispensa).
- **Accesso:** il Dock non è una barra di navigazione, non prende `role` propri; i suoi
  controlli sono tasti normali con nome accessibile. Bersagli ≥ 44 sempre.
- **Quando il primario non deve esistere** (in Lista compare solo a lista davvero finita) il
  Dock resta con la sola riga del selettore: non si mostra un primario spento.

### Tasti
Altezza **54**, raggio **18**, mono 12/700/0.09em maiuscolo, larghezza piena o `flex: 1` in
coppia.

- **Primario** — fondo `--ink`, testo bianco, bordo 1 px `--ink`, `--ombra-tasto`. Uno per
  schermata, nel Dock.
- **Secondario** — fondo bianco, testo `--ink`, bordo 1 px `--bordo`, nessuna ombra. Sopra
  l'anteprima fotocamera il bordo diventa bianco al 62% e il testo bianco.
- **Spento** — fondo `rgba(20,22,58,0.10)`, testo `--ter`, bordo trasparente, `disabled` nativo.
- **Distruttivo** — primario pieno in `--errore`, stesse misure, **solo** dentro un dialogo di
  conferma a due tasti accanto ad ANNULLA secondario.
- **Aggiungi tratteggiato** — alto **56**, raggio 14, bordo 2 px tratteggiato
  `rgba(20,22,58,0.20)`, nessun fondo, mono 11/700/0.08em con un più da 16 px. Sta **in cima**
  alla lista che popola (`Nuovo piatto`), non in fondo.

### Pillole d'azione
Disegno 38 px (44 nei SÌ/NO), raggio 999, mono 11/700/0.08em maiuscolo, `padding 0 15px`.
**Area di tap sempre 44 px.** Attiva: fondo `--ink`, testo bianco. Inattiva: bianco, testo
`--sec`, bordo 1 px `rgba(20,22,58,0.09)`.

### Segmento a blocco
Rettangoli `flex: 1`, alti 46, raggio 14, gap 7, mono 11/700/0.08em maiuscolo; stessi colori
delle pillole. Un attivo alla volta, `aria-pressed`. Nel Dock della Lista porta `BASE` e
`TOP-UP` col loro contatore.

### Tessera widget di sezione
**Nuova il 19/09 (variante 1 delle cinque).** Ogni sezione merceologica della Lista è una
superficie propria, non una sequenza di tessere sciolte.

- **Anatomia:** `margin: 0 12px 12px`, fondo bianco, raggio **22**, bordo 1 px `--bordo`,
  `--ombra-pannello`, padding `14 / 12 / 12`, gap interno 12. Dentro, in ordine: etichetta di
  sezione con quadratino d'area e contatore, griglia di tessere a 2 colonne gap 8, eventuali
  righe di controllo dell'area.
- **La tessera accesa dentro il widget perde il fondo bianco** e resta tenuta dal solo bordo 1
  px nel colore d'area al 45%: il bianco non si ripete due volte. La protagonista e la spenta
  non cambiano.
- **Stati:** nessuno. Non collassa, non si sposta, non ha controlli propri: è un involucro.
- **Perché serviva:** raggruppare per area a colpo d'occhio senza colorare il fondo (che è il
  quinto uso del colore, riservato alla Dispensa).

### Tessera della Lista
Griglia a due colonne, gap 8, altezza minima 104. La **prima voce non spuntata di ogni area è
"protagonista"**: due colonne (`span 2`), fondo pieno nel colore dell'area, nome a 25 px,
raggio 18, padding `13px 16px 14px`. Le altre: raggio 14, padding `12px 14px 13px`.

Anatomia dall'alto: pillola delle confezioni (mono 10.5/700/0.07em, raggio 999, padding
`5px 10px`) + quantità totale in mono 10, poi il nome 17/700/-0.032em, poi il dettaglio
facoltativo "serve X · in casa Y" in mono 8.5.

- **Accesa** (da prendere) — dentro un widget: fondo trasparente, bordo 1 px nel colore d'area
  al 45%. Fuori da un widget: fondo bianco con `--ombra-tessera`.
- **Spenta** (presa) — fondo `--spento`, bordo trasparente, nome barrato a `rgba(20,22,58,0.34)`
  con tratto 1,6 px, nessuna ombra, nessun dettaglio.

Il tap sulla tessera intera è l'interruttore: `aria-pressed` porta lo stato, `aria-label` dice
cosa fa il tap.

### Riga di controllo
"Olio: ne hai ancora?" dentro il widget della sua area. Fondo colore d'area al 26%, raggio 18,
padding `14px 15px`. Nome 16/700/-0.024em, sotto una riga mono 8.5/0.11em con la cadenza
(`controllo ogni 4 settimane` — la cadenza è configurabile, non più fissa a 90 giorni). A
destra due pillole bianche `Sì` / `No` da 44, min-width 52, gap 7, ognuna col suo `aria-label`
("Sì, hai ancora {nome}" / "No, comprane una confezione di {nome}"). Mentre la risposta è in
volo: opacità 0,5 e `disabled`.

### Riga pasto
Raggio 18, fondo bianco con bordo 1 px `rgba(20,22,58,0.09)` a casa, fondo
`rgba(20,22,58,0.045)` con bordo trasparente fuori casa. Tre zone, larghezze non negoziabili:

1. **Casetta 60 px** a sinistra — toggle casa/fuori con `aria-pressed`, casetta 32 con icona 17.
   A casa: piena `--ink` con `--ombra-casetta`. Fuori: bianca con contorno grigio.
2. **Corpo** — apre il piatto, `aria-label="Apri {piatto}"`. Nome del pasto in mono
   9/700/0.13em maiuscolo, nome del piatto 17.5/700 troncato con ellissi, sottotitolo mono 9,
   avvisi di scadenza 12/600 in `--ink-2`, pallini delle aree 8×8 raggio 2.6.
3. **Destra 44 px** — kebab (apre il foglio, `aria-label="Altre azioni su {piatto}"`) o chevron
   (va a Scegli), in `--icona-spenta`.

### Riga piatto
**Nuova il 19/09.** L'elenco dei Piatti è una lista di righe, non una griglia di schede.

- **Anatomia:** minimo **68**, raggio 14, fondo bianco, bordo 1 px `rgba(20,22,58,0.09)`,
  `--ombra-pannello`. Corpo `flex: 1`, padding `12 8 12 14`, gap 3: nome 17/700/-0.03em con
  ellissi su riga singola, sottoriga mono 9/500/0.08em in `--ter` (`2 porzioni · 7
  ingredienti`), pallini d'area 8 px raggio 2,6. Zona destra **44** col chevron in
  `--icona-spenta`.
- **Un solo bersaglio:** tutta la riga apre il piatto, `aria-label="Apri {piatto}"`. Il chevron
  è decorativo.
- **Non porta** la fonte del piatto né il pasto: un piatto non appartiene a un pasto.

### Striscia dei giorni
Sette riquadri `flex: 1`, gap 3, raggio 14, padding `9px 0 10px`, `--ombra-pannello`. Dentro:
sigla del giorno mono 8.5/700/0.08em in `--ter`, numero 15/800, e sotto un pallino da 5 px per
pasto (pieno se quel pasto è a casa e ha un piatto). **Quattro stati**, indipendenti:
riposo · **selezionato** (fondo `--ink`, testi bianchi, ombra `0 2px 6px rgba(20,22,58,.20)`) ·
**oggi** (`inset 0 0 0 3px --ink`, vale anche se oggi non è selezionato) · **oggi e selezionato**
(`inset` 3 px bianco più `inset` 4,5 px `--ink`). `aria-pressed` e `aria-label` "Venerdì 18,
domani, 3 pasti a casa, selezionato".

### Pannello impostazioni
**Nuovo il 19/09.** Le Impostazioni **non sono una schermata**: sono un pannello che esce dal
Menù utente.

- **Anatomia:** ancorato `top 76`, `left/right 16`, `bottom 22`, raggio **22**, fondo `--fondo`
  **pieno**, bordo **1,5 px `--ink`**, `--ombra-alta`. Velo dietro `rgba(20,22,58,0.55)`: il
  resto dell'app si scurisce parecchio ma resta visibile. Il velo è `data-chiudi` come la X.
- **Testata del pannello:** titolo di dettaglio 32/800 (`Impostazioni`) e tondo 44 su
  `rgba(20,22,58,0.07)` con la X, `aria-label="Chiudi le impostazioni"`. Fissa, non scorre.
- **Corpo:** scorrevole, gap 12, fatto di **Blocchi di gruppo** — bianco, raggio 18, bordo 1 px
  `--bordo`, padding `12 / 12 / 10`, `--ombra-pannello` — ognuno titolato da un'etichetta di
  sezione.
- **Piede:** riga di versione in mono, `Versione 2.0.4 · ultimo salvataggio il 18/09/2026 alle
  9:12`.
- **Sotto-schermate.** **[deciso 20/09]** Il pannello non è un menù piatto: le funzioni che
  hanno un contenuto proprio vivono in **sotto-schermate dello stesso pannello**, raggiunte da
  una riga di impostazione col suo valore e il chevron, e lasciate con la freccia al posto della
  X (`aria-label="Torna alle impostazioni"`). Le sotto-schermate previste, tutte **nel
  prodotto** e nessuna tolta:
  `Pasti a casa` (la matrice del default) · `Gestione dei pasti` (nome, aggiunta, rimozione,
  riordino: da 3 a 6) · `Rotazione del piano` (nessuna / 2 / 3 / 4 settimane, contatore del
  ciclo, riparti dalla settimana 1 con la sua conferma) · `Casa condivisa` (crea un codice,
  entra con un codice, membri, esci dalla casa, nelle tre varianti di ruolo) ·
  `Ingredienti` (il repertorio) · `Ordine delle aree` · `Importa un piano`.
- **La riga `Esci` resta, ed è spenta.** **[deciso 20/09]** Il logout non esiste ancora: la riga
  sta nel gruppo Account come voce `disabled` con opacità 0,5, e non si finge un'azione che il
  sistema non sa fare. Si accende quando il logout c'è.
- **Il pannello copre la tab bar**, di proposito: finché è aperto non si naviga.

### Riga di impostazione
**Nuova il 19/09.** Minimo **56**, raggio 14, senza fondo proprio, dentro un Blocco di gruppo.
Nome 15/700/-0.024em, nota 12,5 in `--testo-2`. A destra **uno di quattro finali**:

1. **valore + chevron** — valore in mono 11/700 maiuscolo: la riga apre una sotto-schermata;
2. **coppia `Sì` / `No`** da 44, `aria-pressed`;
3. **campo numerico** 78 × 44 con l'unità in mono 10;
4. **niente** — la riga è un'azione (`Esporta i tuoi dati`, `Cancella la dispensa`, `Esci`).

**Niente switch**, in nessuna forma.

### Matrice dei pasti
**Nuova il 19/09, riorientata il 20/09.** Dice con quali pasti nasce ogni settimana nuova.
Acceso = a casa.

- **Orientamento [deciso 20/09]: i pasti in riga, i giorni in colonna.** Il prodotto ammette
  **da 3 a 6 pasti**: con i pasti in colonna, a sei pasti le celle scendevano a ~36 px, sotto i
  44. Con i pasti in riga il numero di pasti fa crescere l'altezza, che scorre, e la larghezza
  resta quella dei sette giorni.
- **Misure:** il nome del pasto sta su **riga propria** sopra le sue sette celle (etichetta di
  sezione mono 10), e la matrice occupa la **larghezza interna piena del pannello** — 334 px,
  senza Blocco di gruppo attorno. Sette celle `flex: 1`, gap 4, alte **44** → **44,28 px** di
  lato: `(334 − 6 × 4) / 7`. Raggio 14. Sopra le celle, la fila delle sigle dei giorni in mono
  8.5/700/0.08em in `--ter`.
- **Stati:** accesa = fondo `--ink` pieno col pallino bianco e `--ombra-casetta`; spenta =
  bianca, bordo 1 px `--bordo`, pallino grigio. `aria-pressed`, `aria-label="Lun colazione: di
  base a casa, tocca per mettere fuori casa"`.
- **Nessuna cella sotto 44 px, in nessuna delle due dimensioni.** Se un giorno la larghezza non
  bastasse più, la matrice scorre in orizzontale: non si rimpiccioliscono le celle.
- Sotto, la nota: `Acceso vuole dire a casa. Ogni settimana nuova nasce così: nel Piano puoi
  correggere il singolo giorno senza cambiare questo default.` e il riepilogo che si ricalcola.

### Tessera di dispensa
**Nuova il 19/09.** Griglia 2 colonne gap 8, minimo **104**, raggio **14**, padding
`12 / 14 / 13`.

- **In casa:** fondo **colore d'area al 26%**, nessuna ombra, nessun bordo. In alto la pillola
  della quantità in mono **10,5/700/0.07em** su **bianco**, raggio 999, padding `5 / 10`. In
  basso il nome 17/700/-0.032em. Sotto, se serve, una seconda pillola bianca raggio 999 padding
  `4 / 9` con una riga mono 8,5: `Scade il 22/09` in `--avviso` o `Congelato` in `--freddo`.
  **Le righe semantiche vivono su pillola bianca perché sulla tinta al 26% scenderebbero sotto
  4,5:1** (§2.2).
- **Finita:** nessun fondo, **bordo 2 px tratteggiato** `rgba(20,22,58,0.20)`, pillola `Finito`
  in `--testo-2`, nome barrato.
- Tutta la tessera è l'interruttore, `aria-pressed`. La presenza si legge da **tinta e testo**,
  mai da una barra di livello né da un pallino.

### Foglio del Dock della Dispensa
**[deciso 20/09]** Il dock `Fai una modifica` apre un **foglio dal basso con tre vie**, e
**nessuna funzione attuale si perde**:

1. **A mano** — campo del residuo con l'unità, interruttore del **congelatore**, e i **Pronti**
   (porzioni, freezer/frigo, elimina).
2. **Con una nota** — un testo scritto oppure un vocale; il vocale usa lo stato "Registro".
3. **Scansione** — la fotocamera sulla confezione.

Il foglio è un Foglio dal basso normale (raggio `22px 22px 0 0`, overlay 0,35, voci ≥ 50): le
tre vie sono le sue tre voci, e ognuna apre la propria vista. Il dock a una riga tiene
`Fai una modifica` (pillola bianca 56, matita 18 a tratto 2,1, mono 11/700/0.08em) e il tondo
**56** pieno in `--ink` col microfono 22, `aria-label="Registra un vocale"`.

### Stato "Registro"
**Nuovo il 19/09.** Pillola `--ink` alta 56: metro a **quattro barre** larghe 3 px (§7
`.anim-registro`), riga mono `Registro…` in bianco, tempo `0:07` in mono 11/500 a
`rgba(255,255,255,.62)` con `tabular-nums`, e lo `stop` 44 bianco col quadrato 14 raggio 4 in
`--ink`. `role="status"`.

### Tasto di scatto
**Nuovo il 19/09.** Anello **76**, raggio 999, `border: 2px solid #fff`, fondo **trasparente**;
dentro un disco **bianco 62**. Nessuna icona, nessuna etichetta;
`aria-label="Scatta la foto del foglio"`. Premuto: anello `scale(.96)`, disco `scale(.88)`, 180
ms `cubic-bezier(.2,.8,.25,1)`. `:focus-visible` outline 2 px bianco con offset 4;
`prefers-reduced-motion: reduce` annulla transizione e trasformazione. **È bianco su bianco**,
non in `--ink`: vive sopra l'anteprima della fotocamera, dove l'inchiostro spariva.

### Banda dei comandi
**Nuova il 19/09.** La barra di comandi che sta **sopra l'anteprima della fotocamera**.
`left/right/bottom 0`, raggio `22px 22px 0 0`, fondo `rgba(20,22,58,0.72)`, padding `20 / 16 /
26`, gap 12, `z-index 2`. Riga dello scatto: due lati `flex: 1` e il tasto di scatto al centro;
a sinistra la Striscia dei fogli presi, a destra `Ho finito` come **pillola bianca** alta 44
(mono 11/700/0.08em) — non il primario pieno, che su fondo scuro sparirebbe. Sotto: il dettaglio
dell'ultimo scatto su riga propria, poi `Seleziona dalla galleria`, alto almeno 50, raggio 18,
bordo 1,5 px bianco al 62%. Tutti i testi in bianco pieno.

Ogni flusso che passa da qui ha **una via d'uscita dichiarata**: il primario va avanti, la
freccia abbandona.

### Striscia dei fogli presi
**Nuova il 19/09.** Dice quanti fogli sono già stati fotografati, dentro la Banda dei comandi.
Miniatura **44** raggio 14 bianca con le righe finte (`repeating-linear-gradient`, 2 px ogni 7,
`rgba(20,22,58,.14)`) e il contatore `2 fogli` in mono 10/700/0.11em. Tocco = apre la vista
**Rivedi i fogli presi**, dove ogni foglio è una tessera **62 × 80** raggio 14 bianca, bordo 1
px `rgba(20,22,58,0.09)`, `--ombra-nav`, numero in mono 10, X con disegno 20 e **bersaglio 44**
sporgente. Oltre quattro fogli la fila **scorre in orizzontale**, non si impila.

### Stato vuoto
Scheda da 22 centrata verticalmente; dentro, in colonna e centrati: quadrato 46 px raggio 14
con bordo 2 px tratteggiato e un'icona spenta dentro; titolo 21/800; testo 14/lh 1.5 in
`--testo-2`, largo al massimo 30ch. **Il tasto primario dello stato vuoto sta nel Dock**, non
dentro la scheda: è l'azione della schermata. (Lista e Piano vuoti rimandano a Piatti.) Mai una
pagina bianca.

### Campo di testo
Altezza 44, raggio 14, padding `0 14px`, fondo bianco, bordo 1 px `--bordo`, `--ombra-pannello`,
testo 14. Etichetta sopra in mono 10/700/0.16em maiuscolo, gap 7. **Modalità ricerca:** nessuna
etichetta sopra, la lente 18 dentro a sinistra, il segnaposto che è anche `aria-label`
(`Cerca un piatto o un ingrediente`). Campo numerico: largo 68–96 (78 nelle Impostazioni),
testo mono 14/700 a destra, unità in mono 10 `--ter`. Textarea: raggio 14, `resize: none`.
Errore: nota 12.5 in `--errore` sotto il campo.

### Foglio dal basso
`role="dialog"` con `aria-label` che dice il contesto. Overlay `rgba(20,22,58,0.35)`, foglio
bianco ancorato in basso, raggio `22px 22px 0 0`, padding `16px 16px 26px`, gap 9. Voci alte
almeno 50 (mai sotto 44), raggio 14, fondo `rgba(20,22,58,0.04)`, testo 15.5/700 centrato.
Separatori di sezione in mono 10/700/0.13em. Classe `.anim-foglio`. Il tap sull'overlay chiude.

### Scheda
Bianco, raggio 22, bordo 1 px `--bordo`, padding 16 con contenuto, `26px 20px` negli stati
vuoti. Ombra solo se è una superficie flottante o una Tessera widget: `--ombra-pannello`.

### Etichetta di sezione
Mono 10/700/0.16em maiuscola, in `--ink` quando titola un gruppo. A destra, il contatore in
mono 10/500/0.10em in `--sec` (`4 voci`, reso maiuscolo dal `text-transform`). Davanti alle
sezioni della Lista, un quadratino 10×10 raggio 4 nel colore dell'area.

### Messaggi
Nessun toast, nessuna snackbar, nessun banner colorato: lo stato si legge dove sta il dato.

- **Errore** — `<p>` 12.5 in `--errore`, margine `0 4px`.
- **Avviso in linea** — 11.5 in `--avviso`, con `aria-live="polite"`.
- **Nota** — 12.5 in `--testo-2`: spiega la provenienza di un numero o il perché di un default.
- **Riga di stato** — 12.5 in `--testo-2`, sopra il contenuto ("Sei offline: la lista è quella
  dell'ultima apertura.").
- **Caricamento** — una sola riga mono `CARICO…` in `--sec`, al posto del contenuto, sotto la
  testata che è già disegnata. Nessuno spinner, nessuno scheletro.

---

## 9. Pattern

**Gesti.** Tap sulla card = apre. Cambiare stato ha sempre un controllo suo (casetta, pillola,
cella). Eccezioni dichiarate: la tessera della Lista e la Tessera di dispensa sono esse stesse
l'interruttore. **Nessuno swipe, nessun long-press.** Lo **scorrimento** è un gesto con un
effetto dichiarato: restringe la tab bar e abbassa il Dock (§7).

**Dove sta l'azione principale.** Nel **Dock**, sopra la tab bar. Non in coda al contenuto: il
fondo schermo è della barra.

**Conferme.** Ogni azione distruttiva o non reversibile passa da un dialogo a due tasti: il
distruttivo pieno in `--errore`, ANNULLA secondario accanto. Le azioni reversibili non chiedono
niente e si annullano rifacendo il gesto.

**Feedback di scrittura.** Lo stato si mostra sul controllo (opacità 0,5 e `disabled` mentre è
in volo) e la conferma è il cambio di stato del dato, non un messaggio. In caso di errore, un
messaggio in `--errore` e un RIPROVA.

**Caricamento.** Riga mono `CARICO…` in `--sec`. Niente spinner, niente scheletro.

**Stati vuoti.** Ogni lista vuota dice **perché** è vuota e qual è la prossima azione, col
primario nel Dock.

**Offline.** La Lista si legge sempre dall'istantanea locale; una riga di stato lo dice; le
spunte si accodano e non si perdono. Le altre pagine possono fallire, la Lista no.

**Una via d'uscita per flusso.** In ogni flusso a passi il primario va avanti e la freccia
abbandona, e sono entrambi visibili.

**Dark mode.** Fuori scope. I token esistono, il tema scuro no.

---

## 10. Copy

- **Etichette e tasti** in maiuscolo mono, verbo all'imperativo o sostantivo secco: CONFERMA E
  CREA LA LISTA, ESTRAI LA DIETA, HO FINITO, SCANSIONA, SALVA, HAI PRESO TUTTO.
- **Titoli di schermata** in sentence case: `Lista`, `Piano`, `Piatti`, `Dispensa`,
  `Impostazioni`.
- **Frasi** in sans, del tu, senza esclamativi, senza "per favore", senza corporate speak. Il
  copy spiega la causa: "Calcolato da spesa e piano: correggi solo se non torna con la realtà".
- **Numeri** esatti con unità: "1250 g", "2 confezioni", "3 pasti a casa". Plurali corretti
  (1 voce / 2 voci). Date in italiano ("il prossimo dal 12/09/2026").
- **Vietati**: claim di salute, "risparmia", qualunque cifra in euro senza un prezzo dato
  dall'utente. Il risparmio si chiama "non hai ricomprato".
- **Un errore dice cosa fare**, non cosa è successo: "il PDF non si apre: prova con le foto".

---

## 11. Accessibilità

- Ogni controllo ha un nome: testo visibile o `aria-label`.
- `aria-pressed` su ogni toggle e ogni segmento; `aria-expanded` sul Menù utente;
  `role="dialog"` con nome su ogni foglio e sul Pannello impostazioni; `role="status"` sul
  Registro.
- Bersagli ≥ 44 px anche quando il disegno è più piccolo: l'area trasparente sporge.
- Le etichette della tab bar ridotta sono invisibili ma **la voce resta cliccabile** e il nome
  accessibile resta.
- `lang="it"` sul documento.
- Contrasto ≥ 4,5:1 su ogni testo che porta informazione. Su tinta d'area al 26% i semantici
  non reggono: vanno su pillola bianca.
- Nessun contenuto affidato al solo colore: lo stato ha sempre anche una forma (pieno /
  contornato, barrato / non barrato, casetta piena / contornata, tratteggiato / pieno).
- Ogni animazione ha la sua variante `prefers-reduced-motion`.

---

## 12. Cosa non c'è, di proposito

Glassmorphism, ombre colorate, emoji, illustrazioni, foto, avatar, toast, snackbar, banner
colorati, onboarding a quiz, paywall, badge "novità", contatori animati, conferme a un tap per
azioni distruttive, swipe nascosti, long-press, spinner, scheletri, dark mode, caratteri sotto
8,5 px, checkbox, switch.

**I gradienti non sono più in questo elenco:** il fondo della schermata è a gradiente (§2.4).
Restano vietati i gradienti **sugli oggetti** — nessuna superficie, nessun tasto, nessuna
tessera ha un gradiente.

---

## 13. Le decisioni

### Decisioni del 17/09/2026

Prese da Andrea su una pagina visiva dove ogni alternativa era resa, non descritta.

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

### Decisioni del 19–20/09/2026

Prese in Claude Design sulle schermate rese (19/09) e sulle sette domande aperte dell'analisi
(20/09). Sono già incorporate nelle sezioni qui sopra.

| # | Tema | Decisione | Dove |
|---|---|---|---|
| 9 | Fondo della schermata | **gradiente** a quattro fermate `#EDECEA → #F2F1EF → #F8F8F7 → #FCFCFB`; unica eccezione l'anteprima fotocamera; nessun gradiente sugli oggetti | §2.4, §12 |
| 10 | Ombre | **sei**: le tre della v2 più `--ombra-pannello`, `--ombra-nav`, `--ombra-alta`, a due strati | §5 |
| 11 | Scorrimento sotto la barra | maschera sul contenitore, `--fine` **128** a barra grande e **110** a barra piccola | §7 |
| 12 | Tab bar | pillola **flottante** con i nomi, altezza **84** / ridotta **66**, icone 26 piene, voce attiva a 0,07; ordine **Lista · Piano · Piatti · Dispensa** | §8 Tab bar |
| 13 | Icona della Lista | **il Marchio**, griglia **3 × 2**, lato 9, gap 4, raggio 2,52, bordo 2, ordine fisso delle aree | §8 Marchio |
| 14 | Testata | l'ingranaggio esce, entra il **Menù utente** con l'iniziale (variante E ingrandita: 81 × 50, tondo 38, mono 16) | §8 Menù utente |
| 15 | Nome della seconda sezione | **Piano**, non Settimana; la settimana è il periodo e lo dice la pillola | §8 Tab bar |
| 16 | Titoli di schermata | **sentence case** (`Lista`, `Piano`, `Piatti`, `Dispensa`, `Impostazioni`) | §3, §10 |
| 17 | Sezioni della Lista | **Tessera widget di sezione** (variante 1): scheda bianca 22, tessere accese senza fondo | §8 |
| 18 | Piatti | nessuna divisione pranzo / cena; ricerca estesa agli ingredienti; `Nuovo piatto` tratteggiato in cima; **Riga piatto** | §8 |
| 19 | Dispensa | tessere in **tinta d'area al 26%** (quinto uso del colore), presenza da tinta e testo, dock a portata di pollice | §2.3, §8 |
| 20 | Impostazioni | **pannello** chiaro con bordo 1,5 px `--ink` e velo 0,55, non una schermata; blocchi di gruppo; riga di impostazione senza switch | §8 |
| 21 | Fotocamera | anteprima a tutto schermo, **Banda dei comandi** a 0,72, **tasto di scatto 76/62 bianco** su anello bianco | §8 |
| 22 | Tasti primari senza posto | **[20/09]** vanno nel **Dock**: componente condiviso sopra la tab bar, che si restringe con lei (`HAI PRESO TUTTO`, `CONFERMA E CREA LA LISTA`, `HO FINITO`, i primari degli stati vuoti) | §8 Dock |
| 23 | Dock della Dispensa | **[20/09]** apre un **foglio dal basso con tre vie**: a mano (residuo, congelatore, Pronti), con una nota (testo o voce), scansione. **Nessuna funzione attuale si perde** | §8 Foglio del Dock |
| 24 | Funzioni delle Impostazioni | **[20/09]** casa condivisa, rotazione del piano, gestione dei pasti, ingredienti, reparti e importa **restano nel prodotto**, in **sotto-schermate** del pannello. La riga `Esci` resta ma è **spenta** | §8 Pannello |
| 25 | Matrice dei pasti | **[20/09]** **pasti in riga, giorni in colonna**, da 3 a 6 pasti, celle mai sotto 44 px (44 × 44,28 sulla larghezza piena del pannello) | §8 Matrice |
| 26 | Marchio in barra | **[20/09]** è **3 × 2**, non 3 × 3: vincono i file | §8 Marchio |
| 27 | `--fine` | **[20/09]** vale **128** a barra grande, non 140: vincono i file | §7 |
| 28 | Tasto di scatto | **[20/09]** **76 / 62 bianco**, non 72 / 52 in `--ink`: vincono i file | §8 |

### Decisioni del 20/09, secondo giro

- **Niente più Base e Top-up.** La Lista è una sola, sezioni per area nell'ordine dei reparti.
  Il selettore `BASE` / `TOP-UP` sparisce dalla presentazione; il flag `deperibile` resta nel
  dominio per decadimento e scadenze. Il **Dock è a una riga sola**: la forma a due righe
  descritta in §8 per la Lista decade.
- **Chiusura della spesa, decisa (opzione b).** Il Dock della Lista mostra `HAI PRESO TUTTO` **solo
  a lista tutta spuntata** e senza controlli in sospeso; porta al traguardo (`/lista/fatta`: non
  ricomprato, `CONFEZIONI DIVERSE? SCANSIONA`, `CHIUDI LA SPESA` irreversibile). Due passi, come
  oggi. A lista non finita il Dock della Lista non esiste: la coda di scorrimento è 140.
