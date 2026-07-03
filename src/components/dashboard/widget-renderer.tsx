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
  return (
    <div className="w-full h-full flex flex-col p-3 overflow-hidden">
      {title && <p className="text-xs font-bold mb-2 flex-shrink-0" style={{ color: "#5c3f13" }}>{title}</p>}
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
    return <p className="text-sm whitespace-pre-wrap" style={{ color: "#111" }}>{data.content || "—"}</p>;
  }

  if (data.kind === "map") {
    if (data.points.length === 0) return <EmptyState />;
    return <MapWidget data={data} />;
  }

  if (data.kind === "heatmap") {
    if (Object.keys(data.byState).length === 0) return <EmptyState />;
    return <HeatmapWidget data={data} />;
  }

  return null;
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

function BarChartView({ data }: { data: { optionId: string; label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5c3f13" }} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#c48a42" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ data, donut }: { data: { optionId: string; label: string; count: number }[]; donut: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius={donut ? "50%" : 0} outerRadius="85%">
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
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
