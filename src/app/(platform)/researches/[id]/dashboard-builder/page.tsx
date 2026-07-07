import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getResearchAccess, canEdit } from "@/lib/researches/access";
import { ResearchReadOnlyNotice } from "@/components/researches/readonly-notice";
import { DashboardListClient } from "./dashboard-list-client";

export default async function DashboardListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const access = await getResearchAccess(id, session!.user!.id!);
  if (!access) notFound();

  if (!canEdit(access.role)) {
    return <ResearchReadOnlyNotice researchId={id} title={access.research.title} />;
  }

  const list = await db.query.dashboards.findMany({
    where: eq(dashboards.researchId, id),
    orderBy: desc(dashboards.createdAt),
  });

  return <DashboardListClient research={access.research} dashboards={list} />;
}
