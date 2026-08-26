# Spesa: vale la pena costruirlo?

**Obiettivo di questo documento:** go/no-go personale su un side-project, per Andrea. Non è un pitch per investitori — se serve per raccogliere capitale cambiano profondità e tono. [ipotesi, da correggere se sbagliata]

## Risposta

**No-go sul prodotto come descritto.** Il cuore dell'idea — piano alimentare → lista della spesa automatica con grammature — in Italia è già spedito da Melarossa (6M+ download, 3,99 €/mese) ed EasyPlan (7,99 €/mese), ed è replicabile da un solo sviluppatore in poche settimane. **Go condizionato** esiste su un pezzo solo, che nessuno in Italia copre: la traduzione da ingrediente a prodotto reale di supermercato italiano, con prezzo e reparto. Va validato prima di scrivere una riga di codice.

## Perché

Tre fatti, in ordine di peso.

1. **Non c'è tecnologia difendibile.** Ogni componente della tua lista è oggi una chiamata API o un algoritmo da weekend. La prova di mercato: Cal AI è arrivata a ~40M$ di ricavi bootstrapped in circa 18 mesi ed è stata comprata da MyFitnessPal a marzo 2026 [fonte: getlatka / Forbes, ricerca web 08/2026]. Un ragazzo con un wrapper su un modello di visione. La tecnologia non ferma nessuno — né te né i tuoi cloni.
2. **Il mercato locale è già presidiato dove pensavi di entrare.** Melarossa fa menu settimanale personalizzato + lista della spesa automatica + contacalorie + sostituzioni a 34,99 €/anno, e nel 2026 ha aggiornato proprio lista spesa e sostituzioni [fonte: melarossa.it, ricerca web 08/2026]. Il tuo differenziale dichiarato è la loro roadmap corrente.
3. **La feature che ti differenzierebbe è quella che gli utenti non useranno.** Il loop "ho fatto / non ho fatto questo pasto → ricalcolo dispensa → ti dico quando rifare la spesa" richiede logging continuo. Nelle app diet & nutrition la retention a 30 giorni è ~30% e il 70% abbandona entro 2 settimane se l'app è complessa o richiede tempo [fonte: media.market.us / Sahha, ricerca web 08/2026]. Stai progettando il prodotto attorno al comportamento che statisticamente non avviene.

## Cosa serve per costruire il prodotto

| Componente | Cosa serve davvero | Commodity o moat |
|---|---|---|
| Piano alimentare generato da AI | Prompt + API LLM + regole di bilanciamento | **Commodity totale** (giorni). È anche il pezzo con il rischio legale più alto, vedi sotto |
| Grammature e valori nutrizionali | CREA / BDA-IEO per alimenti sfusi, Open Food Facts per confezionati, in alternativa Edamam/Nutritionix | Commodity. Da verificare la licenza commerciale di ciascuna fonte [gap: non verificato] |
| Aggregazione ricette → lista spesa | Somma ingredienti + normalizzazione unità (g/ml/pezzi) + raggruppamento per reparto | Commodity, ~1 settimana. È letteralmente il feature set base di 10+ app |
| Logging pasti a voce / testo libero | ASR (Whisper o equivalente) + parsing LLM in JSON strutturato | Commodity dal 2024. MacroLog e MyFitnessPal AI lo fanno già [fonte: ricerca web 08/2026] |
| Modello di consumo e riordino | Storico di consumi affidabile dall'utente | **Non è un problema tecnico, è comportamentale.** Senza logging il modello non ha input |
| Rilevamento automatico pasti da posizione | Geofencing iOS: max 20 regioni per app, permesso "Always", niente delivery in background affidabile senza `CLServiceSession` su iOS 18+ [fonte: Radar / Apple docs via ricerca web 08/2026] | **Non risolvibile all'accuratezza richiesta.** La posizione dice "eri in un posto", non "hai mangiato, cosa e quanto". Nessuna app trovata che lo faccia |
| Ingrediente → SKU reale supermercato IT, prezzo, reparto | Catalogo per catena, mapping semantico, manutenzione continua | **Unico pezzo con potenziale di moat.** Nessuna API pubblica dei retailer italiani; esistono solo intermediari terzi tipo Pepesto (Esselunga + 25 catene EU) [fonte: pepesto.com, ricerca web 08/2026] — fragile e revocabile |
| Export carrello verso il supermercato | Accordo commerciale con la catena | **Bloccato.** Samsung Food ha 32 retailer integrati ma copre US/UK/DE, non l'Italia [fonte: support.samsungfood.com, ricerca web 08/2026] |

