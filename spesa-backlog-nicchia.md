# Backlog nicchia "dieta dal nutrizionista" — rivisto 05/09/2026

**Obiettivo:** ordine di costruzione delle feature per posizionare Spesa sulla nicchia
"persone con dieta prescritta che devono rimanere on track". Deriva dal brainstorm del
29/08/2026 su [spesa-nicchia-nutrizionista-one-pager.md](spesa-nicchia-nutrizionista-one-pager.md),
rivisto il 05/09/2026 dopo tre analisi in sequenza: il pivot anti-spreco, la SWOT di
EasyPlan e l'analisi dei product gap (sessione del 05/09, non archiviata come file:
le conclusioni che contano sono riportate qui).

**Decisioni prese da Andrea nel brainstorm del 29/08:**
1. Ottimizzare per il prodotto di nicchia (non solo uso personale; il gate delle 3
   settimane resta un dato utile ma non è più il criterio unico).
2. Perimetro: ciclo spesa→dispensa + spunta pasti leggera. Niente suite aderenza.
3. Import della dieta: AI + revisione guidata, **foto ai fogli stampati come caso
   principale** — molte diete non sono nemmeno in PDF.
4. Canale: doppio binario — PWA per iterare, Play Store via TWA subito, iOS rimandato.

**Conclusioni del 05/09 che cambiano l'ordine (proposte, da confermare con l'uso):**
5. **Pivot della promessa, non del target.** Il residuo derivato è già un motore
   anti-sovracquisto; la promessa "compri solo quello che manca, e vedi quanto non
   hai buttato" si aggiunge a "porta la tua dieta" senza cambiare l'utente. Il target
   generalista anti-spreco resta fuori: il residuo derivato è preciso solo con un
   piano rigido, e chi cucina a sentimento lo farebbe derivare.
6. **Il gap vero è di leggibilità, non di prodotto.** Sei cose che nessun concorrente
   ha (residuo derivato, import dieta, forma delle diete vere, meal prep contabilizzato,
   correzione a voce senza logging, dataset formati) sono mute nell'app: nessuna
   schermata le rende visibili. Prima di aggiungere feature, far vedere quelle che
   esistono.
