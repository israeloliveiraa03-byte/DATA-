import { z } from "zod";

// Só os tipos com motor de agregação implementado em src/lib/dashboard/aggregate.ts
// (todos já existem no enum widget_type do banco — line_chart estava lá desde
// o início, só faltava cálculo e editor, implementados em 2026-07-04).
export const supportedWidgetTypeValues = [
  "number_card", "bar_chart", "line_chart", "pie_chart", "donut_chart", "table", "text", "map", "heatmap", "image", "crosstab", "globe",
] as const;

export const createDashboardSchema = z.object({
  title: z.string().min(2, "Mínimo 2 caracteres").max(500),
});

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");

// Identidade visual do painel (ver src/lib/dashboard/brand.ts). Guardada
// dentro do jsonb `layout` — o PATCH substitui `layout.brand` inteiro.
export const brandSchema = z.object({
  preset:       z.string().max(40).optional(),
  accent:       hex.optional(),
  secondary:    hex.optional(),
  palette:      z.array(hex).max(10).optional(),
  background:   hex.optional(),
  headingFont:  z.string().max(40).optional(),
  bodyFont:     z.string().max(40).optional(),
  // Logo redimensionada no navegador (máx. 480px) — limite folgado.
  logoUrl:      z.string().max(700000).regex(/^data:image\/(png|jpeg|webp|svg\+xml);base64,/, "Logo inválida").optional(),
  organization: z.string().max(120).optional(),
  showBand:     z.boolean().optional(),
  header:       z.enum(["editorial", "banner", "centered", "minimal"]).optional(),
  pattern:      z.enum(["roots", "contour", "dots", "grid", "none"]).optional(),
  card:         z.enum(["bordered", "elevated", "flat", "outline", "accent-top"]).optional(),
  radius:       z.number().min(0).max(28).optional(),
  density:      z.enum(["compact", "normal", "airy"]).optional(),
  widgetTitle:  z.enum(["default", "kicker", "serif"]).optional(),
  sourceNote:   z.string().max(200).optional(),
  footerNote:   z.string().max(300).optional(),
  showFooterInfo: z.boolean().optional(),
  links:        z.array(z.object({ label: z.string().min(1).max(60), url: z.string().url().max(400).regex(/^https?:\/\//) })).max(4).optional(),
  chart:        z.object({
    gridlines:  z.boolean().optional(),
    dataLabels: z.boolean().optional(),
    barRadius:  z.number().min(0).max(16).optional(),
  }).optional(),
});

export const updateDashboardSchema = z.object({
  title:       z.string().min(2).max(500).optional(),
  description: z.string().max(2000).optional(),
  isPublic:    z.boolean().optional(),
  theme:       z.string().max(50).optional(),
  // Imagem de fundo customizada guardada como base64 (mesmo padrão de capa de
  // pesquisa/perfil) — limite generoso o bastante pra uma imagem comprimida
  // (redimensionada no cliente antes de enviar, ver dashboard-builder-client.tsx).
  coverUrl:    z.string().max(3000000).nullable().optional(),
  colorPalette: z.string().max(50).optional(),
  // Cor de fundo do canvas de widgets — guardada dentro do jsonb `layout`
  // (nenhuma coluna nova). O PATCH mescla no layout existente; null remove.
  canvasColor: z.string().max(50).nullable().optional(),
  // null remove a identidade (volta ao visual padrão do Dataº).
  brand: brandSchema.nullable().optional(),
});

// Grade livre (não mais célula de 12 colunas): x/w em % da largura do
// canvas, y/h em pixels — contínuos, sem limite de "11 colunas".
const widgetInput = z.object({
  id:     z.string().uuid().optional(),
  type:   z.enum(supportedWidgetTypeValues),
  title:  z.string().max(300).optional(),
  x:      z.number().min(0).default(0),
  y:      z.number().min(0).default(0),
  w:      z.number().min(1).default(33),
  h:      z.number().min(1).default(96),
  config: z.record(z.string(), z.unknown()).default({}),
  order:  z.number().int().default(0),
});

export const saveWidgetsSchema = z.object({
  widgets: z.array(widgetInput),
});

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>;
export type SaveWidgetsInput     = z.infer<typeof saveWidgetsSchema>;
