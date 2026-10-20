import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getMyResearches } from "@/lib/researches/access";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const session = await auth();
  const mine = await getMyResearches(session!.user!.id!);
  return (
    <DashboardView
      firstName={session?.user?.name?.split(" ")[0] ?? "pesquisador(a)"}
      researches={mine.map(m => m.research)}
      roleByResearchId={Object.fromEntries(mine.map(m => [m.research.id, m.role]))}
    />
  );
}
