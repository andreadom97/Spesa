# Scan del codice a barre → formato confezione reale — design (P8)

**Data:** 07/09/2026 · **Stato:** approvata e implementata il 07/09 (piano omonimo); da provare con un pacco di pasta dopo la migrazione 0013
**Deriva da:** [spesa-backlog-nicchia.md](../../../spesa-backlog-nicchia.md) (P8), la spec di
prodotto (il residuo è derivato da porzione vs formato confezione)

**Obiettivo:** da residuo stimato a residuo vero. Il formato confezione di un ingrediente
è deciso a mano (o dal seed) e vale per sempre: se compri una confezione diversa, il
residuo derivato sbaglia di quella differenza per sempre. Alla chiusura della spesa,
scansionando il prodotto comprato, la quantità reale della confezione sostituisce quella
assunta, per questa settimana e per le prossime.

## 0. Cosa c'è già e cosa manca

- `ingredient.formato_confezione` è il formato assunto; `shopping_list_item.confezioni`
  = `ceil(daComprare / formato)` e `quantita_totale = confezioni × formato`, congelati
  alla generazione; `chiudiSpesa` accredita `quantita_totale` al residuo. Per rendere vero
  il residuo vanno corretti il formato sull'ingrediente **e** la riga della settimana — ma
  non basta cambiare il formato tenendo le confezioni: le confezioni sono derivate dal
  formato vecchio, e `2 × 1000` quando in corsia si è preso un solo pacco da 1 kg (la lista
  ne chiedeva 2 da 500 per 800 g) gonfierebbe il residuo di un chilo e la settimana dopo
  la pasta non verrebbe chiesta. La regola (review del 07/09, A1): si scrivono il
  **formato vero e le confezioni comprate davvero** di quel formato, e
  `quantita_totale = confezioni comprate × formato vero`.
- Non c'è nessuna lettura di codici a barre. La Camera dell'import usa `getUserMedia`
  con un fallback a file.
- Open Food Facts (OFF) ha ~263.000 prodotti italiani [fonte: it.openfoodfacts.org,
  09/2026]; espone per prodotto `product_name`, `brands`, `quantity` (testo libero,
  "500 g", "1 L", "6 x 125 g"), `product_quantity` e `product_quantity_unit` (numerici,
  quando compilati). L'API v2 non richiede chiave e chiede uno `User-Agent` esplicito.

## 1. Il flusso

