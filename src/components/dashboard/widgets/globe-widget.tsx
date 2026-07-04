"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { Feature, FeatureCollection } from "geojson";
import type { ColorPalette, MapResult, HeatmapResult } from "@/lib/dashboard/types";
import { COLOR_PALETTES } from "@/lib/dashboard/types";
import { CODAREA_TO_SIGLA } from "@/lib/geo/uf";

// Altitude maior que o mapa 2D de propósito — precisa sobrar globo/espaço
// ao redor do Brasil pra ficar claro que é um planeta, não só uma forma
// colorida numa bola (era a queixa: "parece só o mapa do Brasil numa bola").
const BRAZIL_VIEW = { lat: -14.235, lng: -51.9253, altitude: 2.3 };
const EARTH_TEXTURE = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const EARTH_BUMP = "https://unpkg.com/three-globe/example/img/earth-topology.png";
const STARFIELD = "https://unpkg.com/three-globe/example/img/night-sky.png";

// Giro lento e contínuo é o que mais vende "isso é um planeta 3D" à primeira
// vista — para assim que o usuário interage (arrasta/dá zoom) e não volta
// sozinho, pra não brigar com quem tá tentando olhar um ponto específico.
function useAutoRotate(globeRef: RefObject<GlobeMethods | undefined>, ready: boolean) {
  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    const stop = () => { controls.autoRotate = false; };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [ready, globeRef]);
}

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
  palette?: ColorPalette;
}

export function GlobePointsWidget({ data, palette }: GlobePointsProps) {
  const colors = (palette ?? COLOR_PALETTES.terracota).chartColors;
  const { ref, size } = useContainerSize();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const hasCategories = !!data.categories && data.categories.length > 0;

  useEffect(() => {
    globeRef.current?.pointOfView(BRAZIL_VIEW, 0);
  }, []);
  useAutoRotate(globeRef, size.width > 0);

  function colorFor(categoryValue: string | undefined) {
    if (!categoryValue || !data.categories) return colors[0];
    const idx = data.categories.findIndex(c => c.id === categoryValue);
    return data.categoryStyles?.[categoryValue]?.color ?? colors[idx % colors.length];
  }

  return (
    <div className="w-full h-full flex flex-col gap-1.5">
      <div ref={ref} className="flex-1 min-h-0 rounded-md overflow-hidden" style={{ background: "#0b1220" }}>
        {size.width > 0 && (
          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            globeImageUrl={EARTH_TEXTURE}
            bumpImageUrl={EARTH_BUMP}
            backgroundImageUrl={STARFIELD}
            showAtmosphere
            atmosphereColor="#8fb37a"
            atmosphereAltitude={0.18}
            pointsData={data.points}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={0.02}
            pointRadius={0.4}
            pointColor={(p: object) => colorFor((p as MapResult["points"][number]).categoryValue)}
            pointLabel={(p: object) => (p as MapResult["points"][number]).label}
          />
        )}
      </div>
      {hasCategories && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center px-1 flex-shrink-0">
          {data.categories!.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1 text-2xs" style={{ color: "#5c3f13" }}>
              <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: data.categoryStyles?.[c.id]?.color ?? colors[i % colors.length] }} />
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface GlobeHeatmapProps {
  data: HeatmapResult;
  palette?: ColorPalette;
}

export function GlobeHeatmapWidget({ data, palette }: GlobeHeatmapProps) {
  const ACCENT = (palette ?? COLOR_PALETTES.terracota).accent;
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
  useAutoRotate(globeRef, size.width > 0 && !!estados);

  useEffect(() => {
    if (!data.indicators.some(i => i.key === indicatorKey)) setIndicatorKey(data.indicators[0]?.key);
  }, [data.indicators, indicatorKey]);

  const activeKey = indicatorKey ?? data.indicators[0]?.key;
  const byState = activeKey ? (data.byIndicator[activeKey] ?? {}) : {};
  const max = activeKey ? (data.maxByIndicator[activeKey] ?? 0) : 0;

  // Sem dado ainda é comum (pesquisa em andamento) — deixa translúcido em vez
  // de um grude cinza escuro cobrindo o país inteiro, senão o globo fica sem
  // graça justo quando tem pouco dado.
  function capColor(feature: object) {
    const codarea = (feature as Feature).properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? byState[sigla] : undefined;
    if (!stateData || max === 0) return "rgba(92, 88, 71, 0.18)";
    const intensity = 0.3 + (stateData.value / max) * 0.65;
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
            globeImageUrl={EARTH_TEXTURE}
            bumpImageUrl={EARTH_BUMP}
            backgroundImageUrl={STARFIELD}
            showAtmosphere
            atmosphereColor="#8fb37a"
            atmosphereAltitude={0.18}
            polygonsData={estados.features}
            polygonCapColor={capColor}
            polygonSideColor={() => "rgba(48, 46, 34, 0.25)"}
            polygonStrokeColor={() => "#f5f3ec"}
            polygonAltitude={0.01}
            polygonLabel={labelFor}
          />
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 px-1">
        <span className="text-2xs" style={{ color: "#a06d28" }}>0{max > 100 ? "" : "%"}</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, rgba(${ACCENT},0.15), rgba(${ACCENT},0.9))` }} />
        <span className="text-2xs font-semibold" style={{ color: "#5c3f13" }}>{max > 100 ? `${Math.round(max)} respostas` : `${max.toFixed(0)}%`}</span>
      </div>
    </div>
  );
}
