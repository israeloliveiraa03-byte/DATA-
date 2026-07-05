"use client";

import dynamic from "next/dynamic";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { COLOR_PALETTES, type ColorPalette, type DisplayMode, type SupportedWidgetType, type TimeSeriesResult, type WidgetData } from "@/lib/dashboard/types";

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
  // Tonalidade por widget (config.colorPalette, hoje configurável nos mapas)
  // vence a paleta do dashboard; sem ela, herda o comportamento de sempre.
  const widgetPalette = typeof config.colorPalette === "string" ? COLOR_PALETTES[config.colorPalette] : undefined;
  const resolvedPalette = widgetPalette ?? COLOR_PALETTES[palette ?? ""] ?? COLOR_PALETTES.terracota;

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
      return <GlobeHeatmapWidget data={data} palette={palette} displayMode={config.displayMode === "percent" ? "percent" : "count"} />;
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
    const displayMode: DisplayMode = config.displayMode === "percent" ? "percent" : "count";
    if (type === "bar_chart") return <BarChartView data={data.buckets} colors={palette.chartColors} displayMode={displayMode} totalResponses={data.totalResponses} />;
    return <PieChartView data={data.buckets} donut={type === "donut_chart"} colors={palette.chartColors} displayMode={displayMode} totalResponses={data.totalResponses} />;
  }

  if (data.kind === "timeseries") {
    if (data.points.length === 0) return <EmptyState />;
    return <LineChartView data={data} colors={palette.chartColors} />;
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
    return <HeatmapWidget data={data} palette={palette} basemap={config.basemap as string | undefined} displayMode={config.displayMode === "percent" ? "percent" : "count"} />;
  }

  if (data.kind === "crosstab") {
    if (data.rows.length === 0 || data.cols.length === 0 || data.grandTotal === 0) return <EmptyState />;
    // Gráfico de barras com campo de comparação configurado recebe um
    // resultado de cruzamento e desenha barras agrupadas (categoria A no
    // eixo, uma barra por opção da categoria B, cor fixa por opção).
    if (type === "bar_chart") {
      return <GroupedBarView data={data} colors={palette.chartColors} displayMode={config.displayMode === "percent" ? "percent" : "count"} />;
    }
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

// Legenda temática dos gráficos — chips arredondados com a marca de cor da
// série, mesmo estilo já usado na legenda do mapa de pontos (o texto fica
// sempre na cor de texto, nunca na cor da série — a identidade é do chip).
// Regra: legenda sempre presente pra 2+ séries/categorias; pra 1 série só,
// o título do widget já nomeia o dado — não renderiza chip nenhum.
function ChartLegend({ data, colors, values }: { data: { label: string }[]; colors: string[]; values?: string[] }) {
  if (data.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1 justify-center px-1 pt-1 flex-shrink-0">
      {data.map((d, i) => (
        <span key={i} className="flex items-center gap-1 text-2xs rounded-full px-2 py-0.5"
          style={{ color: "#5c3f13", border: "1px solid #e8d8be", background: "#fdfaf4" }}>
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
          {d.label}
          {values?.[i] !== undefined && <span style={{ color: "#a06d28" }}>{values[i]}</span>}
        </span>
      ))}
    </div>
  );
}

// Tooltip padrão dos gráficos recharts — mesma moldura terracota do resto.
const TOOLTIP_STYLE = {
  contentStyle: { border: "1px solid #e8d8be", borderRadius: 8, background: "#fff", fontSize: 11, padding: "6px 10px", boxShadow: "0 2px 6px rgba(22,23,26,0.08)" },
  labelStyle: { color: "#5c3f13", fontWeight: 600 },
  itemStyle: { color: "#111", padding: 0 },
} as const;

interface ChoiceViewProps {
  data: { optionId: string; label: string; count: number }[];
  colors: string[];
  displayMode: DisplayMode;
  totalResponses: number;
}

// "percent" = % das respostas que marcaram a opção (base: respostas que
// responderam o campo; em múltipla escolha a soma pode passar de 100% de
// propósito — cada resposta pode marcar mais de uma opção).
function toPercent(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

function BarChartView({ data, colors, displayMode, totalResponses }: ChoiceViewProps) {
  const percent = displayMode === "percent";
  const chartData = percent ? data.map(d => ({ ...d, count: toPercent(d.count, totalResponses) })) : data;
  const fmt = (v: number) => percent ? `${formatNumber(v, 1)}%` : formatNumber(v);
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#f3e4cb" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5c3f13" }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} tickFormatter={percent ? (v: number) => `${v}%` : undefined} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [fmt(Number(v)), percent ? "% das respostas" : "Respostas"]} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data} colors={colors} values={data.map(d => percent ? `${formatNumber(toPercent(d.count, totalResponses), 0)}%` : formatNumber(d.count))} />
    </div>
  );
}

function PieChartView({ data, donut, colors, displayMode, totalResponses }: ChoiceViewProps & { donut: boolean }) {
  const percent = displayMode === "percent";
  const fmt = (v: number) => percent ? `${formatNumber(toPercent(v, totalResponses), 1)}%` : formatNumber(v);
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={donut ? "50%" : 0} outerRadius="85%" paddingAngle={data.length > 1 ? 2 : 0}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="#fff" strokeWidth={1.5} />)}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [fmt(Number(v)), String(name)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data} colors={colors} values={data.map(d => fmt(d.count))} />
    </div>
  );
}

// Formata a data do eixo/tooltip conforme o intervalo — dd/mm pra dia e
// semana, mm/aa pra mês (rótulo curto, o tooltip carrega o completo).
function formatBucketDate(dateKey: string, interval: "day" | "week" | "month"): string {
  const [y, m, d] = dateKey.split("-");
  return interval === "month" ? `${m}/${y.slice(2)}` : `${d}/${m}`;
}

function LineChartView({ data, colors }: { data: TimeSeriesResult; colors: string[] }) {
  const chartData = data.points.map(p => ({ date: formatBucketDate(p.date, data.interval), ...p.values }));
  const multi = data.series.length >= 2;
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#f3e4cb" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5c3f13" }} minTickGap={18} />
            <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} width={34} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [formatNumber(Number(v)), String(name)]} />
            {data.series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={colors[i % colors.length]} strokeWidth={2}
                dot={chartData.length <= 40 ? { r: 2.5, strokeWidth: 0, fill: colors[i % colors.length] } : false}
                activeDot={{ r: 4 }} isAnimationActive={false} />
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
function GroupedBarView({ data, colors, displayMode }: { data: Extract<WidgetData, { kind: "crosstab" }>; colors: string[]; displayMode: DisplayMode }) {
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
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="#f3e4cb" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#5c3f13" }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "#5c3f13" }} allowDecimals={false} tickFormatter={percent ? (v: number) => `${v}%` : undefined} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [fmt(Number(v)), String(name)]} />
            {data.cols.map((c, i) => (
              <Bar key={c.id} dataKey={c.id} name={c.label} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend data={data.cols} colors={colors} />
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
