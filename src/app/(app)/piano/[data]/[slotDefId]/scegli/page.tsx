'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { AreaId, ClasseResiduo, Componente, Dish, Ingredient, MealSlot, MealSlotDef, OpzioneComponente, PantryState, Scelta, StatoSlot } from '@/domain/types';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSettimana, aggiornaSlot, type SettimanaCorrente } from '@/data/settimana';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { leggiDispensa } from '@/data/dispensa';
import { leggiListe } from '@/data/lista';
import { giorniTra, lunediDi } from '@/domain/date';
import { residuoUtilizzabile } from '@/domain/pantry';
import { confezioniNecessarie } from '@/domain/confezioni';
import { convertiInUnitaBase } from '@/domain/unita';
import { conflittiSostituzione, type ConflittiSostituzioneInput, type ConflittoResiduo, type VoceListaConflitto } from '@/domain/conflitto';
import { etichettaScadenza } from '@/domain/scadenza';
import { formattaQuantita } from '@/domain/risparmio';
import { areeDelPiatto, cercaPiatti } from '@/domain/ricerca-piatti';
import { Testata } from '@/components/Testata';
import { Dock, ErroreSopraDock } from '@/components/Dock';
import { RigaPiatto } from '@/components/RigaPiatto';
import { CampoRicercaPiatti } from '@/components/CampoRicercaPiatti';
import { VuotoRicercaPiatti } from '@/components/VuotoRicercaPiatti';
import { AggiungiTratteggiato } from '@/components/AggiungiTratteggiato';
import { MessaggioErrore } from '@/components/controlli';
import { RigaImpostazione } from '@/components/pannello/RigaImpostazione';
import { Carico, Nota } from '@/components/pannello/pezzi';
import { tornaA } from '@/components/tornaA';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

interface DatiScegli {
  slotId: string;
  /** Piatto assegnato allo slot al caricamento: dice "ORA IN PROGRAMMA" nella sua sottoriga e serve da riferimento per capire se qualcosa è cambiato. */
  dishIdOriginale: string | null;
  /**
   * Stato dello slot al caricamento. Serve solo a `confermaScelta`: su uno
   * slot 'saltato' o 'sostituito', scegliere un piatto qui è "ho mangiato
   * un altro piatto" (dal FoglioAzioniPasto) — il patch deve riportare lo
   * slot a 'casa', altrimenti il sostituto non viene mai addebitato e la
   * riga in Settimana continua a dire "Saltato".
   */
  statoOriginale: StatoSlot;
  /** Lo slot com'è ora, per intero: `conflittiSostituzione` lo rimonta col candidato lasciando stato, daPronti e porzioni invariati. */
  slot: MealSlot;
  /** Tutti gli slot della settimana: il fabbisogno degli altri pasti concorre al conflitto. */
  slots: MealSlot[];
  statoSettimana: SettimanaCorrente['stato'];
  /**
   * Base + top-up, voci e controlli: tutto quello che la lista dice di
   * comprare, col residuo congelato in ogni riga alla generazione — a
   * settimana confermata è quello, non la dispensa di oggi, il disponibile
   * del conflitto. Vuoto senza lista (o se la lettura fallisce).
   */
  vociLista: VoceListaConflitto[];
  /** I nomi dei pasti per la coda "e serve anche giovedì (Cena)". */
  slotDefs: MealSlotDef[];
  nomePasto: string;
  /** Solo i piatti attivi di questo slotDef: sono quelli fra cui scegliere. */
  piatti: Dish[];
  /** Tutto il repertorio: gli altri slot della settimana montano piatti di altri pasti. */
  tuttiIPiatti: Dish[];
  areePerPiatto: Map<string, AreaId[]>;
  /** Le scelte registrate sullo slot al caricamento: riferimento per capire se un componente è stato toccato. */
  scelteOriginali: Record<string, Scelta>;
  dispensa: PantryState[];
  ingredientiPerId: Map<string, Ingredient>;
  nomePerIngrediente: Map<string, string>;
  moltiplicatorePorzioni: number;
}

