# Spesa — sistema visivo v1

Valori estratti dalle schermate definitive in `design/`, non ricostruiti a memoria.
Fonte di verità: i file `.dc.html`. Se un valore qui diverge da quelli, valgono i file.

## Colori

| Ruolo | Hex | Dove |
|---|---|---|
| Fondo pagina | `#F1F0EE` | grigio-carta caldo, tutte le schermate |
| Superficie | `#FFFFFF` | schede, tessere accese |
| Inchiostro | `#14163A` | testo primario, pulsanti, stati attivi, bordo di "oggi" |
| Testo secondario | `#8A8A96` | etichette mono, note |
| Testo terziario | `#A6A6B2` | metadati, unità |
| Disattivato | `#9A9AA6` | icone di navigazione inattive |
| Bordo leggero | `rgba(20,22,58,0.07)` | schede |
| Fondo spento | `rgba(20,22,58,0.035)` | tessere prese, celle fuori casa |

**Le sei aree.** Fisse, non personalizzabili; personalizzabile solo l'ordine di apparizione.

| # | Area | Hex |
|---|---|---|
| 1 | Ortofrutta | `#A8D96A` |
| 2 | Macelleria e pescheria | `#F29B9B` |
| 3 | Latticini, uova e salumi | `#9CC7F2` |
| 4 | Pasta, riso e cereali | `#F5CE5B` |
| 5 | Dispensa e conserve | `#F2A465` |
| 6 | Surgelati | `#B9AEF5` |

Sono pastelli tarati per reggere testo `#14163A` sopra. Se si saturano, va cambiato anche il colore del testo.

## Tipografia

- **Plus Jakarta Sans** — testo e titoli. Pesi 400/500/600/700/800. Fallback `'Helvetica Neue', Arial, sans-serif`.
- **JetBrains Mono** — etichette di servizio, quantità, contatori. Pesi 400/500/700. Fallback `ui-monospace, monospace`.
- Titolo di schermata: 52px / 800 / `-0.05em` / line-height 1.
- Titolo di dettaglio: 32-34px / 800 / `-0.045em`.
- Nome di voce: 17-19px / 700 / `-0.03em`.
- Etichetta mono: 9-10px / 700 / letter-spacing `0.11em`-`0.16em`, sempre maiuscola.

## Forme

- Raggi: **22px** schede grandi, **18-20px** pulsanti e schede medie, **14-15px** tessere, **999px** pillole.
- Bordi: 1px per le schede, 1.5px per gli stati selezionati, **3px** per il bordo di "oggi", 1.5px tratteggiato per gli "aggiungi".
- Ombre: solo sulle superfici scure e sulle tessere accese. `0 1px 2px rgba(20,22,58,0.05)` (tessera), `0 3px 10px rgba(20,22,58,0.24)` (pulsante primario). **Nessun gradiente in nessun punto.**
- Bersagli tattili: mai sotto 44px.

## Regole di stato

**Tessere della lista.** Accesa = da prendere: fondo bianco, bordo nel colore dell'area, ombra minima. Spenta = presa: fondo `rgba(20,22,58,0.035)`, bordo trasparente, nome barrato e sbiadito. Il tap sulla tessera è l'interruttore. Nessuna checkbox.

**Celle della settimana.** Stessa grammatica: accesa = mangi a casa, spenta = fuori. Lo stato ha un controllo dedicato (la casa a sinistra), il tap sul corpo apre il piatto. Casa piena blu-notte a casa, casa bianca con contorno grigio sottile fuori.

**Marchio.** Griglia 3×2, ordine fisso (arancio, azzurro, verde / lilla, giallo, corallo — è la 2×3 verticale ruotata di 90° in senso orario). Ogni casella è **sempre** nel colore della sua area: piena quando in quell'area non manca niente, contornata nello stesso colore quando manca qualcosa. Mai grigia. Un'area assente dalla spesa conta come "non manca niente", quindi piena.

**Giorno corrente.** Bordo del riquadro 3px `#14163A`. Non un contorno esterno.

## Cosa non c'è, di proposito

Gradienti, glassmorphism, ombre colorate, icone emoji (tutte le icone sono SVG disegnate), dark mode (i colori sono definiti come token ma il tema scuro non è progettato), animazioni.
