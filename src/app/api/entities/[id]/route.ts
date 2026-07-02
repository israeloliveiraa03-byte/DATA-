import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, entityVersions } from "@/lib/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { updateEntitySchema } from "@/lib/validations/entity";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, id), isNull(entities.deletedAt)),
  });

  if (!entity) return apiError("Não encontrada", 404);
  return apiSuccess(entity);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, id), isNull(entities.deletedAt)),
  });
  if (!entity) return apiError("Não encontrada", 404);

  const body = await request.json();
  const parsed = updateEntitySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const { changeNote, ...changes } = parsed.data;

  const [updated] = await db
    .update(entities)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(entities.id, id))
    .returning();

  const lastVersion = await db.query.entityVersions.findFirst({
    where: eq(entityVersions.entityId, id),
    orderBy: desc(entityVersions.version),
  });

  try {
    await db.insert(entityVersions).values({
      entityId:   id,
      version:    (lastVersion?.version ?? 0) + 1,
      snapshot:   updated,
      changeNote: changeNote ?? "Atualização da entidade",
      changedBy:  session.user.id,
    });
  } catch (err) {
    console.error("Falha ao gravar versão da entidade", id, err);
  }

  return apiSuccess(updated);
}
