import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches, dashboards } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DashboardListClient } from "./dashboard-list-client";

export default async function DashboardListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research || research.ownerId !== session?.user?.id) notFound();

  const list = await db.query.dashboards.findMany({
    where: eq(dashboards.researchId, id),
    orderBy: desc(dashboards.createdAt),
  });

  return <DashboardListClient research={research} dashboards={list} />;
}
