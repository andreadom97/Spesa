# Foto scontornate al posto delle icone ingrediente — valutazione

**Obiettivo.** Decidere se sostituire le 64 icone di tratto con immagini realistiche scontornate, sapendo
cosa cambia nel design, come produrle in modo scalabile e coerente, e cosa può andare storto. Il documento
funziona se alla fine Andrea può dire sì, no o «prima il pilota» senza dover chiedere altro.

## Conclusione

**Non sostituirle subito. Prima un pilota di 12 foto (2–3 giorni), montato sulle tessere vere nei quattro
stati, e solo dopo la decisione.** Tecnicamente si fa: il sistema delle chiavi (`trovaIcona`) si riusa
così com'è e cambia solo cosa viene disegnato. Il costo vero sta nel design. Una foto annulla tre scelte che
oggi reggono la tessera: il colore d'area portato dall'icona, il nome che passa sopra l'icona con l'alone, e
lo stato spento in grigio. Poi alza l'asticella della correttezza: un pesce di tratto vale per tutti i
pesci, la foto di un salmone accanto a «Merluzzo» è sbagliata. Un pilota costa poco e risponde a tutte e due
le domande con le immagini davanti, che è il modo in cui Andrea decide sul design.

## Da dove si parte

- **102 nomi distinti** di ingredienti in produzione. Con il catalogo attuale **97 hanno un'icona (95%)**,
  e bastano **58 chiavi** per coprirli. Restano senza icona bresaola, mais, prosciutto cotto, prosciutto crudo
  e frutta fresca. [misurato ora: query su `ingredient` + `trovaIcona` sui nomi]
- I nomi li scrive l'utente, oppure li crea l'import dalle diete: il catalogo non è chiuso.
  [fonte: `supabase/migrations/0001_schema.sql`, `ingredient.nome text`]
- L'icona è un SVG inline in `IconaIngrediente`, quindi zero richieste di rete e niente da mettere in cache
  per l'offline. Ha due taglie: 52 px sulla tessera e 84 px sulla protagonista. Sta in basso a destra,
  tagliata dal bordo al 20%, sotto il nome. [fonte: `design/sistema/DESIGN.md` §6, `Tessera.tsx`]
- DESIGN.md §6 e §12 vietano foto e illustrazioni. Le icone ingrediente sono entrate come eccezione
  dichiarata proprio perché sono icone e non illustrazioni (26/09). Passare alle foto vuol dire riscrivere
  la regola, non aggiungere un'altra eccezione. [fonte: DESIGN.md §6, §12]

## Impatto sul design

| Elemento oggi | Cosa succede con una foto | Serve |
|---|---|---|
| **Tono d'area** sull'icona (sei tinte a 2,8:1) | Una foto ha i suoi colori: un pomodoro è rosso in qualunque reparto. L'icona smette di dire l'area e la griglia diventa più rumorosa | Il reparto lo dicono solo bordo, pillola e quadratino. Va verificato che basti |
| **Protagonista**: fondo pieno d'area, icona bianca a 0,42 | Una foto a colori su fondo giallo o verde saturo fa a pugni col fondo, e il bianco a 0,42 non si può applicare a una foto | Ridisegnare la protagonista: foto su un disco chiaro, oppure la protagonista resta di tratto |
| **Taglio al 20%** fuori dal bordo | Su una sagoma di tratto il taglio è grafica. Sulla foto di un cibo sembra un errore di ritaglio [ipotesi, non testata] | Foto intera, dentro la tessera |
| **Nome sopra l'icona con alone** | Su una texture fotografica (crosta, foglie) l'alone a 2 px non basta a tenere leggibile il nome [ipotesi, non testata] | La foto esce da sotto il testo e diventa parte del layout, con una zona riservata |
| **Spento** (presa, finita, mai comprato): `--off` a 0,5 | Si può fare con `grayscale` più opacità, ma un cibo desaturato rischia di sembrare avariato [ipotesi, non testata] | Da provare nel pilota. In alternativa solo opacità |
| **Dispensa in casa**, fondo tinto al 26% | Accettabile: è il caso in cui la foto disturba meno [ipotesi] | — |
| **Identità** (sobria, «il numero onesto», niente contenuti decorativi) | Il tono si sposta verso l'app di ricette, più appetitoso e più generico | Decisione di posizionamento, non tecnica |

Il cambio più grosso è il terzo, cioè il secondo e il terzo insieme: oggi l'icona è un decoro sotto il
testo, la foto diventa contenuto e chiede spazio. Su una tessera da 104 px di altezza minima, in griglia a
due colonne, vuol dire ripensare la composizione della tessera, non sostituire un componente.

## Come ottenerle in modo scalabile e coerente

### Le fonti

| Fonte | Coerenza | Copertura | Licenza | Giudizio |
|---|---|---|---|---|
| **Generate con l'AI** (modello di immagini, prompt fisso + immagine di stile) | Media, la si porta ad alta col post-processing | Illimitata | Uso commerciale ammesso dai principali fornitori; output non proteggibile da copyright [da verificare sul fornitore scelto] | **La strada consigliata** |
| Foto stock scontornate (Unsplash e simili) | Bassa: luce, angolo e scala cambiano da foto a foto | Buona sui comuni, scarsa sulla coda | Varia per foto | Scartare |
| Pacchetti a pagamento di cibi scontornati | Alta | Limitata alla lista del pacchetto: la coda resta scoperta | Licenza d'app da leggere | Solo se un pacchetto copre già ~90 nomi su 102 [non verificato] |
| Shooting proprio | Massima | Lenta, ogni nuovo ingrediente è un set | Proprietaria | Non scala |

### La pipeline (catalogo offline, mai generazione a runtime)