Da "Hai preso tutto", prima di CHIUDI LA SPESA, un link `CONFEZIONI DIVERSE? SCANSIONA`
porta a `/lista/confezioni`: l'elenco delle voci comprate della settimana (spuntate,
origine `piano` o `manuale` — anche a 0 confezioni: una riga di piano non nasce mai a
0, e se ci sta è perché una scansione l'ha scritta così e deve restare correggibile),
ciascuna con nome, `N × formato unità` e il bottone `SCANSIONA`. Il bottone apre lo
scanner (§3); il codice letto (o digitato) va alla route `/api/prodotto/{ean}` (§2) che
risponde con nome, marca e quantità della confezione. La schermata mostra `Barilla · Spaghetti n. 5 · 500 g` e, se la quantità
è diversa dal formato assunto nella stessa unità: `La confezione è 500 g, nel formato
avevi 1000 g. Aggiorno per questa settimana e per le prossime?` seguito da `Con
confezioni da 500 g ne bastano 2 (la lista ne chiedeva 1). Quante ne hai comprate?` con
un campo intero (`Confezioni comprate`, `inputMode="numeric"`, da 0 a 1000, proposto =
le confezioni che `confezioniNecessarie` darebbe col formato nuovo su fabbisogno e
residuo congelati della riga) e `AGGIORNA` / `LASCIA`. `AGGIORNA` scrive (§4) e la riga
diventa `M × 500 g · AGGIORNATO` con `M` le confezioni comprate. Se la quantità è uguale:
nessuna domanda (le confezioni restano quelle della lista), il codice viene memorizzato e
solo a scrittura riuscita compare `Formato confermato: 500 g.`; se la scrittura fallisce,
messaggio e `RIPROVA`. Se OFF non conosce il prodotto: `Prodotto non trovato: puoi
scrivere il formato a mano.` con un campo **intero** (`Formato a mano`,
`inputMode="numeric"`, solo cifre, da 1 a 100.000 nell'unità dell'ingrediente: sotto il
grammo/millilitro non esiste una confezione, e un pezzo non si spezza; niente decimali né
separatori — "1.000" all'italiana è mille, e letto come numero sarebbe un grammo), la
stessa domanda sulle confezioni appena il formato è valido (cambiare il formato azzera le
confezioni digitate: la proposta torna a seguirlo), e lo stesso `AGGIORNA`. Se l'unità
non è compatibile (OFF dice `1 L`, l'ingrediente è in `g`): `Unità diversa (l contro g):
non aggiorno. Correggi il formato a mano se serve.` Le quantità si mostrano esatte
nell'unità base (`1250 g`, non `1,3 kg`): qui si confrontano formati.

La pagina è raggiungibile solo a lista tutta spuntata (come "Hai preso tutto"); a
settimana `chiusa` non ha più senso (le quantità sono già accreditate) e rimanda a
`/settimana` prima ancora di leggere le liste — come fa anche "Hai preso tutto". Una
risposta 401 o un redirect dalla route (sessione scaduta) manda a `/entra`, non al campo
a mano. Se si preme `SCANSIONA` su una seconda voce mentre la ricerca della prima è in
corso, la risposta in ritardo della prima non tocca lo scanner della seconda; lo stesso
se è in corso la scrittura della prima (`AGGIORNA` premuto): quando torna, aggiorna la
riga della prima ma non chiude la scheda della seconda, e la seconda può scrivere a sua
volta (la scrittura in volo è per voce, non un blocco unico della pagina).

## 2. La route `GET /api/prodotto/[ean]`

- `ean` valido = 8–14 cifre (`eanValido` nel dominio); altrimenti 400.
- Sessione obbligatoria: il proxy manda a `/entra` chi non ce l'ha; la route in più
  verifica `auth.getUser()` col client dei cookie e risponde 401 senza sessione (come
  `/api/import/estrai` con il Bearer: qui il cookie basta perché è una GET dalla stessa
  origine).
- Chiama `https://world.openfoodfacts.org/api/v2/product/{ean}.json?fields=product_name,brands,quantity,product_quantity,product_quantity_unit`
  con `User-Agent: Spesa/1.0 (https://github.com/andreadom97/Spesa)` e timeout 8 s.
- Risposte: 200 `{ trovato: true, nome, marca, quantita: { valore, unita } | null }`;
  200 `{ trovato: false }` se OFF risponde `status: 0` o 404; 502 `{ errore: 'servizio
  non raggiungibile' }` su rete/timeout/5xx. `nome`/`marca` tagliati a 80 caratteri.
- Nessun dato scritto: la route legge e basta. Nessun log del codice.
- Cache, sì, perché la risposta dipende solo dall'URL (cioè dal codice a barre) e nessun
  dato dell'utente ci entra: la fetch verso OFF passa dalla data cache di Next con
  `next: { revalidate: 86400 }` (un giorno). Nella data cache entrano **solo i 200 di
  OFF** (docs di `fetch`: "Only responses with a 200 HTTP status code are stored"): un
  codice sconosciuto è un 404 di OFF e non ci entra mai — ogni scansione di un codice
  ignoto va a OFF. I nostri 200 (trovato o no) portano `Cache-Control: private,
  max-age=86400` per il browser, ed è solo il browser a tenere un `trovato: false` per
  un giorno — `private` perché la risposta è dietro sessione. Gli errori (400, 401,
  502) non si tengono.
- I campi di OFF entrano in `analizzaQuantitaOFF` già tagliati (`quantity`,
  `product_quantity_unit` e `product_quantity` se stringa a 80 caratteri; un
  `product_quantity` numerico solo se finito): è testo di chiunque, e il dominio ha i
  suoi tetti (200 caratteri, numeri fino a 7 cifre) ma non deve essere l'unico argine.

## 3. Lo scanner

`src/components/Scanner.tsx`: se `'BarcodeDetector' in window` (Chrome Android, la
piattaforma della PWA), apre `getUserMedia({ video: { facingMode: 'environment' } })`
e ogni 250 ms chiama `detect` sul frame (`formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']`);
al primo codice valido chiama `onCodice(ean)` e si ferma. Sempre presente, sotto il
video o da solo se il rilevatore manca (iOS, desktop): campo `Scrivi il codice`
(`inputMode="numeric"`, 8–14 cifre) e bottone `CERCA`. Errore della camera (permesso
negato, nessuna camera) → solo il campo, con `La fotocamera non è disponibile: scrivi il
codice sotto il codice a barre.` Il componente non parla mai con la rete: restituisce
il codice e basta.

## 4. Il dominio e i dati

```ts
// src/domain/ean.ts — puro
export function eanValido(s: string): boolean;                       // 8–14 cifre, dopo trim
export interface QuantitaConfezione { valore: number; unita: UnitaBase }
/** Da product_quantity/product_quantity_unit se numerici, altrimenti dal testo `quantity`: "500 g", "500g", "1 L", "1,5 l", "0.75 kg", "6 x 125 g" (= 750 g), "4 x 500ml", "6 pz", "x6", "6 uova" → g/ml/pz; null se non si capisce. kg→g, l/cl/dl→ml. */
export function analizzaQuantitaOFF(p: { quantity?: unknown; product_quantity?: unknown; product_quantity_unit?: unknown }): QuantitaConfezione | null;
/** Il formato da proporre: la quantità OFF se l'unità coincide con unitaBase; null se non coincide. */
export function formatoProposto(q: QuantitaConfezione, unitaBase: UnitaBase): number | null;
```

Migrazione `0013_ean.sql`: `alter table ingredient add column ean text check (ean ~ '^[0-9]{8,14}$');`
e `create index on ingredient (user_id, ean) where ean is not null`. Nessuna policy
nuova (la tabella esiste già; le policy sono `(select casa_id())`).

`src/data/confezioni.ts`:
```ts
export interface VoceComprata { itemId: string; ingredientId: string; nome: string; unita: UnitaBase; classeResiduo: ClasseResiduo; fabbisogno: number; residuo: number; confezioni: number; formato: number; quantitaTotale: number; ean: string | null }
export async function leggiVociComprate(weekId: string): Promise<VoceComprata[]>;       // voci spuntate, origine piano|manuale (anche a 0 confezioni: i controlli restano fuori per l'origine), con fabbisogno/residuo congelati della riga e formato/ean dall'ingrediente; per nome, a parità base prima del top-up
export async function aggiornaFormatoDaScansione(i: { ingredientId: string; weekId: string; formato: number; ean: string | null; confezioni: number }): Promise<void>;
```
`aggiornaFormatoDaScansione` scrive il formato vero **e** le confezioni comprate di quel
formato, in quest'ordine:

1. Le righe `shopping_list_item` della settimana di quell'ingrediente, di origine `piano`
   o `manuale` (un controllo staple è una domanda, non un acquisto: non si tocca):
   `confezioni = confezioni comprate` e `quantita_totale = confezioni comprate × formato`
   sulla **prima** riga in ordine di lista base → top-up, `0` e `0` sulle altre. Le
   confezioni comprate sono un numero solo: spalmarle fra due righe inventerebbe una
   divisione che nessuno ha fatto (in pratica un ingrediente sta in una lista sola).
2. `update ingredient set formato_confezione = formato, ean = coalesce(ean, ean attuale)`
   per id e `user_id = idCasa()`.

Prima le righe e poi l'ingrediente: un fallimento a metà non deve lasciare le settimane
prossime corrette e questa no. L'update dell'ingrediente rilegge l'id toccato
(`.select('id')`): zero righe (ingrediente di un'altra casa o cancellato: le policy
non danno errore) → `ingrediente non trovato`, così la pagina non segna `AGGIORNATO`
una scrittura che non c'è stata. `confezioni = 0` è ammesso ("in corsia non l'ho
preso"): la riga resta spuntata con 0 confezioni e `quantita_totale` 0, e alla chiusura
non accredita niente; la voce resta in `/lista/confezioni` e si può correggere. Tetti,
controllati prima di toccare il database: `formato` finito in `[0.001, 100000]`
(`formato non valido`), `confezioni` intero in `[0, 1000]` (`confezioni non valide`),
`ean` (se non null) di 8–14 cifre come il check SQL (`codice non valido`), scritto senza
spazi ai bordi — validato qui perché il check SQL fermerebbe solo l'ultimo update, a
righe già riscritte. Solo se la settimana non è `chiusa` (guard come `generaListe`, ma
qui si lancia `spesa già chiusa`). Un ingrediente di classe `intero`
ha formato 1 per contratto: la pagina non offre lo scan per le voci `intero` (le uova si
contano, non si pesano) né per le `stima`.

## 5. Cosa cambia nei file

| File | Cambia |
|---|---|
| `src/domain/ean.ts` | Nuovo: `eanValido`, `analizzaQuantitaOFF`, `formatoProposto` |
| `src/app/api/prodotto/[ean]/route.ts` | Nuovo: la route verso OFF |
| `supabase/migrations/0013_ean.sql` | Colonna `ean` |
| `src/data/confezioni.ts`, `src/data/mappers.ts`, `src/domain/types.ts` | `Ingredient.ean`, letture e scrittura |
| `src/components/Scanner.tsx` | Nuovo |
| `src/app/(app)/lista/confezioni/page.tsx` | Nuova schermata |
| `src/app/(app)/lista/fatta/page.tsx` | Il link |
| `README.md`, `spesa-backlog-nicchia.md` | P8 consegnato, migrazione 0013 nel deploy |

## 6. Test che contano

- `analizzaQuantitaOFF` su una tabella di stringhe vere di OFF (le forme di §4 più
  spazi, maiuscole, virgole, `1kg`, `330 ml`, `33 cl`, `12 x 33 cl`, testo senza numero,
  `product_quantity: "500"` come stringa); `formatoProposto` con unità uguale/diversa.
- Route: ean non valido → 400; senza sessione → 401; OFF `status: 1` → `trovato: true`
  con la quantità analizzata; `status: 0` → `trovato: false`; timeout/5xx → 502; nessun
  log del codice (`console.error` senza ean).
- `confezioni.ts`: lettura filtra spuntate/origine (una riga di piano a 0 confezioni
  resta, un controllo a 0 no); scrittura aggiorna ingrediente e righe della settimana,
  non a settimana chiusa; `ean` non conforme e update dell'ingrediente a zero righe
  lanciano.
- `analizzaQuantitaOFF` e la route su un testo di 50.000 cifre: risposta sotto i 100 ms
  (la regex era quadratica sulle cifre).
- Scanner: senza `BarcodeDetector` → solo il campo; codice digitato non valido → `CERCA`
  disabilitato; valido → `onCodice`. Il ramo camera non si testa in jsdom (dichiarato).
- Pagina: elenco delle sole voci ammissibili, `SCANSIONA` → route mockata → proposta →
  `AGGIORNA` → `aggiornaFormatoDaScansione` con i valori giusti e riga `AGGIORNATO`;
  non trovato → campo manuale; unità diversa → messaggio e niente scrittura.

## 7. Limiti dichiarati (non bug)

- Solo prodotti con codice a barre e presenti in OFF: fresco, banco e sfuso restano al
  formato assunto (`intero` e `stima` non si scansionano).
- Il formato aggiornato vale per l'ingrediente, non per marca: se compri due marche con
  formati diversi vince l'ultima scansionata. L'`ean` memorizzato è l'ultimo.
- La camera funziona dove esiste `BarcodeDetector` (Chrome Android); altrove si scrive
  il codice. Nessuna libreria di decodifica in v1.
- La quantità OFF è quella dichiarata dal contributore: può essere sbagliata. Si mostra
  prima di scrivere e si conferma con un tocco.
- La correzione si fa prima di chiudere la spesa: dopo, il residuo è già accreditato
  e la strada è la Dispensa.
- Il "non ricomprato questa settimana" (`risparmio_settimana`) resta fissato alla
  generazione della lista, col formato vecchio: la scansione corregge quello che entra in
  casa, non il conteggio di quello che la lista non ha chiesto. È una fotografia del
  momento in cui la lista è stata scritta, e ricalcolarla col formato nuovo cambierebbe
  un numero già mostrato.
- Con `confezioni = 0` la riga resta spuntata: alla chiusura si registra un acquisto a 0
  confezioni e 0 quantità (`ultimo_acquisto` = oggi). È un'anomalia innocua per il
  residuo; se dà fastidio nello storico, la strada è togliere la spunta in `/lista`. La
  voce resta in `/lista/confezioni` anche al ricarico (nessun filtro `confezioni > 0`):
  uno "0" sbagliato si corregge con un'altra scansione.
- I tetti (formato fino a 100 kg / 100 l / 100.000 pezzi, 1000 confezioni) sono contro i
  refusi e i valori che farebbero saltare l'aritmetica delle liste, non un limite
  d'uso: nessuna spesa domestica li sfiora.