/**
 * Etichetta del giorno per l'header ("GIOVEDÌ 4") e per la nota ("giovedì").
 * In `try/catch` perché `dataParam` arriva dall'URL: i link che l'app genera
 * sono sempre una data ISO valida, ma una URL digitata a mano non deve far
 * crashare la schermata, solo lasciare l'etichetta vuota.
 */
function etichettaGiorno(dataIso: string): { maiuscolo: string; minuscolo: string; numero: number } {
  try {
    const indice = giorniTra(lunediDi(dataIso), dataIso);
    const nome = GIORNI[indice];
    if (!nome) throw new Error('Indice giorno fuori range.');
    return { maiuscolo: nome.toUpperCase(), minuscolo: nome.toLowerCase(), numero: Number(dataIso.slice(8, 10)) };
  } catch {
    return { maiuscolo: '', minuscolo: '', numero: 0 };
  }
}

/**
 * Le due note sono copiate alla lettera da Scegli.dc.html, con pasto e
 * giorno reali al posto dell'esempio "la cena di giovedì". L'artboard usa
 * l'articolo "la" perché il suo esempio ("cena") è femminile, ma i nomi dei
 * pasti sono testo libero dell'utente (i default includono "Pranzo" e
 * "Spuntino", maschili): un articolo fisso sarebbe sbagliato per metà dei
 * pasti di default. Si sostituisce senza articolo, come già fa
 * `RigaPasto`'s aria-label ("Scegli il piatto per ${nomePasto}") per lo
 * stesso motivo — evitare di indovinare un genere che non si conosce, lo
 * stesso principio per cui altrove nel progetto si evita di pluralizzare un
 * nome di pasto scritto liberamente.
 *
 * La frase per `cambiato` NON è quella dell'artboard (I9): prometteva "la
 * lista della spesa si ricalcola da sola", ma generaListe congela la lista in
 * shopping_list_item per scelta esplicita. Non è nemmeno più quella della
 * prima correzione ("va rigenerata dalla Settimana"): da quando esiste
 * `allineaTopUp` (chiamata a ogni apertura della Lista) gli ingredienti che
 * mancano entrano da soli nel top-up, e la Settimana non rigenera una
 * settimana non bozza (spec scadenza-fresco §3.3). Resta il tratto che
 * contava nell'originale: prima cosa NON cambia (gli altri giorni), poi la
 * conseguenza pratica vera per l'utente. Il buco che `allineaTopUp` lascia —
 * un fabbisogno che cresce su un ingrediente GIÀ in lista — lo racconta la
 * riga di conflitto (`testoConflitto`), non la nota.
 *
 * La nota dice «entra nella lista», non «entra nel top-up»: la fase 2 ha tolto
 * quella parola dall'interfaccia (la lista è una sola), e questo era l'ultimo
 * posto dove l'utente la leggeva — il Task 6 dichiarava di averlo già corretto
 * e si sbagliava. La divisione base/top-up resta nel dominio e nel database,
 * `allineaTopUp` compresa: è un fatto tecnico, non una parola da mostrare.
 */
function testoNota(cambiato: boolean, nomePasto: string, giorno: string): string {
  if (cambiato) {
    return `Cambia solo ${nomePasto} di ${giorno}. Gli altri giorni restano come sono. Se la lista è già fatta, quello che manca entra nella lista quando la riapri.`;
  }
  return `Tocca un piatto per sostituire ${nomePasto} di ${giorno}. Vale solo per quel giorno, non cambia il piatto nel repertorio.`;
}

