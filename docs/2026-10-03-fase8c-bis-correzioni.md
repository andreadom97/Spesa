# Fase 8c-bis: le correzioni dalle prove dal telefono del 03/10 sera

Sei KO delle prove di Andrea sulla 8c (PR #25), corretti nel ramo `fase8c-bis-correzioni`. Design approvato in chat da Andrea il 03/10 («Sì, vai con A–F»), senza spec né piano scritti: è una correzione circoscritta. Niente migrazioni, niente prompt del lettore, nessuna chiamata al modello.

## Le cause [misurato in produzione, nel codice o con una sonda nel browser]

| KO | Sintomo | Causa |
|---|---|---|
| 3 | «Dove vanno i pasti» in disordine; spuntino delle 17:30 al mattino; «Dopo cena» in Cena | Lista in ordine di prima comparsa nel piano; fra due slot «Spuntino» il pari merito andava al primo; «dopo cena» non trovava «Dopocena» per lo spazio. Nel piano salvato: 0 piatti in Spuntino pomeriggio e Dopocena |
| 4 | Sale e cannella chiedono la grammatura | Il q.b. veniva solo dalle parole sul foglio («q.b.», «a piacere»); una spezia senza quantità era un dubbio, con una stima prendeva grammi |
| 7 | Indietro → RESTA → indietro esce dall'app | Il dialogo «Esci dall'import?» spingeva voci di cronologia nella reazione al `popstate`, senza un tocco: Chrome Android le salta [ipotesi forte] |
| 9 | Il selettore «È lo stesso di…» a volte non scorre e ha la cima tagliata | Il foglio era montato dentro lo scroller della pagina, che ha `mask-image`: la maschera ritaglia anche i `position: fixed` e testata, tasto e Dock restano sopra il velo [misurato con una sonda a 412×915] |
| 10–11 | Le banane proposte come ingrediente nuovo | Nome al singolare nella dieta, al plurale nell'app: l'abbinamento non li riconosceva |
| — | «Quanto pesa 1 pz di …?» su una quantità inventata | Le stime del lettore votavano l'unità finale come le quantità scritte sul foglio |

## Cosa cambia

- **A. Spezie, erbe, sale e pepe sono q.b.** quando la quantità manca o è stimata (`eSpezia` in `formati-tipici.ts`, solo in testa al nome e per parole intere; «zenzero» da solo no). Una quantità scritta sul foglio resta.
- **B. Singolare e plurale** nell'abbinamento (`stessoNome`/`stessaParola` in `mapping.ts`): banana/banane, arancia/arance, fungo/funghi, uovo/uova; pesca e pesce restano diversi. L'inclusione coi plurali vale solo con il nome corto in testa al lungo e mai fra spezia e non spezia; la guardia spezia vale anche sull'inclusione semplice («Pepe» non finisce su «Peperoni»). Banana e banane nella stessa dieta danno una proposta sola, se le loro unità sono compatibili.
- **C. Le stime non decidono l'unità.** Votano solo le righe trascritte; senza righe trascritte un ingrediente resta nella sua unità. Le stime in un'altra unità si convertono col peso di un pezzo, o si rifanno nell'unità finale senza chiedere. Pesi medi nuovi: aglio 5 g lo spicchio, sedano 50 g la costa, sedano rapa 400 g, scalogno 30 g, porro 150 g, cipollotto 20 g [valori medi, non misurati]. Il Riepilogo elenca le stime portate in un'altra unità («Le quantità che ho stimato io»: «1 pz, quindi 50 g»). CONFERMA I PASTI non trasforma più le righe trascritte in stime.
- **D. Slot:** l'orario decide fra mattina e pomeriggio, poi la posizione nel giorno rispetto al pranzo; i nomi si confrontano anche senza spazi né trattini. La lista segue la posizione degli slot della casa.
- **E. Indietro:** mentre «Esci dall'import?» è aperto la cronologia resta a profondità 0 (`sospeso` in `useLivelliImporta`); RESTA rimette la voce del passo con un push dopo il tocco. Un indietro a dialogo aperto torna alla pagina di provenienza: la bozza resta salvata, come con ESCI.
- **F. `FoglioDalBasso` in un portale su `document.body`** (`useSyncExternalStore` per il primo render lato server): vale per tutti i fogli, compreso il selettore del pasto in Controlla.

## I ruling del controller (costo se sbagliati)

- **I1 del Task 1.** Plurali per inclusione solo in testa e mai fra spezia e non spezia. Costo: qualche doppione in più, preferito dalla spec 8c §A.2.
- **I2 del Task 1.** Una proposta sola per i nomi uguali a meno di singolare e plurale; le chiavi della bozza non cambiano. Costo: due alimenti diversi fusi, improbabile.
- **Task 2.** Le stime rifatte si mostrano nel Riepilogo, non in Controlla, dove la scelta dell'ingrediente non è ancora definitiva. Costo: il numero si vede solo alla fine.
- **Task 2: pesi medi degli aromi.** Il resto dei ripieghi (porzione per categoria, 1 pz, 100 g, 100 ml) resta, ma è visibile. Costo: qualche stima alta per alimenti senza peso medio.
- **Task 2: «sedano rapa» 400 g**, aggiunto dall'implementatore. Costo: una stima alta su un alimento raro.
- **Task 4: `inert`.** Resta aperto il caso teorico di avanti/indietro del browser che riapre il Pannello con un foglio montato. Costo: un foglio raggiungibile con Tab sotto il Pannello.
- **Ondata finale.** Due proposte ml/g dallo stesso nome restano «doppie» e bloccano finché si rinomina. Costo: una domanda in più, nessuna scrittura sbagliata.
- **Bozze salvate prima del deploy.** Tengono la mappatura dei pasti già proposta, e le scelte fatte sul nome fratello potrebbero non leggersi. Costo: nessuno per Andrea, perché la sua bozza è già stata salvata e il nuovo import parte da una bozza nuova.

## Verifiche [misurato]

- **Task.** 4 task più l'ondata finale, ognuno rivisto. Revisori opus su Task 1, Task 2, review finale e ondata finale; sonnet su Task 3 e sulle due verifiche dei fix round.
- **Review finale.** Ha trovato due difetti fra i task: CONFERMA annullava il cambio di unità, e «Pepe» finiva su «Peperoni». Corretti entrambi nell'ondata finale.
- **Ramo fuso con `main`** (home Oggi PR #26, icone PR #27): 3145 test verdi, 1 saltato; tsc e lint puliti.

## Le prove dal telefono da fare (NON ESEGUITE)

Su Chrome Android con l'indietro di sistema, dopo il merge, con un **import nuovo** della stessa dieta:

1. Sale, cannella, origano, pepe: nessuna domanda, nessuna grammatura.
2. Le banane abbinate a quelle che hai, senza «È lo stesso di…».
3. «Dove vanno i pasti» nell'ordine Colazione → … → Dopocena; lo spuntino delle 17:30 nel pomeriggio, «Dopo cena» in Dopocena.
4. Nessun «Quanto pesa 1 pz di …?» per una quantità stimata; nel Riepilogo, sotto «Le quantità che ho stimato io», le stime con i due valori.
5. Le zucchine scritte in grammi passano a grammi come prima, anche dopo CONFERMA I PASTI.
6. Controlla: indietro → «Esci dall'import?» → RESTA → indietro: il dialogo torna (due giri di fila). Indietro a dialogo aperto: torni alle Impostazioni e RIPRENDI ritrova la bozza.
7. TOGLI (la X a destra di una riga) → conferma → indietro: resti in Importa.
8. «È lo stesso di…» in Ingredienti: velo scuro su tutto (testata, Dock), titolo e nota visibili, la lista scorre da ogni punto e l'ultima voce si tocca. Anche a pagina già scorsa, e il selettore del pasto in Controlla.
9. Un foglio della Dispensa e uno del Piano si aprono e si chiudono come prima, anche con l'indietro.
10. Dopo il salvataggio: piatti in Spuntino pomeriggio e Dopocena.
