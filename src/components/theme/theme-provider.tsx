"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ColorMode = "dark" | "light" | "system";
export type Contrast  = "normal" | "high";
export type TextSize  = "default" | "large" | "xlarge";
export type Motion    = "system" | "reduce";
export type Density   = "comfortable" | "compact";

interface ThemeState {
  colorMode: ColorMode; contrast: Contrast; textSize: TextSize; motion: Motion; density: Density;
  setColorMode: (v: ColorMode) => void;
  setContrast:  (v: Contrast)  => void;
  setTextSize:  (v: TextSize)  => void;
  setMotion:    (v: Motion)    => void;
  setDensity:   (v: Density)   => void;
}

export const STORAGE_KEYS = {
  colorMode: "dataz-color-mode",
  contrast:  "dataz-contrast",
  textSize:  "dataz-text-size",
  motion:    "dataz-motion",
  density:   "dataz-density",
} as const;

const ThemeContext = createContext<ThemeState | null>(null);

function resolveTheme(mode: ColorMode): "dark" | "light" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>("dark");
  const [contrast,  setContrastState]  = useState<Contrast>("normal");
  const [textSize,  setTextSizeState]  = useState<TextSize>("default");
  const [motion,    setMotionState]    = useState<Motion>("system");
  const [density,   setDensityState]   = useState<Density>("comfortable");

  // Lê a preferência salva ao montar (o script anti-flash no <head> já
  // aplicou os atributos no <html> antes do paint; isso só sincroniza o
  // estado do React com o que já está lá).
  useEffect(() => {
    setColorModeState((localStorage.getItem(STORAGE_KEYS.colorMode) as ColorMode) || "dark");
    setContrastState((localStorage.getItem(STORAGE_KEYS.contrast) as Contrast) || "normal");
    setTextSizeState((localStorage.getItem(STORAGE_KEYS.textSize) as TextSize) || "default");
    setMotionState((localStorage.getItem(STORAGE_KEYS.motion) as Motion) || "system");
    setDensityState((localStorage.getItem(STORAGE_KEYS.density) as Density) || "comfortable");
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", resolveTheme(colorMode));
    html.setAttribute("data-contrast", contrast);
    html.setAttribute("data-text-size", textSize);
    html.setAttribute("data-density", density);
    if (motion === "reduce") html.setAttribute("data-motion", "reduce");
    else html.removeAttribute("data-motion");
  }, [colorMode, contrast, textSize, motion, density]);

  useEffect(() => {
    if (colorMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => document.documentElement.setAttribute("data-theme", resolveTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [colorMode]);

  function setColorMode(v: ColorMode) { localStorage.setItem(STORAGE_KEYS.colorMode, v); setColorModeState(v); }
  function setContrast(v: Contrast)   { localStorage.setItem(STORAGE_KEYS.contrast, v);  setContrastState(v); }
  function setTextSize(v: TextSize)   { localStorage.setItem(STORAGE_KEYS.textSize, v);  setTextSizeState(v); }
  function setMotion(v: Motion)       { localStorage.setItem(STORAGE_KEYS.motion, v);    setMotionState(v); }
  function setDensity(v: Density)     { localStorage.setItem(STORAGE_KEYS.density, v);   setDensityState(v); }

  return (
    <ThemeContext.Provider value={{ colorMode, contrast, textSize, motion, density, setColorMode, setContrast, setTextSize, setMotion, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}