/**
 * La riga di conflitto (spec scadenza-fresco §3.3), copy esatto:
 * `Con questo piatto {Nome} non basta: ne mancano {quantità}{coda}.`
 * Nessun articolo davanti al nome, per lo stesso motivo di `testoNota`: è
 * testo libero dell'utente, il genere non si conosce. La quantità è
 * `formattaQuantita` sulla sola unità dell'ingrediente. La coda, solo se
 * qualche altro pasto della settimana resterà senza: `, e serve anche` più i
 * pasti come `{giorno} ({pasto})` — il giorno da `etichettaScadenza`
 * (oggi/domani/nome del giorno), il pasto dal nome dello slotDef (l'id se
 * non si trova, meglio di una parentesi vuota). Al massimo due pasti per
 * esteso, poi `altri N`; virgole fra i primi e ` e ` prima dell'ultimo
 * elemento, che sia un pasto o "altri N": `domani (Pranzo) e giovedì (Cena)`,
 * `domani (Pranzo), giovedì (Cena) e altri 2`.
 */
function testoConflitto(c: ConflittoResiduo, slotDefs: MealSlotDef[], oggi: string): string {
  const quantita = formattaQuantita({ g: 0, ml: 0, pz: 0, [c.unita]: c.mancante });
  const pasti = c.pastiDopo.slice(0, 2).map((p) => {
    const nomePasto = slotDefs.find((d) => d.id === p.slotDefId)?.nome ?? p.slotDefId;
    return `${etichettaScadenza(p.data, oggi)} (${nomePasto})`;
  });
  const restanti = c.pastiDopo.length - pasti.length;
  if (restanti > 0) pasti.push(`altri ${restanti}`);
  const coda = pasti.length === 0
    ? ''
    : `, e serve anche ${pasti.length === 1 ? pasti[0] : `${pasti.slice(0, -1).join(', ')} e ${pasti[pasti.length - 1]}`}`;
  return `Con questo piatto ${c.nome} non basta: ne mancano ${quantita}${coda}.`;
}

/**
 * La lista della settimana, o null se non esiste o se la lettura fallisce.
 * Stessa tolleranza di `leggiRisparmioSenzaBloccare` nella Dispensa: la
 * lista serve solo alla riga di conflitto, e una riga in meno non è un motivo
 * per negare la schermata a chi vuole solo cambiare piatto.
 */
async function leggiListaSenzaBloccare(weekId: string) {
  try {
    return await leggiListe(weekId);
  } catch (e) {
    console.error('scegli: lettura della lista fallita.', e);
    return null;
  }
}

/**
 * `conflittiSostituzione` per la schermata: se il candidato stesso è rotto
 * (una scelta registrata che punta a un'opzione rimossa, un ingrediente
 * sparito dal repertorio) il dominio propaga l'errore, ma qui — come
 * `opzioneCorrente` — non è il posto per esplodere: la schermata deve
 * restare usabile per correggere la scelta, e un avviso in meno è il prezzo
 * giusto. Gli altri slot rotti li salta già il dominio.
 */
function conflittiSenzaEsplodere(i: ConflittiSostituzioneInput): ConflittoResiduo[] {
  try {
    return conflittiSostituzione(i);
  } catch {
    return [];
  }
}

/**
 * L'opzione attualmente in vigore per un componente: quella scelta, o la
 * prima (il default) quando nessuna scelta è registrata — stesso criterio di
 * `righeEffettive`/`descriviScelte` in `src/domain/opzioni.ts`. Se la scelta
 * registrata punta a un'opzione che non esiste più si ricade sul default:
 * qui, a differenza di `righeEffettive`, non è il posto per esplodere — la
 * schermata deve restare usabile per correggere la scelta.
 */
function opzioneCorrente(componente: Componente, scelte: Record<string, Scelta>): OpzioneComponente {
  const scelta = scelte[componente.id];
  const opzione = scelta === undefined
    ? componente.opzioni[0]
    : componente.opzioni.find((o) => o.id === scelta.opzioneId);
  return opzione ?? componente.opzioni[0];
}

/** La prossima opzione nell'ordine d'autore, con wrap-around: il tap cicla, non sceglie. */
function opzioneSuccessiva(componente: Componente, opzioneAttualeId: string): OpzioneComponente {
  const indice = componente.opzioni.findIndex((o) => o.id === opzioneAttualeId);
  const prossimo = (indice === -1 ? 0 : indice + 1) % componente.opzioni.length;
  return componente.opzioni[prossimo];
}

