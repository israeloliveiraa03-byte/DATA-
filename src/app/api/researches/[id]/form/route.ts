import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches, forms, formFields } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

// GET — busca o formulário ativo da pesquisa
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research)                             return apiError("Pesquisa não encontrada", 404);
  if (research.ownerId !== session.user.id)  return apiError("Sem permissão", 403);

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

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research)                             return apiError("Pesquisa não encontrada", 404);
  if (research.ownerId !== session.user.id)  return apiError("Sem permissão", 403);

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

  // Remove campos antigos e recria
  await db.delete(formFields).where(eq(formFields.formId, form.id));

  if (rawFields.length > 0) {
    const fieldsToInsert = rawFields.map((f: Record<string, unknown>, idx: number) => ({
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
      },
    }));

    await db.insert(formFields).values(fieldsToInsert);
  }

  return apiSuccess({ formId: form.id, fieldCount: rawFields.length });
}


