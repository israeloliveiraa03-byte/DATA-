import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { findBoundaryFeature } from "./geo-format";

// Utilitários puros de comparação geométrica (turf, sem Leaflet) — usados
// pela comparação de versões de território (entidade-detail-client) e pela
// detecção de sobreposição entre territórios vizinhos (polygon-map-editor).

export type BoundaryFeature = Feature<Polygon | MultiPolygon>;

// Cores fixas da comparação de versões (semântica do dado, não tema):
// A = versão mais antiga (âmbar, traço tracejado), B = mais recente (verde,
// traço sólido). Ficam aqui — e não no componente de mapa — porque a legenda
// é renderizada fora do mapa e o componente de mapa importa Leaflet (só pode
// ser carregado via next/dynamic({ ssr: false })).
export const COMPARE_COLOR_A = "#d99a3d";
export const COMPARE_COLOR_B = "#4c9a5f";

function isPolygonal(f: Feature | undefined | null): f is BoundaryFeature {
  return !!f && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon");
}

// O contorno principal é a feição com properties.role === "boundary"; se a
// FeatureCollection veio de uma versão antiga ou de um GeoJSON importado sem
// esse papel marcado, cai no primeiro polígono que existir.
export function extractBoundary(fc: FeatureCollection): BoundaryFeature | null {
  const marked = findBoundaryFeature(fc);
  if (isPolygonal(marked)) return marked;
  const firstPolygon = fc.features.find(isPolygonal);
  return firstPolygon ?? null;
}

export function areaHa(feature: BoundaryFeature): number {
  try {
    return turf.area(feature) / 10000;
  } catch {
    return 0;
  }
}

export function formatHa(ha: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: ha < 10 ? 2 : 1 }).format(ha)} ha`;
}

export interface BoundaryComparison {
  areaAHa:  number;
  areaBHa:  number;
  deltaHa:  number;   // areaB - areaA (positivo = cresceu de A pra B)
  deltaPct: number | null; // null quando A tem área zero (divisão por zero)
  identical: boolean; // geometria exatamente igual (nada mudou no contorno)
}

export function compareBoundaries(a: BoundaryFeature, b: BoundaryFeature): BoundaryComparison {
  const areaAHa = areaHa(a);
  const areaBHa = areaHa(b);
  const deltaHa = areaBHa - areaAHa;
  return {
    areaAHa,
    areaBHa,
    deltaHa,
    deltaPct: areaAHa > 0 ? (deltaHa / areaAHa) * 100 : null,
    identical: JSON.stringify(a.geometry) === JSON.stringify(b.geometry),
  };
}

// ---------------------------------------------------------------------------
// Sobreposição entre territórios vizinhos

export interface NeighborBoundary {
  id:   string;
  code: string;
  name: string;
  boundary: BoundaryFeature;
}

export interface OverlapResult {
  neighbor:     NeighborBoundary;
  intersection: BoundaryFeature;
  areaHa:       number;
}

// Sobreposições menores que isso são ruído de traçado (limites vizinhos
// desenhados quase colados), não conflito territorial de verdade.
const MIN_OVERLAP_M2 = 500;

function bboxesIntersect(a: BoundaryFeature, b: BoundaryFeature): boolean {
  try {
    const [ax1, ay1, ax2, ay2] = turf.bbox(a);
    const [bx1, by1, bx2, by2] = turf.bbox(b);
    return ax1 <= bx2 && bx1 <= ax2 && ay1 <= by2 && by1 <= ay2;
  } catch {
    return false;
  }
}

// Cruza o contorno atual com cada território vizinho já cadastrado.
// Pré-filtro barato por bounding box; só roda a interseção real (cara)
// nos candidatos que passam. Erros de geometria inválida (auto-interseção
// etc.) são engolidos por vizinho — um polígono ruim não derruba o aviso
// dos demais.
export function computeOverlaps(current: BoundaryFeature | null, neighbors: NeighborBoundary[]): OverlapResult[] {
  if (!current) return [];
  const results: OverlapResult[] = [];
  for (const neighbor of neighbors) {
    if (!bboxesIntersect(current, neighbor.boundary)) continue;
    try {
      const intersection = turf.intersect(turf.featureCollection([current, neighbor.boundary]));
      if (!intersection) continue;
      const m2 = turf.area(intersection);
      if (m2 < MIN_OVERLAP_M2) continue;
      results.push({ neighbor, intersection, areaHa: m2 / 10000 });
    } catch {
      continue;
    }
  }
  return results.sort((a, b) => b.areaHa - a.areaHa);
}
