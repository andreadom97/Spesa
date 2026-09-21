# Il nome dell'app: brainstorm del 18/09/2026

**Obiettivo di questo documento:** scegliere il nome che sostituisce il placeholder "Spesa".
Decisione di Andrea; qui ci sono i candidati, i criteri, le verifiche fatte e una
raccomandazione. Complementa [spesa-nicchia-nutrizionista-one-pager.md](spesa-nicchia-nutrizionista-one-pager.md)
e il [backlog](spesa-backlog-nicchia.md): il posizionamento è già deciso lì, il nome deve servirlo.

## Cosa deve dire il nome

Il prodotto, in una riga: *porti la dieta del tuo nutrizionista (foto o PDF) e compri
solo quello che manca, con la lista in ordine di corsia.* Il pezzo che nessun concorrente
ha è il **residuo derivato**: porzione contro formato confezione, la dispensa che si
aggiorna da sola, "quanto non hai ricomprato".

Criteri di Andrea, più tre che emergono dal progetto:

| Criterio | Perché conta qui |
|---|---|
| Utilizzabile in varie lingue | Pronunciabile e non imbarazzante in EN/ES/FR/DE/PT; l'italiano nel cibo è un vantaggio all'estero, non un limite |
| Buono per l'indicizzazione | Una stringa che oggi su Google restituisca *poco*: una parola generica ("spesa", "dispensa", "lista") non si conquista mai |
| Dice di cosa tratta l'app | Almeno per un italiano; all'estero può farlo la tagline |
| Corto e memorabile | Al massimo tre sillabe o due parole, dettabile a voce senza spelling |
| Disponibilità | Dominio `.it` e `.app` liberi, nessuna app con lo stesso nome negli store |
| Legale | Niente "dieta" nel nome: l'app non elabora piani (Cass. 20281/2017) e l'*intended use* dichiarato nello store decide la qualifica MDR. Il nome non deve suggerire che l'app fa la dieta |
| Tono | Calmo, preciso, senza retail media: il nome non deve suonare da volantino o da fitness |

## Le famiglie esplorate

1. **Parole italiane vere che viaggiano** (Mangia, Basta, Giusto, Corsia, Grammo): calde,
   pronunciabili ovunque, ma quasi tutte già prese o generiche su Google.
2. **La frase della cucina** (Quanto basta / q.b., Cosa manca): la storia migliore, la
   peggiore indicizzazione.
3. **Coniate su radici italiane** (Dispesa, Qbasta, Solomanca): uniche su Google, il
   significato va spiegato una volta e poi resta.
4. **Descrittive letterali** (Listadieta, Dietaspesa, Spesagiusta): SEO letterale, zero
   marchio, e "dieta" nel nome è un'esposizione legale gratuita. Scartate in blocco.
5. **Inglesi** (Pantry*, *list): categoria satura di cloni SEO (Pantryfy, Listonic, Mealime)
   e fuori carattere per un prodotto che nasce dalle diete italiane. Scartate.

## Verifiche fatte il 18/09

Domini controllati con il registrar di Vercel (che non gestisce `.it`: disponibilità
sì, prezzo no), store e web via ricerca. Le celle vuote sono "non verificato".

| Nome | `.it` | `.app` | `.com` | `.io` | Conflitti trovati |
|---|---|---|---|---|---|
| **Dispesa** | libero | libero (9,99 $) | preso | libero (30 $) | Nessuna app o marchio trovato. È parola: variante arcaica di *dispensa* nel senso di *spesa* (dizionario-italiano.it, Virgilio); in portoghese *dispesa* = spesa/costo |
| **Manca** | preso | libero (9,99 $) | preso | preso | Nessuna app "Manca" trovata; è un cognome sardo diffuso |
| **Cosa manca** | libero | libero (9,99 $) | preso | | Un romanzo, un documentario, un blocco note da parete con quel nome; nessuna app |
| **Quanto basta** | preso | preso | preso | libero (30 $) | Ristoranti, blog di cucina, un'app "Quanto" di spese personali su Play. Frase troppo comune |
| **Qbasta** | libero | libero (9,99 $) | preso | | Nessuno |
| **Grammo** | preso | preso | preso | | "Gramo" è già un'app di nutrizione (protein tracker) e un'altra di lettura etichette; Grammo Food è un negozio. Scartato |
| Giusto | preso | preso | | | Scartato |
| Corsia | preso | preso | | | Scartato |
| Basta, QB, Quanto, Sazio, Etto, Avanzo | | presi | | | Scartati |
| Solomanca, Residuo, Portadieta, Spesagiusta, Listadieta, Dietaspesa | | liberi | | | Tenuti solo come confronto |

Non verificato: registri marchi (EUIPO/UIBM), disponibilità del nome esatto su App Store
e Play Store (la ricerca web non li copre bene), chi tiene `dispesa.com`.

## I candidati, in ordine

### 1. Dispesa — raccomandato

*Dispensa + spesa.* Ed è anche una parola vera: la forma antica di "dispensa" quando voleva
dire "spesa". Il nome dice esattamente il ciclo dell'app, dispensa ↔ spesa, e la storia
etimologica è un regalo per la pagina "chi siamo".

- **Lingue:** tre sillabe piane, si legge uguale in EN/ES/FR/DE. In portoghese evoca
  "spesa" (despesa), in spagnolo "despensa": sempre nel campo giusto.
