# Fase 8b: Controlla e Ingredienti di Importa («Solo i dubbi»)

**Obiettivo:** chi importa la dieta arriva al piano toccando solo quello che l'AI non sa. Le due
schermate rimaste fuori dal sistema di `design/sistema/DESIGN.md`, Revisione e Formati, si
rifanno come **Controlla** e **Ingredienti** nella direzione B «Solo i dubbi», e si chiudono i
difetti di dato emersi in fase di disegno.

Ha funzionato se:
- le azioni obbligate crescono coi dubbi, non coi pasti: sul fixture `PIANO_MENU_SETTIMANALE`
  bastano le risposte ai dubbi, `CONFERMA I PASTI` e `VAI AL RIEPILOGO`;
- in `src/app/(app)/importa/` non resta nessun `<select>`, nessuno switch, nessun `#C77700`, nessun
  tasto finale fuori dal Dock;
- «pane integrale» e «pane di segale» diventano due ingredienti con due nomi diversi, «melanzane»
  non diventa «Mela», le olive a pezzi non propongono 500 pz a confezione;
- la bozza non cambia forma: `StatoRevisione` resta com'è, le bozze già salvate si riprendono,
  `traduciBozza` ed `eseguiScritture` non cambiano, nessuna migrazione.

**Le decisioni di Andrea (27/09):**
1. **Direzione B, «Solo i dubbi»** (pagina di confronto
   https://claude.ai/artifact/2iUi7cfo2B9xcvY6NAGDZg). Di default tutto è accettato; si tocca solo
   ciò che l'AI non sa; il resto è riassunto e si apre col tocco.
2. **Il giorno aperto corregge quantità e righe.** Nel foglio del giorno si cambia la quantità di
   una riga e si toglie una riga. Nomi dei piatti e piatti interi si sistemano dopo, nell'editor
   del Piatto (fase 7).
3. **Il nome dell'ingrediente viene dalla dieta.** La tabella dei formati presta area, confezione,
   classe e fresco; il nome è il suo solo se l'alimento è esattamente la chiave. Le chiavi si
   confrontano per parole intere. Due proposte che finiscono con lo stesso nome sono un dubbio che
   blocca finché non se ne rinomina una. Unire due ingredienti nuovi in uno: no.
4. **Il ripiego non blocca.** Un ingrediente fuori tabella ha la scheda aperta fra quelli «da
   controllare», ma `VAI AL RIEPILOGO` resta acceso. Il ripiego a pezzi propone 1 pz a confezione;
   in g e ml resta 500.
5. **Una riga irrisolta ripetuta è un dubbio solo.** Le righe con lo stesso alimento e lo stesso
   testo sul foglio diventano un gruppo: una risposta vale per tutte.

**Le decisioni prese scrivendo la spec** (Andrea le ha viste nel design e non le ha corrette, o
sono nuove qui e vanno lette):
6. L'unità si sceglie con le **pillole G / ML / PZ dell'editor dell'ingrediente**
   (`piatti/[id]/ingredienti/[ingId]/page.tsx`), non col Segmento a blocco: Importa non introduce
   una regola nuova.
7. **Nella scheda di Ingredienti l'unità non si cambia**: è quella delle righe della dieta. Oggi
   Formati la lascia cambiare, e un'unità diversa da quella delle righe manda il riepilogo in
   `BozzaIncompletaError` e rimanda alla revisione, dove niente dice perché (§J).
8. **Un gruppo di righe irrisolte ha l'unità fissa se il piano la conosce già** per lo stesso
   alimento (un'altra riga con l'unità). Solo un alimento che non ha un'unità da nessuna parte
   mostra le pillole. Evita il conflitto di unità fra due righe dello stesso alimento, la stessa
   causa del punto 7.
9. **Togliere l'ultima riga svuota a cascata**: un'opzione senza righe sparisce, un componente
   senza opzioni sparisce, un piatto senza righe né componenti sparisce, un pasto senza piatti
   diventa `{ nomeOriginale, piatti: [] }`, che `traduciBozza` già legge come pasto rimosso.
10. Il gruppo dei giorni si chiama **«I giorni»** e non «Il resto»: contiene tutti i giorni,
    anche quelli con un dubbio.
11. **Il titolo è «Importa»** in tutte le schermate di `/importa` (§3, una parola), con la pillola
    del passo sotto il titolo nelle schermate dei quattro passi.

**Fuori perimetro, esplicitamente:**
- il prezzo nel passo Ingredienti: esce dal passo. Il campo `prezzoConfezione` resta nella
  proposta (null per le nuove, conservato nelle bozze che lo hanno) e si mette dall'editor;
- rinominare l'alimento di una riga, rinominare un piatto, eliminare un piatto o un pasto intero
  (decisione 2);
- unire due ingredienti nuovi (decisione 3);
- la fotocamera, i fogli presi, gli stati dell'8a e il riepilogo, tranne il titolo e la pillola
  del passo;
- i limiti noti dell'8a (la risposta tardiva che riscrive la bozza, RIPRENDI toccabile per un
  istante).

