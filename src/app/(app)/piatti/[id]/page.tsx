'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Componente, Dish, DishIngredient, Ingredient, MealSlotDef } from '@/domain/types';
import { salvaPiatto, leggiRepertorio, leggiIngredienti, eliminaPiatto } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { giorniDellaSettimana } from '@/domain/date';
import { Segmento } from '@/components/Segmento';
import { TesseraIngrediente } from '@/components/TesseraIngrediente';
import { TestataModifica } from '@/components/TestataModifica';
import { Dock, ErroreSopraDock } from '@/components/Dock';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { Blocco, Etichetta, MessaggioErrore, TastoSecondario } from '@/components/controlli';
import { useNascondiBarra } from '@/components/barra-context';
import { AggiungiTratteggiato } from '@/components/AggiungiTratteggiato';
import { Carico, Nota } from '@/components/pannello/pezzi';
import { raccogliIngredienteCreato, riprendiBozza, salvaBozza, scartaBozza, type BozzaPiatto } from './bozza';
import { SelettoreIngrediente } from './SelettoreIngrediente';
import { ComponentiPiatto } from './ComponentiPiatto';

const GIORNI_LABEL = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const TESTO_SENZA_INGREDIENTI =
  'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ' +
  'ingrediente a dire quanto comprare. Aggiungine almeno uno.';

const TESTO_NON_IN_PROGRAMMA =
  'Non ancora in programma. Comparirà qui appena lo assegni a un pasto dalla Settimana.';

const TESTO_ELIMINA =
  'Non comparirà più nel repertorio né nelle prossime settimane. Le settimane già passate restano invariate.';

/** Il testo di oggi dell'eliminazione fallita: dalla fase 7 lo mostra il Dialogo di conferma, sotto i tasti. */
const ERRORE_ELIMINA = 'Non siamo riusciti a eliminare il piatto. Riprova.';

/**
 * Stesso vincolo di `check (quantita > 0)` che vale per `ingredienti`, esteso
 * alle righe delle opzioni: sono la stessa tabella (`dish_ingredient`,
 * `option_id` non nullo), quindi la stessa violazione che I2 ha già corretto
 * per la lista fissa vale identica qui. Un componente senza nome o
 * un'opzione senza righe sono gli altri due modi in cui il salvataggio
 * scriverebbe qualcosa che salvaPiatto (Task 7) non può accettare o che
 * l'editor non potrebbe più mostrare in modo distinguibile.
 */
function componentiNonValidi(componenti: Componente[]): boolean {
  return componenti.some(
    (c) =>
      c.nome.trim() === '' ||
      c.opzioni.some((o) => o.righe.length === 0 || o.righe.some((r) => r.quantita <= 0)),
  );
}

