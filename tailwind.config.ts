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
        brand: {
          50:  "#e8f0fe",
          100: "#d1e0fd",
          200: "#a3c2fb",
          300: "#75a3f9",
          400: "#4785f7",
          500: "#1a56db",
          600: "#1041b2",
          700: "#0c318a",
          800: "#082161",
          900: "#041039",
        },
        teal: {
          50:  "#e1f5ee",
          100: "#c3ebdd",
          500: "#0d9e75",
          600: "#0a7a5a",
          700: "#075e45",
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
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
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
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
