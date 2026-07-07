import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { technicalNotes } from "@/lib/db/schema";
import { entityTypeValues } from "@/lib/validations/entity";
import { eq, and, desc } from "drizzle-orm";
import { apiSuccess } from "@/lib/utils";

// GET — notas públicas, opcionalmente filtradas por tipo de entidade ou
// entidade específica. Usada pela listagem global (/notas-tecnicas) e
// pelo card "Notas técnicas sobre esta entidade".
export async function GET(request: Request) {
  const session = await auth();

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId   = searchParams.get("entityId");

  const conditions = [eq(technicalNotes.visibility, "public")];
  if (entityType && (entityTypeValues as readonly string[]).includes(entityType)) {
    conditions.push(eq(technicalNotes.entityType, entityType as (typeof entityTypeValues)[number]));
  }
  if (entityId) conditions.push(eq(technicalNotes.entityId, entityId));

  const notes = await db.query.technicalNotes.findMany({
    where: and(...conditions),
    orderBy: desc(technicalNotes.createdAt),
    with: {
      author: { columns: { id: true, name: true, institution: true } },
      endorsements: { columns: { userId: true } },
    },
  });

  const userId = session?.user?.id;
  const shaped = notes.map(n => ({
    ...n,
    endorsementCount: n.endorsements.length,
    endorsedByMe: userId ? n.endorsements.some(e => e.userId === userId) : false,
    endorsements: undefined,
  }));

  return apiSuccess(shaped);
}
