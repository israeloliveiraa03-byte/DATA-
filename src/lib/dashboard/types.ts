export type SupportedWidgetType = "number_card" | "bar_chart" | "line_chart" | "pie_chart" | "donut_chart" | "table" | "text" | "map" | "heatmap" | "image" | "crosstab" | "globe";

// ─── Catálogo estendido de gráficos (2026-07-05) ──────────────────────────
// O enum widget_type do Postgres tem só os 12 valores acima e mudá-lo exige
// ALTER TYPE direto no banco (ver CLAUDE.md). Os gráficos novos NÃO criam
// valor de enum: cada um persiste como um tipo já existente + a chave
// `config.chartKind` (config é jsonb livre). Widgets antigos não têm
// chartKind e continuam se comportando exatamente como antes — zero
// migração, zero regressão.
export type ChartKind =
  | "diverging_bar"  // Likert em torno do ponto neutro (scale/nps/semantic_scale/weighted)
  | "stacked_bar"    // parte-do-todo: escolha × escolha ou campo matrix
  | "area"           // variação do gráfico de linha (mesmo motor temporal)
  | "histogram"      // distribuição de campo numérico (binning)
  | "scatter"        // correlação entre dois campos numéricos
  | "bubble"         // scatter + 3ª dimensão no tamanho do ponto
  | "treemap"        // proporção por área (muitas opções)
  | "range_bar"      // duração/período por resposta (date_range)
  | "boxplot"        // mediana/quartis/outliers por grupo (SVG próprio, cálculo d3-array)
  | "dot_plot"       // alternativa limpa à barra pra muitos itens (SVG próprio)
  | "lollipop"       // dot plot com haste até o eixo (SVG próprio)
  | "waffle"         // grid 10×10 de quadrados = uma proporção (SVG próprio)
  | "dumbbell"       // antes/depois por categoria, dividido por uma data de corte (SVG próprio)
  | "radar"          // comparação multi-variável (várias perguntas na mesma escala)
  | "violin";        // densidade (KDE gaussiana) por grupo (SVG próprio)

// Pra qual valor REAL do enum do banco cada gráfico novo é serializado.
// "area" cai em line_chart e treemap/waffle em pie_chart de propósito: se o
// chartKind for ignorado por código antigo, a degradação é um gráfico da
// mesma família com os mesmos dados — nunca um erro.
export const CHART_KIND_DB_TYPE: Record<ChartKind, SupportedWidgetType> = {
  diverging_bar: "bar_chart",
  stacked_bar:   "bar_chart",
  histogram:     "bar_chart",
  scatter:       "bar_chart",
  bubble:        "bar_chart",
  range_bar:     "bar_chart",
  boxplot:       "bar_chart",
  dot_plot:      "bar_chart",
  lollipop:      "bar_chart",
  dumbbell:      "bar_chart",
  radar:         "bar_chart",
  violin:        "bar_chart",
  area:          "line_chart",
  treemap:       "pie_chart",
  waffle:        "pie_chart",
};

export function resolveChartKind(config: Record<string, unknown> | null | undefined): ChartKind | undefined {
  const kind = config?.chartKind;
  return typeof kind === "string" && kind in CHART_KIND_DB_TYPE ? (kind as ChartKind) : undefined;
}

// Par divergente único do produto (parâmetro de design-system, não por
// paleta): polo negativo quente ↔ polo positivo frio + cinza neutro no
// meio — vermelho×azul é o par clássico seguro pra daltonismo (o
// vermelho×verde não é). Passos mais claros são gerados por mistura com
// branco conforme a distância do centro (uma matiz por lado, claro→escuro).
export const DIVERGING_COLORS = {
  negative: "#c0392b",
  neutral:  "#9ca3af",
  positive: "#1a56db",
} as const;

// Paleta de cores do dashboard inteiro (gráficos, mapa de calor, cruzamento,
// globo) — guardada em dashboards.colorPalette, default "terracota" (visual
// de hoje, zero regressão). accent é o rgb "r, g, b" usado em fundos com
// opacidade variável (mapa de calor, células de cruzamento); chartColors
// colore barra/pizza/rosca e os pontos categorizados do mapa/globo.
export interface ColorPalette {
  label: string;
  chartColors: string[];
  accent: string; // "r, g, b"
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  terracota: {
    label: "Terracota (padrão)",
    chartColors: ["#c48a42", "#4c6b3c", "#1a56db", "#534ab7", "#c0392b", "#0c447c", "#7a5218", "#3a5430"],
    accent: "126, 155, 92",
  },
  oceano: {
    label: "Oceano",
    chartColors: ["#1a56db", "#0c447c", "#0891b2", "#155e75", "#3b82f6", "#075985", "#164e63", "#5b8fd1"],
    accent: "26, 86, 219",
  },
  "verde-mata": {
    label: "Verde-mata",
    chartColors: ["#4c6b3c", "#7a9b5c", "#2d4025", "#8fb37a", "#3a5430", "#1f2e19", "#6b8752", "#527a3f"],
    accent: "76, 107, 60",
  },
  "alto-contraste": {
    label: "Alto contraste",
    chartColors: ["#111111", "#c0392b", "#1a56db", "#0f6b3a", "#7a5218", "#534ab7", "#0c2340", "#8a1538"],
    accent: "17, 17, 17",
  },
};

