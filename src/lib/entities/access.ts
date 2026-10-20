import { db } from "@/lib/db";
import { researchEntities, researches, researchMembers, users } from "@/lib/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";

// Quem pode EDITAR uma entidade do catálogo, e o que quem não pode editar
// enxerga da localização dela.
//
// Regra de edição (2026-10):
//   1. quem criou a entidade (entities.createdBy);
//   2. a equipe interna com papel "admin";
//   3. dono/editor de uma pesquisa vinculada à entidade — MAS só pesquisas do
//      próprio criador da entidade. Sem essa ressalva, qualquer pessoa poderia
//      vincular a entidade alheia a uma pesquisa sua e, com isso, ganhar
//      direito de edição sobre ela. Com a ressalva, o caso real continua
//      funcionando: a coordenação cadastra o território, vincula à própria
//      pesquisa, e a equipe de campo (editores) capta os pontos no app.
//
// Regra de leitura da localização: quem pode editar vê tudo. Os demais
// respeitam `locationDisclosure` — a mesma escolha que já valia pro Mapa
// Geral passa a valer pro catálogo inteiro (API, listagem, histórico):
//   hidden      → sem coordenadas nem contorno
//   approximate → coordenada arredondada (~11 km), sem contorno
//   exact       → tudo

import type { EntityEditContext } from "./visibility";

export { canEditEntity, redactLocation, entityForViewer, versionsForViewer } from "./visibility";
export type { EntityEditContext } from "./visibility";

/** Monta, numa ida ao banco, tudo que é preciso pra decidir edição em várias entidades. */
export async function getEntityEditContext(userId: string): Promise<EntityEditContext> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
  const isAdmin = user?.role === "admin";

  const memberships = await db.query.researchMembers.findMany({
    where: and(eq(researchMembers.userId, userId), eq(researchMembers.role, "editor")),
    columns: { researchId: true },
  });
  const memberIds = memberships.map(m => m.researchId);

  const writable = await db
    .select({ id: researches.id, ownerId: researches.ownerId })
    .from(researches)
    .where(memberIds.length ? or(eq(researches.ownerId, userId), inArray(researches.id, memberIds)) : eq(researches.ownerId, userId));

  const teamEntityIds = new Set<string>();
  if (writable.length) {
    const ownerByResearch = new Map(writable.map(r => [r.id, r.ownerId]));
    const links = await db.query.researchEntities.findMany({
      where: inArray(researchEntities.researchId, writable.map(r => r.id)),
      with: { entity: { columns: { id: true, createdBy: true } } },
    });
    for (const l of links) {
      if (l.entity && l.entity.createdBy === ownerByResearch.get(l.researchId)) teamEntityIds.add(l.entityId);
    }
  }
  return { userId, isAdmin, teamEntityIds };
}