// Solo 0-7 possibili (sette giorni): un lookup fisso è sicuro qui, a
// differenza di provare a pluralizzare un nome di pasto scritto liberamente
// dall'utente (quello sì fragile, ed è il motivo per cui la frase sotto non
// riproduce il gioco di parole "Sei... sei al bar" del mock).
const NUMERI_PAROLA = ['zero', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette'];

function volte(n: number): string {
  return n === 1 ? 'una volta' : `${NUMERI_PAROLA[n]} volte`;
}

/**
 * La frase di riepilogo sotto la striscia dei giorni, mostrata solo quando
 * il piatto è davvero in programma questa settimana (altrimenti si usa il
 * riquadro muto con TESTO_NON_IN_PROGRAMMA, copiato alla lettera da
 * VuotoPiatto.dc.html — niente striscia in quel caso, vedi il render).
 *
 * Non c'è un testo imposto dall'artboard per questo caso (in Piatto.dc.html
 * è un dato di mock, non copy fisso): tenendo dal mock i numeri scritti in
 * lettere e la struttura in due tempi — prima cosa succede in settimana, poi
 * la conseguenza sulla lista — senza il gioco di parole, che non regge con
 * un conteggio o un nome di pasto qualsiasi.
 */
function testoRiepilogo(nCasa: number, nFuori: number): string {
  if (nCasa === 0) {
    return `Fuori casa ${volte(nFuori)} questa settimana: non entra nella lista.`;
  }
  let frase = `In casa ${volte(nCasa)} questa settimana`;
  if (nFuori > 0) frase += `, fuori ${volte(nFuori)}`;
  frase += `. Il piatto entra ${volte(nCasa)} nella lista.`;
  return frase;
}

/** Il modulo dell'editor: gli stessi sette campi che la bozza mette al riparo e che SALVA scrive. */
type ModuloPiatto = BozzaPiatto;

const MODULO_NUOVO: ModuloPiatto = {
  nome: '', slotDefId: '', descrizione: '', settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
};

/**
 * Il confronto «è cambiato qualcosa?» (spec fase 7 §B.5, come `firma` dell'editor
 * dell'ingrediente): i sette campi del modulo con i valori grezzi — nome, pasto,
 * settimana e giorno del ciclo, ingredienti, componenti, descrizione. Le righe
 * contano in ordine e per valore (ingrediente, quantità, unità); i componenti e le
 * opzioni anche per id, perché salvaPiatto li riscrive in blocco. Tuple e non
 * oggetti: l'ordine delle chiavi di un oggetto letto dal server o dalla bozza non
 * deve contare.
 */
function firma(m: ModuloPiatto): string {
  const righe = (rr: DishIngredient[]) => rr.map((r) => [r.ingredientId, r.quantita, r.unita]);
  return JSON.stringify([
    m.nome,
    m.slotDefId,
    m.settimanaCiclo,
    m.giornoCiclo,
    righe(m.ingredienti),
    m.componenti.map((c) => [c.id, c.nome, c.opzioni.map((o) => [o.id, righe(o.righe)])]),
    m.descrizione,
  ]);
}

const FIRMA_NUOVO = firma(MODULO_NUOVO);

/** Il modulo come lo scrive il piatto letto dal server: la firma di riferimento di un piatto esistente. */
function moduloDaPiatto(p: Dish): ModuloPiatto {
  return {
    nome: p.nome, slotDefId: p.slotDefId, descrizione: p.descrizione ?? '', settimanaCiclo: p.settimanaCiclo,
    giornoCiclo: p.giornoCiclo, ingredienti: p.ingredienti, componenti: p.componenti,
  };
}

/**
 * Editor della ricetta: crea (`id === 'nuovo'`) o modifica un piatto del
 * repertorio. Dalla fase 7 ha un modo solo, come l'editor dell'ingrediente
 * (spec §B.2): si apre sempre modificabile, con la testata di modifica (la
 * freccia verso /piatti e il nome come campo), senza tab bar, e SALVA nel Dock
 * spento finché niente cambia o finché il modulo non è valido. Aprire un
 * piatto per guardarlo non scrive niente: si scrive solo con SALVA.
 */
export default function Piatto() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const nuovo = id === 'nuovo';
  // Pagina di modifica piena, senza tab bar (spec fase 7 §B.2): il Dock scende a 22 da sé.
  useNascondiBarra(true);

  const [caricamento, setCaricamento] = useState(true);
  const [erroreCarica, setErroreCarica] = useState<string | null>(null);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [slotDefs, setSlotDefs] = useState<MealSlotDef[]>([]);
  const [catalogo, setCatalogo] = useState<Ingredient[]>([]);
  const [piattoOriginale, setPiattoOriginale] = useState<Dish | null>(null);
  // La firma del piatto letto dal server, prima della bozza: null finché non c'è.
  const [firmaIniziale, setFirmaIniziale] = useState<string | null>(null);
  const [giorniCasa, setGiorniCasa] = useState<Set<string>>(new Set());
  const [giorniFuori, setGiorniFuori] = useState<Set<string>>(new Set());
  const [dataInizioSettimana, setDataInizioSettimana] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [slotDefId, setSlotDefId] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [settimanaCiclo, setSettimanaCiclo] = useState<number | null>(null);
  const [giornoCiclo, setGiornoCiclo] = useState<number | null>(null);
  // Quante settimane ha il ciclo: sotto le due, la scelta della settimana non
  // ha nulla fra cui scegliere e la sezione non compare.
  const [settimaneCiclo, setSettimaneCiclo] = useState(1);
  const [ingredienti, setIngredienti] = useState<DishIngredient[]>([]);
  const [componenti, setComponenti] = useState<Componente[]>([]);
  // null = chiuso. 'principale' apre il selettore per `ingredienti` (comportamento
  // di sempre); 'opzione' lo apre per le righe di una singola opzione di un
  // componente — stesso selettore, target diverso, per non duplicare il
  // pattern (selezione, ricerca, "nessun risultato") su due liste.
  const [selettore, setSelettore] = useState<
    { tipo: 'principale' } | { tipo: 'opzione'; componenteId: string; opzioneId: string } | null
  >(null);
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const nomeRef = useRef<HTMLTextAreaElement>(null);

  // Il titolo va a capo su più righe come nell'artboard (che lo scrive con un
  // <br>): un <input> a riga singola l'avrebbe semplicemente tagliato fuori
  // dallo schermo. La textarea si auto-ridimensiona sul contenuto reale. Anche
  // su `caricamento`: la textarea nasce a caricamento finito, con il nome già scritto.
  useEffect(() => {
    const el = nomeRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [nome, caricamento]);

  useEffect(() => {
    let vivo = true;
    async function carica() {
      try {
        const [defs, catalogoIngredienti, settimana, repertorio, impostazioni] = await Promise.all([
          leggiSlotDefs(),
          leggiIngredienti(),
          leggiSettimanaCorrente(),
          nuovo ? Promise.resolve(null) : leggiRepertorio(),
          leggiImpostazioni(),
        ]);
        if (!vivo) return;
        setSlotDefs(defs);
        setCatalogo(catalogoIngredienti);
        setSettimaneCiclo(impostazioni.settimaneCiclo);
        if (settimana) setDataInizioSettimana(settimana.dataInizio);

        if (!nuovo) {
          const trovato = (repertorio ?? []).find((p) => p.id === id) ?? null;
          if (!trovato) {
            setErroreCarica('Piatto non trovato.');
          } else {
            setPiattoOriginale(trovato);
            setNome(trovato.nome);
            setSlotDefId(trovato.slotDefId);
            setDescrizione(trovato.descrizione ?? '');
            setSettimanaCiclo(trovato.settimanaCiclo);
            setGiornoCiclo(trovato.giornoCiclo);
            setIngredienti(trovato.ingredienti);
            // Byte per byte, id compresi: senza questo, salva() passava
            // sempre `componenti: []` a salvaPiatto (Task 7), che li riscrive
            // in blocco — aprire e salvare senza toccare nulla avrebbe
            // azzerato in cascata dish_option, le righe di opzione e
            // meal_slot_choice di un piatto già in uso (nota della review
            // del Task 1).
            setComponenti(trovato.componenti);
            // Il riferimento di «è cambiato qualcosa?» è il piatto del server,
            // non la bozza che si applica sotto: una bozza ripresa è lavoro non
            // salvato, e SALVA deve accendersi.
            setFirmaIniziale(firma(moduloDaPiatto(trovato)));
            if (settimana) {
              const casa = new Set<string>();
              const fuori = new Set<string>();
              for (const s of settimana.slots) {
                if (s.dishId !== trovato.id) continue;
                if (s.stato === 'casa') casa.add(s.data);
                else fuori.add(s.data);
              }
              setGiorniCasa(casa);
              setGiorniFuori(fuori);
            }
          }
        }

        // Dopo i dati veri, non prima: la bozza è più recente di quello che
        // c'è sul server (è lavoro non ancora salvato) e deve vincere.
        const bozza = riprendiBozza(id);
        if (bozza) {
          setNome(bozza.nome);
          setSlotDefId(bozza.slotDefId);
          setDescrizione(bozza.descrizione);
          setSettimanaCiclo(bozza.settimanaCiclo);
          setGiornoCiclo(bozza.giornoCiclo);
          setIngredienti(bozza.ingredienti);
          setComponenti(bozza.componenti);
        }

        // Chi è appena tornato dalla creazione di un ingrediente lo aveva
        // creato per questo piatto: entra da solo, con grammatura da
        // scrivere. Il catalogo appena letto è la fonte dell'unità di base.
        const creato = raccogliIngredienteCreato(id);
        if (creato) {
          const ing = catalogoIngredienti.find((i) => i.id === creato);
          if (ing) {
            setIngredienti((prev) =>
              prev.some((r) => r.ingredientId === creato)
                ? prev
                : [...prev, { ingredientId: creato, quantita: 0, unita: ing.unitaBase }],
            );
          }
        }
      } catch (errore) {
        console.error('piatto: caricamento fallito.', errore);
        if (vivo) setErroreCarica('Non riusciamo a caricare il piatto. Riprova più tardi.');
      } finally {
        if (vivo) setCaricamento(false);
      }
    }
    carica();
    return () => {
      vivo = false;
    };
  }, [id, nuovo]);

  /**
   * Unico punto in cui il selettore aggiunge davvero un ingrediente,
   * qualunque sia il target aperto: alla lista fissa `ingredienti` o alle
   * righe di un'opzione. Stesso selettore, stesso comportamento di sempre,
   * solo con una destinazione in più. Chiuderlo smonta `SelettoreIngrediente`
   * e con lui la ricerca: riaprendolo si riparte dall'elenco intero, perché la
   * ricerca di prima non ha niente a che vedere con l'ingrediente successivo.
   */
  function aggiungiIngrediente(ing: Ingredient) {
    if (!selettore) return;
    if (selettore.tipo === 'principale') {
      setIngredienti((prev) => [...prev, { ingredientId: ing.id, quantita: 0, unita: ing.unitaBase }]);
    } else {
      aggiungiRigaOpzione(selettore.componenteId, selettore.opzioneId, ing);
    }
    setSelettore(null);
  }

  function cambiaQuantita(ingredientId: string, quantita: number) {
    setIngredienti((prev) => prev.map((r) => (r.ingredientId === ingredientId ? { ...r, quantita } : r)));
  }

  function rimuoviIngrediente(ingredientId: string) {
    setIngredienti((prev) => prev.filter((r) => r.ingredientId !== ingredientId));
  }

  /**
   * Nome + prima opzione vuota, come da brief: un componente senza opzioni
   * non avrebbe nulla da mostrare in Scegli, quindi nasce sempre con una.
   */
  function aggiungiComponente() {
    setComponenti((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: '', opzioni: [{ id: crypto.randomUUID(), righe: [] }] },
    ]);
  }

  function rimuoviComponente(componenteId: string) {
    setComponenti((prev) => prev.filter((c) => c.id !== componenteId));
  }

  function cambiaNomeComponente(componenteId: string, nome: string) {
    setComponenti((prev) => prev.map((c) => (c.id === componenteId ? { ...c, nome } : c)));
  }

  function aggiungiOpzione(componenteId: string) {
    setComponenti((prev) =>
      prev.map((c) =>
        c.id === componenteId ? { ...c, opzioni: [...c.opzioni, { id: crypto.randomUUID(), righe: [] }] } : c,
      ),
    );
  }

  /**
   * Un componente sotto 1 opzione si elimina: sotto quella soglia il
   * componente non avrebbe più niente fra cui scegliere (brief, Step 1).
   */
  function rimuoviOpzione(componenteId: string, opzioneId: string) {
    setComponenti((prev) =>
      prev.flatMap((c) => {
        if (c.id !== componenteId) return [c];
        if (c.opzioni.length <= 1) return [];
        return [{ ...c, opzioni: c.opzioni.filter((o) => o.id !== opzioneId) }];
      }),
    );
  }

  function aggiungiRigaOpzione(componenteId: string, opzioneId: string, ing: Ingredient) {
    setComponenti((prev) =>
      prev.map((c) => {
        if (c.id !== componenteId) return c;
        return {
          ...c,
          opzioni: c.opzioni.map((o) => {
            if (o.id !== opzioneId) return o;
            // Stesso vincolo del catalogo principale (unique index
            // dish_ingredient_opzione_unica): un ingrediente non può comparire
            // due volte nella stessa opzione.
            if (o.righe.some((r) => r.ingredientId === ing.id)) return o;
            return { ...o, righe: [...o.righe, { ingredientId: ing.id, quantita: 0, unita: ing.unitaBase }] };
          }),
        };
      }),
    );
  }

  function cambiaQuantitaOpzione(componenteId: string, opzioneId: string, ingredientId: string, quantita: number) {
    setComponenti((prev) =>
      prev.map((c) => {
        if (c.id !== componenteId) return c;
        return {
          ...c,
          opzioni: c.opzioni.map((o) =>
            o.id !== opzioneId
              ? o
              : { ...o, righe: o.righe.map((r) => (r.ingredientId === ingredientId ? { ...r, quantita } : r)) },
          ),
        };
      }),
    );
  }

  function rimuoviRigaOpzione(componenteId: string, opzioneId: string, ingredientId: string) {
    setComponenti((prev) =>
      prev.map((c) => {
        if (c.id !== componenteId) return c;
        return {
          ...c,
          opzioni: c.opzioni.map((o) =>
            o.id !== opzioneId ? o : { ...o, righe: o.righe.filter((r) => r.ingredientId !== ingredientId) },
          ),
        };
      }),
    );
  }

  /**
   * Da chiamare prima di ogni uscita verso l'editor di un ingrediente: è
   * l'unica navigazione che si porta via lavoro non salvato, perché il
   * piatto qui esiste solo in memoria finché non si preme SALVA.
   */
  function riparaBozzaPrimaDiUscire() {
    salvaBozza(id, { nome, slotDefId, descrizione, settimanaCiclo, giornoCiclo, ingredienti, componenti });
  }

  /**
   * La freccia (spec fase 7 §B.2): esce verso /piatti senza chiedere, e le
   * modifiche non salvate si perdono, come con ANNULLA prima della fase 7. La
   * bozza si tratta come la trattava ANNULLA: su un piatto esistente si scarta,
   * perché un giro completo (uscita e rientro) non risusciti modifiche appena
   * buttate; su un piatto nuovo ANNULLA usciva senza toccarla, e così resta.
   * Solo a piatto caricato, come ANNULLA che esisteva solo lì: in caricamento o
   * dopo un caricamento fallito la bozza non è ancora stata ripresa, e c'era solo
   * il link della vecchia intestazione, che non la toccava (review Task 6, R1).
   */
  function esci() {
    if (!nuovo && piattoOriginale) scartaBozza(id);
    router.push('/piatti');
  }

  /**
   * La conferma del Dialogo (spec fase 7 §B.3 punto 7). Se l'eliminazione
   * fallisce l'errore si rilancia: il Dialogo lo mostra sotto i tasti e resta
   * aperto. Se riesce, come prima: via la bozza e ritorno a /piatti.
   */
  async function confermaElimina(): Promise<void> {
    if (!piattoOriginale) return;
    try {
      await eliminaPiatto(piattoOriginale.id);
    } catch (errore) {
      console.error('piatto: eliminazione fallita.', errore);
      throw errore;
    }
    scartaBozza(id);
    setConfermaEliminazione(false);
    router.push('/piatti');
  }

  const catalogoPerId = new Map(catalogo.map((i) => [i.id, i]));

  // La lista da cui il selettore esclude ciò che c'è già dipende dal target
  // aperto: `ingredienti` per il selettore principale, le righe della
  // singola opzione per quello aperto da un componente. Stesso selettore,
  // deduplica sulla lista giusta.
  const righeTargetSelettore: DishIngredient[] =
    selettore?.tipo === 'opzione'
      ? (componenti.find((c) => c.id === selettore.componenteId)?.opzioni.find((o) => o.id === selettore.opzioneId)
          ?.righe ?? [])
      : ingredienti;
  const nonAncoraNelPiatto = catalogo.filter((i) => !righeTargetSelettore.some((r) => r.ingredientId === i.id));

  const giorniSettimana = dataInizioSettimana ? giorniDellaSettimana(dataInizioSettimana) : [];
  const giorni = GIORNI_LABEL.map((label, i) => {
    const iso = giorniSettimana[i];
    return { label, inProgramma: iso ? giorniCasa.has(iso) : false };
  });
  const nCasa = giorni.filter((g) => g.inProgramma).length;
  const nFuori = giorniFuori.size;

  const senzaIngredienti = ingredienti.length === 0;
  // dish_ingredient ha `check (quantita > 0)`: un ingrediente aggiunto e mai
  // toccato parte da quantita: 0 (vedi aggiungiIngrediente sopra) e
  // salverebbe sempre lo stesso errore generico, senza dire quale tessera è
  // il problema (I2). Il salvataggio resta disattivato finché non è > 0.
  const quantitaNonValide = new Set(ingredienti.filter((r) => r.quantita <= 0).map((r) => r.ingredientId));

  const salvataggioDisabilitato =
    senzaIngredienti || quantitaNonValide.size > 0 || componentiNonValidi(componenti);
  const modulo: ModuloPiatto = { nome, slotDefId, descrizione, settimanaCiclo, giornoCiclo, ingredienti, componenti };
  const cambiato = firma(modulo) !== (nuovo ? FIRMA_NUOVO : firmaIniziale);
  // Spento se non è cambiato niente o se il modulo non è valido (spec fase 7 §B.5):
  // la ragione della seconda resta scritta nel modulo, dove sta.
  const spento = salvataggioDisabilitato || !cambiato;

  async function salva() {
    if (spento || salvando) return;
    setSalvando(true);
    setErroreSalva(null);
    try {
      // Fallback silenzioso sul primo pasto se l'utente non ne ha ancora
      // scelto uno: la schermata non blocca il salvataggio su questo (solo
      // sugli ingredienti, per Step 4), ma dish.slot_def_id non è nullable.
      const slotEffettivo = slotDefId || slotDefs[0]?.id || '';
      const nomeEffettivo = nome.trim();
      const descrizioneEffettiva = descrizione.trim() || null;
      // Una settimana del ciclo che il ciclo non contiene più (si è passati
      // da quattro settimane a due) filtrerebbe via il piatto per sempre: si
      // scrive solo quello che il ciclo corrente può ancora usare.
      const settimanaEffettiva = settimanaCiclo !== null && settimanaCiclo <= settimaneCiclo ? settimanaCiclo : null;
      const componentiEffettivi = componenti.map((c) => ({
        id: c.id,
        nome: c.nome.trim(),
        opzioni: c.opzioni.map((o) => ({ id: o.id, righe: o.righe })),
      }));
      await salvaPiatto({
        id: nuovo ? undefined : id,
        nome: nomeEffettivo,
        slotDefId: slotEffettivo,
        fonte: piattoOriginale?.fonte ?? 'proprio',
        attivo: piattoOriginale?.attivo ?? true,
        descrizione: descrizioneEffettiva,
        settimanaCiclo: settimanaEffettiva,
        giornoCiclo,
        ingredienti,
        componenti: componentiEffettivi,
      });
      scartaBozza(id);
      // SALVA torna a /piatti anche su un piatto esistente (spec fase 7 §B.5): la
      // vista a cui tornava prima non c'è più. `salvando` resta vero: la pagina si
      // smonta, e un secondo tocco nel frattempo non riscrive.
      router.push('/piatti');
    } catch (errore) {
      console.error('piatto: salvataggio fallito.', errore);
      setErroreSalva('Non siamo riusciti a salvare il piatto. Riprova.');
      setSalvando(false);
    }
  }

  const freccia = { etichetta: 'Torna ai piatti', onTorna: esci };

  if (erroreCarica) {
    // Niente Dock e niente ELIMINA: su un piatto che non si è letto non c'è niente da salvare né da eliminare.
    return (
      <TestataModifica freccia={freccia}>
        <div style={{ padding: '6px 16px' }}>
          <MessaggioErrore ruolo="alert">{erroreCarica}</MessaggioErrore>
        </div>
      </TestataModifica>
    );
  }

  if (caricamento) {
    return (
      <TestataModifica freccia={freccia}>
        <div style={{ padding: '6px 16px' }}>
          <Carico />
        </div>
      </TestataModifica>
    );
  }

  return (
    <TestataModifica
      freccia={freccia}
      nome={
        <textarea
          ref={nomeRef}
          rows={1}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            // Il nome è una stringa sola: va a capo da solo per lunghezza,
            // non deve poter contenere newline inseriti a mano.
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder="Dai un nome al piatto"
          className="nome-piatto"
          style={{
            display: 'block', width: '100%', resize: 'none', overflow: 'hidden',
            fontFamily: 'inherit', fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05,
            color: 'var(--ink)', padding: '0 2px 8px', border: 'none',
            borderBottom: '1.5px solid rgba(20,22,58,0.14)', background: 'transparent', outline: 'none',
          }}
        />
      }
    >
      <style jsx>{`
        .nome-piatto::placeholder,
        .ricetta::placeholder {
          color: var(--icona-spenta);
        }
      `}</style>

      <div
        className="sc scroll-app con-dock"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Blocco primo>
          <Segmento
            opzioni={slotDefs.map((s) => ({ id: s.id, label: s.nome }))}
            valore={slotDefId}
            onCambia={setSlotDefId}
          />
        </Blocco>

        {/* Dove sta il piatto nel piano: la settimana del giro e il giorno
            fisso. Entrambi facoltativi — un piatto senza niente di dichiarato
            resta buono per tutte le settimane e per tutti i giorni, che è
            come si comportava il repertorio prima della rotazione. La
            settimana compare solo se un ciclo c'è: con una sola settimana non
            avrebbe nulla fra cui scegliere. */}
        <Blocco>
          <Etichetta>NEL PIANO</Etichetta>
          {settimaneCiclo > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Etichetta>SETTIMANA DEL GIRO</Etichetta>
              <Pillole
                opzioni={[
                  { valore: null, label: 'TUTTE', descrizione: 'Va bene in ogni settimana del giro' },
                  ...Array.from({ length: settimaneCiclo }, (_, i) => ({
                    valore: i + 1,
                    label: String(i + 1),
                    descrizione: `Settimana ${i + 1} del giro`,
                  })),
                ]}
                valore={settimanaCiclo}
                onCambia={setSettimanaCiclo}
                gruppo="Settimana del giro"
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Etichetta>GIORNO FISSO</Etichetta>
            <Pillole
              opzioni={[
                { valore: null, label: 'LIBERO', descrizione: 'Lo sceglie l’app, ruotando' },
                ...GIORNI_LABEL.map((label, i) => ({ valore: i, label, descrizione: GIORNI_LUNGHI[i] })),
              ]}
              valore={giornoCiclo}
              onCambia={setGiornoCiclo}
              gruppo="Giorno fisso"
              aCapo
            />
          </div>
        </Blocco>

        <Blocco>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Etichetta>INGREDIENTI</Etichetta>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--sec)' }}>
              PER 1 PORZIONE
            </span>
          </div>

          {ingredienti.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {ingredienti.map((riga) => {
                const ing = catalogoPerId.get(riga.ingredientId);
                if (!ing) return null;
                return (
                  <TesseraIngrediente
                    key={riga.ingredientId}
                    nome={ing.nome}
                    area={ing.area}
                    quantita={riga.quantita}
                    unita={riga.unita}
                    onCambiaQuantita={(q) => cambiaQuantita(riga.ingredientId, q)}
                    onRimuovi={() => rimuoviIngrediente(riga.ingredientId)}
                    quantitaValida={!quantitaNonValide.has(riga.ingredientId)}
                    hrefModifica={`/piatti/${id}/ingredienti/${riga.ingredientId}`}
                    onPrimaDiModificare={riparaBozzaPrimaDiUscire}
                  />
                );
              })}
            </div>
          )}

          <AggiungiTratteggiato etichetta="AGGIUNGI INGREDIENTE" onClick={() => setSelettore({ tipo: 'principale' })} />

          {/* Una Nota e non un errore (DESIGN.md §8 Messaggi): dice perché SALVA è
              spento. Su un piatto nuovo c'è dalla prima apertura, e lì non ha niente
              di sbagliato da segnalare: manca solo quello che si sta per scrivere. */}
          {senzaIngredienti && <Nota>{TESTO_SENZA_INGREDIENTI}</Nota>}

          {/* Il bordo rosso della tessera segnala che qualcosa non va, ma non
              dice cosa fare, e il numero in alto nella tessera non si legge
              come un campo da riempire — sembra un'etichetta. Senza questa
              riga il salvataggio resta bloccato senza spiegazione: si prova a
              toccare in giro finché non si scopre da soli che quel numero si
              scrive. Nominare gli ingredienti che mancano evita anche di
              doverli cercare a occhio in una griglia lunga. */}
          {!senzaIngredienti && quantitaNonValide.size > 0 && (
            <MessaggioErrore>
              {quantitaNonValide.size === 1 ? 'Manca la grammatura di' : 'Mancano le grammature di'}{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>
                {ingredienti
                  .filter((r) => quantitaNonValide.has(r.ingredientId))
                  .map((r) => catalogoPerId.get(r.ingredientId)?.nome)
                  .filter(Boolean)
                  .join(', ')}
              </strong>
              : tocca il numero sulla tessera e scrivi quanto ne usi per una porzione.
            </MessaggioErrore>
          )}
        </Blocco>

        <Blocco>
          <ComponentiPiatto
            componenti={componenti}
            catalogoPerId={catalogoPerId}
            onAggiungiComponente={aggiungiComponente}
            onRimuoviComponente={rimuoviComponente}
            onCambiaNomeComponente={cambiaNomeComponente}
            onAggiungiOpzione={aggiungiOpzione}
            onRimuoviOpzione={rimuoviOpzione}
            onAggiungiIngrediente={(componenteId, opzioneId) => setSelettore({ tipo: 'opzione', componenteId, opzioneId })}
            onCambiaQuantita={cambiaQuantitaOpzione}
            onRimuoviRiga={rimuoviRigaOpzione}
          />
        </Blocco>

        <Blocco>
          <Etichetta>COME SI FA</Etichetta>
          <textarea
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Il procedimento, se serve ricordarlo"
            aria-label="Procedimento del piatto"
            rows={4}
            className="ricetta"
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box', resize: 'none',
              fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, color: 'var(--ink)',
              padding: '13px 14px', borderRadius: 14,
              background: 'var(--superficie)', border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)', outline: 'none',
            }}
          />
        </Blocco>

        <Blocco>
          {nCasa === 0 && nFuori === 0 ? (
            // Non in programma: niente striscia di sette giorni tutti spenti
            // (rumore che non dice niente) — il riquadro muto di
            // VuotoPiatto.dc.html, copiato alla lettera, dice cosa manca e
            // cosa fare per rimediare.
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--icona-spenta)' }}>
                IN QUESTA SETTIMANA
              </span>
              <div style={{ padding: '16px 18px', borderRadius: 18, background: 'var(--spento)', fontSize: 13, lineHeight: 1.45, color: 'var(--testo-2)' }}>
                {TESTO_NON_IN_PROGRAMMA}
              </div>
            </>
          ) : (
            <>
              <Etichetta>IN QUESTA SETTIMANA</Etichetta>
              <div style={{ display: 'flex', gap: 5 }}>
                {giorni.map((g) => (
                  <span
                    key={g.label}
                    style={{
                      flex: '1 1 0%', textAlign: 'center', padding: '11px 0', borderRadius: 12,
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: g.inProgramma ? 700 : 500, letterSpacing: '0.07em',
                      color: g.inProgramma ? 'var(--superficie)' : 'var(--ter)',
                      background: g.inProgramma ? 'var(--ink)' : 'var(--spento)',
                    }}
                  >
                    {g.label}
                  </span>
                ))}
              </div>
              <p style={{ margin: '2px 4px 0', fontSize: 13, lineHeight: 1.45, color: 'var(--testo-2)' }}>
                {testoRiepilogo(nCasa, nFuori)}
              </p>
            </>
          )}
        </Blocco>

        {/* ELIMINA in coda (spec fase 7 §B.3 punto 7), solo su un piatto che esiste:
            su uno nuovo non c'è niente da eliminare, e la freccia fa quel lavoro.
            Passa sempre dal Dialogo di conferma, mai con un tocco solo. Il nome
            accessibile è quello del cestino di prima. */}
        {!nuovo && (
          <Blocco>
            <TastoSecondario aria-label="Elimina piatto" onClick={() => setConfermaEliminazione(true)} style={{ color: 'var(--errore)' }}>
              ELIMINA
            </TastoSecondario>
          </Blocco>
        )}
      </div>

      <Dock>
        {/* Sopra il Dock, come in Scegli e nell'editor dell'ingrediente: fuori dalla pillola,
            su fondo bianco, perché sotto scorre la pagina. */}
        {erroreSalva && <ErroreSopraDock>{erroreSalva}</ErroreSopraDock>}
        {/* In volo lo stato spento del sistema (`.dock-primario:disabled`, DESIGN.md §13,
            26/09, punto 6), non l'opacità: con l'opacità il testo bianco scende sotto soglia. */}
        <button
          type="button"
          className="dock-primario"
          onClick={() => void salva()}
          disabled={spento || salvando}
          aria-busy={salvando || undefined}
        >
          SALVA
        </button>
      </Dock>

      {selettore && (
        <SelettoreIngrediente
          ingredienti={nonAncoraNelPiatto}
          onScegli={aggiungiIngrediente}
          onChiudi={() => setSelettore(null)}
          hrefNuovo={`/piatti/${id}/ingredienti/nuovo`}
          onPrimaDiCreare={riparaBozzaPrimaDiUscire}
        />
      )}

      {confermaEliminazione && (
        <FoglioDalBasso
          etichetta="Eliminare questo piatto?"
          onChiudi={() => setConfermaEliminazione(false)}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
          livello={2}
        >
          <DialogoConferma
            titolo="Eliminare questo piatto?"
            testo={TESTO_ELIMINA}
            azione="ELIMINA"
            tono="distruttivo"
            erroreTesto={ERRORE_ELIMINA}
            onConferma={confermaElimina}
            onAnnulla={() => setConfermaEliminazione(false)}
          />
        </FoglioDalBasso>
      )}
    </TestataModifica>
  );
}

