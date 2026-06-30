import { db } from "@/lib/db";
import { researches, forms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RespondentClient } from "./respondent-client";

export default async function RespondentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const isPreview = sp.preview === "true";

  const research = await db.query.researches.findFirst({
    where: eq(researches.slug, slug),
  });

  if (!research) notFound();

  if (!isPreview && research.status !== "active" && research.status !== "published") {
    notFound();
  }

  const form = await db.query.forms.findFirst({
    where: eq(forms.researchId, research.id),
    with: { fields: { orderBy: (f, { asc }) => [asc(f.order)] } },
  });

  const fields = form?.fields ?? [];

  return (
    <RespondentClient
      research={research}
      form={form ?? null}
      fields={fields}
      isPreview={isPreview}
    />
  );
}
