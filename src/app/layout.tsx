import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: "variable",
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Dataº — Plataforma de pesquisa de campo", template: "%s | Dataº" },
  description: "Plataforma de coleta, sistematização e visualização de dados para pesquisadores, governos e territórios tradicionais.",
  robots: "index, follow",
};

export const viewport: Viewport = { themeColor: "#c48a42", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body className="bg-white text-gray-900 antialiased font-sans">{children}</body>
    </html>
  );
}
