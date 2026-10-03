**Obiettivo.** Misurare su ricette reali quante icone-famiglia servono a Dispesa per utenti USA ed europei e in che ordine disegnarle, così il piano icone dell'espansione si decide con numeri e non a sensazione.

*Analisi del 03/10/2026, per Andrea. Etichette: [misurato: RecipeNLG] = calcolato oggi sui 2,23 milioni di ricette di RecipeNLG; [misurato: Ahn] = calcolato oggi sulle 56.498 ricette di Ahn et al. 2011; "ipotesi" e "NON ESEGUITO" dove una misura non c'è.*

## Conclusione

**Con famiglie larghe come quelle di oggi bastano circa 95 icone: le 69 attuali più 25 nuove. Coprono il 97,3% delle righe ingrediente nelle ricette USA e il 99,7% in quelle europee. Dopo 120 famiglie la curva è piatta.** [misurato: RecipeNLG; Ahn]

- **Le 64 di oggi sono scelte per l'Italia, non per l'USA.** Sulle ricette USA coprono l'81,1% delle righe. Le 64 famiglie più frequenti in quelle stesse ricette arriverebbero al 92,3%. In Europa del Sud il distacco è più piccolo, ma c'è: 87,4% contro 98,2%. [misurato: RecipeNLG; Ahn]
- **In UX conta un'altra misura: le ricette in cui ogni ingrediente ha un'icona.** Con le 69 icone di oggi sono il 26,3% delle ricette USA e il 36,9% di quelle europee. Con 25 icone nuove si sale all'81,7% (USA) e al 97,6% (Europa). Con 50 nuove l'USA arriva al 91,8%. [misurato: RecipeNLG; Ahn]
- **Il primo blocco è quasi lo stesso ovunque.** In tutte e quattro le regioni stanno fra le prime 13 famiglie mancanti: panna, vaniglia/aromi, lievito, vino, senape, mais, uvetta, maiale, strutto, semi e liquori. Per l'USA vanno aggiunte maionese e salse bianche, salse rosse (ketchup, barbecue), preparati in busta, peperoncino fresco e ananas. Per l'Europa del Sud salgono molluschi, carciofo e agnello. [misurato: RecipeNLG; Ahn]
- **Questo vale solo con famiglie larghe.** Con un'icona per ogni ingrediente distinto (cannella diversa dal pepe, cheddar diverso dal parmigiano) servono 500 icone per l'87,6% delle righe USA e 1.000 per il 92,6%. È il raggruppamento in famiglie che rende sufficienti un centinaio di icone. [misurato: RecipeNLG]
- **Obiezione ovvia: l'"Europa" di questi dati non sono utenti europei.** Sono ricette in inglese, quasi tutte da siti americani, classificate per cucina (Western/Southern European…): 7.470 in tutto, di cui 4.180 dell'Europa del Sud. Il vocabolario di Ahn è chiuso a 381 ingredienti, quindi oltre 100 famiglie la copertura è al 100% per costruzione. Dai dati europei va preso l'**ordine** delle famiglie, non la coda. Un corpus nativo per ogni mercato (francese, tedesco, spagnolo) è **NON ESEGUITO**.

## Dati usati

| Dataset | Contenuto | Uso |
|---|---|---|
| RecipeNLG (Bień et al., 2020), mirror Hugging Face | 2.231.142 ricette in inglese con colonna `NER` (nomi degli ingredienti estratti). Il 40% viene da cookbooks.com (896.341); poi food.com (499.616), epicurious, allrecipes, myrecipes [misurato: RecipeNLG] | proxy **USA** e coda lunga |
| Ahn et al. 2011, *Flavor network and the principles of food pairing*, Sci. Rep. 1:196, file S3 | 56.498 ricette con etichetta di cucina e 381 ingredienti curati: North American 41.524, Southern European 4.180, Western European 2.659, Eastern European 381, Northern European 250 [misurato: Ahn] | **Nord America**, **Europa** (W+S+N+E = 7.470), **Europa del Sud** |

Unità: un'**occorrenza** è una coppia (ricetta, ingrediente distinto), cioè una riga della lista ingredienti che deve avere un'icona. Le stringhe che non sono ingredienti stanno fuori dal denominatore: 285.042 occorrenze in RecipeNLG, 199 in Ahn [misurato].

## Metodo

### 1. Normalizzazione

Regole in `normalizza.py`, applicate in quest'ordine:

1. minuscolo; `_` → spazio (nomi Ahn);
2. si toglie il testo fra parentesi e tutto quello che segue la prima virgola ("onion, chopped" → "onion");
3. si tolgono numeri, frazioni, trattini e punteggiatura;
4. si tolgono le unità (cup, tbsp, tsp, oz, lb, g, ml, can, package, stick, slice, pinch, dash, bunch, sprig, large, medium, small…). "clove" si toglie solo se nella stringa c'è "garlic", altrimenti resta (chiodo di garofano);
5. si tolgono circa 150 aggettivi e parole vuote: fresh, chopped, minced, diced, sliced, grated, shredded, frozen, canned, dried, cooked, unsalted, low-fat, extra-virgin, boneless, skinless, ripe, of, and, to taste…;
6. restano **apposta** le parole che cambiano famiglia: ground (ground beef non è beef a pezzi), sweet, sour, cream, green, red, white;
7. plurale → singolare con regole semplici (-ies → -y; -oes/-ches/-shes/-xes perdono -es; via la -s finale), più una lista di eccezioni (leaves → leaf, molasses, asparagus, couscous, swiss…).

Risultato: 198.873 stringhe NER distinte diventano 144.286 nomi normalizzati. I primi 3.000 nomi coprono il 96,4% delle occorrenze [misurato: RecipeNLG].

### 2. Famiglie

`famiglie.py` ha 165 regole regex in ordine: vince la prima che combacia, e le regole specifiche stanno prima delle generiche. Il criterio è quello dell'app: un'icona per ogni famiglia che si distingue a vista. I composti prendono l'icona della base: lemon juice → limone, tomato sauce → pomodoro, chicken broth → minestra. Le 69 chiavi dell'app (`src/domain/icone-ingredienti.ts`) hanno lo stesso nome; le famiglie nuove hanno un nome italiano. Le scelte che spostano i numeri:

