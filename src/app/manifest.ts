import type { MetadataRoute } from "next";

// Manifesto do app: nome e ícone quando alguém usa "Adicionar à tela inicial"
// no celular (útil para quem coleta em campo pelo navegador). Os ícones ficam
// em /public; o favicon da aba vem de src/app/icon.svg e favicon.ico.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dataº — Infraestrutura de conhecimento",
    short_name: "Dataº",
    description: "Coleta, sistematização e visualização de dados para pesquisas e territórios.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f9f5ed",
    theme_color: "#3b5d42",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
