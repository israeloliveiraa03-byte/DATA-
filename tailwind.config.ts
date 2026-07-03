import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Escala neutra "Observatório" — papel/fundo/texto/borda. Ligada a
        // variável CSS pra responder ao modo de cor (claro/escuro/alto
        // contraste) escolhido em /settings, sem precisar trocar classe em
        // cada tela. Ver `globals.css` (":root" e "[data-theme=light]") e
        // "Identidade visual" no CLAUDE.md.
        ink: {
          50:  "rgb(var(--color-ink-50) / <alpha-value>)",
          100: "rgb(var(--color-ink-100) / <alpha-value>)",
          300: "rgb(var(--color-ink-300) / <alpha-value>)",
          500: "rgb(var(--color-ink-500) / <alpha-value>)",
          700: "rgb(var(--color-ink-700) / <alpha-value>)",
          800: "rgb(var(--color-ink-800) / <alpha-value>)",
          900: "rgb(var(--color-ink-900) / <alpha-value>)",
          950: "rgb(var(--color-ink-950) / <alpha-value>)",
        },
        // Acento único de ação/dado — verde-dado. Usar com disciplina. Só o
        // tom usado como TEXTO solto (400) muda por tema — os tons usados
        // como preenchimento sólido (500/600/700) e os tons de chip (50/100)
        // funcionam nos dois fundos sem precisar variar.
        brand: {
          50:  "#e4ebdc",
          100: "#cddcbb",
          400: "rgb(var(--color-brand-400) / <alpha-value>)",
          500: "#7a9b5c",
          600: "#61804a",
          700: "#4c6539",
        },
        // Texto/ícone fixo sobre preenchimento de acento (botão primário,
        // chips sólidos) — não varia com o tema, porque o preenchimento por
        // trás (brand-500/coral-500) também não varia.
        "on-accent": "#14140f",
        // Acentos reservados a badges de status e gráficos — recalibrados pra
        // contraste em fundo escuro (mais claros/saturados que em fundo branco)
        teal: {
          50:  "#dce8ea",
          500: "#4fa3ad",
          600: "#3d8189",
        },
        amber: {
          50:  "#3a3122",
          500: "#e0a940",
          600: "#f0c674",
        },
        coral: {
          50:  "#3a2521",
          500: "#e0715a",
          600: "#ec9686",
        },
        purple: {
          50:  "#2c2a3a",
          500: "#9d94e0",
          600: "#b8b0ec",
        },
        // Paleta de séries pra gráficos multi-categoria, legível em fundo escuro
        chart: {
          1: "#5b8fd9",
          2: "#7a9b5c",
          3: "#e0a940",
          4: "#9d94e0",
          5: "#e0715a",
          6: "#4fa3ad",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "system-ui", "sans-serif"],
        condensed: ["var(--font-condensed)", "IBM Plex Sans Condensed", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "8px",
        lg: "8px",
        xl: "10px",
      },
      // Em rem (não px) de propósito: assim a opção "Tamanho do texto" em
      // /settings (que muda o font-size do <html>) escala essas fontes junto.
      fontSize: {
        "2xs": ["0.625rem",  { lineHeight: "0.875rem" }],
        xs:   ["0.6875rem", { lineHeight: "1rem" }],
        sm:   ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem",  { lineHeight: "1.375rem" }],
        lg:   ["1rem",      { lineHeight: "1.5rem" }],
        xl:   ["1.125rem",  { lineHeight: "1.75rem" }],
      },
      boxShadow: {
        // Profundidade vem de borda + camada de fundo, não de sombra pesada —
        // esses tokens ficam quase imperceptíveis, só pra separar bordas finas.
        xs: "0 1px 2px rgba(0, 0, 0, 0.16)",
        sm: "0 1px 2px rgba(0, 0, 0, 0.20)",
        md: "0 2px 6px rgba(0, 0, 0, 0.24)",
      },
      keyframes: {
        "fade-in":    { from: { opacity: "0", transform: "translateY(2px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: "0.55", transform: "scale(0.82)" } },
        "dot-pulse":  { "0%, 80%, 100%": { opacity: "0.35", transform: "scale(0.75)" }, "40%": { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        "fade-in":    "fade-in 0.15s ease-out both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "dot-pulse":  "dot-pulse 1s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
