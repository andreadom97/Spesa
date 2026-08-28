'use client';

import { useEffect } from 'react';

/**
 * Registra il service worker solo in produzione: in sviluppo la cache del
 * guscio interferirebbe con l'hot reload e mostrerebbe versioni vecchie.
 * Non renderizza nulla.
 */
export function RegistraSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return null;
}
