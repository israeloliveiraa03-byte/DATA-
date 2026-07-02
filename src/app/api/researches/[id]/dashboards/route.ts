import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches, dashboards } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createDashboardSchema } from "@/lib/validations/dashboard";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const research = await db.query.researches.findFirst({ where: eq(researches.id, id) });
  if (!research)                            return apiError("Pesquisa não encontrada", 404);
  if (research.ownerId !== session.user.id) return apiError("Sem permissão", 403);

  const data = await db.query.dashboards.findMany({
    where: eq(dashboards.researchId, id),
    orderBy: desc(dashboards.createdAt),
  });

  return apiSuccess(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const research = await db.query.researches.findFirst({ where: eq(researches.id, id) });
  if (!research)                            return apiError("Pesquisa não encontrada", 404);
  if (research.ownerId !== session.user.id) return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = createDashboardSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [dashboard] = await db.insert(dashboards).values({
    researchId: id,
    title:      parsed.data.title,
  }).returning();

  return apiSuccess(dashboard);
}
