"use client";

import dynamic from "next/dynamic";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { COLOR_PALETTES, resolveChartKind, type ColorPalette, type DisplayMode, type SupportedWidgetType, type TimeSeriesResult, type WidgetData } from "@/lib/dashboard/types";
import { ChartLegend, EmptyState, formatNumber, mixHex, TOOLTIP_STYLE, toPercent } from "@/components/dashboard/widgets/chart-common";
import { useEffect, useRef, useState } from "react";
import { brandChartPalette, type DashboardBrand } from "@/lib/dashboard/brand";
import { crosstabStats, describeStats } from "@/lib/dashboard/stats";
import {
  AreaChartView, HistogramView, RadarChartView, ScatterView, StackedBarView, TreemapView,
} from "@/components/dashboard/widgets/extra-charts";
import {
  DistributionView, DivergingBarView, DotPlotView, DumbbellView, RangeBarView, WaffleView,
} from "@/components/dashboard/widgets/shape-charts";

// Leaflet e three.js (via react-globe.gl) acessam `window`/`document`/WebGL
// direto — não rodam em SSR. Aprendido do jeito difícil com o
// react-moveable: toda lib que mexe em DOM/GPU direto entra assim desde o
// primeiro commit, nunca depois.
const HeatmapWidget      = dynamic(() => import("@/components/dashboard/widgets/heatmap-widget").then(m => m.HeatmapWidget), { ssr: false });
const MapWidget          = dynamic(() => import("@/components/dashboard/widgets/map-widget").then(m => m.MapWidget), { ssr: false });
const GlobePointsWidget  = dynamic(() => import("@/components/dashboard/widgets/globe-widget").then(m => m.GlobePointsWidget), { ssr: false });
const GlobeHeatmapWidget = dynamic(() => import("@/components/dashboard/widgets/globe-widget").then(m => m.GlobeHeatmapWidget), { ssr: false });

interface WidgetRendererProps {
  type:    SupportedWidgetType;
  title?:  string | null;
  data:    WidgetData;
  config:  Record<string, unknown>;
  palette?: string; // chave de COLOR_PALETTES — nível do dashboard, não do widget
  /** Identidade visual do painel (cores próprias, estilo dos gráficos e títulos). */
  brand?: DashboardBrand | null;
  /** Filtro por clique: chamado com o id da opção clicada (barras, pizza, legenda). */
  onSelectCategory?: (optionId: string) => void;
  /** Opções atualmente filtradas — as demais ficam esmaecidas. */
  activeOptionIds?: string[];
}

/** Estilo dos gráficos vindo da identidade (com valor por widget quando houver). */
export interface ChartStyle {
  gridlines: boolean;
  dataLabels: boolean;
  barRadius: number;
}

function resolveChartStyle(brand: DashboardBrand | null | undefined, config: Record<string, unknown>): ChartStyle {
  const c = brand?.chart ?? {};
  return {
    gridlines: c.gridlines ?? true,
    // Por widget vence a identidade: config.showValues true/false.
    dataLabels: typeof config.showValues === "boolean" ? config.showValues : (c.dataLabels ?? false),
    barRadius: typeof c.barRadius === "number" ? c.barRadius : 4,
  };
}

/** Agrupa as opções além das N mais frequentes em "Outras" (config.topN). */
function applyTopN<T extends { optionId: string; label: string; count: number }>(buckets: T[], topN: unknown): T[] {
  const n = typeof topN === "number" && topN >= 2 ? Math.floor(topN) : 0;
  if (!n || buckets.length <= n) return buckets;
  const sorted = [...buckets].sort((a, b) => b.count - a.count);
  const rest = sorted.slice(n);
  return [...sorted.slice(0, n), { ...rest[0], optionId: "__outras", label: `Outras (${rest.length})`, count: rest.reduce((a, b) => a + b.count, 0) }];
}

// Tema efetivo do bloco onde o widget está (o painel público pode ter tema
// próprio, diferente do app) — lido do color-scheme calculado pelo CSS.
function useIsDarkHere<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => { if (ref.current) setDark(getComputedStyle(ref.current).colorScheme.includes("dark")); };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-contrast"] });
    return () => obs.disconnect();
  }, []);
  return [ref, dark];
}

// No escuro, clareia as cores de dado (~30% rumo ao branco) para manter
// contraste ≥ 3:1 dos elementos gráficos — a paleta salva não muda.
function forDark(p: ColorPalette): ColorPalette {
  const lift = (hex: string) => (hex.startsWith("#") && hex.length === 7 ? mixHex(hex, "#ffffff", 0.3) : hex);
  const [r, g, b] = p.accent.split(",").map(n => Number(n.trim()));
  const acc = [r, g, b].map(v => Math.round(v + (255 - v) * 0.3)).join(", ");
  return { ...p, chartColors: p.chartColors.map(lift), accent: acc };
}

