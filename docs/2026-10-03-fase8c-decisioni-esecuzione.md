# Fase 8c del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 03/10/2026 · **Ramo:** `fase8c-importa-motore` (base `a6118da`) · **Piano:**
`docs/superpowers/plans/2026-10-03-importa-8c.md` · **Spec:**
`docs/superpowers/specs/2026-10-03-importa-8c-design.md` (approvata da Andrea il 03/10)

Questo file è il registro dell'esecuzione della fase 8c: sostituisce il registro che l'esecuzione
subagent-driven tiene in `.superpowers/` (cartella ignorata da git, cancellata alla fine). Raccoglie
le decisioni di Andrea, i ruling del piano e del controller col loro costo, come sono stati eseguiti
i task, i test cambiati per scelta, le misure, i limiti noti e le prove dal telefono da fare.

Etichette: `[misurato]` per ciò che è stato misurato, `[ipotesi]` per ciò che non lo è,
`[fonte: …]` per ciò che viene da altrove. Una misura non fatta si scrive **NON ESEGUITA**.
Nessun numero di questo file è stato misurato nel browser o sul telefono.

## Le decisioni di Andrea (03/10)

Dalla spec, una riga per tema:

| Tema | Decisione |
|---|---|
| Unità diversa fra dieta e ingrediente che hai | Il nuovo piano prevale: proposta già scelta di passare l'ingrediente all'unità della dieta; piatti e dispensa si convertono col peso medio |
| Come si mostra una conversione | Sempre i due valori: «150 g, quindi 0,75 pz», «1 cucchiaio, quindi 15 ml» |
| Peso non in tabella | Una cosa da sistemare, una volta per ingrediente («Quanto pesa 1 pz di …?», ruling del Task 11) |
| Spezie | «Quanto basta» è un valore: niente grammatura, non blocca |
| Cucchiai e cucchiaini | Unità della dieta, convertite in ml o g |
| Proposte | Ogni cosa aperta arriva con la risposta proposta e già scelta |
| Indietro di Android | Passo prima; da Controlla il dialogo «Esci dall'import?» RESTA / ESCI |
| Tasto finale | Sempre SALVA IL PIANO; dialogo solo con un piano attuale, blu notte (`primario`); attesa con avanzamento; poi il Piano con «Piano salvato» |

Dopo il piano (03/10, dal ledger):
- la 0016 converte anche le liste non chiuse; «Piano salvato» è una Riga di stato; il dialogo di
  uscita arriva al primo indietro in Controlla (K.5); i testi del piano vanno bene;
- spese approvate: un'estrazione del PDF per la misura di partenza, la copia locale (fuori git) di
  ingredienti e pasti, l'eval dei cucchiai;
- dopo la misura intermedia, «Falle tutte e tre»: i Task 12b (porzioni per categoria e domande per
  alimento) e 12c (il lettore stima sempre una quantità), poi il Task 13. Il Task 12d è nato da una
  diagnosi del controller (sotto, «I task aggiunti»).

## I ruling del piano

Uno per riga, dal piano. Il piano non dichiara il costo di questi ruling, tranne dove scritto.

- **Task 1.** La funzione converte anche le righe delle liste non ancora chiuse (confermato da
  Andrea): una lista aperta in pz, chiusa dopo il cambio, scriverebbe pezzi in un ingrediente in
  grammi. Liste chiuse e `risparmio_settimana` restano istantanee.
- **Task 1 (D12).** «Lista aperta» = una `shopping_list` la cui `week` ha `stato <> 'chiusa'`, come
  nella 0015, non `chiusa_il is null`.
