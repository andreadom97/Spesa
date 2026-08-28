import { nuovoResiduo } from './pantry';

export interface VoceChiusura {
  ingredientId: string;
  spuntato: boolean;
  quantitaTotale: number;
  fabbisogno: number;
  residuo: number;
  confezioni: number;
  origine: 'piano' | 'controllo' | 'manuale';
}

export interface AggiornamentoDispensa {
  ingredientId: string;
  /** null per la classe stima, che non tiene residuo. */
  residuo: number | null;
  ultimoAcquisto: string | null;
  confezioni: number;
  quantita: number;
  registraAcquisto: boolean;
}

/**
 * Chiudere la spesa è il momento in cui il residuo diventa reale: quello che
 * la lista aveva solo previsto. Una voce non spuntata non è stata comprata,
 * ma il piano la consuma lo stesso — e la settimana dopo se ne ricompra di più.
 */
export function calcolaChiusura(
  input: { voci: VoceChiusura[]; oggi: string },
): AggiornamentoDispensa[] {
  return input.voci.map((v) => {
    const comprato = v.spuntato;
    const daControllo = v.origine === 'controllo';
    return {
      ingredientId: v.ingredientId,
      residuo: daControllo
        ? null
        : nuovoResiduo({
            residuoPrecedente: v.residuo,
            acquistato: comprato ? v.quantitaTotale : 0,
            consumatoDaPiano: v.fabbisogno,
          }),
      ultimoAcquisto: comprato ? input.oggi : null,
      confezioni: comprato ? v.confezioni : 0,
      quantita: comprato ? v.quantitaTotale : 0,
      registraAcquisto: comprato,
    };
  });
}
