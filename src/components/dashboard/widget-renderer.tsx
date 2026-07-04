"use client";

import dynamic from "next/dynamic";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { COLOR_PALETTES, type ColorPalette, type SupportedWidgetType, type WidgetData } from "@/lib/dashboard/types";

// Leaflet e three.js (via react-globe.gl) acessam `window`/`document`/WebGL
// direto — não rodam em SSR. Aprendido do jeito difícil com o
// react-moveable: toda lib que mexe em DOM/GPU direto entra assim desde o
// primeiro commit, nunca depois.
const HeatmapWidget      = dynamic(() => import("@/components/dashboard/widgets/heatmap-widget").then(m => m.HeatmapWidget), { ssr: false });
const MapWidget          = dynamic(() => import("@/components/dashboard/widgets/map-widget").then(m => m.MapWidget), { ssr: false });
const GlobePointsWidget  = dynamic(() => import("@/components/dashboard/widgets/globe-widget").then(m => m.GlobePointsWidget), { ssr: false });
const GlobeHeatmapWidget = dynamic(() => import("@/components/dashboard/widgets/globe-widget").then(m => m.GlobeHeatmapWidget), { ssr: false });

function formatNumber(n: number, decimals?: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 2 });
}

interface WidgetRendererProps {
  type:    SupportedWidgetType;
  title?:  string | null;
  data:    WidgetData;
  config:  Record<string, unknown>;
  palette?: string; // chave de COLOR_PALETTES — nível do dashboard, não do widget
}

export function WidgetRenderer({ type, title, data, config, palette }: WidgetRendererProps) {
  // Aparência genérica (fundo/borda) — qualquer tipo de widget aceita.
  // Decorativos (divisória/bloco de cor) não têm padding: a cor precisa
  // preencher a caixa inteira, não uma caixa branca com um retângulo dentro.
  const appearance = (config.style ?? {}) as { backgroundColor?: string; borderRadius?: number };
  const variant = config.variant as string | undefined;
  const isDecorative = type === "text" && (variant === "divider" || variant === "block" || variant === "icon");
  const resolvedPalette = COLOR_PALETTES[palette ?? ""] ?? COLOR_PALETTES.terracota;

  return (
    <div className={isDecorative ? "w-full h-full flex flex-col overflow-hidden" : "w-full h-full flex flex-col p-3 overflow-hidden"}
      style={{
        backgroundColor: appearance.backgroundColor,
        borderRadius: appearance.borderRadius,
      }}>
      {title && !isDecorative && <p className="text-xs font-bold mb-2 flex-shrink-0" style={{ color: "#5c3f13" }}>{title}</p>}
      <div className="flex-1 min-h-0">
        <WidgetBody type={type} data={data} config={config} palette={resolvedPalette} />
      </div>
    </div>
  );
}

function WidgetBody({ type, data, config, palette }: Omit<WidgetRendererProps, "title" | "palette"> & { palette: ColorPalette }) {
  // "globe" reaproveita os mesmos dados de map/heatmap (mesmo "kind"), só
  // troca a visualização — precisa vir antes das checagens genéricas de
  // data.kind === "map"/"heatmap" que renderizam a versão 2D.
  if (type === "globe") {
    if (data.kind === "map") {
      if (data.points.length === 0) return <EmptyState />;
      return <GlobePointsWidget data={data} palette={palette} />;
    }
    if (data.kind === "heatmap") {
      const hasAnyData = data.indicators.length > 0 && Object.keys(data.byIndicator[data.indicators[0].key] ?? {}).length > 0;
      if (!hasAnyData) return <EmptyState />;
      return <GlobeHeatmapWidget data={data} palette={palette} />;
    }
    return <EmptyState />;
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
    if (type === "bar_chart") return <BarChartView data={data.buckets} colors={palette.chartColors} />;
    return <PieChartView data={data.buckets} donut={type === "donut_chart"} colors={palette.chartColors} />;
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
        color: textStyle.color ?? "#111",
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
    return <MapWidget data={data} palette={palette} />;
  }

  if (data.kind === "image") {
    if (!data.imageUrl) return <EmptyState />;
    // eslint-disable-next-line @next/next/no-img-element -- base64 gerado no cliente, não é um asset otimizável pelo next/image
    return <img src={data.imageUrl} alt="" className="w-full h-full" style={{ objectFit: data.fit }} />;
  }

  if (data.kind === "heatmap") {
    const hasAnyData = data.indicators.length > 0 && Object.keys(data.byIndicator[data.indicators[0].key] ?? {}).length > 0;
    if (!hasAnyData) return <EmptyState />;
    return <HeatmapWidget data={data} palette={palette} />;
  }

  if (data.kind === "crosstab") {
    if (data.rows.length === 0 || data.cols.length === 0 || data.grandTotal === 0) return <EmptyState />;
    return <CrosstabView data={data} valueMode={(config.valueMode as string) ?? "count"} palette={palette} />;
  }

  return null;
}

function IconView({ config }: { config: Record<string, unknown> }) {
  const textStyle = (config.textStyle ?? {}) as { fontSize?: number; color?: string };
  const iconName = (config.iconName as string) || "map-pin";
  return (
    <div className="w-full h-full flex items-center justify-center">
      <i className={`ti ti-${iconName}`} style={{ fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : "32px", color: textStyle.color ?? "#c48a42" }} />
    </div>
  );
}

