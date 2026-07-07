import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getResearchAccess } from "@/lib/researches/access";
import { updateMemberRoleSchema } from "@/lib/validations/research-team";
import { apiSuccess, apiError } from "@/lib/utils";

// PATCH — troca o papel de um membro. Só o dono.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);
  if (access.role !== "owner") return apiError("Só o dono pode alterar o papel de um membro", 403);

  const body = await request.json();
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [updated] = await db
    .update(researchMembers)
    .set({ role: parsed.data.role })
    .where(and(eq(researchMembers.id, memberId), eq(researchMembers.researchId, id)))
    .returning();

  if (!updated) return apiError("Membro não encontrado", 404);
  return apiSuccess(updated);
}

// DELETE — remove um membro da equipe. Só o dono.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);
  if (access.role !== "owner") return apiError("Só o dono pode remover um membro", 403);

  await db.delete(researchMembers).where(and(eq(researchMembers.id, memberId), eq(researchMembers.researchId, id)));
  return apiSuccess({ id: memberId });
}
