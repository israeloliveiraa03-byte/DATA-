import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collaborationCalls, entities } from "@/lib/db/schema";
import { desc, eq, isNull, and } from "drizzle-orm";
import { getMyResearches } from "@/lib/researches/access";
import { ColaboracaoClient } from "./colaboracao-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Colaboração — Dataº" };

export default async function ColaboracaoPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const calls = await db.query.collaborationCalls.findMany({
    orderBy: desc(collaborationCalls.createdAt),
    with: {
      createdByUser: { columns: { id: true, name: true } },
      research:      { columns: { id: true, title: true } },
      entity:        { columns: { id: true, name: true, code: true } },
      applications:  { with: { applicant: { columns: { id: true, name: true } } } },
    },
  });

  // Pra montar o form de "Nova chamada": só pesquisas onde posso editar,
  // só entidades que eu criei (mesmo critério de escopo simples usado em
  // outros formulários de vínculo do projeto).
  const mine = await getMyResearches(userId);
  const myResearches = mine.filter(m => m.role !== "viewer").map(m => m.research);
  const myEntities = await db.query.entities.findMany({
    where: and(eq(entities.createdBy, userId), isNull(entities.deletedAt)),
    orderBy: desc(entities.createdAt),
  });

  return (
    <ColaboracaoClient
      calls={calls}
      currentUserId={userId}
      myResearches={myResearches}
      myEntities={myEntities}
    />
  );
}
