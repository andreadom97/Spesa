# Spesa per chi ha una dieta dal nutrizionista: vale la pena?

**Obiettivo di questo documento:** go/no-go personale per Andrea sulla nicchia "persone con dieta prescritta da un professionista che devono rimanere on track" — decide se e dove orientare le prossime feature di Spesa. Complementa [spesa-one-pager.md](spesa-one-pager.md) (08/2026, conclusione: no-go DTC generalista), non lo sostituisce.

## Risposta

**Go condizionato, e più solido del play generalista.** La nicchia esiste, paga già (60–120 € a visita dal professionista), e il vincolo legale che affossava l'idea generalista qui sparisce: l'app non genera piani, organizza un piano firmato da un abilitato. Ma il canale professionale è già presidiato — ogni software per nutrizionisti italiano spedisce un'app paziente con lista della spesa inclusa — quindi l'unico spazio vero è **il paziente la cui dieta arriva come PDF o foglio di carta**, che nessuna app serve, più il motore del residuo che nessuno ha. La condizione da validare prima di investire: quanta parte dei ~13.000 nutrizionisti italiani consegna ancora la dieta su carta/PDF senza app collegata. [gap: non trovato, vedi ultima sezione]

## Perché

1. **Il problema di aderenza è reale e misurato.** In un servizio clinico di nutrizione il drop-out è 21% al primo mese e 57% a sei mesi [fonte: PMC3914843, ricerca web 08/2026]; nei trial di intervento dietetico l'abbandono tipico è 25–40% [fonte: PMC, ricerca web 08/2026]. Chi vende ai professionisti usa proprio la lista della spesa automatica come argomento di aderenza ("less friction → better compliance") [fonte: promealplan.com, 08/2026].
2. **Il vincolo legale si ribalta a favore.** Cassazione 20281/2017 colpisce chi *elabora* piani senza abilitazione [fonte: one-pager 08/2026]. Un'app che digitalizza un piano già firmato da biologo nutrizionista/dietista/dietologo non elabora nulla: sta dal lato giusto della riga, ed è esattamente il modello attuale di Spesa ("piano esistente → lista").
3. **Ma la nicchia è già servita — attraverso il professionista.** Nutrium, Nutribook ("La mia dieta"), Winfood ("Segui-Mi"), Nutriverso, Dietosystem: tutti hanno l'app paziente con piano, alternative e lista della spesa [fonte: siti prodotto, ricerca web 08/2026]. Lo spazio non è "app per chi ha una dieta": è "app per chi ha una dieta **e il suo nutrizionista non usa nessuno di quei software**".

## Cosa serve per costruire il prodotto

| Componente | Cosa serve | Commodity o moat |
|---|---|---|
| Import della dieta da PDF/foto | Parsing LLM del piano (pasti, giorni, grammature, alternative) | **Commodity tecnica** (giorni), ma nessuno lo fa come caso d'uso principale — né in Italia né tra le app US trovate [fonte: ricerca web 08/2026]. Il valore è nell'accuratezza sui formati reali delle diete italiane, che è lavoro sporco |
| Piano → lista della spesa | Somma ingredienti, unità, reparti | Commodity, già costruita in Spesa e presente in 10+ app |
| **Ciclo del residuo** (compra solo ciò che manca, consapevole dei formati confezione) | Il modello `porzione vs formato` già costruito e provato in Spesa il 28/08/2026 [misurato: README, tabella riso/olio/pomodorini] | **Nessuna app paziente trovata lo fa**: tutte le liste concorrenti sono somme di ingredienti che ricomprano ogni settimana quello che hai già. È il pezzo distintivo esistente |
| Rotazione multi-settimana, doppio spuntino | Già in Spesa (migrazione 0004, sei pasti) | Dettaglio esecutivo, non differenziante da solo — ma le diete vere dei nutrizionisti sono fatte così, e le app generaliste no |
| Aderenza (spunta pasti, reminder, streak) | Logging leggero | Commodity; il rischio comportamentale del logging resta (retention 30% a 30 gg nella categoria [fonte: one-pager 08/2026]) |
| Canale verso i pazienti | Vedi barriere | **Qui si decide tutto** |

## Competitive landscape locale

**Canale professionale (il nutrizionista compra, il paziente usa gratis):**

