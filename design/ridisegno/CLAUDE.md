# Spesa — decisioni prese in questo progetto

`DESIGN.md` resta la fonte di verità del sistema v2. Questo file registra le **scelte fatte
insieme ad Andrea dopo l'approvazione del 17/09/2026**: quando una voce qui contraddice
`DESIGN.md`, vale questa, e la regola toccata è elencata in fondo come debito da scrivere.
Ogni nuova schermata parte da questi valori — non si riaprono, salvo richiesta.

## Cornice e sfondo

- Cornice **393 × 852**, raggio 26, `overflow: hidden`.
- Sfondo della schermata: **gradiente verticale** `#EDECEA 0% → #F2F1EF 34% → #F8F8F7 70% →
  #FCFCFB 100%`. Non è più il fondo carta piatto: in alto grigio tenue, in basso quasi bianco
  ma mai bianco puro. (Variante E, scelta al primo giro.)
- Ombre in uso, oltre alle tre di §5:
  - `--ombra-pannello: 0 1px 2px rgba(20,22,58,.05), 0 6px 16px rgba(20,22,58,.06)` — tessere e widget.
  - `--ombra-nav: 0 2px 6px rgba(20,22,58,.08), 0 12px 30px rgba(20,22,58,.16)` — tab bar, menù utente, chrome sopra la fotocamera.
  - `--ombra-alta: 0 8px 24px rgba(20,22,58,.28), 0 26px 64px rgba(20,22,58,.26)` — pannello impostazioni, dock.

## Scorrimento sotto la barra

Il contenuto **passa dietro la tab bar** e sfuma: nessun taglio netto.

```css
.scroll{mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - var(--fine)),
  rgba(0,0,0,.55) calc(100% - 74px), rgba(0,0,0,0) calc(100% - 30px))}
```

`--fine` vale **140px** a barra grande e **110px** a barra piccola.

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
- **L'icona della Lista è il Marchio** (griglia 3 × 3 di caselle contornate, lato 9, gap 4,
  raggio 2,52, bordo 2 px nei sei colori d'area). Deciso esplicitamente: non sostituirlo con
  un'icona di lista.

## Nomi delle schermate

La seconda sezione si chiama **Piano**, non Settimana: è la pianificazione dei pasti. La
settimana resta il periodo e lo dice la pillola sotto il titolo ("Settimana del 14").

## Menù utente in testata (variante E ingrandita)

Tondo in alto a destra con **l'iniziale dell'utente**, non ingranaggio né burger. Bianco, ombra
della barra, iniziale in mono maiuscolo, pesante. Scartati: burger pieno, burger senza sfondo,
ingranaggio.

## Lista — sezioni come widget (versione 1)

Ogni sezione merceologica è una **tessera bianca**: `margin: 0 12px 12px`, raggio 22, bordo
1 px `--bordo`, `--ombra-pannello`, padding 14 / 12 / 12, gap 12. Cappello con quadratino
d'area e contatore, righe dentro.

## Piatti (versione 5)

- **Nessuna divisione pranzo / cena**: lista unica.
- Ricerca: segnaposto **"Cerca un piatto o un ingrediente"** — si cerca anche dentro i piatti.
- **"+ Nuovo piatto"** a larghezza piena in cima alla lista, non un selettore.

## Dispensa (versione 3 + dock della 5)

- Tessere per prodotto, **colore d'area** come bordo/quadratino della tessera: è lì che i sei
  colori portano informazione.
- Presenza indicata da tinta e testo, **non** da barra né pallino.
- In basso, **dock a portata di pollice** col tasto **"Fai una modifica"** (testo) e il tasto
  vocale; registrando, animazione di livello che dice che sta ascoltando.
- Le sottoscritte di scadenza usano la classe **`scadenza`**, mai `scad` (viene filtrata
  dall'ambiente di resa e sparisce).

## Impostazioni — pannello chiaro

- **Non una schermata**: un pannello che esce dal tondo utente in alto a destra.
- Fondo **chiaro e pieno**, bordo **1,5 px `--ink`**, raggio 22, `--ombra-alta`. Dietro, il
  resto dell'app si **scurisce parecchio** ma resta visibile.
- Dentro, **blocchi tipo widget** raggruppati.
- Il **default della settimana** è una voce **cliccabile** che porta a una sotto-schermata dove
  si scelgono i pasti fatti a casa: non sporca il menù. Celle 44, `flex: 1`, raggio 14, gap 7,
  sigla del giorno 45 → 79,3 px per cella su 304.

## Fotocamera — Fotografa il piano

- Anteprima **a tutto schermo**; è contenuto del dispositivo, non una superficie di design.
- **Banda semitrasparente** in basso: `rgba(20,22,58,0.72)`, raggio `22px 22px 0 0`,
  padding 20 / 16 / 26, gap 12.
- **Tasto di scatto alla iPhone**: anello 76 con bordo **2 px bianco** e fondo trasparente,
  disco bianco 62 dentro. Nessuna icona. Alla pressione anello 0,96 e disco 0,88 in 180 ms,
  fermo con `prefers-reduced-motion`.
- Riga dello scatto: miniatura 44 + contatore **mono maiuscolo** a sinistra, scatto al centro
  (due lati `flex: 1`), **HO FINITO** a destra come pillola bianca — non il primario pieno, che
  su fondo scuro sparirebbe. Sotto: dettaglio dell'ultimo scatto su riga propria, poi
  **SELEZIONA DALLA GALLERIA**.
- Cornice guida: inset 88 / 40 / 268, quattro angoli 30 × 30, tratto 3 px bianco al 92%.
- Ogni flusso ha **una via d'uscita dichiarata**: il primario va avanti, la freccia abbandona.

## Movimento

150–250 ms, `cubic-bezier(.2,.8,.25,1)`, mai senza un gesto, mai ingressi di pagina o cascate.
Ogni prototipo porta la variante `prefers-reduced-motion`.

## Come si consegna

Una schermata per volta. Sotto ogni schermata: **Misure**, **Componenti usati** in mono, e
**Regole di DESIGN.md che tocca** in `--avviso`. Un componente nuovo si annuncia con
`COMPONENTE NUOVO:` — nome, anatomia, stati, misure, e perché nessuno esistente bastava.
Bersagli ≥ 44 anche quando il disegno è più piccolo (area trasparente sporgente).

## Debito verso DESIGN.md

Da scrivere prima che entrino in altre schermate:

- **§12** gradiente di sfondo (ora è la regola) · anteprima fotocamera come eccezione.
- **§5** tre ombre nuove · bordo 1,5 px `--ink` come delimitatore di superficie · alfa fuori
  scala: 0,72 sulla banda, 0,62 sul bordo bianco.
- **§8** componenti nuovi: Menù utente, Pannello impostazioni, Dock della dispensa, Tasto di
  scatto, Banda dei comandi, Striscia dei fogli presi.
- **§3** confermato: contatori, unità, quantità e tasti sempre mono maiuscolo.