- **Task 1.** Gli arrotondamenti della spec §A.3 valgono anche nel database per righe dei piatti e
  confezione (pz al quarto, minimo 0,25; g all'intero, minimo 1); residuo, storni, acquisti e liste
  aperte si moltiplicano senza arrotondare.
- **Task 1.** Le righe in `kg` valgono 1000 g prima del fattore; le righe q.b. restano null.
- **Task 2.** Una voce di lista solo q.b. è una confezione (`confezioni: 1`, `fabbisogno: 0`,
  nessun dettaglio); «residuo 0» è il residuo utilizzabile.
- **Task 3.** La voce «Q.B.» compare sotto la pillola col campo a fuoco, 44 di tocco; il tocco non
  toglie il fuoco al campo; una riga q.b. mostra «Q.B.», toccata torna il campo vuoto.
- **Task 4.** Le tabelle sono medie da fonti comuni (merceologiche, LARN/SINU), segnate come tali;
  chiavi per parole intere, singolare e plurale; il sale e un altro alimento che si dosa a occhio
  non sono in `PORZIONE_TIPICA`.
- **Task 5.** Il lettore scrive il numero dei cucchiai, mai la conversione; se il foglio scrive
  anche g o ml, valgono quelli.
- **Task 5.** Nell'eval una riga a cucchiai passa il cancello anti-fabbricazione se il suo numero
  si legge nel testo (cifre o «un», «mezzo», «due», «tre»).
- **Task 6.** La scelta esplicita «nuovo» vince sul nome; col nome di un ingrediente che hai è un
  `doppio`; al commit si aggancia solo al nome esatto con la stessa unità.
- **Task 6.** Il peso di un pezzo si cerca prima col nome dell'ingrediente che hai, poi con
  l'alimento; più alimenti sullo stesso ingrediente fanno un cambio solo.
- **Task 6.** Un abbinamento automatico al livello 2 non offre «È lo stesso di…»: l'alternativa è
  «Tienile a pezzi».
- **Task 7.** Il tipo `proposta` è un gruppo irrisolto con una risposta proposta sul piano letto:
  sta in «Da controllare» e ci resta anche dopo la risposta.
- **Task 7.** CONFERMA I PASTI scrive le proposte nelle correzioni con `quantitaInferita: true`;
  porzione e cucchiai riempiono solo le righe irrisolte, l'unità più frequente riscrive il gruppo.
- **Task 7.** L'unità di una proposta: ingrediente che hai con lo stesso nome, poi `unitaNota`,
  poi la porzione tipica; fra ml e altro nessuna proposta; i cucchiai a pezzi non hanno proposta.
- **Task 7.** I testi delle proposte in Controlla («porzione tipica, proposta da me», «1 cucchiaio,
  quindi 15 ml, proposta da me», «l'unità più usata, proposta da me», «· quanto basta»).
- **Task 7 (S1).** `quantoBasta` riconosce il q.b. dal testo anche con una quantità inferita, che
  si scarta; una quantità trascritta vince sempre. Costo se sbagliato (dal piano): una riga «olio
  q.b.» perde una quantità proposta.
- **Task 7 (D2).** Il q.b. non è un'unità: `unitaDiverse` e l'unità più frequente contano solo le
  righe con un'unità.
- **Task 7 (D4).** Nel foglio del giorno una riga di un gruppo con proposta non è un `dubbio`.
- **Task 8.** Ogni riga va nell'unità finale del suo ingrediente; fra g e pz col peso del cambio,
  arrotondato; fra altre unità resta «Unità incompatibile»; il q.b. prende l'unità senza numero.
- **Task 8.** Scritture a blocchi: ingredienti in un `insert` con id del client, dispensa in un
  `upsert`, disattivazioni in un `update`, una RPC per cambio, piatti quattro alla volta [ipotesi
  del piano: 4 in parallelo non stressano PostgREST].
- **Task 8.** L'ordine: ingredienti, dispensa, cambi di unità, disattivazioni, piatti,
  impostazioni, bozza.
- **Task 9.** La bozza si salva solo nel ramo del modello; il client col JWT dell'utente si crea
  sempre in quel ramo.
- **Task 9.** Il telefono che non riceve la risposta rilegge la bozza prima di mostrare l'errore.
- **Task 10.** Le voci dei passi le tiene la pagina (una per `revisione`, due per `formati`, tre per
  `riepilogo`); i passi dichiarano i loro livelli con `useLivelliImporta`.
- **Task 10.** Anche la pillola IMPOSTAZIONI esce con `esci()` quando la bozza è aperta.
- **Task 10.** La prova K.5 si legge così: dopo TOGLI il primo indietro resta in Importa e apre
  «Esci dall'import?»; RESTA lo chiude (la spec contava due indietro).
- **Task 11.** Il cap dell'altezza vale per ogni foglio `contenuto` (88 dalla cima); nel Selettore
  scorre la lista, titolo e nota restano fermi.
- **Task 11.** Nel Selettore di una proposta in g o pz ci sono anche gli ingredienti nell'altra
  unità, con la nota della conversione; la riga dice «Ingrediente nuovo» o il nome scelto.
- **Task 11.** I testi della Scheda del cambio, tra cui «Quanto pesa 1 pz di …?» al posto di
  «Quanto pesa una X?» della spec (genere e numero del nome non noti).
- **Task 11.** Rinominare una proposta toglie la scelta di un ingrediente che hai, non la scelta
  «nuovo».
- **Task 12.** «Piano salvato» è una Riga di stato, non un avviso a comparsa; il segno passa da
  `sessionStorage` e si consuma.
- **Task 12.** Dopo il tocco il Dock resta con SALVA IL PIANO spento e «Salvo il piano…» al posto
  del riassunto; il dialogo si chiude al tocco; i passi «Gli ingredienti.», «I piatti: 5 di 31.»,
  «Ancora un attimo.».
- **Task 12.** Il riassunto (piatti nuovi, aggiornati, tolti, ingredienti nuovi, settimane, una riga
  per cambio di unità); il testo del dialogo omette le parti a zero.

## I ruling del controller

Dal ledger, raggruppati per task, ciascuno col costo se sbagliato.

- **Piano.** Accettate le interpretazioni dell'agente su D11 (la prima parte presente porta il
  sostantivo), S1 (toccati anche `ingredientiDaAbbinare` e `raccogliDubbi`), D1 (già nel Task 10).
  Costo: nessuno.
- **Task 0.** Il minor «JSON.parse su un file malformato stampa uno spezzone» sale a Important:
  viola il vincolo sui dati personali. Costo: nessuno.
- **Task 1.** M1 (`p_unita` null), M2 (`p_fattore` NaN) e M6 (il test fissa la guardia sul q.b. e i
  1000 dei kg) si correggono subito: dopo l'applicazione servirebbe una 0017. Costo: un giro breve.
- **Task 5.** M1 (un numero in lettere vale per la provenienza) promosso nel giro di correzione,
  perché l'eval deve misurare il prompt finale. Costo: nessuno.
- **Task 5, eval.** L'eval è considerata superata per il merge: nessuna regressione dimostrata,
  fabbricate 0. Costo se sbagliato: il lettore nuovo abbina un po' meno, da rimisurare nella 8e con
  più giri.
- **Task 6.** Accettati il test di `legataA` riscritto come la P2 e la guardia «peso salvato non
  finito o ≤ 0 → motivo `peso`» invece di ricadere sulla tabella. Costo: nessuno.
- **Task 7.** Accettati `FoglioGiorno` con `qb || unitaBaseDi(...) === null ? null : quantita`
  (tiene il fix I1 del Task 5) e `dubbi-8b.ts` creato con `cp` (copia fedele, poi Edit). Costo:
  nessuno.
- **Task 7.** Sulle concern: `unitaNota` salta le righe q.b.; `confermaTutti` non scrive mai una
  proposta su una riga q.b.; `unitaDelGruppo` salta le righe q.b. invece di uscire con null. Costo:
  nessuno, le righe q.b. non hanno unità da imporre.
- **Task 7 (I2 + M1).** Nel foglio del giorno una riga q.b. si corregge con una quantità: niente
  unità fissa dalla stima del q.b.; senza un'unità nota dal gruppo la riga mostra le pillole; il
  numero scritto si salva. Costo: nessuno.
- **Task 8 (concern 1).** Ogni riga va nell'unità finale del suo ingrediente; fra g e pz col peso
  (cambio, poi peso scritto, poi `PESO_PEZZO`); senza peso, motivo `peso` anche senza cambio di
  unità. Costo se sbagliato: una riga convertita con un peso medio.
- **Task 8 (concern 2).** Disattivazioni a blocchi (limite d'URL non noto). Costo: nessuno.
- **Task 8 (I1).** L'unità finale di un ingrediente si ricava solo dalle righe della dieta che vi
  finiscono (la più frequente fra g e pz, a pari merito la prima), mai dallo stato attuale; con
  «tieni» la RPC non parte; vale anche per le proposte nuove con righe g e pz, che non bloccano più
  (decisione 7 dell'8b superata). Costo se sbagliato: in un caso misto vince l'unità più frequente
  invece di quella dell'ingrediente.
- **Task 8 (I2).** Disattivazioni a blocchi di 100 id, test riscritto; M2 e M5 nello stesso giro.
  Costo: non dichiarato nel ledger.
- **Task 8.** Accettato il ripiego per inclusione su un ingrediente g/pz già raggiunto da un altro
  alimento dello stesso piano, che scatta solo al ritentativo. Costo se sbagliato: un alimento
  senza proposta che al ritentativo finisce su un ingrediente simile.
- **Task 8 (parcheggiati).** Tre limiti noti accettati come rari: un alimento il cui nome include
  quelli di due ingredienti che hai, con lo stesso inizio di nome e in unità diverse (due candidati
  per inclusione); N1, la bozza vecchia ripresa al riepilogo che attraversa unità diverse per
  inclusione; O1, l'import interrotto fra due RPC (una varietà di un ingrediente che hai finisce su
  quell'ingrediente per inclusione). Costo: la stessa classe del ripiego per inclusione; per O1 i
  dati restano coerenti.
- **Task 9.** Si corregge ogni asserzione sul client con l'identità (`toBe`), e il log della bozza
  aggiunge `code`. Costo: nessuno.
- **Task 11.** Accettati `sezioniIniziali` con cambi e pesi facoltativi; `pesiProposte` via
  `cambioDelPeso`; il diretto con l'unità che resta ha la Scheda solo se manca il peso; la frase
  «Tutti gli ingredienti del piano abbinano già qualcosa che hai; per uno mi serve il peso di un
  pezzo.»; il campo del peso resta visibile dopo averlo scritto. Costo: testi rivedibili nell'8d.
- **Task 11.** Promossi M1 (la frase conta anche i cambi dentro una proposta scelta), M4 (il Dock da
  `passoBloccato`), M6 («1.000» è mille). Costo: nessuno.
- **Task 11.** Un diretto nato dopo l'ingresso, col peso noto e l'unità che cambia, entra in «Da
  controllare». Costo: nessuno.
- **Task 12b (dubbi).** In Controlla la nota mostra il testo della prima riga e «In N pasti»; una
  risposta per alimento vale per tutti gli usi; un composto non escluso prende il ripiego, «proposta
  da me»; il test della decisione 8 adattato. Costo: proposte da correggere a mano in casi rari.
- **Task 12b (review).** Promossi M1 (la risposta per alimento non riscrive righe con quantità,
  nemmeno inferite), M2 (il ripiego vale solo se la parola chiave è la testa dell'alimento, più
  esclusioni), M3 (plurali e singolari mancanti). Costo: nessuno.
- **Task 12c (I2).** «A volontà» non è un q.b.: via dal prompt e dai test; per «verdure a volontà»
  il lettore stima la porzione. M1 promosso: «MAI inventare» vale per le quantità trascritte. Costo
  se sbagliato: una porzione stimata dove Andrea voleva «se manca».
- **Task 12c, eval.** Nessuna regressione del lettore. Costo se sbagliato: un raro numero letto
  male segnato come trascritto.
- **Task 12d.** Settimane doppie di una pagina unite prima di validare; numeri di settimana
  vincolati all'indice della pagina; la pagina 2 instabile va nella 8e, segnalata ad Andrea come
  rischio attuale. Costo se sbagliato: un numero di settimana riportato male su una pagina a
  settimana singola.
- **Task 12d.** Accettati il riallineo prima dell'unione e il riallineo silenzioso. Costo:
  trasparenza minore in revisione.
- **Task 12d (Minor 1).** L'unione per pagina unisce solo le voci settimana; giorni doppi nella
  stessa settimana restano un errore (in `giorni_tipo` sono scenari diversi). Costo: nessuno.
- **Review finale (C1).** La 0016 portava un ingrediente «intero» da pz a g lasciandolo «intero»:
  «intero» vuol dire formato 1 a pezzi, e in grammi lista, planner e risparmio avrebbero contato
  una confezione per grammo (sonda del revisore: 600 g di fabbisogno → 600 confezioni [misurato]).
  Nella stessa update dell'ingrediente, passando a g la classe «intero» diventa «porzionabile»; da g
  a pz la classe resta. Corretto nella 0016 prima di applicarla. Costo: nessuno.
- **Review finale (I1).** La guardia di `p_fattore` rifiuta anche un fattore oltre 100000 (100 kg a
  pezzo): ferma `'Infinity'::numeric` su ogni versione di Postgres. Costo: nessuno.
- **Review finale (I3).** «Intero» solo con l'unità pz: le voci in g della tabella dei formati
  nascono «porzionabile» (2 delle 11 proposte della lettura di
  Andrea nascevano «intero» in g [misurato dal revisore]); la Scheda dell'ingrediente offre
  «Intero» solo a pezzi e mostra «Porzionabile» per un «intero» in g di una bozza vecchia; come rete
  `traduciBozza` scrive «porzionabile» un nuovo «intero» in g o ml. Una regola sola,
  `classeCoerente` in `formati-tipici.ts`. Costo: nessuno.

## Le correzioni del controllo preliminare

I ruling P1–P9, D1–D14 e S1 del piano (`857abc8`), una riga ciascuno, col costo del ledger.

- **P1.** La voce `peso` di `TESTO_AVVISO` entra con il Task 6, nel suo commit. Costo: nessuno.
- **P2.** Il test di `nomiDoppi` con un nome in g contro lo stesso in pz cambia per la spec §A.2. Costo se sbagliato:
  un test da ripristinare.
- **P3.** Il caso `pari` usa `pianoConOlive([['cena'], ['cena']])`. Costo: nessuno.
- **P4.** Il test di Controlla «I2 … con le pillole» si riscrive con le attese nuove. Costo: nessuno.
- **P5.** `annulla?: string` dentro `PropsDialogo`. Costo: nessuno.
- **P6.** Il test del riepilogo «caricamento fallito» usa
  `mockResolvedValueOnce([]).mockRejectedValueOnce(...)`. Costo: nessuno.
- **P7.** I test del Piano su «Piano salvato» chiamano `mockCarico()` in testa. Costo: nessuno.
- **P8.** Il «prima» dell'eval dal checkout principale su `main`, il «dopo» dal worktree. Costo:
  nessuno.
- **P9.** La misura usa un'estrazione nuova del PDF di Andrea, approvata, fatta dal controller,
  salvata in `diete/misura-8c/` e riusata. Costo: qualche decina di centesimi [ipotesi del ledger;
  il costo vero sotto, «Le misure»].
- **D1.** L'indietro del passo di Riepilogo non fa niente mentre `eseguendo`. Costo: nessuno.
- **D2.** `unitaDiverse` e l'unità più frequente contano solo righe con un'unità. Costo: nessuno.
- **D3.** `SchedaCambio` anche nel ramo non scelto col motivo `peso`. Costo: nessuno.
- **D4.** Nel foglio del giorno una riga con proposta non è `dubbio`. Costo: piccolo, lo rifà l'8d.
- **D5.** `pillola()` esportata da `SchedaCambio.tsx` e importata. Costo: nessuno.
- **D6.** `voceDi` usa `voceTabella`. Costo: nessuno.
- **D7.** `leggiSlotDefs` e `salvaBozzaImport` delegano alle versioni col client. Costo: nessuno.
- **D8.** Niente `expect(true).toBe(true)` nello script di misura: messaggio e `it.skipIf`. Costo:
  nessuno.
- **D9.** Lo script di misura usa `statoRevisioneIniziale` del Task 9. Costo: nessuno. Fatto nel
  Task 13 (`4ac3428`).
- **D10.** L'Expected del Task 2 Step 2: fallisce solo il primo test. Costo: nessuno.
- **D11.** `testoDialogo` mette sempre il sostantivo («12 piatti aggiornati»). Costo: nessuno.
- **D12.** «Lista aperta» = `week.stato <> 'chiusa'`. Costo: nessuno.
- **D13.** L'unico `useIndietroFogli` attivo di Importa è quello di `LivelliImporta`. Costo: nessuno.
- **D14.** La mappa dei file completata. Costo: nessuno.
- **S1.** `quantoBasta` riconosce il q.b. dal testo anche con una quantità inferita, che si scarta;
  una quantità trascritta vince; il prompt non cambia per questo. Costo se sbagliato: una riga
  «olio q.b.» perde una quantità proposta (resta q.b.: in lista se manca).

## Come sono stati eseguiti i task

Un implementatore alla volta; ogni task con review (modello del revisore tra parentesi). Commit e
giri di correzione dal ledger.

- **Task 0** (lo script di misura, `453c6c7` → `18770a3`, review sonnet). 1 giro: l'id perso nelle
  righe del client finto, e l'errore di lettura che citava la bozza.
- **Task 1** (migrazione 0016, `c853b9f` → `46b71b3`, review opus). Approvato con 8 minor; 1 giro
  per M1, M2, M6 prima dell'applicazione.
- **Task 2** (q.b. nel dominio e nei dati, `d7e7a01`, review opus). 0 giri, nessun Important.
- **Task 3** (la voce «Q.B.», `22e1627` → `b557130`, review sonnet). 1 giro: la voce non era
  raggiungibile da tastiera. L'implementatore ha modificato tre file con uno script Python (vietato
  dalle regole): la review ha verificato codifica e accenti integri.
- **Task 4** (pesi, cucchiai, porzioni, `b52bef1`, review sonnet). 0 giri, 3 Low.
- **Task 5** (il lettore e i cucchiai, `ad3f0b6` → `9af62c4`, review opus). 1 giro: il foglio del
  giorno precompilava il numero dei cucchiai come quantità («1 cucchiaio» di olio → 1 ml).
- **Task 6** (abbinamento a due livelli, `ead91cf`, review opus). 0 giri, nessun Important.
- **Task 7** (q.b. e proposte in Controlla, `d92366b` → `5c96bd0` → `2b10209`, review opus). Un giro
  sulle concern prima della review, poi 1 giro: la proposta ignorava le righe già risolte del
  gruppo; una riga q.b. nel foglio perdeva il numero scritto.
- **Task 8** (le scritture, `e593671` → `2c189a4`, review opus). 1 giro: il ritentativo dopo la RPC
  rifaceva un cambio inverso; disattivazioni in un solo `in(...)`. 2 limiti parcheggiati.
- **Task 9** (la bozza la salva il server, `dfeee95` → `3d788db`, review opus). 1 giro: i test del
  client confrontavano per struttura invece che per identità. Due file scritti con heredoc: codifica
  verificata byte per byte.
- **Task 10** (l'indietro per passi, `b3f30d6`, review opus). 0 giri, nessun Important.
- **Task 11** (È lo stesso di… e la Scheda del cambio, `48bf0a3` → `14eec83`, review opus). 1 giro:
  un cambio diventato diretto dopo l'ingresso non aveva né sezione né campo.
- **Task 12** (SALVA IL PIANO, `eaff5af`, review opus). 0 giri, nessun Important; 7 minor.
- **Task 12b** (porzioni per categoria, `2906fca` → `da649df`, review opus). 1 giro (M1, M2, M3).
- **Task 12c** (il lettore stima sempre, `8261e5b` → `ab2e467`, review opus). 1 giro: una frase
  residua sulla `quantita null`, «a volontà» nel prompt ma non in `quantoBasta`, «MAI inventare».
- **Task 12d** (settimane frammentate di una pagina, `26412a7` → `b1d3d7a`, review opus). 1 giro
  (Minor 1 e 4).
- **Task 13** (questo: lo script di misura con le funzioni dell'app, `4ac3428`; i documenti e il
  registro). Nessun file in `src/` toccato. Alla fine: `npm test` 2644 passati e 1 saltato su 163
  file, `tsc` e `lint` verdi [misurato].
- **Ondata finale** (dopo la review finale, opus): C1 e I1 nella 0016, I3 nelle proposte, nella
  Scheda e in `traduciBozza`, l'Important e i minor della review del Task 13 nei documenti e nello
  script di misura; poi `main` fuso nel ramo (I4). Un giro solo.

## I task aggiunti: 12b, 12c, 12d

- **12b e 12c** nascono dalla misura intermedia (sotto): 94 dubbi bloccavano ancora su 124, tutti
  righe senza quantità di alimenti fuori da `PORZIONE_TIPICA`, e il lettore non stimava niente.
  Decisione di Andrea, «Falle tutte e tre»: porzioni per categoria (verdure 200 g, frutta 150 g,
  1 pz senza peso) e domande senza quantità raggruppate per alimento (12b); il lettore propone
  sempre una quantità stimata quando il foglio non la scrive, tranne i q.b. (12c, con un'eval).
- **12d** nasce dalle letture del PDF col prompt definitivo: 3 su 4 fallivano con «settimane[1].numero
  duplicato: 1» o «fuori da 1..4». La diagnosi del controller (6 chiamate) ha trovato l'errore nella
  validazione della risposta di una pagina (la pagina 4 contiene due settimane). Il 12d unisce le
  settimane doppie di una pagina prima di validarle e vincola i numeri all'indice della pagina.
  Senza costi di modello per l'implementazione.

## I test cambiati per scelta della spec

Ognuno col motivo. Un test caduto per un altro motivo sarebbe stato una regressione.

- **`nomiDoppi`, Task 6 (P2)** (`ingredienti.test.ts`): un nome in g contro un esistente con lo
  stesso nome in pz non è più doppio (spec §A.2, cambio di unità fra g e pz: `size 0`); il doppio
  resta fra ml e pz.
- **`legataA`, Task 6** (`ingredienti.test.ts`, non previsto dal piano): un alimento in g contro un
  esistente in pz con lo stesso nome a maiuscole diverse ora è legato (`toBe(...)`), fra ml e pz
  resta `null`. Stesso motivo della P2.
- **Task 7, Step 5, regola (a)** (correzione S1): le righe «olio q.b.» e «sale q.b.» ora sono q.b. e
  non fanno più un dubbio né un gruppo «inferita». In `dubbi.test.ts` (`pianoConOlio`,
  `pianoConDueSale`, «una quantità proposta dall'AI è un gruppo «inferita»», `pianoConSale` usato
  anche dal differenziale) e in `controlla.test.tsx` (`pianoConSale`, «togliere un dubbio in più
  pasti passa dal dialogo», «I1: una riga di «Da controllare»…») il testo diventa «olio a filo» e
  «sale fino», con le chiavi e le note attese. Così i test provano ancora quello che provavano.
- **Task 7, Step 5, regola (b)**: un gruppo di un alimento in `PORZIONE_TIPICA` o con unità diverse
  lette dall'AI ha `tipo: 'proposta'` e `pronto` vero (spec §D). In `dubbi.test.ts`: «I2: lo stesso
  gruppo risolto in pz e in g…» diventa «… ha la proposta dell'unità più frequente, e pronto è vero»;
  «la stessa riga su 14 pasti…» e «I2: unità diverse lette dall'AI…» passano a `tipo: 'proposta'`.
- **Task 7, Step 5, regola (b-bis)** (correzione P4): in `controlla.test.tsx` «I2: lo stesso gruppo
  con unità diverse nei giorni sta in «Da sistemare» con le pillole…» è sostituito da «… ha la
  proposta dell'unità più frequente, non blocca, e una risposta col solo numero vale per tutti»:
  «Fatto», niente avviso, CONFERMA accesa, niente pillole. Conseguenza voluta della spec §D.
- **Task 7, Step 5, regola (c)**: nessun test confrontava un `GruppoRighe` intero: niente da
  cambiare.
- **Decisione 8, Task 12b** (`dubbi.test.ts`, «nessuno dei due fissa l'unità dell'altro»): usava due
  righe senza quantità dello stesso alimento, che ora sono un gruppo solo; la seconda riga diventa
  «1 cucchiaino di sale», così esistono ancora due gruppi irrisolti dello stesso alimento. Il caso
  con due righe senza quantità è nel differenziale.
- **Task 8, I2** (`src/data/__tests__/importa.test.ts`, riscritto): le disattivazioni vanno a
  blocchi di 100 id.
- **Task 11 (P6)** (`riepilogo.test.tsx`, «caricamento fallito: uno stato vuoto, e RIPROVA
  rilegge»): `mockRejectedValueOnce` diventa `mockResolvedValueOnce([]).mockRejectedValueOnce(...)`,
  perché la pagina legge il repertorio al mount e consumerebbe il rifiuto.
- **Task 11, Step 4**: nessun test di `ingredienti.test.tsx` cercava «No, è un ingrediente nuovo»
  come valore della riga [fonte: report del Task 11]: nessuna attesa da aggiornare.
- **Task 12c**: «a volontà» tolto dai test del prompt insieme al prompt (ruling I2).
- **Task 12d** (`fusione.test.ts`): tolto il test sulla nota dei titoli, la regola non c'è più; in
  `import-ai.test.ts` il caso a più settimane frammenta la settimana 1 su giorni diversi.

## Le misure

### La lettura salvata (Task 0, Step 5, controller)

- Estrazione del PDF di Andrea con `claude-sonnet-5-5` il 03/10: 4 chiamate, 18956 token in uscita,
  119601 token di cache scritti, 55 s [misurato]. Salvata in `diete/misura-8c/bozza.json`, fuori
  da git. Il costo di questa chiamata da sola non è stampato: è dentro la stima delle letture del
  PDF (sotto, «I costi»).
- Gli altri input, copiati da produzione in sola lettura: `ingredienti.json`, 92 ingredienti di
  Andrea com'erano prima dell'import del 03/10, esclusi i 5 creati quel giorno; `slot.json`, 6
  pasti [misurato]. Nessun repertorio.
- Visto copiando i dati: l'import del 03/10 ha creato «Mela» (g) accanto a «Mele» (pz), e un
  ingrediente accanto a uno quasi uguale che differisce per una preposizione [misurato]: è la prova
  del difetto dei KO 10/12.

### La misura di partenza (codice `18770a3`, comportamento dell'8b) [misurato]

- Controlla: 122 dubbi che bloccano su 124, 0 pasti senza abbinamento.
- Ingredienti: 0 proposte che bloccano su 5.
- Scritture: 9 ingredienti, 28 piatti, 0 disattivazioni → 133 richieste [misurato]; durata 16.2 s
  con 120 ms a richiesta [ipotesi sulla latenza].
- Il conto delle richieste esclude la risoluzione dell'id della casa (`rpc casa_id`, memorizzata a
  regime) [fonte: review del Task 0, M4].

### La misura intermedia (codice `14eec83`, dopo il Task 11) [misurato]

- Controlla: 94 dubbi che bloccano su 124 (prima 122). Ingredienti: 0 su 5.
- Scritture: NON MISURATE, perché lo script, nel completamento d'ufficio, rispondeva «g» ai dubbi
  senza unità e non simulava il peso di un pezzo → `BozzaIncompletaError`.
- Diagnosi (agente opus) [misurato]: i 94 sono tutti righe senza quantità di alimenti fuori da
  `PORZIONE_TIPICA` (39 alimenti, circa 18 verdure o frutta specifiche, 75 righe); il lettore
  aveva stimato 0 righe su 117; nessun bug nel codice dell'app. Il difetto era dello script:
  corretto nel Task 13 (`4ac3428`) con le funzioni dell'app (`statoRevisioneIniziale`, gli
  ingredienti della casa a `gruppiRighe` e `confermaTutti`, `sceltiIniziali`, la risposta d'ufficio
  nell'unità dell'ingrediente che hai, i pesi mancanti a 100 g contati e stampati, il contatore di
  Ingredienti anche sullo stato completato). Lo script corretto è stato provato su una bozza finta
  di sei righe, non sui dati di Andrea.

### Misura dopo (controller, HEAD `d4296f3`, script corretto) [misurato; durata = ipotesi 120 ms/richiesta]

- Stessa lettura del «prima» (`bozza.json`, prompt di `main`): Controlla 27 dubbi che bloccano su 52
  gruppi (23 con proposta); Ingredienti 0 bloccanti; scritture 5 ingredienti, 28 piatti, 0 cambi →
  117 richieste, 4,0 s.
- Lettura col lettore 8c (`bozza-8c.json`, 248 righe, 14 giorni): Controlla 2 su 125 (17 con
  proposta); Ingredienti 2 bloccanti (2 cambi di unità, 1 senza peso); scritture 11 ingredienti, 30
  piatti, 2 cambi → 127 richieste, 4,7 s. Lo script contava fra i «senza peso» anche i cambi con
  l'unità che resta (`da` uguale ad `a`): nell'ondata finale conta solo i cambi veri, come «cambi di
  unità». Rimisurata con lo script corretto (HEAD `59466f0`) [misurato]: Controlla 2 su 125,
  Ingredienti 2 bloccanti, 2 cambi di unità di cui 1 senza peso, 127 richieste. I numeri non
  cambiano: il cambio senza peso era un cambio vero.
- Prima della 8c: 122 su 124; 133 richieste, 16,2 s.

| | Prima (8b, `bozza.json`) | 8c, lettura vecchia (`bozza.json`) | 8c, lettura nuova (`bozza-8c.json`) |
|---|---|---|---|
| Domande che bloccano in Controlla [misurato] | 122 su 124 | 27 su 52 | 2 su 125 |
| Bloccanti in Ingredienti [misurato] | 0 su 5 | 0 | 2 |
| Richieste di scrittura [misurato] | 133 | 117 | 127 |
| Durata [ipotesi 120 ms/richiesta] | 16,2 s | 4,0 s | 4,7 s |

**Avvertenza sui denominatori.** Le colonne non sono confrontabili riga per riga: prima della 8c
le domande di Controlla erano un gruppo per riga (124), dal Task 12b sono un gruppo per alimento
(52 e 125 contano gruppi diversi). E la lettura nuova da 248 righe è il caso migliore delle letture
col lettore 8c, che sullo stesso PDF vanno da 112 a 248 righe [misurato, sotto «Le letture del PDF
di Andrea»]: con una lettura più corta i numeri della terza colonna sarebbero diversi [ipotesi, non
misurata].

### L'eval del lettore (Task 5, Step 6, controller; dieta 6, 6 foto, `claude-sonnet-5-5`) [misurato]

- Prima (`main`): giro 1 abbinati 74/82, esatte 92/172, fabbricate 0, 0,61 €; giro 2 abbinati
  74/82, esatte 94/169, fabbricate 0, 0,31 €.
- Dopo (ramo 8c): giro 1 abbinati 70/82, esatte 86/161, righe a cucchiai 1, fabbricate 0, 0,60 €;
  giri 2 e 3 FALLITI in circa 7 s con `PianoNonValidoError` «indice.pagine: vuoto».
- Sonda sull'indice (solo la chiamata dell'indice, dieta 6): prompt nuovo 2/3 poi 10/10 riuscite;
  prompt vecchio 3/3 poi 8/10. L'indice vuoto è preesistente e intermittente (circa 1 su 6
  [misurato, somma di sonde e giri]), non una regressione del Task 5. La differenza 74 → 70 su un
  giro solo non è conclusiva [ipotesi: rumore].
  Le 8 occorrenze di «cucchia» nel ground truth della dieta 6 → 1 riga letta come cucchiai.
