# Icone ingrediente a due toni con ombra incisa — design

**Obiettivo.** Rendere le icone ingrediente più ricche ed eleganti senza cambiare cosa
rappresentano né dove stanno. Lo stile deve uscire da un'unica funzione, così vale per tutte
le 64 chiavi e per quelle future. Funziona se, sul telefono, tutte le 64 sembrano fatte dalla
stessa mano, nessun nome si legge peggio di oggi e le tessere spente restano spente.

Decisioni prese con Andrea il 03/10/2026 su tre pagine di confronto:
- foto scontornate: scartate ([valutazione](../../2026-10-03-foto-ingredienti-valutazione.md));
- quattro direzioni: https://claude.ai/artifact/4dzf7WUTGQQrahwCqJN3ww;
- mix delle direzioni 2 e 3: https://claude.ai/artifact/KwKG5PiqHakqcuRnjFDMpu, colonna
  «Mix B · ombra leggera».

Il codice del pilota è in `design/pilota-icone/modello-mix.html` (funzione `mix`).

## 1. Cosa cambia e cosa no

**Cambia** il trattamento dell'icona. Oggi l'icona è solo tratto (2 e 1,25, tono medio
d'area). Diventa:
1. una **sagoma piena** nel colore d'area;
2. sopra, il **contorno** e fino a **cinque gruppi di dettagli** a tratto fine nel tono medio;
3. un'**ombra a tratteggio** in basso a destra, calcolata dalla sagoma.

**Non cambiano:**
- le tre tessere che la ospitano: Lista (`Tessera.tsx`, protagonista compresa), Dispensa
  (`TesseraDispensa.tsx`) e ingrediente del piatto (`TesseraIngrediente.tsx`);
- la posizione: in basso a destra, tagliata dal bordo, sotto il nome, `aria-hidden`, nessun
  tocco;
- l'alone sul nome e le sue regole (niente alone sulle tessere barrate);
- il catalogo delle 64 chiavi, i sinonimi, `trovaIcona` e i BLOCCHI;
- i nomi senza icona, che restano senza icona.

## 2. I valori

Griglia 24 come oggi. Gli spessori sono in unità del viewBox. Nella tabella, «hero» è la
protagonista della Lista.

| Elemento | Valore | A 60 px | A 96 px (hero) |
|---|---|---|---|
| Taglia | **60** sulla tessera, **96** sulla hero (oggi 52 e 84) | — | — |
| Taglio dal bordo | right/bottom **−11** e **−18** (circa 18%, oggi −10 e −17) | — | — |
| Contorno (`d`) | tratto **0,9** | 2,25 px | 3,6 px |
| Dettagli (`dd`) | tratto **0,5**, fino a **5** gruppi | 1,25 px | 2 px |
| Sagoma piena (`sil`) | allineata al contorno (nessuno spostamento) | — | — |
| Ombra | tratteggio a 45°, linee a **0,34** ogni **1,2** | 0,85 px | 1,4 px |
| Area dell'ombra | la sagoma meno la sagoma spostata di **(−2, −2,2)**: una falce in basso a destra | — | — |
| Estremità e giunti | arrotondati | — | — |

**Colori per stato.** I valori `tono` sono `TonoIcona`, il tipo che il componente riceve.

| Stato | Dove | Pieno | Tratto (contorno, dettagli, ombra) |
|---|---|---|---|
| `area` | Lista accesa, ingrediente del piatto | colore d'area a **0,72** | tono medio d'area, opacità 1 |
| `hero` | protagonista della Lista (fondo pieno d'area) | bianco a **0,7** | tono medio d'area, opacità 1 |
| `tinta` (nuovo) | Dispensa in casa (fondo d'area al 26%) | bianco a **0,7** | tono medio d'area, opacità 1 |
| `spento` | Lista presa, Dispensa finita o mai comprato | `rgba(20,22,58,0.06)` | `#9A9AA6` a **0,55** |

Oggi la Dispensa in casa usa `area`. Con il pieno a 0,72 il colore d'area sparirebbe sul fondo
già tinto, quindi serve lo stato nuovo `tinta`.

## 3. La geometria per chiave

`Tracciato` passa da `{ d, dd, rot? }` a `{ sil, d, dd: string[], rot? }`:

- **`sil`** (nuovo): la sagoma chiusa. Ogni sottopercorso finisce in `Z`, si riempie con
  `nonzero` e non ha fori. Copre tutto il contorno: nessun tratto di `d` cade fuori da `sil`
  di più di mezzo spessore (0,45). Serve al pieno e alla maschera dell'ombra.
- **`d`**: il contorno, come oggi, a tratto 0,9.
- **`dd`**: diventa una **lista di gruppi**, al massimo cinque, a tratto 0,5. Un gruppo è un tipo
  di segno: le quattro squame del pesce sono un gruppo, i fori del formaggio un altro. Si conta
  per gruppo e non per segno, perché è così che sono costruite le sei icone approvate nel
  pilota. I fori stanno in un gruppo come cerchi a tratto, non come buchi nella sagoma.
  L'occhio del pesce resta nel contorno `d`, come oggi.
- **`rot`**: invariato e applicato a tutti e tre (oggi lo usa solo la pasta).

**La grammatica del 26/09 resta**, con due modifiche:
- i segni interni passano da tre segni a cinque gruppi;
- si aggiunge la regola di `sil`.

Restano: sagoma fra 2 e 22, tratto identificativo fuori dalla fascia tagliata (x o y oltre
19,2), riflesso ad arco a sinistra sugli oggetti tondi (coerente con l'ombra in basso a destra:
la luce viene da in alto a sinistra), oggetti allungati in diagonale, nessun foro sotto raggio
1,6 salvo l'occhio del pesce.

**Le sei del pilota** (pomodoro, carota, pesce, formaggio, pane, latte) hanno già `sil` e i
dettagli arricchiti in `modello-mix.html`. Si portano come le hai viste nella colonna
«Mix B · ombra leggera»: i primi cinque elementi di `det`, più i fori come gruppo, più l'occhio
del pesce nel contorno. Pomodoro: 4 gruppi, carota 5, pesce 5, formaggio 4, pane 4, latte 5. La carota ha le foglie
a fuso invece che a tratti: il contorno nuovo sostituisce quello di oggi. **Le altre 58** vanno
disegnate (§5).

## 4. Il componente

`IconaIngrediente({ chiave, area, tono, taglia })`:

- `tono: 'area' | 'hero' | 'tinta' | 'spento'`;
- `taglia: 60 | 96`;
- disegna, nell'ordine: il pieno (`sil`), il tratteggio mascherato, il contorno (`d`), i
  dettagli (`dd`);
- l'id della maschera viene da `useId()`, perché sulla stessa schermata ci sono più icone e gli
  id ripetuti fanno prendere a tutte la maschera della prima;
- il tracciato del tratteggio è **una costante del modulo**, uguale per tutte le icone: cambia
  solo la maschera;
- `data-icona`, `aria-hidden`, `pointer-events: none` e `position: absolute` restano come oggi.

Cambiano anche i tre chiamanti:
- `Tessera.tsx`: taglie 60 e 96;
- `TesseraDispensa.tsx`: `tono={inCasa ? 'tinta' : 'spento'}`, taglia 60;
- `TesseraIngrediente.tsx`: taglia 60.

Nessun token nuovo in `globals.css`: i valori stanno nel componente, come oggi lo 0,42 della
hero. Il colore d'area e il tono medio esistono già in `aree.ts`.

## 5. Produzione delle 58 chiavi

1. **Disegno a lotti per area** (ortofrutta, macelleria, latticini, cereali, dispensa,
   pronti e bevande). Per ogni chiave: `sil` nuova, `d` adattato quando serve (come le foglie
   della carota), `dd` portato fino a cinque gruppi dove aiuta a riconoscere l'oggetto e non
   oltre.
2. **Controllo automatico** con uno script in `scripts/` (Chrome headless, come già si fa per
   vedere le icone). Per ogni chiave disegna `d` e `sil` e fallisce se i pixel del contorno
   escono dalla sagoma oltre la tolleranza, o se la sagoma esce da 2–22. Lo script non gira
   nella CI: si usa durante la produzione.
3. **Foglio di approvazione per Andrea:** una pagina con le 64 icone, oggi e nuova affiancate,
   a 60 px su bianco e su una tessera di ogni stato. È il gate, come il foglio del 26/09: le
   icone che non convincono si correggono, oppure la chiave perde l'icona («meglio nessuna
   icona che una sbagliata»).

## 6. Le regole del design system

In `design/sistema/DESIGN.md`:

- **§2.3, usi del colore d'area:** diventano sette. Il settimo è «pieno dell'icona ingrediente
  a 0,72 sulle tessere accese della Lista e sull'ingrediente del piatto». La riga sul tono
  medio resta e dice anche contorno, dettagli e ombra.
- **§6, paragrafo «Icone ingrediente»:** si riscrive con i valori del §2 e del §3 di questa
  spec. La frase «icona di tratto» diventa «icona a due toni: sagoma piena, contorno e
  dettagli a tratto, ombra a tratteggio».
- **§6, «Nessuna illustrazione…»:** resta. Le icone restano icone: una sagoma, una luce, niente
  scene, niente prospettiva, niente ombre portate fuori dalla sagoma.
- **§12, eccezione delle icone ingrediente:** «Niente pieni, ombre, prospettiva o scene»
  diventa «Un solo pieno nel colore d'area e un'ombra a tratteggio dentro la sagoma; niente
  ombre portate, prospettiva o scene».
- **§13:** nuova tabella «Decisioni del 03/10/2026 (icone a due toni)»: la riga 30 rimanda alla
  29 e la sostituisce.

`docs/superpowers/specs/DESIGN-SYSTEM.md` aggiorna la riga dell'indice di `IconaIngrediente`
solo se cambia un file. In `docs/design-delta/` va un `DELTA-2026-10-03-icone-due-toni.md`
nel formato a sei righe, che registra la decisione presa fuori da Claude Design.
`design/sistema/DESIGN.md` si ricarica poi nel progetto Claude Design con DesignSync.

## 7. Test

**Unitari** (`src/components/__tests__/icona-ingrediente.test.tsx`, riscritti sui valori
nuovi):
- per ogni `tono`: colore e opacità di pieno e tratto come nella tabella del §2;
- taglie 60 e 96, taglio −11 e −18;
- spessori 0,9, 0,5 e 0,34;
- due icone sulla stessa pagina hanno maschere con id diversi;
- la pasta ruota pieno, contorno e dettagli.

**Sul catalogo:**
- ogni chiave ha `sil`, `d` e `dd`;
- ogni sottopercorso di `sil` finisce in `Z`;
- `dd` ha da uno a cinque gruppi, nessuno vuoto.

**Tessere:** i test esistenti di Lista, Dispensa e Piatto che leggono `width` o `stroke`
dell'icona si aggiornano. Dispensa in casa ora passa `tinta`.

**Sul telefono (Andrea, Chrome Android), prima del merge:**
1. la Lista con almeno tre reparti, la protagonista in giallo e in verde;
2. una voce spuntata: icona spenta, niente alone;
3. la Dispensa con voci in casa e finite;
4. un piatto con almeno quattro ingredienti;
5. lo scorrimento della Lista resta fluido con 30 tessere [ipotesi da verificare: ogni icona
   aggiunge una maschera].

## 8. Rischi e aperti

| Rischio | Cosa si fa |
|---|---|
| Il tratteggio a 0,85 px si impasta sugli schermi a densità 1 | Sul telefono (densità 3) è a 2,5 pixel fisici. Si guarda nella prova 1; se si impasta, il passo sale a 1,4 |
| Le 58 chiavi nuove non tengono il livello delle sei del pilota | È il foglio di approvazione del §5, con la possibilità di togliere l'icona |
| Pieno a 0,72 sulle tessere arancioni e gialle troppo carico accanto al nome | Il nome ha già l'alone. Da guardare nel foglio su ogni reparto; il valore si regola in un punto solo |
| La protagonista gialla: bianco a 0,7 su `#F5CE5B` | Nel pilota sono state viste solo la verde e l'azzurra. Prova 1 |
| Prestazioni con molte maschere | Prova 5. Se pesa, si passa a un `<pattern>` condiviso con un solo `clipPath` per icona |

**Fuori ambito:** chiavi nuove nel catalogo, icone per i 5 nomi scoperti (bresaola, mais,
prosciutto cotto, prosciutto crudo, frutta fresca), `TesseraLotto`, qualunque altro uso delle
icone fuori dalle tre tessere.

## 9. Gate

| Passo | Gate |
|---|---|
| Spec | Andrea la rivede (questo documento) |
| Foglio delle 64 | Andrea approva, chiave per chiave se serve |
| Prove dal telefono su un deploy di anteprima | Andrea |
| Merge su main (= deploy in produzione) | ok esplicito di Andrea |

Nessuna migrazione.
