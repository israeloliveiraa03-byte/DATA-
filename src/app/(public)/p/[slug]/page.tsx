import { db } from "@/lib/db";
import { researches, forms, formFields } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RespondentClient } from "./respondent-client";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const research = await db.query.researches.findFirst({ where: eq(researches.slug, slug) });
  if (!research) return { title: "Formulário não encontrado" };
  return { title: research.title, description: research.description ?? undefined };
}

export default async function RespondentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug }    = await params;
  const { preview } = await searchParams;
  const isPreview   = preview === "true";

  const research = await db.query.researches.findFirst({
    where: eq(researches.slug, slug),
  });

  if (!research) notFound();

  // Se não for preview e a pesquisa não estiver ativa/publicada, bloqueia
  if (!isPreview && research.status !== "active" && research.status !== "published") {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: "#faf6ef" }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#fff8ec", border: "1px solid #e8d9c0" }}>
            <i className="ti ti-lock text-2xl" style={{ color: "#b07d20" }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
            {research.status === "closed" ? "Pesquisa encerrada" : "Pesquisa indisponível"}
          </h1>
          <p className="text-sm" style={{ color: "#5c4a2a" }}>
            {research.status === "closed"
              ? "Esta pesquisa foi encerrada e não está mais aceitando respostas."
              : "Esta pesquisa não está disponível no momento."}
          </p>
        </div>
      </div>
    );
  }

  // Busca o formulário ativo
  const form = await db.query.forms.findFirst({
    where: eq(forms.researchId, research.id),
  });

  // Busca os campos se houver formulário
  const fields = form
    ? await db.query.formFields.findMany({
        where: eq(formFields.formId, form.id),
        orderBy: (f, { asc }) => [asc(f.order)],
      })
    : [];

  return (
    <RespondentClient
      research={research}
      form={form ?? null}
      fields={fields}
      isPreview={isPreview}
    />
  );
}