7. **Segmento naturale: chi cucina per uno o due.** Porzione contro formato confezione
   rende di più dove una confezione da 500 g copre tre settimane. EasyPlan e le app
   generaliste scalano verso la famiglia; il genere resta vago nel copy (EasyPlan ha
   ereditato le donne dalla creator, non le ha scelte: copiare al contrario porta nel
   territorio fitness, dove il residuo non è l'argomento).
8. **Nessun retail media.** Bring! e Listonic monetizzano con Nestlé, Unilever,
   Carrefour: vogliono che si compri di più. È in conflitto con la promessa.

## Cosa è già stato fatto (stato al 05/09)

| Voce | Stato | Evidenza |
|---|---|---|
| Spike parsing su diete vere (ex P0) | **Eseguito il 29/08 su 6 diete, campione da allargare** | [spesa-spike-parsing-diete.md](spesa-spike-parsing-diete.md): 4/6 complete al primo colpo, foto = caso migliore, dieta 6 verificata a mano da Andrea: 100% |
| Estrattore vero via API (ex P1, parte server) | **Costruito il 30/08**, default `claude-sonnet-5`, structured output, streaming, retry | `src/server/import-ai.ts`, `src/app/api/import/estrai/route.ts`. Il README dice ancora "estrazione mockata": è vero solo per la chiave su Vercel, non per il codice |
| Eval harness sull'estrattore | Costruito, gira con `npm run eval:import` e la cartella `diete/` locale | `scripts/eval-import.eval.ts`. Ultimo run documentato (30/08, foto compresse come fa la Camera): 453 s, 61/82 alimenti abbinati, 80/148 quantità esatte, 1 quantità fabbricata → fix del prompt, effetto non rimisurato |
| Import: wizard foto/PDF → revisione → formati → riepilogo (ex P1, parte UI) | Costruito, esecuzione idempotente | README, sezione "Importa la dieta" |
| Spunta pasti leggera (ex P2) | Costruito | README, sezione "Spunta pasti"; migrazione 0008 |
| Alternative "oppure" nel dominio | Costruito (prerequisito emerso dallo spike) | migrazione 0006, spec 2026-08-29-alternative-design |
| Meal prepping con Pronti | Costruito | migrazione 0009 |
| Correzione dispensa con nota o voce | Costruito, dietro `ANTHROPIC_API_KEY` | README, sezione "Correggi la dispensa con una nota" |

## Priorità

| # | Cosa | Perché in questa posizione |
|---|---|---|
| **P0** | **Chiudere l'estrattore: campione a ~20 diete, confronto modelli, tempo entro il limite.** Tre lavori in uno: (a) allargare il campione con i casi scoperti (foto annotate a penna, griglie Word, altri software); (b) un run dell'eval con `EVAL_IMPORT_MODELLI=claude-sonnet-5,claude-opus-5` sulle foto originali *e* compresse, per decidere il modello sui numeri; (c) risolvere la durata: 453 s supera il `maxDuration` di 300 s della route su Vercel, quindi oggi un import reale può cadere in timeout. Strade: estrazione per pagina in parallelo e fusione, oppure job in background con polling. | È l'onboarding e il posizionamento: finché la chiave non è su Vercel e la soglia >90% non è misurata su 20 diete, "porta la tua dieta" è una promessa non mantenuta al primo utilizzo. Il 61/82 sulle foto compresse dice che il collo di bottiglia potrebbe essere la compressione della Camera, non il modello: misurare prima di cambiare modello |
| **P1** | **Limite agli import per utente e chiave in produzione.** Contatore per utente su finestra mobile di 30 giorni (proposta: 3 import), verificato nella route prima della chiamata, dopo auth e cap dimensione; messaggio onesto quando si supera. Spend limit sul workspace Anthropic come rete di sicurezza. Poi `ANTHROPIC_API_KEY` su Vercel. | Un import costa tra 0,10 e 0,50 € a seconda del modello (stima, vedi sezione sotto): il limite non è una leva di costo, è una difesa dall'abuso. Senza, la chiave in produzione è un rubinetto aperto |
| **P2** | **Contatore "non hai ricomprato".** Per ogni lista chiusa: differenza tra lista ingenua (somma degli ingredienti del piano) e lista con residuo, in confezioni, grammi e euro stimati. Serve un prezzo indicativo per formato confezione: campo su `ingredient`, valore medio inserito a mano o proposto dall'AI al momento dell'import, correggibile. Una riga in cima alla Lista fatta, un totale nella Dispensa. | È l'unica prova visibile del vantaggio, calcolabile senza chiedere nulla all'utente. Regge qualunque modello di guadagno (abbonamento, ente, catena) e il posizionamento "compri solo il mancante". Il residuo derivato esiste dal 28/08 ed è muto |
| **P3** | **Avviso di scadenza del fresco.** Il decadimento del fresco è già nel modello: quando un deperibile in residuo scade prima del pasto che lo usa, avvisare nella Settimana e nella Dispensa (niente push: è Fase 4). Insieme: l'avviso di conflitto alla sostituzione, "se usi lo yogurt qui non ti resta per giovedì", rinviato a Fase 3 nella spec. | La dimenticanza è la seconda causa di spreco dichiarata dagli italiani (33%, Waste Watcher 2026). È l'unico momento in cui il residuo derivato diventa visibile *durante* l'uso e non a posteriori |
| **P4** | **Ingresso "i miei piatti" per chi non ha una dieta.** Onboarding a due porte: "ho una dieta" (import) e "cucino sempre le stesse cose" (inserimento rapido di 8–12 piatti con ingredienti e porzioni, il planner li ruota). Zero claim di salute in copy e store. | Copre il gap di contenuto senza generare piani (vincolo Cass. 20281/2017) e senza il repertorio di 300 ricette di EasyPlan. Il planner ruota già un repertorio su più settimane |
| **P5** | **Onboarding multi-utente.** Seed automatico dei 71 ingredienti classificati al primo accesso, empty state collegati alle due porte di P4. | Prerequisito di qualunque test con persone diverse da Andrea. Era P6: sale perché P4 non ha senso senza |
| **P6** | **Lista condivisa e "per quante persone".** Un secondo account sullo stesso piano, con la lista e la spunta in comune; fattore porzioni per casa. | Il segmento uno-due persone è metà coppie. Bring! e Listonic esistono solo per questo. Va prima dello store iOS: un prodotto per una persona sola non si consiglia al partner |
| **P7** | **Lettura offline della lista.** | La promessa si consuma in corsia, spesso senza segnale. Il guscio c'è, la garanzia no |
| **P8** | **Scan codice a barre → formato confezione reale via Open Food Facts.** Alla chiusura della spesa si scansiona il prodotto: la quantità reale sostituisce quella assunta. | Da residuo stimato a residuo vero. Copertura italiana di OFF da verificare. Scende perché rende più preciso un prodotto che prima deve diventare leggibile (P2, P3) |
| **P9** | **Play Store via TWA, poi iOS.** | Discovery: la nicchia cerca sullo store, e EasyPlan e Melarossa sono su entrambi. Scende in coda perché la distribuzione a pagamento non chiude senza P2 e P6 a monte; iOS resta rimandato ma non escluso |

## Modello per l'import: Sonnet o Opus, e quanto costa

Stima per un import tipico di 7 foto (dieta 6): circa 12k token in ingresso fra
immagini e prompt, 8–12k token in uscita di JSON compatto. Prezzi API di riferimento
[fonte: listino Anthropic, 09/2026]:

| Modello | Input €/M | Output €/M | Costo stimato per import |
|---|---|---|---|
| `claude-sonnet-5` (default oggi) | ~2 | ~10 | ~0,10–0,15 |
| `claude-opus-5` | ~5 | ~25 | ~0,30–0,50, di più se il thinking adattivo resta al default |

Con un limite di 3 import ogni 30 giorni, il costo massimo per utente è sotto 1,50 €
al mese anche su Opus: irrilevante rispetto a un abbonamento da 3–8 € al mese, e
l'uso realistico è un import ogni cambio dieta, cioè ogni uno-tre mesi. **Il limite
serve contro l'abuso, non contro il costo.**

Passare a Opus ha senso solo se l'eval lo dimostra. I difetti visti finora non sono di
intelligenza: la deriva di schema si è risolta con lo structured output (indipendente
dal modello), il flake del JSON lungo col retry, l'unica quantità fabbricata con una
regola di prompt. Il 61/82 sulle foto *compresse* punta alla risoluzione delle immagini,
che Opus non recupera. Dove Opus può contare: griglie Word ambigue (dieta 4) e foto
degradate. Regola di decisione: un run per modello sugli stessi due set (originali e
compressi); si cambia modello solo se Opus porta gli abbinati sopra il 90% dove Sonnet
resta sotto. Se serve Opus, `output_config.effort` a `low` o `medium`: la trascrizione
non ha bisogno di ragionamento lungo, e taglia i token di thinking. In ogni caso il
modello resta configurazione (`IMPORT_AI_MODEL`), non codice.

## La questione SKU supermercati — sbloccata a metà

Nel [primo one-pager](spesa-one-pager.md) l'integrazione SKU era **bloccata**: nessuna API
pubblica dei retailer italiani, intermediari fragili (Pepesto), export carrello solo con
accordi commerciali (Samsung Food: US/UK/DE, niente Italia). Quella parte **resta
bloccata e resta fuori**: cataloghi per catena, prezzi, export carrello richiedono accordi
che non abbiamo, e per la nicchia non sono il punto — il paziente a dieta deve comprare
*giusto e solo il mancante*, non confrontare prezzi.

Ma la nicchia ha bisogno solo di una **fetta sottile del dato SKU: il formato
confezione**. E lì il blocco si apre per due vie che non dipendono dai retailer:

1. **Open Food Facts via barcode (→ P8).** Licenza ODbL: uso commerciale consentito con
   attribuzione e share-alike sui miglioramenti al database; i campi quantità/packaging
   esistono [fonte: [world.openfoodfacts.org/terms-of-use](https://world.openfoodfacts.org/terms-of-use),
   [Wikipedia](https://en.wikipedia.org/wiki/Open_Food_Facts), ricerca web 08/2026].
   ~4M prodotti a fine 2025; **copertura dei prodotti italiani non verificata** — è il
   test che decide se P8 vale.
2. **Crowdsourcing dalla revisione import (→ P0/P1).** Ogni formato corretto a mano
   dall'utente arricchisce il dataset proprietario. Dal 05/09 vale anche per il prezzo
   indicativo (→ P2).

**Attenzione alla licenza:** ODbL è share-alike *sul database*. Per non regalare il moat,
tenere separati i due dataset: le quantità lette da OFF restano dati OFF (attribuiti);
la classificazione proprietaria (area, classe residuo, mapping dieta→ingrediente, prezzo
indicativo) vive in tabelle nostre e non si mescola al database OFF. **[da verificare con
parere legale se si arriva a monetizzare]**

## Opportunità registrate (non in backlog, da coltivare)

- **Dataset ingredienti come moat che cresce**: area + classe residuo + formato + prezzo
  indicativo non esistono in nessun database pubblico; ogni import corretto lo arricchisce.
- **Nutrizionista analogico come canale referral**, non come cliente: consigliare Spesa
  non gli costa nulla e fa sembrare la sua dieta più seguibile. Da testare con le
  interviste del one-pager — resta la validazione più importante NON ESEGUITA.
- **Nutrizionista come supervisore del repertorio base** (modello EasyPlan: la dott.ssa
  Ferrone approva le ricette). Serve solo se P4 evolve da "i tuoi piatti" a "piatti
  proposti"; costo tipico fee o revenue share. Non copre piani personalizzati: parere
  legale comunque necessario.
- **Canale istituzionale anti-spreco**: comuni, multiutility, campagne Spreco Zero,
  CSR delle catene. Il posizionamento "quanto non hai buttato" lo apre, la dieta no.
  È il canale Kitche nel Regno Unito; richiede il report aggregato che P2 rende
  calcolabile senza logging.
- **Posizionamento sulle diete vere**: rotazione multi-settimana e doppio spuntino sono
  la forma delle diete prescritte; Spesa li gestisce già, le app generaliste no.
- **Fake door doppia**: due landing a pari budget, "porta la tua dieta" contro "compri
  solo quello che manca". Decide il posizionamento sui numeri, non il target.

## Esclusioni esplicite

Suite aderenza completa (streak, grafici, foto pasti), generazione piani (vincolo legale
Cass. 20281/2017), macro/calorie, integrazione SKU piena (cataloghi/prezzi/carrello),
confronto prezzi fra insegne, retail media e sponsorizzazioni di brand, target di genere
esplicito, app iOS nativa (rimandata, non esclusa: vedi P9).
