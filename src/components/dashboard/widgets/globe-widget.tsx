"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { Feature, FeatureCollection } from "geojson";
import type { ColorPalette, MapResult, HeatmapResult } from "@/lib/dashboard/types";
import { COLOR_PALETTES } from "@/lib/dashboard/types";
import { CODAREA_TO_SIGLA } from "@/lib/geo/uf";

function clamp(n: number, min: number, max: number) { return Math.min(Math.max(n, min), max); }

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
  const [rotating, setRotating] = useState(true);
  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = rotating;
    controls.autoRotateSpeed = 0.6;
    const stop = () => { controls.autoRotate = false; setRotating(false); };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [ready, globeRef, rotating]);
  return { rotating, toggleRotate: () => setRotating(r => !r) };
}

// Céu do globo: estrelas (padrão), transparente ("none" — aparece o fundo do
// widget, ex.: um PNG da identidade) ou uma imagem própria.
function skyProps(skyImage: string | undefined) {
  if (skyImage === "none") return { backgroundColor: "rgba(0,0,0,0)", backgroundImageUrl: undefined, containerBg: "transparent" };
  if (skyImage) return { backgroundColor: "#0b1220", backgroundImageUrl: skyImage, containerBg: "#0b1220" };
  return { backgroundColor: "#0b1220", backgroundImageUrl: STARFIELD, containerBg: "#0b1220" };
}

// Zoom explícito (+/-/recentrar) — não depender só do gesto de scroll.
// OrbitControls (three.js, por baixo do react-globe.gl) já vem com
// enableZoom=true e o próprio listener de wheel chama preventDefault (não é
// passivo), então em teoria o scroll já devia zoomar sem competir com o
// scroll da página. Mas Israel reportou que não funciona ao vivo — sem
// print/reprodução ao vivo pra confirmar a causa exata (poderia ser o
// widget disputando o wheel com o scroll do dashboard-builder, ou o
// event listener não estar montado a tempo), o fallback seguro é garantir
// um jeito de zoom que NUNCA depende do wheel: manipula a câmera direto via
// pointOfView (mesma função usada pra centralizar no Brasil no mount).
function useZoomControls(globeRef: RefObject<GlobeMethods | undefined>) {
  const zoomBy = useCallback((factor: number) => {
    const g = globeRef.current;
    if (!g) return;
    const current = g.pointOfView();
    g.pointOfView({ altitude: clamp(current.altitude * factor, 0.35, 4.2) }, 300);
  }, [globeRef]);
  const reset = useCallback(() => { globeRef.current?.pointOfView(BRAZIL_VIEW, 500); }, [globeRef]);
  return { zoomIn: () => zoomBy(0.7), zoomOut: () => zoomBy(1.4), reset };
}

// Botões flutuantes no canto do globo — mesmo papel dos +/- do Leaflet
// (sempre visíveis, nunca só o gesto). Fundo translúcido escuro porque o
// globo tem céu estrelado atrás, diferente do mapa 2D claro.
function ZoomControls({ onZoomIn, onZoomOut, onReset, rotating, onToggleRotate, extruded, onToggleExtrude, extrudeLabel }: {
  onZoomIn: () => void; onZoomOut: () => void; onReset: () => void;
  rotating?: boolean; onToggleRotate?: () => void;
  extruded?: boolean; onToggleExtrude?: () => void; extrudeLabel?: [string, string];
}) {
  const btn = "w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors";
  const style = { background: "rgba(20,20,15,0.72)", color: "#f0e4cf", border: "1px solid rgba(232,216,190,0.25)" };
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
      <button onClick={onZoomIn} title="Aproximar" aria-label="Aproximar" className={btn} style={style}><i className="ti ti-zoom-in" /></button>
      <button onClick={onZoomOut} title="Afastar" aria-label="Afastar" className={btn} style={style}><i className="ti ti-zoom-out" /></button>
      <button onClick={onReset} title="Recentralizar no Brasil" aria-label="Recentralizar no Brasil" className={btn} style={style}><i className="ti ti-focus-centered" /></button>
      {onToggleRotate && (
        <button onClick={onToggleRotate} aria-pressed={!!rotating} title={rotating ? "Parar rotação" : "Girar o globo"} aria-label={rotating ? "Parar rotação" : "Girar o globo"} className={btn} style={style}>
          <i className={`ti ${rotating ? "ti-player-pause" : "ti-rotate-360"}`} />
        </button>
      )}
      {onToggleExtrude && (
        <button onClick={onToggleExtrude} aria-pressed={!!extruded} title={extruded ? extrudeLabel?.[1] : extrudeLabel?.[0]} aria-label={extruded ? extrudeLabel?.[1] : extrudeLabel?.[0]} className={btn} style={style}>
          <i className={`ti ${extruded ? "ti-square" : "ti-box"}`} />
        </button>
      )}
    </div>
  );
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
  skyImage?: string;
  /** Colunas 3D de densidade (hexágonos) em vez de pontos — só sem categorias. */
  extrude?: boolean;
}

