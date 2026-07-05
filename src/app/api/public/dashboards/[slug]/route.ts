import { db } from "@/lib/db";
import { dashboards, dashboardWidgets, researches, forms, formFields, responses, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { computeWidgetData, filterResponses } from "@/lib/dashboard/aggregate";
import type { SupportedWidgetType } from "@/lib/dashboard/types";

// Datas do filtro público chegam como query param — só aceita yyyy-mm-dd
// literal, qualquer outra coisa é ignorada (nunca erro: o dashboard abre
// sem filtro).
function parseDateParam(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(new Date(`${value}T00:00:00`).getTime()) ? undefined : value;
}

// Rota pública — nunca expõe respostas cruas, só o resultado já agregado por widget
// (mesmo o widget de tabela: os valores já vêm resolvidos, não a linha de resposta bruta).
// ?from/?to (yyyy-mm-dd) aplicam o filtro geral de data de resposta ANTES da
// agregação — o mesmo recorte pra todos os widgets, calculado no servidor
// (o navegador continua sem receber nenhuma resposta bruta).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const filter = {
    from: parseDateParam(url.searchParams.get("from")),
    to:   parseDateParam(url.searchParams.get("to")),
  };

  const dashboard = await db.query.dashboards.findFirst({
    where: and(eq(dashboards.publicSlug, slug), eq(dashboards.isPublic, true)),
  });
  if (!dashboard) return apiError("Dashboard não encontrado", 404);

  const research = await db.query.researches.findFirst({ where: eq(researches.id, dashboard.researchId) });
  if (!research) return apiError("Dashboard não encontrado", 404);

  const owner = await db.query.users.findFirst({ where: eq(users.id, research.ownerId) });

  const form = await db.query.forms.findFirst({ where: eq(forms.researchId, research.id) });
  const fields = form
    ? await db.query.formFields.findMany({ where: eq(formFields.formId, form.id), orderBy: asc(formFields.order) })
    : [];
  const allResponses = form
    ? filterResponses(await db.query.responses.findMany({ where: eq(responses.formId, form.id) }), filter)
    : [];

  const widgets = await db.query.dashboardWidgets.findMany({
    where: eq(dashboardWidgets.dashboardId, dashboard.id),
    orderBy: asc(dashboardWidgets.order),
  });

  const widgetsWithData = widgets.map(w => ({
    id: w.id, type: w.type as SupportedWidgetType, title: w.title,
    x: w.x, y: w.y, w: w.w, h: w.h,
    // Config exposto só pra escolher qual valor mostrar (ex.: soma x média) — nunca dados de resposta.
    config: w.config as Record<string, unknown>,
    data: computeWidgetData({ type: w.type, config: w.config }, fields, allResponses),
  }));

  return apiSuccess({
    title:        dashboard.title,
    description:  dashboard.description,
    theme:        dashboard.theme,
    coverUrl:      dashboard.coverUrl,
    colorPalette:  dashboard.colorPalette,
    canvasColor:   ((dashboard.layout ?? {}) as Record<string, unknown>).canvasColor ?? null,
    researchTitle: research.title,
    showAds:      owner?.plan === "free" || !owner,
    widgets:      widgetsWithData,
  });
}