export function WidgetRenderer({ type, title, data, config, palette, brand, onSelectCategory, activeOptionIds }: WidgetRendererProps) {
  const [rootRef, isDark] = useIsDarkHere<HTMLDivElement>();
  // Aparência genérica (fundo/borda) — qualquer tipo de widget aceita.
  // Decorativos (divisória/bloco de cor) não têm padding: a cor precisa
  // preencher a caixa inteira, não uma caixa branca com um retângulo dentro.
  const appearance = (config.style ?? {}) as { backgroundColor?: string; borderRadius?: number; backgroundImage?: string; backgroundOpacity?: number; backgroundFit?: "cover" | "contain" | "repeat" };
  const bgImage = typeof appearance.backgroundImage === "string" && appearance.backgroundImage ? appearance.backgroundImage : undefined;
  const variant = config.variant as string | undefined;
  const isDecorative = type === "text" && (variant === "divider" || variant === "block" || variant === "icon");
  // Tonalidade por widget (config.colorPalette, hoje configurável nos mapas)
  // vence a paleta do dashboard; sem ela, herda o comportamento de sempre.
  const widgetPalette = typeof config.colorPalette === "string" ? COLOR_PALETTES[config.colorPalette] : undefined;
  const basePalette = widgetPalette ?? brandChartPalette(brand, COLOR_PALETTES[palette ?? ""] ?? COLOR_PALETTES.terracota);
  const resolvedPalette = isDark ? forDark(basePalette) : basePalette;

  return (
    <div ref={rootRef} className={`relative isolate w-full h-full flex flex-col overflow-hidden ${isDecorative ? "" : type === "text" ? "px-4 py-2 justify-center" : "p-4"}`}
      style={{
        backgroundColor: appearance.backgroundColor,
        borderRadius: appearance.borderRadius,
      }}>
      {/* Fundo em imagem (PNG/JPG/WebP) atrás do gráfico ou mapa. Num mapa,
          escolha "Sem mapa-base" para a imagem aparecer no lugar dos tiles. */}
      {bgImage && (
        <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none" style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: appearance.backgroundFit === "repeat" ? "auto" : appearance.backgroundFit ?? "cover",
          backgroundRepeat: appearance.backgroundFit === "repeat" ? "repeat" : "no-repeat",
          backgroundPosition: "center",
          opacity: typeof appearance.backgroundOpacity === "number" ? appearance.backgroundOpacity : 0.35,
          borderRadius: appearance.borderRadius,
        }} />
      )}
      {title && !isDecorative && (
        <p className={
          brand?.widgetTitle === "kicker" ? "text-2xs font-semibold uppercase tracking-[0.12em] leading-snug mb-2.5 flex-shrink-0 text-gold line-clamp-2"
          : brand?.widgetTitle === "serif" ? "font-serif text-base font-semibold leading-snug mb-2.5 flex-shrink-0 text-ink-50 line-clamp-2"
          : "text-sm font-semibold leading-snug mb-2.5 flex-shrink-0 text-ink-50 line-clamp-2"
        } title={title}>{title}</p>
      )}
      <div className="flex-1 min-h-0" style={{ containerType: "inline-size" }}>
        <WidgetBody type={type} data={data} config={config} palette={resolvedPalette}
          chartStyle={resolveChartStyle(brand, config)} onSelectCategory={onSelectCategory} activeOptionIds={activeOptionIds} />
      </div>
    </div>
  );
}

