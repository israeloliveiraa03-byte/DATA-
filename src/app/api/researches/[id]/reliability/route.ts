import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { computeReliabilityStatusForResearch } from "@/lib/dashboard/reliability";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const research = await db.query.researches.findFirst({ where: eq(researches.id, id) });
  if (!research)                            return apiError("Não encontrada", 404);
  if (research.ownerId !== session.user.id) return apiError("Sem permissão", 403);

  const status = await computeReliabilityStatusForResearch(id);
  return apiSuccess(status);
}
