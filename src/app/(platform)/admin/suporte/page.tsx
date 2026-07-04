import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { SuporteAdminClient } from "./suporte-admin-client";

export default async function AdminSuportePage() {
  const tickets = await db.query.supportTickets.findMany({
    orderBy: desc(supportTickets.createdAt),
    with: { user: { columns: { name: true, email: true } } },
  });

  return <SuporteAdminClient tickets={tickets} />;
}
