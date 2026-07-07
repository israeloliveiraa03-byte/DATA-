import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { getResearchAccess, canEdit } from "@/lib/researches/access";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const dashboard = await db.query.dashboards.findFirst({ where: eq(dashboards.id, id) });
  if (!dashboard) return apiError("Dashboard não encontrado", 404);

  const access = await getResearchAccess(dashboard.researchId, session.user.id);
  if (!access || !canEdit(access.role)) return apiError("Sem permissão", 403);

  const widgets = await db.query.dashboardWidgets.findMany({ where: eq(dashboardWidgets.dashboardId, id) });

  const [copy] = await db.insert(dashboards).values({
    researchId:  dashboard.researchId,
    title:       `${dashboard.title} (cópia)`,
    description: dashboard.description,
    layout:      dashboard.layout,
    theme:       dashboard.theme,
    colorPalette: dashboard.colorPalette,
    // isPublic/publicSlug propositalmente não copiados — a cópia nasce despublicada.
  }).returning();

  if (widgets.length > 0) {
    await db.insert(dashboardWidgets).values(
      widgets.map(widget => ({
        dashboardId: copy.id,
        type:        widget.type,
        title:       widget.title,
        x:           widget.x,
        y:           widget.y,
        w:           widget.w,
        h:           widget.h,
        config:      widget.config,
        order:       widget.order,
      }))
    );
  }

  return apiSuccess(copy);
}
