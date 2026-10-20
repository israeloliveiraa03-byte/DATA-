import { db } from "@/lib/db";
import { researches, forms, formFields } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rota de diagnóstico: antes era aberta a qualquer pessoa na internet e
  // revelava título e situação de pesquisas. Agora só a equipe interna.
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "support") return new Response("Not found", { status: 404 });

  const { id } = await params;

  // Detecta se é UUID ou slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const research = await db.query.researches.findFirst({
    where: isUuid ? eq(researches.id, id) : eq(researches.slug, id),
  });

  if (!research) {
    return Response.json({ found: false, searchedFor: id, searchedBy: isUuid ? "id" : "slug" });
  }

  const form = await db.query.forms.findFirst({
    where: eq(forms.researchId, research.id),
  });

  const fields = form
    ? await db.query.formFields.findMany({
        where: eq(formFields.formId, form.id),
      })
    : [];

  return Response.json({
    found: true,
    researchId: research.id,
    researchTitle: research.title,
    slug: research.slug,
    status: research.status,
    formExists: !!form,
    fieldCount: fields.length,
  });
}
