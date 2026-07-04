import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userAssets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

// Biblioteca comunitária — assets de QUALQUER pesquisador da plataforma que
// autorizou compartilhar (isShared = true). Requer login (não é rota
// pública), mas não é restrita a uma pesquisa/instituição específica.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const data = await db.query.userAssets.findMany({
    where: eq(userAssets.isShared, true),
    orderBy: desc(userAssets.createdAt),
    limit: 200,
  });
  return apiSuccess(data);
}
