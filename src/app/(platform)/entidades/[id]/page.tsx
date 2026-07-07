import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, entityVersions, researchEntities } from "@/lib/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { getMyResearches } from "@/lib/researches/access";
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
    with: {
      municipalities: true,
      adminDivisions: { with: { cities: true }, orderBy: (d, { asc }) => [asc(d.orderIndex)] },
      orgDocument:    true,
      personDetails:  true,
    },
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

  // Só dono/editor podem vincular entidade (é ação de escrita na pesquisa) — visualizador fica de fora da lista.
  const mine = await getMyResearches(session!.user!.id!);
  const myResearches = mine.filter(m => m.role !== "viewer").map(m => m.research);

  return (
    <EntidadeDetailClient
      entity={entity}
      versions={versions}
      links={links}
      myResearches={myResearches}
    />
  );
}