function WidgetBody({ type, data, config, palette, chartStyle, onSelectCategory, activeOptionIds }: Omit<WidgetRendererProps, "title" | "palette" | "brand"> & { palette: ColorPalette; chartStyle: ChartStyle }) {
  // Widget ainda não ligado a uma pergunta (ex.: recém-criado por um modelo
  // de painel) — diz o que falta, em vez de parecer falta de respostas.
  const REQUIRED_FIELD: Partial<Record<SupportedWidgetType, string>> = {
    bar_chart: "fieldId", pie_chart: "fieldId", donut_chart: "fieldId",
    heatmap: "geoFieldId", map: "geoFieldId", crosstab: "fieldIdRows",
  };
  const required = REQUIRED_FIELD[type];
  if (required && !config[required] && !resolveChartKind(config)) {
    return <EmptyState icon="ti-plug-connected" message="Escolha a pergunta da pesquisa nas propriedades deste widget" />;
  }
  // "globe" reaproveita os mesmos dados de map/heatmap (mesmo "kind"), só
  // troca a visualização — precisa vir antes das checagens genéricas de
  // data.kind === "map"/"heatmap" que renderizam a versão 2D.
  if (type === "globe") {
    if (data.kind === "map") {
      if (data.points.length === 0) return <EmptyState />;
      return <GlobePointsWidget data={data} palette={palette} skyImage={config.globeSky as string | undefined} extrude={config.globeColumns !== false} />;
    }
    if (data.kind === "heatmap") {
      const hasAnyData = data.indicators.length > 0 && Object.keys(data.byIndicator[data.indicators[0].key] ?? {}).length > 0;
      if (!hasAnyData) return <EmptyState />;
      return <GlobeHeatmapWidget data={data} palette={palette} displayMode={config.displayMode === "percent" ? "percent" : "count"} skyImage={config.globeSky as string | undefined} extrude={config.globeExtrude !== false} />;
    }
    return <EmptyState />;
  }

  // Gráficos estendidos — o tipo persistido é um dos 12 do enum do banco,
  // mas config.chartKind decide a forma (ver src/lib/dashboard/types.ts).
  // Cada `case` checa o `data.kind` real (o motor de agregação já resolveu
  // o cálculo certo) antes de desenhar — se o chartKind não bater com o
  // dado computado (config incompleta/em edição), cai em EmptyState em vez
  // de quebrar.
  const chartKind = resolveChartKind(config);
  if (chartKind) {
    switch (chartKind) {
      case "diverging_bar":
        if (data.kind !== "diverging") return <EmptyState />;
        if (data.buckets.length === 0 || data.totalResponses === 0) return <EmptyState />;
        return <DivergingBarView data={data} />;

      case "stacked_bar": {
        if (data.kind !== "crosstab") return <EmptyState />;
        if (data.rows.length === 0 || data.cols.length === 0 || data.grandTotal === 0) return <EmptyState />;
        const displayMode: DisplayMode = config.displayMode === "percent" ? "percent" : "count";
        return <StackedBarView data={data} colors={palette.chartColors} displayMode={displayMode} />;
      }

      case "area":
        if (data.kind !== "timeseries") return <EmptyState />;
        if (data.points.length === 0) return <EmptyState />;
        return <AreaChartView data={data} colors={palette.chartColors} />;

      case "histogram":
        if (data.kind !== "histogram") return <EmptyState />;
        if (data.bins.length === 0) return <EmptyState />;
        return <HistogramView data={data} colors={palette.chartColors} />;

      case "scatter":
      case "bubble":
        if (data.kind !== "scatter") return <EmptyState />;
        if (data.points.length === 0) return <EmptyState />;
        return <ScatterView data={data} colors={palette.chartColors} bubble={chartKind === "bubble"} />;

      case "treemap":
        if (data.kind !== "choice") return <EmptyState />;
        if (data.buckets.length === 0 || data.totalResponses === 0) return <EmptyState />;
        return <TreemapView data={data} colors={palette.chartColors} />;

      case "range_bar":
        if (data.kind !== "rangebar") return <EmptyState />;
        if (data.rows.length === 0) return <EmptyState />;
        return <RangeBarView data={data} colors={palette.chartColors} />;

      case "boxplot":
      case "violin":
        if (data.kind !== "distribution") return <EmptyState />;
        if (data.groups.length === 0) return <EmptyState />;
        return <DistributionView data={data} colors={palette.chartColors} variant={chartKind} />;

      case "dot_plot":
      case "lollipop": {
        if (data.kind !== "choice") return <EmptyState />;
        if (data.buckets.length === 0 || data.totalResponses === 0) return <EmptyState />;
        const displayMode: DisplayMode = config.displayMode === "percent" ? "percent" : "count";
        return <DotPlotView data={data} colors={palette.chartColors} displayMode={displayMode} lollipop={chartKind === "lollipop"} />;
      }

      case "waffle":
        if (data.kind !== "choice") return <EmptyState />;
        if (data.buckets.length === 0 || data.totalResponses === 0) return <EmptyState />;
        return <WaffleView data={data} colors={palette.chartColors} optionId={config.optionId as string | undefined} />;

      case "dumbbell": {
        if (data.kind !== "dumbbell") return <EmptyState />;
        if (data.categories.length === 0) return <EmptyState />;
        const displayMode: DisplayMode = config.displayMode === "percent" ? "percent" : "count";
        return <DumbbellView data={data} colors={palette.chartColors} displayMode={displayMode} />;
      }

      case "radar":
        if (data.kind !== "radar") return <EmptyState />;
        if (data.axes.length === 0 || data.series.length === 0) return <EmptyState />;
        return <RadarChartView data={data} colors={palette.chartColors} />;
    }
  }

  if (data.kind === "count") {
    const aggregation = typeof config.aggregation === "string" ? config.aggregation : "count";
    const value = aggregation === "count_completed" ? data.completed : data.total;
    return <NumberDisplay value={value} suffix={config.suffix as string | undefined} />;
  }

  if (data.kind === "numeric") {
    const aggregation = typeof config.aggregation === "string" ? config.aggregation : "avg";
    const value = aggregation === "sum" ? data.sum : aggregation === "min" ? (data.min ?? 0) : aggregation === "max" ? (data.max ?? 0) : (data.avg ?? 0);
    return <NumberDisplay value={value} suffix={config.suffix as string | undefined} decimals={config.decimals as number | undefined} />;
  }

  if (data.kind === "choice") {
    if (data.buckets.length === 0) return <EmptyState />;
    const displayMode: DisplayMode = config.displayMode === "percent" ? "percent" : "count";
    const buckets = applyTopN(data.buckets, config.topN);
    const interaction = { onSelect: onSelectCategory, active: activeOptionIds };
    if (type === "bar_chart") {
      const orientation = config.orientation === "horizontal" ? "horizontal" : "vertical";
      return <BarChartView data={buckets} colors={palette.chartColors} displayMode={displayMode} totalResponses={data.totalResponses} orientation={orientation} chartStyle={chartStyle} {...interaction} />;
    }
    return <PieChartView data={buckets} donut={type === "donut_chart"} colors={palette.chartColors} displayMode={displayMode} totalResponses={data.totalResponses} chartStyle={chartStyle} {...interaction} />;
  }

  if (data.kind === "timeseries") {
    if (data.points.length === 0) return <EmptyState />;
    return <LineChartView data={data} colors={palette.chartColors} chartStyle={chartStyle} />;
  }

  if (data.kind === "table") {
    if (data.rows.length === 0) return <EmptyState />;
    return <TableView data={data} />;
  }

  if (data.kind === "text") {
    const variant = (config.variant as string) ?? "text";
    if (variant === "divider") return <DividerView config={config} />;
    if (variant === "block") return null; // a cor já vem do fundo do container (config.style)
    if (variant === "icon") return <IconView config={config} />;
    const textStyle = (config.textStyle ?? {}) as { fontSize?: number; fontWeight?: "normal" | "bold"; fontFamily?: "sans" | "serif"; color?: string; align?: "left" | "center" | "right" };
    return (
      <p className="whitespace-pre-wrap h-full" style={{
        color: textStyle.color ?? "rgb(var(--color-ink-50))",
        fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : "14px",
        fontWeight: textStyle.fontWeight ?? "normal",
        fontFamily: textStyle.fontFamily === "serif" ? "var(--font-serif), Georgia, serif" : "var(--font-sans), Inter, sans-serif",
        textAlign: textStyle.align ?? "left",
      }}>
        {data.content || "—"}
      </p>
    );
  }

  if (data.kind === "map") {
    if (data.points.length === 0) return <EmptyState />;
    return <MapWidget data={data} palette={palette} basemap={config.basemap as string | undefined} />;
  }

  if (data.kind === "image") {
    if (!data.imageUrl) return <EmptyState />;
    // eslint-disable-next-line @next/next/no-img-element -- base64 gerado no cliente, não é um asset otimizável pelo next/image
    return <img src={data.imageUrl} alt="" className="w-full h-full" style={{ objectFit: data.fit }} />;
  }

  if (data.kind === "heatmap") {
    const hasAnyData = data.indicators.length > 0 && Object.keys(data.byIndicator[data.indicators[0].key] ?? {}).length > 0;
    if (!hasAnyData) return <EmptyState />;
    return <HeatmapWidget data={data} palette={palette} basemap={config.basemap as string | undefined} displayMode={config.displayMode === "percent" ? "percent" : "count"}
      classMethod={config.classMethod === "quantile" ? "quantile" : "equal"} symbol={config.symbol === "bubbles" ? "bubbles" : "fill"} showLabels={config.showLabels === true} />;
  }

  if (data.kind === "crosstab") {
    if (data.rows.length === 0 || data.cols.length === 0 || data.grandTotal === 0) return <EmptyState />;
    // Gráfico de barras com campo de comparação configurado recebe um
    // resultado de cruzamento e desenha barras agrupadas (categoria A no
    // eixo, uma barra por opção da categoria B, cor fixa por opção).
    if (type === "bar_chart") {
      return <GroupedBarView data={data} colors={palette.chartColors} displayMode={config.displayMode === "percent" ? "percent" : "count"} chartStyle={chartStyle} />;
    }
    return <CrosstabView data={data} valueMode={(config.valueMode as string) ?? "count"} palette={palette} showStats={config.showStats !== false} />;
  }

  return null;
}

