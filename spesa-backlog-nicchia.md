# Backlog nicchia "dieta dal nutrizionista" — approvato 29/08/2026

**Obiettivo:** ordine di costruzione delle feature per posizionare Spesa sulla nicchia
"persone con dieta prescritta che devono rimanere on track". Deriva dal brainstorm del
29/08/2026 su [spesa-nicchia-nutrizionista-one-pager.md](spesa-nicchia-nutrizionista-one-pager.md).

**Decisioni prese da Andrea nel brainstorm:**
1. Ottimizzare per il prodotto di nicchia (non solo uso personale; il gate delle 3
   settimane resta un dato utile ma non è più il criterio unico).
2. Perimetro: ciclo spesa→dispensa + spunta pasti leggera. Niente suite aderenza.
3. Import della dieta: AI + revisione guidata, **foto ai fogli stampati come caso
   principale** — molte diete non sono nemmeno in PDF.
4. Canale: doppio binario — PWA per iterare, Play Store via TWA subito, iOS rimandato.

## Priorità

| # | Cosa | Perché in questa posizione |
|---|---|---|
| **P0** | **Spike parsing su diete vere.** Estrazione LLM di pasti, giorni, grammature, alternative da diete reali — **incluse foto di fogli stampati, multi-pagina, storte, con annotazioni a penna**: è il caso mediano, non l'eccezione. Soglia: >90% corretto senza ritocco su 20 diete; per iniziare ne bastano 3–5. Codice throwaway, output = report. | Decide se la feature-bandiera è costruibile prima di disegnarne la UI. Le diete le procura Andrea |
| **P1** | **Import dieta: foto/PDF → AI → revisione guidata.** Fotocamera in-app con acquisizione multi-scatto per le diete su carta; upload PDF per le altre. Estrazione → conferma pasto per pasto → assegnazione formati confezione con default AI (formati tipici del supermercato italiano), sempre correggibili. | È l'onboarding e il posizionamento ("porta la tua dieta") in una feature sola. La revisione è anche il momento in cui l'utente fornisce il dato che nessun foglio contiene: il formato confezione |
| **P2** | **Spunta pasti leggera collegata al residuo.** "Fatto / saltato / sostituito" per pasto; un pasto saltato riporta gli ingredienti nel residuo. | Corregge l'assunzione attuale (pasti sempre come da piano) e rende più preciso il cuore esistente. Non è logging da tracker |
| **P3** | **Lettura offline della lista.** | La promessa si consuma in corsia, spesso senza segnale. Già identificata come traguardo a sé nel README |
| **P4** | **Scan codice a barre → formato confezione reale via Open Food Facts.** Alla chiusura della spesa (o aggiungendo in dispensa) si scansiona il prodotto comprato: la quantità reale della confezione sostituisce quella assunta. | Il residuo passa da "formato ipotizzato" a "formato vero" — precisione sul differenziatore principale, a costo basso (API OFF gratuita). Copertura italiana di OFF **da verificare nello spike P0 o in un test a parte** |
| **P5** | **Play Store via TWA.** La PWA è già installabile su Android; il wrapping è il pezzo quasi gratis del doppio binario. | Discovery: la nicchia cerca sullo store. iOS rimandato |
| **P6** | **Onboarding multi-utente.** Seed automatico dei 71 ingredienti classificati al primo accesso; empty states esistenti (VuotoPiatti) collegati al flusso di import. | Necessario per utenti terzi, ma inutile prima che P1 esista |

## La questione SKU supermercati — sbloccata a metà

Nel [primo one-pager](spesa-one-pager.md) l'integrazione SKU era **bloccata**: nessuna API
pubblica dei retailer italiani, intermediari fragili (Pepesto), export carrello solo con
accordi commerciali (Samsung Food: US/UK/DE, niente Italia). Quella parte **resta
bloccata e resta fuori**: cataloghi per catena, prezzi, export carrello richiedono accordi
che non abbiamo, e per la nicchia non sono il punto — il paziente a dieta deve comprare
*giusto e solo il mancante*, non confrontare prezzi.

Ma la nicchia ha bisogno solo di una **fetta sottile del dato SKU: il formato
confezione**. E lì il blocco si apre per due vie che non dipendono dai retailer:

1. **Open Food Facts via barcode (→ P4).** Licenza ODbL: uso commerciale consentito con
   attribuzione e share-alike sui miglioramenti al database; i campi quantità/packaging
   esistono [fonte: [world.openfoodfacts.org/terms-of-use](https://world.openfoodfacts.org/terms-of-use),
   [Wikipedia](https://en.wikipedia.org/wiki/Open_Food_Facts), ricerca web 08/2026].
   ~4M prodotti a fine 2025; **copertura dei prodotti italiani non verificata** — è il
   test che decide se P4 vale.
2. **Crowdsourcing dalla revisione import (→ P1).** Ogni formato corretto a mano
   dall'utente arricchisce il dataset proprietario.

**Attenzione alla licenza:** ODbL è share-alike *sul database*. Per non regalare il moat,
tenere separati i due dataset: le quantità lette da OFF restano dati OFF (attribuiti);
la classificazione proprietaria (area, classe residuo, mapping dieta→ingrediente) vive
in tabelle nostre e non si mescola al database OFF. **[da verificare con parere legale
se si arriva a monetizzare]**

## Opportunità registrate (non in backlog, da coltivare)

- **Dataset ingredienti come moat che cresce**: area + classe residuo + formato non
  esistono in nessun database pubblico; ogni import corretto lo arricchisce.
- **Nutrizionista analogico come canale referral**, non come cliente: consigliare Spesa
  non gli costa nulla e fa sembrare la sua dieta più seguibile. Da testare con le
  interviste del one-pager — resta la validazione più importante NON ESEGUITA.
- **Posizionamento sulle diete vere**: rotazione multi-settimana e doppio spuntino sono
  la forma delle diete prescritte; Spesa li gestisce già, le app generaliste no.

## Esclusioni esplicite

Suite aderenza completa (streak, grafici, foto pasti), generazione piani (vincolo legale
Cass. 20281/2017), macro/calorie, integrazione SKU piena (cataloghi/prezzi/carrello),
app iOS nativa.
