export type SupportedWidgetType = "number_card" | "bar_chart" | "pie_chart" | "donut_chart" | "table" | "text" | "map" | "heatmap";

export interface NumberCardConfig {
  fieldId?: string;
  aggregation: "count" | "count_completed" | "avg" | "sum" | "min" | "max";
  suffix?: string;
  decimals?: number;
}

export interface ChoiceChartConfig {
  fieldId: string;
  sortBy?: "count_desc" | "option_order";
}

export interface TableConfig {
  fieldIds: string[];
  limit?: number;
  onlyCompleted?: boolean;
}

export interface TextConfig {
  content: string;
}

// Mapa de pontos — um marcador por resposta que tenha respondido um campo
// geo_coords.
export interface MapConfig {
  geoFieldId: string;
}

// Mapa de calor por estado — agrupa respostas pelo campo geo_state; modo
// "count" colore por volume de respostas, "choice_percent" colore pela %
// de respostas do estado em que outro campo (de escolha) bate com uma opção.
export interface HeatmapConfig {
  geoFieldId: string;
  indicatorMode: "count" | "choice_percent";
  indicatorFieldId?: string;
  indicatorOptionId?: string;
}

export type WidgetConfig = NumberCardConfig | ChoiceChartConfig | TableConfig | TextConfig | MapConfig | HeatmapConfig;

export interface ChoiceOption {
  id: string;
  label: string;
  weight?: number;
}

export interface CountResult {
  kind: "count";
  total: number;
  completed: number;
}

export interface NumericResult {
  kind: "numeric";
  count: number;
  avg: number | null;
  sum: number;
  min: number | null;
  max: number | null;
}

export interface ChoiceBucket {
  optionId: string;
  label: string;
  count: number;
}

export interface ChoiceAggResult {
  kind: "choice";
  buckets: ChoiceBucket[];
  totalResponses: number;
}

export interface TableRow {
  responseId: string;
  submittedAt: string | null;
  values: Record<string, unknown>;
}

export interface TableResult {
  kind: "table";
  columns: { fieldId: string; label: string }[];
  rows: TableRow[];
}

export interface TextResult {
  kind: "text";
  content: string;
}

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface MapResult {
  kind: "map";
  points: MapPoint[];
}

export interface HeatmapStateValue {
  value: number;
  count: number;
}

export interface HeatmapResult {
  kind: "heatmap";
  byState: Record<string, HeatmapStateValue>;
  max: number;
}

export type WidgetData = CountResult | NumericResult | ChoiceAggResult | TableResult | TextResult | MapResult | HeatmapResult;

export const NUMERIC_FIELD_TYPES = ["number", "scale", "nps", "stars", "slider"] as const;
export const CHOICE_FIELD_TYPES = ["single_choice", "multiple_choice", "yes_no", "weighted", "consent"] as const;

export const SUPPORTED_WIDGET_TYPES: { value: SupportedWidgetType; label: string; icon: string }[] = [
  { value: "number_card", label: "Número",  icon: "ti-square-rounded-number-1" },
  { value: "bar_chart",   label: "Barras",  icon: "ti-chart-bar" },
  { value: "pie_chart",   label: "Pizza",   icon: "ti-chart-pie" },
  { value: "donut_chart", label: "Rosca",   icon: "ti-chart-donut" },
  { value: "table",       label: "Tabela",  icon: "ti-table" },
  { value: "text",        label: "Texto",   icon: "ti-text-size" },
  { value: "map",         label: "Mapa de pontos", icon: "ti-map-pin" },
  { value: "heatmap",     label: "Mapa de calor",  icon: "ti-map-2" },
];
