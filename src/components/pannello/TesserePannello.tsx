'use client';

import { usePathname } from 'next/navigation';
import type { StatoCasa } from '@/data/casa';
import { usePannello } from './PannelloProvider';
import { useDatiPannello } from './DatiPannello';

/**
 * Il valore della tessera Casa condivisa (§B.3). {N} conta te più i membri;
 * {NOME} è la parte dell'email del proprietario prima della @, in maiuscolo.
 */
export function valoreCasa(casa: StatoCasa): string {
  if (casa.ruolo === 'solo') return 'SOLO TU';
  if (casa.ruolo === 'proprietario') return `CON ${casa.email.length + 1} PERSONE`;
  const nome = (casa.email[0] ?? '').split('@')[0];
  return `NELLA CASA DI ${nome.toLocaleUpperCase('it')}`;
}

function Tessera({ nome, nota, valore, onClick }: { nome: string; nota: string; valore?: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 104, boxSizing: 'border-box', textAlign: 'left', font: 'inherit', color: 'var(--ink)',
        background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 18, boxShadow: 'var(--ombra-pannello)',
        padding: '12px 14px 13px', display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{nome}</span>
      <span style={{ fontSize: 12.5, lineHeight: 1.35, color: 'var(--testo-2)' }}>{nota}</span>
      {valore && (
        <span style={{ marginTop: 'auto', paddingTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em' }}>
          {valore}
        </span>
      )}
    </button>
  );
}

/** Il livello delle funzioni (§B.3, frame 03): quattro tessere 2 × 2, senza Blocco attorno. */
export function TesserePannello() {
  const { entra, vaiA } = usePannello();
  const { stato } = useDatiPannello();
  const pathname = usePathname();
  const casa = stato.stato === 'pronto' ? stato.dati.casa : null;
  const origine = { pathname, sotto: 'cima' as const };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Tessera nome="Piatti" nota="Scrivi e correggi i tuoi piatti." onClick={() => vaiA('/piatti?da=impostazioni', origine)} />
      <Tessera nome="Importa un piano" nota="Da PDF o foto. Sostituisce il piano attuale." onClick={() => vaiA('/importa', origine)} />
      <Tessera nome="Casa condivisa" nota="La spesa con chi vive con te." valore={casa ? valoreCasa(casa) : null} onClick={() => entra('casa')} />
      <Tessera nome="Esporta i tuoi dati" nota="Piatti, piano e dispensa in un file." onClick={() => entra('esporta')} />
    </div>
  );
}
