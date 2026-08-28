'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AreaId, Ingredient } from '@/domain/types';
import { leggiIngredienti } from '@/data/repertorio';
import { coloreArea, nomeArea } from '@/domain/aree';
import { leggiImpostazioni } from '@/data/impostazioni';

const CLASSE_LABEL: Record<Ingredient['classeResiduo'], string> = {
  porzionabile: 'PORZIONABILE',
  intero: 'INTERO',
  stima: 'A STIMA',
};

/**
 * L'elenco di tutti gli ingredienti, unico posto da cui raggiungerli tutti.
 *
 * La scheda di un ingrediente si apriva solo dalla tessera dentro un piatto:
 * uno che non è (o non è più) in nessun piatto non era raggiungibile in alcun
 * modo, pur restando nel catalogo e pur continuando a portarsi dietro il suo
 * residuo di dispensa.
 *
 * L'editor vive sotto `/piatti/[id]/ingredienti/[ingId]` perché nasce da lì;
 * qui si riusa quella stessa rotta passando `?torna=impostazioni`, che gli
 * dice dove tornare. Duplicare l'editor per avere un URL più bello
 * significherebbe due copie da tenere allineate su una schermata che governa
 * l'aritmetica del residuo.
 */
export default function ElencoIngredienti() {
  const [ingredienti, setIngredienti] = useState<Ingredient[] | null>(null);
  const [ordineAree, setOrdineAree] = useState<AreaId[]>([]);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiIngredienti(), leggiImpostazioni()])
      .then(([lista, impostazioni]) => {
        if (!vivo) return;
        setIngredienti(lista);
        setOrdineAree(impostazioni.ordineAree);
      })
      .catch((e) => {
        console.error('impostazioni/ingredienti: caricamento fallito.', e);
        if (vivo) setErrore('Non riusciamo a caricare gli ingredienti. Riprova più tardi.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (errore) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)', fontSize: 13 }}>{errore}</p>
      </Cornice>
    );
  }

  if (!ingredienti) return <Cornice />;

  if (ingredienti.length === 0) {
    return (
      <Cornice>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
            Nessun ingrediente
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--sec)' }}>
            Nascono dai piatti: il primo che aggiungi a un piatto compare qui.
          </div>
        </div>
      </Cornice>
    );
  }

  // Raggruppati per area e nell'ordine dei reparti scelto dall'utente: è lo
  // stesso ordine della lista della spesa, così cercare qui costa quanto
  // cercare lì.
  const perArea = ordineAree
    .map((area) => ({
      area,
      voci: ingredienti
        .filter((i) => i.area === area)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    }))
    .filter((g) => g.voci.length > 0);

  return (
    <Cornice>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 20px' }}>
        {perArea.map(({ area, voci }) => (
          <div key={area} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px 8px' }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: coloreArea(area) }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.14em', color: 'var(--ink)',
                }}
              >
                {nomeArea(area)}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--ter)' }}>
                {voci.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {voci.map((ing) => (
                <Link
                  key={ing.id}
                  href={`/piatti/nuovo/ingredienti/${ing.id}?torna=impostazioni`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, minHeight: 62,
                    padding: '12px 15px', borderRadius: 16,
                    background: 'var(--superficie)', border: '1px solid var(--bordo)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                    >
                      {ing.nome}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.09em',
                        color: 'var(--ter)', marginTop: 4,
                      }}
                    >
                      {ing.formatoConfezione} {ing.unitaBase} · {CLASSE_LABEL[ing.classeResiduo]}
                      {ing.deperibile ? ' · FRESCO' : ''}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--ter)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', margin: '4px 6px 0' }}>
          Area, formato della confezione e classe decidono cosa finisce in lista e quanto:
          cambiarli qui cambia le liste da qui in avanti, non quelle già create.
        </div>
      </div>
    </Cornice>
  );
}

/** Stesso header di impostazioni/reparti: sottopagina fissa di /impostazioni. */
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/impostazioni"
          aria-label="Torna alle impostazioni"
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          INGREDIENTI
        </span>
        <div style={{ width: 44, height: 44 }} />
      </div>
      {children}
    </div>
  );
}