- Manifest assente: misurato solo questo caso.
- Costo totale di eval e sonde circa 2,5 € [stima dai costi stampati, più le chiamate dell'indice
  non stampate].

### L'eval del lettore dopo il Task 12c (prompt definitivo `ab2e467`, dieta 6) [misurato]

- Giro A FALLITO (`PianoNonValidoError`, l'intermittente preesistente).
- Giro B: abbinati 73/82, esatte 93/162, inferite 47, fabbricate 1, 0,55 €.
- Giro C (debug): abbinati 72/82, esatte 94/166, inferite 49, fabbricate 0, 0,32 €.
- L'unico dump disponibile (30/08, modello vecchio) mostra una «fabbricata» col numero leggibile nel
  testo ma assente dal ground truth: un limite del cancello [ipotesi per le corse di oggi].

### Le letture del PDF di Andrea dopo la lettura di partenza

- Prompt `8261e5b` (12c, prima della correzione): 165 righe, 0 senza quantità, 143 inferite, 22
  trascritte [misurato]. La lettura di partenza, riconciliata: 164 righe, 148 con quantità null, di
  cui 117 dubbi irrisolti (le altre q.b. o non dubbi); 13 trascritte, 3 inferite [misurato].
- Prompt definitivo `ab2e467`: giro 1 FALLITO «settimane[1].numero duplicato: 1»; giro 2 FALLITO
  «settimane[1].numero fuori da 1..4»; giro 3 riuscito (5 chiamate, 248 righe, 14 senza quantità,
  142 inferite); giro 4 FALLITO «duplicato: 1». Totale 1/4; col prompt di prima 4/4 [misurato,
  campione piccolo].
- Diagnosi (agente opus, 6 chiamate) [misurato]: l'errore nasce nella validazione della risposta di
  una pagina, non nella fusione; la pagina 4 contiene due settimane; la pagina 2 entra nell'indice
  in modo instabile (vuota in 2 indici su 3; quando entra porta 3 pasti in più: 165 contro 248
  righe). Anche il prompt in produzione perde pasti in silenzio [ipotesi forte]. Il fallimento non
  si è riprodotto nella sonda.
- Dopo il Task 12d (`26412a7`): 4/4 riuscite (prima 1/4); righe 171, 171, 165, 112 (una volta 248);
  senza quantità 1–2; inferite 97–142 [misurato]. La completezza resta instabile: il lettore perde
  pagine in silenzio [ipotesi forte].
- La lettura completa per la misura finale (`26412a7`): 5 chiamate, 248 righe, 2 settimane, 14
  giorni, 15 senza quantità, 142 inferite [misurato] → `diete/misura-8c/bozza-8c.json`.

### I costi

- Eval della dieta 6: 0,61 + 0,31 + 0,60 + 0,61 + 0,55 + 0,32 € [misurato dai log] ≈ 3,0 €.
- Letture del PDF di Andrea, 11 (2 riuscite col modello vecchio prima della 8c, 9 col ramo, di cui
  3 fallite in pochi secondi), più le sonde dell'indice (circa 30 chiamate piccole): stima 4–6 €
  [ipotesi]. Le letture fatte con la sonda non stampano il costo. Comprende l'estrazione per la
  misura di partenza.
- Il credito si è esaurito il 03/10 ed è stato ricaricato da Andrea.

### La migrazione 0016 (Task 1, Step 5)

- Prima di scriverla, in sola lettura: `dish_ingredient_quantita_check` = `CHECK (quantita > 0)`, e
  la colonna è anche `NOT NULL` [misurato dal controller].
- Le tre letture di verifica dopo l'applicazione (il check che ammette il null, `prosecdef` e
  `proconfig` della funzione, nessun `execute` ad `anon`): **NON ESEGUITE**, perché la 0016 non è
  ancora applicata. La applica il controller in produzione prima del merge, con l'ok di Andrea.

