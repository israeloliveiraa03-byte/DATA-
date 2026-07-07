import { z } from "zod";

export const collaborationKindValues   = ["fieldwork", "data_gap", "expertise", "funding"] as const;
export const collaborationStatusValues = ["open", "fulfilled", "closed"] as const;
export const applicationStatusValues   = ["accepted", "declined"] as const;

export const createCallSchema = z.object({
  title:       z.string().min(3, "Mínimo 3 caracteres").max(500),
  description: z.string().min(1, "Descreva o que você precisa").max(5000),
  kind:        z.enum(collaborationKindValues),
  researchId:  z.string().uuid().optional(),
  entityId:    z.string().uuid().optional(),
});

export const updateCallStatusSchema = z.object({
  status: z.enum(collaborationStatusValues),
});

export const applySchema = z.object({
  message: z.string().max(2000).optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(applicationStatusValues),
});
