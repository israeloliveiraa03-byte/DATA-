import { auth } from "@/lib/auth";
import { getMyResearches } from "@/lib/researches/access";
import { ResearchesClient } from "./researches-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pesquisas — Dataº" };

export default async function ResearchesPage() {
  const session = await auth();

  const mine = await getMyResearches(session!.user!.id!);
  const allResearches = mine.map(m => m.research);
  const roleByResearchId = Object.fromEntries(mine.map(m => [m.research.id, m.role]));

  return <ResearchesClient researches={allResearches} roleByResearchId={roleByResearchId} />;
}