| Player | Prezzo per il professionista | App paziente: cosa fa già |
|---|---|---|
| Nutrium | 15–25 $/mese (annuale) [fonte: promealplan/Capterra, 08/2026] | Piano, logging, chat, **lista della spesa auto-generata dal piano** [fonte: help.nutrium.com] |
| Nutribook — "La mia dieta" | n.d. | Piano, alternative per pasto, note, foto, **lista della spesa** [fonte: App Store IT] |
| Winfood — "Segui-Mi" | n.d. | Dieta + **lista spesa** sincronizzate in tempo reale [fonte: winfood.it] |
| Nutriverso (Progeo) | da 48,90 €/mese [fonte: progeomedical.shop] | **Lista spesa automatica**, alternative, notifiche, grafici |
| Dietosystem (DS Medica) | app gratis per il paziente | Archivio PDF, chat col professionista [fonte: dsmedica.info] |

**Lato paziente standalone (senza passare dal professionista):**

| Player | Modello | Limite rispetto alla nicchia |
|---|---|---|
| Mio Nutrizionista | abbonamento consumer, lista spesa settimanale dal piano, reminder | Il piano lo genera l'app, **non importa la dieta del tuo nutrizionista**; niente dispensa [fonte: appmionutrizionista.it, 08/2026] |
| Melarossa, EasyPlan | 3,99–7,99 €/mese | Generano loro il piano; EasyPlan ha una "dispensa" ma manuale, non derivata [fonte: one-pager 08/2026] |

**Proxy di domanda:** ~13.000 biologi nutrizionisti attivi (stima FNOB 2025) [fonte: ricerca web 08/2026], più dietisti e dietologi (numeri non trovati). A una media prudente di poche decine di pazienti attivi ciascuno, il bacino di persone con una dieta prescritta in corso è nell'ordine delle centinaia di migliaia — **[ipotesi, non testata]**: il moltiplicatore pazienti/professionista non ha fonte.

## Player esistenti e facilità di replicarli

| Player | Cosa lo difende | Facilità di copiarne il prodotto |
|---|---|---|
| Software professionali (Nutrium & co.) | **Distribuzione**: il nutrizionista prescrive l'app insieme alla dieta; il paziente non sceglie | Alta sul software, irrilevante: il moat è il rapporto col professionista |
| Mio Nutrizionista | Poco: SEO/store sul nome generico | Alta |
| Piattaforme US (Practice Better, Healthie, That Clean Life, Foodzilla…) | Ecosistema clinico HIPAA, non presenti sul paziente italiano DTC | Non competono su questa nicchia in Italia |

Simmetricamente: **il pezzo di Spesa più difficile da copiare non è il parsing PDF** (weekend per chiunque) ma il ciclo del residuo funzionante con i formati confezione italiani — che è comunque settimane, non anni, di vantaggio.

## Barriere all'ingresso reali

1. **Distribuzione, di nuovo.** Il canale naturale (il nutrizionista) è occupato e strutturalmente ostile: quei software vendono al professionista proprio la retention del paziente *dentro la loro app*; nessun professionista consiglierà un'app che lo taglia fuori. Resta il DTC puro verso il paziente — reachable (community diete, ricerca "come seguire la dieta del nutrizionista"), ma da pagare.
2. **Il gap è difendibile solo finché gli incumbent dormono.** "Importa la dieta in PDF" è una feature che Nutrium o Melarossa possono aggiungere in uno sprint. La finestra esiste perché per gli incumbent professionali è *contro-incentivata* (il loro cliente è il nutrizionista, non il paziente orfano di software) — questa asimmetria di incentivi è l'unica vera protezione. [ipotesi ragionata, non verificabile]
3. **Comportamento.** L'aderenza richiede che l'app venga aperta; il drop-out del 57% a 6 mesi riguarda la *dieta stessa*, con il professionista di mezzo. Un'app da sola non inverte la curva, può solo ridurre l'attrito della parte spesa — che è la promessa giusta perché è l'unica credibile.

## L'obiezione scomoda

*"Se il paziente col PDF è un segmento così ovvio, perché nessuno dei cinque software italiani, che il problema lo vedono ogni giorno, ha fatto l'app paziente standalone?"*

Risposta onesta: perché il loro modello di business glielo vieta — monetizzano il professionista, e un'app che accetta diete di chiunque svaluta l'abbonamento del loro cliente. Questo è il motivo per cui il gap può essere reale e non un cimitero. Ma attenzione al rovescio: **non c'è conferma che il segmento "dieta su carta/PDF" sia grande**. Se la maggioranza dei nutrizionisti attivi ha già adottato un software con app paziente, la nicchia residua è chi ha la dieta di un professionista analogico — un segmento che si restringe da solo ogni anno. Questo numero non è emerso dalla ricerca ed è **la** cosa da misurare prima di ogni altra.

