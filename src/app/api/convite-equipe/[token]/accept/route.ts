import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchMemberInvites, researchMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

// Exige login (mesma leniência do convite de pessoa/entidade: qualquer conta
// Google que tiver o link aceita, sem checagem de e-mail exato).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Entre com sua conta para aceitar o convite", 401);

  const invite = await db.query.researchMemberInvites.findFirst({
    where: eq(researchMemberInvites.token, token),
  });
  if (!invite) return apiError("Convite não encontrado", 404);
  if (invite.status !== "pending") return apiError("Este convite já foi utilizado ou não está mais válido", 410);
  if (invite.expiresAt < new Date()) return apiError("Este convite expirou", 410);

  await db.insert(researchMembers).values({
    researchId: invite.researchId,
    userId:     session.user.id,
    role:       invite.role,
    invitedBy:  invite.invitedBy,
  }).onConflictDoUpdate({
    target: [researchMembers.researchId, researchMembers.userId],
    set:    { role: invite.role },
  });

  await db.update(researchMemberInvites)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(researchMemberInvites.id, invite.id));

  return apiSuccess({ researchId: invite.researchId });
}
