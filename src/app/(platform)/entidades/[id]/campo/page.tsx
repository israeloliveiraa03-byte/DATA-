import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { CampoClient } from "./campo-client";
import { auth } from "@/lib/auth";
import { getEntityEditContext, canEditEntity } from "@/lib/entities/access";

const TERRITORIO_TYPES = ["territorio", "comunidade"];

export default async function CampoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, id), isNull(entities.deletedAt)),
  });
  if (!entity || !TERRITORIO_TYPES.includes(entity.type)) notFound();

  // Captação em campo grava o contorno — só pra quem pode editar a entidade.
  const session = await auth();
  const ctx = await getEntityEditContext(session!.user!.id!);
  if (!canEditEntity(entity, ctx)) redirect(`/entidades/${id}`);

  return <CampoClient entity={entity} />;
}