interface OpzionePillola {
  valore: number | null;
  label: string;
  descrizione: string;
}

/**
 * Fila di pillole a scelta singola, con `null` come prima opzione: è la
 * forma che serve qui, dove "non deciso" è una scelta legittima e va detta
 * esplicitamente invece di essere l'assenza di selezione.
 *
 * L'area di tap è 44px anche se la pillola disegnata è più bassa, come in
 * Segmento: la regola dei bersagli vale ovunque, non solo dove il disegno è
 * già abbastanza alto. Dalla fase 7 la pillola è anche larga almeno 44
 * (`minWidth`, prima 42): il bottone è largo quanto lei, e le pillole di una
 * cifra della settimana del giro (`1`, `2`) davano un bersaglio di 42. Dalla
 * fase 7 la pillola spenta è bianca (DESIGN.md §8 Pillole d'azione): il
 * riquadro bianco che la conteneva non c'è più.
 */
function Pillole({ opzioni, valore, onCambia, gruppo, aCapo = false }: {
  opzioni: OpzionePillola[];
  valore: number | null;
  onCambia: (v: number | null) => void;
  gruppo: string;
  /**
   * Spec §C sui chip giorno: "tutti visibili senza scroll orizzontale (due
   * righe se serve)". Prop dedicata invece di cambiare il default: le
   * pillole di SETTIMANA DEL GIRO stanno comode su una riga con lo scroll
   * attuale, e non c'è motivo di toccarne il comportamento.
   */
  aCapo?: boolean;
}) {
  return (
    <div className="sc" style={aCapo ? undefined : { overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: aCapo ? 'wrap' : 'nowrap', gap: 6, width: aCapo ? '100%' : 'max-content' }}>
        {opzioni.map((o) => {
          const attivo = o.valore === valore;
          return (
            <button
              key={o.descrizione}
              type="button"
              onClick={() => onCambia(o.valore)}
              aria-pressed={attivo}
              aria-label={`${gruppo}: ${o.descrizione}`}
              style={{ flex: 'none', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
            >
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 44, height: 36, padding: '0 12px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: attivo ? 700 : 500,
                  letterSpacing: '0.09em',
                  color: attivo ? 'var(--superficie)' : 'var(--sec)',
                  background: attivo ? 'var(--ink)' : 'var(--superficie)',
                  border: attivo ? 'none' : '1px solid rgba(20,22,58,0.09)',
                }}
              >
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
