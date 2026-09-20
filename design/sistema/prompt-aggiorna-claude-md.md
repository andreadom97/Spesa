# Prompt per Claude Design: aggiorna il CLAUDE.md del progetto Spesa (20/09/2026)

Incolla il testo sotto il separatore in Claude Design, progetto "Spesa".

---

Aggiorna il file `CLAUDE.md` di questo progetto. Non toccare le sezioni che non nomino. Le
fonti sono `DESIGN.md` (versione 3, già nel progetto) e le decisioni di Andrea qui sotto.

## 1. Correggi tre valori che nel testo non coincidono con i file

- Sezione "Tab bar": il Marchio è una **griglia 3 × 2** (tre colonne, due righe) nell'ordine
  fisso delle aree, con le caselle piene quando nell'area non manca niente e contornate
  quando manca qualcosa; non "3 × 3 di caselle contornate". Lato 9, gap 4, raggio 2,52.
- Sezione "Scorrimento sotto la barra": `--fine` vale **128 px** a barra grande (non 140) e
  110 a barra piccola, come in tutti i file.
- Sezione "Fotocamera": il tasto di scatto è l'anello **76 con disco bianco 62** del file
  "Fotografa il piano - scatto" (non 72/52 in ink).

## 2. Aggiungi la sezione "Decisioni del 20/09"

- **Dispensa.** Il dock "Fai una modifica" apre un foglio dal basso con tre vie: **a mano**
  (campo del residuo, congelatore, lotti Pronti), **con una nota** (testo o voce), **scansione**
  della confezione. Nessuna funzione della Dispensa attuale si perde: entrano tutte dal dock.
- **Impostazioni.** Casa condivisa, rotazione del piano, gestione dei pasti, ingredienti,
  ordine dei reparti e importa la dieta restano nel prodotto e vanno in **sotto-schermate**
  del pannello, una per voce: il pannello di primo livello resta corto. La riga `Esci` c'è ma
  è spenta: il logout arriva dopo.
- **Tasti primari nel Dock.** `CONFERMA E CREA LA LISTA` (Piano), `HO FINITO` (fotocamera) e i
  primari degli stati vuoti stanno nel Dock: pillola bianca a portata di pollice, sopra la tab
  bar, `--ombra-nav`, che scende da 114 a 96 dal fondo quando la barra si restringe. Il Dock
  è **a una riga sola**.
- **Matrice dei pasti di default.** Deve reggere da 3 a 6 pasti con celle mai sotto 44 px:
  nome del pasto su riga propria, sotto le sue sette celle dei giorni, alla larghezza interna
  piena del pannello; oltre, scorre in orizzontale invece di rimpicciolire.
- **Titoli di schermata in sentence case**: `Lista`, `Piano`, `Piatti`, `Dispensa`,
  `Impostazioni`. È la regola, sostituisce il maiuscolo di DESIGN.md v2.
- **Niente più Base e Top-up.** La Lista è una sola, divisa per reparto nell'ordine scelto
  dall'utente. Il selettore `BASE` / `TOP-UP` sparisce; la distinzione tra secco e fresco
  resta nel calcolo (scadenze), non in corsia.
- **Chiusura della spesa: aperta.** Oggi `HAI PRESO TUTTO` porta a una schermata di traguardo
  con il riepilogo "non ricomprato", il link "Confezioni diverse? Scansiona" e il tasto
  `CHIUDI LA SPESA`, l'unico atto irreversibile. Da decidere se diventa un solo tasto nel
  Dock che apre il traguardo come foglio dal basso. Finché non è deciso, il Dock della Lista
  mostra il solo primario `HAI PRESO TUTTO`, visibile quando tutto è spuntato.

## 3. Sostituisci la sezione "Debito verso DESIGN.md"

Titolo nuovo: **"Assorbito in DESIGN.md v3 il 20/09"**. Testo: gradiente di sfondo, le tre
ombre nuove, alfa dichiarati, tab bar B, menù utente, Piano, sentence case, Dock e i dieci
componenti nuovi sono ora regole in `DESIGN.md` v3 (§2.4, §2.5, §5, §7, §8, §13). Questo
file registra solo le decisioni successive.

## 4. Aggiungi in coda a "Come si consegna"

Il progetto contiene `INVENTARIO-SCHERMATE.md`: ogni schermata nuova nomina in testa numero e
titolo dell'inventario, conserva i nomi della colonna "Elemento" come `data-elemento` sugli
elementi interattivi, e dichiara con `ELEMENTO NUOVO:` / `ELEMENTO TOLTO:` cosa aggiunge o
toglie. Le prossime schermate attese: il foglio del dock della Dispensa con le tre vie, le
sotto-schermate delle Impostazioni, la vista "Rivedi i fogli presi" della fotocamera.

Alla fine rispondi con il diff delle sezioni toccate.
