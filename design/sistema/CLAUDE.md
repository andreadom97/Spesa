# Spesa — decisioni prese in questo progetto

`DESIGN.md` resta la fonte di verità del sistema, **ora alla v3 del 20/09/2026**. Questo file
registra le **scelte fatte insieme ad Andrea dopo l'approvazione del 17/09/2026**: il ridisegno
del 19/09 in Claude Design e le risposte del 20/09. Tutte e sole queste voci sono già scritte in
`DESIGN.md` v3 (vedi in fondo): quando una schermata nuova parte, parte da questi valori — non
si riaprono, salvo richiesta.

Le tre incoerenze fra i file HTML e la scheda di decisione, trovate dall'analisi del 19/09, sono
**corrette qui a favore dei file**: Marchio **3 × 2**, `--fine` **128**, tasto di scatto
**76 / 62 bianco**.

## Cornice e sfondo

- Cornice **393 × 852**, raggio 26, `overflow: hidden`.
- Sfondo della schermata: **gradiente verticale** `#EDECEA 0% → #F2F1EF 34% → #F8F8F7 70% →
  #FCFCFB 100%`. Non è più il fondo carta piatto: in alto grigio tenue, in basso quasi bianco
  ma mai bianco puro. (Variante E, scelta al primo giro.)
- Ombre in uso, oltre alle tre della v2:
  - `--ombra-pannello: 0 1px 2px rgba(20,22,58,.05), 0 6px 16px rgba(20,22,58,.06)` — tessere e widget.
  - `--ombra-nav: 0 2px 6px rgba(20,22,58,.08), 0 12px 30px rgba(20,22,58,.16)` — tab bar, dock, menù utente, chrome sopra la fotocamera.
  - `--ombra-alta: 0 8px 24px rgba(20,22,58,.28), 0 26px 64px rgba(20,22,58,.26)` — pannello impostazioni.

## Scorrimento sotto la barra

Il contenuto **passa dietro la tab bar** e sfuma: nessun taglio netto.

```css
.scroll{mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - var(--fine)),
  rgba(0,0,0,.55) calc(100% - 74px), rgba(0,0,0,0) calc(100% - 30px))}
```

`--fine` vale **128px** a barra grande e **110px** a barra piccola. (Corretto il 20/09: la
scheda diceva 140, nessun file lo scriveva; valgono i file.)

## Tab bar (versione B, con i nomi)

- Pillola bianca, `left/right: 16`, `bottom: 22`, **altezza 84**, raggio 999, padding 6, gap 2.
- Voci `flex: 1`, alte 72, colonna, `gap: 4`, raggio 999; attiva su `rgba(20,22,58,.07)`.
- Icone **26**, spente `#9A9AA6`, accesa `--ink`. Etichette mono **8,5 / 0,12em**, spente
  `--off`, accesa `--ink` a 700.
- **Scorrendo giù la barra rimpicciolisce**: altezza **66**, voci 54, `left/right: 46`, le
  etichette vanno a `max-height: 0; opacity: 0` ma restano cliccabili. 200 ms,
  `cubic-bezier(.2,.8,.25,1)`.
- **Centratura**: le voci sono `flex: 1` e il contenuto è centrato dentro la voce; il segno sta
  in uno `.segno` a **altezza fissa 26**, così icone e Marchio hanno la stessa linea di base e
  i quattro nomi sono allineati fra loro.
- Ordine: **Lista · Piano · Piatti · Dispensa**.
- **L'icona della Lista è il Marchio**: griglia **3 × 2** — tre colonne, due righe, sei caselle
  — lato 9, gap 4, raggio 2,52, bordo 2 px nei sei colori d'area, nell'**ordine fisso** arancio
  (dispensa), azzurro (latticini), verde (ortofrutta), lilla (surgelati), giallo (cereali),
  corallo (macelleria). Quattro caselle piene, due contornate, secondo cosa manca. Deciso
  esplicitamente: non sostituirlo con un'icona di lista. (Corretto il 20/09: la scheda diceva
  «3 × 3 di caselle contornate»; valgono i file.)

## Nomi delle schermate

La seconda sezione si chiama **Piano**, non Settimana: è la pianificazione dei pasti. La
settimana resta il periodo e lo dice la pillola sotto il titolo ("Settimana del 14").

