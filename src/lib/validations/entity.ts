import { z } from "zod";

export const entityTypeValues = ["territorio","comunidade","escola","associacao","projeto","documento"] as const;

export const createEntitySchema = z.object({
  type:        z.enum(entityTypeValues),
  name:        z.string().min(3, "Mínimo 3 caracteres").max(500),
  description: z.string().max(2000).optional(),
  stateCode:   z.string().length(2).optional(),
  cityCode:    z.string().max(10).optional(),
  cityName:    z.string().max(200).optional(),
  latitude:    z.string().optional(),
  longitude:   z.string().optional(),
});

export const updateEntitySchema = createEntitySchema.omit({ type: true }).partial().extend({
  status:     z.enum(["draft","published","archived"]).optional(),
  changeNote: z.string().max(500).optional(),
});

export const linkResearchEntitySchema = z.object({
  entityId:     z.string().uuid(),
  relationNote: z.string().max(500).optional(),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
export type LinkResearchEntityInput = z.infer<typeof linkResearchEntitySchema>;
