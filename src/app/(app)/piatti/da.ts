import { indirizzoRitorno } from '@/components/pannello/indirizzi';

/** Da dove si è aperto Piatti, e quindi dove porta la pillola della Testata (spec fase 5 §G.2). */
export type DaPiatti = 'impostazioni' | 'lista' | 'piano';

const CHIAVE = 'spesa:piatti-da';
const VALORI: readonly DaPiatti[] = ['impostazioni', 'lista', 'piano'];

function eDa(v: unknown): v is DaPiatti {
  return typeof v === 'string' && (VALORI as readonly string[]).includes(v);
}

/**
 * Prima l'URL (`?da=`), poi `sessionStorage`, poi `impostazioni`. Quando lo
 * trova nell'URL lo salva: l'editor del piatto torna a `/piatti` senza
 * parametro [misurato: `router.push('/piatti')`], e così ritrova la stessa
 * pillola. `sessionStorage` può lanciare (navigazione privata, spazio
 * esaurito): in quel caso vale solo l'URL.
 */
export function leggiDaPiatti(search: string): DaPiatti {
  const dalUrl = new URLSearchParams(search).get('da');
  if (eDa(dalUrl)) {
    try {
      window.sessionStorage.setItem(CHIAVE, dalUrl);
    } catch {
      // Senza memoria la pillola vale finché si resta su Piatti.
    }
    return dalUrl;
  }
  try {
    const salvato = window.sessionStorage.getItem(CHIAVE);
    if (eDa(salvato)) return salvato;
  } catch {
    // Come sopra: si scende al valore di base.
  }
  return 'impostazioni';
}

/** L'etichetta e il nome accessibile della pillola, dalla tabella di §G.2. */
export const PILLOLA_DA: Record<DaPiatti, { etichetta: string; ariaLabel: string }> = {
  impostazioni: { etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni' },
  lista: { etichetta: 'LISTA', ariaLabel: 'Torna alla lista' },
  piano: { etichetta: 'PIANO', ariaLabel: 'Torna al piano' },
};

/**
 * Dove porta la pillola. Per `impostazioni` è il pannello sopra la pagina
 * da cui si era partiti (spec §A.5): si legge al tocco, non al render, perché
 * l'origine sta in `sessionStorage`.
 */
export function destinazioneDa(da: DaPiatti): string {
  if (da === 'lista') return '/lista';
  if (da === 'piano') return '/piano';
  return indirizzoRitorno();
}