export function GlobePointsWidget({ data, palette, skyImage, extrude = true }: GlobePointsProps) {
  const colors = (palette ?? COLOR_PALETTES.terracota).chartColors;
  const { ref, size } = useContainerSize();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const hasCategories = !!data.categories && data.categories.length > 0;
  const { zoomIn, zoomOut, reset } = useZoomControls(globeRef);

  useEffect(() => {
    globeRef.current?.pointOfView(BRAZIL_VIEW, 0);
  }, []);
  const { rotating, toggleRotate } = useAutoRotate(globeRef, size.width > 0);
  // Colunas de densidade fazem sentido quando não há categoria (todas as
  // respostas são a mesma "coisa"); com categorias, os pontos coloridos dizem mais.
  const [columns, setColumns] = useState(extrude && !hasCategories);
  useEffect(() => { setColumns(extrude && !hasCategories); }, [extrude, hasCategories]);
  const sky = skyProps(skyImage);
  const accentRgb = (palette ?? COLOR_PALETTES.terracota).accent;
  const maxHex = Math.max(1, data.points.length / 8);

  function colorFor(categoryValue: string | undefined) {
    if (!categoryValue || !data.categories) return colors[0];
    const idx = data.categories.findIndex(c => c.id === categoryValue);
    return data.categoryStyles?.[categoryValue]?.color ?? colors[idx % colors.length];
  }

  return (
    <div className="w-full h-full flex flex-col gap-1.5">
      <div ref={ref} className="relative flex-1 min-h-0 rounded-md overflow-hidden" style={{ background: sky.containerBg }}>
        {size.width > 0 && (
          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            globeImageUrl={EARTH_TEXTURE}
            bumpImageUrl={EARTH_BUMP}
            backgroundImageUrl={sky.backgroundImageUrl}
            backgroundColor={sky.backgroundColor}
            showAtmosphere
            atmosphereColor={`rgb(${accentRgb})`}
            atmosphereAltitude={0.18}
            hexBinPointsData={columns ? data.points : []}
            hexBinPointLat="lat"
            hexBinPointLng="lng"
            hexBinResolution={4}
            hexMargin={0.15}
            hexAltitude={(d: object) => Math.min(0.5, 0.02 + ((d as { sumWeight: number }).sumWeight / maxHex) * 0.12)}
            hexTopColor={() => `rgba(${accentRgb}, 0.95)`}
            hexSideColor={() => `rgba(${accentRgb}, 0.55)`}
            hexLabel={(d: object) => `<b>${(d as { sumWeight: number }).sumWeight}</b> resposta${(d as { sumWeight: number }).sumWeight === 1 ? "" : "s"} nesta área`}
            hexTransitionDuration={600}
            pointsData={columns ? [] : data.points}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={0.02}
            pointRadius={0.4}
            pointColor={(p: object) => colorFor((p as MapResult["points"][number]).categoryValue)}
            pointLabel={(p: object) => (p as MapResult["points"][number]).label}
          />
        )}
        {size.width > 0 && (
          <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={reset} rotating={rotating} onToggleRotate={toggleRotate}
            extruded={columns} onToggleExtrude={hasCategories ? undefined : () => setColumns(c => !c)}
            extrudeLabel={["Mostrar colunas 3D de densidade", "Mostrar pontos"]} />
        )}
      </div>
      {hasCategories && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center px-1 flex-shrink-0">
          {data.categories!.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1 text-2xs" style={{ color: "rgb(var(--color-ink-100))" }}>
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
  displayMode?: "count" | "percent";
  skyImage?: string;
  /** Estados "levantados" do globo em altura proporcional ao valor (leitura 3D). */
  extrude?: boolean;
}

export function GlobeHeatmapWidget({ data, palette, displayMode, skyImage, extrude = true }: GlobeHeatmapProps) {
  const ACCENT = (palette ?? COLOR_PALETTES.terracota).accent;
  const { ref, size } = useContainerSize();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [estados, setEstados] = useState<FeatureCollection | null>(null);
  const [indicatorKey, setIndicatorKey] = useState(data.indicators[0]?.key);
  const { zoomIn, zoomOut, reset } = useZoomControls(globeRef);

  useEffect(() => {
    let cancel = false;
    fetch("/geo/brasil-estados.json").then(res => res.json()).then(json => { if (!cancel) setEstados(json); }).catch(() => {});
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    globeRef.current?.pointOfView(BRAZIL_VIEW, 0);
  }, [estados]);
  const { rotating, toggleRotate } = useAutoRotate(globeRef, size.width > 0 && !!estados);
  const [raised, setRaised] = useState(extrude);
  useEffect(() => { setRaised(extrude); }, [extrude]);
  const sky = skyProps(skyImage);

  useEffect(() => {
    if (!data.indicators.some(i => i.key === indicatorKey)) setIndicatorKey(data.indicators[0]?.key);
  }, [data.indicators, indicatorKey]);

  const activeKey = indicatorKey ?? data.indicators[0]?.key;
  const activeIndicator = data.indicators.find(i => i.key === activeKey);
  const byStateRaw = activeKey ? (data.byIndicator[activeKey] ?? {}) : {};
  const asPercent = displayMode === "percent" && activeIndicator?.mode === "count";
  const totalCount = Object.values(byStateRaw).reduce((acc, s) => acc + s.count, 0);
  const byState = asPercent
    ? Object.fromEntries(Object.entries(byStateRaw).map(([k, s]) => [k, { value: totalCount > 0 ? (s.count / totalCount) * 100 : 0, count: s.count }]))
    : byStateRaw;
  const max = asPercent ? Math.max(1, ...Object.values(byState).map(s => s.value)) : (activeKey ? (data.maxByIndicator[activeKey] ?? 0) : 0);
  const isPercentLike = asPercent || activeIndicator?.mode === "choice_percent";

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

  // Altura proporcional ao valor: o Brasil vira um "relevo de dados" — dá
  // pra comparar estados pela altura além da cor.
  function altitudeFor(feature: object) {
    if (!raised) return 0.01;
    const codarea = (feature as Feature).properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? byState[sigla] : undefined;
    if (!stateData || max === 0) return 0.006;
    return 0.012 + (stateData.value / max) * 0.14;
  }

  function labelFor(feature: object) {
    const codarea = (feature as Feature).properties?.codarea as string | undefined;
    const sigla = codarea ? CODAREA_TO_SIGLA[codarea] : undefined;
    const stateData = sigla ? byState[sigla] : undefined;
    return stateData ? `<b>${sigla}</b><br/>${stateData.value.toFixed(1)}${isPercentLike ? "%" : ""}` : `<b>${sigla ?? "?"}</b><br/>Sem dados`;
  }

  return (
    <div className="w-full h-full flex flex-col gap-1.5">
      {data.indicators.length > 1 && (
        <select value={activeKey} onChange={e => setIndicatorKey(e.target.value)}
          className="flex-shrink-0 text-2xs rounded px-1.5 py-1 focus:outline-none"
          style={{ border: "1px solid rgb(var(--color-ink-700))", background: "rgb(var(--color-ink-900))", color: "rgb(var(--color-ink-100))" }}>
          {data.indicators.map(ind => <option key={ind.key} value={ind.key}>{ind.label}</option>)}
        </select>
      )}
      <div ref={ref} className="relative flex-1 min-h-0 rounded-md overflow-hidden" style={{ background: sky.containerBg }}>
        {size.width > 0 && estados && (
          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            globeImageUrl={EARTH_TEXTURE}
            bumpImageUrl={EARTH_BUMP}
            backgroundImageUrl={sky.backgroundImageUrl}
            backgroundColor={sky.backgroundColor}
            showAtmosphere
            atmosphereColor={`rgb(${ACCENT})`}
            atmosphereAltitude={0.18}
            polygonsData={estados.features}
            polygonCapColor={capColor}
            polygonSideColor={() => raised ? `rgba(${ACCENT}, 0.45)` : "rgba(48, 46, 34, 0.25)"}
            polygonStrokeColor={() => "#f5f3ec"}
            polygonAltitude={altitudeFor}
            polygonsTransitionDuration={700}
            polygonLabel={labelFor}
          />
        )}
        {size.width > 0 && estados && (
          <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={reset} rotating={rotating} onToggleRotate={toggleRotate}
            extruded={raised} onToggleExtrude={() => setRaised(r => !r)} extrudeLabel={["Levantar estados em 3D pelo valor", "Ver globo plano"]} />
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 px-1">
        <span className="text-2xs" style={{ color: "rgb(var(--color-ink-500))" }}>0{isPercentLike ? "%" : ""}</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, rgba(${ACCENT},0.15), rgba(${ACCENT},0.9))` }} />
        <span className="text-2xs font-semibold" style={{ color: "rgb(var(--color-ink-100))" }}>{isPercentLike ? `${max.toFixed(0)}%` : `${Math.round(max)} respostas`}</span>
      </div>
    </div>
  );
}
