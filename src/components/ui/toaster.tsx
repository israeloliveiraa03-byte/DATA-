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
          background: resolvedTheme === "dark" ? "#1e1d17" : "#fff",
          color: resolvedTheme === "dark" ? "#e8e4d9" : "#1c1917",
          border: `1px solid ${resolvedTheme === "dark" ? "#302e22" : "#e8d8be"}`,
          borderRadius: "0.75rem",
          fontSize: "0.8125rem",
        },
      }}
      icons={{
        success: <i className="ti ti-circle-check" style={{ color: "#4c6b3c" }} />,
        error:   <i className="ti ti-alert-circle" style={{ color: "#c0392b" }} />,
      }}
    />
  );
}
