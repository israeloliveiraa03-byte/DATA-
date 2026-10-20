import { getRequestUserId } from "@/lib/auth/device";
import { db } from "@/lib/db";
import { entities, entityVersions } from "@/lib/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { updateEntitySchema } from "@/lib/validations/entity";
import { apiSuccess, apiError } from "@/lib/utils";
import { getEntityEditContext, canEditEntity, entityForViewer } from "@/lib/entities/access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Cookie de sessão (site) ou token de dispositivo (app de campo).
  const userId = await getRequestUserId(req);
  if (!userId) return apiError("Não autorizado", 401);

  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, id), isNull(entities.deletedAt)),
    with: {
      municipalities: true,
      adminDivisions: { with: { cities: true }, orderBy: (d, { asc }) => [asc(d.orderIndex)] },
      orgDocument:    true,
      personDetails:  true,
    },
  });

  if (!entity) return apiError("Não encontrada", 404);

  // currentVersion: chave aditiva (não quebra quem já consome esse GET) que
  // permite ao cliente mandar `baseVersion` no PATCH e detectar conflito de
  // edição concorrente/offline — ver o PATCH abaixo.
  const lastVersion = await db.query.entityVersions.findFirst({
    where: eq(entityVersions.entityId, id),
    orderBy: desc(entityVersions.version),
    columns: { version: true },
  });

  // Quem não pode editar recebe a localização no nível escolhido por quem
  // criou a entidade (oculta/aproximada/exata) — ver src/lib/entities/access.ts.
  const ctx = await getEntityEditContext(userId);
  return apiSuccess({ ...entityForViewer(entity, ctx), currentVersion: lastVersion?.version ?? 0 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Cookie de sessão (site) ou token de dispositivo (app de campo, que envia
  // pontos capturados offline quando a internet volta).
  const userId = await getRequestUserId(request);
  if (!userId) return apiError("Não autorizado", 401);

  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, id), isNull(entities.deletedAt)),
  });
  if (!entity) return apiError("Não encontrada", 404);

  // Antes desta checagem, qualquer conta logada conseguia renomear ou redesenhar
  // o território de qualquer entidade do catálogo.
  const ctx = await getEntityEditContext(userId);
  if (!canEditEntity(entity, ctx)) {
    return apiError("Só quem cadastrou a entidade (ou a equipe de uma pesquisa dessa pessoa vinculada a ela) pode editá-la", 403);
  }

  const body = await request.json();
  const parsed = updateEntitySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const { changeNote, baseVersion, ...changes } = parsed.data;

  // A última versão é buscada ANTES de aplicar a mudança — é ela que diz se
  // alguém salvou no meio tempo desde que o cliente começou a editar.
  const lastVersion = await db.query.entityVersions.findFirst({
    where: eq(entityVersions.entityId, id),
    orderBy: desc(entityVersions.version),
  });
  const currentVersion = lastVersion?.version ?? 0;

  // Conflito de versão (edição offline/concorrente): se o cliente informou de
  // qual versão partiu e ela não é mais a atual, devolve 409 com a entidade
  // atual completa — quem decide como mesclar é o cliente, nunca o servidor.
  // baseVersion ausente = compatibilidade com quem já chama sem isso hoje
  // (site), mantém o comportamento de "último salvamento vence".
  if (baseVersion !== undefined && baseVersion !== currentVersion) {
    // Entidade completa (com relações, igual ao GET) — é com isso que o
    // cliente monta a tela de mesclagem.
    const fullEntity = await db.query.entities.findFirst({
      where: and(eq(entities.id, id), isNull(entities.deletedAt)),
      with: {
        municipalities: true,
        adminDivisions: { with: { cities: true }, orderBy: (d, { asc }) => [asc(d.orderIndex)] },
        orgDocument:    true,
        personDetails:  true,
      },
    });
    return Response.json({
      success: false,
      error:   "A entidade foi alterada por outra pessoa desde que você começou a editar",
      code:    "version_conflict",
      data:    { currentVersion, entity: fullEntity ?? entity },
    }, { status: 409 });
  }

  const [updated] = await db
    .update(entities)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(entities.id, id))
    .returning();

  try {
    await db.insert(entityVersions).values({
      entityId:   id,
      version:    currentVersion + 1,
      snapshot:   updated,
      changeNote: changeNote ?? "Atualização da entidade",
      changedBy:  userId,
    });
  } catch (err) {
    console.error("Falha ao gravar versão da entidade", id, err);
  }

  return apiSuccess(updated);
}
