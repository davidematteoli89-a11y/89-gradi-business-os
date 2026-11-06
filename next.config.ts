import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Area privata interamente legata alla sessione: rendering dinamico.
  // cacheComponents disattivato di proposito (vedi docs/02-architettura.md).
  poweredByHeader: false,
  experimental: {
    // foto scontrino scattate da iPhone
    serverActions: { bodySizeLimit: "12mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
