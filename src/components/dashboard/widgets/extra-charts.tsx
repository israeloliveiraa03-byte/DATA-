"use client";

// Gráficos estendidos cobertos nativamente pelo recharts: barra empilhada,
// área, histograma, dispersão/bolhas, treemap e radar. Os que o recharts
// não cobre bem (divergente, boxplot, violino, pontos/pirulito, waffle,
// dumbbell, intervalos) ficam em shape-charts.tsx (SVG/HTML próprios).

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap,
  XAxis, YAxis, ZAxis,
} from "recharts";
import type { ChoiceAggResult, CrosstabResult, DisplayMode, HistogramResult, RadarResult, ScatterResult, TimeSeriesResult } from "@/lib/dashboard/types";
import { ChartLegend, formatNumber, TOOLTIP_STYLE, toPercent } from "./chart-common";

// ─── Barra empilhada (parte-do-todo) ───────────────────────────────────────
// Cor segue o segmento (opção da categoria empilhada), fixa pela ordem das
// opções. "percent" = 100% empilhado (% dentro de cada barra). O vão de 2px
// entre segmentos vem do stroke branco (regra de marcas da skill de dataviz).
export function StackedBarView({ data, colors, displayMode }: { data: CrosstabResult; colors: string[]; displayMode: DisplayMode }) {
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
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#f3e4cb" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5c3f13" }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} tickFormatter={percent ? (v: number) => `${v}%` : undefined} domain={percent ? [0, 100] : undefined} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [fmt(Number(v)), String(name)]} />
            {data.cols.map((c, i) => (
              <Bar key={c.id} dataKey={c.id} name={c.label} stackId="stack" fill={colors[i % colors.length]}
                stroke="#fff" strokeWidth={1.5} maxBarSize={48} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data.cols} colors={colors} />
    </div>
  );
}

// ─── Área (variação do gráfico de linha) ───────────────────────────────────
function formatBucketDate(dateKey: string, interval: "day" | "week" | "month"): string {
  const [y, m, d] = dateKey.split("-");
  return interval === "month" ? `${m}/${y.slice(2)}` : `${d}/${m}`;
}

export function AreaChartView({ data, colors }: { data: TimeSeriesResult; colors: string[] }) {
  const chartData = data.points.map(p => ({ date: formatBucketDate(p.date, data.interval), ...p.values }));
  const multi = data.series.length >= 2;
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#f3e4cb" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5c3f13" }} minTickGap={18} />
            <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} width={34} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [formatNumber(Number(v)), String(name)]} />
            {data.series.map((s, i) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={colors[i % colors.length]} strokeWidth={2}
                fill={colors[i % colors.length]} fillOpacity={0.22}
                dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {multi && <ChartLegend data={data.series} colors={colors} />}
    </div>
  );
}

// ─── Histograma ────────────────────────────────────────────────────────────
// Uma variável só → uma matiz só (a cor não codifica categoria aqui, os
// bins são magnitude da mesma coisa). Barras quase encostadas (convenção de
// histograma: o eixo é contínuo).
export function HistogramView({ data, colors }: { data: HistogramResult; colors: string[] }) {
  const longLabels = data.bins.some(b => b.label.length > 4);
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.bins} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="4%">
            <CartesianGrid vertical={false} stroke="#f3e4cb" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5c3f13" }} interval={longLabels ? "preserveStartEnd" : 0}
              angle={longLabels ? -25 : 0} textAnchor={longLabels ? "end" : "middle"} height={longLabels ? 46 : 24} />
            <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} width={34} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [formatNumber(Number(v)), "Respostas"]} />
            <Bar dataKey="count" fill={colors[0]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-2xs text-center flex-shrink-0" style={{ color: "#a06d28" }}>{formatNumber(data.total)} respostas</p>
    </div>
  );
}