/** I nomi degli ingredienti dell'opzione, uniti come nel sottotitolo di `descriviScelte`. */
function nomeOpzione(opzione: OpzioneComponente, nomePerIngrediente: Map<string, string>): string {
  return opzione.righe.map((r) => nomePerIngrediente.get(r.ingredientId) ?? '?').join(' + ');
}

/**
 * Il chip IN CASA: vero quando nessuna riga dell'opzione costerebbe una
 * confezione nuova. Stesso calcolo di `costoInConfezioni` in
 * `src/domain/planner.ts` — residuo utilizzabile poi confezioniNecessarie —
 * ma per una singola opzione invece che per un piatto intero. La classe
 * `stima` è esclusa per contratto (regola 7: nessuna aritmetica su di lei) e
 * un ingrediente sconosciuto non blocca il chip, non fa crashare la schermata.
 */
function opzioneInCasa(
  opzione: OpzioneComponente,
  ingredientiPerId: Map<string, Ingredient>,
  dispensaPerId: Map<string, PantryState>,
  moltiplicatorePorzioni: number,
  oggi: string,
): boolean {
  for (const riga of opzione.righe) {
    const ing = ingredientiPerId.get(riga.ingredientId);
    // Il q.b. (spec 8c §B) non chiede niente alla dispensa.
    if (!ing || ing.classeResiduo === 'stima' || riga.quantita === null) continue;
    const fabbisogno = convertiInUnitaBase(riga.quantita, riga.unita, ing.unitaBase) * moltiplicatorePorzioni;
    const statoDispensa = dispensaPerId.get(riga.ingredientId);
    const residuo = residuoUtilizzabile({
      residuo: statoDispensa?.residuo ?? 0,
      deperibile: ing.deperibile,
      area: ing.area,
      ultimoAcquisto: statoDispensa?.ultimoAcquisto ?? null,
      congelato: statoDispensa?.congelato ?? false,
      scadenzaManuale: statoDispensa?.scadenzaManuale ?? null,
      oggi,
    });
    const { confezioni } = confezioniNecessarie({
      fabbisogno,
      residuo,
      classeResiduo: ing.classeResiduo as Exclude<ClasseResiduo, 'stima'>,
      formatoConfezione: ing.formatoConfezione,
    });
    if (confezioni > 0) return false;
  }
  return true;
}

/**
 * Vero se il piatto scelto è diverso da quello assegnato allo slot, o se le
 * opzioni dei suoi componenti sono state toccate rispetto alle scelte
 * originali dello slot. Guida sia il disabled del bottone SOSTITUISCI sia il
 * bail-out di `confermaScelta`: le due cose devono restare in sincrono, da
 * cui un'unica funzione invece di due calcoli paralleli.
 */
function ilPiattoOLeScelteSonoCambiate(
  dati: DatiScegli,
  scelto: string | null,
  scelteCorrenti: Record<string, Scelta>,
): boolean {
  if (scelto !== dati.dishIdOriginale) return true;
  const dish = dati.piatti.find((p) => p.id === scelto);
  if (!dish) return false;
  return dish.componenti.some((c) => {
    const attuale = scelteCorrenti[c.id]?.opzioneId ?? c.opzioni[0]?.id;
    const originale = dati.scelteOriginali[c.id]?.opzioneId ?? c.opzioni[0]?.id;
    return attuale !== originale;
  });
}

/**
 * Le scelte manuali sui componenti del piatto `dish` da mandare ad
 * `aggiornaSlot`: solo quelle presenti in `scelteCorrenti` (toccate a mano,
 * qui o in una sessione precedente) E diverse dall'opzione originale
 * effettiva (`scelteOriginali[c.id]?.opzioneId`, o il default — la prima —
 * quando lo slot non aveva nulla registrato per quel componente).
 *
 * Il filtro sulla differenza non è ridondante col semplice "presente in
 * scelteCorrenti": un ciclo andata-e-ritorno (avanti e poi di nuovo avanti
 * fino a ripassare per l'originale) lascia una entry in scelteCorrenti anche
 * quando l'utente è tornato esattamente dov'era. Mandarla come 'manuale'
 * marcherebbe quel componente come deciso a mano per sempre — il planner non
 * lo ricalcolerebbe più — per un tocco che l'utente ha di fatto annullato.
 *
 * `undefined` (non `{}`) quando non c'è nulla da mandare: `aggiornaSlot`
 * tratta `scelte` assente come "non toccare", non come "azzera".
 */