function IconView({ config }: { config: Record<string, unknown> }) {
  const textStyle = (config.textStyle ?? {}) as { fontSize?: number; color?: string };
  const iconName = (config.iconName as string) || "map-pin";
  return (
    <div className="w-full h-full flex items-center justify-center">
      <i className={`ti ti-${iconName}`} style={{ fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : "32px", color: textStyle.color ?? "rgb(var(--color-brand-500))" }} />
    </div>
  );
}

function DividerView({ config }: { config: Record<string, unknown> }) {
  const textStyle = (config.textStyle ?? {}) as { color?: string };
  return (
    <div className="w-full h-full flex items-center">
      <div className="w-full" style={{ height: 2, background: textStyle.color ?? "rgb(var(--color-ink-700))" }} />
    </div>
  );
}

function NumberDisplay({ value, suffix, decimals }: { value: number; suffix?: string; decimals?: number }) {
  return (
    <div className="h-full flex flex-col justify-center">
      <p className="font-serif font-semibold leading-none tabular text-brand-400" style={{ fontSize: "clamp(2rem, 13cqw, 3.75rem)", letterSpacing: "-0.025em" }}>
        {formatNumber(value, decimals)}
        {suffix && <span className="ml-1.5 text-[0.45em] font-sans font-medium text-ink-500 tracking-normal">{suffix}</span>}
      </p>
    </div>
  );
}

