// Identidade visual própria de cada painel publicado.
//
// Fica guardada em dashboards.layout.brand (jsonb que já existia — nenhuma
// coluna nova, nada pra rodar no banco). O editor aplica a identidade ao
// canvas e a página pública /d/[slug] aplica à página inteira.
//
// Como funciona: o sistema visual do Dataº usa variáveis CSS (--color-brand-500,
// --font-serif...). A identidade só SOBRESCREVE essas variáveis no bloco do
// painel — então botões, números, faixa, filtros e gráficos mudam juntos, sem
// cada componente precisar saber da identidade. As cores escolhidas passam por
// um ajuste automático de contraste (WCAG AA): se a pessoa escolhe um amarelo
// claro, o texto em amarelo escurece o suficiente pra continuar legível.

import type { ColorPalette } from "./types";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type HeaderStyle = "editorial" | "banner" | "centered" | "minimal";
export type CardStyle = "bordered" | "elevated" | "flat" | "outline" | "accent-top";
export type HeaderPattern = "roots" | "contour" | "dots" | "grid" | "none";
export type WidgetTitleStyle = "default" | "kicker" | "serif";
export type Density = "compact" | "normal" | "airy";

export interface BrandLink { label: string; url: string }

export interface DashboardBrand {
  /** Estilo pronto de origem (só informativo — os campos abaixo valem). */
  preset?: string;
  /** Cor principal (hex): faixa, botões, números em destaque, mapas. */
  accent?: string;
  /** Cor secundária (hex): rótulos editoriais (kicker), detalhes. */
  secondary?: string;
  /** Cores das séries dos gráficos (hex, 2 a 10). Vazio = paleta escolhida. */
  palette?: string[];
  /** Fundo da página no tema claro (hex). */
  background?: string;
  headingFont?: string;
  bodyFont?: string;
  /** Logo em data URL (redimensionada no navegador antes de salvar). */
  logoUrl?: string;
  /** Nome da instituição/coletivo que assina o painel. */
  organization?: string;
  showBand?: boolean;
  header?: HeaderStyle;
  pattern?: HeaderPattern;
  card?: CardStyle;
  radius?: number;
  density?: Density;
  widgetTitle?: WidgetTitleStyle;
  /** Texto "Fonte:" do cabeçalho. */
  sourceNote?: string;
  /** Linha final do rodapé. */
  footerNote?: string;
  showFooterInfo?: boolean;
  links?: BrandLink[];
  chart?: {
    gridlines?: boolean;
    dataLabels?: boolean;
    barRadius?: number;
  };
}

// ─── Fontes ──────────────────────────────────────────────────────────────────
// Lista curada (Google Fonts, licença aberta). "google" é o trecho do
// parâmetro family= da API css2; vazio = já carregada pelo app (next/font),
// referida por --font-app-* (cópias fixas definidas em globals.css, para a
// identidade poder trocar --font-sans/--font-serif sem referência circular).