## Competitive landscape locale

**Prodotti nativi italiani (non agenzie/servizi):**

| Player | Prezzo | Cosa fa già del tuo scope | Scala nota |
|---|---|---|---|
| **Melarossa** | 3,99 €/mese, 9,99 € trim., 34,99 €/anno | Menu settimanale personalizzato su oltre 20.000 combinazioni, lista della spesa automatica con spunta, contacalorie, sostituzione piatti, sync iOS/Android/web | 6M+ download, 4,5★ [fonte: Google Play / melarossa.it, 08/2026] |
| **EasyPlan** | da 7,99 €/mese | Piano settimanale, 300+ ricette, lista spesa automatica che si aggiorna al cambio ricetta, **funzione dispensa**, porzioni per n. persone | Community fondatrice ~400k; 15k follower IG, 13 recensioni Trustpilot → prodotto giovane [fonte: easy-plan.app, 08/2026] |
| App generiche IT (JOJO "Piano Alimentare e Lista Spesa", "Menu Settimanale Pianificatore", "Menù settimanale – Menu Plan") | free/freemium | Menu + lista automatica divisa per corsia con ordine personalizzabile | Non nota [gap] |

**Competitor indiretti reali:** il volantino del supermercato, le note dell'iPhone, WhatsApp con il/la partner, e ChatGPT usato a mano. Il concorrente vero di questa app non è un'altra app: è "non fare niente e comprare a caso".

**Proxy di domanda verificabile:** il food & grocery online italiano vale 5,1 mld € nel 2026, +6% sul 2025, con 15,1M acquirenti online totali di cui 9,9M sulla spesa alimentare [fonte: Netcomm / Osservatori.net, giugno 2026]. Attenzione: questo misura chi compra cibo online, **non** chi è disposto a pagare per pianificare. Le fonti riportano due numeri di penetrazione non riconciliati (11,5% dei consumi complessivi vs. 3% del settore) — non li uso come base di stima.

## Player esistenti e facilità di replicarli

| Player | Prezzo indicativo | Cosa lo differenzia davvero | Facilità di copiare il prodotto |
|---|---|---|---|
| **Cal AI** (US) | 2,99 $/sett — 29,99 $/anno | Nulla di tecnico: onboarding e distribuzione su TikTok verso un pubblico giovane. Non ha nemmeno il voice logging | **Alta.** ~40M$ ARR senza VC, poi acquisita da MyFitnessPal 03/2026 |
| **MacroFactor** (US) | 11,99 $/mese, 71,99 $/anno | Algoritmo adattivo di stima del dispendio energetico + velocità di logging. Il pezzo più vicino a un vantaggio tecnico reale del gruppo | **Media.** L'algoritmo adattivo è replicabile, la credibilità del brand nel fitness no |
| **Mealime** (US) | Pro 5,99 $/mese | Ricette curate + lista automatica. Acquisita da **Albertsons** (catena retail) nel 2022 | **Alta.** Il valore era la user base per il retailer, non il software |
| **Samsung Food / Whisk** | Gratis (Food+ a pagamento) | 32 retailer integrati per la lista "shoppable" + preinstallazione su frigoriferi Samsung | **Bassa** — ma non per il software: per gli accordi retail e l'hardware |
| **PlateJoy** (US) | 12,99 $/mese, 99 $/anno | Personalizzazione + brand medicale (Healthline) | Alta |
| **Melarossa** (IT) | 34,99 €/anno | Brand ventennale + nutrizionisti interni (che è anche la sua copertura legale) | **Media.** Il software sì, il brand e la copertura professionale no |

