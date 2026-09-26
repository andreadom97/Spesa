# Fase 7 del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 26–27/09/2026 · **Ramo:** `fase7-scegli-piatto` · **Piano:** `docs/superpowers/plans/2026-09-26-scegli-piatto.md` ·
**Spec:** `docs/superpowers/specs/2026-09-26-scegli-piatto-design.md`

L'esecuzione subagent-driven tiene il suo registro in `.superpowers/`, una cartella che git ignora e che
alla fine viene cancellata. Questo file la sostituisce. Raccoglie:
- le decisioni prese al posto di Andrea, ognuna con quanto costa se è sbagliata;
- le misure fatte nel browser;
- le prove da fare dal telefono.

Etichette: `[misurato]` per ciò che è stato misurato, `[ipotesi]` per ciò che non lo è.

**In breve.**
- Scegli e l'editor del Piatto adesso sono nel sistema.
- Nessuna scrittura cambia: `aggiornaSlot`, `salvaPiatto`, `eliminaPiatto` e la bozza hanno gli
  stessi argomenti. Lo hanno verificato due review di correttezza con un **test differenziale**, cioè
  il codice di prima e quello nuovo montati fianco a fianco sugli stessi scenari [misurato]:
  - Scegli: 17 scenari su 17 con le stesse chiamate;
  - l'editor del Piatto: 4 percorsi di salvataggio con lo stesso payload.
- Nessuna migrazione.

## Come è stato scritto il piano

Il piano è lungo (circa 4300 righe). L'ho scritto così:
- l'ossatura con le interfacce vincolanti l'ho scritta io;
- tre agenti hanno scritto i task in parallelo (1–2, 3, 4–6);
- un agente li ha assemblati e riconciliati;
- un altro ha fatto la scansione preliminare dei conflitti.

La scansione ha trovato **0 problemi bloccanti, 6 da correggere e 9 minori**. I 6 sono stati corretti
prima dell'esecuzione. Dei minori, 5 sono stati corretti e 4 sono rimasti come limiti noti.

## Le decisioni, con il loro costo