### La durata vera delle scritture

**NON ESEGUITA**: si misura col cronometro nella prova K.8, dal tocco di SALVA al Piano.

## I limiti noti

1. Le righe si convertono solo fra g e pz: fra ml e altro resta «Unità incompatibile».
2. Un ingrediente nuovo con righe della dieta in g e in pz non è più un `BozzaIncompletaError`: dal
   ruling I1 del Task 8 nasce nell'unità più frequente e l'altra si converte col peso, o il passo
   chiede il peso (il piano prevedeva il contrario: il ruling lo ha superato).
3. I cucchiai di un ingrediente a pezzi non hanno proposta.
4. Pesi, cucchiai e porzioni sono medie [fonte: tabelle merceologiche e LARN/SINU, ruling del Task
   4]: si mostrano coi due valori e si correggono.
5. La durata vera delle scritture si sa solo dalla prova K.8.
6. La nota dell'attesa cambia solo dopo la prova K.1, in un commit a parte.
7. Un q.b. con una quantità stimata dal lettore resta q.b. e la stima si perde (S1): «olio q.b.»
   entra in lista solo se manca, senza fabbisogno.
8. **Il lettore perde pagine in silenzio**: la pagina 2 del PDF di Andrea entra nell'indice in modo
   instabile, e le righe lette vanno da 112 a 248 sullo stesso PDF [misurato]. Vale anche in
   produzione [ipotesi forte]. **8e, PRIORITÀ**, segnalato ad Andrea.
