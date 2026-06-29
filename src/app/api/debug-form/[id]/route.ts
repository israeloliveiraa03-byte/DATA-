import { db } from "@/lib/db";
import { researches, forms, formFields } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  const form = await db.query.forms.findFirst({
    where: eq(forms.researchId, id),
  });

  const fields = form
    ? await db.query.formFields.findMany({
        where: eq(formFields.formId, form.id),
      })
    : [];

  return Response.json({
    researchExists: !!research,
    researchTitle: research?.title,
    formExists: !!form,
    formId: form?.id,
    fieldCount: fields.length,
    fields: fields.map(f => ({ type: f.type, label: f.label, order: f.order })),
  });
}
