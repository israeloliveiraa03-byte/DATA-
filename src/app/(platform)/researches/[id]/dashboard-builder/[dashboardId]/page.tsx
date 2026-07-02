import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches, forms, formFields, responses, dashboards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DashboardBuilderClient } from "./dashboard-builder-client";

export default async function DashboardBuilderPage({
  params,
}: {
  params: Promise<{ id: string; dashboardId: string }>;
}) {
  const { id, dashboardId } = await params;
  const session = await auth();

  const research = await db.query.researches.findFirst({ where: eq(researches.id, id) });
  if (!research || research.ownerId !== session?.user?.id) notFound();

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
      research={research}
      dashboard={dashboard}
      fields={fields}
      responses={allResponses}
    />
  );
}
