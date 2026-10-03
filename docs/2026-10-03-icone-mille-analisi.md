# Mille icone ingrediente: servono? Quanto costano?

**Obiettivo.** Capire se ha senso portare le icone a due toni da 64 a circa 1000, cosa coprirebbero degli ingredienti usati in Europa e negli USA, e quanto lavoro richiede il metodo che abbiamo appena usato. Il documento funziona se permette ad Andrea di scegliere un numero di icone e un ordine di lavoro.

## Conclusione

**Mille icone una per ingrediente non convengono. Conviene arrivare per famiglie a 200–300 icone, partendo da sei icone di famiglia che si fanno in un giorno.**

Tre ragioni:
- **La copertura persa non sta negli ingredienti rari.** Sulle diete importate, quasi tutto ciò che oggi resta senza icona sono categorie generiche: «frutta fresca», «verdura», «spezie», «erbe aromatiche». Sei icone di famiglia portano la copertura dal 72,0% al 94,7% delle occorrenze [misurato, rimisurato dopo averle fatte].
- **Mille è quasi tutto il vocabolario.** Anche il più grande ricettario studiato (Recipe1M, un milione di ricette), una volta ripulito, si riduce a 1.488 ingredienti [fonte: paper Recipe1M, letto]. Mille icone vorrebbe dire disegnarne una per ingrediente, e a 60 px quaranta formaggi o venti pesci non si distinguono. La regola «meglio nessuna icona che una sbagliata» smette di reggere.
- **Il costo cresce in modo lineare, il beneficio no.** La coda lunga vale poco. Con il metodo di oggi, mille icone sono circa 40–50 milioni di token e una revisione di mille icone per Andrea.

> **Correzione del 03/10.** La prima versione contava come nomi anche i nomi dei piatti e le etichette dei pasti («secondo», «contorno», «cena libera»), oltre agli alimenti: diceva 70,9% → 93,2% su 502 occorrenze. Contando solo il campo `alimento` i numeri giusti sono 72,0% → 94,7% su 321 occorrenze.
>
> **Misura sulle ricette fatta:** `docs/2026-10-03-copertura-icone-ricette.md` (RecipeNLG, 2,23 milioni di ricette, e Ahn et al.). Con famiglie larghe bastano circa 95 icone (le 69 attuali più 25 nuove) per il 97,3% delle righe ingrediente USA. Conferma la conclusione: famiglie, non 1000.

## Dove siamo oggi

| Misura | Valore | Fonte |
|---|---|---|
| Icone (chiavi) | 64, con 194 sinonimi | catalogo [misurato ora] |
| Nomi in produzione coperti | 97 su 102 (95%) | query su `ingredient` [misurato oggi, prima del lavoro] |
| `INGREDIENTI_BASE` coperti | 67 su 71 | [misurato ora] |
| Diete importate (campo `alimento` di debug-eval e dei piani estratti) | 321 occorrenze | `diete/estrazioni` [misurato] |
| …di cui coperte | 72,0% | [misurato] |
| Peso dei tracciati | 37,8 KB, 11,1 KB compressi, per 64 icone | `tracciati-ingredienti.ts` [misurato ora] |

**Cosa manca nelle diete** (le 178 occorrenze scoperte):
- frutta generica: 53 («frutta fresca», «frutta di stagione»…);
- spezie ed erbe: 22. «spezie» ed «erbe aromatiche» hanno già l'icona, ma la parola non è tra i sinonimi;
- verdura generica: 14;
- frutta a guscio: 6;
- salumi: 4 (bresaola, prosciutto);
- olive: 3;
- «cappuccio»: 24 occorrenze. È ambiguo (cavolo cappuccio o cappuccino): va controllato nel testo originale;
- non ingredienti: 45.

Il campione è piccolo: 6 diete, un solo stile di scrittura (diete italiane da nutrizionista). Vale per il nostro utente di oggi, non per Europa e USA.

## Cosa dicono i dati su Europa e USA

| Dato | Valore | Fonte | Verifica |
|---|---|---|---|
| AllRecipes, 91.000 ricette | i 100 ingredienti più frequenti fanno il 61% delle occorrenze; il 20% più frequente fa il 94% | wcedmisten.fyi/post/analyzing-all-recipes | **letto alla fonte** |
| Recipe1M, ~1 milione di ricette | da oltre 16.000 nomi grezzi a 1.488 ingredienti, fondendo varianti («oltre 400 tipi di formaggio, oltre 300 di pepe») | arxiv 1812.06164 | **letto alla fonte** |
| Recipe1M, nomi grezzi | ~4.000 nomi coprono il 95% delle occorrenze | arxiv 1810.06553 | da un subagente, non riletto |
| Ahn et al. 2011, 56.498 ricette (Nord America, Europa, Asia) | 381 ingredienti in tutto | arxiv 1111.6074 | da un subagente; lista curata per un altro scopo |
| Spesa reale USA | una famiglia compra ~260 prodotti diversi l'anno (su ~35.000 a scaffale) | mediapost.com, 2014 | da un subagente, non riletto |
| Set di icone coerenti | Lucide: 83 icone cibo; emoji Unicode: ~130 cibi. Nessun set coerente di ~1.000 icone cibo trovato | lucide.dev; aggregatori | da un subagente |
| Riconoscibilità di icone cibo a piccole dimensioni | nessuno studio trovato | — | **gap** |

