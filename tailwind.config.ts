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
        // Escala neutra "Observatório" — fundo/texto/borda em tom escuro e quente
        // (não preto puro). Ver "Identidade visual" no CLAUDE.md.
        ink: {
          50:  "#f5f3ec",
          100: "#e8e4d9",
          300: "#9c9884",
          500: "#5c5847",
          700: "#302e22",
          800: "#262419",
          900: "#1e1d17",
          950: "#14140f",
        },
        // Acento único de ação/dado — verde-dado. Usar com disciplina.
        brand: {
          50:  "#e4ebdc",
          100: "#cddcbb",
          400: "#93b377",
          500: "#7a9b5c",
          600: "#61804a",
          700: "#4c6539",
        },
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
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
        xs:   ["11px", { lineHeight: "16px" }],
        sm:   ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "22px" }],
        lg:   ["16px", { lineHeight: "24px" }],
        xl:   ["18px", { lineHeight: "28px" }],
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
      },
      animation: {
        "fade-in":    "fade-in 0.15s ease-out both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