- **spezie** come nell'app: pepe, cannella, paprika, cumino, origano secco, zenzero, peperoncino in polvere, miscele (taco seasoning, italian seasoning), sali aromatizzati (garlic salt);
- **peperoncino** fresco (jalapeño, serrano, chipotle, green chile) è una famiglia nuova, separata da peperone (bell pepper, "green/red pepper", pimento) e da spezie;
- **formaggio** è una famiglia sola; **formaggio-fresco** prende cream cheese, ricotta, cottage, mascarpone, goat cheese e tofu, come nell'app;
- **panna** è nuova: sour cream, heavy/whipping cream, whipped topping, crème fraîche, salsa alfredo, besciamella;
- **ampolla** prende tutti i condimenti liquidi in bottiglia: aceti, soia, worcestershire, fish sauce, tabasco/hot sauce, liquid smoke. Sono famiglie nuove **maionese-salse** (maionese, dressing), **salse** (ketchup, barbecue, hoisin, teriyaki) e **senape** (con il rafano);
- **gambero** prende i crostacei (gamberi, granchio, aragosta); **molluschi** (vongole, cozze, ostriche, capesante, calamari) è nuova;
- **bistecca** prende tutto il manzo, il macinato, il vitello e la selvaggina, come nell'app. **maiale** e **agnello** sono nuove. **salumi** prende anche l'ham americano (prosciutto cotto);
- **lievito**: baking powder, baking soda, lievito di birra, cream of tartar. La stringa NER "soda" da sola (43.273) la tratto come baking soda troncato (ipotesi, vedi Trappole);
- una stringa che non combacia con nessuna regola fa famiglia a sé (singleton). Sono 34.338 stringhe, l'1,14% delle occorrenze; le prime sono rumore del NER ("angel", "dutch", "sharp", "fillet", "long grain") [misurato: RecipeNLG].

