import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { technicalNotes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createNoteSchema } from "@/lib/validations/technical-note";
import { apiSuccess, apiError } from "@/lib/utils";

// GET — só as próprias notas do usuário logado (públicas e privadas).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const notes = await db.query.technicalNotes.findMany({
    where: eq(technicalNotes.authorId, session.user.id),
    orderBy: desc(technicalNotes.createdAt),
  });

  return apiSuccess(notes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [note] = await db.insert(technicalNotes).values({
    authorId:   session.user.id,
    title:      parsed.data.title,
    body:       parsed.data.body,
    tags:       parsed.data.tags,
    visibility: parsed.data.visibility,
    entityType: parsed.data.entityType,
    entityId:   parsed.data.entityId,
    researchId: parsed.data.researchId,
  }).returning();

  return apiSuccess(note);
}
