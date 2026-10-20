import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { and, inArray, isNull, isNotNull, ne } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { getEntityEditContext, canEditEntity } from "@/lib/entities/access";

// Contornos de territórios/comunidades já cadastrados — usado pelo editor
// de mapa pra detectar sobreposição com territórios vizinhos enquanto o
// pesquisador desenha. Retorna só o mínimo necessário (id, código, nome,
// contorno); a normalização do formato (antigo {lat,lng}[] vs.
// FeatureCollection) fica no cliente, via normalizeBoundaryGeo.
//
// Nota de escala: hoje devolve todos os contornos existentes (volume
// pequeno). Quando o catálogo crescer, filtrar por UF/bounding box aqui —
// ou de verdade com PostGIS no stack futuro.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const exclude = searchParams.get("exclude");

  const conditions = [
    inArray(entities.type, ["territorio", "comunidade"]),
    isNull(entities.deletedAt),
    isNotNull(entities.boundaryPolygon),
  ];
  if (exclude) conditions.push(ne(entities.id, exclude));

  const rows = await db
    .select({
      id:              entities.id,
      code:            entities.code,
      name:            entities.name,
      boundaryPolygon: entities.boundaryPolygon,
      createdBy:       entities.createdBy,
      locationDisclosure: entities.locationDisclosure,
    })
    .from(entities)
    .where(and(...conditions));

  // Contorno só sai pra quem pode editar a entidade ou quando quem criou
  // escolheu exposição "exata" — contorno de território oculto não vaza
  // pelo detector de sobreposição.
  const ctx = await getEntityEditContext(session.user.id);
  const visible = rows
    .filter(r => r.locationDisclosure === "exact" || canEditEntity(r, ctx))
    .map(({ id, code, name, boundaryPolygon }) => ({ id, code, name, boundaryPolygon }));

  return apiSuccess(visible);
}
