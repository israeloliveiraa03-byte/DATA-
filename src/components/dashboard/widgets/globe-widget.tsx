"use client";

import { useEffect, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { Feature, FeatureCollection } from "geojson";
import type { MapResult, HeatmapResult } from "@/lib/dashboard/types";
import { CODAREA_TO_SIGLA } from "@/lib/geo/uf";

const BRAZIL_VIEW = { lat: -14.235, lng: -51.9253, altitude: 1.7 };
const ACCENT = "126, 155, 92"; // mesmo verde-mata do mapa de calor 2D
const CATEGORY_FALLBACK_COLORS = ["#c48a42", "#4c6b3c", "#1a56db", "#7a5218", "#c0392b", "#534ab7"];

// Container tem tamanho próprio (não segue automaticamente o pai como o
// Leaflet) — mede via ResizeObserver, mesmo cuidado já usado no mapa 2D
// pra não ficar cortado/0x0 dentro do grid do dashboard.
function useContainerSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

interface GlobePointsProps {
  data: MapResult;
}

export function GlobePointsWidget({ data }: GlobePointsProps) {
  const { ref, size } = useContainerSize();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  useEffect(() => {
    globeRef.current?.pointOfView(BRAZIL_VIEW, 0);
  }, []);

  function colorFor(categoryValue: string | undefined) {
    if (!categoryValue || !data.categories) return "#7a9b5c";
    const idx = data.categories.findIndex(c => c.id === categoryValue);
    return data.categoryStyles?.[categoryValue]?.color ?? CATEGORY_FALLBACK_COLORS[idx % CATEGORY_FALLBACK_COLORS.length];
  }

  return (
    <div ref={ref} className="w-full h-full rounded-md overflow-hidden" style={{ background: "#0b1220" }}>
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="#0b1220"
          showAtmosphere
          atmosphereColor="#7a9b5c"
          pointsData={data.points}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.015}
          pointRadius={0.35}
          pointColor={(p: object) => colorFor((p as MapResult["points"][number]).categoryValue)}
          pointLabel={(p: object) => (p as MapResult["points"][number]).label}
        />
      )}
    </div>
  );
}

interface GlobeHeatmapProps {
  data: HeatmapResult;
}

export function GlobeHeatmapWidget({ data }: GlobeHeatmapProps) {
  const { ref, size } = useContainerSize();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [estados, setEstados] = useState<FeatureCollection | null>(null);
  const [indicatorKey, setIndicatorKey] = useState(data.indicators[0]?.key);

  useEffect(() => {
    let cancel = false;
    fetch("/geo/brasil-estados.json").then(res => res.json()).then(json => { if (!cancel) setEstados(json); }).catch(() => {});
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    globeRef.current?.pointOfView(BRAZIL_VIEW, 0);
  }, [estados]);

  useEffect(() => {
    if (!data.indicators.some(i => i.key === indicatorKey)) setIndicatorKey(data.indicators[0]?.key);
  }, [data.indicators, indicatorKey]);

  const activeKey = indicatorKey ?? data.indicators[0]?.key;
  const byState = activeKey ? (data.byIndicator[activeKey] ?? {}) : {};
  const max = activeKey ? (data.maxByIndicator[activeKey] ?? 0) : 0;

  function capColor(feature: object) {
    const codarea = (feature as Feature).properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? byState[sigla] : undefined;
    if (!stateData || max === 0) return "rgba(92, 88, 71, 0.5)";
    const intensity = 0.25 + (stateData.value / max) * 0.7;
    return `rgba(${ACCENT}, ${intensity.toFixed(2)})`;
  }

  function labelFor(feature: object) {
    const codarea = (feature as Feature).properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? byState[sigla] : undefined;
    return stateData ? `<b>${sigla}</b><br/>${stateData.value.toFixed(1)}${max > 100 ? "" : "%"}` : `<b>${sigla ?? "?"}</b><br/>Sem dados`;
  }

  return (
    <div className="w-full h-full flex flex-col gap-1.5">
      {data.indicators.length > 1 && (
        <select value={activeKey} onChange={e => setIndicatorKey(e.target.value)}
          className="flex-shrink-0 text-2xs rounded px-1.5 py-1 focus:outline-none"
          style={{ border: "1px solid #e8d8be", background: "#fff", color: "#5c3f13" }}>
          {data.indicators.map(ind => <option key={ind.key} value={ind.key}>{ind.label}</option>)}
        </select>
      )}
      <div ref={ref} className="flex-1 min-h-0 rounded-md overflow-hidden" style={{ background: "#0b1220" }}>
        {size.width > 0 && estados && (
          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="#0b1220"
            showAtmosphere
            atmosphereColor="#7a9b5c"
            polygonsData={estados.features}
            polygonCapColor={capColor}
            polygonSideColor={() => "rgba(48, 46, 34, 0.3)"}
            polygonStrokeColor={() => "#f5f3ec"}
            polygonAltitude={0.01}
            polygonLabel={labelFor}
          />
        )}
      </div>
    </div>
  );
}
