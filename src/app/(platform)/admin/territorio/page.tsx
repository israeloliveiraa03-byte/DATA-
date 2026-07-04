import { db } from "@/lib/db";
import { territorioApplications } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { TerritorioAdminClient } from "./territorio-admin-client";

export default async function AdminTerritorioPage() {
  const applications = await db.query.territorioApplications.findMany({
    orderBy: desc(territorioApplications.createdAt),
    with: { applicant: { columns: { name: true, email: true } } },
  });

  return <TerritorioAdminClient applications={applications} />;
}
