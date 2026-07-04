import type { Feature, FeatureCollection, Polygon } from "geojson";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

// Feição com esse papel é o contorno principal do território — a mini-
// pesquisa de campo (campo-client.tsx) substitui só essa feição ao salvar,
// preservando outras feições marcadas (pontos de interesse) no editor de mesa.
export const BOUNDARY_ROLE = "boundary";

// Entidades criadas antes desta mudança guardam `boundaryPolygon` como um
// array simples {lat,lng}[] (um polígono só, sem GeoJSON de verdade). Essa
// função detecta o formato antigo e converte pra uma FeatureCollection com
// um único Feature Polygon marcado como contorno principal — sem precisar
// rodar nenhuma migração de dado, cada entidade antiga se normaliza sozinha
// na leitura.
export function normalizeBoundaryGeo(raw: unknown): FeatureCollection {
  if (!raw) return { type: "FeatureCollection", features: [] };

  if (Array.isArray(raw)) {
    const points = raw as LatLngPoint[];
    if (points.length < 3) return { type: "FeatureCollection", features: [] };

    const ring = points.map(p => [p.lng, p.lat]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);

    const feature: Feature<Polygon> = {
      type: "Feature",
      properties: { role: BOUNDARY_ROLE },
      geometry: { type: "Polygon", coordinates: [ring] },
    };
    return { type: "FeatureCollection", features: [feature] };
  }

  const candidate = raw as FeatureCollection;
  if (candidate.type === "FeatureCollection" && Array.isArray(candidate.features)) {
    return candidate;
  }

  return { type: "FeatureCollection", features: [] };
}

export function findBoundaryFeature(fc: FeatureCollection): Feature | undefined {
  return fc.features.find(f => f.properties?.role === BOUNDARY_ROLE);
}

// Usado pela mini-pesquisa de campo: troca só o contorno principal, mantém
// as demais feições (pontos de interesse etc.) que já estavam salvas.
export function replaceBoundaryFeature(fc: FeatureCollection, boundaryFeature: Feature): FeatureCollection {
  const others = fc.features.filter(f => f.properties?.role !== BOUNDARY_ROLE);
  return { type: "FeatureCollection", features: [boundaryFeature, ...others] };
}
