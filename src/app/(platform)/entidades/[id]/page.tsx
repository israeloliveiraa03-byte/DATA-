import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, entityVersions, researchEntities, researches } from "@/lib/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { EntidadeDetailClient } from "./entidade-detail-client";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const entity = await db.query.entities.findFirst({ where: eq(entities.id, id) });
  return { title: entity ? `${entity.name} — Dataº` : "Entidade — Dataº" };
}

export default async function EntidadeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, id), isNull(entities.deletedAt)),
  });
  if (!entity) notFound();

  const versions = await db.query.entityVersions.findMany({
    where: eq(entityVersions.entityId, id),
    orderBy: desc(entityVersions.version),
  });

  const links = await db.query.researchEntities.findMany({
    where: eq(researchEntities.entityId, id),
    with: { research: true },
  });

  const myResearches = await db.query.researches.findMany({
    where: eq(researches.ownerId, session!.user!.id!),
    orderBy: desc(researches.createdAt),
  });

  return (
    <EntidadeDetailClient
      entity={entity}
      versions={versions}
      links={links}
      myResearches={myResearches}
    />
  );
}