// ─── Dispersão / bolhas ────────────────────────────────────────────────────
export function ScatterView({ data, colors, bubble }: { data: ScatterResult; colors: string[]; bubble: boolean }) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 16 }}>
            <CartesianGrid stroke="#f3e4cb" />
            <XAxis type="number" dataKey="x" name={data.xLabel} tick={{ fontSize: 10, fill: "#5c3f13" }}
              label={{ value: data.xLabel, position: "insideBottom", offset: -10, fontSize: 10, fill: "#a06d28" }} />
            <YAxis type="number" dataKey="y" name={data.yLabel} tick={{ fontSize: 10, fill: "#5c3f13" }} width={40}
              label={{ value: data.yLabel, angle: -90, position: "insideLeft", fontSize: 10, fill: "#a06d28" }} />
            {bubble && <ZAxis type="number" dataKey="z" name={data.zLabel ?? ""} range={[40, 400]} />}
            <Tooltip {...TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3", stroke: "#d2a05c" }}
              formatter={(v, name) => [formatNumber(Number(v), 2), String(name)]} />
            <Scatter data={data.points} fill={colors[0]} fillOpacity={0.75} stroke="#fff" strokeWidth={1} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-2xs text-center flex-shrink-0" style={{ color: "#a06d28" }}>
        {formatNumber(data.points.length)} respostas{bubble && data.zLabel ? ` · tamanho: ${data.zLabel}` : ""}
      </p>
    </div>
  );
}

// ─── Treemap ───────────────────────────────────────────────────────────────
// Conteúdo custom: cor fixa pela ordem da opção (identidade), vão branco de
// 2px entre células, rótulo direto só onde cabe.
interface TreemapCellProps {
  x?: number; y?: number; width?: number; height?: number;
  index?: number; name?: string; value?: number;
  colors: string[]; total: number;
}

function TreemapCell(props: TreemapCellProps) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name, value = 0, colors, total } = props;
  if (width <= 0 || height <= 0) return null;
  const fits = width > 56 && height > 30;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3}
        fill={colors[index % colors.length]} stroke="#fff" strokeWidth={2} />
      {fits && (
        <>
          <text x={x + 6} y={y + 14} fontSize={10} fontWeight={600} fill="#fff">
            {String(name ?? "").slice(0, Math.floor(width / 6))}
          </text>
          <text x={x + 6} y={y + 26} fontSize={9} fill="rgba(255,255,255,0.85)">
            {formatNumber(value)}{total > 0 ? ` · ${formatNumber(toPercent(value, total), 0)}%` : ""}
          </text>
        </>
      )}
      {fits && <title>{`${name}: ${formatNumber(value)}`}</title>}
    </g>
  );
}

export function TreemapView({ data, colors }: { data: ChoiceAggResult; colors: string[] }) {
  const cells = data.buckets.filter(b => b.count > 0).map(b => ({ name: b.label, size: b.count }));
  const withData = data.buckets.filter(b => b.count > 0);
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={cells} dataKey="size" isAnimationActive={false}
            content={<TreemapCell colors={colors} total={data.totalResponses} />}>
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [formatNumber(Number(v)), String(name)]} />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={withData} colors={colors}
        values={withData.map(b => `${formatNumber(toPercent(b.count, data.totalResponses), 0)}%`)} />
    </div>
  );
}

// ─── Radar ─────────────────────────────────────────────────────────────────
export function RadarChartView({ data, colors }: { data: RadarResult; colors: string[] }) {
  const chartData = data.axes.map(axis => {
    const entry: Record<string, string | number | null> = { axis: axis.label };
    for (const s of data.series) entry[s.key] = s.values[axis.key];
    return entry;
  });
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
            <PolarGrid stroke="#f3e4cb" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: "#5c3f13" }} />
            <PolarRadiusAxis tick={{ fontSize: 8, fill: "#a06d28" }} stroke="#e8d8be" />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [formatNumber(Number(v), 2), String(name)]} />
            {data.series.map((s, i) => (
              <Radar key={s.key} dataKey={s.key} name={s.label}
                stroke={colors[i % colors.length]} strokeWidth={2}
                fill={colors[i % colors.length]} fillOpacity={0.15} isAnimationActive={false} />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data.series} colors={colors} />
    </div>
  );
}
