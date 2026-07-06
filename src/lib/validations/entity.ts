import { z } from "zod";
import { normalizeBoundaryGeo } from "@/lib/entities/geo-format";

export const entityTypeValues = [
  "territorio", "comunidade", "escola", "associacao", "projeto", "documento",
  "regiao_administrativa", "pessoa",
] as const;

// Tipos que usam a captação "Organização / entidade jurídica" (documento público).
export const ORG_DOCUMENT_TYPES = ["escola", "associacao", "projeto"] as const;

export const documentTypeValues = ["cnpj", "cnes", "inep", "outro"] as const;
export const personKindValues   = ["publica_historica", "comum"] as const;

const municipalityInput = z.object({
  stateCode: z.string().length(2),
  cityCode:  z.string().max(10),
  cityName:  z.string().max(200),
});

const adminDivisionInput = z.object({
  name:   z.string().min(2, "Mínimo 2 caracteres").max(300),
  cities: z.array(municipalityInput).min(1, "Cada divisão precisa de ao menos um município"),
});

const baseEntityFields = z.object({
  type:        z.enum(entityTypeValues),
  name:        z.string().min(3, "Mínimo 3 caracteres").max(500),
  description: z.string().max(2000).optional(),
  stateCode:   z.string().length(2).optional(),
  cityCode:    z.string().max(10).optional(),
  cityName:    z.string().max(200).optional(),
  latitude:    z.string().optional(),
  longitude:   z.string().optional(),
  // Território como FeatureCollection real (ponto/linha/polígono, um ou mais
  // por entidade) — aceita também o array antigo {lat,lng}[] de entidades
  // criadas antes desta mudança, tudo normalizado pro formato novo antes de
  // guardar (ver normalizeBoundaryGeo em src/lib/entities/geo-format.ts).
  // Vazio = sem território marcado / limpa o que existia.
  boundaryPolygon: z.union([
    z.object({
      type:     z.literal("FeatureCollection"),
      features: z.array(z.object({
        type:       z.literal("Feature"),
        properties: z.record(z.string(), z.unknown()).nullable().optional(),
        geometry:   z.object({
          type:        z.enum(["Point", "LineString", "Polygon", "MultiPolygon"]),
          coordinates: z.any(),
        }),
      })),
    }),
    z.array(z.object({ lat: z.number(), lng: z.number() })),
  ])
    .transform(raw => normalizeBoundaryGeo(raw))
    .optional(),

  // Território / comunidade: municípios adicionais além do stateCode/cityCode principal.
  municipalities: z.array(municipalityInput).optional(),

  // Região administrativa: divisões nomeadas, cada uma com seus municípios.
  adminDivisions: z.array(adminDivisionInput).optional(),

  // Organização / entidade jurídica: documento público.
  documentType:    z.enum(documentTypeValues).optional(),
  documentNumber:  z.string().max(30).optional(),
  officialAddress: z.record(z.string(), z.unknown()).optional(),

  // Pessoa: figura pública/histórica x pessoa comum.
  personKind: z.enum(personKindValues).optional(),
});

export const createEntitySchema = baseEntityFields.superRefine((data, ctx) => {
  if (data.type === "regiao_administrativa" && (!data.adminDivisions || data.adminDivisions.length === 0)) {
    ctx.addIssue({ code: "custom", message: "Adicione ao menos uma divisão com municípios", path: ["adminDivisions"] });
  }

  if ((ORG_DOCUMENT_TYPES as readonly string[]).includes(data.type) && (!data.documentType || !data.documentNumber)) {
    ctx.addIssue({ code: "custom", message: "Informe o documento público (tipo e número)", path: ["documentNumber"] });
  }

  if (data.type === "pessoa" && !data.personKind) {
    ctx.addIssue({ code: "custom", message: "Selecione se é figura pública/histórica ou pessoa comum", path: ["personKind"] });
  }

  if (data.type === "pessoa" && data.personKind === "comum") {
    ctx.addIssue({
      code: "custom",
      message: "Pessoa comum não pode ser cadastrada por terceiros — gere um convite de autocadastro",
      path: ["personKind"],
    });
  }
});

export const updateEntitySchema = baseEntityFields.omit({ type: true }).partial().extend({
  status:     z.enum(["draft","published","archived"]).optional(),
  changeNote: z.string().max(500).optional(),
  // Detecção de conflito offline: a versão de entityVersions que o cliente
  // tinha quando começou a editar. Se outra pessoa salvou no meio tempo, o
  // PATCH devolve 409 com a entidade atual completa (o cliente decide como
  // mesclar). Opcional por compatibilidade — quem chama sem isso hoje (site)
  // continua com o comportamento antigo de "último salvamento vence".
  baseVersion: z.number().int().optional(),
});

export const linkResearchEntitySchema = z.object({
  entityId:     z.string().uuid(),
  relationNote: z.string().max(500).optional(),
});

export const createPersonInviteSchema = z.object({
  suggestedName: z.string().max(500).optional(),
  contact:       z.string().max(255).optional(),
  researchId:    z.string().uuid().optional(),
});

export const acceptPersonInviteSchema = z.object({
  name:        z.string().min(3, "Mínimo 3 caracteres").max(500),
  description: z.string().max(2000).optional(),
  stateCode:   z.string().length(2).optional(),
  cityCode:    z.string().max(10).optional(),
  cityName:    z.string().max(200).optional(),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
export type LinkResearchEntityInput = z.infer<typeof linkResearchEntitySchema>;
export type CreatePersonInviteInput = z.infer<typeof createPersonInviteSchema>;
export type AcceptPersonInviteInput = z.infer<typeof acceptPersonInviteSchema>;