**Il database non cambia. Nessuna migrazione.**

---

## A. `proponi` (`src/domain/import/formati-tipici.ts`)

- **Parole intere.** Una voce vale se la sua chiave compare nel nome normalizzato come sequenza di
  parole intere: `(^| )chiave( |$)`. «melanzane» non contiene la parola «mela»; «latte
  parzialmente scremato» contiene «latte». Fra più voci vince, come oggi, la chiave più lunga.
- **Il nome.** Se il nome normalizzato è uguale alla chiave, il nome è quello della voce
  («pasta» → «Pasta di semola», «olio extravergine» → «Olio extravergine di oliva»). Altrimenti è
  l'alimento con la prima lettera maiuscola («pane integrale» → «Pane integrale», «pasta
  integrale» → «Pasta integrale»), e il resto (unità, area, classe, fresco, confezione) viene
  dalla voce.
- **L'unità.** Una voce vale solo se l'unità della riga è `null` o quella della voce, come oggi.
- **Il ripiego.** Nessuna voce: nome dall'alimento, area `dispensa`, classe `stima`, non fresco,
  prezzo `null`; confezione **1** se l'unità è `pz`, **500** se è `g` o `ml` o `null` (→ `g`).
- **`origineProposta(alimento, unita): 'tabella' | 'ripiego'`**, esportata accanto a `proponi`:
  dice se `proponi` troverebbe una voce. È deterministica e si ricalcola: la proposta salvata non
  prende campi nuovi.
- Il prezzo non si propone mai, come oggi.

## B. I dubbi (`src/domain/import/dubbi.ts`, nuovo)

Funzioni pure su `(piano, stato, slotDefs)`. Il componente non calcola niente da sé. I dubbi si
riconoscono sempre **sul piano originale**, così un dubbio risposto resta al suo posto con lo stato
«fatto» e non salta fuori dalla pagina. Il loro stato si legge **sul piano effettivo**
(`pastoEffettivo`, correzioni applicate).

**Pasti.** Per ogni nome di pasto distinto (`normalizza(nomeOriginale)`) che ha almeno un pasto
effettivo con piatti:
- `daSistemare`: `proponiSlot(nomeOriginale, slotDefs)` è `null` (oggi: i condimenti e i nomi
  ignoti). Resta in «Da sistemare» anche dopo la risposta;
- `abbinato`: `mappaturaPasti[chiave]` c'è **e** punta a uno slot che esiste in `slotDefs`. Una
  mappatura verso uno slot che non esiste più conta come non abbinata e rende il nome
  `daSistemare`;
- `giorni`: in quanti giorni del piano compare (per la nota «Nella dieta in 3 giorni»).

**Gruppi di righe.** Chiave: `normalizza(alimento)` + `testoOriginale`. Due tipi, decisi sul
piano originale:
- `irrisolta`: almeno una riga del gruppo ha `quantita` o `unita` `null`;
- `inferita`: nessuna irrisolta, almeno una ha `quantitaInferita: true`.