- **Indicizzazione:** oggi la stringa restituisce solo voci di dizionario. Si conquista
  in una settimana. Chi cerca "dispensa app" atterra a un carattere di distanza.
- **Cosa fa l'app:** un italiano lo capisce al primo ascolto; per gli altri basta la
  tagline.
- **Memorabile:** 7 lettere, si scrive come si pronuncia. Rischio: a voce qualcuno
  capisce "dispensa"; è un errore che porta comunque a noi.
- **Disponibilità:** `.it`, `.app`, `.io` liberi. `.com` preso (da verificare se parcheggiato).
- **Legale:** nessun riferimento a dieta o salute.
- **Tagline:** *Compri solo quello che manca.* / *La dieta del tuo nutrizionista, la spesa
  giusta.* / EN: *Buy only what's missing.*

### 2. Manca

Il verbo della lista: la lista *è* quello che manca. Cinque lettere, due sillabe,
il nome più corto della rosa.

- **Lingue:** pronunciabile ovunque, significato nullo fuori dall'Italia (la tagline lavora
  di più). In spagnolo "manca" = monca, non ideale ma marginale.
- **Indicizzazione:** verbo comunissimo e cognome diffuso: "manca" da solo non si
  conquista, "manca app" sì. Peggio di Dispesa.
- **Cosa fa l'app:** lo dice con una parola sola, ma solo in italiano.
- **Disponibilità:** solo `.app` libero; `.it` e `.com` presi.
- **Tono:** caldo, quasi affettuoso ("mi manca"). Attenzione: in un contesto di dieta la
  parola "mancanza" può suonare come privazione.
- **Tagline:** *Solo quello che manca.* Funziona anche come domanda: *Cosa manca?*

### 3. Quanto Basta (q.b.)

La storia più bella: *q.b.* è l'abbreviazione delle ricette, e l'app compra
esattamente quanto basta. Ethos anti-sovracquisto, precisione delle grammature, tutto
dentro. Ma:

- **Indicizzazione:** pessima. Frase fatta, ristoranti, libri, blog. Tutti i domini
  principali presi.
- **Praticabile solo come** marchio "QB" con la frase sotto, oppure come **Qbasta**
  (`qbasta.it` e `.app` liberi): perde eleganza, guadagna una stringa unica.
- Da tenere come **tagline o claim di prodotto** anche se il nome è un altro:
  "Dispesa. Quanto basta." regge.

### 4. Cosa manca

La domanda che ci si fa prima di uscire. Memorabile, conversazionale, italiana al 100%.
Due parole, difficile come nome di app store e come dominio internazionale; frase comune
su Google. Meglio come tagline di Manca che come nome.

## Come si porta il nome nel resto

- **Nome + tagline sempre insieme** nei primi mesi: il nome è unico, la tagline dice cosa
  fa. Titolo store: *Dispesa – la dieta del nutrizionista diventa la spesa*. Le parole
  chiave (lista della spesa, dieta, nutrizionista, dispensa, residuo) vanno nel campo
  keyword e nella descrizione, non nel nome.
- **Descrizione store e landing:** parlare di *piano del nutrizionista* e *spesa*, mai di
  salute, dimagrimento o risultati. È l'intended use che tiene l'app fuori dal MDR.
- **Comunicazione:** la promessa già scritta nel backlog non cambia: *porta la tua dieta,
  compri solo quello che manca, vedi quanto non hai buttato*. Il nome deve sparire
  dietro la promessa, non competere con lei.
- **Internazionale:** Dispesa si esporta senza tradurre; si traduce solo la tagline.
- **Identità visiva:** i wordmark in `design/Logo*.dc.html` sono nati su "Spesa"; con
  Dispesa la "D" iniziale diventa il monogramma dell'icona. Le esplorazioni restano valide.

## Cosa fare prima di decidere

1. **Prova a voce:** dire "Dispesa" e "Manca" a cinque persone, chiedere di scriverlo e
   di dire cosa fa l'app dopo la tagline. Vince chi si scrive giusto e si capisce.
2. **Store:** cercare il nome esatto su App Store e Play Store (Italia e USA).
3. **Marchi:** ricerca EUIPO e UIBM in classe 9 e 42.
4. **Domini:** prendere `.it` e `.app` del vincitore lo stesso giorno (`.it` non passa da
   Vercel: Register.it, Aruba o simili).
5. Solo dopo: rinominare `manifest.json`, `layout.tsx`, README e repo.

## Fonti

- Dispesa come variante arcaica di dispensa/spesa: [dizionario-italiano.it](https://www.dizionario-italiano.it/dizionario-italiano.php?lemma=DISPESA100),
  [sapere.virgilio.it](https://sapere.virgilio.it/parole/vocabolario/dispesa);
  in portoghese: [dicionarioinformal.com.br](https://www.dicionarioinformal.com.br/significado/dispesa/14013/)
- Conflitti "Gramo"/"Grammo": [Gramo su App Store](https://apps.apple.com/mo/app/gramo/id6759345969),
  [gramo.space](https://gramo.space/), [Grammo Food](https://grammofood.com/shop/)
- "Quanto" expense tracker su Play: [play.google.com](https://play.google.com/store/apps/details?id=app.quanto.quanto)
- Disponibilità domini: registrar Vercel, 18/09/2026
- Vincolo legale e MDR: [spesa-one-pager.md](spesa-one-pager.md), sezione "Barriere all'ingresso reali", punto 5
