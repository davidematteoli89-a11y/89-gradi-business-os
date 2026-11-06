import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "89 Gradi Business OS",
    short_name: "89 Gradi",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F3EE",
    theme_color: "#F7F3EE",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
