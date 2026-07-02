import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, entityVersions, entityPersonDetails, entityPersonInvites } from "@/lib/db/schema";
import { generateEntityCode } from "@/lib/db/entity-code";
import { eq } from "drizzle-orm";
import { acceptPersonInviteSchema } from "@/lib/validations/entity";
import { apiSuccess, apiError } from "@/lib/utils";

// A pessoa convidada precisa estar autenticada no Dataº (Google) para aceitar —
// é a própria pessoa quem cria seu registro, nunca um terceiro. Ver TODO de
// verificação avançada de identidade no CLAUDE.md (fora de escopo agora).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Entre com sua conta para aceitar o convite", 401);

  const invite = await db.query.entityPersonInvites.findFirst({
    where: eq(entityPersonInvites.token, token),
  });
  if (!invite) return apiError("Convite não encontrado", 404);
  if (invite.status === "pending" && invite.expiresAt && invite.expiresAt < new Date()) {
    await db.update(entityPersonInvites).set({ status: "expired" }).where(eq(entityPersonInvites.id, invite.id));
    return apiError("Este convite expirou", 410);
  }
  if (invite.status !== "pending") return apiError("Este convite já foi utilizado ou não está mais válido", 410);

  const body = await request.json();
  const parsed = acceptPersonInviteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const code = await generateEntityCode("pessoa");

  const [entity] = await db.insert(entities).values({
    ...parsed.data,
    type: "pessoa",
    code,
    createdBy: session.user.id,
  }).returning();

  await db.insert(entityPersonDetails).values({
    entityId: entity.id, personKind: "comum", selfRegistered: true,
  });

  await db.update(entityPersonInvites)
    .set({ status: "accepted", entityId: entity.id, acceptedAt: new Date() })
    .where(eq(entityPersonInvites.id, invite.id));

  try {
    await db.insert(entityVersions).values({
      entityId:   entity.id,
      version:    1,
      snapshot:   entity,
      changeNote: "Autocadastro via convite",
      changedBy:  session.user.id,
    });
  } catch (err) {
    console.error("Falha ao gravar versão inicial da entidade (convite)", entity.id, err);
  }

  return apiSuccess(entity);
}