interface ChoiceViewProps {
  data: { optionId: string; label: string; count: number }[];
  colors: string[];
  displayMode: DisplayMode;
  totalResponses: number;
  chartStyle: ChartStyle;
  onSelect?: (optionId: string) => void;
  active?: string[];
}

// Com filtro por clique ativo, as opções fora do recorte ficam esmaecidas.
function dimmed(active: string[] | undefined, optionId: string): boolean {
  return !!active && active.length > 0 && !active.includes(optionId);
}
const selectable = (onSelect: ((id: string) => void) | undefined, optionId: string) =>
  !!onSelect && optionId !== "__outras";

function BarChartView({ data, colors, displayMode, totalResponses, orientation, chartStyle, onSelect, active }: ChoiceViewProps & { orientation?: "vertical" | "horizontal" }) {
  const percent = displayMode === "percent";
  const chartData = percent ? data.map(d => ({ ...d, count: toPercent(d.count, totalResponses) })) : data;
  const fmt = (v: number) => percent ? `${formatNumber(v, 1)}%` : formatNumber(v);
  const horizontal = orientation === "horizontal";
  const r = chartStyle.barRadius;
  const handleClick = (entry: unknown) => {
    const id = (entry as { optionId?: string; payload?: { optionId?: string } })?.optionId ?? (entry as { payload?: { optionId?: string } })?.payload?.optionId;
    if (id && selectable(onSelect, id)) onSelect!(id);
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, fill: "rgb(var(--color-ink-100))" };
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {horizontal ? (
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: chartStyle.dataLabels ? 58 : 16, left: 8, bottom: 4 }}>
              {chartStyle.gridlines && <CartesianGrid horizontal={false} stroke="rgb(var(--color-ink-800))" />}
              <XAxis type="number" tick={{ fontSize: 11, fill: "rgb(var(--color-ink-500))" }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={percent ? (v: number) => `${v}%` : undefined} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "rgb(var(--color-ink-300))" }} axisLine={false} tickLine={false} width={112} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [fmt(Number(v)), percent ? "% das respostas" : "Respostas"]} />
              <Bar dataKey="count" radius={[0, r, r, 0]} onClick={handleClick} style={{ cursor: onSelect ? "pointer" : undefined }}>
                {chartData.map((d, i) => <Cell key={i} fill={colors[i % colors.length]} fillOpacity={dimmed(active, d.optionId) ? 0.25 : 1} />)}
                {chartStyle.dataLabels && <LabelList dataKey="count" position="right" formatter={(v: unknown) => fmt(Number(v))} style={labelStyle} />}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={chartData} margin={{ top: chartStyle.dataLabels ? 18 : 4, right: 8, left: 0, bottom: 4 }}>
              {chartStyle.gridlines && <CartesianGrid vertical={false} stroke="rgb(var(--color-ink-800))" />}
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgb(var(--color-ink-500))" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "rgb(var(--color-ink-500))" }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={percent ? (v: number) => `${v}%` : undefined} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [fmt(Number(v)), percent ? "% das respostas" : "Respostas"]} />
              <Bar dataKey="count" radius={[r, r, 0, 0]} onClick={handleClick} style={{ cursor: onSelect ? "pointer" : undefined }}>
                {chartData.map((d, i) => <Cell key={i} fill={colors[i % colors.length]} fillOpacity={dimmed(active, d.optionId) ? 0.25 : 1} />)}
                {chartStyle.dataLabels && <LabelList dataKey="count" position="top" formatter={(v: unknown) => fmt(Number(v))} style={labelStyle} />}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data} colors={colors} values={data.map(d => percent ? `${formatNumber(toPercent(d.count, totalResponses), 0)}%` : formatNumber(d.count))}
        onSelect={onSelect ? (i => selectable(onSelect, data[i].optionId) && onSelect(data[i].optionId)) : undefined}
        pressed={active && active.length > 0 ? data.map(d => active.includes(d.optionId)) : undefined} />
    </div>
  );
}