Di ogni gruppo si sanno:
- le occorrenze (settimana, giorno, nome del pasto, nome del piatto);
- lo stato sul piano effettivo: `aperto` (una riga del gruppo è ancora irrisolta), `fatto` (tutte
  risolte), `tolto` (nessuna riga del gruppo è rimasta);
- la quantità e l'unità comuni, se tutte le righe risolte coincidono, altrimenti `null` (con
  valori diversi la nota della riga aggiunge «valori diversi nei giorni»);
- l'**unità fissa**: l'unità di una riga effettiva dello stesso alimento fuori da **ogni gruppo
  irrisolto** (non solo il proprio), se c'è (decisione 8). Non solo fuori dal proprio gruppo: due
  gruppi irrisolti dello stesso alimento non devono fissarsi l'unità a vicenda, altrimenti,
  risposti entrambi, un'unità scelta per sbaglio non si potrebbe più cambiare.

Una riga di un gruppo si ritrova nel piano effettivo per chiave, non per indice: gli indici
cambiano quando si tolgono righe.

**Le scritture** restituiscono un `StatoRevisione` nuovo, con le modifiche in `correzioni`:
- `rispondiGruppo(piano, stato, chiave, quantita, unita)`: scrive quantità e unità e
  `quantitaInferita: false` su tutte le righe effettive del gruppo;
- `togliGruppo(piano, stato, chiave)`: toglie tutte le righe effettive del gruppo, con la cascata
  della decisione 9;
- `cambiaRiga` e `togliRiga` su una riga sola di un pasto (il foglio del giorno), con la stessa
  cascata;
- `confermaTutti(piano, stato)`: `pastiConfermati` con **tutte** le chiavi del piano e
  `passo: 'formati'`, in un solo stato.

**`pronto(piano, stato, slotDefs)`**: nessun gruppo `irrisolta` in stato `aperto` e nessun nome
di pasto non abbinato. È il cancello di `CONFERMA I PASTI` e fa lo stesso lavoro del `tuttoPronto`
di oggi senza guardare `pastiConfermati`.

**Riassunto per giorno**: per settimana, per giorno, il titolo (`giorni_tipo`) o il nome del giorno,
i nomi dei piatti di ogni pasto effettivo (piatti sorella uniti da « o », pasti da « · ») e il
numero di pasti con piatti.

## C. La testata e i passi

`Cornice` in `page.tsx`: titolo **«Importa»**. La pillola sotto il titolo è la prop `settimana`
della Testata, usata come fa Scegli:

| Schermata | Pillola |
|---|---|
| Le due porte (`Acquisizione`) | `Passo 1 di 4 · I fogli` |
| Controlla | `Passo 2 di 4 · Controlla` |
| Ingredienti | `Passo 3 di 4 · Ingredienti` |
| Riepilogo | `Passo 4 di 4 · Riepilogo` |
| Ripresa, attesa, rifiuto, errore | nessuna |

La pillola IMPOSTAZIONI resta com'è. I passi non sono voci di cronologia, come oggi: l'indietro di
Android da un passo esce da Importa.

## D. Controlla (sostituisce `Revisione.tsx`)

Una pagina sola per tutto il piano, senza navigazione per giorni. Scroller `sc scroll-app
con-dock`. Dall'alto:

1. **La frase d'apertura**, 14 `--testo-2`: «Ho letto {S} settimane, {G} giorni e {P} pasti. Ti
   chiedo solo quello che non so.» (plurali corretti; con una settimana sola, «Ho letto {G}
   giorni e {P} pasti. Ti chiedo solo quello che non so.»). Quando `pronto` è vero: «Niente più da sistemare. Confermo i {P} pasti
   così: puoi sempre aprire un giorno e correggerlo.» Senza nessun dubbio fin dall'inizio vale già
   la seconda.