9. **L'indice vuoto intermittente** («indice.pagine: vuoto», circa 1 su 6 sulla dieta 6
   [misurato, somma di sonde e giri]) è preesistente: 8e (ritentare l'indice vuoto).
10. **Le settimane doppie**: «settimane[1].numero duplicato» e «fuori da 1..4» sono errori del
    lettore. Il 12d unisce le settimane doppie di una pagina e riallinea i numeri all'indice (4/4
    dopo, 1/4 prima [misurato]); il riallineo è silenzioso (nessuna nota in `noteEstrazione`); più
    settimane su una pagina con numeri sbagliati restano un errore. Il resto è 8e.
11. Dal Task 8, parcheggiati: un alimento il cui nome include quelli di due ingredienti che hai,
    con lo stesso inizio di nome e in unità diverse, e la dieta che cambia l'unità del più corto
    (instabile al ritentativo); N1, una bozza vecchia ripresa al riepilogo può agganciarsi per
    inclusione attraverso unità diverse; O1, un import interrotto fra due RPC può mandare una
    varietà di un ingrediente che hai su quell'ingrediente, per inclusione (dati coerenti).
12. Fuori fase: 8d (Controlla e Ingredienti a step), 8e (affidabilità della lettura).

**Correzione sulle due «Zucchine».** La spec mette fuori fase la fusione di due «Zucchine» in
dispensa. Copiando i dati per la misura il controller ha visto che sono in **due case diverse**:
non sono doppioni, e la fusione non serve [misurato].

