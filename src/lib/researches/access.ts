import { db } from "@/lib/db";
import { researches, researchMembers } from "@/lib/db/schema";
import { eq, or, inArray, desc } from "drizzle-orm";

export type ResearchRole = "owner" | "editor" | "viewer";

export type ResearchAccess = {
  role: ResearchRole;
  research: typeof researches.$inferSelect;
};

/** Papel do usuário numa pesquisa (dono, membro com papel, ou nenhum acesso). */
export async function getResearchAccess(researchId: string, userId: string): Promise<ResearchAccess | null> {
  const research = await db.query.researches.findFirst({ where: eq(researches.id, researchId) });
  if (!research) return null;

  if (research.ownerId === userId) return { role: "owner", research };

  const membership = await db.query.researchMembers.findFirst({
    where: (rm, { and, eq }) => and(eq(rm.researchId, researchId), eq(rm.userId, userId)),
  });
  if (membership) return { role: membership.role, research };

  return null;
}

/** Editor e dono podem escrever; visualizador só lê. */
export function canEdit(role: ResearchRole): boolean {
  return role !== "viewer";
}

/** Pesquisas em que o usuário é dono OU membro (equipe) — pra listagens. */
export async function getMyResearches(userId: string) {
  const memberships = await db.query.researchMembers.findMany({
    where: eq(researchMembers.userId, userId),
  });
  const memberResearchIds = memberships.map(m => m.researchId);

  const list = await db.query.researches.findMany({
    where: memberResearchIds.length > 0
      ? or(eq(researches.ownerId, userId), inArray(researches.id, memberResearchIds))
      : eq(researches.ownerId, userId),
    orderBy: desc(researches.createdAt),
  });

  const roleByResearchId = new Map<string, ResearchRole>(memberships.map(m => [m.researchId, m.role]));
  return list.map(research => ({
    research,
    role: (research.ownerId === userId ? "owner" : roleByResearchId.get(research.id) ?? "viewer") as ResearchRole,
  }));
}
