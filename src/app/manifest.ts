import type { MetadataRoute } from "next";

// Le CRM s'installe sur l'écran d'accueil du téléphone, avec un raccourci direct vers la capture d'idées (bloc 8).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prepared Minds Team CRM",
    short_name: "PMT CRM",
    description: "CRM Prepared Minds Team",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#172047",
    theme_color: "#172047",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Capturer une idée",
        short_name: "Idée",
        description: "Dicter ou écrire une idée tout de suite",
        url: "/idees?capture=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