export interface NumberCardConfig {
  fieldId?: string;
  aggregation: "count" | "count_completed" | "avg" | "sum" | "min" | "max";
  suffix?: string;
  decimals?: number;
}

// displayMode é opcional em todos os gráficos onde faz sentido — undefined
// mantém o comportamento de sempre (contagem absoluta), zero regressão em
// dashboards já publicados.
export type DisplayMode = "count" | "percent";

export interface ChoiceChartConfig {
  fieldId: string;
  sortBy?: "count_desc" | "option_order";
  displayMode?: DisplayMode;
  // Só no gráfico de barras: um segundo campo de escolha transforma o
  // gráfico em barras agrupadas (comparação categoria A × categoria B,
  // mesmo motor do cruzamento de dados).
  compareFieldId?: string;
  // Só no gráfico de barras: "horizontal" deita as barras (bom pra
  // categoria com nome longo). undefined = vertical, comportamento de sempre.
  orientation?: "vertical" | "horizontal";
}

// ─── Configs dos gráficos novos (todos vivem em config jsonb + chartKind) ──

// Barra divergente — distribuição de uma escala em torno do ponto neutro.
// neutralValue: valor da escala considerado neutro; undefined = ponto médio
// automático (ex.: 3 numa escala 1–5). Em campo weighted/escolha ordenada,
// o neutro automático é a opção do meio (quantidade ímpar) ou nenhum
// (quantidade par — metade pra cada lado).
export interface DivergingChartConfig {
  chartKind: "diverging_bar";
  fieldId: string;
  neutralValue?: number;
}

// Barra empilhada — parte-do-todo. Dois modos: campo de escolha + campo de
// empilhamento (mesmo motor do cruzamento), OU um campo matrix sozinho
// (linhas da matriz viram as barras, colunas viram os segmentos).
export interface StackedBarConfig {
  chartKind: "stacked_bar";
  fieldId: string;        // escolha OU matrix
  stackFieldId?: string;  // só quando fieldId é campo de escolha
  displayMode?: DisplayMode; // "percent" = 100% empilhado
}

// Histograma — binning de campo numérico. bins: número de faixas;
// undefined = automático (uma faixa por inteiro quando a escala é curta,
// senão regra de Sturges limitada a 5–12).
export interface HistogramConfig {
  chartKind: "histogram";
  fieldId: string;
  bins?: number;
}

// Dispersão/bolhas — correlação entre dois campos numéricos; zFieldId (só
// no bubble) dimensiona o ponto.
export interface ScatterConfig {
  chartKind: "scatter" | "bubble";
  xFieldId: string;
  yFieldId: string;
  zFieldId?: string;
}

// Barra de intervalo — um período (campo date_range) por resposta.
export interface RangeBarConfig {
  chartKind: "range_bar";
  fieldId: string;
  limit?: number; // máx. de respostas exibidas (padrão 30, mais recentes)
}

// Boxplot/violino — distribuição de um campo numérico, opcionalmente
// comparando grupos (campo de escolha).
export interface DistributionConfig {
  chartKind: "boxplot" | "violin";
  fieldId: string;
  groupFieldId?: string;
}

// Waffle — grid 10×10 representando a % de respostas que marcaram UMA opção.
export interface WaffleConfig {
  chartKind: "waffle";
  fieldId: string;
  optionId?: string;
}

// Dumbbell — antes/depois: divide as respostas (já recortadas pelo filtro
// geral) em período A (até splitDate, inclusive) e período B (depois) e
// compara cada opção nos dois. splitDate undefined = data mediana de envio.
export interface DumbbellConfig {
  chartKind: "dumbbell";
  fieldId: string;
  splitDate?: string; // yyyy-mm-dd
  displayMode?: DisplayMode; // "percent" = % dentro de cada período
}

