# Prompt per Claude Design: il foglio del Dock della Dispensa (23/09/2026)

Incolla in Claude Design, progetto "Spesa", il testo che sta sotto il separatore. Prima di
farlo, controlla che il `DESIGN.md` del progetto sia quello del repo al 23/09 (v3 con la fase
3: il Dock come regione, «Rivedi i fogli presi» in colonna, le foto come eccezione a §12). Le
regole citate qui sotto stanno in quella versione.

---

Disegna il **foglio del Dock della Dispensa** con le sue tre viste, in un file nuovo:
`Dispensa - foglio del dock.html`.

La pagina della Dispensa è già approvata e non va ridisegnata:
- file `Dispensa - tinta d'area e dock.html`;
- `DESIGN.md` §8: Tessera di dispensa, Foglio del Dock della Dispensa, Stato "Registro".

Qui manca solo quello che si apre dal tasto `Fai una modifica` e dal microfono del Dock.

**Obiettivo.** Da questo file si scrive il codice senza tornare a chiedere. Quindi deve dire
tre cose: dove sta ogni funzione della Dispensa di oggi, con quali testi, e in quali stati.
**Si misura così:** ogni riga dell'inventario più sotto trova il suo posto in uno dei frame.
Le righe che non lo trovano vanno scritte nelle note come «tolta, perché…».

## Le decisioni già prese (non riaprirle)

1. **Tre vie nel foglio:** `A mano`, `Con una nota`, `Scansione`. Il foglio è un Foglio dal
   basso normale (§8). Le tre vie sono le sue voci, e ognuna apre la propria vista.
