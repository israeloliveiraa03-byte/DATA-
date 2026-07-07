import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { researchEntities } from "@/lib/db/schema/entities";
import { eq, and, isNull } from "drizzle-orm";
import { linkResearchEntitySchema } from "@/lib/validations/entity";
import { apiSuccess, apiError } from "@/lib/utils";
import { getResearchAccess, canEdit } from "@/lib/researches/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Pesquisa não encontrada", 404);
  if (!canEdit(access.role)) return apiError("Sem permissão de edição", 403);

  const body = await request.json();
  const parsed = linkResearchEntitySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, parsed.data.entityId), isNull(entities.deletedAt)),
  });
  if (!entity) return apiError("Entidade não encontrada", 404);

  try {
    const [link] = await db
      .insert(researchEntities)
      .values({
        researchId:   id,
        entityId:     parsed.data.entityId,
        relationNote: parsed.data.relationNote,
        linkedBy:     session.user.id,
      })
      .returning();
    return apiSuccess(link);
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return apiError("Esta entidade já está vinculada a esta pesquisa", 409);
    }
    throw err;
  }
}
