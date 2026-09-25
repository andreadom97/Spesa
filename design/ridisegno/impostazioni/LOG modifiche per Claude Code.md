# Log delle modifiche — da passare a Claude Code

Data: 25/09/2026. Fonte di verità per il design: `DESIGN.md` v3 del pacchetto design system.
Questo log elenca cosa cambia rispetto a DESIGN.md e al codice di oggi, schermata per schermata.
Ogni voce rimanda al frame del file di disegno dove è resa.

File di disegno nel progetto:

| File | Cosa contiene |
|---|---|
| `Avvio - 5 animazioni del marchio.dc.html` | animazione d'avvio del Marchio |
| `Dispensa - modifiche v2.dc.html` + `Dispensa pagina v2.dc.html` | Dispensa v2 (sostituisce in parte la v1) |
| `Dispensa - foglio del dock.dc.html` | Dispensa v1, resta valida dove la v2 non la sostituisce |
| `Impostazioni - pannello completo.dc.html` + `Impostazioni sfondo.dc.html` | pannello Impostazioni, sotto-schermate, tab bar a tre voci, Piano a sei pasti |

---

## 1. Animazione d'avvio del Marchio

- Griglia 3 × 2, colori in ordine: `#F2A465 #9CC7F2 #A8D96A` / `#B9AEF5 #F5CE5B #F29B9B`.
- Caselle con `box-sizing: border-box` (senza, i gutter si annullano). Testata: 16 × 16, gap 4, raggio 4,48, bordo 2. Centro: 40 × 40, gap 10, raggio 11,2, bordo 2.
- **Pop da scala zero**, nessun ingresso da fuori schermo.
- Ritardi sulle sei caselle in ordine di griglia: `0, 340, 170, 255, 85, 425` ms.
- Keyframe `pb`, 620 ms, `linear`: `0 → 1,32 (40%) → 0,93 (62%) → 1,05 (80%) → 0,99 (92%) → 1`.
- Sequenza: marchio grande al centro → pausa 150 ms → scende in testata in 620 ms → titolo a 1,62 s, tessere a 1,72 s. Totale 2,1 s.
- `prefers-reduced-motion: reduce`: marchio già composto in testata, nessun movimento.

---

## 2. Dispensa v2

