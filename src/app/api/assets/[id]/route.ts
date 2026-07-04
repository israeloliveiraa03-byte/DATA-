import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAssets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateAssetSchema } from "@/lib/validations/asset";
import { apiSuccess, apiError } from "@/lib/utils";

async function loadOwnedAsset(id: string, userId: string) {
  const asset = await db.query.userAssets.findFirst({ where: eq(userAssets.id, id) });
  if (!asset) return { ok: false as const, error: apiError("Não encontrado", 404) };
  if (asset.ownerId !== userId) return { ok: false as const, error: apiError("Sem permissão", 403) };
  return { ok: true as const, asset };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const result = await loadOwnedAsset(id, session.user.id);
  if (!result.ok) return result.error;

  const body = await request.json();
  const parsed = updateAssetSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [updated] = await db.update(userAssets).set(parsed.data).where(eq(userAssets.id, id)).returning();
  return apiSuccess(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const result = await loadOwnedAsset(id, session.user.id);
  if (!result.ok) return result.error;

  await db.delete(userAssets).where(eq(userAssets.id, id));
  return apiSuccess({ id });
}
