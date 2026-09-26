'use client';

import { coloreArea, tintaOpacaArea } from '@/domain/aree';
import { etichettaQuantita, statoTessera, type PillolaStato, type VoceDispensa } from '@/domain/dispensa-vista';
import { trovaIcona } from '@/domain/icone-ingredienti';
import { IconaIngrediente, alone } from '@/components/IconaIngrediente';

function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const PILLOLA = {
  fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em',
  textTransform: 'uppercase' as const, borderRadius: 999, padding: '5px 10px',
};

/**
 * La tessera di dispensa (DESIGN.md §8, gesto del 25/09): un tasto che apre il
 * dettaglio. In casa ha la tinta d'area al 26%; finita e mai comprata sono
 * tratteggiate, e le distingue la parola (`Finito`, `MAI COMPRATO`) e il nome
 * barrato o no — mai il solo colore (§11).
 */
export function TesseraDispensa({ voce, pillola, onApri }: { voce: VoceDispensa; pillola: PillolaStato | null; onApri: () => void }) {
  const stato = statoTessera(voce);
  const inCasa = stato === 'inCasa';
  const testoQuantita = inCasa
    ? etichettaQuantita(voce.residuo, voce.ingrediente.unitaBase)
    : stato === 'finita' ? 'Finito' : 'Mai comprato';
  const { nome, area } = voce.ingrediente;
  const chiave = trovaIcona(nome);
  return (
    <button
      type="button"
      onClick={onApri}
      aria-label={`Apri ${voce.ingrediente.nome}`}
      style={{
        minHeight: 104, boxSizing: 'border-box', borderRadius: 14, padding: '12px 14px 13px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
        background: inCasa ? rgba(coloreArea(voce.ingrediente.area), 0.26) : 'none',
        border: inCasa ? 'none' : '2px dashed var(--bordo-tratteggio)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {chiave && <IconaIngrediente chiave={chiave} area={area} tono={inCasa ? 'area' : 'spento'} taglia={52} />}
      <span
        style={{
          ...PILLOLA,
          background: inCasa ? 'var(--superficie)' : 'rgba(20,22,58,0.06)',
          color: inCasa ? 'var(--ink)' : 'var(--testo-2)',
          position: 'relative',
        }}
      >
        {testoQuantita}
      </span>
      <span
        style={{
          fontSize: 17, fontWeight: 700, letterSpacing: '-0.032em', lineHeight: 1.1, marginTop: 'auto', paddingTop: 12,
          color: stato === 'inCasa' ? 'var(--ink)' : stato === 'finita' ? 'rgba(20,22,58,0.34)' : 'var(--testo-2)',
          textDecoration: stato === 'finita' ? 'line-through' : 'none', textDecorationThickness: 1.6,
          position: 'relative',
          // Finita è barrata: niente alone, contornerebbe la barra (come la Lista spuntata).
          textShadow: chiave && stato !== 'finita' ? alone(inCasa ? tintaOpacaArea(area) : '#FFFFFF', 2) : undefined,
          overflowWrap: 'anywhere',
        }}
      >
        {voce.ingrediente.nome}
      </span>
      {pillola && (
        <span
          style={{
            marginTop: 8, background: 'var(--superficie)', borderRadius: 999, padding: '4px 9px',
            fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em',
            color: pillola.tono === 'avviso' ? 'var(--avviso)' : 'var(--freddo)',
            position: 'relative',
          }}
        >
          {pillola.testo}
        </span>
      )}
    </button>
  );
}
