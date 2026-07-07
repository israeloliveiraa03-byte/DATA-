import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { technicalNotes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateNoteSchema } from "@/lib/validations/technical-note";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const note = await db.query.technicalNotes.findFirst({ where: eq(technicalNotes.id, id) });
  if (!note) return apiError("Nota não encontrada", 404);
  if (note.authorId !== session.user.id) return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [updated] = await db
    .update(technicalNotes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(technicalNotes.id, id))
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

  const note = await db.query.technicalNotes.findFirst({ where: eq(technicalNotes.id, id) });
  if (!note) return apiError("Nota não encontrada", 404);
  if (note.authorId !== session.user.id) return apiError("Sem permissão", 403);

  await db.delete(technicalNotes).where(eq(technicalNotes.id, id));
  return apiSuccess({ id });
}
