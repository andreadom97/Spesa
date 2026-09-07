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

- `ingredient.formato_confezione` è il formato assunto; `shopping_list_item.quantita_totale`
  = `confezioni × formato` congelato alla generazione; `chiudiSpesa` accredita
  `quantita_totale` al residuo. Basta correggere il formato sull'ingrediente e la
  `quantita_totale` della settimana per rendere vero il residuo.
- Non c'è nessuna lettura di codici a barre. La Camera dell'import usa `getUserMedia`
  con un fallback a file.
- Open Food Facts (OFF) ha ~263.000 prodotti italiani [fonte: it.openfoodfacts.org,
  09/2026]; espone per prodotto `product_name`, `brands`, `quantity` (testo libero,
  "500 g", "1 L", "6 x 125 g"), `product_quantity` e `product_quantity_unit` (numerici,
  quando compilati). L'API v2 non richiede chiave e chiede uno `User-Agent` esplicito.

## 1. Il flusso

Da "Hai preso tutto", prima di CHIUDI LA SPESA, un link `CONFEZIONI DIVERSE? SCANSIONA`
porta a `/lista/confezioni`: l'elenco delle voci comprate della settimana (spuntate,
origine `piano` o `manuale`, `confezioni > 0`), ciascuna con nome, `N × formato unità`
e il bottone `SCANSIONA`. Il bottone apre lo scanner (§3); il codice letto (o digitato)
va alla route `/api/prodotto/{ean}` (§2) che risponde con nome, marca e quantità della
confezione. La schermata mostra `Barilla · Spaghetti n. 5 · 500 g` e, se la quantità
è diversa dal formato assunto nella stessa unità: `La confezione è 500 g, nel formato
avevi 1000 g. Aggiorno per questa settimana e per le prossime?` con `AGGIORNA` /
`LASCIA`. `AGGIORNA` scrive (§4) e la riga diventa `N × 500 g · AGGIORNATO`. Se la
quantità è uguale: `Formato confermato: 500 g.` e il codice viene comunque memorizzato.
Se OFF non conosce il prodotto: `Prodotto non trovato: puoi scrivere il formato a mano.`
con un campo numerico e lo stesso `AGGIORNA`. Se l'unità non è compatibile (OFF dice
`1 L`, l'ingrediente è in `g`): `Unità diversa (l contro g): non aggiorno. Correggi il
formato a mano se serve.`

La pagina è raggiungibile solo a lista tutta spuntata (come "Hai preso tutto"); dopo
la chiusura non ha più senso (le quantità sono già accreditate) e rimanda a `/settimana`.

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
- Nessuna cache server, nessun dato scritto: la route legge e basta. Nessun log del
  codice.

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
export interface VoceComprata { itemId: string; ingredientId: string; nome: string; unita: UnitaBase; confezioni: number; formato: number; quantitaTotale: number; ean: string | null }
export async function leggiVociComprate(weekId: string): Promise<VoceComprata[]>;       // voci spuntate, origine piano|manuale, confezioni > 0, con formato/ean dall'ingrediente
export async function aggiornaFormatoDaScansione(i: { ingredientId: string; weekId: string; formato: number; ean: string | null }): Promise<void>;
```
`aggiornaFormatoDaScansione`: `update ingredient set formato_confezione = formato, ean =
coalesce(ean, ean attuale)` per id e `user_id = idCasa()`; poi per ogni
`shopping_list_item` della settimana di quell'ingrediente con `confezioni > 0`:
`quantita_totale = confezioni × formato`. Solo se la settimana non è `chiusa` (guard
come `generaListe`). Un ingrediente di classe `intero` ha formato 1 per contratto: la
pagina non offre lo scan per le voci `intero` (le uova si contano, non si pesano) né per
le `stima`.

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
- `confezioni.ts`: lettura filtra spuntate/origine/confezioni; scrittura aggiorna
  ingrediente e righe della settimana, non a settimana chiusa.
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