2. **La tessera resta l'interruttore in casa / finito**, come nel disegno approvato. Il tocco
   su una tessera **finita** la rimette **in casa con una confezione** (il formato della
   confezione dell'ingrediente, per esempio 500 g). Se la quantità non torna, si corregge da
   `A mano`.
3. **`A mano` si apre con la ricerca.** C'è un campo di ricerca con l'elenco degli
   ingredienti; toccandone uno si apre il suo **dettaglio**. È l'unico posto dove si arriva a
   un ingrediente per correggerlo.
4. **I «mai comprati» non stanno nella pagina.** I widget mostrano solo le voci in casa e
   quelle finite. I mai comprati (decine, dopo l'import) si trovano solo dalla ricerca di
   `A mano`, per segnare qualcosa comprato fuori lista.
5. **Gli avvisi dell'ingrediente vanno sulla tessera,** come seconda pillola bianca, allo
   stesso modo di `Scade il 22/09` e `Congelato`:
   - «troppo tempo per essere ancora buono»;
   - «nessun pasto in programma lo usa prima che scada».

   Disegnali tu, in versione corta, e metti nelle note il testo esatto. La riga
   `Da quando usi Spesa: …` (il non ricomprato) non va nella Dispensa: la sposteremo nelle
   Impostazioni.
6. **`Scansione` serve a trovare l'ingrediente:**
   - se il codice a barre è già legato a un ingrediente, si apre il suo dettaglio di
     `A mano`;
   - se non lo è, si sceglie l'ingrediente da un elenco con ricerca, il codice resta legato a
     quell'ingrediente, e poi si apre il suo dettaglio.

   La lettura del codice è continua, senza tasto di scatto. Se la fotocamera non c'è, il
   codice si digita.
7. **Il microfono del Dock** avvia subito la registrazione, con lo stato "Registro" nel
   Dock. Allo stop si apre il foglio sulla vista `Con una nota`, **col testo trascritto nel
   campo**: niente parte da solo, si manda con `Correggi`. Se il browser non sa dettare, il
   tondo del microfono **non c'è** e il Dock tiene solo `Fai una modifica`.

## I frame richiesti (393 × 852; controlla che tutto regga anche a 375 × 812)

1. **Il foglio aperto** sopra la pagina, con le tre voci.
2. **`A mano`, ricerca vuota.** Si vede l'elenco con cui si parte: decidi tu l'ordine
   (reparto, poi nome?). Sotto, la sezione **Pronti**, se c'è almeno un lotto.
3. **`A mano`, ricerca con risultati**, compreso un ingrediente «mai comprato».
4. **Il dettaglio di un ingrediente deperibile:**
   - il residuo, con la sua unità;
   - il congelatore (acceso o spento);
   - la scadenza o l'avviso;
   - la via per tornare alla ricerca.
5. **Il dettaglio di un ingrediente non deperibile.** Il congelatore non c'è.
6. **Un lotto Pronto:**
   - le porzioni;
   - frigo o freezer;
   - l'eliminazione;
   - le porzioni «impegnate» dai pasti futuri.
7. **`Con una nota`, vuota:** campo di testo, microfono (se c'è), `Correggi` spento.
8. **`Con una nota`, dettatura in corso**, con lo stato "Registro".
9. **`Con una nota`, esito.** Nello stesso frame, i gruppi `APPLICATE` (con `Annulla`),
   `DA CONFERMARE` (con `Conferma`) e `NON RICONOSCIUTI`, più una riga annullata.
10. **`Con una nota`, errore**, con uno dei tre messaggi.
11. **`Scansione`, lettura in corso**, più il ripiego col codice da digitare.
12. **`Scansione`, codice sconosciuto:** si sceglie l'ingrediente a cui legarlo.
13. **Il Dock senza microfono.**
14. **Gli stati della pagina** che il file approvato non mostra:
    - caricamento;
    - errore di caricamento;
    - vuoto;
    - una tessera con ciascuno dei due avvisi del punto 5.

## Due cose che devi decidere tu, e scrivere nelle note

- **Come si salva il residuo.** Oggi salva quando il campo perde il fuoco, senza tasto. In
  un foglio, un tasto `Salva` può servire di più. Scegli una delle due e scrivi perché.
- **L'eliminazione di un lotto Pronto.** Oggi non chiede conferma. `DESIGN.md` §9 vuole un
  dialogo a due tasti per ogni azione non reversibile. Scegli: o il dialogo, o un'eccezione
  dichiarata come quella di «togli il foglio» del 23/09, con la ragione.

Più in generale: come si torna indietro fra le viste del foglio, e come si chiude.
Serve sempre una via d'uscita dichiarata (§9).

## L'inventario: ogni funzione di oggi e il suo testo esatto

Tutte devono avere un posto. I testi restano questi. Se ne proponi uno migliore, mettilo
nelle note come proposta, accanto al vecchio.

| Funzione di oggi | Testo o `aria-label` di oggi | Dove va |
|---|---|---|
| Correggere il residuo | campo numerico, `aria-label="Residuo di {Nome}"`, unità accanto | dettaglio di `A mano` |
| Congelatore sull'ingrediente (solo deperibili) | `{Nome}: metti in congelatore` / `…: togli dal congelatore`, `aria-pressed` | dettaglio di `A mano` |
| Porzioni di un lotto Pronto | `Porzioni di {Piatto}` | `A mano`, Pronti |
| Congelatore sul lotto | `{Piatto}: metti in congelatore` / `…: togli dal congelatore` | `A mano`, Pronti |
| Eliminare un lotto | `Elimina il lotto di {Piatto}` | `A mano`, Pronti (decidi tu la conferma) |
| Dati del lotto | `PREPARATO IL {12 SET}` (+ ` · IN CONGELATORE`), `1 impegnata` / `{n} impegnate`, ripiego `Piatto eliminato` | `A mano`, Pronti |
| Scrivere la nota | segnaposto `Es. ho finito il riso, l'olio è a metà…` | `Con una nota` |
| Dettare la nota | oggi `Detta la nota`; nel Dock `Registra un vocale` | Dock e `Con una nota` |
| Mandare la nota | `Correggi` (spento con nota vuota o invio in volo) | `Con una nota` |
| Gruppi dell'esito | `APPLICATE`, `DA CONFERMARE`, `NON RICONOSCIUTI` | `Con una nota` |
| Riga di proposta | `{Nome} {valoreAttuale} → {valoreNuovo} {unità}`, `{Nome} frigo → freezer`, `{Nome} freezer → frigo`, e sotto la motivazione | `Con una nota` |
| Azioni sulla proposta | `Annulla`, `Conferma`; la parola `annullata` sotto la riga | `Con una nota` |
| Errori della nota | `La correzione non è disponibile.` · `Non ho capito la nota, riprova.` · `Non siamo riusciti a correggere. Riprova.` | `Con una nota` |
| Errori di salvataggio | `Non siamo riusciti a salvare la correzione. Riprova.` · `Non siamo riusciti a salvare. Riprova.` | dove avviene il salvataggio |
| Errore di caricamento | `Non riusciamo a caricare la dispensa. Riprova più tardi.` | pagina |
| Vuoto | `Ancora niente in dispensa` + `Si riempie da sé: appena chiudi la prima spesa, qui trovi quello che è rimasto.` | pagina |
| Avviso «decaduto» | oggi `Troppo tempo per essere ancora buono: la lista lo richiede.` | pillola sulla tessera, testo corto |
| Avviso «dimenticato» | oggi `Nessun pasto in programma lo usa prima che scada.` | pillola sulla tessera, testo corto |
| Scadenza | oggi `SCADE OGGI` / `SCADE IL 12 SET`; nel disegno approvato `Scade il 22/09` | tessera (già disegnata) e dettaglio |
| Spiegazione del residuo | `Calcolato da spesa e piano: correggi solo se non torna con la realtà.` | se serve, nel dettaglio di `A mano` |

## I vincoli di sempre

- **Solo valori da `DESIGN.md`:** token, scala tipografica, raggi, alfa (§2.5). Un valore
  nuovo va dichiarato nelle note come eccezione, con la ragione.
- **Bersagli ≥ 44**, voci del foglio ≥ 50. Niente swipe, niente long-press.
- **Colori del testo:** errori in `--errore`, testi informativi in `--testo-2`; su tinta
  d'area i semantici stanno su pillola bianca.
- **Copy** come in §10: del tu, niente esclamativi, e un errore dice cosa fare.
- **Il foglio non copre il Dock in modo ambiguo.** Scrivi se, a foglio aperto, il Dock
  resta, sparisce o viene coperto dal velo.

**Formato del file**, come gli altri del progetto: i frame in fila, e sotto ognuno una
scheda con queste sezioni:
- «Misure»;
- «Componenti usati», con i nuovi segnati COMPONENTE NUOVO;
- «Regole di DESIGN.md che tocca»;
- le due decisioni che hai preso.