function scelteManualiDaMandare(
  dish: Dish,
  scelteCorrenti: Record<string, Scelta>,
  scelteOriginali: Record<string, Scelta>,
): Record<string, Scelta> | undefined {
  const scelte: Record<string, Scelta> = {};
  for (const c of dish.componenti) {
    const s = scelteCorrenti[c.id];
    if (s === undefined) continue;
    const originale = scelteOriginali[c.id]?.opzioneId ?? c.opzioni[0]?.id;
    if (s.opzioneId === originale) continue;
    scelte[c.id] = s;
  }
  return Object.keys(scelte).length > 0 ? scelte : undefined;
}

/** Il ritorno al Piano: la pillola della Testata in modo indietro (spec fase 7 §A.2). */
type Indietro = { etichetta: string; ariaLabel: string; onTorna: () => void };

/**
 * `IN CASA` nella nota della Riga di impostazione del componente (spec §A.4): mono 10
 * in --ink. Fra i token non c'è un verde, e §C non vuole famiglie nuove.
 */
const STILE_IN_CASA = {
  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink)',
} as const;

/**
 * Scegli il piatto: sostituzione per-pasto, non per-piatto. Nasce dal pasto
 * (data + slotDefId dalla rotta), mostra solo i piatti attivi di quello slot
 * e scrive solo `meal_slot.dish_id` di quel singolo slot — non tocca mai il
 * repertorio.
 *
 * Dalla fase 7 è una schermata del sistema (spec 2026-09-26 §A): la Testata in
 * modo indietro con la pillola del giorno e del pasto, la ricerca e le righe di
 * Piatti (la riga in modo «scegli»), i componenti come Righe di impostazione e
 * `SOSTITUISCI` nel Dock. I dati non cambiano: stesso caricamento, stessa
 * scelta, stesso patch di `aggiornaSlot`.
 */
