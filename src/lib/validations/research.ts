import { z } from "zod";

export const createResearchSchema = z.object({
  title:          z.string().min(5, "Mínimo 5 caracteres").max(500),
  description:    z.string().max(2000).optional(),
  theme:          z.enum(["health","education","environment","culture","economy","governance","territory","other"]),
  stateCode:      z.string().length(2).optional(),
  cityCode:       z.string().max(10).optional(),
  cityName:       z.string().max(200).optional(),
  allowAnonymous: z.boolean().default(true),
  collectGps:     z.boolean().default(false),
  offlineEnabled: z.boolean().default(true),
  responseLimit:  z.number().int().positive().optional(),
  closesAt:       z.coerce.date().optional(),
});

export const updateResearchSchema = createResearchSchema.partial();
export type CreateResearchInput = z.infer<typeof createResearchSchema>;
export type UpdateResearchInput = z.infer<typeof updateResearchSchema>;
