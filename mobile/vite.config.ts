import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Capacitor serve o app de dist/ dentro do WebView nativo.
  build: { outDir: "dist" },
  server: { port: 5173 },
});
