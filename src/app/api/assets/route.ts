import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAssets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createAssetSchema } from "@/lib/validations/asset";
import { apiSuccess, apiError } from "@/lib/utils";

// Biblioteca pessoal — só os assets do próprio pesquisador (privados ou já
// compartilhados, tanto faz, aqui é a visão "meus uploads").
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const data = await db.query.userAssets.findMany({
    where: eq(userAssets.ownerId, session.user.id),
    orderBy: desc(userAssets.createdAt),
  });
  return apiSuccess(data);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [asset] = await db.insert(userAssets).values({
    ownerId:  session.user.id,
    name:     parsed.data.name,
    imageUrl: parsed.data.imageUrl,
    isShared: parsed.data.isShared,
  }).returning();

  return apiSuccess(asset);
}
