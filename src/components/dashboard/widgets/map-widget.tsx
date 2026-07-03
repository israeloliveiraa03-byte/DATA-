"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { MapResult } from "@/lib/dashboard/types";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];

interface MapWidgetProps {
  data: MapResult;
}

function FitToPoints({ points }: { points: MapResult["points"] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 10);
      return;
    }
    const bounds: [number, number][] = points.map(p => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, points]);
  return null;
}

export function MapWidget({ data }: MapWidgetProps) {
  return (
    <div className="w-full h-full rounded-md overflow-hidden">
      <MapContainer center={BRAZIL_CENTER} zoom={4} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitToPoints points={data.points} />
        {data.points.map((p, i) => (
          <CircleMarker key={i} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: "#4c6539", fillColor: "#7a9b5c", fillOpacity: 0.85, weight: 1.5 }}>
            <Tooltip>{p.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
