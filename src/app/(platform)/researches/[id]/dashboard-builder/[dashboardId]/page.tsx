import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { forms, formFields, responses, dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getResearchAccess, canEdit } from "@/lib/researches/access";
import { ResearchReadOnlyNotice } from "@/components/researches/readonly-notice";
import { DashboardBuilderClient } from "./dashboard-builder-client";

export default async function DashboardBuilderPage({
  params,
}: {
  params: Promise<{ id: string; dashboardId: string }>;
}) {
  const { id, dashboardId } = await params;
  const session = await auth();

  const access = await getResearchAccess(id, session!.user!.id!);
  if (!access) notFound();

  if (!canEdit(access.role)) {
    return <ResearchReadOnlyNotice researchId={id} title={access.research.title} />;
  }

  const dashboard = await db.query.dashboards.findFirst({ where: eq(dashboards.id, dashboardId) });
  if (!dashboard || dashboard.researchId !== id) notFound();

  const form = await db.query.forms.findFirst({ where: eq(forms.researchId, id) });

  const fields = form
    ? await db.query.formFields.findMany({
        where: eq(formFields.formId, form.id),
        orderBy: (f, { asc }) => [asc(f.order)],
      })
    : [];

  const allResponses = form
    ? await db.query.responses.findMany({ where: eq(responses.formId, form.id) })
    : [];

  return (
    <DashboardBuilderClient
      research={access.research}
      dashboard={dashboard}
      fields={fields}
      responses={allResponses}
    />
  );
}
