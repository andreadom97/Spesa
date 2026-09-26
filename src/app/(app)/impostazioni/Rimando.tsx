'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { indirizzoPannello } from '@/components/pannello/indirizzi';
import type { DestinazionePannello } from '@/components/pannello/tipi';

/**
 * Le Impostazioni non sono più una pagina ma un pannello montato nel Guscio
 * (spec fase 5 §A.1). Le tre route di prima restano per segnalibri,
 * cronologia e link salvati, e mandano alla Lista col pannello aperto sulla
 * destinazione giusta. `replace` e non `push`: il rimando non deve restare
 * nella cronologia, altrimenti l'indietro ci ricadrebbe dentro. Non disegna
 * niente: per un istante si vedono il Guscio e la tab bar.
 */
export function Rimando({ verso }: { verso: DestinazionePannello }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(indirizzoPannello('/lista', verso));
  }, [router, verso]);
  return null;
}
