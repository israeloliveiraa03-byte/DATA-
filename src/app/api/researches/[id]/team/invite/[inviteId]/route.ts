import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchMemberInvites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getResearchAccess } from "@/lib/researches/access";
import { apiSuccess, apiError } from "@/lib/utils";

// DELETE — revoga um convite pendente. Só o dono.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const { id, inviteId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);
  if (access.role !== "owner") return apiError("Só o dono pode revogar um convite", 403);

  const [updated] = await db
    .update(researchMemberInvites)
    .set({ status: "revoked" })
    .where(and(eq(researchMemberInvites.id, inviteId), eq(researchMemberInvites.researchId, id)))
    .returning();

  if (!updated) return apiError("Convite não encontrado", 404);
  return apiSuccess({ id: inviteId });
}
