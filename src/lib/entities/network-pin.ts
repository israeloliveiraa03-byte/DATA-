import * as turf from "@turf/turf";
import type { FeatureCollection } from "geojson";
import { normalizeBoundaryGeo, findBoundaryFeature } from "@/lib/entities/geo-format";
import type { LatLngPoint } from "@/lib/entities/geo-format";

interface PinnableEntity {
  latitude: string | null;
  longitude: string | null;
  boundaryPolygon: unknown;
  locationDisclosure: string;
}

// Ponto real da entidade (lat/lng direto, ou centróide do contorno
// marcado — nunca a média de pontos de interesse soltos). Não aplica
// nenhuma ofuscação ainda; isso é feito por computeNetworkPin.
function exactPoint(entity: PinnableEntity): LatLngPoint | null {
  if (entity.latitude && entity.longitude) {
    const lat = parseFloat(entity.latitude);
    const lng = parseFloat(entity.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }

  const fc = normalizeBoundaryGeo(entity.boundaryPolygon) as FeatureCollection;
  const boundary = findBoundaryFeature(fc);
  const target = boundary ?? (fc.features.length > 0 ? fc : null);
  if (!target) return null;

  try {
    const center = turf.centroid(target as never);
    const [lng, lat] = center.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Arredondamento pra ~1 casa decimal (~11km) — anonimização simples, sem
// precisar de nenhum dataset de centróide municipal.
function fuzz(point: LatLngPoint): LatLngPoint {
  return { lat: Math.round(point.lat * 10) / 10, lng: Math.round(point.lng * 10) / 10 };
}

/** Pino da entidade no Mapa Geral, respeitando o nível de exposição escolhido. */
export function computeNetworkPin(entity: PinnableEntity): LatLngPoint | null {
  if (entity.locationDisclosure === "hidden") return null;

  const point = exactPoint(entity);
  if (!point) return null;

  return entity.locationDisclosure === "approximate" ? fuzz(point) : point;
}
