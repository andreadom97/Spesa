'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AreaId, Ingredient, LottoPronto } from '@/domain/types';
import type { VoceContesto } from '@/domain/dispensa-ai';
import { leggiIngredienti, leggiRepertorio, salvaIngrediente } from '@/data/repertorio';
import { EVENTO_DISPENSA_CAMBIATA, aggiungiConfezione, correggiResiduo, impostaCongelato, impostaScadenza, leggiDispensa } from '@/data/dispensa';
import { leggiImpostazioni } from '@/data/impostazioni';
import { correggiLotto, eliminaLotto, impostaCongelatoLotto, leggiPronti } from '@/data/pronti';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { avvisiScadenza, type AvvisoScadenza } from '@/domain/scadenza';
import { effettoCorrezione } from '@/domain/pantry';
import { porzioniUtilizzabili } from '@/domain/pronti';
import { lunediDi, sommaGiorni } from '@/domain/date';
import { coloreArea, nomeArea } from '@/domain/aree';
import { avvisoVoce, eDimenticato, impegnateLotto, pillolaStato, scadenzaVoce, type VoceDispensa } from '@/domain/dispensa-vista';
import { cercaInDispensa, etichettaRisultati, raggruppaPerArea, vociInPagina } from '@/domain/ricerca-dispensa';
import { Testata } from '@/components/Testata';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { CampoRicerca } from './CampoRicerca';
import { TesseraDispensa } from './TesseraDispensa';
import { TesseraLotto } from './TesseraLotto';
import { WidgetArea } from './WidgetArea';
import { WidgetVuoti } from './WidgetVuoti';
import { DockDispensa } from './DockDispensa';
import { DettaglioIngrediente } from './DettaglioIngrediente';
import { DettaglioLotto } from './DettaglioLotto';
import { DialogoElimina } from './DialogoElimina';
import { ScansioneConfezione } from './ScansioneConfezione';
import { NuovoIngrediente, type DatiNuovoIngrediente } from './NuovoIngrediente';
import { WidgetAI } from './WidgetAI';
import { useDettatura } from './useDettatura';
import { useIndietroFogli } from '@/components/useIndietroFogli';
import { IconaBarattolo } from './icone';
import { MessaggioErrore, STILE_PILLOLA, TastoPrimario } from '@/components/controlli';

/** Oltre questa attesa il caricamento diventa errore, e la risposta che arriva dopo si scarta (spec §A). */
const ATTESA_MAX_MS = 8000;

interface Dati {
  voci: VoceDispensa[];
  ordineAree: AreaId[];
  lotti: LottoPronto[];
  nomiPiatti: Map<string, string>;
  /** Per piatto, le porzioni già promesse a un pasto di oggi o dopo. */
  impegni: Map<string, number>;
  /** Per ingrediente, cosa dice la settimana corrente del suo fresco. */
  avvisi: Map<string, AvvisoScadenza>;
}

type Foglio =
  | { tipo: 'ingrediente'; id: string; vista: 'dettaglio' | 'scansione' }
  | { tipo: 'lotto'; id: string; elimina: boolean }
  | { tipo: 'nuovo'; nome: string }
  | null;

/**
 * Il ritorno a prima di una scrittura ottimistica fallita: per ogni chiave
 * della patch il valore di prima, ma solo dove c'è ancora il valore della
 * patch. Con due scritture in volo sulla stessa voce (congelatore e scadenza
 * toccano entrambe `scadenzaManuale`), se la prima fallisce dopo che la
 * seconda è riuscita, quello che ha scritto la seconda resta.
 */
function ripristina<T extends object>(ora: T, patch: Partial<T>, prima: T): T {
  const indietro: Partial<T> = {};
  for (const k of Object.keys(patch) as (keyof T)[]) {
    if (ora[k] === patch[k]) indietro[k] = prima[k];
  }
  return { ...ora, ...indietro };
}

/**
 * Quanti livelli apre un foglio, per il gesto indietro: il dettaglio, il lotto
 * e Nuovo ingrediente uno; la scansione sopra il dettaglio e il dialogo di
 * eliminazione sopra il lotto due.
 */