**Controllo della mappatura**: ho estratto a caso 150 occorrenze di RecipeNLG, con peso pari alla frequenza (seed 42), e le ho controllate a mano. 148 sono nella famiglia giusta. 2 restano senza famiglia ("lemonjuice" scritto attaccato, "bocconcini"). Nessuna è in una famiglia sbagliata. [misurato: RecipeNLG; giudizio mio, nessuno l'ha rivisto; `audit_campione.tsv`]. Scorrendo i primi 4.000 nomi restano errori piccoli: "honey ham" → miele, "cheese tortellini" → formaggio, "coconut flour" → cocco.

## Curva di copertura

### Famiglie come nell'app

Quota delle occorrenze coperta dalle N famiglie più frequenti **in quella regione**. [misurato: RecipeNLG; Ahn]

| N famiglie | RecipeNLG (USA) | RecipeNLG senza sale e acqua | Ahn Nord America | Ahn Europa (W+S+N+E) | Ahn Europa del Sud | Ahn tutte |
|---|---|---|---|---|---|---|
| 25 | 71,7% | 71,1% | 74,4% | 78,1% | 81,1% | 74,2% |
| 50 | 87,3% | 87,1% | 91,4% | 92,9% | 94,9% | 91,2% |
| 64 | 92,3% | 92,2% | 96,3% | 97,3% | 98,2% | 96,0% |
| 100 | 98,2% | 98,1% | 100,0% | 100,0% | 100,0% | 100,0% |
| 150 | 99,0% | 98,9% | 100,0% | 100,0% | 100,0% | 100,0% |
| 200 | 99,0% | 98,9% | 100,0% | 100,0% | 100,0% | 100,0% |
| 250 | 99,1% | 99,0% | 100,0% | 100,0% | 100,0% | 100,0% |
| 300 | 99,1% | 99,1% | 100,0% | 100,0% | 100,0% | 100,0% |
| 400 | 99,2% | 99,1% | 100,0% | 100,0% | 100,0% | 100,0% |
| 500 | 99,3% | 99,2% | 100,0% | 100,0% | 100,0% | 100,0% |
| 1000 | 99,5% | 99,4% | 100,0% | 100,0% | 100,0% | 100,0% |

Come leggerla: per l'USA, passare da 64 a 100 famiglie porta la copertura dal 92,3% al 98,2%. Da 100 a 1.000 si guadagnano 1,3 punti, tutti singleton di rumore. Le famiglie con un nome sono 123 in tutto, quindi oltre le 150 la curva misura la qualità del NER e non il bisogno di icone. Le colonne Ahn toccano il 100% intorno a 100 famiglie perché il vocabolario è chiuso (da 101 a 121 famiglie per regione).

### Senza famiglie: un'icona per ingrediente distinto (limite superiore)

[misurato: RecipeNLG; Ahn]

| N icone (1 per ingrediente) | RecipeNLG (USA) | Ahn Nord America | Ahn Europa | Ahn Europa del Sud |
|---|---|---|---|---|
| 25 | 41,2% | 55,4% | 57,3% | 61,3% |
| 50 | 52,4% | 73,0% | 74,9% | 78,8% |
| 64 | 57,1% | 79,5% | 80,8% | 84,4% |
| 100 | 65,6% | 89,4% | 89,9% | 92,6% |
| 150 | 72,5% | 96,2% | 96,0% | 97,7% |
| 200 | 76,9% | 98,7% | 98,7% | 99,4% |
| 250 | 80,0% | 99,7% | 99,7% | 99,9% |
| 300 | 82,3% | 100,0% | 100,0% | 100,0% |
| 400 | 85,4% | 100,0% | 100,0% | 100,0% |
| 500 | 87,6% | 100,0% | 100,0% | 100,0% |
| 1000 | 92,6% | 100,0% | 100,0% | 100,0% |
| 2000 | 95,4% | 100,0% | 100,0% | 100,0% |
| nomi distinti | 143.970 | 338 | 327 | 282 |

## Quanto coprono oggi le icone dell'app

Quota delle occorrenze coperta dal catalogo di oggi. "Migliori 64 possibili" è il valore a 64 della prima curva. "+ k nuove" = le 69 dell'app più le prime k famiglie mancanti, nell'ordine di quella regione. [misurato: RecipeNLG; Ahn]

| Regione | Ricette | Occorrenze | App 64 | App 69 (con le 5 in corso) | Migliori 64 possibili | App 69 + 10 nuove | + 25 | + 50 |
|---|---|---|---|---|---|---|---|---|
| RecipeNLG (USA, tutte) | 2.230.013 | 18.134.887 | 81,1% | 82,4% | 92,3% | 92,6% | 97,3% | 98,8% |
| Ahn Nord America | 41.524 | 330.518 | 83,4% | 84,8% | 96,3% | 96,0% | 99,5% | 100,0% |
| Ahn Europa (W+S+N+E) | 7.470 | 63.245 | 85,1% | 87,5% | 97,3% | 97,1% | 99,7% | 100,0% |
| Ahn Europa del Sud | 4.180 | 37.025 | 87,4% | 90,3% | 98,2% | 98,0% | 99,9% | 100,0% |

Togliendo sale e acqua (in Ahn mancano comunque) le 69 icone coprono l'80,9% delle occorrenze RecipeNLG [misurato: RecipeNLG].

Quota delle **ricette con tutti gli ingredienti coperti**: [misurato: RecipeNLG; Ahn]

| Regione | App 64 | App 69 | App 69 + 10 nuove | + 25 | + 50 |
|---|---|---|---|---|---|
| RecipeNLG (USA, tutte) | 23,9% | 26,3% | 57,2% | 81,7% | 91,8% |
| Ahn Nord America | 25,7% | 29,3% | 73,1% | 95,9% | 100,0% |
| Ahn Europa (W+S+N+E) | 30,2% | 36,9% | 79,0% | 97,6% | 100,0% |
| Ahn Europa del Sud | 34,6% | 43,8% | 84,8% | 98,7% | 100,0% |

Nelle ricette USA le famiglie dell'app che pesano di più sono spezie (8,08%), sale (5,80%), zucchero (5,36%), cipolla (4,23%), farina (4,14%) e burro (3,98%). Quasi assenti: cornetto (0,005%), pera (0,04%), finocchio (0,05%) [misurato: RecipeNLG]. In Europa del Sud in testa ci sono erbe (9,77%), spezie (8,41%), olio (7,92%) e formaggio (6,90%) [misurato: Ahn].

## Ordine di costruzione

Qui ci sono **tutte** le famiglie nuove che la mappatura distingue (54), in ordine di occorrenze USA, con rango e quota in ogni regione. "—" = la famiglia non esiste in quel vocabolario: Ahn non ha maionese, ketchup, impasti pronti, tortilla, marshmallow, gelato né bibite. [misurato: RecipeNLG; Ahn]

A questa granularità non esistono 100 famiglie nuove per regione: dopo la 54ª restano solo singleton, ciascuno sotto lo 0,01% e quasi tutti rumore. Per avere altre 50–100 icone utili bisogna **dividere le famiglie grandi**, che è una scelta di design. I candidati, per peso nelle ricette USA:

- spezie (8,08%): pepe 208.630, cannella 130.604, origano 73.537, zenzero 60.729, paprika 60.655, noce moscata 56.007;
- cipolla (4,23%): cipollotto e scalogno a parte;
- erbe (3,41%): prezzemolo, basilico, timo, coriandolo, alloro;
- formaggio (2,65%): cheddar, parmigiano, mozzarella;
- ampolla (2,16%): soia, worcestershire, aceto. [misurato: RecipeNLG]

| # USA | Famiglia nuova | RecipeNLG occ. | quota | # Ahn NA | quota Ahn NA | # Ahn Europa | quota Ahn Europa | # Ahn Sud Europa | quota Ahn Sud |
|---|---|---|---|---|---|---|---|---|---|
| 1 | lievito | 387.991 | 2,14% | 6 | 0,85% | 4 | 0,69% | 5 | 0,61% |
| 2 | vaniglia-aromi | 347.288 | 1,92% | 2 | 2,44% | 3 | 1,17% | 3 | 0,73% |
| 3 | panna | 304.894 | 1,68% | 1 | 2,46% | 2 | 2,13% | 2 | 1,41% |
| 4 | maionese-salse | 157.793 | 0,87% | — | 0 | — | 0 | — | 0 |
| 5 | senape | 121.958 | 0,67% | 3 | 1,17% | 5 | 0,62% | 11 | 0,21% |
| 6 | preparati | 120.169 | 0,66% | 14 | 0,39% | 17 | 0,18% | 16 | 0,14% |
| 7 | salse | 107.919 | 0,60% | — | 0 | — | 0 | — | 0 |
| 8 | vino | 102.837 | 0,57% | 5 | 0,98% | 1 | 2,43% | 1 | 2,68% |
| 9 | peperoncino | 99.360 | 0,55% | 37 | 0,01% | 39 | 0,00% | 33 | 0,01% |
| 10 | ananas | 98.333 | 0,54% | 10 | 0,45% | 27 | 0,05% | 25 | 0,03% |
| 11 | sciroppo | 91.404 | 0,50% | 19 | 0,14% | 32 | 0,02% | 40 | 0,00% |
| 12 | cocco | 78.737 | 0,43% | 12 | 0,41% | 24 | 0,08% | 22 | 0,06% |
| 13 | strutto | 77.737 | 0,43% | 7 | 0,77% | 10 | 0,45% | 13 | 0,21% |
| 14 | impasto | 74.485 | 0,41% | — | 0 | — | 0 | — | 0 |
| 15 | liquore | 72.816 | 0,40% | 15 | 0,37% | 8 | 0,52% | 9 | 0,27% |
| 16 | uvetta | 63.680 | 0,35% | 9 | 0,48% | 6 | 0,54% | 10 | 0,25% |
| 17 | mais | 63.666 | 0,35% | 4 | 1,04% | 9 | 0,52% | 6 | 0,48% |
| 18 | maiale | 62.236 | 0,34% | 11 | 0,42% | 11 | 0,38% | 7 | 0,33% |
| 19 | semi | 47.720 | 0,26% | 13 | 0,41% | 12 | 0,34% | 14 | 0,20% |
| 20 | tortilla-piadina | 45.408 | 0,25% | — | 0 | — | 0 | — | 0 |
| 21 | torta | 34.929 | 0,19% | — | 0 | — | 0 | — | 0 |
| 22 | marshmallow | 33.627 | 0,19% | — | 0 | — | 0 | — | 0 |
| 23 | ciliegia | 32.611 | 0,18% | 16 | 0,30% | 18 | 0,17% | 20 | 0,11% |
| 24 | pesca-albicocca | 31.601 | 0,17% | 17 | 0,30% | 15 | 0,19% | 18 | 0,12% |
| 25 | snack-salati | 29.032 | 0,16% | 30 | 0,05% | 44 | 0,00% | — | 0 |
| 26 | cereali | 28.283 | 0,16% | 20 | 0,12% | 31 | 0,02% | 29 | 0,01% |
| 27 | caramelle | 24.331 | 0,13% | 29 | 0,05% | 38 | 0,00% | 38 | 0,00% |
| 28 | datteri-fichi | 22.731 | 0,13% | 21 | 0,12% | 22 | 0,11% | 17 | 0,12% |
| 29 | gelato | 20.885 | 0,12% | — | 0 | — | 0 | — | 0 |
| 30 | molluschi | 19.000 | 0,10% | 18 | 0,18% | 7 | 0,53% | 4 | 0,63% |
| 31 | bibita | 17.841 | 0,10% | — | 0 | — | 0 | — | 0 |
| 32 | frutta-tropicale | 17.503 | 0,10% | 8 | 0,52% | 16 | 0,19% | 19 | 0,11% |
| 33 | verdure-asiatiche | 13.689 | 0,08% | — | 0 | — | 0 | — | 0 |
| 34 | capperi | 12.876 | 0,07% | — | 0 | — | 0 | — | 0 |
| 35 | glassa | 10.237 | 0,06% | — | 0 | — | 0 | — | 0 |
| 36 | prugna-altri | 9.921 | 0,05% | 22 | 0,11% | 20 | 0,13% | 21 | 0,07% |
| 37 | agnello | 9.741 | 0,05% | 28 | 0,06% | 13 | 0,21% | 12 | 0,21% |
| 38 | birra | 9.064 | 0,05% | 26 | 0,07% | 26 | 0,06% | 28 | 0,02% |
| 39 | barbabietola | 8.199 | 0,05% | 31 | 0,05% | 23 | 0,08% | 26 | 0,03% |
| 40 | germogli | 7.414 | 0,04% | — | 0 | — | 0 | — | 0 |
| 41 | melone | 7.263 | 0,04% | 27 | 0,07% | 29 | 0,03% | 24 | 0,03% |
| 42 | ravanello | 7.088 | 0,04% | 33 | 0,03% | 25 | 0,07% | 27 | 0,03% |
| 43 | rape-radici | 6.861 | 0,04% | 25 | 0,07% | 21 | 0,13% | 23 | 0,05% |
| 44 | asparago | 5.821 | 0,03% | 23 | 0,09% | 19 | 0,15% | 15 | 0,18% |
| 45 | te | 5.819 | 0,03% | 32 | 0,03% | 28 | 0,03% | — | 0 |
| 46 | carciofo | 4.253 | 0,02% | 24 | 0,08% | 14 | 0,20% | 8 | 0,31% |
| 47 | okra | 4.164 | 0,02% | 35 | 0,02% | 36 | 0,00% | 35 | 0,01% |
| 48 | melograno | 3.825 | 0,02% | — | 0 | — | 0 | — | 0 |
| 49 | pompelmo | 3.514 | 0,02% | 34 | 0,03% | 33 | 0,01% | 30 | 0,01% |
| 50 | soia-fermentati | 2.572 | 0,01% | — | 0 | — | 0 | — | 0 |
| 51 | kiwi | 2.171 | 0,01% | 36 | 0,02% | 30 | 0,03% | 34 | 0,01% |
| 54 | alghe | 1.307 | 0,01% | 42 | 0,00% | 40 | 0,00% | 37 | 0,00% |
| 56 | tomatillo | 986 | 0,01% | — | 0 | — | 0 | — | 0 |
| 67 | integratori | 563 | 0,00% | — | 0 | — | 0 | — | 0 |

Ordine consigliato per USA ed Europa insieme (ricavato dalla tabella; la priorità è una mia ipotesi):

1. **comuni, fra le prime 13 ovunque:** panna, vaniglia-aromi, lievito, vino, senape, mais, uvetta, maiale, strutto, semi, liquore;
2. **solo USA, ma pesanti:** maionese-salse, salse, preparati, peperoncino, ananas, cocco, sciroppo, impasto, tortilla-piadina;
3. **Europa e Sud:** molluschi, agnello, carciofo, asparago, pesca-albicocca, ciliegia;
4. il resto (torta, marshmallow, snack salati, cereali, caramelle, datteri-fichi, gelato…) vale meno dello 0,2% ciascuno.

## Mappa delle famiglie

Tutte le famiglie con un nome, con le occorrenze e i 5 membri più frequenti in RecipeNLG (forma normalizzata). Stato: app = fra le 64; in corso = fra le 5 in lavorazione; nuova = da disegnare. La versione con 8 membri per famiglia è in `res_famiglie_rnlg.tsv`. [misurato: RecipeNLG; Ahn]

| Famiglia | Stato | Occ. RecipeNLG | quota | Occ. Ahn (56k) | Membri principali (RecipeNLG, occorrenze) |
|---|---|---|---|---|---|
| spezie | app | 1.465.744 | 8,08% | 49.628 | pepper (208630), cinnamon (130604), ground black pepper (80278), black pepper (77054), oregano (73537) |
| sale | app | 1.051.463 | 5,80% | 0 | salt (963693), kosher salt (74266), accent (3000), kosher (1241), pickling salt (1120) |
| zucchero | app | 972.863 | 5,37% | 7.655 | sugar (616257), brown sugar (198649), powdered sugar (58540), white sugar (40857), confectioner sugar (15094) |
| cipolla | app | 766.878 | 4,23% | 23.971 | onion (488704), green onion (84018), red onion (51630), shallot (37452), scallion (31039) |
| farina | app | 750.879 | 4,14% | 24.298 | flour (469807), cornstarch (60744), all purpose (43335), bread crumb (37631), breadcrumb (21108) |
| burro | app | 721.111 | 3,98% | 21.691 | butter (572159), margarine (112420), oleo (26268), ghee (1930), sweet butter (1454) |
| uovo | app | 686.707 | 3,79% | 20.951 | egg (592172), egg yolk (46960), egg white (38448), egg substitute (3632), egg beater (1200) |
| olio | app | 631.852 | 3,48% | 22.209 | olive oil (282232), vegetable oil (100470), oil (89809), canola oil (32102), sesame oil (22120) |
| erbe | app | 618.808 | 3,41% | 25.314 | parsley (125794), basil (79777), thyme (72876), cilantro (64293), bay leaf (46831) |
| formaggio | app | 480.505 | 2,65% | 12.857 | cheddar cheese (109895), parmesan cheese (92983), cheese (69738), mozzarella cheese (41813), swiss cheese (17100) |
| latte | app | 473.683 | 2,61% | 14.574 | milk (371161), buttermilk (48266), condensed milk (21315), sweet milk (3800), sour milk (3360) |
| aglio | app | 424.871 | 2,34% | 16.893 | garlic (421281), garlic sauce (395), roll garlic (276), garlic butter (203), green garlic (182) |
| acqua | app | 415.711 | 2,29% | 0 | water (372551), boiling water (36189), ice (2426), very water (959), water boiling (402) |
| ampolla | app | 392.536 | 2,17% | 12.352 | soy sauce (76600), worcestershire sauce (64970), vinegar (59593), red wine vinegar (23256), balsamic vinegar (21290) |
| lievito | nuova | 387.991 | 2,14% | 3.397 | baking powder (160650), baking soda (120372), soda (43273), yeast (26397), cream tartar (14500) |
| limone | app | 358.805 | 1,98% | 11.571 | lemon juice (153154), lemon (71758), lime juice (38447), lime (22589), lemon zest (18721) |
| pomodoro | app | 355.188 | 1,96% | 10.085 | tomato (205920), tomato sauce (42681), tomato paste (30432), salsa (16155), tomato juice (8542) |
| vaniglia-aromi | nuova | 347.288 | 1,92% | 9.025 | vanilla (279933), vanilla extract (12959), almond extract (7699), vanilla bean (6332), coloring (4075) |
| panna | nuova | 304.894 | 1,68% | 10.152 | sour cream (125024), heavy cream (47378), cream (37443), whipping cream (22988), heavy whipping cream (10025) |
| minestra | app | 293.494 | 1,62% | 4.289 | chicken broth (68603), cream mushroom soup (36492), cream chicken soup (33685), chicken stock (18547), beef broth (13508) |
| peperone | app | 268.242 | 1,48% | 8.695 | green pepper (73215), red pepper (68506), red bell pepper (32562), bell pepper (25756), green bell pepper (23295) |
| cosciotto | app | 232.195 | 1,28% | 6.238 | chicken (113723), chicken breast (60897), turkey (9901), ground turkey (8273), chicken thigh (4041) |
| cioccolato | app | 214.116 | 1,18% | 4.836 | cocoa (47115), chocolate chip (40564), chocolate (32565), semi sweet chocolate chip (12698), cocoa powder (7043) |
| bistecca | app | 199.651 | 1,10% | 6.280 | ground beef (80620), beef (20101), hamburger (19766), ground chuck (6311), ground meat (3639) |
| formaggio-fresco | app | 191.289 | 1,05% | 3.446 | cream cheese (122211), cottage cheese (16610), ricotta cheese (12841), goat cheese (8001), philadelphia cream cheese (5742) |
| maionese-salse | nuova | 157.793 | 0,87% | 0 | mayonnaise (95088), dressing (10596), italian dressing (8667), salad dressing (7454), miracle (6036) |
| patata | app | 150.259 | 0,83% | 4.156 | potato (89856), sweet potato (16406), red potato (9396), baking potato (5859), russet potato (3393) |
| noce | app | 149.804 | 0,83% | 4.918 | pecan (85499), walnut (53504), pecan half (5390), walnut half (1520), black walnut (1208) |
| sedano | app | 140.750 | 0,78% | 3.603 | celery (138428), celery root (1061), celeriac (240), ground celery (158), celery top (108) |
| fragola | app | 125.257 | 0,69% | 3.628 | strawberry (41695), cranberry (20865), blueberry (19132), raspberry (14894), cranberry sauce (5450) |
| carota | app | 124.455 | 0,69% | 3.570 | carrot (122663), carrot juice (303), carrot target (162), julienne carrot (150), matchstick carrot (113) |
| pasta | app | 124.130 | 0,68% | 3.382 | pasta (16803), noodle (16103), macaroni (10452), egg noodle (8766), elbow macaroni (6237) |
| senape | nuova | 121.958 | 0,67% | 4.586 | mustard (83612), horseradish (11770), dijon mustard (4296), yellow mustard (4097), ground mustard (3504) |
| preparati | nuova | 120.169 | 0,66% | 1.410 | vanilla pudding (15253), bisquick (8080), yellow cake mix (6615), unflavored gelatin (5930), cake mix (5776) |
| arancia | app | 119.696 | 0,66% | 4.414 | orange juice (43491), orange (30799), orange zest (10853), mandarin orange (9319), orange rind (5444) |
| broccolo | app | 118.107 | 0,65% | 2.811 | broccoli (35384), cabbage (26130), cauliflower (13666), broccoli floret (6847), sauerkraut (5409) |
| legumi | app | 117.533 | 0,65% | 4.767 | bean (22049), black bean (17156), kidney bean (13582), chickpea (8028), pinto bean (7609) |
| frutta-guscio | in corso | 110.431 | 0,61% | 2.029 | nut (80374), cashew (6588), pine nut (5342), hazelnut (4780), pistachio (4549) |
| fungo | app | 107.976 | 0,60% | 4.148 | mushroom (78539), shiitake mushroom (4939), button mushroom (3718), white mushroom (2110), cremini mushroom (1931) |
| salse | nuova | 107.919 | 0,60% | 0 | ketchup (27917), catsup (13988), barbecue sauce (10533), chili sauce (8606), hoisin sauce (4227) |
| vino | nuova | 102.837 | 0,57% | 5.855 | white wine (42417), red wine (17091), sherry (11855), sake (4845), wine (2913) |
| peperoncino | nuova | 99.360 | 0,55% | 87 | green chili (18236), jalapeno (8041), jalapeno pepper (7242), chili (5679), chile (5088) |
| mela | app | 98.603 | 0,54% | 3.538 | apple (51432), applesauce (12543), apple juice (8018), apple cider (5794), tart apple (2252) |
| ananas | nuova | 98.333 | 0,54% | 1.616 | pineapple (76617), pineapple juice (16577), pineapple tidbit (1951), candied pineapple (1480), pineapple ring (320) |
| riso | app | 97.200 | 0,54% | 3.732 | rice (55277), white rice (7348), brown rice (6972), long grain rice (6230), basmati rice (2965) |
| pane | app | 97.119 | 0,54% | 4.644 | bread (43125), bun (6859), roll (5698), crouton (3880), baguette (3610) |
| sciroppo | nuova | 91.404 | 0,50% | 471 | corn syrup (20532), maple syrup (18829), molasses (17512), syrup (9048), simple syrup (2772) |
| pancetta | app | 84.811 | 0,47% | 2.156 | bacon (72157), bacon bit (3387), pancetta (3282), salt pork (1469), turkey bacon (952) |
| cocco | nuova | 78.737 | 0,43% | 1.710 | coconut (45178), coconut milk (13458), flaked coconut (7565), coconut flake (1958), coconut cream (1532) |
| strutto | nuova | 77.737 | 0,43% | 3.052 | shortening (53090), crisco (9784), vegetable shortening (5615), lard (4053), bacon dripping (913) |
| biscotto | app | 74.896 | 0,41% | 0 | cracker (18472), graham cracker crumb (12639), graham cracker (6854), vanilla wafer (6583), cracker crumb (5593) |
| impasto | nuova | 74.485 | 0,41% | 0 | crust (10981), pastry (10215), crescent roll (7035), graham cracker crust (6316), pie shell (5638) |
| miele | app | 74.312 | 0,41% | 2.483 | honey (71787), liquid honey (591), clear honey (385), runny honey (152), honey nut (110) |
| liquore | nuova | 72.816 | 0,40% | 1.692 | rum (9004), brandy (8351), vodka (7594), bourbon (5124), dark rum (3634) |
| arachide | app | 68.108 | 0,38% | 1.613 | peanut butter (38202), peanut (20433), crunchy peanut butter (2725), chunky peanut butter (1875), smooth peanut butter (1746) |
| gambero | app | 66.788 | 0,37% | 2.272 | shrimp (39934), crabmeat (6152), crab meat (4434), lobster (2770), lump crabmeat (2247) |
| uvetta | nuova | 63.680 | 0,35% | 2.155 | raisin (47666), golden raisin (6506), currant (3967), sultana (952), white raisin (949) |
| mais | nuova | 63.666 | 0,35% | 4.777 | corn (34328), kernel corn (11147), corn kernel (5345), cream style corn (3572), sweet corn (1529) |
| pesce | app | 62.256 | 0,34% | 3.295 | salmon (13917), tuna (10640), anchovy (5026), fish (3421), salmon fillet (2649) |
| maiale | nuova | 62.236 | 0,34% | 2.094 | pork (15123), pork chop (10487), ground pork (8088), pork tenderloin (5537), pork loin (2886) |
| foglie | app | 58.458 | 0,32% | 198 | spinach (32412), arugula (8725), spinach leaf (3811), greens (2639), swiss chard (1676) |
| salsiccia | app | 58.119 | 0,32% | 1.667 | sausage (24783), italian sausage (6792), pork sausage (5431), kielbasa (1776), chorizo (1405) |
| mandorla | app | 54.961 | 0,30% | 2.323 | almond (44401), slivered almond (2790), ground almond (2783), blanched almond (2175), blanched slivered almond (422) |
| banana | app | 53.697 | 0,30% | 984 | banana (47809), mashed banana (2325), very banana (781), plantain (687), banana mashed (325) |
| cetriolo | app | 49.814 | 0,27% | 1.810 | cucumber (33724), dill pickle (3086), sweet pickle (2872), pickle (2470), sweet pickle relish (1184) |
| olive | in corso | 49.268 | 0,27% | 1.797 | olive (20902), black olive (17210), green olive (6352), kalamata olive (1516), nicoise olive (380) |
| semi | nuova | 47.720 | 0,26% | 2.587 | sesame seed (16702), poppy seed (7022), sunflower seed (4911), tahini (3549), pumpkin seed (2597) |
| zucchina | app | 46.394 | 0,26% | 1.093 | zucchini (39635), yellow squash (4695), courgette (559), green zucchini (259), summer squash (257) |
| avena | app | 46.012 | 0,25% | 1.327 | oat (20206), rolled oat (10514), oatmeal (10354), cooking oat (2843), old fashioned oat (982) |
| tortilla-piadina | nuova | 45.408 | 0,25% | 0 | flour tortilla (14831), corn tortilla (9431), taco (7765), tortilla (4394), pita bread (1686) |
| insalata | app | 44.980 | 0,25% | 1.419 | lettuce (10844), salad (5908), romaine lettuce (4941), salad greens (3104), radicchio (1577) |
| salumi | in corso | 44.040 | 0,24% | 1.605 | ham (22924), pepperoni (6588), salami (1799), ham hock (1430), deli ham (1125) |
| piselli | app | 41.308 | 0,23% | 1.099 | pea (24545), green pea (5239), snow pea (3684), sugar snap pea (1567), sweet pea (895) |
| marmellata | app | 41.070 | 0,23% | 1 | cherry pie filling (9398), orange marmalade (3583), apricot preserve (3413), apple pie filling (1634), preserve (1561) |
| yogurt | app | 40.314 | 0,22% | 1.044 | yogurt (25630), greek yogurt (4056), vanilla yogurt (2784), yoghurt (1352), low fat yogurt (1339) |
| torta | nuova | 34.929 | 0,19% | 0 | cake (10848), yellow cake (7085), white cake (2669), muffin (2659), corn muffin (2065) |
| zucca | app | 33.917 | 0,19% | 1.387 | pumpkin (16483), butternut squash (5339), pumpkin puree (4478), squash (1793), butternut (1369) |
| marshmallow | nuova | 33.627 | 0,18% | 0 | marshmallow (25495), marshmallow cream (2985), marshmallow creme (2919), jet puffed miniature marshmallow (517), marshmallow fluff (389) |
| ciliegia | nuova | 32.611 | 0,18% | 1.132 | cherry (11679), maraschino cherry (9797), candied cherry (2495), sweet cherry (944), sour cherry (889) |
| pesca-albicocca | nuova | 31.601 | 0,17% | 1.198 | peach (18230), apricot (7677), nectarine (1310), apricot nectar (1273), apricot half (896) |
| chicchi | app | 29.987 | 0,17% | 394 | quinoa (4663), couscous (4278), bran (3495), germ (2757), barley (2480) |
| snack-salati | nuova | 29.032 | 0,16% | 162 | tortilla chip (7593), pretzel (4306), potato chip (3774), corn chip (2486), popcorn (2053) |
| cereali | nuova | 28.283 | 0,16% | 429 | corn flake (5560), rice krispy (5509), cereal (4464), cornflake (2240), corn flake crumb (717) |
| avocado | app | 27.898 | 0,15% | 649 | avocado (25295), guacamole (1411), avacado (284), guacamole dip (112), avocado dip (108) |
| fagiolini | app | 26.596 | 0,15% | 0 | green bean (22701), string bean (969), wax bean (734), french style green bean (492), haricot vert (413) |
| caramelle | nuova | 24.331 | 0,13% | 162 | caramel (4528), butterscotch chip (4064), peppermint (2383), caramel sauce (1388), butterscotch (1093) |
| datteri-fichi | nuova | 22.731 | 0,12% | 514 | date (14987), prune (2816), fig (2182), candied fruit (1061), candied (125) |
| caffe | app | 21.684 | 0,12% | 716 | coffee (11756), espresso powder (1798), coffee granule (1625), espresso (1436), coffee powder (703) |
| verdura | in corso | 21.283 | 0,12% | 1.660 | vegetable (15958), veg all (1530), veggy (272), chinese vegetable (270), veggie (140) |
| gelato | nuova | 20.885 | 0,11% | 0 | vanilla ice cream (11152), caramel ice cream topping (1388), orange sherbet (1127), chocolate ice cream (940), lime sherbet (496) |
| molluschi | nuova | 19.000 | 0,10% | 1.521 | oyster (3424), clam (3351), mussel (2862), scallop (2279), clam juice (2120) |
| bibita | nuova | 17.841 | 0,10% | 0 | ginger ale (6861), club soda (3070), lemon lime soda (809), sprite (801), sparkling water (680) |
| frutta-tropicale | nuova | 17.503 | 0,10% | 2.140 | mango (11432), papaya (1389), tamarind paste (713), tamarind (374), passion fruit (357) |
| frutta | in corso | 14.483 | 0,08% | 481 | fruit (5978), fruit cocktail (4047), nectar (1781), fruit juice (705), fruit filling (122) |
| verdure-asiatiche | nuova | 13.689 | 0,07% | 0 | water chestnut (11716), bamboo shoot (1548), heart palm (411), bamboo shoot strip (3), palm heart (2) |
| pancarre | app | 13.457 | 0,07% | 453 | white bread (8546), wheat bread (2456), wheat bread crumb (487), white sandwich bread (444), white bread crumb (202) |
| melanzana | app | 13.149 | 0,07% | 0 | eggplant (11606), aubergine (744), japanese eggplant (268), italian eggplant (124), chinese eggplant (52) |
| capperi | nuova | 12.876 | 0,07% | 0 | caper (12625), caperberry (56), caper juice (34), liquid removed caper (26), caper brine (26) |
| pomodorini | app | 12.824 | 0,07% | 0 | cherry tomato (7704), grape tomato (4313), yellow cherry tomato (134), red cherry tomato (85), basket cherry tomato (80) |
| uva | app | 11.984 | 0,07% | 1.169 | grape (4325), green grape (1691), red grape (1583), grape juice (954), white grape juice (692) |
| glassa | nuova | 10.237 | 0,06% | 0 | frosting (4099), icing (1551), almond paste (1102), meringue (558), almond bark (398) |
| prugna-altri | nuova | 9.921 | 0,06% | 515 | rhubarb (6295), plum (917), persimmon (474), persimmon pulp (453), kumquat (453) |
| agnello | nuova | 9.741 | 0,05% | 475 | lamb (3629), ground lamb (2148), lamb shoulder (697), lamb shank (592), lamb chop (576) |
| finocchio | app | 9.083 | 0,05% | 907 | fennel (4157), fennel bulb (3528), ground fennel (539), bulb fennel (207), fennel frond (148) |
| birra | nuova | 9.064 | 0,05% | 303 | beer (5796), stout (654), dark beer (330), lager beer (263), lager (263) |
| barbabietola | nuova | 8.199 | 0,04% | 232 | beet (5669), red beet (632), beetroot (519), beet juice (351), golden beet (325) |
| germogli | nuova | 7.414 | 0,04% | 0 | bean sprout (5241), sprout (1306), alfalfa sprout (583), microgreen (84), sunflower sprout (36) |
| pera | app | 7.373 | 0,04% | 511 | pear (4404), bartlett (812), pear half (595), asian pear (319), pear juice (209) |
| melone | nuova | 7.263 | 0,04% | 265 | cantaloupe (2356), watermelon (2062), honeydew melon (680), honeydew (443), seedless watermelon (347) |
| ravanello | nuova | 7.088 | 0,04% | 509 | radish (5621), daikon radish (429), red radish (392), daikon (205), white radish (79) |
| rape-radici | nuova | 6.861 | 0,04% | 378 | parsnip (3289), jicama (1588), rutabaga (412), turnip (370), lotus root (210) |
| asparago | nuova | 5.821 | 0,03% | 438 | asparagus (4988), asparagus spear (211), green asparagus (201), white asparagus (163), blanched asparagus (24) |
| te | nuova | 5.819 | 0,03% | 172 | tea (2325), black tea (654), green tea (621), matcha (178), matcha powder (152) |
| carciofo | nuova | 4.253 | 0,02% | 391 | artichoke (3416), artichoke heart (451), artichoke bottom (76), marinated artichoke (43), canquartered artichoke (36) |
| okra | nuova | 4.164 | 0,02% | 100 | okra (3898), okra pod (164), tender okra (17), pod okra (14), pickled okra (13) |
| melograno | nuova | 3.825 | 0,02% | 0 | pomegranate juice (1404), pomegranate seed (1348), pomegranate (715), pomegranate aril (192), squeezed pomegranate juice (25) |
| pompelmo | nuova | 3.514 | 0,02% | 117 | grapefruit juice (1175), grapefruit (504), pink grapefruit (443), red grapefruit (361), squeezed grapefruit juice (108) |
| soia-fermentati | nuova | 2.572 | 0,01% | 0 | white miso (677), miso (552), miso paste (234), red miso (221), seitan (181) |
| kiwi | nuova | 2.171 | 0,01% | 105 | kiwi (975), kiwis (441), kiwi fruit (367), kiwifruit (320), green kiwi fruit (9) |
| alghe | nuova | 1.307 | 0,01% | 372 | nori (339), kombu (176), agar agar (174), kelp (146), agar (96) |
| tomatillo | nuova | 986 | 0,01% | 0 | salsa verde (452), tomatillo (435), tomatillo sauce (13), green tomatillo (11), store bought salsa verde (7) |
| cornetto | app | 828 | 0,01% | 0 | croissant (640), brioche (84), croissant roll (37), brioche roll (16), brioche loaf (10) |
| integratori | nuova | 563 | 0,00% | 0 | protein powder (409), whey (75), whey powder (28), whey protein (15), liquid whey (3) |

## Trappole

- **Le basi della dispensa gonfiano la testa della curva.** Sale (5,80%), zucchero (5,37%) e acqua (2,29%) sono insieme il 13,5% delle occorrenze USA [misurato: RecipeNLG]. In Ahn non ci sono: delle 1.612 ricette con cacao, vaniglia, farina, burro e uova solo il 36% ha un qualsiasi dolcificante [misurato: Ahn]. Ahn quindi **non registra** zucchero bianco, sale, acqua, baking powder e soda, perché sono ingredienti senza composti aromatici. Ne segue che la copertura dell'app su Ahn è calcolata senza sale e zucchero, e che "lievito" su Ahn è solo il lievito di birra. "cane_molasses" (7.655 ricette) l'ho messo in zucchero; che si tratti di zucchero di canna o melassa, e non di zucchero bianco, è un'ipotesi.
- **Non-ingredienti e troncature del NER.** Ho scartato 285.042 occorrenze: "topping", "filling", "mix", "sauce", unità di misura, attrezzi come skewer e foil [misurato: RecipeNLG]. Restano ambiguità che spostano qualche decimale:
  - "soda" (43.273) → baking soda;
  - "all purpose" (43.335) → farina;
  - "pepper" (208.630) → pepe;
  - "red pepper" (68.506) → peperone, anche quando è peperoncino in fiocchi;
  - "chili" (5.679) → peperoncino, anche quando è chili con carne.

  Nel vocabolario Ahn "tamarind" (1.663) è probabilmente worcestershire ricondotto al tamarindo (ipotesi), e "corn" (4.777) non separa il mais da amido e sciroppo.
- **Marchi americani.** velveeta, bisquick, crisco, cool whip, miracle whip, ro-tel e karo li ho mappati a mano. In un mercato nuovo i marchi cambiano e la lista va rifatta.
- **Lingua.** Tutti i dati sono in inglese. `trovaIcona` dell'app lavora su radici italiane: quanto riconosca nomi inglesi, francesi o tedeschi è **NON ESEGUITO**. Le regex di `famiglie.py` possono servire come base per i sinonimi inglesi del catalogo; per gli altri mercati serve una lista nella lingua del posto.
- **Composti.** Le zuppe pronte americane (cream of mushroom 36.492, cream of chicken 33.685) finiscono in minestra e la gonfiano (1,62%) [misurato: RecipeNLG].

## Limiti

- **La granularità l'ho scelta io, e decide il risultato.** Con famiglie larghe basta un centinaio di icone; con un'icona per ingrediente ne servono più di 1.000 per arrivare al 92,6%. Le due curve sono gli estremi: il catalogo vero starà in mezzo.
- **Le ricette non sono la spesa degli utenti.** Il peso misurato è la frequenza nelle ricette pubblicate, non negli import reali di Dispesa. Il confronto con gli import in produzione è **NON ESEGUITO**.
- **RecipeNLG pende verso la cucina casalinga americana di qualche anno fa**: il 40% viene da cookbooks.com, che raccoglie ricettari comunitari. Va usato per l'USA, non per l'Europa.
- **L'Europa misurata è piccola ed etichettata per cucina**: 7.470 ricette (4.180 del Sud), in inglese, da siti americani. L'Italia da sola è **NON ESEGUITO**: Ahn non la separa dal resto dell'Europa del Sud.
- **Il vocabolario di Ahn (381 voci) taglia la coda**: sopra le 100 famiglie le coperture Ahn sono al 100% per costruzione.
- **La mappatura è controllata su un solo campione di 150 occorrenze, da me.** Una seconda revisione indipendente è **NON ESEGUITA**.
- Dentro una ricetta conto le stringhe distinte: se ci sono sia "salt" sia "kosher salt", contano come due occorrenze di sale.

## Fonti e licenze

| Fonte | URL | Dimensione | Licenza e termini | Data |
|---|---|---|---|---|
| Ahn, Ahnert, Bagrow, Barabási (2011), Sci. Rep. 1:196, Supplementary S3 (`srep00196-s3.csv`) | https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fsrep00196/MediaObjects/41598_2011_BFsrep00196_MOESM3_ESM.zip | zip 726.024 byte (CSV 4.510.212 byte) | La pagina nature.com/articles/srep00196 dichiara l'articolo CC BY-NC-SA 3.0. Che la licenza copra anche il file supplementare è un'ipotesi | scaricato il 03/10/2026 |
| Stesso articolo, Supplementary S2 (composti aromatici) | …MOESM2_ESM.zip | 1.448.192 byte | come sopra | scaricato il 03/10/2026 per errore insieme a S3; **mai aperto né usato**; cancellato |
| RecipeNLG (Bień et al., INLG 2020): mirror `SandhyaKilari/RecipeNLG_dataset` su Hugging Face, nella conversione Parquet automatica di HF (5 file) | https://huggingface.co/api/datasets/SandhyaKilari/RecipeNLG_dataset/parquet/default/train/{0..4}.parquet | 1.058.872.336 byte, 2.231.142 righe | Il mirror dichiara `cc-by-4.0`, ma l'ha scritto chi ha caricato i file e non fa fede. L'originale si scarica da recipenlg.cs.put.poznan.pl dopo un modulo di accettazione dei termini; a mia memoria i termini ammettono solo ricerca e didattica non commerciali (**da verificare, non controllato oggi**). Il contenuto delle ricette resta dei siti di origine | scaricato il 03/10/2026 |

Totale scaricato: circa 1,06 GB, sotto il limite di 1,5 GB, senza login. Ho letto solo file CSV e Parquet: nessuno script o notebook dei dataset è stato eseguito. pandas e pyarrow li ho installati in un venv dentro la cartella di lavoro e poi l'ho cancellato.

**Da decidere per Andrea.** L'originale di RecipeNLG chiede un modulo, il mirror su HF no. Ho usato solo **conteggi aggregati**: nessuna ricetta è copiata nel report o nel prodotto. Prima di pubblicare questi numeri, o di usare i dati nel prodotto, vanno verificati i termini originali.

**Fonti scartate**:

- `mbien/recipe_nlg` (HF): è uno script che chiede di scaricare a mano dal modulo RecipeNLG, quindi l'ho saltato;
- `corbt/all-recipes` (HF): 807 MB di solo testo libero, senza licenza dichiarata, non scaricato;
- dump Food.com e Allrecipes su Kaggle: servono login, non provati;
- copia diretta su static-content.springer.com: risponde 403.

## File di lavoro

Nella cartella di lavoro della sessione (`…/scratchpad/dataset-ricette/`) restano solo script e tabelle di risultato; i dati grezzi sono cancellati.

- regole: `normalizza.py` (normalizzazione), `famiglie.py` (famiglie e correzioni per Ahn);
- script: da `s1` a `s7` (conteggi, curve, copertura delle ricette, tabelle);
- risultati: `res_sintesi.json`, `res_curva_ingrediente.json`, `res_ricette_coperte.json`, `res_famiglie_rnlg.tsv`, `res_famiglie_ahn.tsv`, `res_famiglie_ahn_eu.tsv`;
- conteggi e controlli: `out_ner_norm.tsv` (conteggi per nome normalizzato), `audit_campione.tsv`, `audit_map.tsv`.