| # | Decisione | Perché | Costo se è sbagliata |
|---|---|---|---|
| 1 | `IN CASA` in mono 10 `--ink`, non `--ok` come diceva la spec | `--ok` non esiste nel sistema: non c'è un token verde | se Andrea vuole un verde, prima serve un token in `DESIGN.md`, poi una riga |
| 2 | `RigaImpostazione` prende la prop `etichetta` (aria-label), e il valore ha `maxWidth: 50%` con ellissi | il nome accessibile dei componenti di Scegli («Cambia Farcitura: ora Ricotta») è diverso dal testo; un'opzione con tre ingredienti schiacciava il nome a 360 | vale anche per il Pannello: «NESSUNO FUORI CASA» non si taglia [misurato, 133 px]; un valore lungo del Pannello si taglierebbe con l'ellissi |
| 3 | Scegli usa l'`areeDelPiatto` di Piatti, che conta anche gli ingredienti delle opzioni | una regola sola per i pallini d'area | sui piatti con componenti cambiano i pallini e la sottoriga (`N INGR.` → `N INGREDIENTI`). Le scritture no |
| 4 | Pezzi condivisi in `src/components/`: `RigaPiatto`, `CampoRicercaPiatti`, `AggiungiTratteggiato`, `VuotoRicercaPiatti`, `TestataModifica`, `ErroreSopraDock` | erano copiati in due o tre file | nessuno: Piatti e l'editor dell'ingrediente non cambiano aspetto, e i loro test sono rimasti invariati |
| 5 | L'editor dell'ingrediente tiene la sua copia dell'errore sopra il Dock | toccarlo era fuori perimetro | una terza copia, da togliere in un passaggio a parte |
| 6 | Le alfe `0,14` (il filetto sotto il nome della testata di modifica) e `rgba(255,255,255,0.62)` (la sottoriga della riga scelta) si dichiarano in `DESIGN.md` §2.5 | §2.5 ammette le alfe «solo dove è scritto» | due valori da togliere dalla tabella |
| 7 | `TESTO_SENZA_INGREDIENTI` è una Nota in `--testo-2`, non un errore | spiega perché `SALVA` è spento; su un piatto nuovo non deve comparire in rosso alla prima apertura | un colore |
| 8 | La freccia dell'editor del Piatto scarta la bozza solo a piatto esistente **caricato**, come faceva `ANNULLA` | la review di correttezza ha trovato che la prima versione la scartava anche durante il caricamento e dopo un caricamento fallito, e si perdevano modifiche non salvate. Corretto in un giro, con due test | nessuno: è il comportamento di prima |
| 9 | Tre comportamenti diversi da oggi, voluti (spec §B.7) | l'errore di eliminazione resta nel dialogo aperto; un caricamento fallito su `/piatti/nuovo` mostra solo l'errore (prima si poteva salvare con `slot_def_id ''`); aprire e salvare senza toccare niente non si può più, perché `SALVA` è spento | nessun dato: il primo e il secondo tolgono un difetto |
| 10 | Gli implementatori sono su sonnet; il Task 6 (l'editor, circa 1400 righe) su opus | la fase 6 aveva mostrato che haiku rovina l'UTF-8 dei file | costo di modello più alto |

## Misure nel browser

Dev server con chiavi Supabase finte, 360 × 640, 27/09. I pezzi veri sono montati con dati finti in una
pagina sonda, poi cancellata. Le pagine vere leggono Supabase all'apertura.

- **Riga piatto** [misurato]:
  - 328 × 76;
  - la riga scelta ha fondo `--ink`, `aria-pressed="true"` e il tondo con la spunta; i pallini d'area
    si leggono sul fondo scuro;
  - `ORA IN PROGRAMMA · 2 INGREDIENTI` nella sottoriga;
  - il modo `apri` è identico a Piatti;
  - niente scorrimento orizzontale.
- **Riga di impostazione con il taglio** [misurato]: «NESSUNO FUORI CASA» è largo 133 e non si taglia;
  un'opzione lunga di Scegli si taglia con l'ellissi. [ipotesi] La nota a sinistra può andare a capo
  prima di prima; la sonda non ha misurato la riga del Pannello com'era.
- **Testata di modifica** [misurato]: tondo 44 × 44 «Torna ai piatti», nome a 32.
- **Dialogo di eliminazione** [misurato]: ancorato in basso, `ANNULLA` 54 su bianco, `ELIMINA` 54 in
  `--errore`.

## Rimasto aperto, di proposito

- **Scegli, piatto scelto nascosto dalla ricerca.** Con la ricerca attiva, il piatto scelto può
  sparire dall'elenco, e `SOSTITUISCI` lo scrive senza che si veda quale. Il dato è giusto e il
  comportamento è voluto dalla spec §A.3, ma può confondere. Proposta: una riga che dica il piatto
  scelto, oppure svuotare la ricerca al tocco. Manca anche il test del caso.
- **Scegli, slot senza piatti attivi.** Si vede solo `CREA UN PIATTO NUOVO`, e nessun test lo copre.
- **`SelettoreIngrediente.tsx:29`.** La regex ha i caratteri combinanti scritti crudi al posto degli
  escape `̀-ͯ`. Il comportamento è identico; è un problema di leggibilità.
- **Eliminare mentre si salva** (preesistente, fuori perimetro). Si può confermare `ELIMINA` mentre un
  `SALVA` è in volo. Se l'upsert arriva dopo, il piatto eliminato torna attivo [ipotesi, corsa non
  testata].
- **Nessun test nomina il terzo cambio voluto di §B.7** (una settimana fuori ciclo non si riscrive
  all'apertura). È coperto solo per costruzione.
- **Limiti noti del piano:**
  - `DialogoConferma` in volo usa ancora l'opacità 0,5; è condiviso con altri fogli;
  - il blocco `COMPONENTI` e il suo widget in Scegli sono scritti a mano;
  - i campi del modulo del Piatto si mappano tre volte;
  - una terza `areeDelPiatto` resta in `piano/page.tsx`;
  - in `ComponentiPiatto.tsx` un `Set` serve solo per `.size`. È ereditato.
- **L'editor dell'ingrediente in volo** mostra ancora `SALVATAGGIO…` a opacità 0,5, contro la regola
  del 26/09 (punto 6). Va allineato in un passaggio a parte.
- **Da `/piatti/nuovo` aperto da Scegli si torna a `/piatti`**, non a Scegli, come prima.

## Prove dal telefono

Da fare dopo il merge, in produzione:
1. **Scegli.** Cambia il piatto di un pasto che ha un componente:
   - tocca il componente fino all'opzione voluta;
   - controlla la riga scelta, piena;
   - premi `SOSTITUISCI`.

   Il Piano deve mostrare il piatto nuovo con l'opzione.
2. **Scegli, ricerca.** Cerca per ingrediente e scegli dall'elenco filtrato.
3. **Editor, piatto esistente.** Aprilo: `SALVA` è spento. Cambia la grammatura: `SALVA` si accende.
   Salva: si torna a Piatti.
4. **Editor, piatto nuovo con un ingrediente nuovo.** Aggiungi un ingrediente che non esiste ancora,
   crealo e torna indietro: il piatto è ancora lì, con nome e pasto (la bozza). Salva.
5. **Elimina un piatto di prova** dal dialogo.
6. **Pannello → Pasti a casa**: il valore «NESSUNO FUORI CASA» (o «N FUORI CASA») si legge intero.
