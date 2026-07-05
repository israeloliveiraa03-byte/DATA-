"use client";

// Mapa de comparação entre duas versões do contorno de um território —
// somente leitura, sem ferramentas de desenho. Carregar sempre via
// next/dynamic({ ssr: false }) (Leaflet acessa `window`).

import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";
import { COMPARE_COLOR_A, COMPARE_COLOR_B, type BoundaryFeature } from "@/lib/entities/boundary-compare";

function FitToBoth({ a, b }: { a: BoundaryFeature; b: BoundaryFeature }) {
  const map = useMap();
  useEffect(() => {
    try {
      const [x1, y1, x2, y2] = turf.bbox(turf.featureCollection([a, b]));
      map.fitBounds([[y1, x1], [y2, x2]], { padding: [24, 24], maxZoom: 15 });
    } catch {
      // bbox inválida — mantém a visão padrão
    }
  }, [map, a, b]);
  return null;
}

interface BoundaryCompareMapProps {
  a: BoundaryFeature;
  b: BoundaryFeature;
  // Identificadores das versões escolhidas — o componente GeoJSON do
  // react-leaflet só lê `data` na montagem, então trocamos a `key` pra
  // forçar redesenho quando o usuário muda a versão comparada.
  aKey: string;
  bKey: string;
}

export function BoundaryCompareMap({ a, b, aKey, bKey }: BoundaryCompareMapProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-ink-700" style={{ height: 360 }}>
      <MapContainer center={[-14.235, -51.9253]} zoom={4} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          key={`a-${aKey}`}
          data={a}
          style={{ color: COMPARE_COLOR_A, weight: 2.5, dashArray: "8 6", fillColor: COMPARE_COLOR_A, fillOpacity: 0.12 }}
        />
        <GeoJSON
          key={`b-${bKey}`}
          data={b}
          style={{ color: COMPARE_COLOR_B, weight: 2.5, fillColor: COMPARE_COLOR_B, fillOpacity: 0.16 }}
        />
        <FitToBoth a={a} b={b} />
      </MapContainer>
    </div>
  );
}
