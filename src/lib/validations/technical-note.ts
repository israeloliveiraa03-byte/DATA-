import { z } from "zod";
import { entityTypeValues } from "./entity";

export const noteVisibilityValues = ["public", "private"] as const;

export const createNoteSchema = z.object({
  title:      z.string().min(3, "Mínimo 3 caracteres").max(500),
  body:       z.string().min(1, "Escreva o conteúdo da nota").max(20000),
  tags:       z.array(z.string().max(50)).max(20).optional().default([]),
  visibility: z.enum(noteVisibilityValues).optional().default("private"),
  entityType: z.enum(entityTypeValues).optional(),
  entityId:   z.string().uuid().optional(),
  researchId: z.string().uuid().optional(),
}).refine(d => !(d.entityType && d.entityId), {
  message: "Uma nota é geral (por tipo) OU específica (por entidade), nunca as duas",
  path: ["entityId"],
});

export const updateNoteSchema = z.object({
  title:      z.string().min(3, "Mínimo 3 caracteres").max(500).optional(),
  body:       z.string().min(1).max(20000).optional(),
  tags:       z.array(z.string().max(50)).max(20).optional(),
  visibility: z.enum(noteVisibilityValues).optional(),
});
