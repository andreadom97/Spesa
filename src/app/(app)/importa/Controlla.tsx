'use client';

import { useRef, useState } from 'react';
import type { Ingredient, MealSlotDef } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { NOME_PASTO_CONDIMENTI } from '@/domain/import/types';
import {
  anteprimaTogli, conteggi, confermaTutti, gruppiRighe, pronto, provenienza, riassuntoGiorni, rispondiGruppo, vociPasti,
  type AnteprimaTogli, type GruppoRighe, type VocePasto,
} from '@/domain/import/dubbi';
import { BloccoGruppo } from '@/components/pannello/pezzi';
import { RigaImpostazione } from '@/components/pannello/RigaImpostazione';
import { RigaAlimento } from '@/components/RigaAlimento';
import { SelettoreFoglio } from '@/components/SelettoreFoglio';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { Dock } from '@/components/Dock';
import { ordinaPastiPerSlot, posizioniMedieNelGiorno } from '@/domain/import/mapping';
import { useLivelliImporta } from './livelli';
import { AVVISO_SENZA_PESO, AVVISO_SENZA_QUANTITA, AVVISO_UNITA_DIVERSE, FoglioGiorno, nomeGiorno } from './FoglioGiorno';
import { TitoloSezione, capitalizza, nomePasto, plurale } from './sezione';

interface Props {
  piano: PianoEstratto;
  stato: StatoRevisione;
  slotDefs: MealSlotDef[];
  ingredientiEsistenti?: Ingredient[];
  onStato: (s: StatoRevisione) => void;
}

/** Il livello aperto sopra la pagina: uno alla volta, dichiarato con `useLivelliImporta` (spec 8b §D, 8c §F). */
type Livello =
  | { tipo: 'selettore'; chiave: string }
  | { tipo: 'giorno'; settimana: number; giorno: number }
  | { tipo: 'togli'; chiave: string }
  | { tipo: 'esci' }
  | null;

/**
 * I testi del dialogo TOGLI (I3): il titolo conta i pasti effettivi; il testo non promette
 * l'editor del piatto quando la cascata toglie il piatto, e con lui magari il pasto.
 */
function testiTogli(alimento: string, anteprima: AnteprimaTogli): { titolo: string; testo: string; stato: StatoRevisione } {
  const n = anteprima.piattiSpariti;
  const seguito = n === 0
    ? "Puoi rimetterle dall'editor del piatto, a piano creato."
    : n === 1
      ? 'Sparisce anche 1 piatto rimasto senza ingredienti.'
      : `Spariscono anche ${n} piatti rimasti senza ingredienti.`;
  return {
    titolo: anteprima.pasti > 1 ? `Togliere ${alimento} da ${anteprima.pasti} pasti?` : `Togliere ${alimento}?`,
    testo: `Le righe spariscono da tutti i pasti in cui compaiono. ${seguito}`,
    stato: anteprima.stato,
  };
}

/**
 * Controlla (spec 8b §D), il passo 2 di Importa: una pagina sola per tutto il piano. Tutto è
 * accettato di default; si tocca solo quello che l'AI non sa — i pasti senza abbinamento e le
 * righe senza quantità — e il resto è riassunto per giorno e si apre col tocco. Ogni risposta
 * è un `onStato` (mai a ogni tasto: innesca `salvaBozzaImport`); il foglio del giorno tiene le
 * sue modifiche e le fa risalire alla chiusura. L'indietro di Android senza livelli aperti apre
 * «Esci dall'import?» (spec 8c §F): ESCI torna alla pagina di provenienza, RESTA chiude.
 */
