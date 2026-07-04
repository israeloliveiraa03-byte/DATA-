import { db } from "@/lib/db";
import { forms, responses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { after } from "next/server";
import { apiSuccess, apiError } from "@/lib/utils";
import { checkAndNotifyReliability } from "@/lib/dashboard/reliability";
import { z } from "zod";

const submitSchema = z.object({
  // Gerado no cliente (app/hook offline) pra reenvio depois de falha de rede
  // nunca criar uma resposta duplicada — ver onConflictDoNothing abaixo.
  id: z.string().uuid().optional(),
  data: z.record(z.unknown()),
  collectedOffline: z.boolean().default(false),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id: formId } = await params;
  const form = await db.query.forms.findFirst({ where: eq(forms.id, formId) });
  if (!form) return apiError("Formulário não encontrado", 404);

  const session = await auth();
  const body = await request.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const { id: responseIdInput, data, collectedOffline, latitude, longitude } = parsed.data;
  const [inserted] = await db.insert(responses).values({
    ...(responseIdInput ? { id: responseIdInput } : {}),
    formId: form.id,
    researchId: form.researchId,
    respondentId: session?.user?.id ?? null,
    data,
    collectedOffline,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    completed: true,
    submittedAt: new Date(),
    syncedAt: collectedOffline ? new Date() : null,
  })
    // Reenvio depois de falha de rede manda o mesmo id de novo — não duplica,
    // só confirma que já está salvo (idempotência de verdade, não só no cliente).
    .onConflictDoNothing({ target: responses.id })
    .returning({ id: responses.id });

  // Se não veio nada de volta, o id já existia (reenvio) — não é erro, é sucesso repetido.
  const responseId = inserted?.id ?? responseIdInput;
  if (!responseId) return apiError("Não foi possível registrar a resposta", 500);

  // Só dispara a checagem de confiabilidade quando a resposta é realmente nova —
  // reenvio de um id já existente não deveria contar duas vezes.
  if (inserted) {
    // Roda depois da resposta já ter sido enviada pro cliente, mas garante que
    // a checagem termina de verdade (não é só um "dispara e esquece" que o
    // runtime serverless poderia cortar antes de terminar).
    after(() => checkAndNotifyReliability(form.researchId));
  }

  return apiSuccess({ id: responseId });
}
