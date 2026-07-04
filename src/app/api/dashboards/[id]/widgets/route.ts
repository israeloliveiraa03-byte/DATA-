import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets, researches } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { saveWidgetsSchema } from "@/lib/validations/dashboard";
import { apiSuccess, apiError } from "@/lib/utils";

async function assertOwner(dashboardId: string, userId: string) {
  const dashboard = await db.query.dashboards.findFirst({ where: eq(dashboards.id, dashboardId) });
  if (!dashboard) return apiError("Dashboard não encontrado", 404);
  const research = await db.query.researches.findFirst({ where: eq(researches.id, dashboard.researchId) });
  if (!research || research.ownerId !== userId) return apiError("Sem permissão", 403);
  return null;
}

// Salva a lista inteira de widgets do dashboard (apaga e recria, mesmo padrão do form-builder).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const deniedResponse = await assertOwner(id, session.user.id);
  if (deniedResponse) return deniedResponse;

  const body = await request.json();
  const parsed = saveWidgetsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  await db.delete(dashboardWidgets).where(eq(dashboardWidgets.dashboardId, id));

  if (parsed.data.widgets.length > 0) {
    await db.insert(dashboardWidgets).values(
      parsed.data.widgets.map((widget, idx) => ({
        dashboardId: id,
        type:        widget.type,
        title:       widget.title,
        x:           widget.x,
        y:           widget.y,
        w:           widget.w,
        h:           widget.h,
        config:      widget.config,
        order:       widget.order ?? idx,
      }))
    );
  }

  await db.update(dashboards).set({ updatedAt: new Date() }).where(eq(dashboards.id, id));

  const widgets = await db.query.dashboardWidgets.findMany({
    where: eq(dashboardWidgets.dashboardId, id),
    orderBy: asc(dashboardWidgets.order),
  });

  return apiSuccess(widgets);
}
