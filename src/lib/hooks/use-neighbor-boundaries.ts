"use client";

import { useEffect, useState } from "react";
import { normalizeBoundaryGeo } from "@/lib/entities/geo-format";
import { extractBoundary, type NeighborBoundary } from "@/lib/entities/boundary-compare";

// Contornos dos territórios/comunidades já cadastrados — alimenta a
// detecção de sobreposição do PolygonMapEditor. Usado na criação
// (entidades/nova) e na edição (entidades/[id]). `excludeId` tira a própria
// entidade da lista na edição. `enabled: false` nem dispara a busca (ex.:
// quando o tipo escolhido não é território/comunidade).
export function useNeighborBoundaries(excludeId: string | null, enabled: boolean): NeighborBoundary[] {
  const [neighbors, setNeighbors] = useState<NeighborBoundary[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const params = excludeId ? `?exclude=${encodeURIComponent(excludeId)}` : "";
    fetch(`/api/entities/boundaries${params}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled || !json?.success || !Array.isArray(json.data)) return;
        const list: NeighborBoundary[] = [];
        for (const row of json.data as { id: string; code: string; name: string; boundaryPolygon: unknown }[]) {
          const boundary = extractBoundary(normalizeBoundaryGeo(row.boundaryPolygon));
          if (boundary) list.push({ id: row.id, code: row.code, name: row.name, boundary });
        }
        setNeighbors(list);
      })
      // O aviso de sobreposição é auxiliar — sem rede, o editor só não avisa.
      .catch(() => {});

    return () => { cancelled = true; };
  }, [excludeId, enabled]);

  return neighbors;
}
