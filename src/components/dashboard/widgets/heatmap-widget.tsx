"use client";

import { useEffect, useState } from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import L, { type Layer, type PathOptions } from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { ColorPalette, HeatmapResult } from "@/lib/dashboard/types";
import { COLOR_PALETTES } from "@/lib/dashboard/types";
import { CODAREA_TO_SIGLA } from "@/lib/geo/uf";
import { resolveMunicipioName } from "@/lib/geo/municipios";
import { BasemapLayers, ScrollZoomOnFocus } from "./map-common";

const NO_DATA_STYLE: PathOptions = { fillColor: "#5c5847", weight: 1, color: "#302e22", fillOpacity: 0.25 };

interface HeatmapWidgetProps {
  data: HeatmapResult;
  palette?: ColorPalette;
  basemap?: string;
  // Só afeta indicadores de modo "count" (volume bruto de respostas) —
  // troca pra fatia percentual do total do país nesse indicador.
  // "choice_percent" já é percentual por natureza, sem efeito nele.
  displayMode?: "count" | "percent";
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

export function HeatmapWidget({ data, palette, basemap, displayMode }: HeatmapWidgetProps) {
  const ACCENT = (palette ?? COLOR_PALETTES.terracota).accent;
  const isCity = data.granularity === "city";
  const [estados, setEstados] = useState<FeatureCollection | null>(null);
  // Progresso real de carregamento — a malha municipal são ~3,2MB de JSON,
  // vários segundos numa conexão comum. Em vez de um texto estático parado,
  // lê a resposta em pedaços (Content-Length quando o servidor manda) e
  // atualiza uma barra de verdade; sem Content-Length (alguns hosts de
  // arquivo estático omitem), cai pra uma barra indeterminada animada em
  // vez de ficar sem nenhum feedback de progresso.
  const [loadProgress, setLoadProgress] = useState<number | null>(0);
  const [indicatorKey, setIndicatorKey] = useState(data.indicators[0]?.key);

  useEffect(() => {
    let cancel = false;
    setEstados(null);
    setLoadProgress(0);
    const url = isCity ? "/geo/brasil-municipios.json" : "/geo/brasil-estados.json";

    async function load() {
      const res = await fetch(url);
      const total = Number(res.headers.get("content-length")) || 0;
      if (!res.body || !total) {
        // Sem corpo legível em pedaços ou sem tamanho conhecido — barra
        // indeterminada (null) em vez de travar em 0% até o fim.
        const json = await res.json();
        if (!cancel) { setEstados(json); setLoadProgress(null); }
        return;
      }
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (!cancel) setLoadProgress(Math.min(99, Math.round((received / total) * 100)));
      }
      const blob = new Blob(chunks as BlobPart[]);
      const json = JSON.parse(await blob.text());
      if (!cancel) { setEstados(json); setLoadProgress(100); }
    }
    load().catch(() => { if (!cancel) setLoadProgress(null); });

    return () => { cancel = true; };
  }, [isCity]);

  // Se o indicador selecionado sumir (config mudou), volta pro primeiro.
  useEffect(() => {
    if (!data.indicators.some(i => i.key === indicatorKey)) {
      setIndicatorKey(data.indicators[0]?.key);
    }
  }, [data.indicators, indicatorKey]);

  const activeKey = indicatorKey ?? data.indicators[0]?.key;
  const activeIndicator = data.indicators.find(i => i.key === activeKey);
  const byStateRaw = activeKey ? (data.byIndicator[activeKey] ?? {}) : {};
  // displayMode "percent" só se aplica a indicadores "count" (volume bruto)
  // — "choice_percent" já é uma fatia percentual por natureza, não faz
  // sentido converter de novo.
  const asPercent = displayMode === "percent" && activeIndicator?.mode === "count";
  const totalCount = Object.values(byStateRaw).reduce((acc, s) => acc + s.count, 0);
  const byState = asPercent
    ? Object.fromEntries(Object.entries(byStateRaw).map(([k, s]) => [k, { value: totalCount > 0 ? (s.count / totalCount) * 100 : 0, count: s.count }]))
    : byStateRaw;
  const max = asPercent ? Math.max(1, ...Object.values(byState).map(s => s.value)) : (activeKey ? (data.maxByIndicator[activeKey] ?? 0) : 0);
  const isPercentLike = asPercent || max <= 100;

