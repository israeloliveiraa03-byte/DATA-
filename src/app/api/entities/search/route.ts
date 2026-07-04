import { db } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { and, desc, ilike, isNull, or } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

// GET /api/entities/search?q=... — busca pública e enxuta no Catálogo de Entidades.
// Usada pelo campo geo_relational na tela do respondente (que é pública/anônima),
// por isso não exige login. Expõe apenas a identidade pública da entidade
// (código persistente, nome, tipo e localização), nunca o conteúdo completo.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);

  try {
    const where = q
      ? and(
          isNull(entities.deletedAt),
          or(ilike(entities.name, `%${q}%`), ilike(entities.code, `%${q}%`)),
        )
      : isNull(entities.deletedAt);

    const rows = await db
      .select({
        id:        entities.id,
        code:      entities.code,
        type:      entities.type,
        name:      entities.name,
        cityName:  entities.cityName,
        stateCode: entities.stateCode,
      })
      .from(entities)
      .where(where)
      .orderBy(desc(entities.createdAt))
      .limit(20);

    return apiSuccess(rows);
  } catch {
    return apiError("Não foi possível buscar entidades", 500);
  }
}