function profonditaDi(foglio: Foglio): number {
  if (foglio === null) return 0;
  if (foglio.tipo === 'ingrediente') return foglio.vista === 'scansione' ? 2 : 1;
  if (foglio.tipo === 'lotto') return foglio.elimina ? 2 : 1;
  return 1;
}

function oggiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Tutte le letture della pagina, e le derivate che non cambiano con le
 * correzioni ottimistiche: gli avvisi della settimana e le porzioni
 * impegnate. La riga del non ricomprato non si legge più: va nelle
 * Impostazioni con la fase 5 (spec §K).
 */
async function leggiTutto(): Promise<Dati> {
  const [ingredienti, dispensa, impostazioni, pronti, repertorio, settimana] = await Promise.all([
    leggiIngredienti(), leggiDispensa(), leggiImpostazioni(), leggiPronti(), leggiRepertorio(), leggiSettimanaCorrente(),
  ]);
  const oggi = oggiIso();
  const perId = new Map(dispensa.map((p) => [p.ingredientId, p]));
  // Un ingrediente senza riga di dispensa è un mai comprato a zero: deve
  // esserci lo stesso, perché è proprio lì che serve dichiarare che ce l'hai.
  const voci: VoceDispensa[] = ingredienti.map((ingrediente) => {
    const s = perId.get(ingrediente.id);
    return {
      ingrediente,
      residuo: s?.residuo ?? 0,
      ultimoAcquisto: s?.ultimoAcquisto ?? null,
      congelato: s?.congelato ?? false,
      scadenzaManuale: s?.scadenzaManuale ?? null,
    };
  });
  // Senza settimana corrente non c'è un piano con cui confrontare il fresco.
  const avvisi = settimana
    ? avvisiScadenza({ slots: settimana.slots, dishes: repertorio, ingredients: ingredienti, pantry: dispensa, oggi })
    : [];
  // Un lotto «disponibile» già promesso a dopodomani non è uno libero.
  const impegni = new Map<string, number>();
  for (const slot of settimana?.slots ?? []) {
    if (!slot.daPronti || slot.dishId === null || slot.data < oggi) continue;
    impegni.set(slot.dishId, (impegni.get(slot.dishId) ?? 0) + 1);
  }
  return {
    voci,
    ordineAree: impostazioni.ordineAree,
    lotti: pronti,
    nomiPiatti: new Map(repertorio.map((d) => [d.id, d.nome])),
    impegni,
    avvisi: new Map(avvisi.map((a) => [a.ingredientId, a])),
  };
}

/**
 * La Dispensa (spec fase 4): quello che risulta in casa, per area, e il modo
 * di rimetterlo in pari quando non torna.
 *
 * Il residuo resta derivato dal piano (`residuo precedente + comprato −
 * consumato`): questa schermata non è un inventario da tenere aggiornato a
 * mano, che è la cosa che la spec esclude esplicitamente. È lo specchio del
 * calcolo, più la correzione per quando il calcolo si discosta dalla realtà —
 * un uovo rotto, un pasto saltato, qualcun altro che ha usato la pasta.
 * Senza, uno scostamento non si recupera più: il residuo si allontana dal
 * vero in silenzio e continua a produrre liste che sembrano giuste.
 *
 * La correzione passa dal dettaglio (tocco sulla tessera) o da `Modifica con
 * l'AI` nel Dock; le scritture sono ottimistiche, con ritorno a prima se
 * falliscono.
 */