## Raccomandazione operativa

**Adesso: niente pivot, il gate resta il gate.** Le tre settimane di uso reale (dal 31/08/2026) valgono anche come test della nicchia: Andrea *è* l'utente-tipo — piano vegetariano da professionista, caricato a mano. Se il rituale non regge su di lui, non regge sul mercato.

**Go condizionato sul prodotto di nicchia se, in quest'ordine:**

1. **Il gate personale passa** (3 settimane, criterio già scritto nel README).
2. **Test del segmento:** 15–20 tra nutrizionisti e pazienti reali. Domanda ai professionisti: "come consegni la dieta?" Soglia: ≥50% consegna PDF/carta senza app collegata. Domanda ai pazienti: il problema spontaneo deve essere "fare la spesa giusta per la dieta", non "ricordarmi di seguirla". **[soglie: ipotesi, non testate]**
3. **Test tecnico del parsing:** 20 diete PDF vere di nutrizionisti diversi → import automatico con >90% di pasti/grammature corretti senza ritocco. È l'onboarding: se fallisce, il primo utilizzo muore lì.
4. **Fake door** "Carica la tua dieta, pensiamo noi alla spesa": stessa soglia del one-pager precedente (≥5% conversione, CAC <3 €).

**No-go se** il test 2 mostra che il canale software professionale ha già saturato la consegna delle diete: a quel punto la nicchia è dei software B2B e l'unica mossa sarebbe vendere il motore del residuo *a loro* — partnership, non prodotto consumer.

## Fonti e gap noti

**Verificato via ricerca web, agosto 2026:**
- App paziente con lista spesa nei software IT: [help.nutrium.com](https://help.nutrium.com/en/articles/5195586-can-my-client-create-a-shopping-list), [Nutribook "La mia dieta" su App Store](https://apps.apple.com/it/app/la-mia-dieta-by-nutribook/id6450774126), [winfood.it/app-seguimi](https://www.winfood.it/app-seguimi/), [progeomedical.shop (Nutriverso)](https://progeomedical.shop/prodotto/nutriverso-cloud/), [dsmedica.info](https://www.dsmedica.info/html/pag/app-dietosystem.asp)
- Prezzi Nutrium 15–25 $/mese: [promealplan.com](https://www.promealplan.com/en/blog/nutrium-review-2026), [Capterra](https://www.capterra.com/p/173803/Nutrium/)
- Mio Nutrizionista (standalone, no import dieta, no dispensa): [appmionutrizionista.it](https://appmionutrizionista.it/en/)
- ~13.000 biologi nutrizionisti attivi, stima FNOB 2025: [calcolostipendionettoonline.it](https://calcolostipendionettoonline.it/stipendio-nutrizionista/) (fonte secondaria — da confermare su fonte FNOB diretta)
- Drop-out clinico 21% a 1 mese / 57% a 6 mesi: [PMC3914843](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3914843/); range 25–40% nei trial: [PMC12381968](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12381968/)
- Piattaforme US e lista spesa come leva di aderenza: [practicebetter.io](https://practicebetter.io/blog/the-6-best-nutritionist-software-tools-for-2026), [promealplan.com](https://www.promealplan.com/en/blog/dietitian-meal-planning-software)
- Eredità dal one-pager 08/2026 (Melarossa, EasyPlan, retention 30%, Cass. 20281/2017): [spesa-one-pager.md](spesa-one-pager.md)

**NON trovato / da non dare per assodato:**
- **Quota di nutrizionisti italiani che consegna la dieta come PDF/carta senza app** — è il numero che decide tutto, e non esiste in nessuna fonte trovata
- Numero di dietisti e dietologi (oltre ai ~13k biologi nutrizionisti); pazienti attivi medi per professionista
- Penetrazione reale dei software professionali in Italia (utenti, non feature)
- Prezzi di Nutribook, Winfood, Metadieta, Dietosystem per il professionista
- "AI +30% aderenza" citato da un blog di vendor: **non usato** come base di alcuna conclusione
- Nessun test utente, nessun parsing provato su diete vere: i punti 2–4 della raccomandazione sono **NON ESEGUITI**
