import { db } from "@/lib/db";
import { entityPersonInvites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ConviteClient } from "./convite-client";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await db.query.entityPersonInvites.findFirst({
    where: eq(entityPersonInvites.token, token),
  });
  if (!invite) notFound();

  const session = await auth();
  const expired = invite.status === "pending" && !!invite.expiresAt && invite.expiresAt < new Date();
  const invalid = invite.status !== "pending" || expired;

  return (
    <ConviteClient
      token={token}
      suggestedName={invite.suggestedName}
      invalid={invalid}
      isLoggedIn={!!session?.user?.id}
    />
  );
}
