import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches, forms, formFields, responses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ResponsesClient } from "./responses-client";

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const research = await db.query.researches.findFirst({
    where: eq(researches.id, id),
  });

  if (!research || research.ownerId !== session?.user?.id) notFound();

  const form = await db.query.forms.findFirst({
    where: eq(forms.researchId, id),
  });

  const fields = form
    ? await db.query.formFields.findMany({
        where: eq(formFields.formId, form.id),
        orderBy: (f, { asc }) => [asc(f.order)],
      })
    : [];

  const allResponses = form
    ? await db.query.responses.findMany({
        where: eq(responses.formId, form.id),
        orderBy: [desc(responses.createdAt)],
      })
    : [];

  return (
    <ResponsesClient
      research={research}
      fields={fields}
      responses={allResponses}
    />
  );
}
