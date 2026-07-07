import { db } from "@/lib/db";
import { entities, researches, researchEntities, collaborationCalls } from "@/lib/db/schema";
import { isNull, ne, eq, and } from "drizzle-orm";
import { computeNetworkPin } from "@/lib/entities/network-pin";

export type NetworkMapPin = {
  id: string; name: string; code: string; type: string;
  lat: number; lng: number; disclosure: string;
  researches: { id: string; title: string }[];
  hasOpenCall: boolean;
};

// Agrega, no servidor, tudo que o Mapa Geral mostra: entidades com nível de
// exposição ligado, pesquisas ativas apoiadas no pino da entidade vinculada,
// e chamadas de colaboração abertas destacando o pino. Nada disso duplica
// dado — é só leitura + cálculo do pino (ver network-pin.ts). Usado tanto
// pela página (SSR) quanto pela API (`/api/network-map`, se algum dia
// precisar de refresh client-side).
export async function buildNetworkMap(): Promise<NetworkMapPin[]> {
  const visibleEntities = await db.query.entities.findMany({
    where: and(isNull(entities.deletedAt), ne(entities.locationDisclosure, "hidden")),
    columns: { id: true, name: true, code: true, type: true, latitude: true, longitude: true, boundaryPolygon: true, locationDisclosure: true },
  });

  const pinByEntityId = new Map<string, NetworkMapPin>();
  for (const entity of visibleEntities) {
    const point = computeNetworkPin(entity);
    if (!point) continue;
    pinByEntityId.set(entity.id, {
      id: entity.id, name: entity.name, code: entity.code, type: entity.type,
      lat: point.lat, lng: point.lng, disclosure: entity.locationDisclosure,
      researches: [], hasOpenCall: false,
    });
  }

  const visibleResearches = await db.query.researches.findMany({
    where: and(isNull(researches.deletedAt), ne(researches.networkVisibility, "hidden")),
    columns: { id: true, title: true },
  });
  const pinEntityIdByResearchId = new Map<string, string>();

  // Pesquisa só ganha pino se tiver ao menos uma entidade vinculada visível
  // com pino próprio — anexa a pesquisa ao PRIMEIRO vínculo que servir.
  for (const research of visibleResearches) {
    const links = await db.query.researchEntities.findMany({
      where: eq(researchEntities.researchId, research.id),
      columns: { entityId: true },
    });
    const linkedPin = links.map(l => pinByEntityId.get(l.entityId)).find(Boolean);
    if (linkedPin) {
      linkedPin.researches.push({ id: research.id, title: research.title });
      pinEntityIdByResearchId.set(research.id, linkedPin.id);
    }
  }

  const openCalls = await db.query.collaborationCalls.findMany({
    where: eq(collaborationCalls.status, "open"),
    columns: { id: true, researchId: true, entityId: true },
  });
  for (const call of openCalls) {
    if (call.entityId && pinByEntityId.has(call.entityId)) {
      pinByEntityId.get(call.entityId)!.hasOpenCall = true;
    } else if (call.researchId) {
      const entityId = pinEntityIdByResearchId.get(call.researchId);
      if (entityId) pinByEntityId.get(entityId)!.hasOpenCall = true;
    }
  }

  return [...pinByEntityId.values()];
}
