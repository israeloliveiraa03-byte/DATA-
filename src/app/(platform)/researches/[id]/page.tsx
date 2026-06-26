import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ResearchPageClient } from "./research-page-client";

export default async function ResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research || research.ownerId !== session?.user?.id) {
    notFound();
  }

  return <ResearchPageClient research={research} />;
}
