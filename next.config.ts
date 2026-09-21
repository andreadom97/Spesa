import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Settimana è diventata Piano il 20/09: i link salvati e la PWA installata continuano a funzionare.
  async redirects() {
    return [
      { source: '/settimana', destination: '/piano', permanent: true },
      { source: '/settimana/:path*', destination: '/piano/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
