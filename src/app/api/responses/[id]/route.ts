import { db } from "@/lib/db";
import { formFields, responses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getRequestUserId } from "@/lib/auth/device";
import { apiSuccess, apiError } from "@/lib/utils";
import { getResearchAccess, canEdit } from "@/lib/researches/access";
import { z } from "zod";

// Atualiza UMA chave dentro do `data` (jsonb) de uma resposta já salva,
// sem mexer no resto. Uso atual: o syncWorker do app de campo troca o
// placeholder local de mídia ({ localMediaId, pending: true }) pela URL
// real do blob depois do upload — a resposta em si já subiu antes, na
// fila de respostas.
//
// jsonb aceita qualquer valor JSON, então não há migração envolvida.
// A escrita é read-modify-write simples (não jsonb_set): o app é o único
// escritor dessa chave e cada mídia toca uma chave própria — colisão real
// exigiria dois PATCHes simultâneos no MESMO campo, cenário que não existe
// no fluxo atual.

const patchSchema = z.object({
  fieldId: z.string().uuid(),
  value:   z.unknown(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Token de dispositivo (app de campo) ou cookie de sessão (site).
  const userId = await getRequestUserId(request);
  if (!userId) return apiError("Não autorizado", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Corpo da requisição inválido", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  if (typeof body !== "object" || body === null || !("value" in body)) {
    return apiError("value é obrigatório", 422);
  }
  const { fieldId, value } = parsed.data;

  const response = await db.query.responses.findFirst({
    where: eq(responses.id, id),
    columns: { id: true, formId: true, respondentId: true, data: true, researchId: true },
  });
  if (!response) return apiError("Resposta não encontrada", 404);
  if (response.respondentId !== userId) {
    const access = await getResearchAccess(response.researchId, userId);
    if (!access || !canEdit(access.role)) return apiError("Sem permissão sobre esta resposta", 403);
  }

  // Só aceita chave que corresponda a um campo real do formulário da resposta
  // — evita poluir o jsonb com chaves órfãs.
  const field = await db.query.formFields.findFirst({
    where: and(eq(formFields.id, fieldId), eq(formFields.formId, response.formId)),
    columns: { id: true },
  });
  if (!field) return apiError("Campo não encontrado neste formulário", 404);

  const current = (response.data ?? {}) as Record<string, unknown>;
  await db.update(responses)
    .set({ data: { ...current, [fieldId]: value } })
    .where(eq(responses.id, id));

  return apiSuccess({ id, fieldId });
}