### I minor rimandati

Dal ledger, non corretti in questa fase:

- **Prima di applicare la 0016 (controller):** la guardia su `'Infinity'::numeric` è aggiunta
  nell'ondata finale (I1). Restano una lettura di conteggio delle righe di piatti in un'unità che
  non è quella dell'ingrediente (M3 del Task 1: con zero righe il rischio è solo teorico) e la prova
  della funzione in una transazione con rollback (I2), con l'ok di Andrea: sotto, «Prima del
  merge».
- **Task 0:** `return` prima dell'unico `expect` nel ramo `BozzaIncompletaError`; il messaggio «non
  è un JSON valido» anche per un percorso illeggibile. (Il pasto d'ufficio su slot vuoti è guardato
  dal Task 13.)
- **Task 1:** deriva di arrotondamento di storni e liste (voluta dal ruling); concorrenza con
  `chiudiSpesa` (accettata); trailer del commit con Sonnet.
- **Task 2:** in Scegli un'opzione solo q.b. è sempre «in casa» (da dire ad Andrea); argomenti
  duplicati di `residuoUtilizzabile`; `mostraDettaglio` vero per un q.b. riletto (nessun lettore);
  test mancanti di `opzioneInCasa` col q.b.
- **Task 3:** l'`aria-label` non dice «Q.B.»; la voce visibile anche scrivendo con un null; lo stile
  della pillola ripetuto; dopo Invio sulla voce il fuoco cade su `body`; il blur è simulato nei
  test, non provato su un browser vero.
