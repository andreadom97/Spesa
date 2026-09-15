# Rifare la lista a mano — design

**Data:** 15/09/2026 · **Stato:** approvata da Andrea il 15/09 (dalle prove in produzione) · **Piano:** `docs/superpowers/plans/2026-09-15-rigenera-e-esci.md`

## 0. Perché

La lista nasce una volta sola, a `CONFERMA E CREA LA LISTA` (settimana `bozza` →
`confermata`), e le quantità restano congelate sulle righe. È voluto: la spesa fatta a
metà non deve cambiare sotto i piedi. Ma chi cambia "Per quante persone cucini" a
settimana già confermata, o aggiunge piatti, o corregge un formato, non vede nessun
effetto fino al lunedì dopo, e cerca un tasto che non c'è (prova del 15/09). Decisione
di Andrea: un tasto per rifare subito la lista della settimana corrente, con l'avviso
che le spunte si perdono; nessuna riga di aiuto al posto del tasto.

## 1. Comportamento

**Dove.** Pagina Lista, in fondo, sotto il selettore base/top-up e sotto `HAI PRESO
TUTTO` quando c'è: un tasto secondario (bianco con bordo, mono) `RIFAI LA LISTA`, a due
tocchi (`BottoneDueTocchi`, il secondo tap è "SICURO?"). Sotto il tasto una riga di
aiuto sempre visibile: `Ricalcola da piatti, dispensa e porzioni di adesso. Le spunte
fatte si perdono.`

**Quando.** Solo con la settimana `confermata`. In `bozza` la lista non esiste (la
pagina mostra già lo stato vuoto con VAI ALLA SETTIMANA); a `chiusa` il residuo è già
accreditato e rifare la lista sarebbe una bugia (`generaListe` esce comunque a vuoto:
difesa in profondità C4). Offline il tasto non si mostra: la pagina sta mostrando
l'istantanea, che non porta lo stato della settimana, e comunque serve il server.

**Cosa succede al tap confermato.**
1. La versione dei tocchi avanza e `rigeneraListe(weekId)` (dato, §2). Durante la
   rigenerazione le tessere e i controlli non scrivono (una spunta o un SÌ/NO fra il
   delete e l'insert farebbe fallire la rigenerazione), e una rilettura partita prima
   e arrivata durante si scarta.
2. La coda offline delle spunte si svuota (`svuotaCoda`): le spunte in attesa
   riguardavano righe che non ci sono più. Dopo la rigenerazione, non prima: se la
   rigenerazione fallisce la lista non è cambiata e le spunte in attesa non si perdono
   (punto 4). Una spunta in coda su una riga cancellata aggiornerebbe 0 righe senza
   errore: svuotare è solo pulizia.
3. L'istantanea offline si cancella (`cancellaIstantaneaLista`), la versione dei tocchi
   avanza di nuovo e la pagina rifà il caricamento intero (`carica()`), come al ritorno
   della rete.
4. Errore → riga `Non siamo riusciti a rifare la lista. Riprova.` sotto il tasto (dove
   chi l'ha toccato guarda, non in cima all'area scrollabile), e la lista a schermo
   resta quella di prima (nessun rollback da fare: il dato o riesce o lascia le righe
   vecchie, vedi §2). Se l'errore è `spesa già chiusa` o `lista non ancora creata` lo
   stato della settimana è cambiato sotto i piedi (un altro membro): si rifà `carica()`,
   che riallinea lo stato e fa sparire il tasto, e la riga dice `La spesa è già
   chiusa.` (o quella generica, con lo stato vuoto di sempre per la bozza).

**Righe aggiunte a mano.** Le righe con `origine = 'manuale'` sopravvivono: si rileggono
prima e si reinseriscono dopo, nella stessa lista (`tipo`), con `spuntato = false`. Sono
un'intenzione dell'utente, non un calcolo, e perderle sarebbe un danno che non
c'entra con le porzioni.

**Casa condivisa.** L'altro membro con la Lista aperta vede quella nuova al ritorno in
primo piano (rilettura già esistente). Una sua spunta in volo su una riga sparita
aggiorna 0 righe in silenzio: limite dichiarato, come per il membro tolto.

**Impostazioni.** Sotto "Per quante persone cucini", dopo un cambio riuscito, una riga:
`La lista di questa settimana non cambia da sola: da Lista, RIFAI LA LISTA.` (spec
`2026-09-15-esci-design.md` §3, perché tocca la stessa pagina).

## 2. Dato

```ts
// src/data/lista.ts
export async function rigeneraListe(weekId: string): Promise<void>;
```

- Legge `week.stato` (filtro `user_id = idCasa()`); lancia `settimana non trovata`,
  `lista non ancora creata` (bozza) o `spesa già chiusa` (chiusa). Qui si lancia, non
  si esce a vuoto: la pagina deve dirlo.
- Legge le righe `manuale` delle liste della settimana (`shopping_list_item` join
  `shopping_list.tipo`), poi chiama `generaListe(weekId)` (che già cancella e riscrive le
  righe di ogni lista e il `risparmio_settimana`), poi reinserisce le righe manuali con
  `spuntato = false` e `spuntato_il = null` sulla lista dello stesso `tipo` (riletta dopo
  la generazione, senza assumerne l'id), con un upsert che ignora i duplicati su
  `(shopping_list_id, ingredient_id)`: se il piano nuovo chiede lo stesso ingrediente, la
  riga di piano resta e quella manuale è ridondante; un insert secco farebbe fallire
  tutta la rigenerazione a righe già riscritte. Oggi nessuna funzione scrive righe
  `manuale`: la logica è pronta per quando ci saranno.
- Ordine: prima la lettura delle manuali, poi la generazione, poi il reinserimento. Se
  la generazione fallisce a metà, `generaListe` ha già le sue garanzie per lista (upsert
  della lista, delete + insert delle righe): le righe manuali della lista non ancora
  toccata restano; quelle della lista toccata si perdono. Dichiarato.

## 3. Test

- Dato: bozza → lancia; chiusa → lancia; confermata → `generaListe` chiamata una volta,
  le righe manuali lette prima e reinserite dopo con `spuntato = false` e lo stesso
  `shopping_list_id`; senza righe manuali nessun insert.
- Pagina: il tasto c'è solo a settimana confermata (non in bozza, non a chiusa, non
  offline); primo tap → "SICURO?", secondo → `rigeneraListe(weekId)` con la coda ancora
  piena, poi `svuotaCoda`, `cancellaIstantaneaLista`, ricaricamento (`leggiListe`
  chiamata di nuovo); errore → riga di errore sotto il tasto, lista e coda invariate;
  `spesa già chiusa` → ricaricamento, tasto sparito, riga dedicata; una rilettura che
  arriva durante la rigenerazione non tocca lo schermo; durante la rigenerazione spunte
  e risposte ai controlli si ignorano.

## 4. Limiti dichiarati

Le spunte si perdono (è nel testo del tasto). Le risposte ai controlli "ne hai
ancora?" si perdono (sono righe `controllo`, ricalcolate). Il non ricomprato della
settimana viene ricalcolato (`generaListe` lo riscrive): è il comportamento della spec
non-ricomprato §3. Nessuna cronologia delle liste precedenti.
