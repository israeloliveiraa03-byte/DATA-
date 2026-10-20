"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

// Toast global do produto — cores/raio combinando com a paleta argila/
// terracota usada no conteúdo (mesmo se o chrome em volta ainda for escuro),
// acompanha o modo claro/escuro já resolvido pelo ThemeProvider em vez do
// tema padrão da lib (que só olha prefers-color-scheme do sistema).
export function Toaster() {
  const { colorMode } = useTheme();
  const resolvedTheme = colorMode === "system"
    ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : colorMode;

  return (
    <SonnerToaster
      position="bottom-right"
      theme={resolvedTheme}
      toastOptions={{
        style: {
          background: "rgb(var(--color-ink-900))",
          color: "rgb(var(--color-ink-100))",
          border: "1px solid rgb(var(--color-ink-700))",
          borderRadius: "0.75rem",
          fontSize: "0.84375rem",
          boxShadow: "0 14px 36px -10px rgb(var(--shadow-color) / 0.22)",
        },
      }}
      icons={{
        success: <i className="ti ti-circle-check" style={{ color: "rgb(var(--color-brand-500))" }} />,
        error:   <i className="ti ti-alert-circle" style={{ color: "rgb(var(--color-coral-500))" }} />,
      }}
    />
  );
}
