# I delta delle sessioni di design

Un file per sessione di Claude Design, nome `DELTA-<aaaa-mm-gg>-<argomento>.md`. Dentro, il
blocco che la sessione ha scritto in chiusura — niente di più.

**A cosa serve.** È il punto di partenza di chi scrive codice. Prima che esistesse, le
differenze si ricavavano leggendo i mockup uno per uno: il 19/09 quel lavoro è costato
`design/ridisegno/ANALISI.md`, 75 KB di ricostruzione senza un solo numero nuovo.

**Il formato** (la regola sta in `design/sistema/CLAUDE.md`, sezione «Come si chiude una
sessione: il delta»):

```
DELTA — <data> — <schermata o componente>
Deciso: <la scelta, una riga>
Valori: <token o misura> <prima> -> <dopo>   una riga per valore, «nessuno» se non cambia niente
Regole di DESIGN.md toccate: <paragrafo e titolo>   «nessuna» se il disegno sta dentro le regole
Scartate: <le varianti viste e buttate, col motivo in mezza riga>
Aperto: <cosa resta da decidere>   «niente» se la schermata è chiusa
```

**Cosa non finisce qui.** I mockup. Sono il verbale di una decisione: si archiviano in
`design/ridisegno/` e non si riallineano mai. Se un delta cita un valore che non si trova in
`tokens.css`, il valore va prima in `DESIGN.md` e poi in `tokens.css`: `npm run design:token`
verifica che `tokens.css` e `src/app/globals.css` non dicano due cose diverse.