1. **Scheda di stile, scritta una volta.** Angolo a tre quarti a ~30°, una luce da in alto a sinistra, nessuna
   ombra portata, un solo oggetto o una porzione canonica (tre pomodorini, non un cesto), niente confezioni
   né marchi, l'oggetto occupa l'80% del quadrato.
2. **Generazione** con modello e versione bloccati, prompt a modello (`{ingrediente}, {forma canonica}` +
   blocco di stile fisso) e 2–3 immagini già approvate come riferimento di stile. Quattro candidati per
   chiave.
3. **Scontorno automatico** (rimozione dello sfondo), poi **normalizzazione** con uno script: ritaglio al
   riquadro dell'oggetto, occupazione e ancoraggio uguali per tutte, esposizione e bilanciamento del bianco
   riportati a un riferimento, esportazione in WebP con trasparenza a 3× la taglia (156 e 252 px).
4. **Gate di Andrea** sul foglio di tutte le candidate, come per le icone il 26/09. Vale la stessa regola:
   meglio nessuna immagine che una sbagliata.
5. **Consegna:** file versionati in `public/ingredienti/{chiave}.webp`, aggiunti al guscio offline del
   service worker. `trovaIcona` resta com'è, cambia solo il componente che disegna.
6. **Nuovi ingredienti:** finché la chiave non ha la sua foto si mostra l'icona di tratto (o niente). La foto
   nuova entra a lotti, con lo stesso modello e gli stessi riferimenti.

Una cosa da dire chiaramente: il catalogo resta **a chiavi** e non diventa uno-a-uno coi nomi. Oggi 58 chiavi
coprono 97 nomi. Con le foto alcune famiglie vanno spezzate, perché il generico fotografico non esiste: non
c'è una foto valida per «pesce», «formaggio», «spezie» o «erbe». Stima da validare nel pilota: da 58 a circa
80–90 chiavi per la stessa copertura [ipotesi, non testata].

## Rischi

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| **Specificità sbagliata**: salmone per merluzzo, mozzarella per parmigiano | Alta: la famiglia `formaggio` oggi copre 12 nomi | Alto, perché contraddice la regola «meglio nessuna icona che una sbagliata» | Spezzare le famiglie. Dove il generico non esiste, nessuna foto |
| **Deriva di stile nel tempo**: le foto aggiunte fra sei mesi, con un modello aggiornato, non somigliano alle prime | Alta | Medio: la griglia sembra montata da più mani | Bloccare la versione del modello, conservare prompt, seed e immagini di riferimento, rinormalizzare ogni lotto contro lo stesso riferimento |
| **Coda scoperta più visibile**: una tessera senza immagine in mezzo a tessere con foto spicca più di oggi | Certa, sul 5% attuale e su ogni nome nuovo | Medio | Ripiego sull'icona di tratto. Due linguaggi insieme sono però un debito da accettare apertamente |
| **Marchi**: «Philadelphia» è fra i nomi in produzione, e un modello può disegnare la confezione col logo | Media | Alto (legale) | Prompt sempre generici («formaggio spalmabile in ciotola»), confezioni vietate nella scheda di stile, controllo al gate |
| **Artefatti dell'AI**: foglie in più, texture plastica, sagome strane | Media | Medio | Quattro candidati per chiave e gate umano |
| **Leggibilità del nome** sopra o accanto alla foto | Da misurare | Alto: è il dato principale della tessera | Foto fuori da sotto il testo (vedi la tabella sull'impatto) |
| **Peso e offline**: da 0 richieste a ~90 file | Certa | Basso: WebP da 5 a 8 KB l'uno a 200 px [misurato sulle 5 del pilota] | Caricamento lazy e file nel guscio del service worker |
| **Tempo di Andrea al gate** su ~90 chiavi × 4 candidati | Certa | Medio | Il pilota da 12 dice quanto costa per chiave prima di impegnarsi |

Nessun prezzo di generazione in questo documento: dipende dal fornitore e non l'ho verificato. L'ordine di
grandezza attesa è basso rispetto al tempo di gate [ipotesi].

## Il pilota proposto

- **Le stesse 12 chiavi del pilota delle icone** (bistecca, cosciotto, pesce, carota, pomodoro, uovo,
  latte, formaggio, pasta, pane, legumi, piselli). Il confronto è diretto e comprende tre famiglie difficili
  (pesce, formaggio, legumi).
- **Due varianti di composizione:** A, foto a destra dentro la tessera, senza taglio e fuori da sotto il
  nome; B, foto su un disco chiaro, che risolve anche la protagonista.
- **Montate su `Tessera` vera** in quattro stati: normale, protagonista, spenta, Dispensa in casa. Più una
  griglia di 20 tessere miste per giudicare il rumore d'insieme, accanto alla versione di tratto di oggi.
- **Criteri di decisione:** il nome si legge al primo colpo; l'ingrediente si riconosce a 52 px; la griglia
  non è più rumorosa della Lista di oggi; lo spento non sembra avariato; le 12 sembrano uscite da un unico
  set.
- **Gate:** se passano, si aggiornano DESIGN.md §6 e §12 (regola nuova, non eccezione) e si produce il
  resto a lotti. Se non passano, le icone restano e si chiudono i 5 nomi scoperti con icone di tratto.

## Stato del pilota (03/10)

5 chiavi su 12 generate con Canva (pomodoro, bistecca, cosciotto, pesce, carota): i crediti sono finiti
dopo 5 immagini. Lo scontorno con Canva non ha consumato crediti. Pagina di confronto con le varianti C, A
e B: https://claude.ai/artifact/Aw2RR7ME5fwFZ4whnHLfqt. File in `design/pilota-foto/` (sorgenti,
`normalizza.py`, `costruisci.py`, `modello.html`).
