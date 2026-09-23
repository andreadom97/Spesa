'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const Nascosta = createContext(false);
const Imposta = createContext<(nascosta: boolean) => void>(() => {});

/**
 * Chi può chiedere al Guscio di non montare la tab bar: oggi solo la
 * fotocamera di Importa, che è a tutto schermo (spec fase 3 §G). Stesso
 * modello di `marchio-context.tsx`. Senza provider (nei test di un componente
 * da solo) la richiesta cade nel vuoto, di proposito.
 */
export function BarraProvider({ children }: { children: ReactNode }) {
  const [nascosta, setNascosta] = useState(false);
  return (
    <Imposta.Provider value={setNascosta}>
      <Nascosta.Provider value={nascosta}>{children}</Nascosta.Provider>
    </Imposta.Provider>
  );
}

/** Finché il componente che la chiama è montato, la barra resta fuori; allo smontaggio torna. */
export function useNascondiBarra(nascosta: boolean): void {
  const imposta = useContext(Imposta);
  useEffect(() => {
    imposta(nascosta);
    return () => imposta(false);
  }, [imposta, nascosta]);
}

export function useBarraNascosta(): boolean {
  return useContext(Nascosta);
}
