import { auth } from "@/lib/auth";
import { getRequestUserId } from "@/lib/auth/device";
import { db } from "@/lib/db";
import {
  entities, entityVersions, entityMunicipalities,
  entityAdminDivisions, entityAdminDivisionCities,
  entityOrgDocuments, entityPersonDetails,
} from "@/lib/db/schema";
import { generateEntityCode } from "@/lib/db/entity-code";
import { desc, isNull } from "drizzle-orm";
import { createEntitySchema } from "@/lib/validations/entity";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: Request) {
  // Cookie de sessão (site) ou token de dispositivo (app de campo, que lista
  // entidades pra captação territorial offline).
  const userId = await getRequestUserId(request);
  if (!userId) return apiError("Não autorizado", 401);

  const data = await db.query.entities.findMany({
    where: isNull(entities.deletedAt),
    orderBy: desc(entities.createdAt),
  });
  return apiSuccess(data);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = createEntitySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const { municipalities, adminDivisions, documentType, documentNumber, officialAddress, personKind, ...entityFields } = parsed.data;

  const code = await generateEntityCode(entityFields.type);

  const [entity] = await db
    .insert(entities)
    .values({ ...entityFields, code, createdBy: session.user.id })
    .returning();

  if (municipalities?.length) {
    await db.insert(entityMunicipalities).values(
      municipalities.map(m => ({ entityId: entity.id, ...m }))
    );
  }

  if (adminDivisions?.length) {
    for (const [index, division] of adminDivisions.entries()) {
      const [row] = await db.insert(entityAdminDivisions).values({
        entityId: entity.id, name: division.name, orderIndex: index,
      }).returning();

      await db.insert(entityAdminDivisionCities).values(
        division.cities.map(c => ({ divisionId: row.id, ...c }))
      );
    }
  }

  if (documentType && documentNumber) {
    await db.insert(entityOrgDocuments).values({
      entityId: entity.id, documentType, documentNumber,
      officialAddress: officialAddress ?? null,
    });
  }

  if (entityFields.type === "pessoa" && personKind) {
    await db.insert(entityPersonDetails).values({ entityId: entity.id, personKind, selfRegistered: false });
  }

  try {
    await db.insert(entityVersions).values({
      entityId:   entity.id,
      version:    1,
      snapshot:   { ...entity, municipalities, adminDivisions, documentType, documentNumber, officialAddress, personKind },
      changeNote: "Criação da entidade",
      changedBy:  session.user.id,
    });
  } catch (err) {
    console.error("Falha ao gravar versão inicial da entidade", entity.id, err);
  }

  return apiSuccess(entity);
}
