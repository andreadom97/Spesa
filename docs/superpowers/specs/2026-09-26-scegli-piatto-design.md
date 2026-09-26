# Fase 7: Scegli e l'editor del Piatto

**Obiettivo:** portare nel sistema di `design/sistema/DESIGN.md` v3 le due schermate del repertorio
rimaste fuori: Scegli (`/piano/[data]/[slotDefId]/scegli`) e l'editor del Piatto (`/piatti/[id]`,
`/piatti/nuovo`).

Ha funzionato se:
- nei file toccati non restano colori scritti a mano, l'alfa 0,05, bersagli sotto 44, dialoghi o
  fogli scritti a mano, né l'intestazione minimale copiata;
- `SOSTITUISCI` e `SALVA` stanno nel Dock;
- le scritture sono identiche a oggi: `aggiornaSlot`, `salvaPiatto`, `eliminaPiatto`, la bozza.
  Restano verdi gli stessi test di dato, e non c'è nessuna migrazione.

**Le decisioni di Andrea (26/09):**
1. **Scegli resta una schermata sua**, ma prende da Piatti la ricerca e la Riga piatto, con uno stato
   «scelto». Si riusano i pezzi, non la pagina. Conflitti, componenti e nota restano solo in Scegli.
2. **L'editor del Piatto ha un modo solo**, come l'editor dell'ingrediente della fase 5. È una pagina
   sempre modificabile, con `SALVA` nel Dock; la vista in sola lettura sparisce.
3. **Piatti veloce esce da questa fase.** Resta com'è e si ridisegna più avanti come onboarding
   «più pronto», per rendere l'inizio il più leggero possibile.

**Una correzione rispetto al disegno approvato in chat.** In chat ho scritto «Testata in modo
indietro» per l'editor del Piatto. Ma l'editor dell'ingrediente, che è il modello scelto nella
decisione 2, non usa la `Testata`: usa la testata del frame 12, cioè il tondo 44 con la freccia e
sotto il nome a 32/800, che è anche il campo del nome. Per fare davvero «come l'ingrediente», il
Piatto prende quella testata (§B.2). **[Da confermare in revisione.]**

**Fuori perimetro, esplicitamente:**
- Piatti veloce (decisione 3);
- i passi di Importa oltre le due porte e la fotocamera (fase 8);
- la logica di `conflittiSostituzione`, `aggiornaSlot`, `salvaPiatto`, `eliminaPiatto`, `bozza.ts` e
  delle funzioni di dominio di Scegli (`opzioneCorrente`, `opzioneSuccessiva`, `opzioneInCasa`,
  `ilPiattoOLeScelteSonoCambiate`, `scelteManualiDaMandare`): si chiamano come oggi;
- `TesseraIngrediente`. La modifica il ramo `icone-ingredienti` (la matita va in alto, arrivano le
  icone): questa fase la usa com'è dopo quel merge, e non la tocca.

**Il database non cambia. Nessuna migrazione.**

**Quando si parte.** L'esecuzione parte dopo il merge del ramo `icone-ingredienti`: così l'editor si
monta sulle tessere nuove. La spec e il piano si possono scrivere prima.

---

## A. Scegli

`src/app/(app)/piano/[data]/[slotDefId]/scegli/page.tsx`.

### A.1 Cosa non cambia [letto nel codice]

- **Il caricamento.** È lo stesso `Promise.all` di oggi (settimana, repertorio, pasti, ingredienti,
  impostazioni, dispensa), e la lista si legge senza bloccare.
- **La scelta.** `setScelto(p.id)`. I componenti ciclano all'opzione successiva al tocco
  (`toccaComponente`), come scelta manuale.
- **La conferma.** `aggiornaSlot(slotId, patch, 'correzione')` e poi `router.push('/piano')`, con la
  stessa costruzione del patch: `dishId`, `scelte` solo se servono, e `stato: 'casa'` da `saltato` o
  `sostituito`.