## Menù utente in testata (variante E ingrandita)

Tondo in alto a destra con **l'iniziale dell'utente**, non ingranaggio né burger. Pillola alta
50, fondo `rgba(20,22,58,.07)`, tondo 38 in `--ink`, iniziale in mono 16 maiuscolo bianca,
kebab 20 px, larghezza 81. Scartati: burger pieno, burger senza sfondo, ingranaggio.

## Lista — sezioni come widget (versione 1)

Ogni sezione merceologica è una **tessera bianca**: `margin: 0 12px 12px`, raggio 22, bordo
1 px `--bordo`, `--ombra-pannello`, padding 14 / 12 / 12, gap 12. Cappello con quadratino
d'area e contatore, righe dentro. Dentro il widget la tessera accesa **perde il fondo bianco**
e resta tenuta dal filo d'area al 45%.

## Piatti (versione 5)

- **Nessuna divisione pranzo / cena**: lista unica.
- Ricerca: segnaposto **"Cerca un piatto o un ingrediente"** — si cerca anche dentro i piatti.
- **"+ Nuovo piatto"** a larghezza piena in cima alla lista, non un selettore.

## Dispensa (versione 3 + dock della 5)

- Tessere per prodotto, **colore d'area** come fondo in tinta al 26% della tessera: è lì che i
  sei colori portano informazione.
- Presenza indicata da tinta e testo, **non** da barra né pallino.
- In basso, **dock a portata di pollice** col tasto **"Fai una modifica"** (testo) e il tasto
  vocale; registrando, animazione di livello che dice che sta ascoltando.
