import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { desc, isNull } from "drizzle-orm";
import { EntidadesClient } from "./entidades-client";
import { auth } from "@/lib/auth";
import { getEntityEditContext, entityForViewer } from "@/lib/entities/access";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entidades — Dataº" };

export default async function EntidadesPage() {
  const allEntities = await db.query.entities.findMany({
    where: isNull(entities.deletedAt),
    orderBy: [desc(entities.createdAt)],
  });

  const session = await auth();
  const ctx = await getEntityEditContext(session!.user!.id!);
  return <EntidadesClient entities={allEntities.map(e => entityForViewer(e, ctx))} />;
}
