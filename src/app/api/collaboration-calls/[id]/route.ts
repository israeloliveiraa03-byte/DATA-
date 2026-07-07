import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collaborationCalls } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateCallStatusSchema } from "@/lib/validations/collaboration";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const call = await db.query.collaborationCalls.findFirst({ where: eq(collaborationCalls.id, id) });
  if (!call) return apiError("Chamada não encontrada", 404);
  if (call.createdBy !== session.user.id) return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = updateCallStatusSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [updated] = await db
    .update(collaborationCalls)
    .set({ status: parsed.data.status })
    .where(eq(collaborationCalls.id, id))
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

  const call = await db.query.collaborationCalls.findFirst({ where: eq(collaborationCalls.id, id) });
  if (!call) return apiError("Chamada não encontrada", 404);
  if (call.createdBy !== session.user.id) return apiError("Sem permissão", 403);

  await db.delete(collaborationCalls).where(eq(collaborationCalls.id, id));
  return apiSuccess({ id });
}