2. **Da sistemare** (Etichetta di sezione col contatore dei dubbi aperti; a zero dice `FATTO`), in
   un Blocco di gruppo:
   - un **Selettore a foglio** per ogni nome di pasto `daSistemare`. Condimenti: nome
     «Condimenti», nota «Nella dieta sono un pasto a parte», foglio «Condimenti: in quale pasto li
     usi?» con la nota «Ogni giorno le righe dei condimenti finiscono in questo pasto.». Altri nomi:
     nome come nella dieta, nota «Nella dieta in {N} giorni», foglio «{Nome}: a quale pasto
     corrisponde?». Finale `SCEGLI` finché non è abbinato;
   - una **Riga dell'alimento** per ogni gruppo `irrisolta`. Sopra il nome, la provenienza in mono
     10 `--sec`: «Martedì · cena · Merluzzo» se l'occorrenza è una, «Sett. 1 · Martedì · cena ·
     Merluzzo» se il piano ha più settimane, «In {N} pasti» se sono di più. Nota: «Sul foglio:
     «{testoOriginale}»». Avviso in linea finché è aperto: «Sul foglio non c'è un peso: scrivi
     quanto ne usi e in che unità.» (o «…scrivi quanto ne usi.» se l'unità è fissa). La X toglie
     il gruppo (`togliGruppo`): con una sola occorrenza subito, con più occorrenze dopo un Dialogo
     di conferma «Togliere {alimento} da {N} pasti?» (`TOGLI` / `ANNULLA`), perché qui non si torna
     indietro. Testo: «Le righe spariscono da tutti i pasti in cui compaiono. Puoi rimetterle
     dall'editor del piatto, a piano creato.» {N} conta i pasti distinti, non le righe. Un gruppo `tolto` resta al suo posto, senza campo né X, con la nota «Tolta dal
     piano».
3. **Da controllare** (solo se ci sono gruppi `inferita`): stessa Riga dell'alimento, senza bordo
   di dubbio, nota «Sul foglio: «{testo}» · quantità proposta da me». Non blocca. Cambiare il
   valore chiama `rispondiGruppo`.
4. **Dove vanno i pasti** (contatore dei nomi): un Selettore a foglio per ogni nome non
   `daSistemare`, nota «Nella dieta in {N} giorni», valore il nome dello slot.
5. **I giorni** (contatore dei pasti): una Riga di impostazione per giorno, nome «Lunedì» (o il
   titolo dello scenario), nota coi piatti, finale `{N} PASTI` con chevron. Con più settimane,
   un Blocco di gruppo per settimana, intitolato «Settimana {n}» col contatore dei suoi pasti, al
   posto del blocco unico «I giorni». Il tocco apre il foglio del giorno (§E).

**Un solo indietro per schermata.** Due `useIndietroFogli` montati insieme reagirebbero entrambi
allo stesso `popstate`, e un gesto chiuderebbe due livelli. Controlla e Ingredienti tengono quindi
un solo hook, con la profondità calcolata dal loro stato (foglio del giorno, selettore aperto,
dialogo), e il Selettore a foglio è **controllato**: `aperto`, `onApri`, `onChiudi` li decide chi
lo monta.
6. **Dock**: `CONFERMA I PASTI`, spento finché `pronto` è falso. Il tocco chiama `confermaTutti` e
   risale con un solo `onStato`.

**Quando si salva.** Scegliere uno slot, rispondere a un gruppo (all'uscita dal campo o con Invio,
come il campo numerico di §8 Riga di impostazione), togliere o rimettere un gruppo, chiudere il
foglio del giorno: ognuno è un `onStato`. Mai a ogni tasto: `onStato` innesca
`salvaBozzaImport`, senza debounce.

**Le bozze vecchie.** Una bozza al passo `revisione` con alcuni pasti già confermati si apre in
Controlla come le altre: `pastiConfermati` si riscrive intero alla conferma. Le correzioni fatte
con la Revisione di oggi (nomi di piatti cambiati, piatti tolti, alimenti rinominati) restano nel
piano effettivo e si vedono nel foglio del giorno.

## E. Il foglio del giorno

`FoglioDalBasso` `alto`, `aria-label` «{Giorno}, settimana {n}» (o «{Giorno}» con una settimana,
o il titolo dello scenario). In cima il nome del giorno, 21/800. Poi, per ogni pasto effettivo con
piatti, un'Etichetta di sezione col nome dello slot abbinato (o il nome della dieta se non è
abbinato) e, per ogni piatto, il nome del piatto 15/700 e sotto le sue righe:
- **righe fisse** come Righe dell'alimento;
- **componenti**: il nome del componente in mono 10 `--sec` (con la nota, se c'è), poi le
  opzioni separate da «oppure» in 12,5 `--ter` corsivo.

Una riga irrisolta ha lo stato dubbio. Una riga inferita ha la nota «quantità proposta da me». La X
toglie la riga, con la cascata. Le modifiche restano nel foglio e risalgono con un solo `onStato`
alla chiusura (velo, indietro di Android, la X della testata del foglio, `TestataFoglio` come nella
Dispensa). Un pasto svuotato
mostra «Pasto tolto: nessun piatto da creare per questo giorno.» fino alla chiusura.

L'indietro di Android chiude il foglio (`useIndietroFogli`), anche mentre la tastiera è aperta.

## F. Ingredienti (sostituisce `Formati.tsx`)

Il calcolo delle proposte resta quello di `calcolaProposte` di oggi (si ricalcola sempre; si
conserva la proposta già in `ingredientiNuovi` per `alimento`; i nuovi prendono `proponi`), e il
risultato si salva subito con `onStato`, come oggi.

Una proposta è **legata** se il suo nome normalizzato è uguale a quello di un ingrediente
esistente con la stessa unità: è l'effetto di «È lo stesso di…», e `traduciBozza` non la crea. È
un **nome doppio** se il suo nome normalizzato è uguale a quello di un'altra proposta, o a quello
di un ingrediente esistente con un'unità diversa.

1. **La frase**: «{N} ingredienti nuovi. Ne conosco {T}; per {R} ho messo valori prudenti:
   controllali.» (plurali corretti; senza ripieghi: «{N} ingredienti nuovi. Li ho proposti io:
   tocca quello che non torna.»). Le legate non contano fra i nuovi.
2. **Da sistemare** (solo se ci sono nomi doppi; blocca): una Scheda aperta per ogni proposta col
   nome doppio, avviso in linea «Un altro ingrediente si chiama già così: cambia il nome.».
3. **Da controllare** (i ripieghi; non blocca): una Scheda aperta per ciascuno, con la nota «Non è
   nella mia tabella dei formati: {1 pz | 500 g | 500 ml} è un valore di ripiego.».
4. **Proposti da me**: una Riga di impostazione per ogni altra proposta: nome, nota «{Area}» o
   «{Area} · fresco» (o «Usa «{nome esistente}»» se legata), finale `{formato} {UNITÀ}` con
   chevron. Il tocco apre la stessa Scheda in un Foglio dal basso `alto`, con la X della `TestataFoglio`.
5. **Dock**: `VAI AL RIEPILOGO`, spento se c'è un nome doppio, un nome vuoto o una confezione non
   positiva.

Le sezioni si decidono **all'ingresso nel passo** e non cambiano mentre si corregge, così una
scheda non salta via sotto il dito: un nome doppio rinominato resta in «Da sistemare» (senza più
avviso), un ripiego corretto resta in «Da controllare». L'unica eccezione: una proposta che
diventa un nome doppio mentre si è nel passo (rinominata dal foglio) entra in «Da sistemare».
Un ripiego col nome doppio sta in «Da sistemare».

**La Scheda dell'ingrediente**, in quest'ordine:
- intestazione: il nome, 17/800, e sopra in mono 10 `--sec` «Dalla dieta: {alimento}»;
- **Nome**: Campo di testo;
- **Area**: Selettore a foglio con le sei aree, nel loro ordine, col pallino del colore d'area;
- **Confezione**: campo numerico con l'unità della proposta in mono 10, non modificabile
  (decisione 7);
- **Come si consuma**: Segmento a blocco Porzionabile / Intero / A stima;
- **Fresco**: coppia `SÌ` / `NO`;
- **È lo stesso di…**: Selettore a foglio. Prima voce «No, è un ingrediente nuovo» (scelta di
  default), poi gli ingredienti esistenti con la stessa unità, in ordine di nome, con la nota del
  foglio «Solo gli ingredienti che conti in {grammi | millilitri | pezzi}, come questo.». Scegliere
  un esistente mette il suo nome nella proposta, e la Scheda nasconde gli altri campi con la nota
  «Userò l'ingrediente che hai già.». «No, è un ingrediente nuovo» rimette il nome di `proponi`. Se
  non c'è nessun esistente con la stessa unità, la riga non c'è.

Il prezzo non c'è.

## G. I componenti nuovi (`src/components/`)

**Riga dell'alimento** (`RigaAlimento.tsx`). È una Riga di impostazione (minimo 56, raggio 14,
dentro un Blocco di gruppo):
- nome dell'alimento 15/700 e nota 12,5 `--testo-2`;
- **finale**: il campo numerico 78 × 44 (mono 14/700 a destra, `inputMode="decimal"`, virgola e
  punto accettati) con l'unità in mono 10 `--ter`, poi la X da 44;
