import { db } from "@/lib/db";
import { researchMemberInvites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ConviteEquipeClient } from "./convite-equipe-client";

export default async function ConviteEquipePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await db.query.researchMemberInvites.findFirst({
    where: eq(researchMemberInvites.token, token),
    with: { research: { columns: { title: true } } },
  });
  if (!invite) notFound();

  const session = await auth();
  const expired = invite.status === "pending" && invite.expiresAt < new Date();
  const invalid = invite.status !== "pending" || expired;

  return (
    <ConviteEquipeClient
      token={token}
      researchTitle={invite.research.title}
      role={invite.role}
      invalid={invalid}
      isLoggedIn={!!session?.user?.id}
    />
  );
}