export interface FontOption {
  key: string;
  label: string;
  stack: string;
  kind: "serif" | "sans" | "display" | "mono";
  google: string;
  note?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { key: "source-serif", label: "Source Serif 4", kind: "serif", stack: 'var(--font-app-serif), Georgia, serif', google: "", note: "padrão dos títulos" },
  { key: "inter", label: "Inter", kind: "sans", stack: "var(--font-app-sans), system-ui, sans-serif", google: "", note: "padrão do texto" },
  { key: "lora", label: "Lora", kind: "serif", stack: "Lora, Georgia, serif", google: "Lora:ital,wght@0,400;0,600;0,700;1,400" },
  { key: "merriweather", label: "Merriweather", kind: "serif", stack: "Merriweather, Georgia, serif", google: "Merriweather:wght@400;700" },
  { key: "fraunces", label: "Fraunces", kind: "serif", stack: "Fraunces, Georgia, serif", google: "Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700" },
  { key: "playfair", label: "Playfair Display", kind: "display", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;600;700" },
  { key: "dm-serif", label: "DM Serif Display", kind: "display", stack: '"DM Serif Display", Georgia, serif', google: "DM+Serif+Display" },
  { key: "roboto-slab", label: "Roboto Slab", kind: "serif", stack: '"Roboto Slab", Georgia, serif', google: "Roboto+Slab:wght@400;600;700" },
  { key: "ibm-plex-sans", label: "IBM Plex Sans", kind: "sans", stack: '"IBM Plex Sans", system-ui, sans-serif', google: "IBM+Plex+Sans:wght@400;500;600;700" },
  { key: "work-sans", label: "Work Sans", kind: "sans", stack: '"Work Sans", system-ui, sans-serif', google: "Work+Sans:wght@400;500;600;700" },
  { key: "montserrat", label: "Montserrat", kind: "sans", stack: "Montserrat, system-ui, sans-serif", google: "Montserrat:wght@400;500;600;700" },
  { key: "nunito-sans", label: "Nunito Sans", kind: "sans", stack: '"Nunito Sans", system-ui, sans-serif', google: "Nunito+Sans:wght@400;600;700" },
  { key: "space-grotesk", label: "Space Grotesk", kind: "sans", stack: '"Space Grotesk", system-ui, sans-serif', google: "Space+Grotesk:wght@400;500;600;700" },
  { key: "source-sans", label: "Source Sans 3", kind: "sans", stack: '"Source Sans 3", system-ui, sans-serif', google: "Source+Sans+3:wght@400;600;700" },
  { key: "atkinson", label: "Atkinson Hyperlegible", kind: "sans", stack: '"Atkinson Hyperlegible", system-ui, sans-serif', google: "Atkinson+Hyperlegible:wght@400;700", note: "feita para baixa visão" },
  { key: "ibm-plex-mono", label: "IBM Plex Mono", kind: "mono", stack: "var(--font-app-mono), ui-monospace, monospace", google: "" },
];

export function fontByKey(key: string | undefined): FontOption | undefined {
  return key ? FONT_OPTIONS.find(f => f.key === key) : undefined;
}

/** URL do CSS do Google Fonts para as fontes da identidade (null se nenhuma precisar). */
export function googleFontsHref(brand: DashboardBrand | null | undefined): string | null {
  if (!brand) return null;
  const families = [fontByKey(brand.headingFont), fontByKey(brand.bodyFont)]
    .filter((f): f is FontOption => !!f && !!f.google)
    .map(f => f.google);
  const unique = Array.from(new Set(families));
  if (unique.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${unique.map(f => `family=${f}`).join("&")}&display=swap`;
}

// ─── Cor: conversões e contraste ─────────────────────────────────────────────

type RGB = [number, number, number];

export function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function luminance([r, g, b]: RGB): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export function contrastRatio(a: RGB | string, b: RGB | string): number {
  const ca = typeof a === "string" ? hexToRgb(a) : a;
  const cb = typeof b === "string" ? hexToRgb(b) : b;
  const [l1, l2] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Escurece (fundo claro) ou clareia (fundo escuro) uma cor, em passos, até
 * atingir o contraste mínimo contra o fundo. Mantém a matiz escolhida.
 */
export function ensureContrast(color: RGB, bg: RGB, min: number): RGB {
  if (contrastRatio(color, bg) >= min) return color;
  const target: RGB = luminance(bg) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  for (let t = 0.05; t <= 1; t += 0.05) {
    const c = mix(color, target, t);
    if (contrastRatio(c, bg) >= min) return c;
  }
  return target;
}

const triplet = ([r, g, b]: RGB) => `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;

// Fundos dos temas (ver src/styles/globals.css) — usados no cálculo de contraste.
const LIGHT_CARD: RGB = [255, 255, 255];
const LIGHT_PAGE: RGB = [249, 245, 237];
const DARK_CARD: RGB = [25, 28, 23];
const DARK_PAGE: RGB = [17, 19, 15];
const WHITE: RGB = [255, 255, 255];
const INK: RGB = [20, 19, 15];

/**
 * Variáveis CSS que aplicam a identidade num bloco. Devolve objeto pronto pra
 * `style={...}` do React. Só inclui o que a pessoa personalizou.
 */
export function brandCssVars(brand: DashboardBrand | null | undefined, dark: boolean): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!brand) return vars;

  if (isHex(brand.accent)) {
    const a = hexToRgb(brand.accent);
    const card = dark ? DARK_CARD : LIGHT_CARD;
    // Preenchimento (botões, barras, pinos): a cor como escolhida no claro;
    // no escuro, clareada até ter contraste com o fundo.
    const fill = dark ? ensureContrast(a, card, 4.5) : a;
    // Texto em cor de destaque (números, links): sempre ≥ 4,5:1 com o cartão.
    const page = !dark && isHex(brand.background) ? hexToRgb(brand.background) : dark ? DARK_PAGE : LIGHT_PAGE;
    const text = ensureContrast(ensureContrast(a, card, dark ? 6 : 4.6), page, 4.6);
    // Faixa institucional e rodapé: fundo escuro o bastante pra texto branco.
    const band = ensureContrast(mix(a, [0, 0, 0], dark ? 0.35 : 0.15), WHITE, 7);
    const onFill = contrastRatio(WHITE, fill) >= 4.5 ? WHITE : INK;
    vars["--color-brand-500"] = triplet(fill);
    vars["--color-brand-400"] = triplet(text);
    vars["--color-brand-600"] = triplet(dark ? mix(fill, WHITE, 0.15) : mix(fill, [0, 0, 0], 0.15));
    vars["--color-brand-700"] = triplet(band);
    vars["--color-brand-50"]  = triplet(mix(a, card, dark ? 0.82 : 0.9));
    vars["--color-brand-100"] = triplet(mix(a, card, dark ? 0.72 : 0.8));
    vars["--color-brand-200"] = triplet(mix(a, card, dark ? 0.55 : 0.6));
    vars["--color-brand-300"] = triplet(mix(a, card, dark ? 0.35 : 0.4));
    vars["--color-on-accent"] = triplet(onFill);
  }

  if (isHex(brand.secondary)) {
    // O rótulo aparece tanto no fundo da página quanto no cartão — garante
    // leitura nos dois (e no fundo próprio, se houver).
    const s = hexToRgb(brand.secondary);
    const pageBg = !dark && isHex(brand.background) ? hexToRgb(brand.background) : dark ? DARK_PAGE : LIGHT_PAGE;
    const cardBg = dark ? DARK_CARD : LIGHT_CARD;
    vars["--color-gold"] = triplet(ensureContrast(ensureContrast(s, pageBg, 4.6), cardBg, 4.6));
  }

  // Fundo próprio só no tema claro — no escuro o fundo é sempre escuro para
  // manter o contraste de todo o resto.
  if (!dark && isHex(brand.background)) {
    const bg = hexToRgb(brand.background);
    vars["--color-ink-950"] = triplet(bg);
    vars["--color-ink-800"] = triplet(mix(bg, [0, 0, 0], 0.035));
  }

  const heading = fontByKey(brand.headingFont);
  const body = fontByKey(brand.bodyFont);
  if (heading) vars["--font-serif"] = heading.stack;
  if (body) vars["--font-sans"] = body.stack;

  if (typeof brand.radius === "number") vars["--brand-radius"] = `${Math.min(28, Math.max(0, brand.radius))}px`;
  return vars;
}

/** Paleta efetiva dos gráficos: cores próprias da identidade, se houver. */
export function brandChartPalette(brand: DashboardBrand | null | undefined, fallback: ColorPalette): ColorPalette {
  const colors = (brand?.palette ?? []).filter(isHex);
  const accent = isHex(brand?.accent) ? hexToRgb(brand!.accent!).join(", ") : undefined;
  if (colors.length < 2 && !accent) return fallback;
  return {
    label: "Identidade do painel",
    chartColors: colors.length >= 2 ? colors : fallback.chartColors,
    accent: accent ?? fallback.accent,
  };
}

export const DENSITY_GAP: Record<Density, number> = { compact: 4, normal: 6, airy: 10 };

// ─── Paletas geradas ─────────────────────────────────────────────────────────

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export type PaletteScheme = "analogous" | "complementary" | "triad" | "shades";

/**
 * Gera 6 cores a partir de uma cor base. As luminosidades alternam (escuro,
 * médio, claro) para que séries vizinhas se distingam também em preto e branco.
 */
export function generatePalette(baseHex: string, scheme: PaletteScheme): string[] {
  const [h, s0, l0] = rgbToHsl(hexToRgb(baseHex));
  const s = Math.max(0.35, Math.min(0.75, s0));
  const l = Math.max(0.3, Math.min(0.5, l0));
  const lights = [l, l + 0.14, l - 0.08, l + 0.24, l + 0.06, l - 0.02];
  const hues: Record<PaletteScheme, number[]> = {
    analogous:     [0, 30, -30, 60, -60, 15],
    complementary: [0, 180, 20, 200, -20, 160],
    triad:         [0, 120, 240, 60, 180, 300],
    shades:        [0, 0, 0, 0, 0, 0],
  };
  return hues[scheme].map((dh, i) => {
    const li = scheme === "shades" ? 0.22 + i * 0.1 : lights[i];
    return rgbToHex(hslToRgb(h + dh, scheme === "shades" ? s : s * (i % 2 ? 0.85 : 1), Math.max(0.18, Math.min(0.78, li))));
  });
}

/** Pares de cores da paleta parecidas demais para distinguir (diferença perceptual aproximada). */
export function similarPairs(colors: string[], threshold = 28): [number, number][] {
  const pairs: [number, number][] = [];
  const valid = colors.map(c => (isHex(c) ? hexToRgb(c) : null));
  for (let i = 0; i < valid.length; i++) for (let j = i + 1; j < valid.length; j++) {
    const a = valid[i], b = valid[j];
    if (!a || !b) continue;
    // "redmean": aproximação barata e razoável da diferença percebida.
    const rm = (a[0] + b[0]) / 2;
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    const d = Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) / 3;
    if (d < threshold) pairs.push([i, j]);
  }
  return pairs;
}

