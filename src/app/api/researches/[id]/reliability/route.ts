import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { computeReliabilityStatusForResearch } from "@/lib/dashboard/reliability";
import { getResearchAccess } from "@/lib/researches/access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);

  const status = await computeReliabilityStatusForResearch(id);
  return apiSuccess(status);
}
