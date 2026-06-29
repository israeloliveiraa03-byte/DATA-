import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches, forms, formFields } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FormBuilderClient } from "./form-builder-client";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research || research.ownerId !== session?.user?.id) {
    notFound();
  }

  // Busca o formulário salvo e seus campos
  const form = await db.query.forms.findFirst({
    where: eq(forms.researchId, id),
  });

  const savedFields = form
    ? await db.query.formFields.findMany({
        where: eq(formFields.formId, form.id),
        orderBy: (f, { asc }) => [asc(f.order)],
      })
    : [];

  return (
    <FormBuilderClient
      research={research}
      savedForm={form ?? null}
      savedFields={savedFields}
    />
  );
}