// ─── Estilos prontos ─────────────────────────────────────────────────────────

export const BRAND_PRESETS: { key: string; label: string; description: string; brand: DashboardBrand }[] = [
  {
    key: "confluencia", label: "Confluência", description: "Verde institucional e dourado, serifa editorial — o padrão do Dataº.",
    brand: { accent: "#3b5d42", secondary: "#8c5c18", headingFont: "source-serif", bodyFont: "inter", header: "editorial", pattern: "roots", card: "bordered", radius: 12, density: "normal", widgetTitle: "default", showBand: true,
      palette: ["#3b5d42", "#b9812f", "#a85630", "#2a7680", "#5c4fa8", "#7a8b3c", "#c48a42", "#4a4033"] },
  },
  {
    key: "raizes", label: "Raízes", description: "Terracota e argila, cabeçalho em faixa cheia, cartões sem borda.",
    brand: { accent: "#a85630", secondary: "#3b5d42", background: "#f7efe4", headingFont: "lora", bodyFont: "work-sans", header: "banner", pattern: "contour", card: "flat", radius: 16, density: "airy", widgetTitle: "serif", showBand: true,
      palette: ["#a85630", "#3b5d42", "#c48a42", "#7a3b22", "#6f8f5a", "#d9a36a", "#4a4033"] },
  },
  {
    key: "institucional", label: "Institucional", description: "Azul sóbrio, tipografia técnica, cantos retos — relatório de órgão público.",
    brand: { accent: "#1f4e8c", secondary: "#8a5a12", background: "#f5f7fa", headingFont: "ibm-plex-sans", bodyFont: "ibm-plex-sans", header: "minimal", pattern: "grid", card: "bordered", radius: 6, density: "compact", widgetTitle: "kicker", showBand: true,
      palette: ["#1f4e8c", "#d08c2c", "#2f8f83", "#8c3b5e", "#5a6b8c", "#9aa83a", "#173b6b"] },
  },
  {
    key: "editorial", label: "Editorial", description: "Preto e vermelho de jornal, título centralizado e grande.",
    brand: { accent: "#b3261e", secondary: "#6b5a3e", background: "#fbfaf7", headingFont: "playfair", bodyFont: "source-sans", header: "centered", pattern: "none", card: "outline", radius: 0, density: "normal", widgetTitle: "kicker", showBand: false,
      palette: ["#1d1d1b", "#b3261e", "#8c8579", "#d9a441", "#3f5f73", "#c9c2b4"] },
  },
  {
    key: "territorio", label: "Território", description: "Verde-mata e ocre, títulos expressivos, destaque no topo dos cartões.",
    brand: { accent: "#24382a", secondary: "#9a6420", background: "#f3f1e8", headingFont: "fraunces", bodyFont: "nunito-sans", header: "banner", pattern: "roots", card: "accent-top", radius: 10, density: "normal", widgetTitle: "default", showBand: true,
      palette: ["#24382a", "#c48a42", "#5f8a66", "#8c4a2a", "#b8c98a", "#3e6b74", "#7a8b3c"] },
  },
  {
    key: "acessivel", label: "Acessível", description: "Alto contraste, fonte para baixa visão, valores escritos nos gráficos.",
    brand: { accent: "#0b3d91", secondary: "#7a4b00", background: "#ffffff", headingFont: "atkinson", bodyFont: "atkinson", header: "minimal", pattern: "none", card: "bordered", radius: 8, density: "airy", widgetTitle: "default", showBand: true,
      chart: { dataLabels: true, gridlines: true, barRadius: 2 },
      // Okabe-Ito: paleta testada para os tipos mais comuns de daltonismo.
      palette: ["#0072b2", "#e69f00", "#009e73", "#cc79a7", "#56b4e9", "#d55e00", "#000000"] },
  },
];