export default function Dispensa() {
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState(false);
  const [query, setQuery] = useState('');
  const [foglio, setFoglio] = useState<Foglio>(null);
  const [widgetAperto, setWidgetAperto] = useState(false);
  // La bozza della nota vive qui, non nel widget: chiudere con del testo lo
  // tiene fino alla prossima apertura (spec §H.1), e non in localStorage.
  const [bozza, setBozza] = useState('');
  // Ogni lettura ha il suo numero: una risposta che arriva quando ne è
  // partita un'altra, o dopo il timeout, si scarta.
  const generazione = useRef(0);
  // L'ingrediente creato dal foglio Nuovo ingrediente quando la scrittura del
  // residuo, subito dopo, è fallita: il RIPROVA lo riscrive invece di crearne
  // un secondo con lo stesso nome.
  const creato = useRef<string | null>(null);
  // Il testo definitivo della dettatura si accoda alla bozza con uno spazio (spec §H.2).
  const dettatura = useDettatura(useCallback((t: string) => setBozza((b) => (b ? `${b} ${t}` : t)), []));

  /** Il caricamento con la sua attesa massima. Nessun setState sincrono: si chiama anche dall'effetto. */
  const leggi = useCallback(() => {
    const mia = ++generazione.current;
    const timer = setTimeout(() => {
      if (generazione.current !== mia) return;
      generazione.current++; // la risposta che arriva dopo si scarta
      setErrore(true);
    }, ATTESA_MAX_MS);
    leggiTutto()
      .then((d) => { if (generazione.current === mia) setDati(d); })
      .catch((e) => {
        console.error('dispensa: caricamento fallito.', e);
        if (generazione.current === mia) setErrore(true);
      })
      .finally(() => clearTimeout(timer));
  }, []);

  /** Ogni risposta ancora in volo si scarta: all'uscita dalla pagina. */
  const scartaLetture = useCallback(() => { generazione.current++; }, []);

  useEffect(() => {
    leggi();
    return scartaLetture;
  }, [leggi, scartaLetture]);

  function riprova() {
    setErrore(false);
    setDati(null);
    leggi();
  }

  /**
   * Rilettura silenziosa dopo la nota AI e la creazione: la nota scrive sul
   * server senza dire alla pagina cosa ha applicato, quindi si rilegge tutto.
   * I dati di prima restano in pagina finché arrivano i nuovi.
   */
  const ricarica = useCallback(() => {
    const mia = ++generazione.current;
    leggiTutto()
      .then((d) => { if (generazione.current === mia) setDati(d); })
      .catch((e) => console.error('dispensa: rilettura fallita.', e));
  }, []);

  // Se in pagina ci sono già dati: lo legge l'ascolto qui sotto, fuori dal render.
  const conDati = useRef(false);
  useEffect(() => { conDati.current = dati !== null; }, [dati]);

  // Cancella la dispensa, dal pannello delle Impostazioni aperto sopra questa
  // pagina (spec fase 5 §E.2): si rilegge in silenzio, come dopo la nota AI.
  // I dati di prima restano a schermo finché arrivano i nuovi. Se i dati non
  // ci sono ancora (primo caricamento in volo), si ricarica con `leggi`, con
  // la sua attesa massima e il suo errore: la rilettura silenziosa scarterebbe
  // il caricamento in volo, e se fallisse la pagina resterebbe su CARICO….
  useEffect(() => {
    const alCambio = () => {
      if (conDati.current) ricarica();
      else leggi();
    };
    window.addEventListener(EVENTO_DISPENSA_CAMBIATA, alCambio);
    return () => window.removeEventListener(EVENTO_DISPENSA_CAMBIATA, alCambio);
  }, [leggi, ricarica]);

  function cambiaVoce(id: string, patch: Partial<VoceDispensa>) {
    setDati((d) => d && { ...d, voci: d.voci.map((v) => (v.ingrediente.id === id ? { ...v, ...patch } : v)) });
  }

  /**
   * Ottimistico, con ritorno a prima se la scrittura fallisce, e l'errore
   * rilanciato: lo mostra la riga del foglio che l'ha chiesto. Una correzione
   * persa in silenzio sarebbe peggio del residuo sbagliato che si correggeva:
   * l'utente crede di aver rimesso le cose a posto. Il ritorno tocca solo le
   * chiavi della patch (con AGGIUNGI anche `ingrediente`), e solo dove
   * nessun'altra scrittura le ha cambiate nel frattempo (`ripristina`).
   */
  async function scriviVoce(id: string, patch: Partial<VoceDispensa>, scrivi: () => Promise<void>) {
    const prima = dati?.voci.find((v) => v.ingrediente.id === id);
    if (!prima) return;
    cambiaVoce(id, patch);
    try {
      await scrivi();
    } catch (e) {
      console.error('dispensa: scrittura fallita.', e);
      setDati((d) => d && { ...d, voci: d.voci.map((v) => (v.ingrediente.id === id ? ripristina(v, patch, prima) : v)) });
      throw e;
    }
  }

  /** Il residuo a mano, con le regole delle date che applica anche il dato (spec §E.2, §E.3). */
  function residuo(id: string, nuovo: number): Promise<void> {
    const prima = dati?.voci.find((v) => v.ingrediente.id === id);
    if (!prima) return Promise.resolve();
    const effetto = effettoCorrezione(prima.residuo, nuovo, oggiIso());
    const patch: Partial<VoceDispensa> = { residuo: nuovo };
    if (effetto.ultimoAcquisto !== null) patch.ultimoAcquisto = effetto.ultimoAcquisto;
    if (effetto.cancellaScadenza) patch.scadenzaManuale = null;
    return scriviVoce(id, patch, () => correggiResiduo(id, nuovo, prima.residuo));
  }

  /** AGGIUNGI dello scanner (spec §F.2): una confezione in più, poi di nuovo il dettaglio. */
  async function aggiungi(v: VoceDispensa, formato: number, ean: string) {
    const ingrediente = { ...v.ingrediente, formatoConfezione: formato, ean };
    await scriviVoce(
      v.ingrediente.id,
      { ingrediente, residuo: v.residuo + formato, ultimoAcquisto: oggiIso(), scadenzaManuale: null },
      () => aggiungiConfezione({ ingredientId: v.ingrediente.id, formato, ean, residuoPrima: v.residuo }),
    );
    setFoglio({ tipo: 'ingrediente', id: v.ingrediente.id, vista: 'dettaglio' });
  }

  function cambiaLotto(id: string, patch: Partial<LottoPronto>) {
    setDati((d) => d && { ...d, lotti: d.lotti.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }

  function togliLotto(id: string) {
    setDati((d) => d && { ...d, lotti: d.lotti.filter((l) => l.id !== id) });
  }

  /** Come `scriviVoce`, sul lotto. */
  async function scriviLotto(id: string, patch: Partial<LottoPronto>, scrivi: () => Promise<void>) {
    const prima = dati?.lotti.find((l) => l.id === id);
    if (!prima) return;
    cambiaLotto(id, patch);
    try {
      await scrivi();
    } catch (e) {
      console.error('dispensa: scrittura del lotto fallita.', e);
      setDati((d) => d && { ...d, lotti: d.lotti.map((l) => (l.id === id ? ripristina(l, patch, prima) : l)) });
      throw e;
    }
  }

  /**
   * `correggiLotto` a 0 cancella il lotto sul server (è la regola del dato:
   * un lotto a zero non esiste). Dopo la scrittura riuscita il lotto esce
   * anche da qui e il foglio si chiude: resterebbe aperto su una riga che
   * non c'è più.
   */
  async function porzioni(id: string, n: number) {
    await scriviLotto(id, { porzioni: n }, () => correggiLotto(id, n));
    if (n <= 0) {
      togliLotto(id);
      setFoglio(null);
    }
  }

  /** Non ottimistico: l'errore resta nel dialogo, e il lotto non sparisce finché il server non l'ha tolto. */
  async function elimina(id: string) {
    await eliminaLotto(id);
    togliLotto(id);
    setFoglio(null);
  }

  function apriNuovo(nome: string) {
    creato.current = null;
    setFoglio({ tipo: 'nuovo', nome });
  }

  /**
   * Si esce da Nuovo ingrediente senza aver finito. Un ingrediente creato a
   * metà (residuo non scritto) esiste già: la pagina lo deve vedere, almeno
   * fra i mai comprati.
   */
  function lasciaNuovo() {
    if (creato.current !== null) ricarica();
    creato.current = null;
  }

  function chiudiNuovo() {
    lasciaNuovo();
    setFoglio(null);
  }

  /** CREA L'INGREDIENTE (spec §C): l'ingrediente, poi la regola d'entrata se la quantità è > 0. */
  async function crea(d: DatiNuovoIngrediente) {
    const id = await salvaIngrediente({ ...d.ingrediente, prezzoConfezione: null, id: creato.current ?? undefined });
    creato.current = id;
    if (d.quantita > 0) await correggiResiduo(id, d.quantita, 0);
    creato.current = null;
    setFoglio(null);
    setQuery('');
    ricarica();
  }

  function apriWidget() {
    setWidgetAperto(true);
  }

  /** La X o il velo: la dettatura si ferma, la bozza resta (spec §H.1, §H.2). */
  function chiudiWidget() {
    dettatura.ferma();
    setWidgetAperto(false);
  }

  /**
   * Il gesto indietro del telefono chiude l'ultimo livello aperto
   * (`useIndietroFogli`): il widget AI se c'è, poi scansione → dettaglio,
   * dialogo → lotto, e il foglio di primo livello → niente. La vista di
   * scansione dentro Nuovo ingrediente è stato del foglio: lì indietro chiude
   * il foglio intero.
   */
  function chiudiUltimo() {
    if (widgetAperto) {
      chiudiWidget();
      return;
    }
    if (foglio?.tipo === 'ingrediente' && foglio.vista === 'scansione') {
      setFoglio({ ...foglio, vista: 'dettaglio' });
    } else if (foglio?.tipo === 'lotto' && foglio.elimina) {
      setFoglio({ ...foglio, elimina: false });
    } else if (foglio?.tipo === 'nuovo') {
      chiudiNuovo();
    } else {
      setFoglio(null);
    }
  }

  useIndietroFogli(profonditaDi(foglio) + (widgetAperto ? 1 : 0), chiudiUltimo);

  if (errore) {
    return (
      <Cornice>
        <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <MessaggioErrore>Non riusciamo a caricare la dispensa. Riprova.</MessaggioErrore>
          <button type="button" onClick={riprova} style={{ ...STILE_PILLOLA, background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid rgba(20,22,58,0.09)' }}>
            RIPROVA
          </button>
        </div>
      </Cornice>
    );
  }

  // Nel caricamento e nell'errore il Dock non c'è (spec §A): questi due
  // return non lo rendono.
  if (!dati) {
    return (
      <Cornice>
        <CampoRicerca valore="" onCambia={() => {}} contatore={null} spento />
        <WidgetVuoti />
      </Cornice>
    );
  }

  const oggi = oggiIso();
  const domenica = sommaGiorni(lunediDi(oggi), 6);
  // La scadenza si ricava dai valori correnti della voce, non da quelli letti:
  // congelatore e data a mano cambiano in modo ottimistico. L'avviso della
  // settimana è del caricamento, e conta solo se parla della stessa scadenza.
  const dimenticato = (v: VoceDispensa) => eDimenticato(scadenzaVoce(v), dati.avvisi.get(v.ingrediente.id), domenica);
  const lottiVivi = dati.lotti.filter((l) => porzioniUtilizzabili(l, oggi) > 0);
  const nomeLotto = (l: LottoPronto) => dati.nomiPiatti.get(l.dishId) ?? 'Piatto eliminato';
  const risultati = cercaInDispensa(query, dati.voci, lottiVivi, nomeLotto);
  const voci = risultati ? risultati.voci : vociInPagina(dati.voci);
  const lotti = risultati ? risultati.lotti : lottiVivi;
  const vuota = !risultati && voci.length === 0 && lotti.length === 0;

  const contesto: VoceContesto[] = dati.voci.map((v) => ({
    id: v.ingrediente.id, nome: v.ingrediente.nome, unitaBase: v.ingrediente.unitaBase,
    formatoConfezione: v.ingrediente.formatoConfezione, residuo: v.residuo, congelato: v.congelato,
  }));

  let corpo: ReactNode;
  if (risultati && risultati.totale === 0) {
    corpo = <SchedaCrea query={query.trim()} onCrea={() => apriNuovo(query.trim())} />;
  } else if (vuota) {
    corpo = <StatoVuoto />;
  } else {
    corpo = (
      <>
        {raggruppaPerArea(voci, dati.ordineAree).map((g) => (
          <WidgetArea key={g.area} etichetta={nomeArea(g.area)} colore={coloreArea(g.area)}>
            {g.voci.map((v) => (
              <TesseraDispensa
                key={v.ingrediente.id}
                voce={v}
                pillola={pillolaStato(v, oggi, dimenticato(v))}
                onApri={() => setFoglio({ tipo: 'ingrediente', id: v.ingrediente.id, vista: 'dettaglio' })}
              />
            ))}
          </WidgetArea>
        ))}
        {lotti.length > 0 && (
          <WidgetArea etichetta="Pronti" colore={null}>
            {lotti.map((l) => (
              <TesseraLotto
                key={l.id}
                nome={nomeLotto(l)}
                porzioni={l.porzioni}
                congelato={l.congelato}
                onApri={() => setFoglio({ tipo: 'lotto', id: l.id, elimina: false })}
              />
            ))}
          </WidgetArea>
        )}
      </>
    );
  }

  const voceAperta = foglio?.tipo === 'ingrediente' ? dati.voci.find((v) => v.ingrediente.id === foglio.id) : undefined;
  const lottoAperto = foglio?.tipo === 'lotto' ? dati.lotti.find((l) => l.id === foglio.id) : undefined;
  // Gli impegni sono del piatto: il lotto porta solo quelli che gli altri suoi lotti vivi non coprono.
  const impegnateAperto = lottoAperto ? impegnateLotto(lottoAperto, lottiVivi, dati.impegni.get(lottoAperto.dishId) ?? 0) : 0;
  const ingredienti = dati.voci.map((v) => v.ingrediente);
  // APRI {Y} dallo scanner o da Nuovo ingrediente: il dettaglio di Y al posto di quello aperto.
  const apri = (altro: Ingredient) => {
    lasciaNuovo();
    setFoglio({ tipo: 'ingrediente', id: altro.id, vista: 'dettaglio' });
  };

  return (
    <Cornice>
      <div className="sc scroll-app con-dock" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <CampoRicerca
          valore={query}
          onCambia={setQuery}
          contatore={risultati && risultati.totale > 0 ? etichettaRisultati(risultati.totale) : null}
        />
        {corpo}
      </div>

      {!widgetAperto && (
        <DockDispensa
          dettatura={dettatura.disponibile}
          onModifica={apriWidget}
          onPremiMicrofono={(pointerId) => { apriWidget(); dettatura.premi(pointerId); }}
          onToccaMicrofono={() => { apriWidget(); dettatura.tocca(); }}
        />
      )}

      {voceAperta && foglio?.tipo === 'ingrediente' && (
        // La chiave per ingrediente: APRI {Y} rimonta il foglio da capo, senza
        // portarsi dietro i campi e la riga di scadenza aperta di X.
        <FoglioDalBasso
          key={voceAperta.ingrediente.id}
          etichetta={foglio.vista === 'scansione' ? 'Scansiona una confezione' : voceAperta.ingrediente.nome}
          onChiudi={() => setFoglio(null)}
        >
          {foglio.vista === 'dettaglio' ? (
            <DettaglioIngrediente
              voce={voceAperta}
              avviso={avvisoVoce(voceAperta, oggi, dimenticato(voceAperta))}
              oggi={oggi}
              onInCasa={() => residuo(voceAperta.ingrediente.id, voceAperta.ingrediente.formatoConfezione)}
              onFinito={() => residuo(voceAperta.ingrediente.id, 0)}
              onResiduo={(n) => residuo(voceAperta.ingrediente.id, n)}
              onCongelato={(c) => scriviVoce(voceAperta.ingrediente.id, { congelato: c, scadenzaManuale: null }, () => impostaCongelato(voceAperta.ingrediente.id, c))}
              onScadenza={(d) => scriviVoce(voceAperta.ingrediente.id, { scadenzaManuale: d }, () => impostaScadenza(voceAperta.ingrediente.id, d))}
              onScansiona={() => setFoglio({ tipo: 'ingrediente', id: voceAperta.ingrediente.id, vista: 'scansione' })}
              onChiudi={() => setFoglio(null)}
            />
          ) : (
            <ScansioneConfezione
              ingrediente={voceAperta.ingrediente}
              congelato={voceAperta.congelato}
              ingredienti={ingredienti}
              oggi={oggi}
              onIndietro={() => setFoglio({ tipo: 'ingrediente', id: voceAperta.ingrediente.id, vista: 'dettaglio' })}
              onChiudi={() => setFoglio(null)}
              onAggiungi={(formato, ean) => aggiungi(voceAperta, formato, ean)}
              onApri={apri}
            />
          )}
        </FoglioDalBasso>
      )}

      {lottoAperto && foglio?.tipo === 'lotto' && (
        <>
          <FoglioDalBasso etichetta={`Lotto di ${nomeLotto(lottoAperto)}`} onChiudi={() => setFoglio(null)}>
            <DettaglioLotto
              lotto={lottoAperto}
              nome={nomeLotto(lottoAperto)}
              impegnate={impegnateAperto}
              onPorzioni={(n) => porzioni(lottoAperto.id, n)}
              onCongelato={(c) => scriviLotto(lottoAperto.id, { congelato: c }, () => impostaCongelatoLotto(lottoAperto.id, c))}
              onElimina={() => setFoglio({ tipo: 'lotto', id: lottoAperto.id, elimina: true })}
              onChiudi={() => setFoglio(null)}
            />
          </FoglioDalBasso>
          {foglio.elimina && (
            <FoglioDalBasso
              etichetta="Elimini il lotto?"
              onChiudi={() => setFoglio({ tipo: 'lotto', id: lottoAperto.id, elimina: false })}
              altezza="contenuto"
              ruolo="alertdialog"
              chiudiDalVelo={false}
              livello={2}
            >
              <DialogoElimina
                nome={nomeLotto(lottoAperto)}
                porzioni={lottoAperto.porzioni}
                impegnate={impegnateAperto}
                onAnnulla={() => setFoglio({ tipo: 'lotto', id: lottoAperto.id, elimina: false })}
                onElimina={() => elimina(lottoAperto.id)}
              />
            </FoglioDalBasso>
          )}
        </>
      )}

      {foglio?.tipo === 'nuovo' && (
        <FoglioDalBasso etichetta="Nuovo ingrediente" onChiudi={chiudiNuovo}>
          <NuovoIngrediente nomeIniziale={foglio.nome} ingredienti={ingredienti} onCrea={crea} onApri={apri} onChiudi={chiudiNuovo} />
        </FoglioDalBasso>
      )}

      {widgetAperto && (
        <WidgetAI contesto={contesto} dettatura={dettatura} bozza={bozza} onBozza={setBozza} onDatiCambiati={ricarica} onChiudi={chiudiWidget} />
      )}
    </Cornice>
  );
}

/** Nessun risultato (spec §B, v2 03): la scheda che propone di crearlo. */
function SchedaCrea({ query, onCrea }: { query: string; onCrea: () => void }) {
  return (
    <section style={{ margin: '0 16px 12px', background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{`Nessun ingrediente si chiama «${query}»`}</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>Crealo ora: entra fra gli ingredienti e da qui lo segni in casa.</p>
      <TastoPrimario onClick={onCrea}>{`CREA «${query.toUpperCase()}»`}</TastoPrimario>
    </section>
  );
}

/** Nessun ingrediente in casa né finito e nessun lotto (spec §A, v1 18): Dock e ricerca restano. */
function StatoVuoto() {
  return (
    <section style={{ margin: '0 16px', background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22, padding: '26px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 14, border: '2px dashed var(--bordo-tratteggio)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconaBarattolo />
      </span>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--ink)' }}>Ancora niente in dispensa</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)', maxWidth: '30ch' }}>
        Si riempie da sé: appena chiudi la prima spesa, qui trovi quello che è rimasto.
      </p>
    </section>
  );
}

/** La Dispensa è una voce della tab bar: Testata come le altre radici. */
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Dispensa" />
      {children}
    </div>
  );
}
