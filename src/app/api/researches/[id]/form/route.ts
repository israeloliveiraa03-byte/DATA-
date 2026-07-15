import { auth } from "@/lib/auth";
import { getRequestUserId } from "@/lib/auth/device";
import { db } from "@/lib/db";
import { forms, formFields } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { getResearchAccess, canEdit } from "@/lib/researches/access";

// GET — busca o formulário ativo da pesquisa
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Cookie de sessão (site) ou token de dispositivo (app de campo, que baixa
  // o formulário pra cache local antes de ir a campo sem internet).
  const userId = await getRequestUserId(req);
  if (!userId) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, userId);
  if (!access) return apiError("Pesquisa não encontrada", 404);

  const form = await db.query.forms.findFirst({
    where: eq(forms.researchId, id),
    with:  { fields: { orderBy: (f, { asc }) => [asc(f.order)] } },
  });

  return apiSuccess(form ?? null);
}

// POST — cria ou atualiza o formulário e seus campos
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const access = await getResearchAccess(id, session.user.id);
  if (!access) return apiError("Pesquisa não encontrada", 404);
  if (!canEdit(access.role)) return apiError("Sem permissão de edição", 403);
  const research = access.research;

  const body = await request.json();
  const { title, description, fields: rawFields = [] } = body;

  // Upsert do formulário
  let form = await db.query.forms.findFirst({
    where: eq(forms.researchId, id),
  });

  if (!form) {
    const [created] = await db.insert(forms).values({
      researchId:  id,
      title:       title ?? research.title,
      description: description ?? "",
      schema:      {},
      isActive:    true,
      version:     1,
    }).returning();
    form = created;
  } else {
    const [updated] = await db
      .update(forms)
      .set({
        title:       title ?? form.title,
        description: description ?? form.description,
        updatedAt:   new Date(),
      })
      .where(eq(forms.id, form.id))
      .returning();
    form = updated;
  }

  // Upsert dos campos — preserva o id de quem já existia neste formulário
  // (antes: apagava e recriava TUDO a cada salvamento, trocando o id de toda
  // pergunta mesmo sem mudança nenhuma; isso desconectava silenciosamente as
  // respostas já coletadas — responses.data é keyed pelo id do campo — e os
  // widgets de dashboard já configurados, que ficavam "órfãos" apontando pro
  // id antigo. Bug encontrado em 2026-07-14 revisando por que mapas/gráficos
  // publicados apareciam vazios mesmo com respostas reais no banco).
  const existingFields = await db.query.formFields.findMany({
    where: eq(formFields.formId, form.id),
  });
  const existingIds = new Set(existingFields.map(f => f.id));

  if (rawFields.length > 0) {
    const prepared = rawFields.map((f: Record<string, unknown>, idx: number) => ({
      clientId: typeof f.id === "string" ? f.id : undefined,
      condDependsOn: f.condDependsOn as string | undefined,
      values: {
        formId:       form!.id,
        type:         (f.type as string) || "short_text",
        label:        (f.label as string) || "Pergunta",
        description:  (f.description as string) || "",
        placeholder:  (f.placeholder as string) || "",
        required:     Boolean(f.required),
        order:        idx,
        config:       {
          options:      f.options,
          min:          f.scaleMin,
          max:          f.scaleMax,
          label:        f.scaleLabel,
          matrixRows:   f.matrixRows,
          matrixCols:   f.matrixCols,
          rankingItems: f.rankingItems,
          totalPoints:  f.totalPoints,
          cardCategories: f.cardCategories,
          cardItems:    f.cardItems,
          semanticLeft: f.semanticLeft,
          semanticRight:f.semanticRight,
          timelineStart:f.timelineStart,
          timelineEnd:  f.timelineEnd,
          zoneOptions:  f.zoneOptions,
          placeholder:  f.placeholder,
          // Novos tipos (2026-07-04): tudo vive em config (jsonb), sem mudança de schema
          tableColumns:        f.tableColumns,
          availabilityDays:    f.availabilityDays,
          availabilityPeriods: f.availabilityPeriods,
          geoMapMode:          f.geoMapMode,
          condDependsOn:       f.condDependsOn,
          condOperator:        f.condOperator,
          condValue:           f.condValue,
          pairwiseItems:       f.pairwiseItems,
          formula:             f.formula,
          consentText:         f.consentText,
          consentItems:        f.consentItems,
          uploadItems:         f.uploadItems,
        } as Record<string, unknown>,
      },
    }));

    try {
      const idMap = new Map<string, string>(); // id enviado pelo cliente -> id real no banco
      const submittedIds = new Set<string>();
      const realIdByIdx: string[] = [];

      for (const item of prepared) {
        if (item.clientId && existingIds.has(item.clientId)) {
          await db.update(formFields).set(item.values).where(eq(formFields.id, item.clientId));
          idMap.set(item.clientId, item.clientId);
          submittedIds.add(item.clientId);
          realIdByIdx.push(item.clientId);
        } else {
          const [created] = await db.insert(formFields).values(item.values).returning({ id: formFields.id });
          if (item.clientId) idMap.set(item.clientId, created.id);
          submittedIds.add(created.id);
          realIdByIdx.push(created.id);
        }
      }

      // Apaga só quem foi removido no editor (não veio nesse salvamento) —
      // preserva todo o resto, diferente do delete-tudo de antes.
      for (const ef of existingFields) {
        if (!submittedIds.has(ef.id)) {
          await db.delete(formFields).where(eq(formFields.id, ef.id));
        }
      }

      // Campos condicionais referenciam outra pergunta pelo id (condDependsOn).
      // Só precisa remapear quando o campo referenciado é novo (ganhou id na
      // hora); campo que já existia manteve o id, a referência já está certa.
      for (let idx = 0; idx < prepared.length; idx++) {
        const dep = prepared[idx].condDependsOn;
        if (!dep) continue;
        const newDep = idMap.get(dep);
        if (!newDep || newDep === dep) continue;
        await db.update(formFields)
          .set({ config: { ...prepared[idx].values.config, condDependsOn: newDep } })
          .where(eq(formFields.id, realIdByIdx[idx]));
      }
    } catch (err) {
      return apiError("Erro ao salvar campos: " + String(err), 500);
    }
  } else {
    // Formulário esvaziado no editor — sem campos enviados, apaga os que existiam.
    await db.delete(formFields).where(eq(formFields.formId, form.id));
  }

  return apiSuccess({ formId: form.id, fieldCount: rawFields.length });
}


