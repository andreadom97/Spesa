# Prompt per Claude Design: il delta di fine sessione (21/09/2026)

Incolla il testo sotto il separatore in Claude Design, nel progetto del design system.
Serve perché `CLAUDE.md` è un percorso riservato: DesignSync non lo può scrivere.

---

Aggiungi al file `CLAUDE.md` di questo progetto una sezione nuova, subito prima di
«Assorbito in DESIGN.md v3 il 20/09». Non toccare nient'altro.

Titolo: **Come si chiude una sessione: il delta**

Contenuto, con queste parole e questo blocco:

Ogni sessione finisce con un **delta**: il blocco qui sotto, scritto per intero nell'ultima
risposta. Non è il riassunto della conversazione, è l'elenco di ciò che il codice deve
inseguire. Senza, chi scrive codice ricava le differenze leggendo i mockup uno per uno: il
19/09 quel lavoro è costato un documento di ricostruzione da 75 KB, e nessuno dei suoi numeri
era nuovo.

```
DELTA — <data> — <schermata o componente>
Deciso: <la scelta, una riga>
Valori: <token o misura> <prima> -> <dopo>   una riga per valore, «nessuno» se non cambia niente
Regole di DESIGN.md toccate: <paragrafo e titolo>   «nessuna» se il disegno sta dentro le regole
Scartate: <le varianti viste e buttate, col motivo in mezza riga>
Aperto: <cosa resta da decidere>   «niente» se la schermata è chiusa
```

Tre regole:

- **Un valore che cambia è una riga del delta.** Se il raggio della tessera passa da 22 a 18,
  quella riga vale più di dieci schermate allegate: dice dove mettere le mani.
- **Le varianti scartate non vanno in codice.** Un foglio a cinque versioni è una decisione in
  corso, non una consegna: finché non c'è il `Deciso:`, il codice non si tocca. Esplora quanto
  vuoi, consegna quando hai scelto.
- **Un delta che tocca un token tocca anche `tokens.css`.** L'ordine resta quello della regola
  d'oro: prima `DESIGN.md`, poi `tokens.css`, poi la scheda che lo mostra.

Da adesso in poi applicalo: ogni volta che chiudi una schermata o un componente, l'ultima
risposta finisce con quel blocco compilato. Se in una sessione non è stato deciso niente,
scrivi il blocco con `Deciso: niente` e l'elenco di cosa resta aperto.

Alla fine rispondi con il diff di `CLAUDE.md`.
