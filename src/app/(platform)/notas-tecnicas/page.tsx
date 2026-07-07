import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { technicalNotes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NotasTecnicasClient } from "./notas-tecnicas-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notas técnicas — Dataº" };

export default async function NotasTecnicasPage() {
  const session = await auth();

  const notes = await db.query.technicalNotes.findMany({
    where: eq(technicalNotes.visibility, "public"),
    orderBy: desc(technicalNotes.createdAt),
    with: {
      author: { columns: { id: true, name: true, institution: true } },
      entity: { columns: { id: true, name: true, code: true } },
      endorsements: { columns: { userId: true } },
    },
  });

  const userId = session?.user?.id;
  const shaped = notes.map(n => ({
    ...n,
    endorsementCount: n.endorsements.length,
    endorsedByMe: userId ? n.endorsements.some(e => e.userId === userId) : false,
  }));

  return <NotasTecnicasClient notes={shaped} isLoggedIn={!!userId} />;
}