function PieChartView({ data, donut, colors, displayMode, totalResponses, chartStyle, onSelect, active }: ChoiceViewProps & { donut: boolean }) {
  const percent = displayMode === "percent";
  const fmt = (v: number) => percent ? `${formatNumber(toPercent(v, totalResponses), 1)}%` : formatNumber(v);
  return (
    <div className="w-full h-full flex flex-col">
      {/* A legenda abaixo carrega rótulo e valor de cada fatia em texto — o
          desenho em si fica fora da árvore de acessibilidade. */}
      <div className="flex-1 min-h-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer={false}>
            <Pie rootTabIndex={-1} data={data} dataKey="count" nameKey="label" innerRadius={donut ? "50%" : 0} outerRadius="85%" paddingAngle={data.length > 1 ? 2 : 0}
              onClick={(entry: unknown) => { const id = (entry as { optionId?: string })?.optionId; if (id && selectable(onSelect, id)) onSelect!(id); }}
              style={{ cursor: onSelect ? "pointer" : undefined }}
              label={chartStyle.dataLabels ? ((p: { x?: number; y?: number; value?: number; textAnchor?: string }) => (
                <text x={p.x} y={p.y} textAnchor={p.textAnchor as "start" | "middle" | "end" | undefined} dominantBaseline="central" fontSize={11} fontWeight={600} fill="rgb(var(--color-ink-100))">{fmt(Number(p.value ?? 0))}</text>
              )) : undefined}
              labelLine={chartStyle.dataLabels ? { stroke: "rgb(var(--color-ink-500))" } : false}>
              {data.map((d, i) => <Cell key={i} fill={colors[i % colors.length]} fillOpacity={dimmed(active, d.optionId) ? 0.25 : 1} stroke="rgb(var(--color-ink-900))" strokeWidth={1.5} />)}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [fmt(Number(v)), String(name)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data} colors={colors} values={data.map(d => fmt(d.count))}
        onSelect={onSelect ? (i => selectable(onSelect, data[i].optionId) && onSelect(data[i].optionId)) : undefined}
        pressed={active && active.length > 0 ? data.map(d => active.includes(d.optionId)) : undefined} />
    </div>
  );
}

// Formata a data do eixo/tooltip conforme o intervalo — dd/mm pra dia e
// semana, mm/aa pra mês (rótulo curto, o tooltip carrega o completo).
function formatBucketDate(dateKey: string, interval: "day" | "week" | "month"): string {
  const [y, m, d] = dateKey.split("-");
  return interval === "month" ? `${m}/${y.slice(2)}` : `${d}/${m}`;
}

function LineChartView({ data, colors, chartStyle }: { data: TimeSeriesResult; colors: string[]; chartStyle: ChartStyle }) {
  const chartData = data.points.map(p => ({ date: formatBucketDate(p.date, data.interval), ...p.values }));
  const multi = data.series.length >= 2;
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: chartStyle.dataLabels ? 18 : 6, right: 12, left: 0, bottom: 4 }}>
            {chartStyle.gridlines && <CartesianGrid vertical={false} stroke="rgb(var(--color-ink-800))" />}
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgb(var(--color-ink-500))" }} axisLine={false} tickLine={false} minTickGap={18} />
            <YAxis tick={{ fontSize: 11, fill: "rgb(var(--color-ink-500))" }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [formatNumber(Number(v)), String(name)]} />
            {data.series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={colors[i % colors.length]} strokeWidth={2}
                dot={chartData.length <= 40 ? { r: 2.5, strokeWidth: 0, fill: colors[i % colors.length] } : false}
                activeDot={{ r: 4 }} isAnimationActive={false}>
                {chartStyle.dataLabels && !multi && chartData.length <= 24 && (
                  <LabelList dataKey={s.key} position="top" style={{ fontSize: 10, fontWeight: 600, fill: "rgb(var(--color-ink-300))" }} />
                )}
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {multi && <ChartLegend data={data.series} colors={colors} />}
    </div>
  );
}

