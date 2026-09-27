'use client';

import type { Componente, Ingredient } from '@/domain/types';
import { AggiungiTratteggiato } from '@/components/AggiungiTratteggiato';
import { TesseraIngrediente } from '@/components/TesseraIngrediente';
import { Etichetta, MessaggioErrore, TastoSecondario } from '@/components/controlli';
import { IconaCroce, TondoIcona } from '@/components/pannello/pezzi';

const TESTO_COMPONENTE_SENZA_NOME =
  'Dai un nome a ogni componente: senza, non si distinguerebbe in Scegli.';

const TESTO_OPZIONE_SENZA_RIGHE =
  "Ogni opzione deve avere almeno un ingrediente: aggiungine uno o elimina l'opzione.";

const TESTO_OPZIONE_QUANTITA =
  'Manca la grammatura di uno o più ingredienti nelle opzioni: tocca il numero sulla tessera e scrivi quanto ne usi.';

export interface PropsComponentiPiatto {
  componenti: Componente[];
  catalogoPerId: Map<string, Ingredient>;
  onAggiungiComponente: () => void;
  onRimuoviComponente: (componenteId: string) => void;
  onCambiaNomeComponente: (componenteId: string, nome: string) => void;
  onAggiungiOpzione: (componenteId: string) => void;
  onRimuoviOpzione: (componenteId: string, opzioneId: string) => void;
  /** Apre il selettore degli ingredienti su quell'opzione (lo stesso selettore degli ingredienti del piatto). */
  onAggiungiIngrediente: (componenteId: string, opzioneId: string) => void;
  onCambiaQuantita: (componenteId: string, opzioneId: string, ingredientId: string, quantita: number) => void;
  onRimuoviRiga: (componenteId: string, opzioneId: string, ingredientId: string) => void;
  /** `{opzioneId}:{ingredientId}` della riga appena aggiunta dal selettore: la sua tessera prende il fuoco. */
  appenaAggiunta?: string | null;
}

/**
 * I componenti a scelta dell'editor del Piatto (spec fase 7 §B.3 punto 4): la
 * struttura di oggi con i pezzi del sistema. Ogni componente è un widget
 * bianco a raggio 22 col nome, le opzioni con le loro tessere e i due modi di
 * aggiungere; le ✕ sono tondi 44. Lo stato resta tutto nella pagina: qui si
 * disegna e si chiamano le callback.
 *
 * I tre messaggi dicono *cosa* manca, con le stesse tre condizioni di
 * `componentiNonValidi` nella pagina, separate: come fa la pagina con le
 * grammature degli ingredienti fissi.
 */
export function ComponentiPiatto({
  componenti, catalogoPerId, onAggiungiComponente, onRimuoviComponente, onCambiaNomeComponente,
  onAggiungiOpzione, onRimuoviOpzione, onAggiungiIngrediente, onCambiaQuantita, onRimuoviRiga,
  appenaAggiunta = null,
}: PropsComponentiPiatto) {
  const componentiSenzaNome = componenti.filter((c) => c.nome.trim() === '');
  const opzioniSenzaRighe = componenti.flatMap((c) => c.opzioni.filter((o) => o.righe.length === 0));
  const quantitaNonValideOpzioni = new Set(
    componenti.flatMap((c) => c.opzioni).flatMap((o) => o.righe.filter((r) => r.quantita <= 0).map((r) => `${o.id}|${r.ingredientId}`)),
  );

  return (
    <>
      <Etichetta>COMPONENTI A SCELTA</Etichetta>

      {componenti.map((componente, indiceComponente) => (
        <section
          key={componente.id}
          aria-label={`Componente ${indiceComponente + 1}`}
          style={{
            background: 'var(--superficie)', borderRadius: 22, border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
            padding: '14px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              value={componente.nome}
              onChange={(e) => onCambiaNomeComponente(componente.id, e.target.value)}
              placeholder="Nome del componente"
              aria-label={`Nome del componente ${indiceComponente + 1}`}
              style={{
                flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', padding: '0 14px', borderRadius: 14,
                border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--ink)', outline: 'none',
              }}
            />
            <TondoIcona etichetta={`Elimina componente ${indiceComponente + 1}`} onClick={() => onRimuoviComponente(componente.id)}>
              <IconaCroce spenta={false} />
            </TondoIcona>
          </div>

          {componente.opzioni.map((opzione, indiceOpzione) => {
            const righeNonValideOpzione = new Set(
              opzione.righe.filter((r) => r.quantita <= 0).map((r) => r.ingredientId),
            );
            return (
              <div key={opzione.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingLeft: 4 }}>
                  <Etichetta>{`OPZIONE ${indiceOpzione + 1}`}</Etichetta>
                  <TondoIcona
                    etichetta={`Elimina opzione ${indiceOpzione + 1} del componente ${indiceComponente + 1}`}
                    onClick={() => onRimuoviOpzione(componente.id, opzione.id)}
                  >
                    <IconaCroce spenta={false} />
                  </TondoIcona>
                </div>

                {opzione.righe.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    {opzione.righe.map((riga) => {
                      const ing = catalogoPerId.get(riga.ingredientId);
                      if (!ing) return null;
                      return (
                        <TesseraIngrediente
                          key={riga.ingredientId}
                          nome={ing.nome}
                          area={ing.area}
                          quantita={riga.quantita}
                          unita={riga.unita}
                          onCambiaQuantita={(q) => onCambiaQuantita(componente.id, opzione.id, riga.ingredientId, q)}
                          onRimuovi={() => onRimuoviRiga(componente.id, opzione.id, riga.ingredientId)}
                          quantitaValida={!righeNonValideOpzione.has(riga.ingredientId)}
                          appenaAggiunta={appenaAggiunta === `${opzione.id}:${riga.ingredientId}`}
                        />
                      );
                    })}
                  </div>
                )}

                <AggiungiTratteggiato
                  etichetta="AGGIUNGI INGREDIENTE"
                  ariaLabel={`Aggiungi ingrediente all'opzione ${indiceOpzione + 1} del componente ${indiceComponente + 1}`}
                  onClick={() => onAggiungiIngrediente(componente.id, opzione.id)}
                />
              </div>
            );
          })}

          {/* Un nome per componente, come le altre etichette qui: con due componenti
              «AGGIUNGI OPZIONE» da solo non dice quale (review finale, M4). */}
          <TastoSecondario aria-label={`Aggiungi opzione al componente ${indiceComponente + 1}`} onClick={() => onAggiungiOpzione(componente.id)}>
            AGGIUNGI OPZIONE
          </TastoSecondario>
        </section>
      ))}

      <AggiungiTratteggiato etichetta="AGGIUNGI COMPONENTE" onClick={onAggiungiComponente} />

      {componentiSenzaNome.length > 0 && <MessaggioErrore>{TESTO_COMPONENTE_SENZA_NOME}</MessaggioErrore>}
      {opzioniSenzaRighe.length > 0 && <MessaggioErrore>{TESTO_OPZIONE_SENZA_RIGHE}</MessaggioErrore>}
      {opzioniSenzaRighe.length === 0 && quantitaNonValideOpzioni.size > 0 && (
        <MessaggioErrore>{TESTO_OPZIONE_QUANTITA}</MessaggioErrore>
      )}
    </>
  );
}