function DividerView({ config }: { config: Record<string, unknown> }) {
  const textStyle = (config.textStyle ?? {}) as { color?: string };
  return (
    <div className="w-full h-full flex items-center">
      <div className="w-full" style={{ height: 2, background: textStyle.color ?? "#e8d8be" }} />
    </div>
  );
}

function EmptyState() {
  return <p className="text-xs italic" style={{ color: "#a06d28" }}>Sem dados suficientes ainda</p>;
}

function NumberDisplay({ value, suffix, decimals }: { value: number; suffix?: string; decimals?: number }) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <p className="text-3xl font-bold" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif" }}>
        {formatNumber(value, decimals)}{suffix ? ` ${suffix}` : ""}
      </p>
    </div>
  );
}

function ChartLegend({ data, colors }: { data: { label: string }[]; colors: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center px-1 pt-1 flex-shrink-0">
      {data.map((d, i) => (
        <span key={i} className="flex items-center gap-1 text-2xs" style={{ color: "#5c3f13" }}>
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
          {d.label}
        </span>
      ))}
    </div>
  );
}

function BarChartView({ data, colors }: { data: { optionId: string; label: string; count: number }[]; colors: string[] }) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5c3f13" }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data} colors={colors} />
    </div>
  );
}

function PieChartView({ data, donut, colors }: { data: { optionId: string; label: string; count: number }[]; donut: boolean; colors: string[] }) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={donut ? "50%" : 0} outerRadius="85%">
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data} colors={colors} />
    </div>
  );
}

function CrosstabView({ data, valueMode, palette }: { data: Extract<WidgetData, { kind: "crosstab" }>; valueMode: string; palette: ColorPalette }) {
  const accent = palette.accent;
  function cellValue(ri: number, ci: number): number {
    const raw = data.cells[ri][ci];
    if (valueMode === "row_percent") return data.rowTotals[ri] > 0 ? (raw / data.rowTotals[ri]) * 100 : 0;
    if (valueMode === "col_percent") return data.colTotals[ci] > 0 ? (raw / data.colTotals[ci]) * 100 : 0;
    return raw;
  }
  const maxCount = Math.max(1, ...data.cells.flat());
  function intensity(ri: number, ci: number): number {
    if (valueMode === "count") return data.cells[ri][ci] / maxCount;
    return cellValue(ri, ci) / 100;
  }
  function formatCell(v: number): string {
    return valueMode === "count" ? formatNumber(v) : `${formatNumber(v, 1)}%`;
  }
  const legendMax = valueMode === "count" ? maxCount : 100;

  return (
    <div className="h-full flex flex-col gap-1.5">
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th className="px-2 py-1 text-left sticky left-0" style={{ background: "#fff" }} />
            {data.cols.map(c => (
              <th key={c.id} className="px-2 py-1 text-center font-bold whitespace-nowrap" style={{ color: "#c48a42", borderBottom: "1px solid #e8d8be" }}>{c.label}</th>
            ))}
            <th className="px-2 py-1 text-center font-bold whitespace-nowrap" style={{ color: "#a06d28", borderBottom: "1px solid #e8d8be" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, ri) => (
            <tr key={r.id}>
              <td className="px-2 py-1 font-semibold whitespace-nowrap sticky left-0" style={{ color: "#5c3f13", background: "#fff", borderRight: "1px solid #e8d8be" }}>{r.label}</td>
              {data.cols.map((c, ci) => (
                <td key={c.id} className="px-2 py-1 text-center whitespace-nowrap" style={{ color: "#111", background: `rgba(${accent}, ${(0.08 + intensity(ri, ci) * 0.55).toFixed(2)})` }}>
                  {formatCell(cellValue(ri, ci))}
                </td>
              ))}
              <td className="px-2 py-1 text-center font-semibold whitespace-nowrap" style={{ color: "#a06d28" }}>{formatNumber(data.rowTotals[ri])}</td>
            </tr>
          ))}
          <tr>
            <td className="px-2 py-1 font-semibold whitespace-nowrap sticky left-0" style={{ color: "#a06d28", background: "#fff", borderTop: "1px solid #e8d8be" }}>Total</td>
            {data.colTotals.map((t, i) => (
              <td key={i} className="px-2 py-1 text-center font-semibold whitespace-nowrap" style={{ color: "#a06d28", borderTop: "1px solid #e8d8be" }}>{formatNumber(t)}</td>
            ))}
            <td className="px-2 py-1 text-center font-bold whitespace-nowrap" style={{ color: "#5c3f13", borderTop: "1px solid #e8d8be" }}>{formatNumber(data.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 px-1">
        <span className="text-2xs" style={{ color: "#a06d28" }}>0</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, rgba(${accent},0.08), rgba(${accent},0.63))` }} />
        <span className="text-2xs font-semibold" style={{ color: "#5c3f13" }}>{valueMode === "count" ? formatNumber(legendMax) : `${formatNumber(legendMax, 0)}%`}</span>
      </div>
    </div>
  );
}

function TableView({ data }: { data: Extract<WidgetData, { kind: "table" }> }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid #e8d8be" }}>
            {data.columns.map(c => (
              <th key={c.fieldId} className="px-2 py-1 text-left font-bold whitespace-nowrap" style={{ color: "#c48a42" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.responseId} style={{ borderBottom: "1px solid #f3e4cb" }}>
              {data.columns.map(c => (
                <td key={c.fieldId} className="px-2 py-1" style={{ color: "#111" }}>
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
