import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { CampoClient } from "./campo-client";

const TERRITORIO_TYPES = ["territorio", "comunidade"];

export default async function CampoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, id), isNull(entities.deletedAt)),
  });
  if (!entity || !TERRITORIO_TYPES.includes(entity.type)) notFound();

  return <CampoClient entity={entity} />;
}