- Le sottoscritte di scadenza usano la classe **`scadenza`**, mai `scad` (viene filtrata
  dall'ambiente di resa e sparisce).

## Impostazioni — pannello chiaro

- **Non una schermata**: un pannello che esce dal tondo utente in alto a destra.
- Fondo **chiaro e pieno**, bordo **1,5 px `--ink`**, raggio 22, `--ombra-alta`. Dietro, il
  resto dell'app si **scurisce parecchio** ma resta visibile (velo `rgba(20,22,58,.55)`).
- Dentro, **blocchi tipo widget** raggruppati.
- Il **default della settimana** è una voce **cliccabile** che porta a una sotto-schermata dove
  si scelgono i pasti fatti a casa: non sporca il menù.

## Fotocamera — Fotografa il piano

- Anteprima **a tutto schermo**; è contenuto del dispositivo, non una superficie di design.
- **Banda semitrasparente** in basso: `rgba(20,22,58,0.72)`, raggio `22px 22px 0 0`,
  padding 20 / 16 / 26, gap 12.
- **Tasto di scatto alla iPhone**: anello **76** con bordo **2 px bianco** e fondo trasparente,
  disco **bianco 62** dentro. Nessuna icona. Alla pressione anello 0,96 e disco 0,88 in 180 ms,
  fermo con `prefers-reduced-motion`. (Confermato il 20/09 contro la variante 72 / 52 in
  `--ink` del foglio a cinque versioni: vale il bianco su bianco.)
- Riga dello scatto: miniatura 44 + contatore **mono maiuscolo** a sinistra, scatto al centro
  (due lati `flex: 1`), **HO FINITO** a destra come pillola bianca — non il primario pieno, che
  su fondo scuro sparirebbe. Sotto: dettaglio dell'ultimo scatto su riga propria, poi
  **SELEZIONA DALLA GALLERIA**.
- Cornice guida: inset 88 / 40 / 268, quattro angoli 30 × 30, tratto 3 px bianco al 92%.
- Ogni flusso ha **una via d'uscita dichiarata**: il primario va avanti, la freccia abbandona.

## Movimento

150–250 ms, `cubic-bezier(.2,.8,.25,1)`, mai senza un gesto, mai ingressi di pagina o cascate.
Ogni prototipo porta la variante `prefers-reduced-motion`. Unica animazione in loop: il metro
dello stato "Registro", che dura quanto la registrazione e finisce col gesto di stop.

## Decisioni del 20/09

Le cinque risposte di Andrea alle domande aperte di `ANALISI.md` §6. Valgono come tutto il
resto.

1. **Il foglio del dock della Dispensa ha tre vie, e nessuna funzione attuale si perde.**
   `Fai una modifica` apre un **foglio dal basso** con tre strade: **a mano** (campo del
   residuo, congelatore, i **Pronti**), **con una nota** (testo scritto o voce), **scansione**.
   Campo residuo, fiocco del congelatore, Pronti e nota AI non sono tolti dal prodotto: passano
   da qui.
2. **Le Impostazioni tengono tutto, in sotto-schermate.** Casa condivisa, rotazione del piano,
   gestione dei pasti, ingredienti, reparti e importa **restano nel prodotto** e vanno in
   **sotto-schermate del pannello**, per dare ordine al menù. La riga **`Esci` resta ma è
   spenta**: il logout arriva dopo, e finché non c'è non si finge.
3. **I tasti primari non collocati vanno nel Dock.** `HAI PRESO TUTTO`,
   `CONFERMA E CREA LA LISTA`, `HO FINITO` e i primari degli stati vuoti vivono in un
   **componente condiviso a portata di pollice, sopra la tab bar, che si restringe con lei**.
4. **La matrice dei pasti di default regge da 3 a 6 pasti**: **pasti in riga, giorni in
   colonna**, o comunque **celle mai sotto 44 px**.
5. **I titoli di schermata restano in sentence case**, come nel ridisegno: `Lista`, `Piano`,
   `Piatti`, `Dispensa`, `Impostazioni`.

## Come si consegna

Una schermata per volta. In testa: **numero e titolo dell'inventario** a cui corrisponde. Sotto
ogni schermata: **Misure**, **Componenti usati** in mono, e **Regole di DESIGN.md che tocca** in
`--avviso`. Un componente nuovo si annuncia con `COMPONENTE NUOVO:` — nome, anatomia, stati,
misure, e perché nessuno esistente bastava. Ogni elemento interattivo conserva il nome della
colonna **Elemento** dell'inventario, marcato con `data-elemento="…"`. Bersagli ≥ 44 anche
quando il disegno è più piccolo (area trasparente sporgente).

- **Niente più Base e Top-up (20/09).** La Lista è una sola, per reparto. Il selettore sparisce;
  `deperibile` resta nel calcolo per scadenze e decadimento. Il Dock torna a una riga sola.
- **Chiusura della spesa: aperta (20/09).** `HAI PRESO TUTTO` → traguardo (`/lista/fatta`) con
  non ricomprato, scansione, `CHIUDI LA SPESA` (irreversibile). Da decidere se un solo tasto nel
  Dock apre il traguardo come foglio dal basso.

## Assorbito in DESIGN.md v3 il 20/09

Quello che era «debito verso `DESIGN.md`» non è più debito: è scritto. Dove guardare:

- **§2.4** il gradiente di sfondo come regola, con l'anteprima fotocamera come eccezione.
- **§2.5** la tabella degli alfa dichiarati, 0,72 sulla banda e 0,62 sul bordo bianco compresi.
- **§5** le sei ombre, le due eccezioni di raggio (26 cornice, 2,52 caselle in barra), il bordo
  1,5 px `--ink` come delimitatore di superficie.
- **§3** titoli in sentence case; contatori, unità, quantità e tasti sempre mono maiuscolo;
  mono 16 ammesso solo per l'iniziale del Menù utente.
- **§7** `.anim-barra`, `.anim-scatto`, `.anim-registro` e la maschera di scorrimento.
- **§8** i componenti nuovi: Menù utente, **Dock**, Tessera widget di sezione, Riga piatto,
  Tessera di dispensa, Foglio del Dock della Dispensa, stato "Registro", Pannello impostazioni
  con le sotto-schermate, Riga di impostazione, Matrice dei pasti, Tasto di scatto, Banda dei
  comandi, Striscia dei fogli presi.
- **§13** il registro delle decisioni, con le cinque risposte del 20/09 alle voci 22–25 e le
  tre correzioni alle voci 26–28.

Se una voce di questo file e `DESIGN.md` v3 non concordano, **vince `DESIGN.md`**: qui c'è la
cronaca della decisione, là la regola.
