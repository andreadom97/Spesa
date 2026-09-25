# Animazioni logo app — decisioni

Progetto: animazione d'avvio del marchio di **Spesa** (griglia 3×2 di caselle colorate).
File di lavoro: `Avvio - 5 animazioni del marchio.dc.html`, organizzato in turni,
il più recente in cima.

## Vincoli fissi

- Design system **Spesa** (`_ds/spesa-…9a979e63…/`): `tokens.css` + `_ds_bundle.js` in `<helmet>`.
- Le caselle del marchio vogliono **`box-sizing: border-box`**: 16×16 con gap 4 in testata,
  40×40 con gap 10 al centro, bordo 2px, raggio 4.48 / 11.2. Senza `border-box` i gutter
  si annullano.
- Ordine dei colori nella griglia: `#F2A465 #9CC7F2 #A8D96A` / `#B9AEF5 #F5CE5B #F29B9B`.
- Cornice telefono 393 × 852, raggio 26, fondo a gradiente di `DESIGN.md` §2.4.
- Ogni animazione d'avvio sta **sotto i 2 secondi** circa.

## Scelte approvate

- **Il pop è la direzione buona** (turno 1, variante 02): caselle da scala zero, nessun
  ingresso da fuori schermo.
- **Ordine di apparizione: quello della 02** — sparso, 85 ms di distanza:
  delay `0, 340, 170, 255, 85, 425` ms sulle sei caselle in ordine di griglia.
- **Elasticità moderata** (keyframe `pb`, 620 ms, `linear`):
  `0 → 1,32 (40%) → 0,93 (62%) → 1,05 (80%) → 0,99 (92%) → 1`.
  La prima prova a 1,52 / 0,84 era troppo elastica.
- **L'avvio finisce in testata** (variante 3a): il marchio si compone grande al centro,
  150 ms di pausa, poi scende in testata in 0,62 s; titolo e tessere entrano dietro
  a 1,62 s e 1,72 s. Totale 2,1 s.

## Tweaks del documento

`velocita` (0,4–2), `ciclo` (ripete ogni 4,2 s), `anteprima` (scala dei riquadri).

---

# Dispensa — modifiche (v2, 25/09/2026)

File: `Dispensa - modifiche v2.dc.html` (frame) + `Dispensa pagina v2.dc.html` (pagina
riusata sotto ogni frame, prop `stato` / `query` / `dock`). La v1 `Dispensa - foglio del
dock.dc.html` resta come storico: vale ancora dove la v2 non la sostituisce.

## Correzioni di Andrea del 25/09 (tutte applicate)

1. **Il tocco sulla tessera apre il dettaglio** dell'ingrediente. Sparisce la voce A mano e
   il foglio a tre voci.
2. **Il Dock dice «Modifica con l'AI»** (era Fai una modifica), col microfono accanto:
   così il microfono si capisce da solo.
3. **La scansione** legge il codice a barre di una confezione (formato + stima della
   scadenza). Non è l'upload della dieta. Vive **nel dettaglio dell'ingrediente**
   (SCANSIONA UNA CONFEZIONE); le viste di lettura e codice da digitare della v1 restano.
   Un codice nuovo si lega all'ingrediente aperto: sparisce la scelta da elenco (v1 14).
4. **La ricerca sta in pagina** sotto la testata e filtra i widget. Niente elenco a righe.
   I mai comprati compaiono solo fra i risultati (tessera tratteggiata, MAI COMPRATO).
5. **Nessun risultato → «Crea «…»»**: scorciatoia che apre il foglio Nuovo ingrediente
   (nome dalla ricerca, reparto, quantità + unità, deperibile Sì / No).
6. **Dettaglio:** In casa (SÌ / FINITO), Residuo con SALVA, Congelatore, **Confezioni**:
   ogni confezione ha la sua scadenza, STIMA di default o MODIFICATA DA TE; MODIFICA apre
   un campo data con SALVA e USA LA STIMA. La stima resta salvata come default.
7. **Nota e voce = widget sopra la pagina** (scheda bianca raggio 22, ombra flottante, velo
   0,35, il Dock sparisce sotto). Da tastiera: campo libero. **Tenendo premuto il microfono**:
   onda che si muove (22 barre) e testo dettato che entra nel campo; al rilascio niente
   parte da solo.
8. **«Fai le modifiche»** (era Correggi) chiama l'API: mentre lavora **una luce passa sul
   testo da sinistra a destra** (sfumatura --ink → #B9AEF5 → #9CC7F2, 1600 ms, loop),
   riga PREPARO LE MODIFICHE…
9. **Caricamento = widget vuoti con la stessa luce** (fascia bianca 85 %, 1400 ms, in fase
   su tutti i widget). Sostituisce «CARICO…».

## Aggiunte di Andrea del 25/09, secondo giro

10. **Scansione anche in Nuovo ingrediente**: tasto SCANSIONA LA CONFEZIONE; la lettura
    riempie quantità e unità dal formato, la prima confezione nasce con la scadenza stimata,
    il codice si lega al nuovo ingrediente.
11. **Niente contatori sui widget della pagina** («1 voce in casa», «2 lotti»…): tolti,
    non danno informazione.

## Decisioni prese insieme alle correzioni

- I **Pronti** diventano un widget in fondo alla pagina; dettaglio del lotto e dialogo di
  eliminazione restano v1 06 / 06b.
- Restano valide dalla v1: salvataggio con **SALVA**, **dialogo a due tasti** per eliminare
  il lotto, errori della nota, errore di caricamento, vuoto, avvisi sulle tessere.
- NON RICONOSCIUTI: proposta «Cercali in dispensa.» (la ricerca ora è in pagina).

## Eccezioni dichiarate

- **Long-press sul microfono** (§9 lo esclude): chiesto da Andrea; alternativa tocco breve
  per avviare / fermare.
- **Due animazioni nuove fuori da §7** (`lucev`, `lucet`), spente con meno moto.
- **Colori d'area come luce** (#B9AEF5, #9CC7F2) fuori dai loro tre usi.
- **Icona AI** (due stelle a quattro punte) e **icona di scansione**: nuove per §6.
- **Scheletro nel caricamento** (§9 diceva niente scheletro), chiesto.

## Da confermare

- Con il tocco che apre il dettaglio, segnare **«finito» costa due tocchi** invece di uno.
  Alternativa: una pillola 44 sulla tessera che resta interruttore.
