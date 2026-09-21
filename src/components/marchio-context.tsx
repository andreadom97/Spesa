'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AreaId } from '@/domain/types';

const Aree = createContext<AreaId[]>([]);
const Pubblica = createContext<(aree: AreaId[]) => void>(() => {});

/** Le aree in cui manca ancora qualcosa: le pubblica solo la Lista, le legge il Marchio in tab bar. */
export function MarchioProvider({ children }: { children: ReactNode }) {
  const [aree, setAree] = useState<AreaId[]>([]);
  return <Pubblica.Provider value={setAree}><Aree.Provider value={aree}>{children}</Aree.Provider></Pubblica.Provider>;
}

/** Da chiamare nella pagina che conosce le aree mancanti; allo smontaggio il marchio torna tutto pieno. */
export function useAreeMancanti(aree: AreaId[]): void {
  const pubblica = useContext(Pubblica);
  // Le AreaId sono sei identificativi fissi, senza virgole, in ordine stabile
  // (spec §C): il join basta come chiave, senza serializzare l'array intero.
  const chiave = aree.join(',');
  useEffect(() => { pubblica(aree); }, [pubblica, chiave]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => pubblica([]), [pubblica]);
}

export function useAreeMancantiCorrenti(): AreaId[] {
  return useContext(Aree);
}
