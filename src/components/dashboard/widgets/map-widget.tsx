"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, CircleMarker, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { ColorPalette, MapResult } from "@/lib/dashboard/types";
import { COLOR_PALETTES } from "@/lib/dashboard/types";
import { BasemapLayers, ScrollZoomOnFocus } from "./map-common";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];

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
  palette?: ColorPalette;
  basemap?: string;
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

export function MapWidget({ data, palette, basemap }: MapWidgetProps) {
  const colors = (palette ?? COLOR_PALETTES.terracota).chartColors;
  const hasCategories = !!data.categories && data.categories.length > 0;

  // Filtro por categoria: clicar num item da legenda esconde/mostra os
  // marcadores daquela opção (estado local do leitor, não é config salva).
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  function toggleCategory(id: string) {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of data.points) {
      if (p.categoryValue) counts[p.categoryValue] = (counts[p.categoryValue] ?? 0) + 1;
    }
    return counts;
  }, [data.points]);

  const visiblePoints = hasCategories
    ? data.points.filter(p => !p.categoryValue || !hiddenCategories.has(p.categoryValue))
    : data.points;

  function styleFor(optionId: string | undefined, index: number) {
    const fallback = colors[index % colors.length];
    if (!optionId) return { color: fallback, icon: undefined };
    const configured = data.categoryStyles?.[optionId];
    return { color: configured?.color ?? fallback, icon: configured?.icon };
  }

  return (
    <div className="w-full h-full flex flex-col gap-1.5">
      <div className="flex-1 min-h-0 rounded-md overflow-hidden">
        {/* scrollWheelZoom nasce desligado e é ligado pelo ScrollZoomOnFocus
            no primeiro clique/toque — os botões +/- do Leaflet ficam sempre
            visíveis (zoomControl é o padrão, dentro do próprio container do
            mapa, então o overflow-hidden do widget não corta eles). */}
        <MapContainer center={BRAZIL_CENTER} zoom={4} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <BasemapLayers defaultBasemap={basemap} />
          <ScrollZoomOnFocus />
          {/* Enquadramento usa o conjunto completo de pontos (não o filtrado)
              de propósito: o mapa não "pula" a cada clique na legenda. */}
          <FitToPoints points={data.points} />
          {visiblePoints.map((p, i) => {
            if (!hasCategories) {
              return (
                <CircleMarker key={i} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: colors[0], fillColor: colors[0], fillOpacity: 0.85, weight: 1.5 }}>
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
      {/* Legenda sempre presente: com categorias vira filtro clicável (com
          contagem por opção); sem categoria, mostra o total de pontos. */}
      {hasCategories ? (
        <div className="flex flex-wrap gap-1 justify-center px-1 flex-shrink-0">
          {data.categories!.map((c, i) => {
            const { color } = styleFor(c.id, i);
            const hidden = hiddenCategories.has(c.id);
            return (
              <button key={c.id} onClick={() => toggleCategory(c.id)}
                title={hidden ? "Mostrar esta categoria" : "Ocultar esta categoria"}
                className="flex items-center gap-1 text-2xs rounded-full px-2 py-0.5 transition-all"
                style={{
                  color: "#5c3f13",
                  border: "1px solid #e8d8be",
                  background: hidden ? "transparent" : "#fdfaf4",
                  opacity: hidden ? 0.45 : 1,
                  textDecoration: hidden ? "line-through" : "none",
                }}>
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                {c.label}
                <span style={{ color: "#a06d28" }}>{countByCategory[c.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex justify-center px-1 flex-shrink-0">
          <span className="flex items-center gap-1 text-2xs rounded-full px-2 py-0.5"
            style={{ color: "#5c3f13", border: "1px solid #e8d8be", background: "#fdfaf4" }}>
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[0] }} />
            {data.points.length} ponto{data.points.length === 1 ? "" : "s"} coletado{data.points.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
