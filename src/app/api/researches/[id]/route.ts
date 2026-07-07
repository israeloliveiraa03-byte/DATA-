import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { getResearchAccess, canEdit } from "@/lib/researches/access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);

  return apiSuccess(access.research);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);
  if (!canEdit(access.role)) return apiError("Sem permissão de edição", 403);

  const body = await request.json();

  // Mudar o status (ex.: encerrar) é ação de zona de risco — só o dono.
  if (body.status !== undefined && access.role !== "owner") {
    return apiError("Só o dono da pesquisa pode encerrá-la", 403);
  }

  const [updated] = await db
    .update(researches)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(researches.id, id))
    .returning();

  return apiSuccess(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);
  if (access.role !== "owner") return apiError("Só o dono pode excluir a pesquisa", 403);

  await db
    .update(researches)
    .set({ deletedAt: new Date() })
    .where(eq(researches.id, id));

  return apiSuccess({ deleted: true });
}