// Barras agrupadas — comparação categoria A × categoria B. A cor segue a
// opção da categoria B (fixa, ordem das opções, nunca por valor); a legenda
// nomeia as barras de cada grupo. "percent" = % dentro de cada grupo da
// categoria A (as barras de um grupo somam 100%).
function GroupedBarView({ data, colors, displayMode, chartStyle }: { data: Extract<WidgetData, { kind: "crosstab" }>; colors: string[]; displayMode: DisplayMode; chartStyle: ChartStyle }) {
  const percent = displayMode === "percent";
  const chartData = data.rows.map((r, ri) => {
    const entry: Record<string, string | number> = { label: r.label };
    data.cols.forEach((c, ci) => {
      const raw = data.cells[ri][ci];
      entry[c.id] = percent ? (data.rowTotals[ri] > 0 ? (raw / data.rowTotals[ri]) * 100 : 0) : raw;
    });
    return entry;
  });
  const fmt = (v: number) => percent ? `${formatNumber(v, 1)}%` : formatNumber(v);
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: chartStyle.dataLabels ? 18 : 4, right: 8, left: 0, bottom: 4 }} barGap={2}>
            {chartStyle.gridlines && <CartesianGrid vertical={false} stroke="rgb(var(--color-ink-800))" />}
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgb(var(--color-ink-500))" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11, fill: "rgb(var(--color-ink-500))" }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={percent ? (v: number) => `${v}%` : undefined} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [fmt(Number(v)), String(name)]} />
            {data.cols.map((c, i) => (
              <Bar key={c.id} dataKey={c.id} name={c.label} fill={colors[i % colors.length]} radius={[chartStyle.barRadius, chartStyle.barRadius, 0, 0]} maxBarSize={36}>
                {chartStyle.dataLabels && <LabelList dataKey={c.id} position="top" formatter={(v: unknown) => fmt(Number(v))} style={{ fontSize: 10, fontWeight: 600, fill: "rgb(var(--color-ink-300))" }} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data.cols} colors={colors} />
    </div>
  );
}

// Cruzamento — tabela de contingência com calor nas células. Quatro leituras:
// contagem, % da linha, % da coluna e "acima/abaixo do esperado" (resíduo
// padronizado ajustado: verde-azulado = mais que o esperado se não houvesse
// relação, terracota = menos). Embaixo, o teste qui-quadrado em linguagem simples.
function CrosstabView({ data, valueMode, palette, showStats }: { data: Extract<WidgetData, { kind: "crosstab" }>; valueMode: string; palette: ColorPalette; showStats: boolean }) {
  const accent = palette.accent;
  const stats = crosstabStats(data.cells);
  const residualMode = valueMode === "residual" && !!stats;
  function cellValue(ri: number, ci: number): number {
    const raw = data.cells[ri][ci];
    if (valueMode === "row_percent") return data.rowTotals[ri] > 0 ? (raw / data.rowTotals[ri]) * 100 : 0;
    if (valueMode === "col_percent") return data.colTotals[ci] > 0 ? (raw / data.colTotals[ci]) * 100 : 0;
    return raw;
  }
  const maxCount = Math.max(1, ...data.cells.flat());
  function intensity(ri: number, ci: number): number {
    if (valueMode === "count" || valueMode === "residual") return data.cells[ri][ci] / maxCount;
    return cellValue(ri, ci) / 100;
  }
  function formatCell(v: number): string {
    return valueMode === "count" || valueMode === "residual" ? formatNumber(v) : `${formatNumber(v, 1)}%`;
  }
  // Resíduo → cor divergente (mesmo par seguro para daltonismo dos gráficos divergentes).
  function residualBg(ri: number, ci: number): string {
    const r = stats!.residuals[ri][ci];
    const t = Math.min(1, Math.abs(r) / 4);
    if (Math.abs(r) < 1.96) return `rgba(181, 170, 148, ${(0.06 + t * 0.15).toFixed(2)})`;
    return r > 0 ? `rgba(42, 118, 128, ${(0.2 + t * 0.55).toFixed(2)})` : `rgba(168, 86, 48, ${(0.2 + t * 0.55).toFixed(2)})`;
  }
  const legendMax = valueMode === "count" ? maxCount : 100;

  return (
    <div className="h-full flex flex-col gap-2.5">
    <div className="min-h-0 overflow-auto rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" tabIndex={0} role="region" aria-label="Tabela cruzada">
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th className="px-2 py-1 text-left sticky left-0" style={{ background: "rgb(var(--color-ink-900))" }} />
            {data.cols.map(c => (
              <th key={c.id} className="px-2 py-1.5 text-center font-semibold whitespace-nowrap text-ink-300" style={{ borderBottom: "1px solid rgb(var(--color-ink-700))" }}>{c.label}</th>
            ))}
            <th className="px-2 py-1 text-center font-bold whitespace-nowrap" style={{ color: "rgb(var(--color-ink-500))", borderBottom: "1px solid rgb(var(--color-ink-700))" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, ri) => (
            <tr key={r.id}>
              <td className="px-2 py-1 font-semibold whitespace-nowrap sticky left-0" style={{ color: "rgb(var(--color-ink-100))", background: "rgb(var(--color-ink-900))", borderRight: "1px solid rgb(var(--color-ink-700))" }}>{r.label}</td>
              {data.cols.map((c, ci) => {
                const res = stats?.residuals[ri][ci] ?? 0;
                return (
                  <td key={c.id} className="px-2 py-1 text-center whitespace-nowrap tabular"
                    title={stats ? `${r.label} × ${c.label}: ${formatNumber(data.cells[ri][ci])} respostas · ${res > 1.96 ? "acima" : res < -1.96 ? "abaixo" : "dentro"} do esperado (resíduo ${formatNumber(res, 1)})` : undefined}
                    style={{ color: "rgb(var(--color-ink-50))", background: residualMode ? residualBg(ri, ci) : `rgba(${accent}, ${(0.08 + intensity(ri, ci) * 0.55).toFixed(2)})` }}>
                    {formatCell(cellValue(ri, ci))}
                    {residualMode && Math.abs(res) >= 1.96 && <span className="ml-0.5 text-[0.85em]" aria-label={res > 0 ? "acima do esperado" : "abaixo do esperado"}>{res > 0 ? "▲" : "▼"}</span>}
                  </td>
                );
              })}
              <td className="px-2 py-1 text-center font-semibold whitespace-nowrap" style={{ color: "rgb(var(--color-ink-500))" }}>{formatNumber(data.rowTotals[ri])}</td>
            </tr>
          ))}
          <tr>
            <td className="px-2 py-1 font-semibold whitespace-nowrap sticky left-0" style={{ color: "rgb(var(--color-ink-500))", background: "rgb(var(--color-ink-900))", borderTop: "1px solid rgb(var(--color-ink-700))" }}>Total</td>
            {data.colTotals.map((t, i) => (
              <td key={i} className="px-2 py-1 text-center font-semibold whitespace-nowrap" style={{ color: "rgb(var(--color-ink-500))", borderTop: "1px solid rgb(var(--color-ink-700))" }}>{formatNumber(t)}</td>
            ))}
            <td className="px-2 py-1 text-center font-bold whitespace-nowrap" style={{ color: "rgb(var(--color-ink-100))", borderTop: "1px solid rgb(var(--color-ink-700))" }}>{formatNumber(data.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
      {residualMode ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-shrink-0 px-1 text-2xs text-ink-500">
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-2.5 rounded-[2px]" style={{ background: "rgba(42,118,128,0.6)" }} />▲ acima do esperado</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-2.5 rounded-[2px]" style={{ background: "rgba(168,86,48,0.6)" }} />▼ abaixo do esperado</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-2.5 rounded-[2px]" style={{ background: "rgba(181,170,148,0.2)" }} />dentro do esperado</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-shrink-0 px-1 max-w-xs">
          <span className="text-2xs" style={{ color: "rgb(var(--color-ink-500))" }}>0</span>
          <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, rgba(${accent},0.08), rgba(${accent},0.63))` }} />
          <span className="text-2xs font-semibold" style={{ color: "rgb(var(--color-ink-100))" }}>{valueMode === "count" ? formatNumber(legendMax) : `${formatNumber(legendMax, 0)}%`}</span>
        </div>
      )}
      {showStats && stats && (
        <p className="flex-shrink-0 flex gap-1.5 items-start rounded-md px-2 py-1.5 text-2xs leading-relaxed"
          style={{ background: stats.significant ? "rgb(var(--color-teal-50))" : "rgb(var(--color-ink-800))", color: "rgb(var(--color-ink-100))" }}>
          <i className={`ti ${stats.significant ? "ti-chart-arrows-vertical" : "ti-equal"} text-sm flex-shrink-0`} aria-hidden="true" style={{ color: stats.significant ? "rgb(var(--color-teal-500))" : "rgb(var(--color-ink-500))" }} />
          <span>
            {describeStats(stats)}
            {stats.lowExpected && <span className="text-ink-500"> Atenção: poucas respostas em várias combinações — leia com cautela.</span>}
          </span>
        </p>
      )}
    </div>
  );
}

function TableView({ data }: { data: Extract<WidgetData, { kind: "table" }> }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="sticky top-0 z-[1] bg-ink-800">
            {data.columns.map(c => (
              <th key={c.fieldId} className="px-2.5 py-2 text-left text-2xs font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-ink-300">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.responseId} className="border-b border-ink-700 even:bg-ink-800/40">
              {data.columns.map(c => (
                <td key={c.fieldId} className="px-2.5 py-1.5 text-ink-100">
                  {String(row.values[c.fieldId] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
