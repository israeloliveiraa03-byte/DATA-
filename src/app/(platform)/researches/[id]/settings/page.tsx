import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getResearchAccess } from "@/lib/researches/access";
import { ResearchSettingsClient } from "./settings-client";

export default async function ResearchSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const access = await getResearchAccess(id, session!.user!.id!);
  if (!access) notFound();

  return <ResearchSettingsClient research={access.research} role={access.role} />;
}
