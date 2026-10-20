import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
// Ícones Tabler servidos junto com a aplicação (versão travada no
// package.json) — antes vinham de um CDN externo com @latest, o que podia
// quebrar ícones sem aviso a cada nova versão do pacote.
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";

// Aplica a preferência de aparência salva (modo de cor/contraste/tamanho de
// texto/densidade) no <html> antes do primeiro paint, pra não piscar o tema
// errado. Conteúdo fixo (não vem de input do usuário) — mesma técnica que a
// lib next-themes usa por baixo dos panos, escrita à mão aqui.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem("dataz-color-mode") || "light";
    var theme = mode === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : (mode === "dark" ? "dark" : "light");
    var html = document.documentElement;
    html.setAttribute("data-theme", theme);
    html.setAttribute("data-contrast", localStorage.getItem("dataz-contrast") || "normal");
    html.setAttribute("data-text-size", localStorage.getItem("dataz-text-size") || "default");
    html.setAttribute("data-density", localStorage.getItem("dataz-density") || "comfortable");
    var motion = localStorage.getItem("dataz-motion");
    if (motion === "reduce") html.setAttribute("data-motion", "reduce");
  } catch (e) {}
})();
`;

// Sistema visual "Confluência": Inter no corpo/interface, Source Serif 4 nos
// títulos e números de destaque (mesmo par tipográfico dos painéis CONAQ),
// IBM Plex Mono só para identificadores (ex.: COM-000245).
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Dataº — Infraestrutura de conhecimento para pesquisa e territórios", template: "%s · Dataº" },
  description: "Plataforma de coleta, sistematização e visualização de dados para pesquisadores, governos e territórios tradicionais.",
  robots: "index, follow",
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f9f5ed" }, { media: "(prefers-color-scheme: dark)", color: "#11130f" }], width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sourceSerif.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-ink-950 text-ink-100 antialiased font-sans">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
