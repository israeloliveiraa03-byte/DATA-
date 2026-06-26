import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research)                               return apiError("Não encontrada", 404);
  if (research.ownerId !== session.user.id)    return apiError("Sem permissão", 403);

  return apiSuccess(research);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research)                               return apiError("Não encontrada", 404);
  if (research.ownerId !== session.user.id)    return apiError("Sem permissão", 403);

  const body = await request.json();

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

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research)                               return apiError("Não encontrada", 404);
  if (research.ownerId !== session.user.id)    return apiError("Sem permissão", 403);

  await db
    .update(researches)
    .set({ deletedAt: new Date() })
    .where(eq(researches.id, id));

  return apiSuccess({ deleted: true });
}
