import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchEntities, entities, researchMembers, researchMemberInvites, users } from "@/lib/db/schema";
import { eq, isNull, desc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getResearchAccess } from "@/lib/researches/access";
import { ResearchPageClient } from "./research-page-client";
import { getEntityEditContext, entityForViewer } from "@/lib/entities/access";

export default async function ResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const access = await getResearchAccess(id, session!.user!.id!);
  if (!access) notFound();
  const research = access.research;

  const linkedEntities = await db.query.researchEntities.findMany({
    where: eq(researchEntities.researchId, id),
    with: { entity: true },
  });

  const linkedEntityIds = new Set(linkedEntities.map(l => l.entityId));
  const allEntities = await db.query.entities.findMany({
    where: isNull(entities.deletedAt),
    orderBy: desc(entities.createdAt),
  });
  // Tudo que vai pro navegador passa pela regra de exposição de localização.
  const entityCtx = await getEntityEditContext(session!.user!.id!);
  const availableEntities = allEntities
    .filter(e => !linkedEntityIds.has(e.id))
    .map(e => entityForViewer(e, entityCtx));
  const linkedForViewer = linkedEntities.map(l => ({ ...l, entity: entityForViewer(l.entity, entityCtx) }));

  const teamMembers = await db.query.researchMembers.findMany({
    where: eq(researchMembers.researchId, id),
    with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  // Convites pendentes só interessam a quem pode gerenciar a equipe (dono).
  const teamInvites = access.role === "owner"
    ? await db.query.researchMemberInvites.findMany({
        where: and(eq(researchMemberInvites.researchId, id), eq(researchMemberInvites.status, "pending")),
      })
    : [];

  const teamOwner = await db.query.users.findFirst({
    where: eq(users.id, research.ownerId),
    columns: { id: true, name: true, email: true, avatarUrl: true },
  });

  return (
    <ResearchPageClient
      research={research}
      linkedEntities={linkedForViewer}
      availableEntities={availableEntities}
      role={access.role}
      teamOwner={teamOwner!}
      teamMembers={teamMembers}
      teamInvites={teamInvites}
    />
  );
}
