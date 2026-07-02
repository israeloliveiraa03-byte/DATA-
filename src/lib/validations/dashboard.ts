import { z } from "zod";

// Só os tipos com motor de agregação implementado em src/lib/dashboard/aggregate.ts
// (o widget_type do banco tem mais opções — line_chart, map, image, heatmap — que
// ainda não têm cálculo nem editor; ficam de fora daqui até serem implementados).
export const supportedWidgetTypeValues = [
  "number_card", "bar_chart", "pie_chart", "donut_chart", "table", "text",
] as const;

export const createDashboardSchema = z.object({
  title: z.string().min(2, "Mínimo 2 caracteres").max(500),
});

export const updateDashboardSchema = z.object({
  title:       z.string().min(2).max(500).optional(),
  description: z.string().max(2000).optional(),
  isPublic:    z.boolean().optional(),
  theme:       z.string().max(50).optional(),
  coverUrl:    z.string().max(2000).optional(),
});

const widgetInput = z.object({
  id:     z.string().uuid().optional(),
  type:   z.enum(supportedWidgetTypeValues),
  title:  z.string().max(300).optional(),
  col:    z.number().int().min(0).max(11).default(0),
  row:    z.number().int().min(0).default(0),
  width:  z.number().int().min(1).max(12).default(4),
  height: z.number().int().min(1).max(20).default(3),
  config: z.record(z.string(), z.unknown()).default({}),
  order:  z.number().int().default(0),
});

export const saveWidgetsSchema = z.object({
  widgets: z.array(widgetInput),
});

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>;
export type SaveWidgetsInput     = z.infer<typeof saveWidgetsSchema>;