Segnale laterale da non ignorare: cercando "meal planning app 2026" quasi tutti i primi risultati sono blog SEO di app concorrenti (Ollie, FoodiePrep, Pantryfy, MealThinker, Recipy, MenuMagic, Melio, Nutrola, MacroLog, NutriScan, Intake, Bento Bunny…). Una dozzina di prodotti indistinguibili che si fanno la guerra a colpi di contenuto generato. È la firma di una categoria a barriere zero e CAC in salita.

## Barriere all'ingresso reali

1. **Distribuzione, non tecnologia.** I due esiti noti della categoria sono acquisizioni da parte di chi ha già gli utenti: Mealime → Albertsons (retail), Cal AI → MyFitnessPal. Se non parti con un canale, compri utenti a prezzo pieno in una categoria che li perde in due settimane.
2. **Dati proprietari sul catalogo retail italiano.** L'unica barriera che potresti costruire tu: mappatura ingrediente → SKU → prezzo → reparto, per catena, mantenuta nel tempo. È lavoro sporco e continuo, quindi difendibile. Ma poggia su fonti non ufficiali che il retailer può chiudere quando vuole.
3. **Economia dell'acquisizione.** Retention 30% a 30 giorni su diet & nutrition significa LTV basso. A 3,99 €/mese (il prezzo che Melarossa ha già fissato nel mercato) il margine per pagare la CAC è quasi inesistente.
4. **Credenziale sanitaria.** Melarossa vende "team di nutrizionisti". Non è marketing: è la sua copertura legale (punto 5). Non si copia in un weekend.
5. **Vincolo legale italiano specifico.** Cassazione 20281/2017: elaborare piani alimentari — e persino fornire consigli dietetici generici — senza abilitazione da dietista o biologo configura esercizio abusivo della professione [fonte: FNOMCeO / Nutrimi, ricerca web 08/2026]. Il tuo mitigante previsto ("non è una dieta, sono solo consigli") è **esattamente la formula che quella giurisprudenza ha respinto**. Serve un professionista abilitato che firmi i piani, o l'app non genera piani e si limita a organizzare quelli che l'utente carica. Sul fronte EU MDR il rischio è minore ma va gestito: la qualifica di dispositivo medico si determina sull'intended use dichiarato in marketing e store listing, quindi zero claim di salute [fonte: MDCG / eumdr.com, ricerca web 08/2026]. [non verificato: se un LLM che genera il piano cambi la qualificazione — serve un parere legale, non una ricerca web]

## L'obiezione scomoda

*"Se il loop dispensa/riordino è così ovvio e nessuno lo chiude bene, non è che è lì l'opportunità?"*

Risposta onesta: no, probabilmente è lì il cimitero. EasyPlan ha già una "funzione dispensa" e Melarossa ha già la lista con spunta — il pezzo mancante non manca per incapacità tecnica, manca perché **richiede all'utente di dichiarare ogni pasto fatto, saltato e modificato**, e quello è precisamente il comportamento che fa abbandonare le app di questa categoria. La tua intuizione di risolverlo con voce e rilevamento automatico è la strada giusta al problema giusto, ma la voce è ormai commodity (chiunque la aggiunge in due settimane) e il rilevamento da posizione non raggiunge l'accuratezza necessaria: sapere che eri in zona ristorante non ti dice cosa hai mangiato né quanto della tua dispensa è rimasto intatto.

Seconda obiezione, più scomoda: **il tuo target dichiarato sono due prodotti diversi.** Chi ha un piano fitness vuole precisione al grammo e sta già su MacroFactor o dal proprio nutrizionista. Chi "compra sempre le schifezze" non ha un piano alimentare da caricare, non vuole pesare niente e abbandonerà al terzo giorno di logging. Servirli insieme significa fare male entrambi.