- **salvataggio**: all'uscita dal campo e con Invio. Un valore non positivo o non numerico torna a
  quello di prima, con la nota «Scrivi un numero maggiore di zero.» in 12,5 `--errore`. Un campo
  svuotato in una riga risolta torna al valore di prima: una riga si toglie con la X, non
  svuotandola;
- **stato dubbio**: bordo 1,5 px `--ink` (§5, «avviso sulla riga di revisione»), avviso in linea in
  12,5 `--avviso` con `aria-live="polite"`, e, se l'unità non è fissa, sotto la riga le pillole
  G / ML / PZ dell'editor dell'ingrediente. Il gruppo è risolto quando ha un numero valido e
  un'unità, in qualunque ordine si diano;
- **props**: `nome`, `nota`, `provenienza?`, `quantita`, `unita`, `scegliUnita` (le pillole),
  `dubbio`, `avviso?`, `onValore(quantita, unita)`, `onTogli?` (assente = niente X), `etichetta`
  per i nomi accessibili («Quantità di {alimento}», «Togli {alimento}», «Unità di {alimento}»).

**Selettore a foglio** (`SelettoreFoglio.tsx`): una Riga di impostazione a valore + chevron che
apre un `FoglioDalBasso` `contenuto`, con un titolo (15.5/700) e una nota facoltativa. Le voci sono
alte 50, raggio 14. La **voce scelta** è piena `--ink` con testo bianco e la spunta bianca in un
tondo da 24 a destra, secondo la regola «pieno = scelto» della Riga piatto; le altre hanno il fondo
`rgba(20,22,58,0.04)` di §8. Le voci sono allineate a sinistra, non centrate come le azioni di un
foglio: sono valori da leggere in colonna, con la spunta a destra e, per l'area, il pallino del
colore a sinistra. Il tocco su una voce sceglie e chiude. Il velo e l'indietro di Android
chiudono senza scegliere (l'hook di chi lo monta). Prop `livello` 1 o 2: 2 sopra il foglio di una
Scheda. La voce scelta ha `aria-checked`, il foglio
`role="dialog"`, le voci `role="radio"` in un `radiogroup`. Sostituisce ogni `<select>` di
Importa: slot del pasto, area, «È lo stesso di…».

## H. I documenti

- `design/sistema/DESIGN.md`:
  - §8 prende la Riga dell'alimento, il Selettore a foglio e la voce scelta del Foglio dal basso;
  - §13 prende le «Decisioni del 27/09/2026 (fase 8b: Controlla e Ingredienti)», con le undici
    decisioni di questa spec;
  - §2.5: nessuna alfa nuova. Se ne serve una, va dichiarata lì.
- `docs/superpowers/specs/DESIGN-SYSTEM.md`: il ponte prende i due componenti e le due schermate;
  §9 perde «Revisione e Formati».
- Un registro `docs/2026-09-27-fase8b-decisioni-esecuzione.md`, con i ruling dell'esecuzione, i
  limiti noti e le prove dal telefono da fare.

## I. I test

- **`proponi`**:
  - parole intere: melanzane, latte parzialmente scremato;
  - il nome dalla dieta: pane integrale, pane di segale, pasta integrale;
  - la chiave esatta: pasta, olio extravergine;
  - il ripiego: pz = 1, g = 500, null = 500 g;
  - `origineProposta` in tutti questi casi.
- **`dubbi.ts`**:
  - i pasti `daSistemare` e abbinati, compresa la mappatura verso uno slot che non esiste;
  - i gruppi, con la stessa riga su 14 pasti di 2 settimane;
  - i tre stati di un gruppo e l'unità fissa;
  - la risposta su tutte le righe, e la cascata della rimozione fino al pasto vuoto;
  - la ricerca per chiave dopo una rimozione che sposta gli indici;
  - `confermaTutti` e `pronto`.
- **Il test differenziale**: la stessa bozza risolta con la Revisione di oggi (correzioni scritte a
  mano come le scriveva `cambiaRigaFissa`) e con `rispondiGruppo` deve dare le stesse
  `ScrittureImport` da `traduciBozza`. Stessa cosa per una rimozione.
- **Nomi doppi e legate**: la regola del nome doppio (fra proposte e con un esistente di unità
  diversa) e la proposta legata.
- **DOM**:
  - Controlla: i dubbi in cima, il Dock spento e poi acceso, CONFERMA I PASTI con un `onStato`
    solo;
  - il foglio del giorno: una modifica risale alla chiusura, l'indietro chiude;
  - Ingredienti: le tre sezioni, la scheda nel foglio, «È lo stesso di…» avanti e indietro, il
    Dock spento coi nomi doppi;
  - i due componenti nuovi;
  - la pillola del passo in page.
- **Le bozze vecchie**: una bozza al passo `revisione` con conferme parziali e correzioni della
  Revisione di oggi si apre e si conferma; una bozza al passo `formati` col prezzo lo conserva.

## J. I limiti noti e i rischi

- **Chi conferma senza aprire i giorni non vede le righe lette con sicurezza**: un 120 g letto
  come 12 g passa. È il prezzo della direzione B, scelto. [ipotesi, non testata: nella direzione A
  lo avrebbe visto solo chi leggeva davvero ogni riga]
- **Il conflitto di unità letto dall'AI resta.** Se l'estrazione scrive lo stesso alimento in g in
  una riga e in pz in un'altra, il riepilogo va in `BozzaIncompletaError` e rimanda a Controlla,
  dove non c'è un dubbio che lo spieghi. Le decisioni 7 e 8 impediscono che lo crei l'utente, non
  che lo porti l'estrazione. [derivato dal codice: `risolviRiga` e `ingredientiDaAbbinare`; non
  osservato su una dieta vera]
- **«Da sistemare» dei pasti dipende dagli slot di oggi**: se l'utente aggiunge uno slot fra una
  sessione e l'altra, un nome può passare da «Da sistemare» a «Dove vanno i pasti». La mappatura
  scelta resta.
- **Il foglio del giorno perde le modifiche se l'app si chiude col foglio aperto**, perché
  risalgono alla chiusura. È la regola di oggi per il cambio di giorno.
- **Due gruppi irrisolti dello stesso alimento, senza nessun'altra riga con l'unità, mostrano
  entrambi le pillole** (nessuno dei due può fissare l'unità per l'altro, decisione 8). Se
  l'utente sceglie due unità diverse, il riepilogo va in `BozzaIncompletaError`. [derivato dal
  codice: `unitaNota`/`gruppiRighe` e `risolviRiga`/`ingredientiDaAbbinare`; non osservato su una
  dieta vera]
