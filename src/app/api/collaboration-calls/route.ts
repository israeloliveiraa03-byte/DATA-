import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collaborationCalls } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getResearchAccess, canEdit } from "@/lib/researches/access";
import { createCallSchema } from "@/lib/validations/collaboration";
import { apiSuccess, apiError } from "@/lib/utils";

// GET — lista pública de chamadas (qualquer pessoa logada vê todas, o
// client decide o que destacar por status).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const calls = await db.query.collaborationCalls.findMany({
    orderBy: desc(collaborationCalls.createdAt),
    with: {
      createdByUser: { columns: { id: true, name: true } },
      research:      { columns: { id: true, title: true } },
      entity:        { columns: { id: true, name: true, code: true } },
      applications:  { columns: { id: true, applicantId: true, status: true } },
    },
  });

  return apiSuccess(calls);
}

// POST — cria uma chamada. Se ligada a uma pesquisa, exige editor+ dessa
// pesquisa (reaproveita getResearchAccess da Equipe de pesquisa); ligada
// só a uma entidade, ou solta, qualquer pessoa logada pode criar.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = createCallSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  if (parsed.data.researchId) {
    const access = await getResearchAccess(parsed.data.researchId, session.user.id);
    if (!access) return apiError("Pesquisa não encontrada", 404);
    if (!canEdit(access.role)) return apiError("Sem permissão de edição nesta pesquisa", 403);
  }

  const [call] = await db.insert(collaborationCalls).values({
    createdBy:   session.user.id,
    researchId:  parsed.data.researchId,
    entityId:    parsed.data.entityId,
    kind:        parsed.data.kind,
    title:       parsed.data.title,
    description: parsed.data.description,
  }).returning();

  return apiSuccess(call);
}
