import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/utils";

const schema = z.object({ locationDisclosure: z.enum(["hidden", "approximate", "exact"]) });

// PATCH — nível de exposição da entidade no Mapa Geral. Separado do PATCH
// geral de /api/entities/[id] (que hoje não checa dono nenhum) porque essa
// decisão específica só pode ser de quem criou a entidade.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const entity = await db.query.entities.findFirst({ where: eq(entities.id, id) });
  if (!entity) return apiError("Entidade não encontrada", 404);
  if (entity.createdBy !== session.user.id) return apiError("Só quem criou a entidade pode mudar isso", 403);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [updated] = await db
    .update(entities)
    .set({ locationDisclosure: parsed.data.locationDisclosure, updatedAt: new Date() })
    .where(eq(entities.id, id))
    .returning();

  return apiSuccess(updated);
}
