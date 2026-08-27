'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { AreaId, Dish } from '@/domain/types';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSettimanaCorrente, aggiornaSlot } from '@/data/settimana';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { giorniTra, lunediDi } from '@/domain/date';
import { coloreArea } from '@/domain/aree';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

interface DatiScegli {
  slotId: string;
  /** Piatto assegnato allo slot al caricamento: mostra il badge "ORA IN PROGRAMMA" e serve da riferimento per capire se qualcosa è cambiato. */
  dishIdOriginale: string | null;
  nomePasto: string;
  piatti: Dish[];
  areePerPiatto: Map<string, AreaId[]>;
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
 */
function testoNota(cambiato: boolean, nomePasto: string, giorno: string): string {
  if (cambiato) {
    return `Cambia solo ${nomePasto} di ${giorno}. Gli altri giorni restano come sono, e la lista della spesa si ricalcola da sola.`;
  }
  return `Tocca un piatto per sostituire ${nomePasto} di ${giorno}. Vale solo per quel giorno, non cambia il piatto nel repertorio.`;
}

/**
 * Le aree distinte presenti negli ingredienti del piatto, nell'ordine
 * impostato dall'utente — allineata a `areeDelPiatto` di
 * `src/app/(app)/piatti/page.tsx`: la stessa informazione (quali reparti
 * tocca un piatto) deve comparire nello stesso ordine in entrambe le
 * schermate, non in un ordine fisso diverso da schermata a schermata.
 */
function areeDelPiatto(piatto: Dish, areaPerIngrediente: Map<string, AreaId>, ordineAree: AreaId[]): AreaId[] {
  const presenti = new Set(
    piatto.ingredienti
      .map((i) => areaPerIngrediente.get(i.ingredientId))
      .filter((a): a is AreaId => a !== undefined),
  );
  return ordineAree.filter((a) => presenti.has(a));
}

/**
 * Scegli il piatto: sostituzione per-pasto, non per-piatto. Nasce dal pasto
 * (data + slotDefId dalla rotta), mostra solo i piatti attivi di quello slot
 * e scrive solo `meal_slot.dish_id` di quel singolo slot — non tocca mai il
 * repertorio. Il marchio non compare in questa schermata (niente Testata,
 * come in Piatto): l'header è quello minimale dell'artboard.
 */
export default function ScegliPiatto() {
  const { data: dataParam, slotDefId } = useParams<{ data: string; slotDefId: string }>();
  const router = useRouter();

  const [dati, setDati] = useState<DatiScegli | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [scelto, setScelto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function carica() {
      try {
        const [settimana, repertorio, slotDefs, ingredienti, impostazioni] = await Promise.all([
          leggiSettimanaCorrente(),
          leggiRepertorio(),
          leggiSlotDefs(),
          leggiIngredienti(),
          leggiImpostazioni(),
        ]);
        if (!vivo) return;

        const slot = settimana?.slots.find((s) => s.data === dataParam && s.slotDefId === slotDefId) ?? null;
        const def = slotDefs.find((d) => d.id === slotDefId) ?? null;
        if (!slot || !def) {
          setErrore('Non troviamo questo pasto.');
          return;
        }

        const areaPerIngrediente = new Map(ingredienti.map((i) => [i.id, i.area]));
        // Solo i piatti attivi di questo slot: leggiRepertorio() esclude già
        // i piatti eliminati (soft delete), qui si filtra anche per pasto.
        const piatti = repertorio.filter((p) => p.slotDefId === slotDefId);

        const areePerPiatto = new Map<string, AreaId[]>();
        for (const p of piatti) {
          areePerPiatto.set(p.id, areeDelPiatto(p, areaPerIngrediente, impostazioni.ordineAree));
        }

        setDati({ slotId: slot.id, dishIdOriginale: slot.dishId, nomePasto: def.nome, piatti, areePerPiatto });
        setScelto(slot.dishId);
      } catch {
        if (vivo) setErrore('Non riusciamo a caricare i piatti. Riprova più tardi.');
      }
    }
    carica();
    return () => {
      vivo = false;
    };
  }, [dataParam, slotDefId]);

  async function confermaScelta() {
    if (!dati || scelto === dati.dishIdOriginale || salvando) return;
    setSalvando(true);
    setErroreSalva(null);
    try {
      // 'correzione' qui è inerte: aggiornaSlot usa `fonte` solo per un patch
      // di `stato` (gerarchia delle fonti). Un patch che tocca solo `dishId`
      // si applica sempre e non scrive `fonte_stato` — scegliere un piatto
      // non è una transizione di stato casa/fuori.
      await aggiornaSlot(dati.slotId, { dishId: scelto }, 'correzione');
      router.push('/settimana');
    } catch {
      setErroreSalva('Non siamo riusciti a salvare la scelta. Riprova.');
      setSalvando(false);
    }
  }

