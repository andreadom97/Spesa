'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { AreaId, ClasseResiduo, Ingredient, UnitaBase } from '@/domain/types';
import { salvaIngrediente, leggiIngredienti, eliminaIngrediente, IngredienteInUsoError, haAcquistiRegistrati } from '@/data/repertorio';
import { leggiImpostazioni } from '@/data/impostazioni';
import { AREE, coloreArea, nomeArea } from '@/domain/aree';
import { GIORNI_CONTROLLO_DEFAULT, ogniCadenza, type GiorniControllo } from '@/domain/pantry';
import { MSG_CATALOGO, proprietario } from '@/domain/scansione-dispensa';
import { Segmento } from '@/components/Segmento';
import { Dock } from '@/components/Dock';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { Etichetta, MessaggioErrore, STILE_PILLOLA, TastoPrimario, TastoSecondario } from '@/components/controlli';
import { useNascondiBarra } from '@/components/barra-context';
import { useIndietroFogli } from '@/components/useIndietroFogli';
import { indirizzoRitorno } from '@/components/pannello/indirizzi';
import { LettoreCodice, cercaProdotto } from '@/app/(app)/dispensa/LettoreCodice';
import { IconaScansione } from '@/app/(app)/dispensa/icone';
import { segnalaIngredienteCreato } from '../../bozza';

/**
 * Le tre spiegazioni sono copiate alla lettera da Ingrediente.dc.html,
 * apostrofi tipografici compresi: spiegano all'utente un concetto che non
 * conosce (le classi di residuo) ed è testo pensato e discusso, non da
 * riformulare. Quella della classe «a stima» sta in `spiegaClasse`, perché
 * dice la cadenza scelta nelle impostazioni.
 */
const SPIEGA_CLASSE: Record<Exclude<ClasseResiduo, 'stima'>, string> = {
  porzionabile:
    'La confezione copre più pasti. L’app calcola quanto ne resta dopo ogni porzione e lo riporta alla settimana dopo.',
  intero: 'Si conta a pezzi e non lascia resti frazionari: sei uova sono sei uova.',
};

/**
 * La spiegazione della classe di residuo (Ingrediente.dc.html, testi di oggi). Quella della
 * classe «a stima» dice la cadenza scelta nelle impostazioni: prima della fase 5 diceva
 * «Ogni 90 giorni» (decisione di Andrea del 26/09). Apostrofo tipografico, come oggi.
 */
function spiegaClasse(classe: ClasseResiduo, giorni: GiorniControllo): string {
  if (classe === 'stima') {
    return `Non vale la pena contarlo a grammi. ${ogniCadenza(giorni)} dall’ultimo acquisto la lista ti chiede se ne hai ancora.`;
  }
  return SPIEGA_CLASSE[classe];
}

/**
 * La frase sullo storico acquisti compare solo se ce n'è uno da perdere
 * davvero: `purchase.ingredient_id` ha `on delete cascade` (a differenza di
 * `dish_ingredient`/`shopping_list_item`, che hanno `restrict` e bloccano
 * l'eliminazione), quindi cancellare l'ingrediente porta via anche il suo
 * storico acquisti senza altro avviso. Su un ingrediente mai comprato
 * aggiungerla sarebbe rumore, non informazione.
 */
function testoElimina(haAcquisti: boolean): string {
  const base = 'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato.';
  const storico = haAcquisti
    ? ' Sparisce anche lo storico degli acquisti registrati: non si recupera.'
    : '';
  const blocco =
    ' Se è ancora usato in un piatto o in una lista della spesa, l’eliminazione viene bloccata: toglilo prima da lì.';
  return base + storico + blocco;
}

const OPZIONI_UNITA: { id: UnitaBase; label: string }[] = [
  { id: 'g', label: 'G' },
  { id: 'ml', label: 'ML' },
  { id: 'pz', label: 'PZ' },
];

const OPZIONI_CLASSE = [
  { id: 'porzionabile', label: 'PORZIONABILE' },
  { id: 'intero', label: 'INTERO' },
  { id: 'stima', label: 'A STIMA' },
];

/**
 * Il prezzo si digita in un campo di testo (non `type="number"`): il tastierino
 * decimale di iOS in italiano offre la virgola, e un input numerico la
 * rifiuterebbe in silenzio. Vuoto = nessun prezzo (`null`); altrimenti si
 * accetta virgola o punto e si lascia al chiamante decidere se il numero è
 * valido (NaN o ≤ 0 bloccano il salvataggio, come per il formato).
 */
