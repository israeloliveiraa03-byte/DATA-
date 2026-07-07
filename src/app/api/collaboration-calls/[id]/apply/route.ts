import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collaborationCalls, collaborationApplications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { applySchema } from "@/lib/validations/collaboration";
import { apiSuccess, apiError } from "@/lib/utils";

// POST — candidata-se a uma chamada aberta.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const call = await db.query.collaborationCalls.findFirst({ where: eq(collaborationCalls.id, id) });
  if (!call) return apiError("Chamada não encontrada", 404);
  if (call.status !== "open") return apiError("Esta chamada não está mais aberta", 410);
  if (call.createdBy === session.user.id) return apiError("Você não pode se candidatar à própria chamada", 403);

  const existing = await db.query.collaborationApplications.findFirst({
    where: and(eq(collaborationApplications.callId, id), eq(collaborationApplications.applicantId, session.user.id)),
  });
  if (existing) return apiError("Você já se candidatou a esta chamada", 409);

  const body = await request.json().catch(() => ({}));
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [application] = await db.insert(collaborationApplications).values({
    callId:      id,
    applicantId: session.user.id,
    message:     parsed.data.message,
  }).returning();

  return apiSuccess(application);
}