// Radar — cada eixo é um campo numérico/escala (média das respostas);
// compareFieldId (escolha) desenha um polígono por opção.
export interface RadarConfig {
  chartKind: "radar";
  axisFieldIds: string[];
  compareFieldId?: string;
}

// Linha do tempo — evolução das respostas usando submittedAt. Sem campo
// configurado conta todas as respostas; seriesFieldId (campo de escolha)
// divide em uma linha por opção (comparação ao longo do tempo).
export interface LineChartConfig {
  interval?: "day" | "week" | "month";
  seriesFieldId?: string;
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
    fontFamily?: "sans" | "serif";
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

// Mapa-base ("relevo") dos widgets de mapa — só metadados aqui (chave e
// rótulo, usados no inspetor do builder); as URLs de tile ficam em
// map-common.tsx, junto do resto do código Leaflet (que nunca entra em SSR).
// Todos os provedores são XYZ gratuitos, sem chave de API.
export type BasemapKey = "light" | "dark" | "satellite" | "topo";

export const BASEMAP_OPTIONS: { key: BasemapKey; label: string }[] = [
  { key: "light",     label: "Claro (padrão)" },
  { key: "dark",      label: "Escuro" },
  { key: "satellite", label: "Satélite" },
  { key: "topo",      label: "Relevo (topográfico)" },
];

// Mapa de pontos — um marcador por resposta que tenha respondido um campo
// geo_coords. categoryFieldId é opcional: se configurado (um campo de
// escolha), cada marcador vira um ícone Tabler colorido por opção em vez
// do círculo padrão — categoryStyles guarda a escolha de ícone/cor por
// optionId, preenchida no editor.
// colorPalette (opcional) sobrepõe a paleta do dashboard só neste widget;
// basemap (opcional) escolhe o mapa-base padrão — undefined mantém o
// comportamento de hoje (paleta herdada + mapa claro), zero regressão.
export interface MapConfig {
  geoFieldId: string;
  categoryFieldId?: string;
  categoryStyles?: Record<string, { icon?: string; color?: string }>;
  colorPalette?: string;
  basemap?: BasemapKey;
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

// Mapa de calor — agrupa respostas pelo campo geo_state (granularity
// "state", padrão) ou por município (granularity "city", usa geo_city +
// o geo_state irmão pra resolver o código IBGE); permite vários
// indicadores configurados, trocáveis no próprio mapa renderizado (ver
// HeatmapWidget) sem precisar reabrir o editor.
// colorPalette/basemap: mesma semântica do MapConfig (override opcional
// por widget, undefined = comportamento atual).
export interface HeatmapConfig {
  geoFieldId: string;
  indicators: HeatmapIndicatorConfig[];
  granularity?: "state" | "city";
  colorPalette?: string;
  basemap?: BasemapKey;
  // Só afeta indicadores de modo "count": "percent" mostra a fatia de cada
  // estado/município sobre o total de respostas (em vez do número bruto).
  displayMode?: DisplayMode;
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
  // Mesma semântica do HeatmapConfig.displayMode — só se aplica no modo "heatmap".
  displayMode?: DisplayMode;
}

export type WidgetConfig = NumberCardConfig | ChoiceChartConfig | LineChartConfig | TableConfig | TextConfig | MapConfig | HeatmapConfig | ImageConfig | CrosstabConfig | GlobeConfig
  | DivergingChartConfig | StackedBarConfig | HistogramConfig | ScatterConfig | RangeBarConfig | DistributionConfig | WaffleConfig | DumbbellConfig | RadarConfig;

// ─── Filtro geral dirigido pelas perguntas do formulário ──────────────────

// Uma condição de filtro sobre UM campo. O "kind" é derivado do tipo do
// campo na hora de montar (nunca inferido do valor na hora de aplicar):
// - "choice": qualquer opção marcada dentro de optionIds casa (OU entre
//   opções, inclusive em multiple_choice)
// - "numeric": faixa min/max (qualquer um dos dois pode faltar)
// - "geo": valor exato do campo geográfico (UF, município, região...)
// - "date": intervalo do PRÓPRIO campo de data (date = dentro do intervalo;
//   date_range = período que se sobrepõe ao intervalo)
export type FilterCondition =
  | { kind: "choice";  fieldId: string; optionIds: string[] }
  | { kind: "numeric"; fieldId: string; min?: number; max?: number }
  | { kind: "geo";     fieldId: string; value: string }
  | { kind: "date";    fieldId: string; from?: string; to?: string };

// Filtro geral do dashboard — um recorte só, aplicado a TODOS os widgets de
// uma vez (padrão "uma linha de filtro acima de tudo", nunca filtro por
// gráfico). É estado de visualização, não config salva.
// - from/to: data de ENVIO da resposta (submittedAt), como sempre foi.
// - conditions: lista de condições sobre campos do formulário, combinadas
//   com E lógico entre elas.
// - fieldId/optionId: formato legado (um campo, uma opção) — continua
//   aceito e é normalizado pra uma condição "choice" na aplicação, então
//   quem usava o filtro simples se comporta exatamente igual.
export interface DashboardFilter {
  from?: string;
  to?: string;
  fieldId?: string;
  optionId?: string;
  conditions?: FilterCondition[];
}

// Tipos de campo filtráveis por família — usados pra montar a UI do filtro
// (editor e página pública) e pra validar condições vindas de query string.
export const FILTER_NUMERIC_FIELD_TYPES = ["number", "scale", "nps", "stars", "slider", "semantic_scale"] as const;
export const FILTER_GEO_FIELD_TYPES = ["geo_region", "geo_state", "geo_mesoregion", "geo_microregion", "geo_city", "geo_district", "geo_neighborhood", "geo_zone"] as const;
export const FILTER_DATE_FIELD_TYPES = ["date", "date_range"] as const;

export type FilterFieldKind = "choice" | "numeric" | "geo" | "date";

export function filterKindForFieldType(fieldType: string): FilterFieldKind | undefined {
  if ((CHOICE_FIELD_TYPES as readonly string[]).includes(fieldType)) return "choice";
  if ((FILTER_NUMERIC_FIELD_TYPES as readonly string[]).includes(fieldType)) return "numeric";
  if ((FILTER_GEO_FIELD_TYPES as readonly string[]).includes(fieldType)) return "geo";
  if ((FILTER_DATE_FIELD_TYPES as readonly string[]).includes(fieldType)) return "date";
  return undefined;
}

// Metadados de campo filtrável que a rota pública expõe pro leitor montar
// condições (só rótulos/opções — nunca respostas cruas; values de campo
// geográfico são valores DISTINTOS já visíveis nos mapas agregados).
export interface PublicFilterField {
  id: string;
  label: string;
  kind: FilterFieldKind;
  options?: { id: string; label: string }[]; // kind "choice"
  values?: string[];                          // kind "geo" — distintos observados
}

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

// Série temporal — um ponto por intervalo (dia/semana/mês), com um valor por
// série. series[0] é "Todas as respostas" quando não há campo de série.
export interface TimeSeriesResult {
  kind: "timeseries";
  interval: "day" | "week" | "month";
  series: { key: string; label: string }[];
  points: { date: string; values: Record<string, number> }[];
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
  // mode incluído por indicador pra o widget saber se "count" pode ser
  // convertido pra % do total do país (choice_percent já é percentual, a
  // conversão não se aplica a ele).
  indicators: { key: string; label: string; mode: "count" | "choice_percent" }[];
  byIndicator: Record<string, Record<string, HeatmapStateValue>>;
  maxByIndicator: Record<string, number>;
  granularity?: "state" | "city";
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

// ─── Resultados dos gráficos novos ─────────────────────────────────────────
// treemap, waffle, dot_plot e lollipop reaproveitam ChoiceAggResult;
// stacked_bar reaproveita CrosstabResult; area reaproveita TimeSeriesResult.

// Barra divergente — buckets em ordem de escala, cada um marcado com o lado
// em relação ao neutro. O bucket neutro (se existir) fica no meio.
export interface DivergingResult {
  kind: "diverging";
  buckets: { label: string; count: number; side: "neg" | "neu" | "pos" }[];
  totalResponses: number;
}

export interface HistogramResult {
  kind: "histogram";
  bins: { label: string; count: number }[];
  total: number;
}

export interface ScatterResult {
  kind: "scatter";
  points: { x: number; y: number; z?: number }[];
  xLabel: string;
  yLabel: string;
  zLabel?: string;
}

// Barra de intervalo — start/end em timestamps (ms) pra escala contínua.
export interface RangeBarResult {
  kind: "rangebar";
  rows: { label: string; start: number; end: number }[];
}

// Boxplot/violino — estatísticas e curva de densidade calculadas no motor
// (a rota pública serializa isto, nunca os valores individuais).
export interface DistributionGroupStats {
  key: string;
  label: string;
  count: number;
  min: number; q1: number; median: number; q3: number; max: number;
  lowerWhisker: number; upperWhisker: number;
  outliers: number[]; // limitado (não é lista exaustiva de respostas)
  density: { x: number; w: number }[]; // KDE normalizada 0..1 (violino)
}

export interface DistributionResult {
  kind: "distribution";
  groups: DistributionGroupStats[];
  fieldLabel: string;
}

export interface RadarResult {
  kind: "radar";
  axes: { key: string; label: string }[];
  series: { key: string; label: string; values: Record<string, number | null> }[];
}

// Dumbbell — contagem (e total do período, pra %) por opção nos períodos A/B.
export interface DumbbellResult {
  kind: "dumbbell";
  categories: { label: string; a: number; b: number }[];
  periodALabel: string;
  periodBLabel: string;
  totalA: number;
  totalB: number;
}

export type WidgetData = CountResult | NumericResult | ChoiceAggResult | TimeSeriesResult | TableResult | TextResult | MapResult | HeatmapResult | ImageResult | CrosstabResult
  | DivergingResult | HistogramResult | ScatterResult | RangeBarResult | DistributionResult | RadarResult | DumbbellResult;

export const NUMERIC_FIELD_TYPES = ["number", "scale", "nps", "stars", "slider"] as const;
export const CHOICE_FIELD_TYPES = ["single_choice", "multiple_choice", "yes_no", "weighted", "consent"] as const;

export const SUPPORTED_WIDGET_TYPES: { value: SupportedWidgetType; label: string; icon: string; description: string }[] = [
  { value: "number_card", label: "Número",  icon: "ti-square-rounded-number-1", description: "Um valor só — contagem, soma, média..." },
  { value: "bar_chart",   label: "Barras",  icon: "ti-chart-bar",               description: "Comparar opções de um campo de escolha" },
  { value: "line_chart",  label: "Linha",   icon: "ti-chart-line",              description: "Evolução das respostas ao longo do tempo" },
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

// Catálogo dos gráficos estendidos — aparecem na paleta do builder como
// widgets próprios, mas persistem como CHART_KIND_DB_TYPE[kind] +
// config.chartKind (ver comentário no topo). w/h = tamanho inicial no canvas.
export const EXTRA_CHART_TYPES: { kind: ChartKind; label: string; icon: string; description: string; w: number; h: number }[] = [
  { kind: "diverging_bar", label: "Barra divergente", icon: "ti-arrows-horizontal",  description: "Escala/Likert em torno do ponto neutro", w: 66, h: 150 },
  { kind: "stacked_bar",   label: "Barra empilhada",  icon: "ti-stack-2",            description: "Parte-do-todo por categoria (ou campo matriz)", w: 50, h: 200 },
  { kind: "area",          label: "Área",             icon: "ti-chart-area-line",    description: "Como a linha, com a área preenchida", w: 50, h: 160 },
  { kind: "histogram",     label: "Histograma",       icon: "ti-chart-histogram",    description: "Distribuição de um campo numérico", w: 50, h: 180 },
  { kind: "scatter",       label: "Dispersão",        icon: "ti-chart-dots",         description: "Correlação entre dois campos numéricos", w: 50, h: 220 },
  { kind: "bubble",        label: "Bolhas",           icon: "ti-chart-bubble",       description: "Dispersão + tamanho por um 3º campo", w: 50, h: 220 },
  { kind: "treemap",       label: "Treemap",          icon: "ti-chart-treemap",      description: "Proporção por área — bom pra muitas opções", w: 50, h: 220 },
  { kind: "range_bar",     label: "Intervalos",       icon: "ti-calendar-time",      description: "Período (data início–fim) por resposta", w: 66, h: 240 },
  { kind: "boxplot",       label: "Boxplot",          icon: "ti-chart-candle",       description: "Mediana, quartis e outliers por grupo", w: 50, h: 220 },
  { kind: "violin",        label: "Violino",          icon: "ti-wave-sine",          description: "Densidade da distribuição por grupo", w: 50, h: 220 },
  { kind: "dot_plot",      label: "Pontos",           icon: "ti-grain",              description: "Alternativa limpa à barra pra muitos itens", w: 50, h: 200 },
  { kind: "lollipop",      label: "Pirulito",         icon: "ti-antenna-bars-5",     description: "Pontos com haste até o eixo", w: 50, h: 200 },
  { kind: "waffle",        label: "Waffle",           icon: "ti-layout-grid",        description: "Grid 10×10 mostrando uma proporção só", w: 33, h: 200 },
  { kind: "dumbbell",      label: "Antes/depois",     icon: "ti-barbell",            description: "Compara cada categoria em dois períodos", w: 50, h: 220 },
  { kind: "radar",         label: "Radar",            icon: "ti-chart-radar",        description: "Comparação multi-variável (mesma escala)", w: 50, h: 260 },
];
