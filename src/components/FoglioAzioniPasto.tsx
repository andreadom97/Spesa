'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

interface Props {
  /** Nome del meal_slot_def, es. "Cena": intitola il foglio. */
  nomePasto: string;
  /** true se lo slot è già 'saltato' o 'sostituito'. */
  spuntato: boolean;
  /** true per i giorni ≤ oggi: mostra la sezione spunte. false = giorno futuro: solo cambio piatto e meal prep. */
  passato: boolean;
  /** true se lo slot è 'casa' (serve al gate di "Cucinato ma non mangiato"). */
  aCasa: boolean;
  /** true se lo slot ha un piatto assegnato: senza piatto "Cucinato ma non mangiato" non ha senso. */
  haPiatto: boolean;
  /** Porzioni extra già dichiarate sullo slot (0 = nessuna): valore iniziale dello stepper. */
  porzioniPreparate: number;
  /** true se il lotto legato a questo slot è in freezer: valore iniziale del toggle Frigo/Freezer dello stepper. */
  prontiCongelato: boolean;
  /** true se lo slot è già coperto da una porzione pronta. */
  daPronti: boolean;
  /** Porzioni utilizzabili del piatto dello slot (0 nasconde "Uso una porzione pronta"). */
  prontiDisponibili: number;
  /** "Ho mangiato un altro piatto" (passato) / "Cambia piatto" (futuro) portano a Scegli: il cambio di dishId passa da aggiornaSlot, che genera da solo storno e addebito. */
  hrefScegli: string;
  onSaltato: () => void;
  onMangiatoAltro: () => void;
  onTornaAlPiano: () => void;
  onCucinatoNonMangiato: () => void;
  /** n = porzioni extra totali dello slot (0 rimuove); congelato = dove va il lotto. */
  onPreparaPorzioni: (n: number, congelato: boolean) => void;
  onUsaPronta: () => void;
  onNonUsarePronta: () => void;
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

const stileSeparatore = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.13em',
  color: '#8A8A96',
  padding: '6px 4px 4px',
} as const;

function Voce({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={stileVoce}>
      {children}
    </button>
  );
}

function Stepper({
  iniziale, congelatoIniziale, onSalva,
}: { iniziale: number; congelatoIniziale: boolean; onSalva: (n: number, congelato: boolean) => void }) {
  const [n, setN] = useState(iniziale);
  const [congelato, setCongelato] = useState(congelatoIniziale);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}>
      <button type="button" aria-label="Togli una porzione" onClick={() => setN((v) => Math.max(0, v - 1))} style={{ ...stileVoce, width: 44, minHeight: 44 }}>−</button>
      <span style={{ minWidth: 28, textAlign: 'center', fontSize: 17, fontWeight: 800 }}>{n}</span>
      <button type="button" aria-label="Aggiungi una porzione" onClick={() => setN((v) => Math.min(6, v + 1))} style={{ ...stileVoce, width: 44, minHeight: 44 }}>+</button>
      <button type="button" onClick={() => setCongelato(false)} aria-pressed={!congelato} style={{ ...stileVoce, flex: 1, minHeight: 44, opacity: congelato ? 0.45 : 1 }}>Frigo</button>
      <button type="button" onClick={() => setCongelato(true)} aria-pressed={congelato} style={{ ...stileVoce, flex: 1, minHeight: 44, opacity: congelato ? 1 : 0.45 }}>Freezer</button>
      <button type="button" aria-label="Salva porzioni" onClick={() => onSalva(n, congelato)} style={{ ...stileVoce, width: 74, minHeight: 44, background: '#14163A', color: '#FFFFFF' }}>Salva</button>
    </div>
  );
}

/**
 * L'action sheet della spunta pasti (spec spunta-pasti §6) e del meal prep
 * (spec meal-prepping): si apre dalla zona destra di RigaPasto. Per i giorni
 * ≤ oggi mostra anche le spunte (spec spunta-pasti); il default resta
 * "mangiato come da piano" — qui si registrano solo le eccezioni, e per
 * questo non esiste una voce "Fatto". La sezione MEAL PREP è sempre visibile,
 * passato o futuro.
 */
export function FoglioAzioniPasto({
  nomePasto, spuntato, passato, aCasa, haPiatto, porzioniPreparate, prontiCongelato, daPronti, prontiDisponibili,
  hrefScegli, onSaltato, onMangiatoAltro, onTornaAlPiano, onCucinatoNonMangiato,
  onPreparaPorzioni, onUsaPronta, onNonUsarePronta, onChiudi,
}: Props) {
  const [stepperAperto, setStepperAperto] = useState(false);

  return (
    <div
      role="dialog"
      aria-label={`${passato ? "Com'è andata" : 'Prossimamente'}: ${nomePasto}`}
      onClick={onChiudi}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(20,22,58,0.35)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        className="anim-foglio"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: '#FFFFFF',
          borderRadius: '22px 22px 0 0', padding: '16px 16px 26px',
          display: 'flex', flexDirection: 'column', gap: 9,
        }}
      >
        <span style={stileSeparatore}>
          {passato ? "COM'È ANDATA" : 'PROSSIMAMENTE'} — {nomePasto.toUpperCase()}
        </span>
        {passato && (
          <>
            <Voce onClick={onSaltato}>Saltato</Voce>
            <Voce onClick={onMangiatoAltro}>Ho mangiato fuori piano</Voce>
            <Link href={hrefScegli} style={stileVoce}>
              Ho mangiato un altro piatto
            </Link>
            {aCasa && haPiatto && <Voce onClick={onCucinatoNonMangiato}>Cucinato ma non mangiato</Voce>}
            {spuntato && <Voce onClick={onTornaAlPiano}>Torna al piano</Voce>}
          </>
        )}
        {!passato && (
          <Link href={hrefScegli} style={stileVoce}>
            Cambia piatto
          </Link>
        )}

        <span style={stileSeparatore}>MEAL PREP</span>
        {daPronti ? (
          <Voce onClick={onNonUsarePronta}>Non uso la porzione pronta</Voce>
        ) : (
          prontiDisponibili > 0 && (
            <Voce onClick={onUsaPronta}>
              {`Uso una porzione pronta (${prontiDisponibili} ${prontiDisponibili === 1 ? 'pronta' : 'pronte'})`}
            </Voce>
          )
        )}
        <Voce onClick={() => setStepperAperto((v) => !v)}>Ne preparo di più</Voce>
        {stepperAperto && (
          <Stepper
            iniziale={porzioniPreparate}
            congelatoIniziale={prontiCongelato}
            onSalva={(n, congelato) => onPreparaPorzioni(n, congelato)}
          />
        )}
      </div>
    </div>
  );
}