function analizzaPrezzo(testo: string): number | null {
  const pulito = testo.trim();
  if (!pulito) return null;
  return Number(pulito.replace(',', '.'));
}

/** Da numero a testo del campo: con la virgola, come lo si scriverebbe. */
function prezzoInTesto(prezzo: number | null): string {
  return prezzo === null ? '' : String(prezzo).replace('.', ',');
}

/** Spec fase 5 §F.1, testo nuovo. */
const MSG_SCONOSCIUTO = 'Non conosciamo questo prodotto: scrivi tu la confezione.';
/** La nota di oggi degli Ingredienti (spec §F punto 6, frame 12). */
const NOTA_INGREDIENTI =
  'Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.';

const STILE_NOTA: CSSProperties = { margin: '0 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' };
/** Il campo 96 × 44 del frame 12 (lo stesso di `CampoConSalva`): formato e prezzo. */
const STILE_CAMPO_96: CSSProperties = {
  width: 96, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
  border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
};

/** Pillola d'azione con stato (DESIGN.md §8): piena in --ink quando è la scelta. */
function pillola(attiva: boolean): CSSProperties {
  return {
    ...STILE_PILLOLA,
    background: attiva ? 'var(--ink)' : 'var(--superficie)',
    color: attiva ? 'var(--superficie)' : 'var(--sec)',
    border: attiva ? '1px solid var(--ink)' : '1px solid rgba(20,22,58,0.09)',
  };
}

interface Modulo {
  nome: string;
  area: AreaId | null;
  unitaBase: UnitaBase;
  classeResiduo: ClasseResiduo;
  deperibile: boolean;
  formatoTesto: string;
  prezzoTesto: string;
  ean: string | null;
}

/** Il confronto «è cambiato qualcosa?» (§F: SALVA spento finché niente cambia). */
function firma(m: Modulo): string {
  return JSON.stringify(m);
}

/** Un ingrediente nuovo parte da qui: deperibile true come in Ingrediente.dc.html (vedi sotto). */
const FIRMA_NUOVO = firma({
  nome: '', area: null, unitaBase: 'g', classeResiduo: 'porzionabile', deperibile: true, formatoTesto: '', prezzoTesto: '', ean: null,
});

/**
 * Editor delle proprietà di un ingrediente: crea (`ingId === 'nuovo'`) o
 * modifica un ingrediente del repertorio. Sono le proprietà da cui dipende
 * l'aritmetica del residuo (`residuo = residuo precedente + comprato -
 * consumato dal piano`): formato confezione e classe di residuo, più area e
 * deperibilità che decidono dove l'ingrediente finisce nella lista.
 *
 * Dalla fase 5 è il frame 12 (spec §F): pagina piena senza tab bar, SALVA nel
 * Dock, la freccia che segue `torna`. Gli ingressi sono due, dal piatto e dal
 * pannello delle impostazioni (`?torna=impostazioni`): le modifiche valgono per
 * entrambi, cambia solo dove si torna.
 */
