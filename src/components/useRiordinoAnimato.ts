'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Riordino animato di un elenco (FLIP), per i reparti della Lista che
 * scendono in fondo quando sono finiti (Andrea, 26/09; DESIGN.md §7
 * `.anim-riordino`). Chi si è spostato parte dalla posizione vecchia e
 * scivola in quella nuova in 220 ms; con `prefers-reduced-motion: reduce` la
 * classe non ha transizione e il salto è immediato.
 *
 * Le posizioni si leggono con `offsetTop`, non con `getBoundingClientRect`:
 * fra una spunta e l'altra la pagina scorre, e una misura relativa al
 * viewport scambierebbe lo scorrimento per uno spostamento.
 *
 * Restituisce `registra(chiave)`, da passare come `ref` a ogni elemento.
 */
export function useRiordinoAnimato(chiavi: readonly string[]): (chiave: string) => (el: HTMLElement | null) => void {
  const elementi = useRef(new Map<string, HTMLElement>());
  const posizioni = useRef(new Map<string, number>());
  const ordinePrima = useRef<string | null>(null);
  const ordine = chiavi.join('|');

  const registra = useCallback((chiave: string) => (el: HTMLElement | null) => {
    if (el) elementi.current.set(chiave, el);
    else elementi.current.delete(chiave);
  }, []);

  useLayoutEffect(() => {
    const nuove = new Map<string, number>();
    for (const [k, el] of elementi.current) nuove.set(k, el.offsetTop);

    const cambiato = ordinePrima.current !== null && ordinePrima.current !== ordine;
    if (cambiato) {
      for (const [k, el] of elementi.current) {
        const prima = posizioni.current.get(k);
        const dopo = nuove.get(k);
        if (prima === undefined || dopo === undefined || prima === dopo) continue;
        el.classList.remove('anim-riordino');
        el.style.setProperty('transform', `translateY(${prima - dopo}px)`);
        void el.offsetHeight; // il browser fissa la posizione di partenza prima della transizione
        el.classList.add('anim-riordino');
        el.style.removeProperty('transform');
      }
    }
    posizioni.current = nuove;
    ordinePrima.current = ordine;
  });

  return registra;
}