- **I testi di oggi, parola per parola:**
  - `testoNota`, nelle due forme;
  - `testoConflitto`;
  - il messaggio di errore del salvataggio.

### A.2 Testata

- `Testata` in modo indietro: pillola `PIANO` («Torna al piano»), che porta a `/piano`.
- Titolo `Cosa mangi` (oggi è un 21/800 nel corpo).
- Sotto il titolo la pillola informativa col giorno e il pasto. Il testo è quello dell'etichetta di
  oggi in sentence case, per esempio «Giovedì 4 · Cena»; la pillola lo rende maiuscolo da sé, come la
  settimana in Fine spesa. Si passa come `settimana`: la Testata non sa cosa ci sia scritto.
- Spariscono l'intestazione fatta a mano (`Cornice`, la freccia 44 e l'etichetta mono) e il tasto
  `ANNULLA` del piede: tutte e due portavano a `/piano`, come la pillola.

### A.3 Ricerca ed elenco

La ricerca e le righe vengono da Piatti. **`ElencoPiatti.tsx` si divide in pezzi riusabili**:

- **`CampoRicercaPiatti`**: il campo in modalità ricerca di §8, oggi scritto dentro `ElencoPiatti`.
  In Scegli sta fuori dallo scroller e resta fermo, come in Piatti.
- **`RigaPiatto`**, esportata, con due modi:
  - `{ modo: 'apri', href }`, quello di oggi: un `Link` con `aria-label="Apri {nome}"` e il chevron;
  - `{ modo: 'scegli', scelto, corrente, onScegli }`: un `button` con `aria-pressed={scelto}` e
    `aria-label="Scegli {nome}"`.
- La **sottoriga** resta `N INGREDIENTI` (più `· DALLA DIETA`). Sul piatto in programma si aggiunge in
  testa `ORA IN PROGRAMMA · `. Oggi è un badge sopra il nome; §8 non prevede badge sulla riga.
- La **riga scelta è piena**:
  - fondo `--ink`, nome in `--superficie`, sottoriga in `rgba(255,255,255,0.62)`;
  - i pallini d'area restano nel loro colore;
  - al posto del chevron, nella zona da 44, un tondo 24 in `--superficie` con la spunta `--ink`.
  «Pieno = scelto» è la regola della Striscia dei giorni (§8). La riga non scelta è identica a quella
  di Piatti, chevron compreso.
- **L'ordine e il filtro** vengono da `cercaPiatti(piatti, ingredienti, ricerca)`, come in Piatti.
  Oggi Scegli non ha la ricerca: arriva adesso.
- **Il piatto in programma** resta nell'elenco nella posizione in cui lo mette `cercaPiatti`; prima di
  un tocco è anche quello scelto, come oggi.
- **Nessun risultato**: lo stesso vuoto di ricerca di Piatti («Nessun piatto qui»).
- **`CREA UN PIATTO NUOVO`** diventa l'Aggiungi tratteggiato (§8): alto 56, bordo 2 tratteggiato
  `--bordo-tratteggio`, raggio 14, mono 11. È il componente condiviso
  `src/components/AggiungiTratteggiato.tsx`, estratto dal «Nuovo piatto» di `ElencoPiatti.tsx` insieme
  a `CampoRicercaPiatti` e `RigaPiatto`; lo usa anche l'editor del Piatto (§B.6). Sta **in fondo**
  all'elenco, perché qui si sceglie; in Piatti invece sta in cima, dove si crea. Porta a
  `/piatti/nuovo`, come oggi.

### A.4 Sotto la riga scelta

Tutto questo sta dopo l'elenco, prima dell'Aggiungi tratteggiato, come oggi.

