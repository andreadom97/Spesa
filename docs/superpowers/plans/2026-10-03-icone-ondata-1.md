# Icone, ondata 1 (03/10) — piano

**Obiettivo:** aggiungere 25 famiglie di icone scelte dai dati (RecipeNLG + Ahn, `docs/2026-10-03-copertura-icone-ricette.md`) fra quelle che servono anche a un utente italiano. Le famiglie solo americane (maionese e salse, salse rosse, preparati, sciroppo, strutto, impasti pronti…) restano per l'ondata 2, insieme ai sinonimi in inglese. Si misura il risultato con la copertura sulle diete e con il foglio di approvazione di Andrea.

**Stile e regole:** identici alle 69 icone esistenti (`design/sistema/DESIGN.md` §6; vincoli in `vincoli.md`). Metodo come per le famiglie del 03/10: catalogo + tracciato + test nello stesso lotto, `controlla-icone` ok, foglio rigenerato.

## Le 25 chiavi, in 5 lotti

Sinonimi in italiano (una forma, `radice` fa il resto). Le avvertenze vanno rispettate.

**Lotto A, cucina e dispensa:**
- `panna`: panna, panna da cucina, panna fresca, panna montata, besciamella. Avvertenza: «panna cotta» (dolce) va bloccata o lasciata a `panna`: scegli e motiva.
- `vaniglia`: vaniglia, vanillina, estratto di vaniglia, bacca di vaniglia. NON «aroma» (nelle diete «aroma»/«aromatizzazione» non sono ingredienti).
- `lievito`: lievito, lievito di birra, lievito per dolci, bicarbonato, cremor tartaro.
- `senape`: senape, mostarda.
- `capperi`: cappero.

**Lotto B, carne e pesce:**
- `maiale`: maiale, lonza, arista, braciola di maiale, costine, filetto di maiale, porchetta. Attenzione: «filetto» da solo è ambiguo (pesce o manzo), non aggiungerlo.
- `agnello`: agnello, abbacchio, capretto.
- `molluschi`: cozza, vongola, calamaro, polpo, seppia, totano, ostrica, capasanta. I crostacei restano `gambero`.
- `mais`: mais, granturco, pop corn, popcorn. Avvertenza: il 26/09 Andrea aveva tolto l'icona del mais perché non si capiva; disegnala inequivocabile (pannocchia con le foglie aperte e i chicchi a griglia) e segnala che lo deciderà lui al foglio. Aggiorna `ESCLUSI_DI_PROPOSITO` e il test «→ null (gate 26/09)» (via Mais, resta Kiwi).
- `peperoncino`: peperoncino, peperoncino fresco, jalapeno. Spostalo da `spezie` (oggi «peperoncino» è un sinonimo di spezie): il peperoncino ha una forma riconoscibile. «peperoncino in polvere» va anch'esso qui.

**Lotto C, frutta:**
- `ananas`: ananas.
- `cocco`: cocco, noce di cocco, latte di cocco, farina di cocco, cocco rapé. Avvertenza: «latte di cocco» e «farina di cocco» oggi vanno a latte e farina (vince la prima parola): il sinonimo più lungo alla stessa posizione deve vincere, verifica con i test. Oggi «Noce di cocco» → noce: deve diventare cocco.
- `ciliegia`: ciliegia, amarena, marasca, visciola.
- `melone`: melone, anguria, cocomero.
- `datteri-fichi`: dattero, fico, fico secco. Attenzione a «fico d'india» (lascia pure qui).

**Lotto D, frutta e verdura:**
- `pesca-albicocca`: albicocca, nettarina, percoca. «pesca» e «pesche noci» oggi sono BLOCCHI per l'omografo pesca/pesce (stessa radice `pesc`). NON togliere i blocchi: «pesca» resta senza icona a meno di cambiare `trovaIcona`, ed è fuori da questo lotto. Scrivilo nel report.
- `uvetta`: uvetta, uva passa, uva sultanina. Deve vincere su `uva` (sinonimo più lungo alla stessa posizione).
- `carciofo`: carciofo.
- `asparago`: asparago.
- `semi`: semi di chia, semi di lino, semi di girasole, semi di zucca, semi di sesamo, sesamo, chia, lino. Attenzione a «semola» (blocco esistente) e a «semifreddo».

**Lotto E, bevande, colazione e pane:**
- `vino`: vino, vino bianco, vino rosso, spumante, prosecco. «aceto di vino» resta `ampolla`.
- `liquore`: liquore, rum, marsala, brandy, cognac, limoncello, grappa. NON «amaretto» (è anche il biscotto). Disegna una bottiglia chiaramente diversa da `olio`, `ampolla` e `acqua` (forma, etichetta, tappo).
- `te`: tè, te, tisana, camomilla, infuso. Attenzione: «te» con radice di 2 lettere.
- `cereali`: cereali, corn flakes, muesli, granola. Da non confondere con `chicchi` (farro, orzo, quinoa) né con `avena`.
- `piadina`: piadina, tortilla, wrap. Nelle diete c'è «piadina integrale».

## Ogni lotto

1. Catalogo (`src/domain/icone-ingredienti.ts`), nella sezione giusta, con commento dove serve.
2. Test in `src/domain/__tests__/icone-ingredienti.test.ts`: righe `it.each` per i nomi tipici di ogni chiave e i casi di non regressione citati sopra; aggiorna il conteggio delle chiavi.
3. Tracciati (`src/components/tracciati-ingredienti.ts`): `sil`, `d`, `dd` nello stile delle 69; partire dai riferimenti (pomodoro, carota, pesce, formaggio, pane, latte e le icone vicine per forma).
4. `scripts/foglio-icone.ts`: aggiungi le chiavi a `REPARTO` (reparto tipico).
5. `npx tsx scripts/controlla-icone.ts <chiavi del lotto>` → tutte ok.
6. Schermata delle chiavi del lotto più quelle con cui possono confondersi, guardata a 60 e 240 px.
7. `npm test`, tsc, lint; commit in italiano con il trailer.

## Alla fine

- `docs/superpowers/specs/2026-09-26-icone-ingredienti-lista.md`: sezione «Ondata 1 (03/10)» con le chiavi e i sinonimi.
- Misura della copertura sulle diete prima/dopo.
- Foglio delle 94 per il gate di Andrea, poi PR. Merge solo con il suo ok.