  // Estado: codarea (2 dígitos) precisa virar sigla pra bater com byState.
  // Município: codarea (7 dígitos) já É a chave usada em byState direto.
  function groupKeyFor(codarea: string | undefined): string | undefined {
    if (!codarea) return undefined;
    return isCity ? codarea : CODAREA_TO_SIGLA[codarea];
  }
  function labelFor(codarea: string | undefined, groupKey: string | undefined): string {
    if (isCity) return (codarea && resolveMunicipioName(codarea)) ?? "?";
    return groupKey ?? "?";
  }

  function styleFeature(feature?: Feature): PathOptions {
    const codarea = feature?.properties?.codarea as string | undefined;
    const groupKey = groupKeyFor(codarea);
    const stateData = groupKey ? byState[groupKey] : undefined;
    if (!stateData || max === 0) return NO_DATA_STYLE;
    const intensity = 0.15 + (stateData.value / max) * 0.75;
    return { fillColor: `rgb(${ACCENT})`, weight: isCity ? 0.5 : 1, color: isCity ? "#e8e4d5" : "#f5f3ec", fillOpacity: intensity };
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const codarea = feature.properties?.codarea as string | undefined;
    const groupKey = groupKeyFor(codarea);
    const stateData = groupKey ? byState[groupKey] : undefined;
    const label = labelFor(codarea, groupKey);
    const content = stateData
      ? `<b>${label}</b><br/>${stateData.value.toFixed(1)}${isPercentLike ? "%" : ""} · ${stateData.count} resposta${stateData.count === 1 ? "" : "s"}`
      : `<b>${label}</b><br/>Sem dados`;
    layer.bindTooltip(content);
  }

  if (!estados) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-6">
        <i className="ti ti-map-2 text-xl animate-pulse-soft" style={{ color: "#d2a05c" }} />
        <p className="text-xs text-center" style={{ color: "#a06d28" }}>
          Carregando mapa{isCity ? " — malha municipal (~3 MB, milhares de polígonos)" : ""}...
        </p>
        <div className="w-full max-w-48 h-1.5 rounded-full overflow-hidden" style={{ background: "#f3e4cb" }}>
          {loadProgress === null ? (
            <div className="h-full w-1/3 rounded-full animate-loading-indeterminate" style={{ background: `rgb(${ACCENT})` }} />
          ) : (
            <div className="h-full rounded-full transition-all duration-150" style={{ width: `${loadProgress}%`, background: `rgb(${ACCENT})` }} />
          )}
        </div>
        {loadProgress !== null && <p className="text-2xs" style={{ color: "#c4a878" }}>{loadProgress}%</p>}
      </div>
    );
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
      <div className="flex-1 min-h-0 rounded-md overflow-hidden">
        {/* scrollWheelZoom liga só depois do primeiro clique/toque no mapa
            (ScrollZoomOnFocus) — os botões +/- ficam sempre disponíveis. */}
        <MapContainer center={[-14.235, -51.9253]} zoom={3} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} preferCanvas={isCity}>
          <BasemapLayers defaultBasemap={basemap} />
          <ScrollZoomOnFocus />
          <GeoJSON key={isCity + activeKey + JSON.stringify(byState)} data={estados} style={styleFeature} onEachFeature={onEachFeature} />
          <FitToBrazil geo={estados} />
        </MapContainer>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 px-1">
        <span className="text-2xs" style={{ color: "#a06d28" }}>0{isPercentLike ? "%" : ""}</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, rgba(${ACCENT},0.15), rgba(${ACCENT},0.9))` }} />
        <span className="text-2xs font-semibold" style={{ color: "#5c3f13" }}>{isPercentLike ? `${max.toFixed(0)}%` : `${Math.round(max)} respostas`}</span>
      </div>
    </div>
  );
}
