'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface Props {
  /** Nome del meal_slot_def, es. "Cena": intitola il foglio. */
  nomePasto: string;
  /** true se lo slot è già 'saltato' o 'sostituito': mostra "Torna al piano". */
  spuntato: boolean;
  /** "Ho mangiato un altro piatto" porta a Scegli: il cambio di dishId passa da aggiornaSlot, che genera da solo storno e addebito. */
  hrefScegli: string;
  onSaltato: () => void;
  onMangiatoAltro: () => void;
  onTornaAlPiano: () => void;
  onChiudi: () => void;
}

const stileVoce = {
  width: '100%',
  minHeight: 50,
  borderRadius: 15,
  background: 'rgba(20,22,58,0.04)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 15.5,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: 'var(--ink)',
} as const;

function Voce({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={stileVoce}>
      {children}
    </button>
  );
}

/**
 * L'action sheet della spunta pasti (spec spunta-pasti §6): si apre dalla zona
 * destra di RigaPasto per i giorni ≤ oggi a settimana non-bozza. Il default
 * resta "mangiato come da piano" — qui si registrano solo le eccezioni, e per
 * questo non esiste una voce "Fatto".
 */
export function FoglioAzioniPasto({
  nomePasto, spuntato, hrefScegli, onSaltato, onMangiatoAltro, onTornaAlPiano, onChiudi,
}: Props) {
  return (
    <div
      role="dialog"
      aria-label={`Com'è andata: ${nomePasto}`}
      onClick={onChiudi}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(20,22,58,0.35)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: '#FFFFFF',
          borderRadius: '22px 22px 0 0', padding: '16px 16px 26px',
          display: 'flex', flexDirection: 'column', gap: 9,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.13em', color: '#8A8A96', padding: '0 4px 4px',
          }}
        >
          COM&rsquo;È ANDATA — {nomePasto.toUpperCase()}
        </span>
        <Voce onClick={onSaltato}>Saltato</Voce>
        <Voce onClick={onMangiatoAltro}>Ho mangiato altro</Voce>
        <Link href={hrefScegli} style={stileVoce}>
          Ho mangiato un altro piatto
        </Link>
        {spuntato && <Voce onClick={onTornaAlPiano}>Torna al piano</Voce>}
      </div>
    </div>
  );
}
