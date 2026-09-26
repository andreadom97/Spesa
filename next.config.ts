import type { NextConfig } from "next";
// La versione del piede del pannello (spec fase 5 §B.4): una fonte sola,
// package.json. `env` la scrive nel bundle a build; il nome è quello della spec.
import pacchetto from './package.json';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSIONE: pacchetto.version,
  },
  // Settimana è diventata Piano il 20/09: i link salvati e la PWA installata continuano a funzionare.
  async redirects() {
    return [
      { source: '/settimana', destination: '/piano', permanent: true },
      { source: '/settimana/:path*', destination: '/piano/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