- **Componenti a scelta**, solo se il piatto scelto ne ha. Etichetta di sezione `COMPONENTI`, e una
  **Riga di impostazione** per componente, dentro un widget bianco (raggio 22):
  - `nome` è il nome del componente;
  - `finale: { tipo: 'valore', valore: nomeOpzione(...), onApri: () => toccaComponente(c) }`;
  - `IN CASA` sta nella `nota`, in mono 10 `--ink`, solo quando `opzioneInCasa` è vero. Fra i token
    non c'è un verde (`--ok` non esiste) e §C non vuole famiglie nuove: un verde, se servirà,
    passa prima da un token in `DESIGN.md`;
  - `aria-label` resta quello di oggi: `Cambia {componente}: ora {opzione}`.

  Il tocco cicla all'opzione successiva, senza foglio, come oggi. `RigaImpostazione` non accettava
  un `aria-label` diverso dal testo: il piano (Task 3) le aggiunge la prop `etichetta` sui finali
  `valore` e `azione`.
- **Conflitti**: un **Avviso in linea** per conflitto (§8 Messaggi: 11,5 in `--avviso`,
  `aria-live="polite"`). Oggi è un riquadro scritto a mano.
- **La nota** (`testoNota`): una **Nota**, 12,5 in `--testo-2`.

### A.5 Il Dock

```tsx
<Dock>
  <button type="button" className="dock-primario" onClick={() => void confermaScelta()} disabled={!cambiato || salvando}>
    SOSTITUISCI
  </button>
</Dock>
```

- Il Dock c'è solo a dati caricati.
- È **spento finché non cambia niente**, e anche in volo, con lo stato spento di `.dock-primario:disabled`
  (`DESIGN.md` §13, 26/09, punto 6).
- L'errore di salvataggio sta sopra il Dock, in `--errore`, con `role="alert"`, nella forma dell'editor
  dell'ingrediente: fuori dalla pillola, su fondo bianco.

### A.6 Caricamento ed errore

Come in Fine spesa: la Testata e sotto `Carico` (`CARICO…`); l'errore di caricamento in
`MessaggioErrore`.

---

## B. L'editor del Piatto

`src/app/(app)/piatti/[id]/page.tsx` (1398 righe), per `/piatti/[id]` e `/piatti/nuovo`.

### B.1 Cosa non cambia [letto nel codice]

- **Il modulo.** Nome; pasto (`slotDefId`); `NEL PIANO`, cioè `SETTIMANA DEL GIRO` (solo con più
  settimane) e `GIORNO FISSO`; `INGREDIENTI` per una porzione; `COMPONENTI A SCELTA` con opzioni e
  righe; `COME SI FA`; `IN QUESTA SETTIMANA`. Stessi campi, stesse regole di validità, stessi testi
  (`TESTO_ELIMINA`, `TESTO_COMPONENTE_SENZA_NOME`, `TESTO_SENZA_INGREDIENTI`, `TESTO_OPZIONE_*`,
  `TESTO_NON_IN_PROGRAMMA`, `testoRiepilogo`).
- **La bozza** (`bozza.ts`): salvata prima di uscire per creare o modificare un ingrediente, ripresa
  al ritorno.
- **Le scritture**: `salvaPiatto(...)` ed `eliminaPiatto(id)` con gli stessi argomenti. Dopo
  l'eliminazione si va a `/piatti`.

### B.2 Un modo solo, e la testata del frame 12

- **La vista in sola lettura sparisce.** Spariscono `VistaPiatto`, `modalita`, `MODIFICA`, e la
  logica che ripristina lo stato su `ANNULLA` per tornare alla vista. La pagina apre sempre
  modificabile, per i piatti esistenti come per `/piatti/nuovo`.
