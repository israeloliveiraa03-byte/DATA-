import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collaborationCalls, collaborationApplications, researchMemberInvites, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateApplicationSchema } from "@/lib/validations/collaboration";
import { apiSuccess, apiError } from "@/lib/utils";

const FIELDWORK_LIKE_KINDS = ["fieldwork", "expertise"];

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

  // Aceitar candidatura de campo/expertise ligada a uma pesquisa vira convite
  // automático de Equipe de pesquisa — colaborar vira fazer parte do time
  // num clique só, reaproveitando research_member_invites em vez de inventar
  // outro mecanismo. Quem cria a chamada já provou ter edição na pesquisa
  // (regra do POST /api/collaboration-calls), então o convite sai mesmo que
  // essa pessoa seja só editora, não dona.
  let teamInvite: { token: string; researchId: string } | null = null;
  if (parsed.data.status === "accepted" && call.researchId && FIELDWORK_LIKE_KINDS.includes(call.kind)) {
    const applicant = await db.query.users.findFirst({
      where: eq(users.id, updated.applicantId),
      columns: { email: true },
    });
    if (applicant) {
      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
      await db.insert(researchMemberInvites).values({
        token,
        researchId: call.researchId,
        email:      applicant.email,
        role:       "editor",
        invitedBy:  session.user.id,
        expiresAt,
      });
      teamInvite = { token, researchId: call.researchId };
    }
  }

  return apiSuccess({ ...updated, teamInvite });
}
