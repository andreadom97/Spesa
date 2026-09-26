# Prompt per Claude Design: il pannello delle Impostazioni e la barra a tre voci (25/09/2026)

Incolla in Claude Design, progetto "Spesa", il testo che sta sotto il separatore. Prima di
farlo, controlla che il `DESIGN.md` del progetto sia quello del repo dopo la fase 4 (Dispensa,
25/09): le regole citate qui sotto stanno in quella versione.

---

Disegna le **Impostazioni a pannello** con tutte le loro sotto-schermate, e la **tab bar a tre
voci**, in un file nuovo: `Impostazioni - pannello completo.html`.

Il pannello chiaro è già approvato e resta la base: file `Impostazioni a pannello chiaro.html`,
`DESIGN.md` §8 (Pannello impostazioni, Riga di impostazione, Matrice dei pasti, Menù utente).
Qui manca tutto il resto: le sotto-schermate che il 20/09 abbiamo deciso di tenere, le
funzioni nuove, e il posto di Piatti.

**Obiettivo.** Da questo file si scrive il codice senza tornare a chiedere. Deve dire dove sta
ogni funzione delle Impostazioni di oggi, con quali testi e in quali stati. **Si misura così:**
ogni riga dell'inventario qui sotto trova il suo posto in un frame, oppure è scritta nelle note
come «tolta, perché…».

## Le decisioni già prese (non riaprirle)

1. **Piatti esce dalla tab bar.** La barra ha tre voci: **Lista · Piano · Dispensa**. La pagina
   dei Piatti (elenco con ricerca, editor del piatto) resta una pagina piena, e si apre da un
   blocco del pannello. È una cosa che si fa ogni tanto, non ogni giorno.
2. **Il pannello ha due livelli.** In cima le **funzioni** che si usano ogni tanto: Piatti,
   Importa un piano, Casa condivisa, Esporta i tuoi dati. Sotto le **impostazioni** che si
   cambiano una volta ogni sei mesi: pasti a casa, gestione dei pasti, rotazione, porzioni,
   ordine delle aree, cadenza dei controlli. La differenza si deve vedere: decidi tu come.
3. **Nessuna funzione di oggi si perde** (deciso il 20/09). Quelle con un contenuto proprio
   vivono in **sotto-schermate dello stesso pannello**, raggiunte da una riga con valore e
   chevron, e lasciate con la freccia `Torna alle impostazioni`.
4. **Quattro funzioni nuove, vere:**
   - **Esci**: il logout, che oggi non esiste in tutta l'app. Dopo, si torna alla pagina di
     accesso.
   - **Cancella la dispensa**: azzera quello che risulta in casa; piatti e piano restano. Non
     si annulla.
   - **Esporta i tuoi dati**: un file con piatti, piano e dispensa, da tenere.
   - **Cadenza dei controlli**: ogni quanto l'app chiede se hai ancora olio, sale, farina.
     Oggi è fissa a 90 giorni. Tre valori: **ogni mese · ogni 2 mesi · ogni 3 mesi**, di
     default ogni 3 mesi.
