import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed, IBM_Plex_Mono } from "next/font/google";
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
    var mode = localStorage.getItem("dataz-color-mode") || "dark";
    var theme = mode === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : mode;
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

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const plexCondensed = IBM_Plex_Sans_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-condensed", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Dataº — Plataforma de pesquisa de campo", template: "%s | Dataº" },
  description: "Plataforma de coleta, sistematização e visualização de dados para pesquisadores, governos e territórios tradicionais.",
  robots: "index, follow",
};

export const viewport: Viewport = { themeColor: "#14140f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${plexCondensed.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
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
