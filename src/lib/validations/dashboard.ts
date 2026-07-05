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