- **Task 4:** test di `convertiPezzi` solo su casi esatti; «1 cucchiai» con 1,004.
- **Task 5:** l'eval conta per sottostringa e lascia le righe a cucchiai nel totale (leggere il
  dump prima di parlare di regressione); tre copie delle unità.
- **Task 6:** una scelta verso un ingrediente non più esistente salta il controllo della
  confezione; la guardia del peso senza test (0, NaN); il differenziale senza la variante ml↔g.
- **Task 7:** D4 a metà nel foglio (lo rifà l'8d); differenziale con 6 casi; `dubbi-8b.ts` importa
  funzioni vive; `propostaPer` fa vincere l'unità del gruppo su quella dell'ingrediente che hai;
  un gruppo con unità miste già risolte più una irrisolta resta aperto (preesistente); il test di
  `lista/fatta/__tests__/page.test.tsx` è instabile sotto carico (rosso una volta nella suite, verde
  da solo).
- **Task 8:** «fine» prima di impostazioni e bozza; `1/peso` come double (residui come 1,99999…
  in dispensa e storni); la dispensa non ricreata al ritentativo dopo un errore a metà
  (preesistente); `ingredientiNuovi` contato prima della deduplica.
- **Task 9:** il ripiego del telefono può mostrare una bozza vecchia se RICOMINCIA ha perso la
  cancellazione (si recupera con RICOMINCIA); `casa_id` chiesto due volte col tetto acceso;
  `impostazioni.ts` dipende da `import-bozza.ts`; copertura dei casi d'errore; senza `code` il log
  riceve una stringa vuota.
- **Task 10:** test di RESTA ed ESCI poco precisi sulla cronologia; mancano i test della pillola in
  bozza, della guardia D1 e di `chiudiUltimo`; tre indietro durante le scritture escono da Importa
  (il piano è salvato, ma senza «Piano salvato»); `uscendo` non torna false.
- **Task 11:** la Scheda del cambio diretto lascia la sezione sotto il dito; la nota della voce del
  Selettore legge solo la tabella; la Scheda resta visibile con la proposta scelta anche col peso
  della tabella; `leggiRepertorio` a ogni ingresso; «0.500» vale 500.
- **Task 12** (da triare nella review finale): `aria-busy` sulla regione `role=status` può
  zittire i passi; «Piano salvato» può ricomparire più tardi (primo caricamento del Piano fallito,
  uscita durante le scritture); un nome lungo senza `minWidth: 0` accanto a un valore `nowrap`;
  test mancanti; «I piatti: 0 di 0.».
- **Task 12b:** con «solo in testa» alcuni piatti che nominano la verdura dopo la testa e la parola
  «frutti» da sola non hanno più proposta (prima 200 e 150 g); le esclusioni dei lavorati non
  valgono per le voci di tabella (un succo o una passata che contengono la parola di una voce
  prendono la porzione della voce, 150 o 200 g); 1 pz anche con un pz da un'altra riga, senza test.
- **Task 12c:** «mezzo cucchiaio» col flag false come eccezione esplicita; una bevanda «a volontà»
  fra bevanda libera e stima.
- **Task 12d:** il riallineo silenzioso; tre test mancanti.

## Prima del merge (controller)

1. La 0016, con la guardia su `Infinity` e la classe «intero» che passa a «porzionabile» in g
   (I1 e C1, già nel file), dopo la lettura di conteggio di M3, applicata in produzione con l'ok di
   Andrea, e le tre letture di verifica qui sopra. Senza, il merge non si fa: Vercel pubblica `main`
   da solo.
2. **La correzione dei dati da proporre ad Andrea, insieme all'applicazione della 0016.** In
   produzione ci sono 2 ingredienti «intero» con unità g, entrambi nella casa di Andrea (creati
   dall'import del 03/10 [ipotesi]) [misurato dal controller, lettura in produzione]: in lista
   contano una confezione per grammo. Con il suo ok, portarli a «porzionabile» (un `update` di
   `classe_residuo` su quei due id, unità e formato invariati), poi rileggere
   `select count(*) from ingredient where classe_residuo = 'intero' and unita_base <> 'pz'` → 0.
3. **La prova della funzione in produzione, in transazione con rollback (I2)**, con l'ok di Andrea,
   dopo l'applicazione e le tre letture: `begin;`, `set local role authenticated;`,
   `set local "request.jwt.claims"` con l'id di Andrea, `select cambia_unita_ingrediente(...)` su
   un suo ingrediente pz/«intero» verso g col peso della tabella; poi la lettura di `ingredient`
   (unità, formato, **classe** = «porzionabile»), il conteggio delle righe di `dish_ingredient` in g
   e di `pantry_state`; `rollback;`. La funzione non è mai stata eseguita: gli errori di plpgsql
   (tipi, nomi di colonna, `for update` sotto RLS) uscirebbero solo all'import di Andrea.

### Esiti dei gate in produzione (controller, 03/10, con l'ok di Andrea) [misurato]

- **Gate 1, la 0016.** Prima: check `quantita > 0`, colonna `NOT NULL`, funzione assente (il nome
  del check coincideva). Applicata dal file di `ceff795`. Dopo: check
  `quantita IS NULL OR quantita > 0`, colonna nullable, `cambia_unita_ingrediente` security
  invoker, `execute` ad `authenticated` sì e ad `anon` no.
- **Gate 2, i dati.** I 2 ingredienti «intero» in g della casa di Andrea passati a «porzionabile»
  (unità e formato invariati); dopo, 0 ingredienti «intero» con unità diversa da pz.
- **Gate 3, la funzione.** Eseguita in un blocco `do` chiuso da un'eccezione voluta, quindi in
  rollback garantito, col ruolo `authenticated` e il jwt di Andrea (`casa_id()` = la sua casa),
  su un suo ingrediente pz/«intero» verso g con fattore 200: unità g, formato 1 → 200, classe
  «porzionabile»; 14 righe di piatti da 1 pz → 200 g ciascuna; residuo in dispensa 0 → 0; 3 voci in
  liste aperte da 2 pz → 400 g (fabbisogno 400, residuo 0). Un secondo giro sullo stesso
  ingrediente, già in g, non converte due volte; un fattore 0 è rifiutato («fattore non valido»).
  La lettura dopo il rollback ritrova tutto com'era (pz, «intero», formato 1, righe in pz, liste
  2 pz).
- Il gate 4 (la sonda della cronologia) e il gate 6 (il merge di `main`) sono passati prima, nella
  review finale; il gate 5 (test, tsc, lint) è sul ramo fuso: 2660 verdi, tsc e lint puliti
  [dal report dell'agente; la CI della PR li rifà].
4. La sonda nel browser vero sulla cronologia: indietro di passo, e il dialogo di uscita che rimette
   due voci dopo il popstate (Task 10).
5. `npm test`, `npx tsc --noEmit`, `npm run lint` verdi sul ramo fuso con `main`.
6. Il conflitto con la PR #23 (icone a due toni, già su `main`): anche lei aggiunge una sezione del
   03/10 in coda a DESIGN.md §13. Risolto fondendo `main` nel ramo nell'ondata finale, con tutte e
   due le sezioni.

## Le prove dal telefono da fare

Su Chrome Android con l'indietro di sistema, dopo il merge e con la 0016 applicata. Tutte
**NON ESEGUITE**.

1. **K.1.** Import del PDF di 10 pagine; durante l'attesa passa a un'altra app per 30 s e torna: la
   dieta letta c'è (Controlla, o «Hai un import in corso» con RIPRENDI). Se passa, il controller
   cambia la nota dell'attesa in «Puoi uscire dall'app: quando torni, la dieta letta ti aspetta.»
   (Task 9), in un commit a parte.
2. **K.1 bis, il server completa.** Durante l'attesa chiudi l'app del tutto (via dalle app recenti)
   e riaprila dopo 2 minuti: «Hai un import in corso» con RIPRENDI, la dieta letta intera. Verifica
   che la funzione su Vercel finisca e salvi la bozza anche col client scollegato (review del Task
   9).
3. **Completezza della lettura.** Confronta Controlla con il PDF: settimane, giorni e pasti di ogni
   giorno. Annota quali giorni o pagine mancano (la pagina 2 è instabile): è la misura dell'8e.
4. **K.2.** Le zucchine: nessun avviso di doppione; la Scheda dice «Zucchine passa a grammi…» coi
   due valori; dopo il salvataggio la lista e i tuoi piatti sono in grammi, e in lista le
   confezioni delle zucchine sono pezzi, non grammi (C1 della review finale).
5. **K.3.** Sale, pepe, spezie: nessuna domanda; in lista solo se in dispensa non ci sono.
6. **K.4.** Una riga a cucchiai: «1 cucchiaio, quindi 15 ml».
7. **K.5** (ruling del Task 10). In Controlla apri TOGLI, conferma, indietro: resti in Importa e
   compare «Esci dall'import?» (il dialogo arriva al primo indietro: la spec ne contava due); RESTA
   lo chiude.
8. **K.6.** Da Ingredienti indietro: Controlla. Da Riepilogo indietro: Ingredienti.
9. **Task 10 (a).** Controlla → indietro → RESTA → indietro: torna il dialogo.
10. **Task 10 (b).** Estrazione appena finita, nessun tocco → indietro: il dialogo. Rischio: Chrome
    salta le voci spinte senza un tocco [ipotesi].
11. **Task 10 (c).** RIPRENDI una bozza al Riepilogo → indietro tre volte: Ingredienti, Controlla,
    il dialogo.
12. **K.7.** «È lo stesso di…» con molti ingredienti: la lista scorre; «No, è nuovo» funziona e
    rimette il nome con gli accenti.
13. **Lo scorrimento del Selettore (KO 14).** Apri «È lo stesso di…» su una proposta con tanti
    ingredienti: titolo e nota restano fermi, la lista scorre col dito fino all'ultima voce, che si
    tocca sopra la barra di sistema. Il cap degli 88 vale per ogni foglio `contenuto`: apri anche un
    foglio della Dispensa e controlla che non sia tagliato.
14. **Il riepilogo a 360 px.** Su un telefono stretto (o lo zoom del testo al massimo) il riassunto
    con una riga di cambio di unità dal nome lungo: niente testo tagliato né sovrapposto al valore
    («1 pz = 200 g»). Con TalkBack, «Salvo il piano…» annuncia i passi (review del Task 12).
15. **K.8.** SALVA IL PIANO: il dialogo blu notte coi numeri; «Salvo il piano…» coi passi; il Piano
    con «Piano salvato». Cronometra dal tocco di SALVA al Piano: è la durata vera delle scritture
    ([misurato], col metodo dichiarato).
16. **La voce «Q.B.» a due colonne** (review del Task 3). Nell'editor del Piatto, su una tessera a
    due colonne, tocca la grammatura: la pillola «Q.B.» sotto non copre la matita e la X, e si
    tocca senza chiudere il campo.
