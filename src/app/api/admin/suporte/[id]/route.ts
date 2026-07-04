import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const patchSchema = z.object({
  response: z.string().max(3000).optional(),
  status:   z.enum(["open", "answered", "closed"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  // Admin e suporte respondem chamados — o gate de /admin já barra quem
  // não é nenhum dos dois, mas confirma de novo aqui (é uma API).
  if (session?.user?.role !== "admin" && session?.user?.role !== "support") return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.response) {
    patch.respondedBy = session.user.id;
    patch.respondedAt = new Date();
    if (!parsed.data.status) patch.status = "answered";
  }

  const [updated] = await db.update(supportTickets).set(patch).where(eq(supportTickets.id, id)).returning();
  if (!updated) return apiError("Chamado não encontrado", 404);

  return apiSuccess(updated);
}
