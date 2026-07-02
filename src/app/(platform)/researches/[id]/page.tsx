import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches, researchEntities, entities } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ResearchPageClient } from "./research-page-client";

export default async function ResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research || research.ownerId !== session?.user?.id) {
    notFound();
  }

  const linkedEntities = await db.query.researchEntities.findMany({
    where: eq(researchEntities.researchId, id),
    with: { entity: true },
  });

  const linkedEntityIds = new Set(linkedEntities.map(l => l.entityId));
  const allEntities = await db.query.entities.findMany({
    where: isNull(entities.deletedAt),
    orderBy: desc(entities.createdAt),
  });
  const availableEntities = allEntities.filter(e => !linkedEntityIds.has(e.id));

  return (
    <ResearchPageClient
      research={research}
      linkedEntities={linkedEntities}
      availableEntities={availableEntities}
    />
  );
}
