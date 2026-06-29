import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ResearchesClient } from "./researches-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pesquisas — Dataº" };

export default async function ResearchesPage() {
  const session = await auth();

  const allResearches = await db.query.researches.findMany({
    where: eq(researches.ownerId, session!.user!.id!),
    orderBy: [desc(researches.createdAt)],
  });

  return <ResearchesClient researches={allResearches} />;
}
