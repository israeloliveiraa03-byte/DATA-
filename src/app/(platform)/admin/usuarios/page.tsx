import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isNull, desc } from "drizzle-orm";
import { UsersAdminClient } from "./users-admin-client";

export default async function AdminUsersPage() {
  const allUsers = await db.query.users.findMany({
    where: isNull(users.deletedAt),
    orderBy: desc(users.createdAt),
    columns: { id: true, name: true, email: true, plan: true, role: true, institution: true, createdAt: true },
  });

  return <UsersAdminClient users={allUsers} />;
}
