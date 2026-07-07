import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { technicalNotes, technicalNoteEndorsements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

// POST — alterna o endosso (curtir/descurtir) de uma nota pública.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const note = await db.query.technicalNotes.findFirst({ where: eq(technicalNotes.id, id) });
  if (!note || note.visibility !== "public") return apiError("Nota não encontrada", 404);

  const existing = await db.query.technicalNoteEndorsements.findFirst({
    where: and(eq(technicalNoteEndorsements.noteId, id), eq(technicalNoteEndorsements.userId, session.user.id)),
  });

  if (existing) {
    await db.delete(technicalNoteEndorsements).where(eq(technicalNoteEndorsements.id, existing.id));
    return apiSuccess({ endorsed: false });
  }

  await db.insert(technicalNoteEndorsements).values({ noteId: id, userId: session.user.id });
  return apiSuccess({ endorsed: true });
}
