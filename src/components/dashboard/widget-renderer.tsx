"use client";

import dynamic from "next/dynamic";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { SupportedWidgetType, WidgetData } from "@/lib/dashboard/types";

// Leaflet acessa `window`/`document` direto — não roda em SSR.
const HeatmapWidget = dynamic(() => import("@/components/dashboard/widgets/heatmap-widget").then(m => m.HeatmapWidget), { ssr: false });
const MapWidget     = dynamic(() => import("@/components/dashboard/widgets/map-widget").then(m => m.MapWidget), { ssr: false });

const CHART_COLORS = ["#c48a42", "#4c6b3c", "#1a56db", "#534ab7", "#c0392b", "#0c447c", "#7a5218", "#3a5430"];

function formatNumber(n: number, decimals?: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 2 });
}

interface WidgetRendererProps {
  type:   SupportedWidgetType;
  title?: string | null;
  data:   WidgetData;
  config: Record<string, unknown>;
}

export function WidgetRenderer({ type, title, data, config }: WidgetRendererProps) {
  // Aparência genérica (fundo/borda) — qualquer tipo de widget aceita.
  // Decorativos (divisória/bloco de cor) não têm padding: a cor precisa
  // preencher a caixa inteira, não uma caixa branca com um retângulo dentro.
  const appearance = (config.style ?? {}) as { backgroundColor?: string; borderRadius?: number };
  const variant = config.variant as string | undefined;
  const isDecorative = type === "text" && (variant === "divider" || variant === "block");

  return (
    <div className={isDecorative ? "w-full h-full flex flex-col overflow-hidden" : "w-full h-full flex flex-col p-3 overflow-hidden"}
      style={{
        backgroundColor: appearance.backgroundColor,
        borderRadius: appearance.borderRadius,
      }}>
      {title && !isDecorative && <p className="text-xs font-bold mb-2 flex-shrink-0" style={{ color: "#5c3f13" }}>{title}</p>}
      <div className="flex-1 min-h-0">
        <WidgetBody type={type} data={data} config={config} />
      </div>
    </div>
  );
}

function WidgetBody({ type, data, config }: Omit<WidgetRendererProps, "title">) {
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
    if (type === "bar_chart") return <BarChartView data={data.buckets} />;
    return <PieChartView data={data.buckets} donut={type === "donut_chart"} />;
  }

  if (data.kind === "table") {
    if (data.rows.length === 0) return <EmptyState />;
    return <TableView data={data} />;
  }

  if (data.kind === "text") {
    const variant = (config.variant as string) ?? "text";
    if (variant === "divider") return <DividerView config={config} />;
    if (variant === "block") return null; // a cor já vem do fundo do container (config.style)
    const textStyle = (config.textStyle ?? {}) as { fontSize?: number; fontWeight?: "normal" | "bold"; color?: string; align?: "left" | "center" | "right" };
    return (
      <p className="whitespace-pre-wrap h-full" style={{
        color: textStyle.color ?? "#111",
        fontSize: textStyle.fontSize ? `${textStyle.fontSize}px` : "14px",
        fontWeight: textStyle.fontWeight ?? "normal",
        textAlign: textStyle.align ?? "left",
      }}>
        {data.content || "—"}
      </p>
    );
  }

  if (data.kind === "map") {
    if (data.points.length === 0) return <EmptyState />;
    return <MapWidget data={data} />;
  }

  if (data.kind === "image") {
    if (!data.imageUrl) return <EmptyState />;
    // eslint-disable-next-line @next/next/no-img-element -- base64 gerado no cliente, não é um asset otimizável pelo next/image
    return <img src={data.imageUrl} alt="" className="w-full h-full" style={{ objectFit: data.fit }} />;
  }

  if (data.kind === "heatmap") {
    const hasAnyData = data.indicators.length > 0 && Object.keys(data.byIndicator[data.indicators[0].key] ?? {}).length > 0;
    if (!hasAnyData) return <EmptyState />;
    return <HeatmapWidget data={data} />;
  }

  return null;
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

function ChartLegend({ data }: { data: { label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center px-1 pt-1 flex-shrink-0">
      {data.map((d, i) => (
        <span key={i} className="flex items-center gap-1 text-2xs" style={{ color: "#5c3f13" }}>
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
          {d.label}
        </span>
      ))}
    </div>
  );
}

function BarChartView({ data }: { data: { optionId: string; label: string; count: number }[] }) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5c3f13" }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data} />
    </div>
  );
}

function PieChartView({ data, donut }: { data: { optionId: string; label: string; count: number }[]; donut: boolean }) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={donut ? "50%" : 0} outerRadius="85%">
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data} />
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
