import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ProfileClient } from "./profile-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meu Perfil — Dataº" };

export default async function ProfilePage() {
  const session = await auth();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session!.user!.id!),
  });

  return <ProfileClient user={user!} />;
}
