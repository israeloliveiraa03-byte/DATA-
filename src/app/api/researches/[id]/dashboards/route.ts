import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createDashboardSchema } from "@/lib/validations/dashboard";
import { apiSuccess, apiError } from "@/lib/utils";
import { getResearchAccess, canEdit } from "@/lib/researches/access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Pesquisa não encontrada", 404);

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

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Pesquisa não encontrada", 404);
  if (!canEdit(access.role)) return apiError("Sem permissão de edição", 403);

  const body = await request.json();
  const parsed = createDashboardSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [dashboard] = await db.insert(dashboards).values({
    researchId: id,
    title:      parsed.data.title,
  }).returning();

  return apiSuccess(dashboard);
}
