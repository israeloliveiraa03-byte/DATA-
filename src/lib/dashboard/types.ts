export type SupportedWidgetType = "number_card" | "bar_chart" | "pie_chart" | "donut_chart" | "table" | "text" | "map" | "heatmap" | "image" | "crosstab" | "globe";

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

// Aparência genérica — fundo e borda arredondada. Qualquer tipo de widget
// aceita isso dentro do próprio `config` (que é jsonb livre em tempo de
// execução); só documentado aqui uma vez em vez de repetido em cada
// interface de config.
export interface WidgetAppearance {
  backgroundColor?: string;
  borderRadius?: number;
}

// "text" também cobre os elementos decorativos (sem fonte de dado, igual
// texto): variant "divider" ignora o conteúdo e desenha uma linha; "block"
// ignora o conteúdo e desenha um retângulo de cor sólida; "icon" ignora o
// conteúdo e desenha um ícone Tabler (mesma fonte de ícone já usada em toda
// a UI) — reaproveita textStyle.fontSize como tamanho e textStyle.color
// como cor do ícone, sem precisar de um bloco de estilo próprio.
export interface TextConfig {
  content: string;
  variant?: "text" | "divider" | "block" | "icon";
  iconName?: string;
  textStyle?: {
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    color?: string;
    align?: "left" | "center" | "right";
  };
  style?: WidgetAppearance;
}

// Ícones curados pro contexto territorial/científico do Dataº — todos já
// existem na fonte Tabler carregada globalmente (classe `ti ti-<nome>`).
export const DECORATIVE_ICON_OPTIONS: { name: string; label: string }[] = [
  { name: "home",            label: "Casa" },
  { name: "school",          label: "Escola" },
  { name: "droplet",         label: "Água" },
  { name: "plant-2",         label: "Agricultura" },
  { name: "users",           label: "Comunidade" },
  { name: "map-pin",         label: "Localização" },
  { name: "building-church", label: "Terreiro/Templo" },
  { name: "fish",            label: "Pesca" },
  { name: "tree",            label: "Território" },
  { name: "file-text",       label: "Documento" },
  { name: "certificate",     label: "Certificação" },
  { name: "shield-check",    label: "Proteção" },
  { name: "book",            label: "Educação" },
  { name: "heart",           label: "Saúde" },
  { name: "sun",             label: "Clima" },
  { name: "tractor",         label: "Agricultura familiar" },
  { name: "tent",            label: "Assentamento" },
  { name: "star",            label: "Destaque" },
  { name: "flag",            label: "Marco" },
  { name: "world",           label: "Nacional" },
];

// Mapa de pontos — um marcador por resposta que tenha respondido um campo
// geo_coords. categoryFieldId é opcional: se configurado (um campo de
// escolha), cada marcador vira um ícone Tabler colorido por opção em vez
// do círculo padrão — categoryStyles guarda a escolha de ícone/cor por
// optionId, preenchida no editor.
export interface MapConfig {
  geoFieldId: string;
  categoryFieldId?: string;
  categoryStyles?: Record<string, { icon?: string; color?: string }>;
}

// Imagem estática (logo, foto, brasão) — conteúdo posto pelo pesquisador,
// não vem de resposta nenhuma (igual o texto livre).
export interface ImageConfig {
  imageUrl: string;
  fit?: "cover" | "contain";
  style?: WidgetAppearance;
}

// Um indicador possível pra colorir o mapa de calor — "count" usa volume de
// respostas, "choice_percent" usa a % de respostas do estado em que outro
// campo (de escolha) bate com uma opção.
export interface HeatmapIndicatorConfig {
  key:   string; // identifica o indicador (estável entre edições — não recalcular a cada save)
  label: string;
  mode:  "count" | "choice_percent";
  fieldId?: string;
  optionId?: string;
}

// Mapa de calor por estado — agrupa respostas pelo campo geo_state; permite
// vários indicadores configurados, trocáveis no próprio mapa renderizado
// (ver HeatmapWidget) sem precisar reabrir o editor.
export interface HeatmapConfig {
  geoFieldId: string;
  indicators: HeatmapIndicatorConfig[];
}