**Non trovati:** la copertura con 50, 200, 500 e 1000 ingredienti, e la classifica per paese (Italia, Europa occidentale, USA). Per averli serve un'analisi su un dataset di ricette, **NON ESEGUITA**: richiede di scaricarne uno, e lo faccio solo con il tuo ok.

**Lettura** [ipotesi, coerente con i dati sopra]. La curva è molto ripida all'inizio: 100 ingredienti fanno già il 61% delle occorrenze. Una famiglia copre in media tre nomi: oggi 64 icone coprono 194 sinonimi, e Recipe1M fonde allo stesso modo. Quindi **200–300 icone di famiglia** dovrebbero coprire la gran parte di ciò che un utente scrive. Il numero esatto si può misurare.

## Quanto costa (metodo di oggi)

Misurato sui cinque lotti di oggi (58 icone ridisegnate, tutte approvate):

| Voce | Totale | Per icona |
|---|---|---|
| Token degli agenti che disegnano | ~883.000 | ~15.000 |
| Token delle revisioni | ~622.000 | ~10.700 |
| **Totale** | **~1,5 milioni** | **~26.000** |
| Tempo macchina (disegno + revisione) | ~49 minuti | ~51 secondi |

Fonte: i contatori di token e durata riportati dagli agenti a fine lavoro [misurato].

**Attenzione:** quelle 58 icone partivano da un contorno già disegnato il 26/09. Un'icona nuova va inventata da zero, e in più servono sinonimi, blocchi per gli omografi e reparto. Stimo da 1,5 a 2 volte tanto [ipotesi, non testata].

| Obiettivo | Icone nuove | Token stimati | Tempo macchina stimato | Revisione di Andrea |
|---|---|---|---|---|
| Sei famiglie | 6 | ~0,3 milioni | < 15 minuti | un foglio |
| 250 icone | ~190 | 7–10 milioni | 4–6 ore | 4 fogli da ~50 |
| 1.000 icone | ~940 | 37–49 milioni | 18–27 ore | ~19 fogli da ~50 |

Tutte le stime sono estrapolazioni lineari dalla misura, con il moltiplicatore ipotetico. Il costo in euro non lo stimo: dipende dal piano di Andrea.

## Cosa cambia oltre le 64

- **Peso dell'app.** Oggi ogni icona pesa ~590 byte (~170 compressi). A 1.000 icone sono ~0,6 MB, ~0,17 compressi [estrapolazione lineare]. Oggi tutto il catalogo finisce nel JavaScript di ogni schermata con le tessere. Sopra le 200–300 icone va caricato a pezzi o come file che il service worker tiene in cache.
- **Abbinamento dei nomi.** `trovaIcona` scorre tutti i sinonimi per ogni tessera. A 3.000 sinonimi va indicizzato. Crescono anche gli omografi da bloccare (oggi 9 blocchi, come pesca/pesce e grano/grana).
- **Lingue.** Le icone non hanno lingua, i sinonimi sì. Se «Europa e USA» vuol dire utenti stranieri, ogni icona vuole i sinonimi in ogni lingua, e quel costo si somma a quello del disegno. Se vuol dire solo «cosa si mangia», no.
- **Coerenza su 80 lotti.** In 5 lotti sono già emersi tre difetti di metodo: i fori nelle sagome, gli id di maschera nel foglio e la pasta illeggibile. Su 80 lotti la deriva di stile è il rischio vero. Serve un riferimento fisso, cioè le 64 di oggi in ogni brief, e i fogli per reparto.
- **Distinguibilità.** Oltre le famiglie si entra nelle varietà: grana o pecorino, merluzzo o orata. A 60 px non si distinguono, e nessuna fonte studia il limite. Varietà per varietà, la scelta giusta resta un'icona di famiglia, oppure nessuna icona.

## Proposta

1. **Subito, un giorno di lavoro:** sei icone di famiglia (frutta, verdura, frutta a guscio, salumi, olive, e un'icona «spezie ed erbe» se quelle di oggi non bastano) più i sinonimi mancanti («spezie», «erbe aromatiche»). Sulle diete la copertura passa dal 72,0% al 94,7% [misurato dopo averle fatte, ramo `icone-famiglie`]. «cappuccio» va chiarito.
2. **Poi, la misura che manca** (serve il tuo ok per scaricare un dataset pubblico di ricette): curva di copertura per numero di icone, su ricette europee e americane, con i nomi raggruppati in famiglie come fa Recipe1M. Dice dove fermarsi: 150, 250 o 400.
3. **Solo dopo, i lotti** fino a quel numero, un reparto alla volta, con la stessa pipeline (disegno, controllo geometrico, foglio, gate). Prima di superare le ~200 icone si passa al caricamento a pezzi del catalogo.
4. **Un indicatore in produzione:** la quota di tessere con icona, misurabile già oggi con una query. È la cifra che dice se il lavoro serve.
