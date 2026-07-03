"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L, { type Layer, type PathOptions } from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { HeatmapResult } from "@/lib/dashboard/types";
import { CODAREA_TO_SIGLA } from "@/lib/geo/uf";

const ACCENT = "126, 155, 92"; // brand-500 #7a9b5c em rgb, pra variar só a opacidade
const NO_DATA_STYLE: PathOptions = { fillColor: "#5c5847", weight: 1, color: "#302e22", fillOpacity: 0.25 };

interface HeatmapWidgetProps {
  data: HeatmapResult;
}

// Ajusta o mapa pro contorno do Brasil sempre que o container montar ou
// mudar de tamanho — sem isso, um zoom/centro fixo deixa o país cortado
// (ou com sobra de espaço) toda vez que o widget não tem exatamente a
// proporção que foi usada pra calibrar o zoom manualmente.
function FitToBrazil({ geo }: { geo: FeatureCollection }) {
  const map = useMap();

  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      const bounds = L.geoJSON(geo).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [8, 8] });
    };
    const t = setTimeout(fit, 150);

    const container = map.getContainer();
    const observer = new ResizeObserver(() => fit());
    observer.observe(container);

    return () => { clearTimeout(t); observer.disconnect(); };
  }, [map, geo]);

  return null;
}

export function HeatmapWidget({ data }: HeatmapWidgetProps) {
  const [estados, setEstados] = useState<FeatureCollection | null>(null);
  const [indicatorKey, setIndicatorKey] = useState(data.indicators[0]?.key);

  useEffect(() => {
    let cancel = false;
    fetch("/geo/brasil-estados.json")
      .then(res => res.json())
      .then(json => { if (!cancel) setEstados(json); })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  // Se o indicador selecionado sumir (config mudou), volta pro primeiro.
  useEffect(() => {
    if (!data.indicators.some(i => i.key === indicatorKey)) {
      setIndicatorKey(data.indicators[0]?.key);
    }
  }, [data.indicators, indicatorKey]);

  const activeKey = indicatorKey ?? data.indicators[0]?.key;
  const byState = activeKey ? (data.byIndicator[activeKey] ?? {}) : {};
  const max = activeKey ? (data.maxByIndicator[activeKey] ?? 0) : 0;

  function styleFeature(feature?: Feature): PathOptions {
    const codarea = feature?.properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? byState[sigla] : undefined;
    if (!stateData || max === 0) return NO_DATA_STYLE;
    const intensity = 0.15 + (stateData.value / max) * 0.75;
    return { fillColor: `rgb(${ACCENT})`, weight: 1, color: "#f5f3ec", fillOpacity: intensity };
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const codarea = feature.properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? byState[sigla] : undefined;
    const content = stateData
      ? `<b>${sigla}</b><br/>${stateData.value.toFixed(1)}${max > 100 ? "" : "%"} · ${stateData.count} resposta${stateData.count === 1 ? "" : "s"}`
      : `<b>${sigla ?? "?"}</b><br/>Sem dados`;
    layer.bindTooltip(content);
  }

  if (!estados) {
    return <div className="w-full h-full flex items-center justify-center text-xs text-ink-300">Carregando mapa...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col gap-1.5">
      {data.indicators.length > 1 && (
        <select value={activeKey} onChange={e => setIndicatorKey(e.target.value)}
          className="flex-shrink-0 text-2xs rounded border px-1.5 py-1 bg-ink-900 border-ink-700 text-ink-100 focus:outline-none">
          {data.indicators.map(ind => <option key={ind.key} value={ind.key}>{ind.label}</option>)}
        </select>
      )}
      <div className="flex-1 min-h-0 rounded-md overflow-hidden">
        <MapContainer center={[-14.235, -51.9253]} zoom={3} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <GeoJSON key={activeKey + JSON.stringify(byState)} data={estados} style={styleFeature} onEachFeature={onEachFeature} />
          <FitToBrazil geo={estados} />
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