## Raccomandazione operativa

**Se l'obiettivo è un business: no-go allo stato attuale.** Non hai un canale di distribuzione, il prezzo di mercato è già fissato a 3,99 €/mese da un incumbent con 6M download, e il tuo differenziale è comportamentalmente fragile e tecnicamente commodity.

**Se l'obiettivo è uso personale: go, subito.** Costruire questa cosa per te vale 2-3 weekend, ti risolve un problema vero e non ha nessuno dei vincoli sopra (niente marketing, niente CAC, niente esercizio abusivo: stai organizzando i tuoi dati). Questa è probabilmente la mossa giusta.

**Il business torna in gioco solo se passa questi tre test, in questo ordine, prima di scrivere codice di prodotto:**

1. **Test del problema.** 20 interviste a persone non-fitness. Il problema dichiarato spontaneamente deve essere *"non so cosa comprare / compro male"*. Se emerge *"non ho voglia di cucinare"*, il mercato è il meal delivery e questa app è la risposta sbagliata. Soglia: ≥12 su 20.
2. **Test tecnico sul solo pezzo difendibile.** In una settimana: riesci a mappare 200 ingredienti tipici su SKU reali di Esselunga o Coop con prezzo e reparto, con accuratezza >90%, per via legalmente sostenibile? Se no, l'unico moat disponibile non esiste e resta solo un clone di Melarossa.
3. **Fake door.** Landing con waitlist, 200-300 € di traffico a pagamento. Soglia: ≥5% di conversione visita→email con CAC < 3 €. Sotto quella soglia la matematica dell'acquisizione non chiude mai.

Se passa 1 e 2 ma non 3, il prodotto è giusto ma il canale è sbagliato → cercare un partner con distribuzione (una catena, un brand food, un nutrizionista con audience) invece di andare diretti al consumatore.

## Fonti e gap noti

**Verificato via ricerca web, agosto 2026:**
- Prezzi e feature Melarossa (melarossa.it, Google Play), EasyPlan (easy-plan.app), MacroFactor, Cal AI, PlateJoy, Mealime
- Cal AI ~40M$ ARR bootstrapped, acquisita da MyFitnessPal 03/2026 (getlatka, Forbes)
- Mealime acquisita da Albertsons 03/2022 (Crunchbase)
- Samsung Food: 32 retailer integrati, copertura US/UK/DE (support.samsungfood.com)
- Food & Grocery online IT 2026: 5,1 mld €, +6%, 15,1M acquirenti, 9,9M su grocery alimentare (Netcomm/Osservatori.net, 06/2026)
- Retention diet & nutrition: ~30% a 30 giorni, 70% abbandona in 2 settimane se complessa (media.market.us, Sahha)
- Cass. 20281/2017 su esercizio abusivo per elaborazione piani alimentari (FNOMCeO, Nutrimi)
- Limiti geofencing iOS: 20 regioni, CLServiceSession su iOS 18+ (Radar, doc iOS)

**NON trovato / da non dare per assodato:**
- Ricavi, MAU o retention di **nessuna** app italiana di meal planning (Melarossa inclusa): i 6M sono *download*, non utenti attivi né paganti
- Volumi di ricerca italiani per "lista della spesa automatica" / "piano alimentare app" — proxy di domanda mancante
- Le due cifre di penetrazione e-commerce food (11,5% vs 3%) nelle fonti Netcomm non sono riconciliate: non usate per stime
- Licenze d'uso commerciale di CREA, BDA-IEO e Open Food Facts: **non verificate**
- Legalità e stabilità di Pepesto o di qualunque via di accesso ai cataloghi Esselunga/Coop: **non verificata**
- Se un piano alimentare generato da LLM ricada sotto EU MDR o sotto la giurisprudenza sull'esercizio abusivo: **serve parere legale**, la ricerca web non basta
- Nessun test utente, nessun prototipo, nessuna misura di conversione: tutte le soglie nella sezione "Raccomandazione operativa" sono **[ipotesi, non testate]**