- **La testata è quella dell'editor dell'ingrediente (frame 12)**, estratta in un componente
  condiviso `src/components/TestataModifica.tsx`:
  - in alto il tondo 44 su `--barra-attiva` con la freccia; il suo `aria-label` dice dove porta;
  - sotto, facoltativa, un'etichetta mono con il quadratino d'area (la usa l'ingrediente);
  - poi il **nome come campo**: 32/800/-0,045em, senza bordo, segnaposto `Dai un nome al piatto`.
    Oggi è 34: §3 vuole 32.
  - L'editor dell'ingrediente passa al componente condiviso senza cambiare aspetto: è una
    rifattorizzazione, verificata dai suoi test esistenti.
- **La freccia porta a `/piatti`**, come oggi per l'uscita dall'editor; `aria-label` «Torna ai
  piatti». Da `/piatti/nuovo` aperto da Scegli si torna comunque a `/piatti`, come oggi (limite, §E).
- **Uscire senza salvare** butta le modifiche senza chiedere, come nell'editor dell'ingrediente e
  come oggi `ANNULLA`. La bozza si tratta come oggi all'uscita [da verificare nel piano: dove oggi
  si chiama `scartaBozza`].
- **La tab bar si nasconde** (`useNascondiBarra(true)`), come nell'editor dell'ingrediente.

### B.3 Il corpo

Colonna che scorre (`sc scroll-app con-dock`), padding `6px 16px`. I blocchi sono `Blocco` di
`controlli.tsx` (filetto 1 px e 16 di distacco), nell'ordine di oggi:

1. **Pasto**: `Segmento` (resta).
2. **`NEL PIANO`**: le pillole di oggi (`Pillole`, nel file), alte almeno 44. Etichette di campo in
   mono 10/700/0,16em `--ink` (`Etichetta` di `controlli.tsx`), al posto di `EtichettaCampo`.
3. **`INGREDIENTI · PER 1 PORZIONE`**: le `TesseraIngrediente` come sono dopo il merge di
   `icone-ingredienti`. Sotto, l'**Aggiungi tratteggiato** `AGGIUNGI INGREDIENTE`, che apre il
   selettore (§B.4).
4. **`COMPONENTI A SCELTA`**: la struttura di oggi, con i pezzi del sistema.
   - Il componente è un widget bianco (raggio 22). Dentro: il campo del nome, `OPZIONE N` con le sue
     righe, `AGGIUNGI INGREDIENTE` per opzione, `AGGIUNGI OPZIONE`.
   - Sotto i componenti, `AGGIUNGI COMPONENTE` come Aggiungi tratteggiato.
   - Le «elimina» di componente e di opzione sono tondi 44 con la ✕ (`TondoIcona` di
     `pannello/pezzi.tsx`), con gli `aria-label` di oggi.
   - Vanno in un file a sé: `ComponentiPiatto.tsx`.
5. **`COME SI FA`**: la textarea del Campo di testo (§8: raggio 14, `resize: none`).
6. **`IN QUESTA SETTIMANA`**: il riepilogo di oggi. Il pieno `#FFFFFF` diventa `--superficie`, i
   grigi diventano token.
7. **`ELIMINA`**, solo su un piatto esistente: `TastoSecondario` in `--errore`, in coda, come
   nell'editor dell'ingrediente. Apre il **Dialogo di conferma** distruttivo dentro un
   `FoglioDalBasso` (`ruolo="alertdialog"`) con `TESTO_ELIMINA`. Sparisce il cestino in testata.
   Sparisce anche il dialogo scritto a mano, che era centrato, con tasti da 48 ed `ELIMINA` in `--ink`.

I messaggi di validità di oggi restano dove sono. Quelli che nascono da un dato scritto male
dall'utente (componente senza nome, opzione senza righe, grammatura mancante) e gli errori di
scrittura vanno in `--errore`; oggi alcuni sono in `--sec`, e il piano li elenca.
`TESTO_SENZA_INGREDIENTI` invece è una **Nota** (12,5 in `--testo-2`), non un errore: spiega
perché `SALVA` è spento (`DESIGN.md` §8 Messaggi), e su un piatto nuovo non deve essere rosso dalla
prima apertura.

### B.4 Il selettore degli ingredienti

Il foglio scritto a mano (overlay e un `div` con raggio `22px 22px 0 0`) diventa un `FoglioDalBasso`
con `TestataFoglio`. Dentro:
- la ricerca e l'elenco di oggi;
- il link per creare un ingrediente nuovo (`/piatti/{id}/ingredienti/nuovo`, con la bozza), come oggi.