  const { maiuscolo, minuscolo, numero } = etichettaGiorno(dataParam);
  const etichettaGiornoTesto = maiuscolo ? `${maiuscolo} ${numero}` : '';

  if (errore) {
    return (
      <Cornice etichetta={etichettaGiornoTesto}>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{errore}</p>
      </Cornice>
    );
  }

  if (!dati) {
    // Nessuno stato di caricamento nell'artboard: l'header basta finché i dati non arrivano.
    return <Cornice etichetta={etichettaGiornoTesto} />;
  }

  const cambiato = scelto !== dati.dishIdOriginale;
  const etichettaHeader = etichettaGiornoTesto ? `${etichettaGiornoTesto} · ${dati.nomePasto.toUpperCase()}` : dati.nomePasto.toUpperCase();

  return (
    <Cornice etichetta={etichettaHeader}>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px' }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, color: 'var(--ink)', padding: '0 2px 16px' }}>
          Cosa mangi
        </div>

        <div style={{ margin: '0 4px 9px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
          DAL TUO REPERTORIO
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dati.piatti.map((p) => {
            const selezionato = scelto === p.id;
            const corrente = dati.dishIdOriginale === p.id;
            const aree = dati.areePerPiatto.get(p.id) ?? [];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setScelto(p.id)}
                aria-pressed={selezionato}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '15px 16px',
                  borderRadius: 20,
                  background: '#FFFFFF',
                  border: selezionato ? '1.5px solid var(--ink)' : '1px solid var(--bordo)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {corrente && (
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: '0.11em',
                        color: '#FFFFFF',
                        background: 'var(--ink)',
                        borderRadius: 999,
                        padding: '4px 8px',
                      }}
                    >
                      ORA IN PROGRAMMA
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.15,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'var(--ink)',
                    }}
                  >
                    {p.nome}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {aree.map((a) => (
                        <span
                          key={a}
                          data-area={a}
                          style={{ width: 8, height: 8, borderRadius: 2.6, display: 'inline-block', background: coloreArea(a) }}
                        />
                      ))}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.09em', color: 'var(--ter)' }}>
                      {p.ingredienti.length} INGR.
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    flex: 'none',
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: selezionato ? 'var(--ink)' : 'transparent',
                    border: selezionato ? 'none' : '1.5px solid rgba(20,22,58,0.20)',
                  }}
                >
                  {selezionato && (
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                      <path d="M4.5 10.5 8.2 14 15.5 6.4" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href="/piatti/nuovo"
          style={{
            marginTop: 14,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            minHeight: 52,
            borderRadius: 18,
            background: 'transparent',
            border: '1.5px dashed rgba(20,22,58,0.28)',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="var(--sec)" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.11em', color: 'var(--sec)' }}>
            CREA UN PIATTO NUOVO
          </span>
        </Link>

        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '16px 6px 0' }}>
          {testoNota(cambiato, dati.nomePasto, minuscolo)}
        </div>

        {erroreSalva && <p style={{ margin: '10px 6px 0', fontSize: 12.5, color: 'var(--sec)' }}>{erroreSalva}</p>}
      </div>

      <div style={{ padding: '8px 16px 22px', display: 'flex', gap: 9 }}>
        <Link
          href="/settimana"
          style={{
            flex: 'none',
            width: 104,
            height: 54,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.09em',
            color: 'var(--sec)',
            background: 'rgba(20,22,58,0.05)',
          }}
        >
          ANNULLA
        </Link>
        <button
          type="button"
          onClick={confermaScelta}
          disabled={!cambiato || salvando}
          style={{
            flex: 1,
            height: 54,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.09em',
            background: cambiato ? 'var(--ink)' : 'rgba(20,22,58,0.10)',
            boxShadow: cambiato ? '0 3px 10px rgba(20,22,58,0.24)' : 'none',
            color: cambiato ? '#FFFFFF' : 'var(--ter)',
            opacity: salvando ? 0.7 : 1,
          }}
        >
          SOSTITUISCI
        </button>
      </div>
    </Cornice>
  );
}

/**
 * Header minimale dell'artboard: freccia indietro, etichetta centrale
 * ("GIOVEDÌ 4 · CENA"), spaziatore a destra per tenere l'etichetta centrata.
 * Torna sempre a `/settimana`: questa schermata si apre solo da lì.
 */
function Cornice({ etichetta, children }: { etichetta: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/settimana"
          aria-label="Torna alla Settimana"
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          {etichetta}
        </span>
        <div style={{ width: 44, height: 44, flex: 'none' }} />
      </div>
      {children}
    </div>
  );
}