5. **Tolte dal mockup approvato:** `Arrotonda alle confezioni` (la lista arrotonda sempre, non
   c'è niente da scegliere) e `Unità di misura` (esistono solo grammi, ml e pezzi).
6. **La riga «Da quando usi Dispesa»**, tolta dalla Dispensa nella fase 4, va qui, nel gruppo
   dei tuoi dati. Il testo di oggi: `Da quando usi Dispesa: {n} confezioni non ricomprate ·
   {quantità} · {circa N €}` (quantità ed euro solo se ci sono; `1 confezione non ricomprata`
   al singolare; niente riga con zero confezioni).
7. **Da 3 a 6 pasti** (deciso il 20/09): ogni schermata che mostra i pasti regge sei pasti a
   **360 px** di larghezza, la metà degli Android in circolazione.

## I frame richiesti (393 × 852; controlla che tutto regga a 375 × 812 e, dove ci sono i pasti, a 360)

1. **La tab bar a tre voci**, su Lista, grande e ridotta. Le misure di oggi sono pensate per
   quattro voci (`DESIGN.md` §8 Tab bar): ridisegna larghezze e posizioni delle voci.
2. **Il pannello aperto, in cima**: testata, il livello delle funzioni, l'inizio delle
   impostazioni.
3. **Il pannello scorso fino in fondo**: le impostazioni rare, i tuoi dati, l'account, la riga
   di versione.
4. **Pasti a casa** (la matrice approvata) **con sei pasti a 360 px**: oggi la matrice ha tre
   colonne fisse, e i pasti possono essere da 3 a 6.
5. **Gestione dei pasti**: nome, aggiungi, togli, riordina; con 3 pasti (non si toglie) e con
   6 (non si aggiunge).
6. **Rotazione del piano**: nessuna / 2 / 3 / 4 settimane, il contatore, e ripartire dalla
   settimana 1 con la sua conferma.
7. **Casa condivisa, da solo**, prima e dopo aver creato il codice, col campo per entrare con
   un codice.
8. **Casa condivisa, proprietario**, con due membri.
9. **Casa condivisa, membro** di una casa altrui.
10. **Ingredienti** (il repertorio): l'elenco per area; toccando un ingrediente si apre il suo
    editor, che è una pagina piena, e da lì si torna qui.
11. **Ordine delle aree**: il riordino e il suo salvataggio.
12. **Cadenza dei controlli**: la scelta fra i tre valori.
13. **Cancella la dispensa**: il dialogo di conferma.
14. **Esci**: decidi se chiede conferma (vedi sotto).
15. **Esporta i tuoi dati**: in preparazione, fatto, errore.
16. **Piatti aperto dal pannello**: com'è la testata della pagina ora che non è più una voce
    della barra, e come si torna.
17. **Gli stati del pannello**: caricamento, errore di caricamento, errore di salvataggio,
    «la casa è cambiata», errore di lettura della casa.
18. **Il Piano con sei pasti a 360 px**: la striscia dei giorni (un pallino per pasto) e il
    giorno con sei righe pasto. Oggi a sei pasti i pallini stanno con 0,71 px per lato a
    375 px: il gap l'abbiamo stretto a 2 senza un disegno.

## Tre cose che devi decidere tu, e scrivere nelle note

- **Le conferme della casa e della rotazione.** Oggi `RIPARTI DALLA SETTIMANA 1`, `TOGLI` (un
  membro) ed `ESCI DALLA CASA` si confermano a due tocchi sullo stesso tasto (`SICURO?`).
  `DESIGN.md` §9 vuole un dialogo a due tasti per ogni azione non reversibile, e dalla fase 4
  il Dialogo di conferma esiste. Scegli: dialogo, o eccezione dichiarata con la ragione.
- **Esci chiede conferma?** Si rientra col link via email: è reversibile ma scomodo.
- **Da Piatti come si torna?** Freccia che riapre il pannello, freccia verso la pagina da cui
  eri partito, o altro.

## L'inventario: ogni funzione di oggi e il suo testo esatto

Tutte devono avere un posto. I testi restano questi; se ne proponi uno migliore, mettilo nelle
note accanto al vecchio.

| Funzione di oggi | Testo o `aria-label` di oggi | Dove va |
|---|---|---|
| Nome del pasto | campo, `aria-label="Nome del pasto"`, vuoto → `Pasto` | Gestione dei pasti |
| Togli un pasto | `Rimuovi {nome}`; non con 3 pasti | Gestione dei pasti |
| Riordina i pasti | `Sposta {nome} in alto` / `…in basso` | Gestione dei pasti |
| Aggiungi un pasto | `AGGIUNGI PASTO`, nasce `Nuovo pasto`; non con 6 | Gestione dei pasti |
| Contatore dei pasti | `{n} DI 6` | Gestione dei pasti |
| Nota dei pasti | `Da tre a sei pasti, nell'ordine in cui li fai. I giorni segnati qui vengono già spenti quando si apre una settimana nuova: nella Settimana correggi solo le eccezioni — le settimane già create non cambiano.` | Gestione dei pasti o Pasti a casa |
| Assenze abituali | oggi sette pastiglie `L M M G V S D` per pasto, `{Lunedì…}, abitualmente fuori casa`; nel disegno approvato la matrice, `Lun colazione: di base a casa, tocca per mettere fuori casa` | Pasti a casa |
| Rotazione | `OGNI QUANTE SETTIMANE SI RIPETE`, `NESSUNA` / `2 SETT.` / `3 SETT.` / `4 SETT.` | Rotazione |
| Contatore del ciclo | `ORA SEI ALLA {k} DI {n}` (solo con ciclo > 1) | Rotazione |
| Note della rotazione | con nessuna: `I piatti ruotano uno dopo l'altro, senza giro fisso. Scegli due o più settimane se il tuo piano si ripete a blocchi: ogni piatto potrà dire a quale settimana appartiene.` · con ciclo > 1: `Il giro {è cominciato\|comincia} lunedì {24 agosto}. Ogni piatto può dire a quale delle {n} settimane appartiene, e in che giorno: chi non lo dice resta buono per tutte.` | Rotazione |
| Riparti | `RIPARTI DALLA SETTIMANA 1` → `SICURO? RIPARTI DA LUNEDÌ` (solo con ciclo > 1) | Rotazione |
| Ingredienti | riga `Ingredienti`, `AREA, CONFEZIONE, COME SI CONSUMA`; elenco per area con `{formato} {unità} · {PORZIONABILE\|INTERO\|A STIMA}[ · FRESCO]`; nota `Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.`; vuoto `Nessun ingrediente` + `Nascono dai piatti: il primo che aggiungi a un piatto compare qui.` | Ingredienti |
| Casa, da solo | `Fai la spesa con qualcuno?`; `Chi entra nella tua casa usa i tuoi dati come fossero suoi: vede e cambia lista, piano, dispensa e piatti, e può anche cancellarli. Il suo piano resta da parte finché non esce. Dai il codice solo a chi vive con te.`; `CREA UN CODICE`; codice a 8 caratteri (`Codice della casa`); `Vale un'ora. Dalle sue Impostazioni, l'altra persona lo inserisce qui sotto.`; campo `Ho un codice` + `ENTRA` | Casa condivisa |
| Casa, proprietario | `La tua casa`; un membro per riga con email e `TOGLI` → `SICURO?`; `Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.`; e `CREA UN CODICE` | Casa condivisa |
| Casa, membro | `Sei nella casa di {email}`; `Vedi e cambi la sua lista, il suo piano e la sua dispensa, come fossero tuoi. I tuoi restano da parte.`; `ESCI DALLA CASA` → `SICURO?` | Casa condivisa |
| Errori della casa | `Non siamo riusciti a creare il codice. Riprova.` · `Non siamo riusciti a uscire. Riprova.` · `Non siamo riusciti a togliere. Riprova.` · `Non siamo riusciti a entrare. Riprova.` (o il messaggio del server, es. `codice non valido o scaduto`) · `Non riusciamo a leggere la casa. Riprova più tardi.` · `La casa è cambiata: dati ricaricati. Riprova.` | Casa condivisa e stati |
| Porzioni | oggi `Per quante persone cucini`, stepper 1–4 (`Diminuisci porzioni` / `Aumenta porzioni`), nota `Moltiplica ogni porzione del piano. Vale se a tavola mangiate tutti la stessa porzione: se no, lascia 1 e scrivi le quantità giuste nei piatti.`, con più di 1 `La lista compra per {n}. Le porzioni nel piatto restano quelle scritte.`; nel disegno approvato `Porzioni di default`, campo numerico | Pannello |
| Ordine delle aree | oggi pagina `Ordine dei reparti`, nota `Mettili nell'ordine in cui li incontri camminando nel tuo supermercato. La lista della spesa comparirà in quest'ordine, così non torni indietro fra le corsie. Le sei aree sono fisse: si cambia solo la sequenza.`, frecce `Sposta {AREA} in alto` / `…in basso`, anteprima `ANTEPRIMA DELLA LISTA` / `DALL'ALTO IN BASSO`, `SALVA ORDINE` / `SALVATAGGIO…`, errori `Non riusciamo a caricare l'ordine dei reparti. Riprova più tardi.` / `Non siamo riusciti a salvare l'ordine. Riprova.` | Ordine delle aree |
| Importa | oggi `Importa la dieta`, `DA FOTO O PDF, SOSTITUISCE IL PIANO ATTUALE`; nel disegno approvato `Importa un piano`, `Da un PDF o dalle foto di un piano che hai già.` (non dice più che sostituisce: decidi se va detto) | Funzioni |
| Stati | caricamento (oggi niente); `Non riusciamo a caricare le impostazioni. Riprova più tardi.`; `Non siamo riusciti a salvare. Riprova.` | Stati del pannello |
| Non ricomprato | vedi decisione 6 | I tuoi dati |

**Le funzioni nuove non hanno testi di oggi**: scrivili tu, del tu, senza esclamativi, e un
errore dice cosa fare (`DESIGN.md` §10).

## I vincoli di sempre

- **Solo valori da `DESIGN.md`**: token, scala tipografica, raggi, alfa (§2.5). Un valore
  nuovo va nelle note come eccezione, con la ragione.
- **Bersagli ≥ 44**, voci di foglio ≥ 50. Niente swipe; niente long-press fuori dal microfono
  della Dispensa.
- **Colori del testo:** errori in `--errore`, testi che informano in `--testo-2`.
- **Copy** come in §10.
- **Il pannello copre la tab bar** (§8): finché è aperto non si naviga.

**Formato del file**, come gli altri del progetto: i frame in fila, e sotto ognuno una scheda
con «Misure», «Componenti usati» (i nuovi segnati COMPONENTE NUOVO), «Regole di DESIGN.md che
tocca», e le decisioni prese. In cima le note: le tre decisioni, i testi nuovi, le proposte, le
righe tolte, le eccezioni. Chiudi la sessione col delta di sei righe (deciso / valori prima →
dopo / regole toccate / scartate / aperto), come dice `CLAUDE.md` del progetto.