Il comportamento non cambia: al tocco aggiunge la riga e chiude. Va in un file a sé,
`SelettoreIngrediente.tsx`.

### B.5 Il Dock

- `SALVA` nel Dock, nella forma dell'editor dell'ingrediente: `.dock-primario`, e l'errore di
  salvataggio sopra il Dock, fuori dalla pillola, su fondo bianco, con `role="alert"`.
- **Spento finché il modulo non cambia** rispetto al piatto caricato. Su `/piatti/nuovo`, spento
  finché il modulo è vuoto.
- **Validità.** Com'è oggi: `SALVA` è spento anche quando il modulo non è valido, e la ragione resta
  scritta dove sta oggi nel modulo (per esempio `TESTO_SENZA_INGREDIENTI`), non al tocco [letto nel
  test «un piatto nuovo, senza ingredienti, ha il salvataggio bloccato»]. Il tasto dice `SALVA` (oggi
  `SALVA PIATTO`), come nell'editor dell'ingrediente.
- **In volo**: lo stato spento del sistema (`DESIGN.md` §13, 26/09, punto 6). **Nota:** l'editor
  dell'ingrediente in volo usa ancora `SALVATAGGIO…` a opacità 0,5 (frame 12). Qui si segue la regola
  del 26/09; l'allineamento dell'ingrediente è un punto aperto (§E).
- **`SALVA` scrive e poi torna a `/piatti`**, come l'editor dell'ingrediente torna al suo ingresso.
  Oggi, su un piatto esistente, SALVA torna alla vista, che non c'è più.

### B.6 I file

| File | Cosa |
|---|---|
| `src/app/(app)/piatti/[id]/page.tsx` | la pagina: stato, caricamento, salvataggio, eliminazione, i blocchi 1–3 e 5–7 |
| `src/app/(app)/piatti/[id]/ComponentiPiatto.tsx` (nuovo) | il blocco 4 |
| `src/app/(app)/piatti/[id]/SelettoreIngrediente.tsx` (nuovo) | il foglio del §B.4 |
| `src/components/TestataModifica.tsx` (nuovo) | la testata del frame 12, usata dai due editor |
| `src/components/AggiungiTratteggiato.tsx` (nuovo) | l'Aggiungi tratteggiato di §8, condiviso da Piatti, Scegli e l'editor del Piatto (`AGGIUNGI INGREDIENTE`, `AGGIUNGI COMPONENTE`) |
| `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx` | usa `TestataModifica` al posto della sua `Cornice` |

### B.7 Cambi voluti rispetto a oggi

Tre comportamenti cambiano di proposito, e i test li fissano:
- **Eliminazione fallita.** L'errore compare dentro il Dialogo di conferma, sotto i tasti, e il
  dialogo resta aperto. Oggi il dialogo si chiudeva e l'errore finiva in fondo al modulo.
- **Caricamento fallito su `/piatti/nuovo`.** Si vede solo il messaggio d'errore, senza Dock, come per
  un piatto esistente. Oggi l'editor si mostrava lo stesso, senza pasti, e salvare scriveva
  `slot_def_id ''`.
- **Aprire e salvare senza toccare nulla non si può più**, perché `SALVA` è spento finché niente
  cambia. Quindi un piatto con una `settimanaCiclo` fuori dal ciclo non viene riscritto a `null` a
  ogni apertura, ma solo al primo salvataggio di un cambiamento vero.

---

## C. Trasversale

- **L'intestazione minimale** copiata in Scegli e nel Piatto sparisce da tutti e due.
- **Colori**: niente letterali (`#FFFFFF`, `#8A8A96`, `#C4C4CE`, `#14163A`); niente alfa 0,05, che non
  è nella tabella di §2.5 (i fondi dei secondari passano a `TastoSecondario`); i bordi
  `rgba(20,22,58,0.12)` e `0.16` diventano `--bordo`.
