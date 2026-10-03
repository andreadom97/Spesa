'use client';

import { useState } from 'react';
import type { Ingredient, MealSlotDef } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { chiavePasto, pastoEffettivo, unitaBaseDi } from '@/domain/import/types';
import { normalizza, quantoBasta } from '@/domain/import/mapping';
import {
  cambiaRiga, chiaveGruppo, etichettaGiorno, gruppiRighe, righeDelPasto, rigaIrrisolta, togliRiga, unitaDelGruppo, unitaNota,
  type RigaNelPasto,
} from '@/domain/import/dubbi';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { BloccoGruppo, Nota } from '@/components/pannello/pezzi';
import { RigaAlimento } from '@/components/RigaAlimento';
import { capitalizza, nomePasto } from './sezione';

export const AVVISO_SENZA_PESO = "Sul foglio non c'è un peso: scrivi quanto ne usi e in che unità.";
export const AVVISO_SENZA_QUANTITA = "Sul foglio non c'è un peso: scrivi quanto ne usi.";
export const AVVISO_UNITA_DIVERSE = 'Nei giorni ci sono unità diverse: scegline una per tutti.';

/** Il nome del foglio e del suo dialogo: «Lunedì, settimana 1», «Lunedì», o il titolo dello scenario. */
export function nomeGiorno(piano: PianoEstratto, settimana: number, giorno: number, titolo: string | null): string {
  const etichetta = etichettaGiorno(piano, giorno, titolo);
  return piano.settimane.length > 1 && titolo === null ? `${etichetta}, settimana ${settimana}` : etichetta;
}

interface Props {
  piano: PianoEstratto;
  /** Lo stato con le modifiche locali del foglio già fuse: il foglio mostra quello. */
  stato: StatoRevisione;
  slotDefs: MealSlotDef[];
  /** Gli ingredienti che hai: servono a calcolare le stesse proposte di Controlla (correzione D4). */
  ingredientiEsistenti?: Ingredient[];
  settimana: number;
  giorno: number;
  onCambiaPasto: (chiave: string, pasto: PastoEstratto) => void;
  onChiudi: () => void;
}

/**
 * Il foglio del giorno (spec 8b §E): i pasti del giorno con le Righe dell'alimento. Si cambia
 * una quantità e si toglie una riga (decisione 2); nomi e piatti si sistemano dopo, nell'editor
 * del Piatto. Le modifiche le tiene Controlla e risalgono alla chiusura, con un solo `onStato`.
 */
