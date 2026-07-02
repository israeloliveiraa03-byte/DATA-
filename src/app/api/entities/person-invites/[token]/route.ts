import { db } from "@/lib/db";
import { entityPersonInvites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

// Rota pública — a própria pessoa convidada acessa sem estar autenticada na plataforma.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await db.query.entityPersonInvites.findFirst({
    where: eq(entityPersonInvites.token, token),
  });

  if (!invite) return apiError("Convite não encontrado", 404);

  if (invite.status === "pending" && invite.expiresAt && invite.expiresAt < new Date()) {
    await db.update(entityPersonInvites).set({ status: "expired" }).where(eq(entityPersonInvites.id, invite.id));
    return apiError("Este convite expirou", 410);
  }

  if (invite.status !== "pending") return apiError("Este convite já foi utilizado ou não está mais válido", 410);

  return apiSuccess({ suggestedName: invite.suggestedName, createdAt: invite.createdAt });
}
