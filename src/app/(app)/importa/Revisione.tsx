'use client';

import { useState } from 'react';
import type { MealSlotDef, UnitaBase } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from '@/domain/import/types';
import { chiavePasto, pastoEffettivo } from '@/domain/import/types';
import { normalizza } from '@/domain/import/mapping';

const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const UNITA: UnitaBase[] = ['g', 'ml', 'pz'];

interface Props {
  piano: PianoEstratto;
  stato: StatoRevisione;
  slotDefs: MealSlotDef[];
  onStato: (s: StatoRevisione) => void;
}

interface Tappa {
  settimana: number;
  giorno: number;
  /** Il piano non cambia mai: qui solo per sapere quanti pasti (e in che ordine) ci sono in questo giorno. */
  pastiOriginali: PastoEstratto[];
}

/** Tutte le (settimana, giorno) del piano, in sequenza: la navigazione della revisione è un'unica lista piatta. */
function flattenGiorni(piano: PianoEstratto): Tappa[] {
  const settimane = [...piano.settimane].sort((a, b) => a.numero - b.numero);
  const tappe: Tappa[] = [];
  for (const s of settimane) {
    const giorni = [...s.giorni].sort((a, b) => a.giorno - b.giorno);
    for (const g of giorni) tappe.push({ settimana: s.numero, giorno: g.giorno, pastiOriginali: g.pasti });
  }
  return tappe;
}

