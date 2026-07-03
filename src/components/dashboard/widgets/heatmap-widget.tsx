"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { HeatmapResult } from "@/lib/dashboard/types";
import { CODAREA_TO_SIGLA } from "@/lib/geo/uf";

const ACCENT = "126, 155, 92"; // brand-500 #7a9b5c em rgb, pra variar só a opacidade
const NO_DATA_STYLE: PathOptions = { fillColor: "#5c5847", weight: 1, color: "#302e22", fillOpacity: 0.25 };

interface HeatmapWidgetProps {
  data: HeatmapResult;
}

// Leaflet às vezes calcula tamanho 0x0 no primeiro paint quando o container
// pai é posicionado via `absolute` (caso do grid do dashboard) — força
// recalcular o tamanho logo depois de montar, senão o mapa fica em branco.
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export function HeatmapWidget({ data }: HeatmapWidgetProps) {
  const [estados, setEstados] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch("/geo/brasil-estados.json")
      .then(res => res.json())
      .then(json => { if (!cancel) setEstados(json); })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  function styleFeature(feature?: Feature): PathOptions {
    const codarea = feature?.properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? data.byState[sigla] : undefined;
    if (!stateData || data.max === 0) return NO_DATA_STYLE;
    const intensity = 0.15 + (stateData.value / data.max) * 0.75;
    return { fillColor: `rgb(${ACCENT})`, weight: 1, color: "#f5f3ec", fillOpacity: intensity };
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const codarea = feature.properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? data.byState[sigla] : undefined;
    const content = stateData
      ? `<b>${sigla}</b><br/>${stateData.value.toFixed(1)}${data.max > 100 ? "" : "%"} · ${stateData.count} resposta${stateData.count === 1 ? "" : "s"}`
      : `<b>${sigla ?? "?"}</b><br/>Sem dados`;
    layer.bindTooltip(content);
  }

  if (!estados) {
    return <div className="w-full h-full flex items-center justify-center text-xs text-ink-300">Carregando mapa...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col gap-1.5">
      <div className="flex-1 min-h-0 rounded-md overflow-hidden">
        <MapContainer center={[-14.235, -51.9253]} zoom={3} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <GeoJSON key={JSON.stringify(data.byState)} data={estados} style={styleFeature} onEachFeature={onEachFeature} />
          <InvalidateSizeOnMount />
        </MapContainer>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 px-1">
        <span className="text-2xs text-ink-300">Baixo</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, rgba(${ACCENT},0.15), rgba(${ACCENT},0.9))` }} />
        <span className="text-2xs text-ink-300">Alto</span>
      </div>
    </div>
  );
}
