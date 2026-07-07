import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const patchSchema = z.object({
  plan: z.enum(["free", "pesquisador", "laboratorio", "governo", "territorio"]).optional(),
  role: z.enum(["user", "support", "admin"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  // Só admin muda plano/papel de outro usuário (suporte não chega nem
  // nessa rota, já barrado pelo gate de /admin, mas confirma de novo aqui
  // porque é uma API — nunca confiar só na UI).
  if (session?.user?.role !== "admin") return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [updated] = await db.update(users).set(parsed.data).where(eq(users.id, id)).returning();
  if (!updated) return apiError("Usuário não encontrado", 404);

  return apiSuccess({ id: updated.id, plan: updated.plan, role: updated.role });
}