function capitalizza(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** Vero se una qualunque riga (fissa o dentro un'opzione di un componente) del pasto ha quantità non risolta. */
function pastoHaRigheNonRisolte(pasto: PastoEstratto): boolean {
  return pasto.piatti.some(
    (p) =>
      p.righeFisse.some((r) => r.quantita === null) ||
      p.componenti.some((c) => c.opzioni.some((op) => op.some((r) => r.quantita === null))),
  );
}

// --- Modifiche immutabili al pasto in revisione: il piano estratto non si tocca mai, si produce
// sempre un nuovo PastoEstratto da mettere in correzioni[chiavePasto]. ---

function cambiaRigaFissa(pasto: PastoEstratto, ip: number, ir: number, cambio: Partial<RigaEstratta>): PastoEstratto {
  return {
    ...pasto,
    piatti: pasto.piatti.map((p, i) =>
      i !== ip ? p : { ...p, righeFisse: p.righeFisse.map((r, j) => (j !== ir ? r : { ...r, ...cambio })) },
    ),
  };
}

function rimuoviRigaFissa(pasto: PastoEstratto, ip: number, ir: number): PastoEstratto {
  return {
    ...pasto,
    piatti: pasto.piatti.map((p, i) => (i !== ip ? p : { ...p, righeFisse: p.righeFisse.filter((_, j) => j !== ir) })),
  };
}

function cambiaNomePiatto(pasto: PastoEstratto, ip: number, nome: string): PastoEstratto {
  return { ...pasto, piatti: pasto.piatti.map((p, i) => (i !== ip ? p : { ...p, nome })) };
}

/**
 * Eliminare l'ultimo piatto svuota il pasto: `traduciBozza` (Task 3) interpreta
 * `{ nomeOriginale, piatti: [] }` come "pasto rimosso", nessuna scrittura e
 * nessuna mappatura pretesa.
 */
function rimuoviPiatto(pasto: PastoEstratto, ip: number): PastoEstratto {
  const restante = pasto.piatti.filter((_, i) => i !== ip);
  return restante.length === 0 ? { nomeOriginale: pasto.nomeOriginale, piatti: [] } : { ...pasto, piatti: restante };
}

function cambiaRigaOpzione(
  pasto: PastoEstratto,
  ip: number,
  ic: number,
  io: number,
  ir: number,
  cambio: Partial<RigaEstratta>,
): PastoEstratto {
  return {
    ...pasto,
    piatti: pasto.piatti.map((p, i) => {
      if (i !== ip) return p;
      return {
        ...p,
        componenti: p.componenti.map((c, j) => {
          if (j !== ic) return c;
          return {
            ...c,
            opzioni: c.opzioni.map((op, k) => (k !== io ? op : op.map((r, l) => (l !== ir ? r : { ...r, ...cambio })))),
          };
        }),
      };
    }),
  };
}

function rimuoviRigaOpzione(pasto: PastoEstratto, ip: number, ic: number, io: number, ir: number): PastoEstratto {
  return {
    ...pasto,
    piatti: pasto.piatti.map((p, i) => {
      if (i !== ip) return p;
      return {
        ...p,
        componenti: p.componenti.map((c, j) => {
          if (j !== ic) return c;
          return { ...c, opzioni: c.opzioni.map((op, k) => (k !== io ? op : op.filter((_, l) => l !== ir))) };
        }),
      };
    }),
  };
}

/**
 * Revisione guidata pasto per pasto: un giorno alla volta, in sequenza su tutte
 * le settimane del ciclo. Ogni modifica (nome piatto, righe, mappatura) vive
 * prima in memoria locale (`locali`) e risale con `onStato` solo su tre eventi
 * — conferma di un pasto, cambio di mappatura, cambio di giorno — mai a ogni
 * tasto: `onStato` è ciò che innesca `salvaBozzaImport` in page.tsx, e non ha
 * debounce. Il piano estratto (`piano`) non viene mai scritto: ogni modifica
 * produce una voce in `stato.correzioni[chiavePasto]`.
 */
export function Revisione({ piano, stato, slotDefs, onStato }: Props) {
  const tappe = flattenGiorni(piano);
  const [indice, setIndice] = useState(0);
  // Modifiche non ancora risalite al genitore, per chiavePasto. Si svuota a ogni dispatch.
  const [locali, setLocali] = useState<Record<string, PastoEstratto>>({});
  // Pasti confermati che l'utente ha riaperto per ritoccarli: restano confermati
  // (in pastiConfermati) finché non si preme di nuovo CONFERMA PASTO, ma la card
  // torna estesa invece che compattata.
  const [riaperti, setRiaperti] = useState<Set<string>>(new Set());
  // "chiave|indicePiatto" del piatto per cui è aperta la conferma di eliminazione (è l'ultimo del pasto).
  const [confermaElimina, setConfermaElimina] = useState<string | null>(null);

  const tappa = tappe[indice];

  function pastoAttuale(indicePasto: number): PastoEstratto {
    const chiave = chiavePasto(tappa.settimana, tappa.giorno, indicePasto);
    return locali[chiave] ?? pastoEffettivo(piano, stato.correzioni, tappa.settimana, tappa.giorno, indicePasto);
  }

  function modificaPasto(indicePasto: number, nuovo: PastoEstratto) {
    const chiave = chiavePasto(tappa.settimana, tappa.giorno, indicePasto);
    setLocali((prev) => ({ ...prev, [chiave]: nuovo }));
  }

  /** Unico punto che chiama `onStato`: fonde le modifiche locali pendenti in `correzioni` prima di risalire. */
  function dispatch(parziale: Partial<StatoRevisione>) {
    const haLocali = Object.keys(locali).length > 0;
    const correzioni = haLocali ? { ...stato.correzioni, ...locali } : stato.correzioni;
    onStato({ ...stato, correzioni, ...parziale });
    if (haLocali) setLocali({});
  }

  function cambiaMappatura(nomeOriginale: string, slotId: string) {
    const chiave = normalizza(nomeOriginale);
    const mappaturaPasti = { ...stato.mappaturaPasti };
    if (slotId) mappaturaPasti[chiave] = slotId;
    else delete mappaturaPasti[chiave];
    dispatch({ mappaturaPasti });
  }

  function confermaPasto(indicePasto: number) {
    const chiave = chiavePasto(tappa.settimana, tappa.giorno, indicePasto);
    const pastiConfermati = stato.pastiConfermati.includes(chiave)
      ? stato.pastiConfermati
      : [...stato.pastiConfermati, chiave];
    dispatch({ pastiConfermati });
    setRiaperti((prev) => {
      if (!prev.has(chiave)) return prev;
      const next = new Set(prev);
      next.delete(chiave);
      return next;
    });
  }

  function vaiAGiorno(nuovoIndice: number) {
    // Cambio giorno: le modifiche non confermate del giorno che si lascia non vanno perse,
    // ma nemmeno considerate "confermate" — si salvano come correzioni e basta.
    if (Object.keys(locali).length > 0) dispatch({});
    setIndice(nuovoIndice);
  }

  // "VAI AI FORMATI" guarda l'intero piano (tutte le settimane, tutti i giorni), non solo
  // il giorno corrente: serve lo stato committato (stato.correzioni/mappaturaPasti/pastiConfermati),
  // che è esattamente ciò che confermaPasto/cambiaMappatura/vaiAGiorno mantengono aggiornato.
  const tuttoPronto = piano.settimane.every((s) =>
    s.giorni.every((g) =>
      g.pasti.every((_, ip) => {
        const chiave = chiavePasto(s.numero, g.giorno, ip);
        if (!stato.pastiConfermati.includes(chiave)) return false;
        const effettivo = pastoEffettivo(piano, stato.correzioni, s.numero, g.giorno, ip);
        // Il controllo di mappatura scatta solo se il pasto ha piatti: un pasto svuotato in
        // revisione non ne ha bisogno (nessuna scrittura da fare, vedi commit.ts).
        if (effettivo.piatti.length === 0) return true;
        return Boolean(stato.mappaturaPasti[normalizza(effettivo.nomeOriginale)]);
      }),
    ),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 16px 14px' }}>
        <button
          type="button"
          aria-label="Giorno precedente"
          disabled={indice === 0}
          onClick={() => vaiAGiorno(indice - 1)}
          style={{
            width: 36, height: 36, flex: 'none', borderRadius: 999,
            background: 'rgba(20,22,58,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: indice === 0 ? 0.35 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3.2 5.6 8 10 12.8" stroke="#14163A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          {GIORNI_LUNGHI[tappa.giorno]} — giorno {indice + 1} di {tappe.length} · settimana {tappa.settimana} di {piano.settimane.length}
        </span>
        <button
          type="button"
          aria-label="Giorno successivo"
          disabled={indice === tappe.length - 1}
          onClick={() => vaiAGiorno(indice + 1)}
          style={{
            width: 36, height: 36, flex: 'none', borderRadius: 999,
            background: 'rgba(20,22,58,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: indice === tappe.length - 1 ? 0.35 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="#14163A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px' }}>
        {tappa.pastiOriginali.map((_, indicePasto) => {
          const chiave = chiavePasto(tappa.settimana, tappa.giorno, indicePasto);
          const pasto = pastoAttuale(indicePasto);
          const confermato = stato.pastiConfermati.includes(chiave) && !riaperti.has(chiave);
          const slotAssegnato = stato.mappaturaPasti[normalizza(pasto.nomeOriginale)] ?? '';
          const bloccato = pastoHaRigheNonRisolte(pasto);

          if (confermato) {
            return (
              <section key={chiave} style={{ marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setRiaperti((prev) => new Set(prev).add(chiave))}
                  style={{
                    width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 14,
                    background: 'var(--superficie)', border: '1px solid var(--bordo)', fontSize: 14, color: 'var(--ink)',
                  }}
                >
                  ✓ {capitalizza(pasto.nomeOriginale)}
                  {pasto.piatti.length > 0 ? ` — ${pasto.piatti.map((p) => p.nome).join(' / ')}` : ' — pasto rimosso'}
                </button>
              </section>
            );
          }

          return (
            <section
              key={chiave}
              style={{ marginBottom: 10, padding: '13px 14px 14px', borderRadius: 18, border: '1px solid var(--bordo)', background: 'var(--superficie)' }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{capitalizza(pasto.nomeOriginale)}</span>
                <select
                  aria-label={`Slot per ${pasto.nomeOriginale}`}
                  value={slotAssegnato}
                  onChange={(e) => cambiaMappatura(pasto.nomeOriginale, e.target.value)}
                  style={{ height: 40, padding: '0 10px', borderRadius: 10, border: '1px solid var(--bordo)', background: 'var(--fondo)', fontSize: 13.5 }}
                >
                  {!slotAssegnato && <option value="">— scegli —</option>}
                  {slotDefs.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </label>

              {pasto.piatti.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--sec)' }}>Pasto rimosso: nessun piatto da creare per questo giorno.</p>
              )}

              {pasto.piatti.map((piatto, indicePiatto) => (
                <div
                  key={indicePiatto}
                  style={{
                    marginBottom: 12, paddingBottom: 10,
                    borderBottom: indicePiatto < pasto.piatti.length - 1 ? '1px solid var(--bordo)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <h4
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label={`Nome del piatto ${indicePiatto + 1}`}
                      onBlur={(e) =>
                        modificaPasto(indicePasto, cambiaNomePiatto(pasto, indicePiatto, e.currentTarget.textContent ?? ''))
                      }
                      style={{ flex: 1, margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', outline: 'none' }}
                    >
                      {piatto.nome}
                    </h4>
                    <button
                      type="button"
                      aria-label={`Elimina piatto ${indicePiatto + 1}`}
                      onClick={() => {
                        if (pasto.piatti.length === 1) {
                          setConfermaElimina(`${chiave}|${indicePiatto}`);
                        } else {
                          modificaPasto(indicePasto, rimuoviPiatto(pasto, indicePiatto));
                        }
                      }}
                      style={{ flex: 'none', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 5l14 14M19 5 5 19" stroke="#8A8A96" strokeWidth="2.1" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  {piatto.righeFisse.map((riga, indiceRiga) => (
                    <RigaEditor
                      key={indiceRiga}
                      riga={riga}
                      onCambia={(cambio) => modificaPasto(indicePasto, cambiaRigaFissa(pasto, indicePiatto, indiceRiga, cambio))}
                      onRimuovi={() => modificaPasto(indicePasto, rimuoviRigaFissa(pasto, indicePiatto, indiceRiga))}
                    />
                  ))}

                  {piatto.componenti.map((componente, indiceComponente) => (
                    <div key={indiceComponente} style={{ marginTop: 10 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--sec)', marginBottom: 4 }}>
                        {componente.nome || 'Componente senza nome'}
                      </div>
                      {componente.opzioni.map((opzione, indiceOpzione) => (
                        <div key={indiceOpzione}>
                          {indiceOpzione > 0 && (
                            <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--ter)', margin: '4px 0' }}>oppure</div>
                          )}
                          {opzione.map((riga, indiceRiga) => (
                            <RigaEditor
                              key={indiceRiga}
                              riga={riga}
                              onCambia={(cambio) =>
                                modificaPasto(
                                  indicePasto,
                                  cambiaRigaOpzione(pasto, indicePiatto, indiceComponente, indiceOpzione, indiceRiga, cambio),
                                )
                              }
                              onRimuovi={() =>
                                modificaPasto(
                                  indicePasto,
                                  rimuoviRigaOpzione(pasto, indicePiatto, indiceComponente, indiceOpzione, indiceRiga),
                                )
                              }
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}

                  {confermaElimina === `${chiave}|${indicePiatto}` && (
                    <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', marginTop: 8 }}>
                      È l&apos;ultimo piatto del pasto: eliminarlo rimuove il pasto intero da questo giorno.
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            modificaPasto(indicePasto, rimuoviPiatto(pasto, indicePiatto));
                            setConfermaElimina(null);
                          }}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)', background: 'rgba(20,22,58,0.06)', padding: '6px 10px', borderRadius: 10 }}
                        >
                          ELIMINA IL PASTO
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfermaElimina(null)}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--sec)', background: 'transparent', padding: '6px 10px' }}
                        >
                          ANNULLA
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                disabled={bloccato}
                onClick={() => confermaPasto(indicePasto)}
                style={{
                  width: '100%', height: 44, borderRadius: 12,
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  background: bloccato ? 'rgba(20,22,58,0.08)' : 'var(--ink)',
                  color: bloccato ? 'var(--ter)' : '#FFFFFF',
                }}
              >
                CONFERMA PASTO
              </button>
            </section>
          );
        })}
      </div>

      {tuttoPronto && (
        <div style={{ padding: '4px 16px 22px' }}>
          <button
            type="button"
            onClick={() => dispatch({ passo: 'formati' })}
            style={{
              width: '100%', height: 54, borderRadius: 18,
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
              background: 'var(--ink)', color: '#FFFFFF',
            }}
          >
            VAI AI FORMATI
          </button>
        </div>
      )}
    </div>
  );
}

function RigaEditor({
  riga,
  onCambia,
  onRimuovi,
}: {
  riga: RigaEstratta;
  onCambia: (cambio: Partial<RigaEstratta>) => void;
  onRimuovi: () => void;
}) {
  const nonRisolta = riga.quantita === null;
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6, padding: '7px 8px', borderRadius: 10,
        border: nonRisolta ? '1.5px solid #C77700' : '1px solid transparent',
        background: nonRisolta ? 'rgba(199,119,0,0.06)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="text"
          value={riga.alimento}
          aria-label={`Alimento: ${riga.alimento}`}
          onChange={(e) => onCambia({ alimento: e.target.value })}
          style={{ flex: 1, height: 34, padding: '0 8px', borderRadius: 8, border: '1px solid var(--bordo)', background: 'var(--fondo)', fontSize: 13.5 }}
        />
        <input
          type="number"
          value={riga.quantita ?? ''}
          aria-label={`Quantità di ${riga.alimento}`}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') {
              onCambia({ quantita: null, unita: null });
              return;
            }
            const n = Number(v);
            onCambia({ quantita: Number.isFinite(n) ? n : null, unita: riga.unita ?? 'g' });
          }}
          style={{ width: 60, height: 34, padding: '0 6px', borderRadius: 8, border: '1px solid var(--bordo)', background: 'var(--fondo)', fontSize: 13.5 }}
        />
        <select
          value={riga.unita ?? ''}
          aria-label={`Unità di ${riga.alimento}`}
          onChange={(e) => onCambia({ unita: (e.target.value || null) as RigaEstratta['unita'] })}
          style={{ height: 34, borderRadius: 8, border: '1px solid var(--bordo)', background: 'var(--fondo)', fontSize: 13 }}
        >
          <option value="">—</option>
          {UNITA.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <button
          type="button"
          aria-label={`Elimina riga: ${riga.alimento}`}
          onClick={onRimuovi}
          style={{ flex: 'none', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 5l14 14M19 5 5 19" stroke="#8A8A96" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ter)', padding: '0 2px' }}>{riga.testoOriginale}</div>
      {nonRisolta && <div style={{ fontSize: 11.5, color: '#C77700', padding: '0 2px' }}>quantità da indicare</div>}
    </div>
  );
}
