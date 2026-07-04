"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { MapResult } from "@/lib/dashboard/types";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];

// Paleta padrão pra categoria sem cor escolhida no editor — mesmo espírito
// terracota/verde-mata do resto do produto.
const CATEGORY_FALLBACK_COLORS = ["#c48a42", "#4c6b3c", "#1a56db", "#7a5218", "#c0392b", "#534ab7"];

function categoryIcon(iconName: string | undefined, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.35);border:1.5px solid #fff;">
      <i class="ti ti-${iconName || "map-pin"}" style="color:#fff;font-size:14px;"></i>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

interface MapWidgetProps {
  data: MapResult;
}

function FitToPoints({ points }: { points: MapResult["points"] }) {
  const map = useMap();
  useEffect(() => {
    // Leaflet às vezes calcula tamanho 0x0 no primeiro paint quando o
    // container pai é posicionado via `absolute` (caso do grid do
    // dashboard) — recalcula no mount E sempre que o container mudar de
    // tamanho de verdade (resize no builder, etc.), senão o mapa fica
    // cortado quando o widget é redimensionado depois do primeiro render.
    const fit = () => {
      map.invalidateSize();
      if (points.length === 0) return;
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 10);
        return;
      }
      const bounds: [number, number][] = points.map(p => [p.lat, p.lng]);
      map.fitBounds(bounds, { padding: [24, 24] });
    };
    const t = setTimeout(fit, 150);

    const container = map.getContainer();
    const observer = new ResizeObserver(() => fit());
    observer.observe(container);

    return () => { clearTimeout(t); observer.disconnect(); };
  }, [map, points]);
  return null;
}

export function MapWidget({ data }: MapWidgetProps) {
  const hasCategories = !!data.categories && data.categories.length > 0;

  function styleFor(optionId: string | undefined, index: number) {
    const fallback = CATEGORY_FALLBACK_COLORS[index % CATEGORY_FALLBACK_COLORS.length];
    if (!optionId) return { color: fallback, icon: undefined };
    const configured = data.categoryStyles?.[optionId];
    return { color: configured?.color ?? fallback, icon: configured?.icon };
  }

  return (
    <div className="w-full h-full flex flex-col gap-1.5">
      <div className="flex-1 min-h-0 rounded-md overflow-hidden">
        <MapContainer center={BRAZIL_CENTER} zoom={4} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitToPoints points={data.points} />
          {data.points.map((p, i) => {
            if (!hasCategories) {
              return (
                <CircleMarker key={i} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: "#4c6539", fillColor: "#7a9b5c", fillOpacity: 0.85, weight: 1.5 }}>
                  <Tooltip>{p.label}</Tooltip>
                </CircleMarker>
              );
            }
            const catIndex = data.categories!.findIndex(c => c.id === p.categoryValue);
            const { color, icon } = styleFor(p.categoryValue, catIndex);
            return (
              <Marker key={i} position={[p.lat, p.lng]} icon={categoryIcon(icon, color)}>
                <Tooltip>{p.label}{p.categoryValue ? ` · ${data.categories!.find(c => c.id === p.categoryValue)?.label ?? p.categoryValue}` : ""}</Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      {hasCategories && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center px-1 flex-shrink-0">
          {data.categories!.map((c, i) => {
            const { color } = styleFor(c.id, i);
            return (
              <span key={c.id} className="flex items-center gap-1 text-2xs" style={{ color: "#5c3f13" }}>
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                {c.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
