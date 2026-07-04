import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SuporteClient } from "./suporte-client";

export default async function SuportePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tickets = await db.query.supportTickets.findMany({
    where: eq(supportTickets.userId, session.user.id),
    orderBy: desc(supportTickets.createdAt),
  });

  return <SuporteClient tickets={tickets} />;
}
