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
        // Primária — argila/terracota, tom institucional inspirado na malha do IBGE
        // (chrome, ações, links, foco). Ver "Identidade visual" no CLAUDE.md.
        brand: {
          50:  "#fbf3e7",
          100: "#f3e4cb",
          200: "#e8d8be",
          300: "#d9bb8c",
          400: "#d2a05c",
          500: "#c48a42",
          600: "#a06d28",
          700: "#7a5218",
          800: "#5c3f13",
          900: "#3d2a0d",
        },
        // Acentos de dados — reservados a gráficos, indicadores e badges de status
        teal: {
          50:  "#eaf0e4",
          100: "#d3e1c4",
          500: "#4c6b3c",
          600: "#3a5430",
          700: "#2c4025",
        },
        amber: {
          50:  "#faeeda",
          500: "#ba7517",
          600: "#854f0b",
        },
        coral: {
          50:  "#fcebeb",
          500: "#c0392b",
          600: "#791f1f",
        },
        purple: {
          50:  "#eeedfe",
          500: "#534ab7",
          600: "#3c3489",
        },
        // Paleta de séries pra gráficos multi-categoria (inspirada no amCharts)
        chart: {
          1: "#1a56db",
          2: "#0d9e75",
          3: "#ba7517",
          4: "#534ab7",
          5: "#c0392b",
          6: "#0891b2",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Fraunces", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        md: "10px",
        lg: "12px",
        xl: "16px",
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
        xs:   "0 1px 2px rgba(15, 23, 42, 0.04)",
        sm:   "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        md:   "0 4px 12px rgba(15, 23, 42, 0.08)",
        lg:   "0 12px 32px rgba(15, 23, 42, 0.10)",
        glow: "0 0 0 1px rgba(196, 138, 66, 0.10), 0 8px 24px rgba(196, 138, 66, 0.14)",
      },
      backgroundImage: {
        "brand-glow": "radial-gradient(circle at 30% 20%, rgba(196, 138, 66, 0.16), transparent 55%)",
      },
      keyframes: {
        "fade-in":    { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: "0.55", transform: "scale(0.82)" } },
      },
      animation: {
        "fade-in":    "fade-in 0.4s ease-out both",
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
