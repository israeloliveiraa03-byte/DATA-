"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, CircleMarker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix conhecido: os ícones padrão do Leaflet quebram sob bundlers (Webpack/Turbopack)
// porque resolvem os assets via URL relativa ao CSS, não ao bundle. Servimos via CDN.
// (Mesmo tratamento do PolygonMapEditor em src/components/entities/polygon-map-editor.tsx.)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type LatLng = { lat: number; lng: number };

// Resposta gravada em responses.data: ponto único ou polígono desenhado pelo respondente
export type GeoMapAnswer =
  | { kind: "point"; lat: number; lng: number }
  | { kind: "area"; points: LatLng[] };

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];

function ClickCapture({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) { onClick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

export default function GeoMapField({ mode, value, onChange }: {
  mode: "point" | "area" | "both";
  value: unknown;
  onChange: (val: Record<string, unknown> | null) => void;
}) {
  const answer = (value ?? null) as GeoMapAnswer | null;
  const [drawKind, setDrawKind] = useState<"point" | "area">(
    mode === "area" || answer?.kind === "area" ? "area" : "point"
  );
  const BRD = "1px solid #e8d8be";

  function handleClick(p: LatLng) {
    const point = { lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) };
    if (drawKind === "point") {
      onChange({ kind: "point", ...point });
    } else {
      const prev = answer?.kind === "area" ? answer.points : [];
      onChange({ kind: "area", points: [...prev, point] });
    }
  }

  const areaPoints = answer?.kind === "area" ? answer.points : [];

  return (
    <div>
      {mode === "both" && (
        <div className="flex gap-2 mb-2">
          {([
            { k: "point" as const, label: "Marcar ponto",  icon: "ti-map-pin" },
            { k: "area"  as const, label: "Desenhar área", icon: "ti-vector-triangle" },
          ]).map(b => (
            <button key={b.k} type="button"
              onClick={() => { setDrawKind(b.k); onChange(null); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                border: drawKind === b.k ? "2px solid #c48a42" : BRD,
                background: drawKind === b.k ? "#fbf3e7" : "#fff",
                color: drawKind === b.k ? "#7a5218" : "#5c3f13",
              }}>
              <i className={`ti ${b.icon}`} /> {b.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ border: BRD, height: 280 }}>
        <MapContainer center={BRAZIL_CENTER} zoom={4} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCapture onClick={handleClick} />
          {answer?.kind === "point" && <Marker position={[answer.lat, answer.lng]} />}
          {areaPoints.length >= 3 && (
            <Polygon positions={areaPoints.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#c48a42", fillColor: "#c48a42", fillOpacity: 0.2 }} />
          )}
          {areaPoints.length > 0 && areaPoints.length < 3 && (
            <Polyline positions={areaPoints.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#c48a42" }} />
          )}
          {areaPoints.map((p, i) => (
            <CircleMarker key={i} center={[p.lat, p.lng]} radius={5}
              pathOptions={{ color: "#7a5218", fillColor: "#c48a42", fillOpacity: 1 }} />
          ))}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs" style={{ color: "#a06d28" }}>
          {drawKind === "point"
            ? answer?.kind === "point"
              ? `Ponto marcado: ${answer.lat}, ${answer.lng}`
              : "Toque no mapa para marcar o ponto"
            : areaPoints.length === 0
              ? "Toque no mapa para adicionar os vértices da área"
              : `${areaPoints.length} ponto${areaPoints.length > 1 ? "s" : ""} — ${areaPoints.length < 3 ? "adicione pelo menos 3" : "área desenhada"}`}
        </p>
        {answer && (
          <button type="button" onClick={() => onChange(null)}
            className="text-xs font-semibold" style={{ color: "#c0392b" }}>
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
