import { defineConfig } from "vitest/config";
import path from "node:path";

// Testes automáticos de regras puras (sem banco, sem navegador).
// Rodam com `npm test` e no GitHub a cada envio de código (.github/workflows/ci.yml).
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