export default function IngredienteEditor() {
  const { id, ingId } = useParams<{ id: string; ingId: string }>();
  const router = useRouter();
  const nuovo = ingId === 'nuovo';
  // Pagina piena, senza tab bar (spec §F): il Dock scende a 22 da sé.
  useNascondiBarra(true);

  const [caricamento, setCaricamento] = useState(true);
  const [erroreCarica, setErroreCarica] = useState<string | null>(null);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);
  const [erroreElimina, setErroreElimina] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [nonTrovato, setNonTrovato] = useState(false);
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const [haAcquisti, setHaAcquisti] = useState(false);
  const [firmaIniziale, setFirmaIniziale] = useState<string | null>(null);
  // La cadenza serve solo alla spiegazione «a stima»: se non si legge vale il default, e
  // l'editor funziona lo stesso.
  const [giorniControllo, setGiorniControllo] = useState<GiorniControllo>(GIORNI_CONTROLLO_DEFAULT);
  useEffect(() => {
    let vivo = true;
    leggiImpostazioni()
      .then((i) => { if (vivo) setGiorniControllo(i.giorniControllo); })
      .catch((e) => console.error('ingrediente: lettura della cadenza fallita.', e));
    return () => {
      vivo = false;
    };
  }, []);

  // Da dove si è arrivati, e quindi dove tornare. L'editor nasce dentro un
  // piatto, ma gli Ingredienti del pannello riusano questa stessa schermata:
  // senza saperlo, salvare da lì scaricherebbe l'utente su un piatto nuovo vuoto.
  // Letto da window.location e non da useSearchParams per non imporre un
  // confine <Suspense> a tutta la pagina, come già fatto in /entra.
  const [tornaAImpostazioni, setTornaAImpostazioni] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('torna');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (p === 'impostazioni') setTornaAImpostazioni(true);
  }, []);
  /**
   * Freccia e SALVA vanno nello stesso posto (spec §F). Con `torna=impostazioni` è il
   * pannello sugli Ingredienti sopra la pagina d'origine: `indirizzoRitorno()` legge
   * l'origine che il pannello ha salvato, e il pannello rimette lo scorrimento. Si
   * legge al tocco, non al render. Prima della fase 5 la freccia andava sempre a
   * `/piatti/{id}`, e con `id = nuovo` finiva nell'editor di un piatto nuovo
   * [misurato]: corretto qui.
   */
  const ritorno = () => (tornaAImpostazioni ? indirizzoRitorno() : `/piatti/${id}`);

  const [nome, setNome] = useState('');
  const [area, setArea] = useState<AreaId | null>(null);
  const [unitaBase, setUnitaBase] = useState<UnitaBase>('g');
  const [classeResiduo, setClasseResiduo] = useState<ClasseResiduo>('porzionabile');
  // Default true come in Ingrediente.dc.html (this.state.deper = true, riga 86):
  // un default sbagliato qui si nota subito, perché finisce nel top-up, la
  // lista che si guarda più spesso — con false l'errore resterebbe sepolto
  // nella lista base settimanale.
  const [deperibile, setDeperibile] = useState(true);
  const [formatoTesto, setFormatoTesto] = useState('');
  // Testo del campo prezzo, non numero: così "2," resta "2," mentre si
  // digita. Caricato dall'ingrediente esistente perché salvaIngrediente
  // scrive sempre la colonna, anche null: un salvataggio da questa scheda
  // non deve cancellare in silenzio un prezzo già messo.
  const [prezzoTesto, setPrezzoTesto] = useState('');
  // Il codice letto in questa visita. null = nessuna scansione: SALVA non manda la
  // chiave, e l'ultimo codice salvato resta com'è (repertorio.ts, docstring di salvaIngrediente).
  const [ean, setEan] = useState<string | null>(null);
  const [messaggioScan, setMessaggioScan] = useState<string | null>(null);
  const [scansione, setScansione] = useState(false);
  const [altro, setAltro] = useState<Ingredient | null>(null);

  function chiudiScansione() {
    setScansione(false);
    setAltro(null);
  }

  // Il gesto indietro chiude prima il dialogo o il foglio, poi esce (spec §A.4, §F.1).
  const { chiudiTuttoPoi } = useIndietroFogli(
    (scansione ? 1 : 0) + (confermaEliminazione ? 1 : 0),
    () => (confermaEliminazione ? setConfermaEliminazione(false) : chiudiScansione()),
  );

  useEffect(() => {
    let vivo = true;
    async function carica() {
      if (nuovo) {
        setCaricamento(false);
        return;
      }
      try {
        const catalogo = await leggiIngredienti();
        if (!vivo) return;
        const trovato = catalogo.find((i) => i.id === ingId);
        if (!trovato) {
          setNonTrovato(true);
        } else {
          const iniziale: Modulo = {
            nome: trovato.nome, area: trovato.area, unitaBase: trovato.unitaBase, classeResiduo: trovato.classeResiduo,
            deperibile: trovato.deperibile, formatoTesto: String(trovato.formatoConfezione),
            prezzoTesto: prezzoInTesto(trovato.prezzoConfezione), ean: null,
          };
          setNome(iniziale.nome);
          setArea(iniziale.area);
          setUnitaBase(iniziale.unitaBase);
          setClasseResiduo(iniziale.classeResiduo);
          setDeperibile(iniziale.deperibile);
          setFormatoTesto(iniziale.formatoTesto);
          setPrezzoTesto(iniziale.prezzoTesto);
          // APRI {altro} arriva qui con la pagina forse non rimontata: niente scansione vecchia.
          setEan(null);
          setMessaggioScan(null);
          setFirmaIniziale(firma(iniziale));
          // Non blocca il caricamento della scheda se fallisce: al peggio la
          // conferma di eliminazione mostra o no la frase sullo storico.
          // Fail-safe invertito di proposito: se non sappiamo se ci sono
          // acquisti, assumiamo di sì. Un avviso di troppo costa una riga di
          // testo; un avviso mancante costa dati che non tornano — un
          // errore di rete transitorio non deve poter far sparire proprio
          // l'unico avviso prima di una cancellazione irreversibile.
          try {
            const conAcquisti = await haAcquistiRegistrati(ingId);
            if (vivo) setHaAcquisti(conAcquisti);
          } catch {
            if (vivo) setHaAcquisti(true);
          }
        }
      } catch (errore) {
        console.error('ingrediente: caricamento fallito.', errore);
        if (vivo) setErroreCarica('Non riusciamo a caricare l’ingrediente. Riprova più tardi.');
      } finally {
        if (vivo) setCaricamento(false);
      }
    }
    carica();
    return () => {
      vivo = false;
    };
  }, [ingId, nuovo]);

  /**
   * Quello che fa list-builder: per la classe "intero" il formato memorizzato
   * viene ignorato e forzato a 1 (`ing.classeResiduo === 'intero' ? 1 :
   * ing.formatoConfezione`). Mostrare qui un altro formato mentirebbe
   * all'utente su cosa succede davvero in lista. L'unità passa a PZ perché
   * un ingrediente "intero" si conta a pezzi: resta comunque modificabile
   * dopo, non è una regola imposta altrove come il formato.
   */
  function scegliClasse(valore: string) {
    const classe = valore as ClasseResiduo;
    setClasseResiduo(classe);
    if (classe === 'intero') {
      setUnitaBase('pz');
      setFormatoTesto('1');
    }
  }

  const intero = classeResiduo === 'intero';
  const formatoConfezione = Number(formatoTesto.trim().replace(',', '.'));
  // Il prezzo è facoltativo, ma se c'è dev'essere un numero positivo: un
  // "0" o un "abc" bloccano il salvataggio come un formato non valido,
  // invece di finire in tabella (che ha comunque un check > 0).
  const prezzoConfezione = analizzaPrezzo(prezzoTesto);
  const prezzoNonValido = prezzoConfezione !== null && (!Number.isFinite(prezzoConfezione) || prezzoConfezione <= 0);
  const nonValido =
    !nome.trim() || area === null || !formatoTesto.trim() || !Number.isFinite(formatoConfezione) || formatoConfezione <= 0 || prezzoNonValido;
  const modulo: Modulo = { nome, area, unitaBase, classeResiduo, deperibile, formatoTesto, prezzoTesto, ean };
  const cambiato = firma(modulo) !== (nuovo ? FIRMA_NUOVO : firmaIniziale);
  const spento = nonValido || !cambiato;

  async function salva() {
    if (spento || salvando || area === null) return;
    setSalvando(true);
    setErroreSalva(null);
    try {
      // Guardiano di integrità: l'interfaccia blocca già la scelta
      // dell'unità quando la classe è 'intero' (il segmento Unità è
      // disabilitato), ma il salvataggio non deve fidarsi solo di quello.
      // list-builder forza formato=1 per 'intero' presupponendo che si
      // contino pezzi: un 'intero' salvato con unità diversa da 'pz'
      // farebbe divergere l'aritmetica della lista dalla realtà, senza dare
      // alcun segnale. Qui si ricalcola, non solo si ricontrolla.
      const unitaEffettiva = intero ? 'pz' : unitaBase;
      const formatoEffettivo = intero ? 1 : formatoConfezione;
      const idSalvato = await salvaIngrediente({
        id: nuovo ? undefined : ingId,
        nome: nome.trim(),
        unitaBase: unitaEffettiva,
        area,
        classeResiduo,
        deperibile,
        formatoConfezione: formatoEffettivo,
        prezzoConfezione,
        // Solo se questa visita ha letto un codice (§F.1): «niente si scrive fino a SALVA».
        ...(ean !== null ? { ean } : {}),
      });
      // Solo su un ingrediente nuovo: chi apre questa scheda per correggere
      // un ingrediente già nel piatto non vuole vederselo aggiungere due volte.
      // Solo tornando a un piatto: dal pannello non c'è nessun piatto in
      // attesa di questo ingrediente.
      if (nuovo && !tornaAImpostazioni) segnalaIngredienteCreato(id, idSalvato);
      router.push(ritorno());
    } catch (errore) {
      console.error('ingrediente: salvataggio fallito.', errore);
      setErroreSalva('Non siamo riusciti a salvare l’ingrediente. Riprova.');
      setSalvando(false);
    }
  }

  /**
   * La lettura (spec §F.1, e §F.3 della fase 4 per il codice di un altro): prima si
   * guarda se il codice è già di un altro ingrediente, senza rete; poi il catalogo.
   * Niente si scrive: formato, unità ed EAN restano nel modulo fino a SALVA. Qui non
   * si usa `aggiornaFormatoDaScansione`, che tocca le righe della lista.
   */
  async function letto(codice: string) {
    let catalogo: Ingredient[] = [];
    try {
      catalogo = await leggiIngredienti();
    } catch {
      // Senza elenco non si riconosce il proprietario: si passa al catalogo.
    }
    const suo = proprietario(codice, catalogo, nuovo ? undefined : ingId);
    if (suo) {
      setAltro(suo);
      return;
    }
    const risposta = await cercaProdotto(codice);
    if (risposta === 'sessione') {
      router.replace('/entra');
      return;
    }
    setEan(codice);
    if (risposta === 'errore') {
      setMessaggioScan(MSG_CATALOGO);
    } else if (!risposta.trovato || !risposta.quantita) {
      setMessaggioScan(MSG_SCONOSCIUTO);
    } else {
      setMessaggioScan(null);
      // Un INTERO si conta a pezzi con formato 1 (list-builder): il peso del catalogo non vale.
      if (!intero) {
        setFormatoTesto(String(risposta.quantita.valore));
        setUnitaBase(risposta.quantita.unita);
      }
    }
    chiudiScansione();
  }

  /** APRI {altro}: il codice resta suo (fase 4 §F.2). Le modifiche di qui si perdono, come con la freccia. */
  function apriAltro(a: Ingredient) {
    const dest = `/piatti/${id}/ingredienti/${a.id}${tornaAImpostazioni ? '?torna=impostazioni' : ''}`;
    // Il foglio ha una voce di cronologia aperta: la push parte dopo il go(-1) (spec §A.5).
    chiudiTuttoPoi(() => router.push(dest));
    chiudiScansione();
  }

  async function confermaElimina(): Promise<void> {
    try {
      await eliminaIngrediente(ingId);
    } catch (e) {
      if (e instanceof IngredienteInUsoError) {
        // Il motivo del blocco è una frase da leggere con calma: resta sotto ELIMINA, a dialogo chiuso.
        setConfermaEliminazione(false);
        setErroreElimina(e.message);
        return;
      }
      console.error('ingrediente: eliminazione fallita.', e);
      throw e; // DialogoConferma mostra il suo errore e resta aperto
    }
    router.push(ritorno());
  }

  const freccia = { etichetta: tornaAImpostazioni ? 'Torna agli ingredienti' : 'Torna al piatto', onTorna: () => router.push(ritorno()) };

  if (nonTrovato) {
    return (
      <Cornice freccia={freccia}>
        <p style={{ margin: '20px 18px', color: 'var(--testo-2)' }}>Ingrediente non trovato.</p>
      </Cornice>
    );
  }
  if (erroreCarica) {
    return (
      <Cornice freccia={freccia}>
        <p style={{ margin: '20px 18px', color: 'var(--testo-2)', fontSize: 13 }}>{erroreCarica}</p>
      </Cornice>
    );
  }
  if (caricamento) return <Cornice freccia={freccia} />;

  return (
    <Cornice
      freccia={freccia}
      area={area}
      nome={
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Dai un nome all'ingrediente"
          className="nome-ingrediente"
          style={{
            display: 'block', width: '100%', fontFamily: 'inherit', fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em',
            lineHeight: 1.05, color: 'var(--ink)', padding: '0 2px 8px', border: 'none',
            borderBottom: '1.5px solid rgba(20,22,58,0.14)', background: 'transparent', outline: 'none',
          }}
        />
      }
    >
      <style jsx>{`
        .nome-ingrediente::placeholder { color: var(--icona-spenta); }
      `}</style>
      <div className="sc scroll-app con-dock" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>AREA</Etichetta>
          <div role="group" aria-label="Area" style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {AREE.map((a) => {
              const scelta = area === a.id;
              return (
                <button key={a.id} type="button" aria-pressed={scelta} onClick={() => setArea(a.id)} style={{ ...pillola(scelta), color: scelta ? 'var(--superficie)' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, flex: 'none', background: coloreArea(a.id) }} />
                  {a.nome}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>CONFEZIONE</Etichetta>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Formato della confezione"
              value={formatoTesto}
              disabled={intero}
              onChange={(e) => setFormatoTesto(e.target.value)}
              style={{ ...STILE_CAMPO_96, opacity: intero ? 0.5 : 1 }}
            />
            <div role="group" aria-label="Unità" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 44, padding: '0 3px', borderRadius: 999, background: 'var(--barra-attiva)', opacity: intero ? 0.5 : 1 }}>
              {OPZIONI_UNITA.map((o) => {
                const scelta = unitaBase === o.id;
                return (
                  // Il bottone è l'area di tocco da 44, la pillola visibile è 38 (frame 12), come in Segmento.
                  <button key={o.id} type="button" aria-pressed={scelta} disabled={intero} onClick={() => setUnitaBase(o.id)} style={{ height: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{
                      height: 38, minWidth: 44, padding: '0 10px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: scelta ? 'var(--superficie)' : 'none', boxShadow: scelta ? 'var(--ombra-tessera)' : 'none',
                      color: scelta ? 'var(--ink)' : 'var(--testo-2)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    }}>
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <TastoSecondario onClick={() => setScansione(true)} style={{ marginTop: 4 }}>
            <IconaScansione />
            SCANSIONA LA CONFEZIONE
          </TastoSecondario>
          {messaggioScan && <p role="status" style={STILE_NOTA}>{messaggioScan}</p>}
          {/* La nota di oggi sul formato: resta (decisione 3 della spec), anche se il frame 12
              non la mostra. La prima frase è quella di Ingrediente.dc.html. La seconda è
              aggiunta: al banco il peso non è mai quello dichiarato — una vaschetta di pollo
              è 297 g, non 300 — e senza dirlo si cerca una precisione che non esiste, o
              peggio ci si blocca. Il numero serve a decidere quante confezioni prendere, e
              lo scarto lo assorbe la Dispensa, che è fatta per questo. */}
          <p style={STILE_NOTA}>
            Quanto ne vendono in una confezione. Serve a sapere quante confezioni comprare, non quanti grammi.
            Dove il peso varia — carne, pesce, formaggio al banco — basta un valore indicativo: lo scarto lo
            correggi dalla Dispensa quando il conto non torna.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>COME SI CONSUMA</Etichetta>
          <Segmento opzioni={OPZIONI_CLASSE} valore={classeResiduo} onCambia={scegliClasse} variante="blocco" />
          <p style={STILE_NOTA}>{spiegaClasse(classeResiduo, giorniControllo)}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 14, borderTop: '1px solid var(--bordo)' }}>
          <div role="group" aria-label="Fresco" style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 4px' }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>Fresco</span>
            <button type="button" aria-pressed={deperibile} onClick={() => setDeperibile(true)} style={{ ...pillola(deperibile), minWidth: 52 }}>SÌ</button>
            <button type="button" aria-pressed={!deperibile} onClick={() => setDeperibile(false)} style={{ ...pillola(!deperibile), minWidth: 52 }}>NO</button>
          </div>
          <p style={{ margin: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--testo-2)' }}>
            {/* Con una lista sola il flag non decide più in quale lista finisce (decisione
                del 20/09): decide se il residuo può decadere (pantry.ts).
                La sottoriga dice DOVE la scelta ha effetto, non quanto dura: "non arriva
                alla settimana dopo" era falso in tre casi su `residuoUtilizzabile` —
                `GIORNI_FRESCO.surgelati` è null e il residuo non decade mai, con
                `congelato` la soglia è `GIORNI_CONGELATO` = 90 giorni, e il confronto è
                `>` stretto, quindi a esattamente sette giorni il residuo sopravvive.
                Il ramo non deperibile è l'unico che si può promettere: `residuoUtilizzabile`
                esce subito col residuo intero e `scadenzaResiduo` ritorna null. */}
            {deperibile ? 'QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO' : 'IL RESIDUO NON SCADE'}
          </p>
        </div>

        {/* Il prezzo dopo Fresco (spec §F): è il prezzo di QUELLA confezione, e serve
            solo al contatore del non ricomprato (spec §4 della fase 1), non alla lista. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>PREZZO DI UNA CONFEZIONE</Etichetta>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="text" inputMode="decimal" aria-label="Prezzo di una confezione" value={prezzoTesto} onChange={(e) => setPrezzoTesto(e.target.value)} style={STILE_CAMPO_96} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ter)' }}>€</span>
          </div>
          <p style={STILE_NOTA}>Facoltativo, in euro: serve solo a contare quanto non ricompri</p>
        </div>

        <p style={STILE_NOTA}>{NOTA_INGREDIENTI}</p>

        {/* ELIMINA in coda (spec §F), solo su un ingrediente che esiste: su uno nuovo
            non c'è niente da eliminare, e la freccia fa quel lavoro. Qui l'eliminazione è
            definitiva (hard delete, vedi eliminaIngrediente in src/data/repertorio.ts):
            passa sempre dal dialogo, mai con un tocco solo. */}
        {!nuovo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TastoSecondario aria-label="Elimina ingrediente" onClick={() => setConfermaEliminazione(true)} style={{ color: 'var(--errore)' }}>
              ELIMINA
            </TastoSecondario>
            {erroreElimina && <MessaggioErrore ruolo="alert">{erroreElimina}</MessaggioErrore>}
          </div>
        )}
      </div>

      <Dock>
        {erroreSalva && (
          // Sopra il Dock (§F): fuori dalla pillola, su fondo bianco, perché sotto scorre la pagina.
          <p role="alert" style={{
            position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', margin: 0, padding: '10px 14px',
            borderRadius: 14, background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
            fontSize: 12.5, lineHeight: 1.45, color: 'var(--errore)',
          }}>
            {erroreSalva}
          </p>
        )}
        <button
          type="button"
          className="dock-primario"
          onClick={() => void salva()}
          disabled={spento || salvando}
          aria-busy={salvando || undefined}
          // In volo è il primario a 0,5, non lo spento grigio di `.dock-primario:disabled`.
          style={salvando ? { background: 'var(--ink)', color: 'var(--superficie)', opacity: 0.5 } : undefined}
        >
          {salvando ? 'SALVATAGGIO…' : 'SALVA'}
        </button>
      </Dock>

      {scansione && (
        <FoglioDalBasso etichetta="Scansiona la confezione" onChiudi={chiudiScansione}>
          <TestataFoglio onChiudi={chiudiScansione} />
          <div className="sc corpo-foglio" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {altro ? (
              <>
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{`Questo codice è di ${altro.nome}.`}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TastoSecondario onClick={() => setAltro(null)} style={{ flex: 1 }}>NON È QUESTA</TastoSecondario>
                  <TastoPrimario onClick={() => apriAltro(altro)} style={{ flex: 1 }}>{`APRI ${altro.nome.toUpperCase()}`}</TastoPrimario>
                </div>
              </>
            ) : (
              <LettoreCodice onCodice={(c) => void letto(c)} />
            )}
          </div>
        </FoglioDalBasso>
      )}

      {confermaEliminazione && (
        <FoglioDalBasso
          etichetta="Eliminare questo ingrediente?"
          onChiudi={() => setConfermaEliminazione(false)}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
          livello={2}
        >
          <DialogoConferma
            titolo="Eliminare questo ingrediente?"
            testo={testoElimina(haAcquisti)}
            azione="ELIMINA"
            tono="distruttivo"
            erroreTesto="Non siamo riusciti a eliminare l’ingrediente. Riprova."
            onConferma={confermaElimina}
            onAnnulla={() => setConfermaEliminazione(false)}
          />
        </FoglioDalBasso>
      )}
    </Cornice>
  );
}

/**
 * La testata del frame 12: il tondo 44 con la freccia, sotto l'area in etichetta
 * mono col quadratino, poi il nome a 32/800 (è il campo di oggi). Non è Testata:
 * questa è una pagina di modifica, senza titolo di schermata.
 */
function Cornice({ children, freccia, area = null, nome }: {
  children?: ReactNode;
  freccia: { etichetta: string; onTorna: () => void };
  area?: AreaId | null;
  nome?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <button
          type="button"
          aria-label={freccia.etichetta}
          onClick={freccia.onTorna}
          style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--barra-attiva)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {area && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: coloreArea(area) }} />
            {nomeArea(area)}
          </span>
        )}
        {nome && <div style={{ alignSelf: 'stretch' }}>{nome}</div>}
      </div>
      {children}
    </div>
  );
}