export function FoglioGiorno({ piano, stato, slotDefs, ingredientiEsistenti = [], settimana, giorno, onCambiaPasto, onChiudi }: Props) {
  const giornoPiano = piano.settimane.find((s) => s.numero === settimana)?.giorni.find((g) => g.giorno === giorno);
  // Le righe irrisolte all'apertura: tengono le pillole dell'unità anche dopo la risposta,
  // così un'unità scelta per sbaglio si cambia finché il foglio è aperto.
  const [irrisolteAllApertura] = useState(() => {
    const chiavi = new Set<string>();
    giornoPiano?.pasti.forEach((_, i) => {
      for (const { riga } of righeDelPasto(pastoEffettivo(piano, stato.correzioni, settimana, giorno, i))) {
        if (rigaIrrisolta(riga)) chiavi.add(chiaveGruppo(riga));
      }
    });
    return chiavi;
  });
  // I pasti con piatti all'apertura (spec 8b §E): un pasto già vuoto non compare; uno svuotato
  // qui dice «Pasto tolto» fino alla chiusura.
  const [pieniAllApertura] = useState(() => new Set(
    (giornoPiano?.pasti ?? []).flatMap((_, i) => (pastoEffettivo(piano, stato.correzioni, settimana, giorno, i).piatti.length > 0 ? [i] : [])),
  ));
  if (!giornoPiano) return null;
  const nome = nomeGiorno(piano, settimana, giorno, giornoPiano.titolo);
  const nomeSlot = (id: string | undefined) => slotDefs.find((s) => s.id === id)?.nome;
  // I gruppi con una proposta compilata (spec 8c §D): nel foglio come in pagina sono «proposta da
  // me», non un dubbio (correzione D4). Stesso calcolo di Controlla, sullo stato che il foglio mostra.
  const conProposta = new Set(gruppiRighe(piano, stato, ingredientiEsistenti).filter((g) => g.proposta !== null).map((g) => g.chiave));

  return (
    <FoglioDalBasso etichetta={nome} onChiudi={onChiudi}>
      <TestataFoglio onChiudi={onChiudi} etichettaChiudi={`Chiudi ${nome}`}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)' }}>{nome}</h2>
      </TestataFoglio>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {giornoPiano.pasti.map((_, indice) => {
          if (!pieniAllApertura.has(indice)) return null;
          const chiave = chiavePasto(settimana, giorno, indice);
          const pasto = pastoEffettivo(piano, stato.correzioni, settimana, giorno, indice);
          const titolo = nomeSlot(stato.mappaturaPasti[normalizza(pasto.nomeOriginale)]) ?? nomePasto(pasto.nomeOriginale);
          if (pasto.piatti.length === 0) {
            return (
              <BloccoGruppo key={chiave} titolo={titolo}>
                <Nota>Pasto tolto: nessun piatto da creare per questo giorno.</Nota>
              </BloccoGruppo>
            );
          }
          const righe = righeDelPasto(pasto);
          const riga = (r: RigaNelPasto) => {
            const chiaveRiga = chiaveGruppo(r.riga);
            // L'unità fissa: da un'altra riga dello stesso alimento fuori dai dubbi (decisione 8)
            // o da un'altra riga già risolta dello stesso gruppo (I2), così lo stesso gruppo non
            // si risolve in pz un giorno e in g un altro. Le pillole solo se non c'è nessuna delle due.
            const nota = unitaNota(piano, stato, normalizza(r.riga.alimento), chiaveRiga)
              ?? unitaDelGruppo(piano, stato, chiaveRiga, { pasto: chiave, posizione: r.posizione });
            const irrisolta = rigaIrrisolta(r.riga);
            // Correzione D4: una riga di un gruppo con la proposta già scelta non chiede niente.
            const dubbio = irrisolta && !conProposta.has(chiaveRiga);
            // Correzione S1: un q.b. con la quantità stimata dal lettore resta q.b., e la stima non si mostra.
            const qb = quantoBasta(r.riga);
            const pillole = irrisolteAllApertura.has(chiaveRiga) && nota === null;
            return (
              <RigaAlimento
                key={`${chiaveRiga}|${r.posizione.piatto}|${r.posizione.componente}|${r.posizione.opzione}|${r.posizione.riga}`}
                nome={capitalizza(r.riga.alimento)}
                etichetta={r.riga.alimento}
                nota={`Sul foglio: «${r.riga.testoOriginale}»${r.riga.quantitaInferita && !qb ? ' · quantità proposta da me' : ''}${qb ? ' · quanto basta' : ''}`}
                // Il numero dei cucchiai non è una quantità in g/ml/pz: il campo parte vuoto. Il q.b. pure.
                quantita={qb || unitaBaseDi(r.riga.unita) === null ? null : r.riga.quantita}
                unita={unitaBaseDi(r.riga.unita) ?? nota}
                scegliUnita={pillole}
                dubbio={dubbio}
                avviso={dubbio ? (pillole ? AVVISO_SENZA_PESO : AVVISO_SENZA_QUANTITA) : undefined}
                onValore={(quantita, unita) => onCambiaPasto(chiave, cambiaRiga(pasto, r.posizione, { quantita, unita, quantitaInferita: false }))}
                onTogli={() => onCambiaPasto(chiave, togliRiga(pasto, r.posizione))}
              />
            );
          };
          return (
            <BloccoGruppo key={chiave} titolo={titolo}>
              {pasto.piatti.map((piatto, ip) => (
                <div key={ip} style={{ padding: '8px 0 4px' }}>
                  <div style={{ padding: '0 4px 2px', fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>{piatto.nome}</div>
                  {righe.filter((r) => r.posizione.piatto === ip && r.posizione.componente === null).map(riga)}
                  {piatto.componenti.map((componente, ic) => (
                    <div key={ic} style={{ paddingTop: 6 }}>
                      <div style={{ padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sec)' }}>
                        {componente.nome || 'Componente'}{componente.nota ? ` · ${componente.nota}` : ''}
                      </div>
                      {componente.opzioni.map((_, io) => (
                        <div key={io}>
                          {io > 0 && <div style={{ padding: '2px 4px', fontSize: 12.5, fontStyle: 'italic', color: 'var(--ter)' }}>oppure</div>}
                          {righe.filter((r) => r.posizione.piatto === ip && r.posizione.componente === ic && r.posizione.opzione === io).map(riga)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </BloccoGruppo>
          );
        })}
      </div>
    </FoglioDalBasso>
  );
}
