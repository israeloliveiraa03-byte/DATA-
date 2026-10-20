import type { Config } from "tailwindcss";

// Todas as cores apontam para variáveis CSS definidas em src/styles/globals.css
// (sistema visual "Confluência"). Trocar o tema = trocar [data-theme] em
// qualquer elemento; nenhuma tela precisa trocar classe.
const v = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: v("ink-50"), 100: v("ink-100"), 300: v("ink-300"), 500: v("ink-500"),
          600: v("ink-600"), 700: v("ink-700"), 800: v("ink-800"), 900: v("ink-900"), 950: v("ink-950"),
        },
        brand: {
          50: v("brand-50"), 100: v("brand-100"), 200: v("brand-200"), 300: v("brand-300"),
          400: v("brand-400"), 500: v("brand-500"), 600: v("brand-600"), 700: v("brand-700"),
        },
        // Texto/ícone sobre preenchimento de acento (botão primário, chips sólidos)
        "on-accent": "#ffffff",
        gold:   v("gold"),
        teal:   { 50: v("teal-50"),   500: v("teal-500"),   600: v("teal-600") },
        amber:  { 50: v("amber-50"),  500: v("amber-500"),  600: v("amber-600") },
        coral:  { 50: v("coral-50"),  500: v("coral-500"),  600: v("coral-600") },
        purple: { 50: v("purple-50"), 500: v("purple-500"), 600: v("purple-600") },
        chart: {
          1: v("chart-1"), 2: v("chart-2"), 3: v("chart-3"),
          4: v("chart-4"), 5: v("chart-5"), 6: v("chart-6"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        // "condensed" foi a voz de título do tema anterior (IBM Plex
        // Condensed). Mantido como alias do corpo pra não quebrar as ~200
        // ocorrências; títulos novos usam `font-serif`.
        condensed: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        // Aspas obrigatórias: nome de fonte com número ("4") sem aspas invalida a
        // declaração inteira no CSS.
        serif: ["var(--font-serif)", '"Source Serif 4"', "Georgia", "serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
      },
      // Em rem (não px): a opção "Tamanho do texto" em /settings escala tudo.
      fontSize: {
        "2xs": ["0.6875rem",  { lineHeight: "1rem" }],
        xs:    ["0.75rem",    { lineHeight: "1.125rem" }],
        sm:    ["0.84375rem", { lineHeight: "1.3rem" }],
        base:  ["0.9375rem",  { lineHeight: "1.5rem" }],
        lg:    ["1.0625rem",  { lineHeight: "1.6rem" }],
        xl:    ["1.25rem",    { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem",     { lineHeight: "2rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.875rem",   { lineHeight: "2.25rem", letterSpacing: "-0.015em" }],
        "4xl": ["2.375rem",   { lineHeight: "2.6rem", letterSpacing: "-0.02em" }],
        "5xl": ["3rem",       { lineHeight: "3.1rem", letterSpacing: "-0.025em" }],
        "6xl": ["3.75rem",    { lineHeight: "1.02", letterSpacing: "-0.03em" }],
      },
      boxShadow: {
        xs: "0 1px 2px rgb(var(--shadow-color) / 0.05)",
        sm: "0 1px 3px rgb(var(--shadow-color) / 0.07), 0 1px 2px rgb(var(--shadow-color) / 0.04)",
        md: "0 4px 14px -2px rgb(var(--shadow-color) / 0.09), 0 2px 4px rgb(var(--shadow-color) / 0.04)",
        lg: "0 14px 36px -10px rgb(var(--shadow-color) / 0.18), 0 4px 10px rgb(var(--shadow-color) / 0.05)",
        xl: "0 24px 60px -18px rgb(var(--shadow-color) / 0.28)",
      },
      maxWidth: {
        page: "1240px",
        prose: "68ch",
      },
      keyframes: {
        "fade-in":    { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in-left": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: "0.55", transform: "scale(0.82)" } },
        "dot-pulse":  { "0%, 80%, 100%": { opacity: "0.35", transform: "scale(0.75)" }, "40%": { opacity: "1", transform: "scale(1)" } },
        "loading-indeterminate": { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(300%)" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
      animation: {
        "fade-in":    "fade-in 0.25s cubic-bezier(0.2,0.8,0.2,1) both",
        "slide-in-left": "slide-in-left 0.22s cubic-bezier(0.2,0.8,0.2,1) both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "dot-pulse":  "dot-pulse 1s ease-in-out infinite",
        "loading-indeterminate": "loading-indeterminate 1.1s ease-in-out infinite",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
