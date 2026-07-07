import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchMembers, researchMemberInvites, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getResearchAccess } from "@/lib/researches/access";
import { inviteMemberSchema } from "@/lib/validations/research-team";
import { apiSuccess, apiError } from "@/lib/utils";

// GET — qualquer papel pode ver quem tem acesso à pesquisa (transparência);
// os botões de gestão (convidar/remover/trocar papel) só aparecem no client
// pra quem é dono.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);

  const members = await db.query.researchMembers.findMany({
    where: eq(researchMembers.researchId, id),
    with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  const invites = await db.query.researchMemberInvites.findMany({
    where: and(eq(researchMemberInvites.researchId, id), eq(researchMemberInvites.status, "pending")),
  });

  const owner = await db.query.users.findFirst({
    where: eq(users.id, access.research.ownerId),
    columns: { id: true, name: true, email: true, avatarUrl: true },
  });

  return apiSuccess({ owner, members, invites });
}

// POST — gera um convite (link copiável) pra pesquisa. Só o dono convida.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Não encontrada", 404);
  if (access.role !== "owner") return apiError("Só o dono da pesquisa pode convidar", 403);

  const body = await request.json();
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dias

  const [invite] = await db.insert(researchMemberInvites).values({
    token,
    researchId: id,
    email:      parsed.data.email,
    role:       parsed.data.role,
    invitedBy:  session.user.id,
    expiresAt,
  }).returning();

  return apiSuccess(invite);
}
