import { db } from "@/lib/db";
import { forms, responses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDeviceTokenUserId } from "@/lib/auth/device";
import { after } from "next/server";
import { apiSuccess, apiError } from "@/lib/utils";
import { checkAndNotifyReliability } from "@/lib/dashboard/reliability";
import { z } from "zod";

// Cada item segue o mesmo formato do endpoint singular
// (POST /api/forms/[id]/responses), mais o formId — que lá vem da URL e aqui
// precisa vir no corpo, já que um lote pode misturar formulários diferentes.
// O `id` é obrigatório: é ele que garante a idempotência do reenvio.
const itemSchema = z.object({
  id:               z.string().uuid(),
  formId:           z.string().uuid(),
  data:             z.record(z.unknown()),
  collectedOffline: z.boolean().default(true),
  latitude:         z.string().optional(),
  longitude:        z.string().optional(),
});

const batchSchema = z.object({
  responses: z.array(itemSchema).min(1).max(500),
});

type ItemResult = { id: string; status: "created" | "duplicate" | "error"; error?: string };

/**
 * Sincronização em lote do app de campo: recebe um array de respostas
 * pendentes de uma vez (em vez de um fetch por resposta) e processa cada uma
 * com o mesmo padrão idempotente do endpoint singular (onConflictDoNothing).
 * Um item com erro não derruba o lote — o resultado volta item a item.
 *
 * Autenticação: token de dispositivo (Authorization: Bearer, app Capacitor)
 * ou cookie de sessão NextAuth (fila offline do próprio site).
 */
export async function POST(request: Request) {
  let userId = await getDeviceTokenUserId(request);
  if (!userId) {
    const session = await auth();
    userId = session?.user?.id ?? null;
  }
  if (!userId) return apiError("Não autorizado", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Corpo da requisição inválido", 400);
  }

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  // Cache de formulários do lote — evita repetir a mesma query quando o lote
  // inteiro (o caso comum) é de um único formulário.
  const formCache = new Map<string, { id: string; researchId: string } | null>();
  async function getForm(formId: string) {
    if (!formCache.has(formId)) {
      const form = await db.query.forms.findFirst({
        where: eq(forms.id, formId),
        columns: { id: true, researchId: true },
      });
      formCache.set(formId, form ?? null);
    }
    return formCache.get(formId) ?? null;
  }

  const results: ItemResult[] = [];
  // Pesquisas que ganharam resposta nova de verdade — a checagem de
  // confiabilidade roda uma vez por pesquisa, não uma vez por resposta.
  const researchesWithNew = new Set<string>();

  for (const item of parsed.data.responses) {
    try {
      const form = await getForm(item.formId);
      if (!form) {
        results.push({ id: item.id, status: "error", error: "Formulário não encontrado" });
        continue;
      }

      const [inserted] = await db.insert(responses).values({
        id:               item.id,
        formId:           form.id,
        researchId:       form.researchId,
        respondentId:     userId,
        data:             item.data,
        collectedOffline: item.collectedOffline,
        latitude:         item.latitude ?? null,
        longitude:        item.longitude ?? null,
        completed:        true,
        submittedAt:      new Date(),
        syncedAt:         item.collectedOffline ? new Date() : null,
      })
        .onConflictDoNothing({ target: responses.id })
        .returning({ id: responses.id });

      if (inserted) {
        results.push({ id: item.id, status: "created" });
        researchesWithNew.add(form.researchId);
      } else {
        // O id já existia (reenvio depois de falha de rede) — não é erro,
        // é confirmação de que já está salvo.
        results.push({ id: item.id, status: "duplicate" });
      }
    } catch (err) {
      console.error("Falha ao sincronizar resposta", item.id, err);
      results.push({ id: item.id, status: "error", error: "Falha ao gravar a resposta" });
    }
  }

  if (researchesWithNew.size > 0) {
    after(async () => {
      for (const researchId of researchesWithNew) {
        await checkAndNotifyReliability(researchId);
      }
    });
  }

  return apiSuccess({ results });
}