export default function ScegliPiatto() {
  const { data: dataParam, slotDefId } = useParams<{ data: string; slotDefId: string }>();
  const router = useRouter();

  const [dati, setDati] = useState<DatiScegli | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [scelto, setScelto] = useState<string | null>(null);
  const [scelteCorrenti, setScelteCorrenti] = useState<Record<string, Scelta>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);
  /** Il testo della ricerca: filtra le righe, non tocca la scelta (spec §A.3). */
  const [ricerca, setRicerca] = useState('');
  // Da dove si è arrivati (spec Oggi §B.6): `?da=oggi` torna a Oggi. Letto da window.location e
  // non da useSearchParams, come `?da=piano` nell'editor del Piatto: niente confine <Suspense>.
  const [daOggi, setDaOggi] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDaOggi(new URLSearchParams(window.location.search).get('da') === 'oggi');
  }, []);
  const ritorno = daOggi ? '/oggi' : '/piano';

  useEffect(() => {
    let vivo = true;
    async function carica() {
      try {
        const [settimana, repertorio, slotDefs, ingredienti, impostazioni, dispensa] = await Promise.all([
          leggiSettimana(lunediDi(dataParam)),
          leggiRepertorio(),
          leggiSlotDefs(),
          leggiIngredienti(),
          leggiImpostazioni(),
          leggiDispensa(),
        ]);
        if (!vivo) return;

        const slot = settimana?.slots.find((s) => s.data === dataParam && s.slotDefId === slotDefId) ?? null;
        const def = slotDefs.find((d) => d.id === slotDefId) ?? null;
        if (!settimana || !slot || !def) {
          setErrore('Non troviamo questo pasto.');
          return;
        }

        // Dopo la Promise.all, non dentro: serve l'id della settimana. Una
        // lettura in più solo su questa schermata.
        const lista = await leggiListaSenzaBloccare(settimana.id);
        if (!vivo) return;
        const vociLista = lista === null
          ? []
          : [...lista.base, ...lista.topup]
            .flatMap((sezione) => [...sezione.voci, ...sezione.controlli])
            .map((v) => ({ ingredientId: v.ingredientId, quantitaTotale: v.quantitaTotale, residuo: v.residuo }));

        const areaPerIngrediente = new Map(ingredienti.map((i) => [i.id, i.area]));
        const ingredientiPerId = new Map(ingredienti.map((i) => [i.id, i]));
        const nomePerIngrediente = new Map(ingredienti.map((i) => [i.id, i.nome]));
        // Solo i piatti attivi di questo slot: leggiRepertorio() esclude già
        // i piatti eliminati (soft delete), qui si filtra anche per pasto.
        const piatti = repertorio.filter((p) => p.slotDefId === slotDefId);

        const areePerPiatto = new Map<string, AreaId[]>();
        for (const p of piatti) {
          areePerPiatto.set(p.id, areeDelPiatto(p, areaPerIngrediente, impostazioni.ordineAree));
        }

        setDati({
          slotId: slot.id,
          dishIdOriginale: slot.dishId,
          statoOriginale: slot.stato,
          slot,
          slots: settimana.slots,
          statoSettimana: settimana.stato,
          vociLista,
          slotDefs,
          nomePasto: def.nome,
          piatti,
          tuttiIPiatti: repertorio,
          areePerPiatto,
          scelteOriginali: slot.scelte,
          dispensa,
          ingredientiPerId,
          nomePerIngrediente,
          moltiplicatorePorzioni: impostazioni.moltiplicatorePorzioni,
        });
        setScelto(slot.dishId);
        setScelteCorrenti(slot.scelte);
      } catch (errore) {
        console.error('scegli: caricamento fallito.', errore);
        if (vivo) setErrore('Non riusciamo a caricare i piatti. Riprova più tardi.');
      }
    }
    carica();
    return () => {
      vivo = false;
    };
  }, [dataParam, slotDefId]);

  /** Cicla il componente alla prossima opzione, come scelta manuale — mai sovrascritta dal planner. */
  function toccaComponente(componente: Componente) {
    const attuale = opzioneCorrente(componente, scelteCorrenti);
    const prossima = opzioneSuccessiva(componente, attuale.id);
    setScelteCorrenti((prev) => ({ ...prev, [componente.id]: { opzioneId: prossima.id, fonte: 'manuale' } }));
  }

  async function confermaScelta() {
    if (!dati || !ilPiattoOLeScelteSonoCambiate(dati, scelto, scelteCorrenti) || salvando) return;
    setSalvando(true);
    setErroreSalva(null);
    try {
      const dishScelto = dati.piatti.find((p) => p.id === scelto) ?? null;
      const patch: { stato?: StatoSlot; dishId: string | null; scelte?: Record<string, Scelta> } = { dishId: scelto };
      const scelteDaMandare = dishScelto ? scelteManualiDaMandare(dishScelto, scelteCorrenti, dati.scelteOriginali) : undefined;
      if (scelteDaMandare !== undefined) patch.scelte = scelteDaMandare;
      // Slot 'saltato'/'sostituito': questo è il flusso "Ho mangiato un altro
      // piatto" dal FoglioAzioniPasto. Senza riportare lo stato a 'casa' qui,
      // consumoDopo in aggiornaSlot resterebbe vuoto (stato non-casa) e il
      // sostituto non verrebbe mai addebitato — la riga in Settimana
      // continuerebbe a dire "Saltato". 'correzione' vince sempre nella
      // gerarchia delle fonti (src/domain/week-shape.ts), quindi passa il
      // cancello anche su uno slot già scritto da 'checkin'.
      if (dati.statoOriginale === 'saltato' || dati.statoOriginale === 'sostituito') {
        patch.stato = 'casa';
      }
      // 'correzione' qui è inerte quando il patch non tocca `stato`:
      // aggiornaSlot usa `fonte` solo per quel campo (gerarchia delle fonti).
      // Un patch che tocca solo `dishId` (e `scelte`) si applica sempre e non
      // scrive `fonte_stato` — scegliere un piatto non è di per sé una
      // transizione di stato casa/fuori.
      await aggiornaSlot(dati.slotId, patch, 'correzione');
      tornaA(router, ritorno);
    } catch (errore) {
      console.error('scegli: salvataggio della scelta fallito.', errore);
      setErroreSalva('Non siamo riusciti a salvare la scelta. Riprova.');
      setSalvando(false);
    }
  }

  const { minuscolo, numero } = etichettaGiorno(dataParam);
  const indietro: Indietro = daOggi
    ? { etichetta: 'OGGI', ariaLabel: 'Torna a oggi', onTorna: () => tornaA(router, '/oggi') }
    : { etichetta: 'PIANO', ariaLabel: 'Torna al piano', onTorna: () => tornaA(router, '/piano') };

  if (errore) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}>
          <MessaggioErrore>{errore}</MessaggioErrore>
        </div>
      </Cornice>
    );
  }

  if (!dati) {
    // Come in Fine spesa (spec §A.6): la Testata è già disegnata, sotto una riga sola.
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}>
          <Carico />
        </div>
      </Cornice>
    );
  }

  const cambiato = ilPiattoOLeScelteSonoCambiate(dati, scelto, scelteCorrenti);
  // La pillola sotto il titolo (spec §A.2): «Giovedì 27 · Cena» in sentence case, la
  // maiuscola la mette la Testata. Con una data illeggibile resta il solo pasto, come oggi.
  const giorno = minuscolo ? `${minuscolo.charAt(0).toUpperCase()}${minuscolo.slice(1)} ${numero}` : '';
  const pillola = giorno ? `${giorno} · ${dati.nomePasto}` : dati.nomePasto;
  const dishSelezionato = dati.piatti.find((p) => p.id === scelto) ?? null;
  const dispensaPerId = new Map(dati.dispensa.map((d) => [d.ingredientId, d]));
  const oggi = new Date().toISOString().slice(0, 10);
  const ingredienti = [...dati.ingredientiPerId.values()];
  const conflitti = cambiato && dishSelezionato
    ? conflittiSenzaEsplodere({
      slot: dati.slot,
      candidato: dishSelezionato,
      scelte: scelteCorrenti,
      slots: dati.slots,
      dishes: dati.tuttiIPiatti,
      ingredients: ingredienti,
      pantry: dati.dispensa,
      impostazioni: { moltiplicatorePorzioni: dati.moltiplicatorePorzioni },
      statoSettimana: dati.statoSettimana,
      vociLista: dati.vociLista,
      oggi,
    })
    : [];
  // L'ordine e il filtro di Piatti (spec §A.3). Il piatto scelto può uscire dal filtro:
  // resta scelto, e i suoi componenti restano sotto.
  const mostrati = cercaPiatti(dati.piatti, ingredienti, ricerca);

  return (
    <Cornice indietro={indietro} settimana={pillola}>
      {/* Fuori dallo scroller: resta ferma mentre l'elenco scorre, come in Piatti. */}
      <CampoRicercaPiatti valore={ricerca} onCambia={setRicerca} />

      <div
        className="sc scroll-app con-dock"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '2px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {mostrati.map((p) => (
          <RigaPiatto
            key={p.id}
            piatto={p}
            aree={dati.areePerPiatto.get(p.id) ?? []}
            modo="scegli"
            scelto={scelto === p.id}
            corrente={dati.dishIdOriginale === p.id}
            onScegli={() => setScelto(p.id)}
          />
        ))}

        {/* Il vuoto di ricerca di Piatti, lo stesso pezzo (Task 1). Solo se il pasto ha dei
            piatti: senza, il vuoto non è della ricerca, e sotto c'è già CREA UN PIATTO NUOVO,
            come oggi. */}
        {mostrati.length === 0 && dati.piatti.length > 0 && <VuotoRicercaPiatti />}

        {/* Sotto l'elenco (spec §A.4): componenti, conflitti e nota. Distacchi a margine e
            non a gap, perché la regione dei conflitti c'è anche vuota. */}
        <div style={{ flexShrink: 0, marginTop: 8, display: 'flex', flexDirection: 'column' }}>
          {dishSelezionato && dishSelezionato.componenti.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
              <h2 style={{ margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
                COMPONENTI
              </h2>
              {/* Il widget bianco, raggio 22: una Riga di impostazione per componente, col
                  filetto fra l'una e l'altra come nel Blocco di gruppo. Il tocco passa
                  all'opzione dopo, senza foglio, come oggi. */}
              <div style={{ background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22, boxShadow: 'var(--ombra-pannello)', padding: '4px 12px' }}>
                {dishSelezionato.componenti.map((componente, i) => {
                  const opzione = opzioneCorrente(componente, scelteCorrenti);
                  const nomeOpz = nomeOpzione(opzione, dati.nomePerIngrediente);
                  const inCasa = opzioneInCasa(opzione, dati.ingredientiPerId, dispensaPerId, dati.moltiplicatorePorzioni, oggi);
                  return (
                    <div key={componente.id} style={{ borderTop: i > 0 ? '1px solid var(--bordo)' : 'none' }}>
                      <RigaImpostazione
                        nome={componente.nome}
                        etichetta={`Cambia ${componente.nome}: ora ${nomeOpz}`}
                        nota={inCasa ? <span style={STILE_IN_CASA}>IN CASA</span> : undefined}
                        finale={{ tipo: 'valore', valore: nomeOpz, onApri: () => toccaComponente(componente) }}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* L'Avviso in linea (DESIGN.md §8 Messaggi): la regione aria-live c'è sempre,
              così il primo conflitto che compare dopo un tocco viene annunciato. */}
          <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px', marginBottom: conflitti.length > 0 ? 12 : 0 }}>
            {conflitti.map((c) => (
              <p key={c.ingredientId} style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: 'var(--avviso)' }}>
                {testoConflitto(c, dati.slotDefs, oggi)}
              </p>
            ))}
          </div>

          <Nota>{testoNota(cambiato, dati.nomePasto, minuscolo)}</Nota>
        </div>

        {/* L'Aggiungi tratteggiato condiviso con Piatti (DESIGN.md §8 Tasti). In fondo e
            non in cima come in Piatti: qui si sceglie, creare è l'eccezione (spec §A.3).
            Il contenitore dà gli 8 in più di distacco dalla nota. */}
        <div style={{ flexShrink: 0, marginTop: 8 }}>
          <AggiungiTratteggiato etichetta="CREA UN PIATTO NUOVO" href="/piatti/nuovo" />
        </div>
      </div>

      <Dock>
        {/* Sopra il Dock, come nell'editor dell'ingrediente: fuori dalla pillola, su fondo
            bianco, perché sotto scorre la pagina. */}
        {erroreSalva && <ErroreSopraDock>{erroreSalva}</ErroreSopraDock>}
        {/* Spento finché niente cambia e in volo: lo spento di `.dock-primario:disabled`
            (DESIGN.md §13, 26/09, punto 6), nessuna opacità. */}
        <button type="button" className="dock-primario" onClick={() => void confermaScelta()} disabled={!cambiato || salvando}>
          SOSTITUISCI
        </button>
      </Dock>
    </Cornice>
  );
}

/**
 * Colonna a tutta altezza con la Testata fissa in cima (titolo `Cosa mangi`, pillola
 * `PIANO`, sotto la pillola del giorno e del pasto): solo il corpo passato come children
 * scorre. Sostituisce l'intestazione minimale e il tasto secondario del piede di prima:
 * portavano tutti e due a `/piano`, come la pillola.
 */
function Cornice({ settimana, indietro, children }: { settimana?: string; indietro: Indietro; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Cosa mangi" settimana={settimana} indietro={indietro} />
      {children}
    </div>
  );
}
