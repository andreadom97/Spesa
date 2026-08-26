# Spesa

App personale che trasforma un piano alimentare già esistente in una lista della spesa
ordinata come cammini nel supermercato. Costruita per uso proprio, con la porta aperta
a un eventuale prodotto.

**Stato: design della v1 chiuso. Nessuna riga di codice applicativo scritta.**
Prossimo passo: piano di implementazione della Fase 1.

## Dove sta cosa

| File | Cosa contiene |
|---|---|
| [`spesa-one-pager.md`](spesa-one-pager.md) | Analisi di mercato e go/no-go. Conclusione: no-go come business allo stato attuale, go come strumento personale |
| [`docs/superpowers/specs/2026-08-26-spesa-design.md`](docs/superpowers/specs/2026-08-26-spesa-design.md) | **La spec.** Modello dati, componenti, fasi, e tutte le decisioni prese durante il design con il loro perché |
| [`docs/superpowers/specs/DESIGN-SYSTEM.md`](docs/superpowers/specs/DESIGN-SYSTEM.md) | Colori, tipografia, forme, regole di stato — valori estratti dalle schermate reali |
| `design/*.dc.html` | 69 artboard. Le 12 definitive sono elencate sotto; il resto è l'archivio delle direzioni esplorate |
| `design/canvas.json` | Impaginazione del canvas: pagina 1 = v1 definitiva, pagina 2 = archivio |
| `design/build.sh` | Rigenera il canvas da tutti gli artboard |

**Canvas pubblicato:** <https://claude.ai/code/artifact/154c7e8b-23fb-4300-bd72-5d71733e4b30>
Per aggiornarlo: `bash design/build.sh`, poi ripubblicare quello stesso URL con lo strumento Artifact.

## Le schermate della v1

Definitive: `Lista`, `Settimana`, `Piatti`, `Piatto`, `Ingrediente`, `Impostazioni`,
`Reparti`, `Scegli`, più gli stati vuoti `VuotoPiatti` (primo avvio/onboarding),
`VuotoLista`, `VuotoFatta`, `VuotoPiatto`.

Tutto il resto in `design/` è archivio: direzioni visive scartate (`Dir*`, `Mag*`,
`Rail*`, `Hero*`), prove di testata e logo (`Hdr*`, `Logo*`, `Grid*`, `Casa*`, `Ico*`),
e varianti di interazione (`Int*`, `Set*`). Servono a non riaprire discussioni già chiuse.

## Le decisioni che non si deducono dal codice

- **Sei aree fisse**, personalizzabile solo il loro ordine. Il marchio dipende da questo:
  se il numero di aree cambia, il logo va rifatto.
- **Niente inventario**: il residuo è derivato da `porzione vs formato confezione`,
  mai inserito a mano. È il cuore del prodotto.
- **Controllo staple a 90 giorni fissi**, non una stima appresa. Ma la v1 registra
  comunque ogni acquisto, così la Fase 4 non parte da zero.
- **Il selettore settimana non naviga** in v1 (la freccia c'è ma è inerte). Le settimane
  vanno comunque salvate.
- **Macro e calorie fuori dalla v1**, con le colonne già previste su `ingredient`.
- **Stack**: Next.js + TypeScript, Supabase con RLS e `user_id` su tutto fin dal primo
  giorno, PWA installabile su Android, offline-first sulla schermata lista.

## Il gate

Fase 1 = repertorio + check-in + lista. Poi **tre settimane di uso reale** prima di
costruire la Fase 2. Se la Fase 1 non viene aperta per tre settimane di fila, le fasi
successive automatizzano un rituale che non esiste e non vanno costruite.
