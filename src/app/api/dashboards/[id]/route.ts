import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets, researches } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { updateDashboardSchema } from "@/lib/validations/dashboard";
import { apiSuccess, apiError, slugify } from "@/lib/utils";

type OwnedDashboardResult =
  | { ok: true; dashboard: typeof dashboards.$inferSelect; research: typeof researches.$inferSelect }
  | { ok: false; error: Response };

async function loadOwnedDashboard(id: string, userId: string): Promise<OwnedDashboardResult> {
  const dashboard = await db.query.dashboards.findFirst({ where: eq(dashboards.id, id) });
  if (!dashboard) return { ok: false, error: apiError("Dashboard não encontrado", 404) };

  const research = await db.query.researches.findFirst({ where: eq(researches.id, dashboard.researchId) });
  if (!research || research.ownerId !== userId) return { ok: false, error: apiError("Sem permissão", 403) };

  return { ok: true, dashboard, research };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const result = await loadOwnedDashboard(id, session.user.id);
  if (!result.ok) return result.error;
  const { dashboard } = result;

  const widgets = await db.query.dashboardWidgets.findMany({
    where: eq(dashboardWidgets.dashboardId, id),
    orderBy: asc(dashboardWidgets.order),
  });

  return apiSuccess({ ...dashboard, widgets });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const result = await loadOwnedDashboard(id, session.user.id);
  if (!result.ok) return result.error;
  const { dashboard } = result;

  const body = await request.json();
  const parsed = updateDashboardSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const { canvasColor, ...rest } = parsed.data;
  const changes: typeof rest & { publicSlug?: string; layout?: unknown } = { ...rest };

  // canvasColor mora dentro do jsonb `layout` (sem coluna nova) — mescla com
  // o que já existe pra não perder outras chaves; null remove a cor.
  if (canvasColor !== undefined) {
    const currentLayout = (dashboard.layout ?? {}) as Record<string, unknown>;
    if (canvasColor === null) {
      const { canvasColor: _removed, ...restLayout } = currentLayout;
      void _removed;
      changes.layout = restLayout;
    } else {
      changes.layout = { ...currentLayout, canvasColor };
    }
  }

  // Ao publicar pela primeira vez, gera o slug público (permanece o mesmo depois).
  if (parsed.data.isPublic && !dashboard.publicSlug) {
    changes.publicSlug = `${slugify(parsed.data.title ?? dashboard.title)}-${Date.now().toString(36)}`;
  }

  const [updated] = await db
    .update(dashboards)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(dashboards.id, id))
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

  const result = await loadOwnedDashboard(id, session.user.id);
  if (!result.ok) return result.error;

  await db.delete(dashboards).where(eq(dashboards.id, id));
  return apiSuccess({ id });
}