export function Controlla({ piano, stato, slotDefs, ingredientiEsistenti = [], onStato }: Props) {
  const [livello, setLivello] = useState<Livello>(null);
  const [locali, setLocali] = useState<Record<string, PastoEstratto>>({});
  // Le modifiche del foglio del giorno anche in un ref, e il giorno aperto: la chiusura legge
  // il ref dopo il blur del campo a fuoco, così un numero scritto e non ancora salvato (indietro
  // con la tastiera aperta) risale anche lui; e un blur tardivo di un foglio già chiuso non
  // scrive più niente.
  const localiRef = useRef<Record<string, PastoEstratto>>({});
  const giornoAperto = useRef<string | null>(null);

  /** Apre un livello solo se non ce n'è già uno: da tastiera il velo non basta a impedirlo. */
  function apri(nuovo: NonNullable<Livello>) {
    if (livello !== null) return;
    if (nuovo.tipo === 'giorno') {
      giornoAperto.current = `${nuovo.settimana}-${nuovo.giorno}`;
      localiRef.current = {};
    }
    setLivello(nuovo);
  }

  function cambiaPasto(settimana: number, giorno: number, chiave: string, pasto: PastoEstratto) {
    if (giornoAperto.current !== `${settimana}-${giorno}`) return;
    localiRef.current = { ...localiRef.current, [chiave]: pasto };
    setLocali(localiRef.current);
  }

  function chiudiGiorno() {
    // Il campo a fuoco salva al blur: il suo numero entra nel ref prima della lettura.
    (document.activeElement as HTMLElement | null)?.blur();
    const modifiche = localiRef.current;
    giornoAperto.current = null;
    localiRef.current = {};
    if (Object.keys(modifiche).length > 0) onStato({ ...stato, correzioni: { ...stato.correzioni, ...modifiche } });
    setLocali({});
    setLivello(null);
  }
  function chiudiLivello() {
    if (livello?.tipo === 'giorno') chiudiGiorno();
    else setLivello(null);
  }
  // Un solo indietro per la bozza (spec 8c §F): i livelli di Controlla, e senza livelli il dialogo di uscita.
  // Il dialogo di uscita arriva sempre da un indietro (la pillola della testata esce con `esci()`
  // senza dialogo): niente voci di cronologia finché è aperto, i push senza tocco fanno uscire
  // l'app al secondo indietro (correzione 8c-bis, prove dal telefono del 03/10; vedi `LivelliImporta`).
  const { esci } = useLivelliImporta(livello ? 1 : 0, chiudiLivello, () => setLivello({ tipo: 'esci' }), livello?.tipo === 'esci');

  const voci = vociPasti(piano, stato, slotDefs);
  const gruppi = gruppiRighe(piano, stato, ingredientiEsistenti);
  // «Da sistemare»: i dubbi senza una proposta sul piano letto; «Da controllare»: le quantità
  // dell'AI e le proposte compilate (spec 8c §D), che non bloccano.
  const irrisolti = gruppi.filter((g) => g.tipo === 'irrisolta');
  const inferiti = gruppi.filter((g) => g.tipo !== 'irrisolta');
  const pastiDaSistemare = voci.filter((v) => v.daSistemare);
  // «Dove vanno i pasti» nell'ordine della casa (slot, poi posizione nel giorno), non della dieta
  // (correzione 8c-bis D, prove dal telefono del 03/10).
  const pastiAbbinati = ordinaPastiPerSlot(voci.filter((v) => !v.daSistemare), slotDefs, posizioniMedieNelGiorno(piano));
  const aperti = pastiDaSistemare.filter((v) => v.slotDefId === null).length
    + irrisolti.filter((g) => g.stato === 'aperto' && g.proposta === null).length;
  const c = conteggi(piano, stato);
  // Zero pasti confermabili (tutti tolti): confermare sostituirebbe il piano con niente.
  const ok = pronto(piano, stato, slotDefs, ingredientiEsistenti) && c.pastiConfermabili > 0;
  const giorni = riassuntoGiorni(piano, stato);
  const piuSettimane = piano.settimane.length > 1;
  const vociSlot = [...slotDefs].sort((a, b) => a.posizione - b.posizione).map((s) => ({ id: s.id, nome: s.nome }));

  const letto = [
    ...(piuSettimane ? [plurale(c.settimane, 'settimana', 'settimane')] : []),
    plurale(c.giorni, 'giorno', 'giorni'),
  ].join(', ');
  const frase = c.pastiConfermabili === 0
    ? "Hai tolto tutti i pasti: non c'è niente da confermare. Se vuoi ripartire, ricomincia l'import."
    : ok
      ? `Niente più da sistemare. Confermo ${c.pastiConfermabili === 1 ? 'il pasto' : `i ${c.pastiConfermabili} pasti`} così: puoi sempre aprire un giorno e correggerlo.`
      : `Ho letto ${letto} e ${plurale(c.pastiLetti, 'pasto', 'pasti')}. Ti chiedo solo quello che non so.`;

  const statoVisto = Object.keys(locali).length > 0 ? { ...stato, correzioni: { ...stato.correzioni, ...locali } } : stato;

  function selettorePasto(v: VocePasto) {
    const condimenti = v.chiave === NOME_PASTO_CONDIMENTI;
    const nome = nomePasto(v.nomeOriginale);
    return (
      <SelettoreFoglio
        key={v.chiave}
        nome={nome}
        nota={condimenti ? 'Nella dieta sono un pasto a parte' : `Nella dieta in ${plurale(v.giorni, 'giorno', 'giorni')}`}
        voci={vociSlot}
        sceltaId={v.slotDefId}
        titolo={condimenti ? 'Condimenti: in quale pasto li usi?' : `${nome}: a quale pasto corrisponde?`}
        notaFoglio={condimenti ? 'Ogni giorno le righe dei condimenti finiscono in questo pasto.' : undefined}
        aperto={livello?.tipo === 'selettore' && livello.chiave === v.chiave}
        onApri={() => apri({ tipo: 'selettore', chiave: v.chiave })}
        onChiudi={() => setLivello(null)}
        onScegli={(id) => {
          if (id !== v.slotDefId) onStato({ ...stato, mappaturaPasti: { ...stato.mappaturaPasti, [v.chiave]: id } });
        }}
      />
    );
  }

  function rigaGruppo(g: GruppoRighe) {
    if (g.stato === 'tolto') {
      return <RigaImpostazione key={g.chiave} nome={capitalizza(g.alimento)} nota="Tolta dal piano" finale={{ tipo: 'niente' }} />;
    }
    const aperto = g.stato === 'aperto';
    // Una proposta compilata (spec 8c §D): si mostra già scelta, senza bordo né avviso.
    const proposta = aperto ? g.proposta : null;
    // Le pillole per ogni dubbio senza unità fissa (decisione 8), e per ogni riga che non ha
    // nessuna unità da mostrare: senza unità il numero scritto non si salverebbe.
    const pillole = proposta === null && g.unitaFissa === null && (g.tipo !== 'inferita' || g.unita === null);
    const diversi = g.stato === 'fatto' && g.quantita === null ? ' · valori diversi nei giorni' : '';
    const daMe = proposta
      ? ` · ${proposta.testo ?? (proposta.origine === 'unitaFrequente' ? "l'unità più usata" : 'porzione tipica')}, proposta da me`
      : g.tipo === 'inferita' || g.daMe ? ' · quantità proposta da me' : '';
    return (
      <RigaAlimento
        key={g.chiave}
        nome={capitalizza(g.alimento)}
        etichetta={g.alimento}
        provenienza={provenienza(piano, g)}
        nota={`Sul foglio: «${g.testoOriginale}»${daMe}${diversi}`}
        quantita={proposta?.quantita ?? g.quantita}
        unita={proposta?.unita ?? g.unita ?? g.unitaFissa}
        scegliUnita={pillole}
        dubbio={aperto && proposta === null}
        avviso={aperto && proposta === null ? (g.unitaDiverse ? AVVISO_UNITA_DIVERSE : pillole ? AVVISO_SENZA_PESO : AVVISO_SENZA_QUANTITA) : undefined}
        onValore={(quantita, unita) => onStato(rispondiGruppo(piano, stato, g.chiave, quantita, unita))}
        onTogli={() => {
          // Il dialogo quando la X tocca più pasti o fa sparire un piatto: qui non si torna indietro.
          const anteprima = anteprimaTogli(piano, stato, g.chiave);
          if (anteprima.pasti > 1 || anteprima.piattiSpariti > 0) apri({ tipo: 'togli', chiave: g.chiave });
          else onStato(anteprima.stato);
        }}
      />
    );
  }

  const daTogliere = livello?.tipo === 'togli' ? gruppi.find((g) => g.chiave === livello.chiave) : undefined;
  const togli = daTogliere ? testiTogli(daTogliere.alimento, anteprimaTogli(piano, stato, daTogliere.chiave)) : null;
  const settimane = [...new Set(giorni.map((g) => g.settimana))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="sc scroll-app con-dock" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ margin: '0 4px', fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>{frase}</p>

        {(pastiDaSistemare.length > 0 || irrisolti.length > 0) && (
          <BloccoGruppo titolo={<TitoloSezione testo="Da sistemare" contatore={aperti === 0 ? 'Fatto' : String(aperti)} />}>
            {pastiDaSistemare.map(selettorePasto)}
            {irrisolti.map(rigaGruppo)}
          </BloccoGruppo>
        )}

        {inferiti.length > 0 && (
          <BloccoGruppo titolo={<TitoloSezione testo="Da controllare" contatore={String(inferiti.length)} />}>
            {inferiti.map(rigaGruppo)}
          </BloccoGruppo>
        )}

        {pastiAbbinati.length > 0 && (
          <BloccoGruppo titolo={<TitoloSezione testo="Dove vanno i pasti" contatore={String(pastiAbbinati.length)} />}>
            {pastiAbbinati.map(selettorePasto)}
          </BloccoGruppo>
        )}

        {settimane.map((n) => {
          const delGruppo = giorni.filter((g) => g.settimana === n);
          const pasti = delGruppo.reduce((somma, g) => somma + g.pasti, 0);
          return (
            <BloccoGruppo key={n} titolo={<TitoloSezione testo={piuSettimane ? `Settimana ${n}` : 'I giorni'} contatore={String(pasti)} />}>
              {delGruppo.map((g) => {
                const nome = nomeGiorno(piano, g.settimana, g.giorno, g.titolo);
                return (
                  <RigaImpostazione
                    key={`${g.settimana}-${g.giorno}`}
                    nome={g.etichetta}
                    nota={g.pasti > 0 ? g.piatti : 'Nessun pasto'}
                    etichetta={`Apri ${nome}`}
                    // Un giorno senza pasti non si apre: il foglio sarebbe vuoto.
                    finale={g.pasti > 0
                      ? { tipo: 'valore', valore: plurale(g.pasti, 'pasto', 'pasti'), onApri: () => apri({ tipo: 'giorno', settimana: g.settimana, giorno: g.giorno }) }
                      : { tipo: 'niente' }}
                  />
                );
              })}
            </BloccoGruppo>
          );
        })}
      </div>

      <Dock>
        <button type="button" className="dock-primario" disabled={!ok} onClick={() => onStato(confermaTutti(piano, stato, ingredientiEsistenti))}>
          CONFERMA I PASTI
        </button>
      </Dock>

      {livello?.tipo === 'giorno' && (
        <FoglioGiorno
          // Lo stato «all'apertura» del foglio vale per un montaggio: un giorno, un montaggio.
          key={`${livello.settimana}-${livello.giorno}`}
          piano={piano}
          stato={statoVisto}
          slotDefs={slotDefs}
          ingredientiEsistenti={ingredientiEsistenti}
          settimana={livello.settimana}
          giorno={livello.giorno}
          onCambiaPasto={(chiave, pasto) => cambiaPasto(livello.settimana, livello.giorno, chiave, pasto)}
          onChiudi={chiudiGiorno}
        />
      )}

      {togli && (
        <FoglioDalBasso
          etichetta={togli.titolo}
          ruolo="alertdialog"
          altezza="contenuto"
          chiudiDalVelo={false}
          onChiudi={() => setLivello(null)}
        >
          <DialogoConferma
            titolo={togli.titolo}
            testo={togli.testo}
            azione="TOGLI"
            tono="distruttivo"
            erroreTesto=""
            onConferma={async () => {
              onStato(togli.stato);
              setLivello(null);
            }}
            onAnnulla={() => setLivello(null)}
          />
        </FoglioDalBasso>
      )}

      {livello?.tipo === 'esci' && (
        <FoglioDalBasso
          etichetta="Esci dall'import?"
          ruolo="alertdialog"
          altezza="contenuto"
          chiudiDalVelo={false}
          onChiudi={() => setLivello(null)}
        >
          <DialogoConferma
            titolo="Esci dall'import?"
            testo="Lo ritrovi com'è: riprendi quando vuoi."
            azione="ESCI"
            annulla="RESTA"
            tono="primario"
            erroreTesto=""
            onConferma={async () => {
              esci();
              setLivello(null);
            }}
            onAnnulla={() => setLivello(null)}
          />
        </FoglioDalBasso>
      )}
    </div>
  );
}
