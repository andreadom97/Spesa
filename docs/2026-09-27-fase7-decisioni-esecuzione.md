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
| 2 | `RigaImpostazione` prende la prop `etichetta` (aria-label), e il valore ha `maxWidth: 60%` con ellissi (era 50%, portato a 60% dopo la review finale, M2) | il nome accessibile dei componenti di Scegli («Cambia Farcitura: ora Ricotta») è diverso dal testo; un'opzione con tre ingredienti schiacciava il nome a 360 | vale anche per il Pannello: «NESSUNO FUORI CASA» (133 px [misurato]) non si taglia; al 50% si sarebbe tagliato a 320, dove metà riga è circa 127 px [fonte: review finale]; un valore lungo del Pannello si taglierebbe con l'ellissi |
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
  un'opzione lunga di Scegli si taglia con l'ellissi. L'ipotesi che la nota a sinistra potesse andare
  a capo prima di prima è chiusa [fonte: review finale]: il testo ha `flex: 1` con base 0, quindi
  finché il valore sta sotto il tetto il layout è identico a prima.
- **Testata di modifica** [misurato]: tondo 44 × 44 «Torna ai piatti», nome a 32. Dopo la review
  finale, aperta dal Piano, la freccia si chiama «Torna al piano» [non misurato nel browser, coperto
  dai test].
- **Dialogo di eliminazione** [misurato]: ancorato in basso, `ANNULLA` 54 su bianco, `ELIMINA` 54 in
  `--errore`.

## Dopo la review finale

La review finale del ramo ha trovato un problema importante e otto minori, corretti in un'ondata sola
(commit da `ea6b2b7` a `a189e1e`). Nessuna scrittura cambia: `salvaPiatto`, `eliminaPiatto` e la bozza
restano identici.

- **I1, dal Piano l'editor del Piatto tornava a Piatti.** Il Piano apriva il piatto con
  `router.push('/piatti/{id}')` e l'editor usciva sempre su `/piatti`; nella PWA su iOS non c'è un
  indietro di sistema. Ora il Piano apre `/piatti/{id}?da=piano`; l'editor lo legge al montaggio e
  lo tiene per id in `sessionStorage` (`spesa:piatto-ritorno:{id}`, in `piatti/[id]/ritorno.ts`), così
  resiste al giro verso l'editor dell'ingrediente, che rientra senza parametri. Freccia, `SALVA` ed
  `ELIMINA` riuscito vanno al Piano, la freccia si chiama «Torna al piano», e all'uscita la chiave si
  cancella. Senza `da` tutto resta com'era. Piatti e Scegli non cambiano [misurato: 5 test nuovi
  nell'editor, 1 aggiornato nel Piano].
- **M1.** In Scegli il nome accessibile del piatto in programma dice «Scegli {nome}, ora in
  programma»: prima l'`aria-label` copriva la sottoriga `ORA IN PROGRAMMA`.
- **M2.** Il valore della Riga di impostazione arriva al 60% della riga (vedi la decisione 2).
- **M3.** `DESIGN-SYSTEM.md` non mette più la fase 7 «fuori dal sistema», e colloca la ricerca dei
  piatti in `CampoRicercaPiatti.tsx`.
- **M4.** `AGGIUNGI OPZIONE` ha un nome per componente: «Aggiungi opzione al componente N».
- **M7.** Il dialogo di eliminazione del piatto sta al livello 1: sotto non c'è un altro foglio.
- **Regex.** `normalizza` di `SelettoreIngrediente.tsx` usa gli escape `\u0300-\u036f` al posto dei
  caratteri combinanti crudi. Stesso comportamento.
- **Eliminare mentre si salva.** Con `SALVA` in volo `ELIMINA` è spento: l'upsert di `salvaPiatto` con
  `attivo: true` avrebbe resuscitato il piatto eliminato.
- **Test.** Scegli ha il test «un piatto scelto e poi nascosto dalla ricerca: `SOSTITUISCI` scrive
  quello».

## Rimasto aperto, di proposito

- **Scegli, piatto scelto nascosto dalla ricerca.** Con la ricerca attiva, il piatto scelto può
  sparire dall'elenco, e `SOSTITUISCI` lo scrive senza che si veda quale. Il dato è giusto e il
  comportamento è voluto dalla spec §A.3, ma può confondere. Proposta: una riga che dica il piatto
  scelto, oppure svuotare la ricerca al tocco.
- **Scegli, slot senza piatti attivi.** Si vede solo `CREA UN PIATTO NUOVO`, e nessun test lo copre.
- **M5, un ingrediente creato dal selettore di un'opzione entra negli ingredienti fissi**
  (preesistente, `piatti/[id]/page.tsx:280`, `raccogliIngredienteCreato`). Chi esce a creare un
  ingrediente dall'`AGGIUNGI INGREDIENTE` di un'opzione se lo ritrova nella lista fissa del piatto.
- **M6, un piatto creato da Scegli senza toccare il pasto va sul primo pasto** (preesistente,
  `piatti/[id]/page.tsx:507`, il ripiego `slotDefs[0]`), non sul pasto da cui si era partiti.
- **Il ritorno al Piano resta in `sessionStorage` se si esce dall'editor senza freccia, `SALVA` o
  `ELIMINA`** (per esempio chiudendo l'app a metà del giro verso l'editor dell'ingrediente): riaprendo
  lo stesso piatto da Piatti nella stessa sessione, la freccia porterebbe al Piano [ipotesi, non
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
7. **Dal Piano apri un piatto, freccia: si torna al Piano.** Anche dopo essere passati dall'editor di
   un ingrediente del piatto.