- **Il titolo del piatto** passa da 34 a 32.
- Nessun'altra famiglia di token: §9 di `DESIGN-SYSTEM.md` le vuole una per volta.

## D. Documenti

- **`DESIGN.md`**:
  - §8 Riga piatto: i due modi, lo stato «scelto» (pieno `--ink`, il tondo con la spunta al posto
    del chevron) e `ORA IN PROGRAMMA` nella sottoriga;
  - §8 una voce **Scegli**;
  - §8 Dock, «Cosa ci vive»: `SOSTITUISCI` (Scegli) e `SALVA` (l'editor del Piatto);
  - la testata del frame 12 come componente condiviso dei due editor;
  - §13, «Decisioni del 26/09/2026 (fase 7: Scegli e l'editor del Piatto)»: le tre decisioni in
    testa a questa spec.
- **`docs/superpowers/specs/DESIGN-SYSTEM.md`**: le righe del ponte (Riga piatto, Dock, Dialogo di
  conferma, Foglio dal basso, la testata condivisa) e §9: fase 7 chiusa; restano la fase 8 e Piatti
  veloce come onboarding.
- **Registro** `docs/<data>-fase7-decisioni-esecuzione.md`, come nelle fasi 5 e 6.

## E. Rischi, limiti e punti aperti

- **Il file del Piatto è grande e denso** (componenti, opzioni, bozza, ciclo). Il rischio di
  regressione sta nella divisione in tre file. Rete di sicurezza: i test di dato di oggi restano tutti
  e cambiano solo i selettori. In più, una review di correttezza (opus) sul task del Piatto.
- **Tolta la vista, un tocco sbagliato su un piatto aperto per guardarlo** non scrive niente finché
  non si preme `SALVA`, che resta spento finché niente cambia.
- **Da `/piatti/nuovo` aperto da Scegli si torna a `/piatti`**, non a Scegli: com'è oggi. Tornare a
  Scegli col piatto nuovo già scelto sarebbe meglio, ma serve un `?torna=`; è un punto aperto, non
  in perimetro.
- **L'editor dell'ingrediente in volo usa ancora l'opacità 0,5** (§B.5): va allineato alla regola del
  26/09 in un passaggio a parte, o la regola va scritta con un'eccezione.
- **La riga scelta piena in `--ink`**: il contrasto dei pallini d'area su `--ink` va guardato nella
  sonda [ipotesi: si vedono, sono pastelli su un blu scuro].

## F. Verifica

- **Test**:
  - si aggiornano quelli di Scegli e del Piatto: i casi di dato restano e cambiano i selettori;
  - quelli di Piatti e dell'editor dell'ingrediente restano verdi senza cambiare comportamento;
  - nuovi:
    - la Riga piatto nei due modi;
    - la ricerca in Scegli;
    - `SOSTITUISCI` nel Dock, spento senza cambiamenti;
    - l’editor sempre modificabile, con `SALVA` spento senza cambiamenti o con un modulo non valido
      (la ragione resta scritta nel modulo), che scrive e torna a `/piatti`;
    - `ELIMINA` dal dialogo;
    - il selettore in un `FoglioDalBasso`;
    - la testata condivisa.
- **Controlli**: `tsc`, lint, `design:token`.
- **Sonda nel browser**, a 360 × 640. Le pagine leggono Supabase al caricamento, quindi come nella
  fase 6 si misurano i pezzi montati con dati finti in una pagina sonda:
  - la riga scelta (contrasto, spunta);
  - il widget dei componenti;
  - il Dock di Scegli;
  - l'editor col Dock senza barra;
  - il dialogo di eliminazione.
- **Prova dal telefono**, dopo il merge:
  - cambiare il piatto di un pasto con un componente;
  - creare un piatto nuovo con un ingrediente nuovo, per provare la bozza;
  - modificare ed eliminare un piatto.
