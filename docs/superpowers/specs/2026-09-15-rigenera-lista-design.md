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
difesa in profondità C4). Offline il tasto è disabilitato: serve il server.

**Cosa succede al tap confermato.**
1. La coda offline delle spunte si svuota (`svuotaCoda`): le spunte in attesa
   riguardano righe che stanno per sparire.
2. `rigeneraListe(weekId)` (dato, §2).
3. L'istantanea offline si cancella (`cancellaIstantaneaLista`), la versione dei tocchi
   avanza e la pagina rifà il caricamento intero (`carica()`), come al ritorno della rete.
4. Errore → riga `Non siamo riusciti a rifare la lista. Riprova.` e la lista a schermo
   resta quella di prima (nessun rollback da fare: il dato o riesce o lascia le righe
   vecchie, vedi §2).

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
  `spuntato = false` sulla lista dello stesso `tipo`.
- Ordine: prima la lettura delle manuali, poi la generazione, poi il reinserimento. Se
  la generazione fallisce a metà, `generaListe` ha già le sue garanzie per lista (upsert
  della lista, delete + insert delle righe): le righe manuali della lista non ancora
  toccata restano; quelle della lista toccata si perdono. Dichiarato.

## 3. Test

- Dato: bozza → lancia; chiusa → lancia; confermata → `generaListe` chiamata una volta,
  le righe manuali lette prima e reinserite dopo con `spuntato = false` e lo stesso
  `shopping_list_id`; senza righe manuali nessun insert.
- Pagina: il tasto c'è solo a settimana confermata (non in bozza, non a chiusa, non
  offline); primo tap → "SICURO?", secondo → `svuotaCoda`, `rigeneraListe(weekId)`,
  `cancellaIstantaneaLista`, ricaricamento (`leggiListe` chiamata di nuovo); errore →
  riga di errore e lista invariata.

## 4. Limiti dichiarati

Le spunte si perdono (è nel testo del tasto). Le risposte ai controlli "ne hai
ancora?" si perdono (sono righe `controllo`, ricalcolate). Il non ricomprato della
settimana viene ricalcolato (`generaListe` lo riscrive): è il comportamento della spec
non-ricomprato §3. Nessuna cronologia delle liste precedenti.
