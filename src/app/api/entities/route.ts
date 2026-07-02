import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, entityVersions } from "@/lib/db/schema";
import { generateEntityCode } from "@/lib/db/entity-code";
import { desc, isNull } from "drizzle-orm";
import { createEntitySchema } from "@/lib/validations/entity";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const data = await db.query.entities.findMany({
    where: isNull(entities.deletedAt),
    orderBy: desc(entities.createdAt),
  });
  return apiSuccess(data);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = createEntitySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const code = await generateEntityCode(parsed.data.type);

  const [entity] = await db
    .insert(entities)
    .values({ ...parsed.data, code, createdBy: session.user.id })
    .returning();

  try {
    await db.insert(entityVersions).values({
      entityId:   entity.id,
      version:    1,
      snapshot:   entity,
      changeNote: "Criação da entidade",
      changedBy:  session.user.id,
    });
  } catch (err) {
    console.error("Falha ao gravar versão inicial da entidade", entity.id, err);
  }

  return apiSuccess(entity);
}