(Già in produzione con la fase 4, PR #6 e #7: vedi `docs/superpowers/specs/2026-09-25-dispensa-design.md`. Il testo integrale è nel progetto Claude Design 5f1a24e3-0c23-4803-b55b-0e11dad820ba, file `LOG modifiche per Claude Code.md`. Unico punto ancora aperto: §2.7, «finito» a un tocco con una pillola 44 sulla tessera, oppure a due tocchi come oggi.)

---

## 3. Tab bar a tre voci (tutte le schermate)

- Voci: **Lista · Piano · Dispensa**. Piatti esce dalla barra.
- Grande: larga **304**, centrata (`left:0; right:0; margin:0 auto`), alta 84, `bottom 22`, padding 6, gap 2. Voci **96 × 72** a larghezza fissa.
- Ridotta: larga **244**, alta 66, voci **76 × 54**. Si anima `width` (non più `left/right`), 200 ms `cubic-bezier(.2,.8,.25,1)`; `--fine` 128 → 110 come prima.
- Il Dock resta a 16 dai lati.
- Voce attiva su 0,07; nessuna voce attiva su Piatti (aperto dal pannello) e su Importa.

---

## 4. Pannello Impostazioni

### 4.1 Contenitore
- **A tutta larghezza**: `top 76`, `left 0`, `right 0`, `bottom 0`, raggio `22px 22px 0 0`, **senza bordo**, fondo `--fondo` pieno, `--ombra-alta`. Velo 0,55.
- Corpo: padding `0 12 26`, gap 12. Piede di versione: padding `12 18 26`.
- Il pannello copre la tab bar: finché è aperto non si naviga.

### 4.2 Animazione (`.anim-pannello`, frame 00)
- **Apertura 250 ms** `cubic-bezier(.2,.8,.25,1)`: pannello `translateY(100%) → 0`; velo opacità 0 → 1 in 200 ms lineari; app dietro `scale(1) → scale(.96)` con `transform-origin: 50% 0`. Menù utente `aria-expanded="true"` con `--ombra-nav`.
- **Chiusura 200 ms** `cubic-bezier(.4,0,1,1)`: al contrario; velo in 180 ms. Alla fine `visibility: hidden` e fuoco al Menù utente.
- Si chiude con X, velo, tocco sul Menù utente.
- Sotto-schermate: entrano da destra (`translateX(24px)` + opacità, 200 ms), escono verso destra con la freccia.
- `prefers-reduced-motion: reduce`: solo opacità 120 ms, niente scala dell'app.

### 4.3 Struttura, due livelli (frame 03, 04)
1. **Tessere 2 × 2** sul fondo del pannello, senza blocco: gap 8, min 104, raggio 18, bianche, `--bordo`, `--ombra-pannello`, padding `12 14 13`. Nome 17 / 700, nota 12,5 `--testo-2`. Nessuna icona, nessun contatore.
   - Piatti · «Scrivi e correggi i tuoi piatti.» → pagina Piatti
   - Importa un piano · «Da PDF o foto. Sostituisce il piano attuale.» → flusso fase 3
   - Casa condivisa · «La spesa con chi vive con te.» · valore mono 11 `SOLO TU` / `CON {N} PERSONE` / `NELLA CASA DI {NOME}` (parte prima della @)
   - Esporta i tuoi dati · «Piatti, piano e dispensa in un file.»
2. Etichetta **`SI CAMBIANO DI RADO`** in `--testo-2` + filetto `--bordo`.
3. Blocchi di gruppo con Righe di impostazione (min 56):
   - **La settimana di base**: Pasti a casa (`{N} FUORI CASA`) · Gestione dei pasti («Quanti pasti fai al giorno e come si chiamano.», `{N} PASTI`) · Rotazione del piano («Se il tuo piano si ripete a blocchi di settimane.», `NESSUNA` / `{N} SETT.`)
   - **Come calcolo la lista**: Per quante persone cucini (campo 78 × 44, unità `PERS`, 1–4, salva all'uscita dal campo; fuori range torna al valore di prima con «Scrivi un numero da 1 a 4.»; seconda nota solo sopra 1) · Cadenza dei controlli (`OGNI 3 MESI`) · Ingredienti («Area, confezione e come si consuma.»)
   - **Come la vedi in corsia**: Ordine delle aree (`PERSONALIZZATO` / `DI BASE`)
   - **I tuoi dati**: nota «Da quando usi Dispesa: {n} confezioni non ricomprate · {quantità} · {circa N €}» (quantità ed euro solo se ci sono; singolare a 1; nessuna riga a 0) · Cancella la dispensa (riga d'azione)
   - **Account**: nome + email (informativa, niente chevron) · **Esci** (riga d'azione, **nome in `--errore`**, nota «Per rientrare ti serve il link che ti mandiamo via email.»)
4. Piede: `Versione {x} · ultimo salvataggio il {data} alle {ora}`.

### 4.4 Tolte
Arrotonda alle confezioni · Unità di misura · anteprima della lista in Ordine delle aree · stepper delle porzioni (→ campo numerico) · chevron sulla riga del nome · `SICURO?` a doppio tocco.

### 4.5 Sotto-schermate
Testata: tondo 44 con freccia (`aria-label="Torna alle impostazioni"`) + titolo 32 / 800.

**Pasti a casa (05)** — pasti in riga, giorni in colonna.
- Sigle dei giorni una volta sola in cima (mono 8,5 `--ter`, `position: sticky`); nome del pasto in etichetta mono 10 sopra le sue sette celle.
- Celle `flex: 1`, gap **4**, alte 44, raggio 14. A 360: 44,1 × 44.
- **A casa**: fondo `--ink`, `--ombra-casetta`, **casetta bianca 16** (la stessa della Riga pasto). **Fuori**: bianca, `--bordo`, vuota.
- `aria-pressed`, `aria-label="{Giorno} {pasto}: di base a casa, tocca per mettere fuori casa"`.
- Nota nuova: «La casetta vuol dire che quel pasto lo fai a casa. Ogni settimana nuova nasce così: nel Piano puoi correggere il singolo giorno senza cambiare questo default.» (era «Acceso vuole dire a casa. …»). Riepilogo ricalcolato.
- Salva al tocco; se fallisce la cella torna com'era + «Non siamo riusciti a salvare. Riprova.». Un pasto nuovo nasce acceso in tutti i giorni.

**Gestione dei pasti (06, 07)**
- Etichetta `I TUOI PASTI` + contatore `{n} DI 6`.
- Riga: campo 44 `flex:1` (`aria-label="Nome del pasto"`, vuoto → «Pasto», salva all'uscita) + tre tondi 44 su 0,04 gap 4: su, giù, ✕ (`Sposta {nome} in alto` / `…in basso` / `Rimuovi {nome}`). Spenti in `--icona-spenta` + `disabled`: su sul primo, giù sull'ultimo, ✕ su tutti a 3 pasti.
- A 3 pasti: nota «Tre pasti sono il minimo.». A 6 pasti: `AGGIUNGI PASTO` non c'è, nota «Sei pasti sono il massimo.».
- `AGGIUNGI PASTO` tratteggiato 56 **in fondo** al blocco; crea «Nuovo pasto» in fondo col campo a fuoco.
- Rimuovi non chiede conferma. Opacità 0,5 sulla riga mentre salva.
- Sotto il blocco la nota di oggi (proposta: «nella Settimana» → «nel Piano»).

**Rotazione del piano (08, 09, 10)**
- Segmento a blocco a quattro, 46: `NESSUNA` / `2 SETT.` / `3 SETT.` / `4 SETT.`. Salva al tocco, niente conferma.
- Con ciclo > 1: riquadro 0,04 raggio 14 con `ORA SEI ALLA {k} DI {n}` (proposta: `SETTIMANA {k} DI {n}`), nota col giro «è cominciato / comincia lunedì {data}», tasto secondario `RIPARTI DALLA SETTIMANA 1`.
- `RIPARTI` apre il **dialogo a due tasti**: «Ripartire dalla settimana 1?» · «Da lunedì {data} il piano riparte dalla settimana 1 di {n}. Le settimane già create non cambiano.» · `ANNULLA` · `RIPARTI DA LUNEDÌ` (distruttivo). Errore: «Non siamo riusciti a ripartire. Riprova.».

**Ingredienti (11) ed editor (12)**
- Nota di oggi in testa; un blocco per area (ordine dell'utente, quadratino 10); righe 56 con nome 15 / 700 e `{formato} {unità} · {PORZIONABILE|INTERO|A STIMA}[ · FRESCO]` in mono 10 `--testo-2`. Aree vuote nascoste. Vuoto: «Nessun ingrediente» + «Nascono dai piatti: il primo che aggiungi a un piatto compare qui.».
- Editor = **pagina piena**, senza tab bar: freccia `Torna agli ingredienti`, area + nome 32. Campi `AREA` (6 pillole 44), `CONFEZIONE` (campo 96 + G / ML / PZ) e **sempre `SCANSIONA LA CONFEZIONE`** (secondario 54, riempie formato e unità, lega il codice all'ingrediente), `COME SI CONSUMA` (segmento a tre), Fresco Sì / No, nota di oggi.
- `SALVA` nel Dock a `bottom 22`. Spento finché niente cambia; `SALVATAGGIO…` a 0,5; errore sopra il Dock. Freccia e SALVA tornano al pannello su Ingredienti alla stessa altezza di scorrimento; la freccia non chiede niente e perde le modifiche.

**Ordine delle aree (13, 13B, 13C)**
- Nota di oggi; sei righe 56 con quadratino, nome, tondi su / giù (`Sposta {AREA} in alto` / `…in basso`).
- `SALVA ORDINE` primario 54 in un **piede fisso del pannello** (sopra un filetto): spento finché l'ordine è quello salvato, `SALVATAGGIO…` a 0,5. Errore: «Non siamo riusciti a salvare l'ordine. Riprova.». Caricamento fallito: «Non riusciamo a caricare l'ordine dei reparti. Riprova più tardi.» (proposta: «…delle aree»).
- Uscire senza salvare perde l'ordine senza chiedere.

**Cadenza dei controlli (13D)**
- Segmento a tre: `OGNI MESE` / `OGNI 2 MESI` / `OGNI 3 MESI` (default = i 90 giorni di oggi). Nota «Ogni quanto ti chiedo se hai ancora olio, sale, farina. La domanda compare in Lista, nell'area del prodotto.».
- Salva al tocco; vale dal controllo successivo. La Riga di controllo in Lista mostra la cadenza scelta.

**Casa condivisa (14–18, 26)**
- Da solo (14): «Fai la spesa con qualcuno?» + testo di oggi + `CREA UN CODICE` primario; blocco `HO UN CODICE` con campo 44 mono maiuscolo (8 caratteri) + pillola `ENTRA` spenta fino a 8 caratteri.
- Codice creato (15): riquadro 0,04 alto 64 con il codice in **mono 21 / 700 / 0,16em**, `aria-label` lettera per lettera, nota «Vale un'ora. …». Dopo un'ora torna `CREA UN CODICE`.
- Proprietario (16): blocco `LA TUA CASA`, tu per primo con `TU`, poi i membri con `TOGLI` (pillola 44), nota di oggi, `CREA UN CODICE` **secondario**. Niente `HO UN CODICE`.
- `TOGLI` → dialogo (17): «Togliere {email} dalla casa?» · «Non vedrà più la tua lista, il piano e la dispensa, e torna ai suoi dati. Per rientrare le serve un codice nuovo.» · `ANNULLA` · `TOGLI`.
- Membro (18): «Sei nella casa di {email}» + testo di oggi + `ESCI DALLA CASA` secondario → dialogo: «Uscire dalla casa di {email}?» · «Torni alla tua lista, al tuo piano e alla tua dispensa, come li avevi lasciati. Per rientrare ti serve un codice nuovo.» · `ANNULLA` · `ESCI DALLA CASA`. Dopo: pannello su 14, tessera `SOLO TU`.
- Errori (testi di oggi, 12,5 `--errore`, sotto il controllo): creare il codice · entrare (o messaggio del server) · togliere · uscire. Lettura fallita (26): solo «Non riusciamo a leggere la casa. Riprova più tardi.», niente RIPROVA. Casa cambiata (26B): il dialogo si chiude, errore «La casa è cambiata: dati ricaricati. Riprova.» sopra il blocco ricaricato.

**Esporta i tuoi dati (19, 19A–C)**
- Testo: «Un file con i tuoi piatti, il piano e la dispensa, da tenere: serve se cambi telefono o vuoi una copia.».
- Un tasto primario, quattro stati: `PREPARA IL FILE` → `PREPARO IL FILE…` (0,5, `disabled`, `aria-busy`) → «Il file è pronto: dispesa-{gg-mm-aaaa}.json.» (`role="status"`) + `SALVA IL FILE` (foglio di condivisione del sistema) · errore «Non siamo riusciti a preparare il file. Riprova.» + `RIPROVA`.
- Non parte da solo; chiudendo, il file preparato si perde.

**Cancella la dispensa (20)** — dialogo: «Cancellare la dispensa?» · «Tutto quello che risulta in casa torna a zero, anche le confezioni in congelatore e i pronti. Piatti e piano restano. Non si può annullare.» · `ANNULLA` · `CANCELLA` (distruttivo). Errore: «Non siamo riusciti a cancellare la dispensa. Riprova.». Dopo: nota della riga «Cancellata il {data} alle {ora}.» fino alla chiusura. «Da quando usi Dispesa» non si azzera.

**Esci (21)** — nuovo, il logout. Dialogo: «Uscire da Dispesa?» · «I tuoi dati restano. Per rientrare ti mandiamo un link a {email}.» · `ANNULLA` · `ESCI` **primario in `--ink`** (non distruttivo). Errore: «Non siamo riusciti a farti uscire. Riprova.». Dopo: pagina di accesso, senza passare dalla Lista; si cancella l'istantanea offline della Lista.

### 4.6 Dialogo di conferma (componente della fase 4)
Secondo velo 0,35 sopra il pannello; foglio bianco ancorato in basso a tutta larghezza, raggio `22 22 0 0`, padding `20 16 26`, gap 12. Titolo 21 / 800, testo 14 / 1,5 `--testo-2`, due tasti 54 `flex:1` gap 8: `ANNULLA` secondario a sinistra, azione a destra (in `--errore` se distruttiva). Il velo chiude come ANNULLA. Errore 12,5 sotto i tasti.

### 4.7 Stati del pannello
- Caricamento (23): testata e tessere già disegnate e toccabili; al posto dei blocchi `CARICO…` mono in `--sec`, `role="status"`. Stesso schema nelle sotto-schermate con dati propri.
- Errore di caricamento (24): tessere visibili; blocco con «Non riusciamo a caricare le impostazioni. Riprova più tardi.» + pillola `RIPROVA`. Proposta: «… Controlla la connessione e tocca RIPROVA.».
- Errore di salvataggio (25): il valore torna a quello di prima, «Non siamo riusciti a salvare. Riprova.» sotto la riga (`role="alert"`). Niente tasto RIPROVA: si rifà il gesto; l'errore sparisce al gesto successivo. Vale per ogni controllo che salva al tocco.

---

## 5. Piatti aperto dal pannello (22)

- Testata in modalità indietro, senza Menù utente: pillola 44 su 0,07 con freccia 20 + `IMPOSTAZIONI` mono 11 (`aria-label="Torna alle impostazioni"`), sotto il titolo 52 «Piatti».
- La pillola riapre il pannello in cima, sopra la pagina da cui si era partiti. Dall'editor del piatto la freccia torna a Piatti.
- Se si arriva dagli stati vuoti di Lista o Piano la pillola dice `LISTA` / `PIANO` e torna lì: dice sempre dove porta.
- Ricerca, `NUOVO PIATTO` tratteggiato in cima, Righe piatto come fase 3. Tab bar a tre voci, nessuna attiva.

---

## 6. Piano con sei pasti a 360 (27)

- **Striscia dei giorni**: pallini da 5 in **griglia a 3 colonne, gap 3** (una riga fino a 3 pasti, due da 4 a 6, la prima sempre piena). Il riquadro cresce di 8 da quattro pasti. **Decade il gap 2 a sei pasti** in `StrisciaGiorni.tsx`: torna 3 per tutti.
- Pallino pieno `--ink` (bianco sul selezionato); vuoto a contorno 1 px 0,20 (bianco 0,62 sul selezionato).
- A 360 ogni giorno è largo 44,3; la griglia occupa 21.
- Giorno: sei Righe pasto da 68, gap 8; fuori casa senza apertura né kebab. Coda 194 col Dock.
- `aria-label` del giorno col numero di pasti a casa.

---

## 7. Eccezioni a DESIGN.md (da scrivere in DESIGN.md prima del codice)

| Regola | Eccezione |
|---|---|
| §4 cornice minima 375 | 360 entra nel mandato per le schermate coi pasti |
| §7 Movimento | nuove: `.anim-pannello`, `lucev`, `lucet`, onda di dettatura a 22 barre |
| §8 Tab bar | tre voci, larghezza propria 304 / 244 |
| §8 Pannello | a tutta larghezza, senza bordo, raggio solo in alto; riga Esci accesa |
| §8 Matrice | casetta al posto del pallino |
| §8 Striscia | pallini in griglia 3 colonne |
| §8 Aggiungi tratteggiato | in fondo in Gestione dei pasti |
| §8 Dock | nell'editor ingrediente senza tab bar, `bottom 22`; primario nel piede del pannello in Ordine delle aree, Esporta, Casa |
| §3 Tipografia | mono 21 per il codice della casa |
| §2.2 `--errore` | sul nome della riga Esci (non distruttiva) |
| §9 Conferme | Esci chiede conferma pur essendo reversibile |
| §9 Gesti | long-press sul microfono della Dispensa (con alternativa a tocco) |
| §9 Caricamento | scheletro con luce nella sola Dispensa |
| §2.3 Colori d'area | #B9AEF5 e #9CC7F2 come luce in `lucet` |
| §6 Icone | icona AI (due stelle a quattro punte, 18) e icona di scansione |

---

## 8. Aperto
- Formato del file esportato (JSON o altro).
- Ricerca in Ingredienti.
- `COPIA` accanto al codice della casa.
- Cosa succede ai piatti già in piano quando si toglie un pasto.
- `SETTIMANA {k} DI {n}` al posto di `ORA SEI ALLA {k} DI {n}`.
- Dispensa: interruttore «finito» a un tocco (pillola 44) o due tocchi.
