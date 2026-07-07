import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collaborationCalls, collaborationApplications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateApplicationSchema } from "@/lib/validations/collaboration";
import { apiSuccess, apiError } from "@/lib/utils";

// PATCH — aceitar/recusar uma candidatura. Só quem criou a chamada.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const { id, appId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const call = await db.query.collaborationCalls.findFirst({ where: eq(collaborationCalls.id, id) });
  if (!call) return apiError("Chamada não encontrada", 404);
  if (call.createdBy !== session.user.id) return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = updateApplicationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [updated] = await db
    .update(collaborationApplications)
    .set({ status: parsed.data.status })
    .where(and(eq(collaborationApplications.id, appId), eq(collaborationApplications.callId, id)))
    .returning();

  if (!updated) return apiError("Candidatura não encontrada", 404);

  // Fase 4 (Rede) hooka aqui: aceitar candidatura de fieldwork/expertise
  // ligada a uma pesquisa gera convite automático de Equipe de pesquisa.

  return apiSuccess(updated);
}