// Cruzamento de dados — categoria A (linha) × categoria B (coluna), tipo
// tabela de contingência. valueMode define o que cada célula mostra:
// contagem bruta, % da linha ou % da coluna (a diagonal/comparação entre
// grupos é o que Israel chamou de "categoria A vs B, pergunta A vs B").
export interface CrosstabConfig {
  fieldIdRows: string;
  fieldIdCols: string;
  valueMode?: "count" | "row_percent" | "col_percent";
}

// Globo 3D interativo — visualização alternativa dos mesmos dados que
// map/heatmap já calculam (sem motor de agregação próprio). mode "points"
// reaproveita geoFieldId/categoryFieldId/categoryStyles do MapConfig; mode
// "heatmap" reaproveita geoFieldId/indicators do HeatmapConfig.
export interface GlobeConfig {
  mode: "points" | "heatmap";
  geoFieldId?: string;
  categoryFieldId?: string;
  categoryStyles?: Record<string, { icon?: string; color?: string }>;
  indicators?: HeatmapIndicatorConfig[];
}

export type WidgetConfig = NumberCardConfig | ChoiceChartConfig | TableConfig | TextConfig | MapConfig | HeatmapConfig | ImageConfig | CrosstabConfig | GlobeConfig;

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
  categoryValue?: string;
}

export interface MapResult {
  kind: "map";
  points: MapPoint[];
  categories?: ChoiceOption[];
  categoryStyles?: Record<string, { icon?: string; color?: string }>;
}

export interface ImageResult {
  kind: "image";
  imageUrl: string;
  fit: "cover" | "contain";
}

export interface HeatmapStateValue {
  value: number;
  count: number;
}

export interface HeatmapResult {
  kind: "heatmap";
  indicators: { key: string; label: string }[];
  byIndicator: Record<string, Record<string, HeatmapStateValue>>;
  maxByIndicator: Record<string, number>;
}

export interface CrosstabResult {
  kind: "crosstab";
  rows: ChoiceOption[];
  cols: ChoiceOption[];
  cells: number[][]; // cells[linha][coluna] = contagem bruta (o valueMode calcula % em cima disso na renderização)
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export type WidgetData = CountResult | NumericResult | ChoiceAggResult | TableResult | TextResult | MapResult | HeatmapResult | ImageResult | CrosstabResult;

export const NUMERIC_FIELD_TYPES = ["number", "scale", "nps", "stars", "slider"] as const;
export const CHOICE_FIELD_TYPES = ["single_choice", "multiple_choice", "yes_no", "weighted", "consent"] as const;

export const SUPPORTED_WIDGET_TYPES: { value: SupportedWidgetType; label: string; icon: string; description: string }[] = [
  { value: "number_card", label: "Número",  icon: "ti-square-rounded-number-1", description: "Um valor só — contagem, soma, média..." },
  { value: "bar_chart",   label: "Barras",  icon: "ti-chart-bar",               description: "Comparar opções de um campo de escolha" },
  { value: "pie_chart",   label: "Pizza",   icon: "ti-chart-pie",               description: "Proporção entre opções de escolha" },
  { value: "donut_chart", label: "Rosca",   icon: "ti-chart-donut",             description: "Como a pizza, com espaço central" },
  { value: "table",       label: "Tabela",  icon: "ti-table",                   description: "Lista de respostas, coluna por campo" },
  { value: "text",        label: "Texto",   icon: "ti-text-size",               description: "Bloco de texto livre, sem dado" },
  { value: "map",         label: "Mapa de pontos", icon: "ti-map-pin",          description: "Um marcador por resposta com GPS" },
  { value: "heatmap",     label: "Mapa de calor",  icon: "ti-map-2",           description: "Colore o Brasil por estado" },
  { value: "image",       label: "Imagem",  icon: "ti-photo",                   description: "Logo, foto ou brasão — conteúdo fixo, sem dado" },
  { value: "crosstab",    label: "Cruzamento", icon: "ti-table-options",        description: "Categoria A × categoria B, tipo tabela cruzada" },
  { value: "globe",       label: "Globo 3D",   icon: "ti-world",                description: "Mapa ou mapa de calor num globo interativo" },
];
