import { quantileSorted, deviation } from "d3-array";
import type { FormField, Response, Widget } from "@/lib/types";
import { parsePastedCoordinates } from "@/lib/entities/coordinates";
import { resolveMunicipioCode } from "@/lib/geo/municipios";
import {
  CHOICE_FIELD_TYPES,
  filterKindForFieldType,
  resolveChartKind,
  type ChartKind,
  type ChoiceAggResult,
  type ChoiceOption,
  type CountResult,
  type CrosstabResult,
  type DashboardFilter,
  type DistributionResult,
  type DivergingResult,
  type DumbbellResult,
  type FilterCondition,
  type HeatmapResult,
  type HistogramResult,
  type MapResult,
  type NumericResult,
  type PublicFilterField,
  type RadarResult,
  type RangeBarResult,
  type ScatterResult,
  type TableResult,
  type TimeSeriesResult,
  type WidgetData,
} from "./types";

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function fieldOptions(field: Pick<FormField, "type" | "config">): ChoiceOption[] {
  if (field.type === "yes_no") return [{ id: "Sim", label: "Sim" }, { id: "Não", label: "Não" }];
  const config = (field.config ?? {}) as { options?: ChoiceOption[] };
  return config.options ?? [];
}

export function resolveOptionLabel(field: Pick<FormField, "type" | "config">, optionId: string): string {
  if (field.type === "yes_no") return optionId;
  return fieldOptions(field).find(o => o.id === optionId)?.label ?? optionId;
}

export function aggregateCount(responses: Response[], fieldId?: string): CountResult {
  const answered = (r: Response) => !fieldId || hasValue((r.data as Record<string, unknown> | null)?.[fieldId]);
  const total = responses.filter(answered).length;
  const completed = responses.filter(r => r.completed && answered(r)).length;
  return { kind: "count", total, completed };
}

export function aggregateNumeric(responses: Response[], fieldId: string): NumericResult {
  const values: number[] = [];
  for (const r of responses) {
    const raw = (r.data as Record<string, unknown> | null)?.[fieldId];
    const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
    if (!Number.isNaN(n)) values.push(n);
  }
  if (values.length === 0) return { kind: "numeric", count: 0, avg: null, sum: 0, min: null, max: null };
  const sum = values.reduce((a, b) => a + b, 0);
  return { kind: "numeric", count: values.length, avg: sum / values.length, sum, min: Math.min(...values), max: Math.max(...values) };
}

// Município/comunidade escolhem uma opção (single_choice/weighted/consent = id escalar,
// multiple_choice = array de ids); yes_no não usa config.options, o valor já é "Sim"/"Não".
export function aggregateChoiceCounts(responses: Response[], field: Pick<FormField, "id" | "type" | "config">): ChoiceAggResult {
  const options = fieldOptions(field);
  const counts = new Map<string, number>();
  let totalResponses = 0;

  for (const response of responses) {
    const raw = (response.data as Record<string, unknown> | null)?.[field.id];
    if (!hasValue(raw)) continue;
    const ids = Array.isArray(raw) ? raw : [raw];
    totalResponses++;
    for (const id of ids) {
      if (typeof id !== "string") continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const buckets = options.map(opt => ({ optionId: opt.id, label: opt.label, count: counts.get(opt.id) ?? 0 }));
  return { kind: "choice", buckets, totalResponses };
}

// Cruzamento categoria A × categoria B — pra cada resposta que respondeu os
// dois campos, incrementa a célula [linha][coluna]. Multi-escolha soma em
// TODAS as combinações relevantes (mesmo espírito de aggregateChoiceCounts:
// uma resposta com 2 opções marcadas conta pra cada uma).
export function aggregateCrosstab(
  responses: Response[],
  rowField: Pick<FormField, "id" | "type" | "config">,
  colField: Pick<FormField, "id" | "type" | "config">,
): CrosstabResult {
  const rows = fieldOptions(rowField);
  const cols = fieldOptions(colField);
  const cells: number[][] = rows.map(() => cols.map(() => 0));
  const rowIndex = new Map(rows.map((o, i) => [o.id, i]));
  const colIndex = new Map(cols.map((o, i) => [o.id, i]));

  for (const r of responses) {
    const data = r.data as Record<string, unknown> | null;
    const rawRow = data?.[rowField.id];
    const rawCol = data?.[colField.id];
    if (!hasValue(rawRow) || !hasValue(rawCol)) continue;
    const rowIds = Array.isArray(rawRow) ? rawRow : [rawRow];
    const colIds = Array.isArray(rawCol) ? rawCol : [rawCol];
    for (const rid of rowIds) {
      const ri = typeof rid === "string" ? rowIndex.get(rid) : undefined;
      if (ri === undefined) continue;
      for (const cid of colIds) {
        const ci = typeof cid === "string" ? colIndex.get(cid) : undefined;
        if (ci === undefined) continue;
        cells[ri][ci]++;
      }
    }
  }

  const rowTotals = cells.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = cols.map((_, ci) => cells.reduce((a, row) => a + row[ci], 0));
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  return { kind: "crosstab", rows, cols, cells, rowTotals, colTotals, grandTotal };
}

// Aplica UMA condição de filtro à resposta. A semântica vem do "kind" da
// condição (decidido na montagem, a partir do tipo do campo) — aqui só se
// compara valor, sem precisar da definição do campo.
function matchesCondition(data: Record<string, unknown> | null, cond: FilterCondition): boolean {
  const raw = data?.[cond.fieldId];
  if (!hasValue(raw)) return false;

  switch (cond.kind) {
    case "choice": {
      if (cond.optionIds.length === 0) return true; // condição incompleta = não recorta
      // multiple_choice grava array — QUALQUER opção marcada dentro do
      // filtro casa (OU entre as opções da mesma condição).
      const ids = Array.isArray(raw) ? raw : [raw];
      return cond.optionIds.some(opt => ids.includes(opt));
    }
    case "numeric": {
      const n = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (Number.isNaN(n)) return false;
      if (cond.min !== undefined && n < cond.min) return false;
      if (cond.max !== undefined && n > cond.max) return false;
      return true;
    }
    case "geo":
      return String(raw).trim().toLowerCase() === cond.value.trim().toLowerCase();
    case "date": {
      const from = cond.from ? new Date(`${cond.from}T00:00:00`).getTime() : null;
      const to   = cond.to   ? new Date(`${cond.to}T23:59:59.999`).getTime() : null;
      if (from === null && to === null) return true;
      // date_range grava {start,end} — casa se o período se SOBREPÕE ao
      // intervalo do filtro; date grava string — casa se está dentro.
      if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
        const range = raw as { start?: unknown; end?: unknown };
        const start = typeof range.start === "string" ? new Date(`${range.start}T00:00:00`).getTime() : NaN;
        const end   = typeof range.end   === "string" ? new Date(`${range.end}T23:59:59.999`).getTime() : NaN;
        if (Number.isNaN(start) && Number.isNaN(end)) return false;
        const s = Number.isNaN(start) ? end : start;
        const e = Number.isNaN(end) ? start : end;
        if (from !== null && e < from) return false;
        if (to !== null && s > to) return false;
        return true;
      }
      const t = typeof raw === "string" ? new Date(`${raw.slice(0, 10)}T12:00:00`).getTime() : NaN;
      if (Number.isNaN(t)) return false;
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    }
  }
}

// Filtro geral do dashboard — o MESMO recorte pra todos os widgets (data de
// resposta + condições sobre campos do formulário, E lógico entre elas).
// Usado tanto no editor (client, preview ao vivo) quanto na rota pública
// (server) — os números de todos os gráficos sempre batem entre si.
// O formato legado (fieldId/optionId, um campo + uma opção) é normalizado
// pra uma condição "choice" de uma opção: comportamento idêntico ao antigo.
export function filterResponses(responses: Response[], filter?: DashboardFilter): Response[] {
  if (!filter) return responses;

  const conditions: FilterCondition[] = [...(filter.conditions ?? [])];
  if (filter.fieldId && filter.optionId) {
    conditions.push({ kind: "choice", fieldId: filter.fieldId, optionIds: [filter.optionId] });
  }
  if (!filter.from && !filter.to && conditions.length === 0) return responses;

  const fromTime = filter.from ? new Date(`${filter.from}T00:00:00`).getTime() : null;
  const toTime   = filter.to   ? new Date(`${filter.to}T23:59:59.999`).getTime() : null;

  return responses.filter(r => {
    if (fromTime !== null || toTime !== null) {
      const stamp = r.submittedAt ?? r.createdAt;
      const t = stamp ? new Date(stamp).getTime() : NaN;
      if (Number.isNaN(t)) return false;
      if (fromTime !== null && t < fromTime) return false;
      if (toTime !== null && t > toTime) return false;
    }
    const data = r.data as Record<string, unknown> | null;
    return conditions.every(cond => matchesCondition(data, cond));
  });
}

// Metadados dos campos filtráveis pra montar a UI do filtro geral fora do
// editor (rota pública) — nunca resposta crua, só rótulos/opções e valores
// DISTINTOS de campo geográfico (já visíveis de qualquer forma nos mapas
// agregados). Calculado sobre TODAS as respostas do formulário (antes de
// qualquer filtro), pra as opções não sumirem da UI conforme o pesquisador
// filtra.
export function buildPublicFilterFields(fields: FormField[], allResponses: Response[]): PublicFilterField[] {
  const result: PublicFilterField[] = [];
  for (const field of fields) {
    const kind = filterKindForFieldType(field.type);
    if (!kind) continue;
    if (kind === "choice") {
      result.push({ id: field.id, label: field.label, kind, options: fieldOptions(field) });
    } else if (kind === "geo") {
      const set = new Set<string>();
      for (const r of allResponses) {
        const raw = (r.data as Record<string, unknown> | null)?.[field.id];
        if (typeof raw === "string" && raw.trim()) set.add(raw.trim());
      }
      result.push({ id: field.id, label: field.label, kind, values: Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR")) });
    } else {
      result.push({ id: field.id, label: field.label, kind });
    }
  }
  return result;
}

// Desserializa condições de filtro vindas de query string (rota pública) —
// JSON.parse dentro de try/catch, todo campo validado individualmente;
// qualquer formato inesperado é descartado silenciosamente (nunca 400: o
// dashboard público sempre abre, na pior das hipóteses sem aquele filtro).
export function parseFilterConditionsParam(raw: string | null): FilterCondition[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: FilterCondition[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    if (typeof c.fieldId !== "string" || !c.fieldId) continue;
    if (c.kind === "choice" && Array.isArray(c.optionIds)) {
      out.push({ kind: "choice", fieldId: c.fieldId, optionIds: c.optionIds.filter((x): x is string => typeof x === "string") });
    } else if (c.kind === "numeric") {
      out.push({ kind: "numeric", fieldId: c.fieldId, min: typeof c.min === "number" ? c.min : undefined, max: typeof c.max === "number" ? c.max : undefined });
    } else if (c.kind === "geo" && typeof c.value === "string") {
      out.push({ kind: "geo", fieldId: c.fieldId, value: c.value });
    } else if (c.kind === "date") {
      const from = typeof c.from === "string" ? c.from : undefined;
      const to   = typeof c.to === "string" ? c.to : undefined;
      out.push({ kind: "date", fieldId: c.fieldId, from, to });
    }
  }
  return out;
}

// Chave de agrupamento temporal em UTC (determinística entre servidor e
// navegador): dia = yyyy-mm-dd, semana = segunda-feira da semana ISO,
// mês = yyyy-mm-01.
function bucketDate(iso: Date, interval: "day" | "week" | "month"): string {
  const d = new Date(Date.UTC(iso.getUTCFullYear(), iso.getUTCMonth(), iso.getUTCDate()));
  if (interval === "month") d.setUTCDate(1);
  if (interval === "week") {
    const weekday = (d.getUTCDay() + 6) % 7; // 0 = segunda
    d.setUTCDate(d.getUTCDate() - weekday);
  }
  return d.toISOString().slice(0, 10);
}

function nextBucket(dateKey: string, interval: "day" | "week" | "month"): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (interval === "day") d.setUTCDate(d.getUTCDate() + 1);
  if (interval === "week") d.setUTCDate(d.getUTCDate() + 7);
  if (interval === "month") d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// Evolução das respostas ao longo do tempo (submittedAt; respostas sem data
// ficam de fora). Sem seriesField é uma linha só (total); com seriesField
// (campo de escolha) vira uma linha por opção — comparação temporal.
// Intervalos vazios entre o primeiro e o último ponto entram como zero de
// propósito: pular períodos sem coleta faria a linha mentir a inclinação.
export function aggregateTimeSeries(
  responses: Response[],
  interval: "day" | "week" | "month",
  seriesField?: Pick<FormField, "id" | "type" | "config">,
): TimeSeriesResult {
  const TOTAL_KEY = "__total";
  const series = seriesField
    ? fieldOptions(seriesField).map(o => ({ key: o.id, label: o.label }))
    : [{ key: TOTAL_KEY, label: "Respostas" }];
  const seriesKeys = new Set(series.map(s => s.key));

  const byBucket = new Map<string, Record<string, number>>();
  for (const r of responses) {
    if (!r.submittedAt) continue;
    const date = new Date(r.submittedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = bucketDate(date, interval);
    let bucket = byBucket.get(key);
    if (!bucket) { bucket = {}; byBucket.set(key, bucket); }

    if (!seriesField) {
      bucket[TOTAL_KEY] = (bucket[TOTAL_KEY] ?? 0) + 1;
      continue;
    }
    const raw = (r.data as Record<string, unknown> | null)?.[seriesField.id];
    if (!hasValue(raw)) continue;
    const ids = Array.isArray(raw) ? raw : [raw];
    for (const id of ids) {
      if (typeof id !== "string" || !seriesKeys.has(id)) continue;
      bucket[id] = (bucket[id] ?? 0) + 1;
    }
  }

  const keys = Array.from(byBucket.keys()).sort();
  if (keys.length === 0) return { kind: "timeseries", interval, series, points: [] };

  // Preenche os buracos entre o primeiro e o último intervalo com zeros
  // (limitado por segurança — um formulário de anos em intervalo diário
  // não vira dezenas de milhares de pontos).
  const points: TimeSeriesResult["points"] = [];
  const last = keys[keys.length - 1];
  let cursor = keys[0];
  let guard = 0;
  while (cursor <= last && guard < 2000) {
    const bucket = byBucket.get(cursor) ?? {};
    const values: Record<string, number> = {};
    for (const s of series) values[s.key] = bucket[s.key] ?? 0;
    points.push({ date: cursor, values });
    cursor = nextBucket(cursor, interval);
    guard++;
  }

  return { kind: "timeseries", interval, series, points };
}

function resolveDisplayValue(field: FormField | undefined, raw: unknown): unknown {
  if (!hasValue(raw)) return null;
  if (!field) return raw;
  const isResolvableChoice = (CHOICE_FIELD_TYPES as readonly string[]).includes(field.type) && field.type !== "yes_no";
  if (isResolvableChoice) {
    const options = fieldOptions(field);
    const resolveOne = (id: unknown) => (typeof id === "string" ? (options.find(o => o.id === id)?.label ?? id) : id);
    return Array.isArray(raw) ? raw.map(resolveOne).join(", ") : resolveOne(raw);
  }
  return Array.isArray(raw) ? raw.join(", ") : raw;
}

export function buildTableRows(
  responses: Response[],
  fields: FormField[],
  fieldIds: string[],
  opts: { limit?: number; onlyCompleted?: boolean } = {},
): TableResult {
  const onlyCompleted = opts.onlyCompleted ?? true;
  const limit = opts.limit ?? 50;
  const fieldMap = new Map(fields.map(f => [f.id, f]));
  const columns = fieldIds.map(id => ({ fieldId: id, label: fieldMap.get(id)?.label ?? id }));

  const filtered = onlyCompleted ? responses.filter(r => r.completed) : responses;
  const sorted = [...filtered].sort((a, b) => {
    const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bt - at;
  });

  const rows = sorted.slice(0, limit).map(r => {
    const data = (r.data as Record<string, unknown>) ?? {};
    const values: Record<string, unknown> = {};
    for (const fieldId of fieldIds) values[fieldId] = resolveDisplayValue(fieldMap.get(fieldId), data[fieldId]);
    return { responseId: r.id, submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : null, values };
  });

  return { kind: "table", columns, rows };
}

// categoryField opcional: quando presente, cada marcador leva a opção
// escolhida naquela resposta (categoryValue) — o mapa usa isso pra trocar o
// círculo padrão por um ícone colorido por categoria.
export function aggregateMapPoints(
  responses: Response[],
  geoField: Pick<FormField, "id">,
  categoryField?: Pick<FormField, "id" | "type" | "config">,
): MapResult {
  const points = [];
  for (const r of responses) {
    const raw = (r.data as Record<string, unknown> | null)?.[geoField.id];
    if (typeof raw !== "string") continue;
    const parsed = parsePastedCoordinates(raw);
    if (!parsed) continue;
    const label = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("pt-BR") : "Resposta";
    let categoryValue: string | undefined;
    if (categoryField) {
      const rawCategory = (r.data as Record<string, unknown> | null)?.[categoryField.id];
      const id = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
      if (typeof id === "string") categoryValue = id;
    }
    points.push({ lat: parseFloat(parsed.latitude), lng: parseFloat(parsed.longitude), label, categoryValue });
  }
  return {
    kind: "map",
    points,
    categories: categoryField ? fieldOptions(categoryField) : undefined,
  };
}

export interface HeatmapIndicatorInput {
  key: string;
  label: string;
  mode: "count" | "choice_percent";
  field?: Pick<FormField, "id" | "type" | "config">;
  optionId?: string;
}

// Agrupa respostas por UF (via campo geo_state) ou, com cityField, por
// código de município (7 dígitos — resolve UF+nome via resolveMunicipioCode,
// já que geo_city só grava o nome da cidade), uma vez, e calcula cada
// indicador configurado sobre esse mesmo agrupamento. Modo "count" = volume
// de respostas; "choice_percent" = % das respostas do grupo em que outro
// campo de escolha bate com a opção escolhida (reproduz indicadores tipo
// "% de escolas com racismo" da referência CONAQ). Vários indicadores podem
// coexistir no mesmo mapa — o widget deixa trocar qual colore o país sem
// precisar reconfigurar.
export function aggregateHeatmapByState(
  responses: Response[],
  geoField: Pick<FormField, "id">,
  indicators: HeatmapIndicatorInput[],
  cityField?: Pick<FormField, "id">,
): HeatmapResult {
  const byState: Record<string, { count: number; matchesByIndicator: Record<string, number> }> = {};

  for (const r of responses) {
    const data = r.data as Record<string, unknown> | null;
    const uf = data?.[geoField.id];
    if (typeof uf !== "string" || !uf.trim()) continue;

    let groupKey = uf;
    if (cityField) {
      const cityName = data?.[cityField.id];
      if (typeof cityName !== "string" || !cityName.trim()) continue;
      const code = resolveMunicipioCode(uf, cityName);
      if (!code) continue; // nome não bateu com nenhum município da UF — ignora em vez de agrupar errado
      groupKey = code;
    }

    if (!byState[groupKey]) byState[groupKey] = { count: 0, matchesByIndicator: {} };
    byState[groupKey].count++;

    for (const ind of indicators) {
      if (ind.mode !== "choice_percent" || !ind.field || !ind.optionId) continue;
      const raw = data?.[ind.field.id];
      if (!hasValue(raw)) continue;
      const ids = Array.isArray(raw) ? raw : [raw];
      if (ids.includes(ind.optionId)) {
        byState[groupKey].matchesByIndicator[ind.key] = (byState[groupKey].matchesByIndicator[ind.key] ?? 0) + 1;
      }
    }
  }

  const byIndicator: Record<string, Record<string, { value: number; count: number }>> = {};
  const maxByIndicator: Record<string, number> = {};

  for (const ind of indicators) {
    let max = 0;
    const result: Record<string, { value: number; count: number }> = {};
    for (const [uf, s] of Object.entries(byState)) {
      const matches = s.matchesByIndicator[ind.key] ?? 0;
      const value = ind.mode === "count" ? s.count : s.count > 0 ? (matches / s.count) * 100 : 0;
      result[uf] = { value, count: s.count };
      if (value > max) max = value;
    }
    byIndicator[ind.key] = result;
    maxByIndicator[ind.key] = max;
  }

  return {
    kind: "heatmap",
    indicators: indicators.map(i => ({ key: i.key, label: i.label, mode: i.mode })),
    byIndicator,
    maxByIndicator,
  };
}

// ─── Motores dos gráficos estendidos (chartKind) ───────────────────────────

function toNumber(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  return Number.isNaN(n) ? null : n;
}

function numericValues(responses: Response[], fieldId: string): number[] {
  const values: number[] = [];
  for (const r of responses) {
    const n = toNumber((r.data as Record<string, unknown> | null)?.[fieldId]);
    if (n !== null) values.push(n);
  }
  return values;
}

// Barra divergente — distribuição em torno do neutro. Campo de escolha
// (weighted etc.): buckets na ordem das opções, neutro = opção do meio
// (quantidade ímpar). Campo numérico (scale/nps/semantic_scale/slider/
// stars): um bucket por valor inteiro observado entre min e max, neutro =
// config.neutralValue ou o ponto médio da faixa.
export function aggregateDiverging(
  responses: Response[],
  field: Pick<FormField, "id" | "type" | "config">,
  neutralValue?: number,
): DivergingResult {
  if ((CHOICE_FIELD_TYPES as readonly string[]).includes(field.type)) {
    const agg = aggregateChoiceCounts(responses, field);
    const n = agg.buckets.length;
    const neutralIndex = n % 2 === 1 ? (n - 1) / 2 : -1;
    return {
      kind: "diverging",
      buckets: agg.buckets.map((b, i) => ({
        label: b.label, count: b.count,
        side: i === neutralIndex ? "neu" : i < n / 2 ? "neg" : "pos",
      })),
      totalResponses: agg.totalResponses,
    };
  }

  const values = numericValues(responses, field.id);
  if (values.length === 0) return { kind: "diverging", buckets: [], totalResponses: 0 };
  const min = Math.floor(Math.min(...values));
  const max = Math.ceil(Math.max(...values));
  if (max - min > 24) return { kind: "diverging", buckets: [], totalResponses: 0 }; // escala longa demais pra um bucket por valor
  const neutral = neutralValue ?? (min + max) / 2;
  const counts = new Map<number, number>();
  for (const v of values) {
    const k = Math.round(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const buckets: DivergingResult["buckets"] = [];
  for (let v = min; v <= max; v++) {
    buckets.push({
      label: String(v),
      count: counts.get(v) ?? 0,
      side: Math.abs(v - neutral) < 1e-9 ? "neu" : v < neutral ? "neg" : "pos",
    });
  }
  return { kind: "diverging", buckets, totalResponses: values.length };
}

// Histograma — binning de campo numérico. Automático: escala inteira curta
// (ex.: 1–5, 0–10) ganha um bin por inteiro; senão regra de Sturges
// (⌈log₂n⌉+1) limitada a 5–12. binsOverride força um nº fixo de faixas.
export function aggregateHistogram(responses: Response[], fieldId: string, binsOverride?: number): HistogramResult {
  const values = numericValues(responses, fieldId);
  if (values.length === 0) return { kind: "histogram", bins: [], total: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);

  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  const allInts = values.every(v => Number.isInteger(v));
  if (!binsOverride && allInts && max - min <= 15) {
    const counts = new Map<number, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    const bins: HistogramResult["bins"] = [];
    for (let v = min; v <= max; v++) bins.push({ label: String(v), count: counts.get(v) ?? 0 });
    return { kind: "histogram", bins, total: values.length };
  }

  if (min === max) return { kind: "histogram", bins: [{ label: fmt(min), count: values.length }], total: values.length };

  const k = Math.min(20, Math.max(2, binsOverride ?? Math.min(12, Math.max(5, Math.ceil(Math.log2(values.length) + 1)))));
  const width = (max - min) / k;
  const counts = new Array<number>(k).fill(0);
  for (const v of values) {
    const i = Math.min(k - 1, Math.floor((v - min) / width)); // max cai no último bin
    counts[i]++;
  }
  const bins = counts.map((count, i) => ({
    label: `${fmt(min + i * width)}–${fmt(min + (i + 1) * width)}`,
    count,
  }));
  return { kind: "histogram", bins, total: values.length };
}

// Dispersão/bolhas — um ponto por resposta que respondeu os dois (ou três)
// campos numéricos. Limitado por segurança (um scatter de milhares de
// pontos vira mancha e pesa a página pública).
export function aggregateScatter(
  responses: Response[],
  xField: Pick<FormField, "id" | "label">,
  yField: Pick<FormField, "id" | "label">,
  zField?: Pick<FormField, "id" | "label">,
): ScatterResult {
  const points: ScatterResult["points"] = [];
  for (const r of responses) {
    if (points.length >= 1000) break;
    const data = r.data as Record<string, unknown> | null;
    const x = toNumber(data?.[xField.id]);
    const y = toNumber(data?.[yField.id]);
    if (x === null || y === null) continue;
    if (zField) {
      const z = toNumber(data?.[zField.id]);
      if (z === null) continue;
      points.push({ x, y, z });
    } else {
      points.push({ x, y });
    }
  }
  return { kind: "scatter", points, xLabel: xField.label, yLabel: yField.label, zLabel: zField?.label };
}

// Barra de intervalo — período {start,end} (campo date_range) por resposta.
// Pega as `limit` respostas mais recentes e ordena pelas datas de início.
export function aggregateRangeBar(responses: Response[], fieldId: string, limit = 30): RangeBarResult {
  const rows: { label: string; start: number; end: number; stamp: number }[] = [];
  for (const r of responses) {
    const raw = (r.data as Record<string, unknown> | null)?.[fieldId];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    const range = raw as { start?: unknown; end?: unknown };
    if (typeof range.start !== "string" || typeof range.end !== "string") continue;
    const start = new Date(`${range.start}T00:00:00`).getTime();
    const end   = new Date(`${range.end}T00:00:00`).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
    const [y, m, d] = range.start.split("-");
    rows.push({
      label: `${d}/${m}/${y.slice(2)}`,
      start, end,
      stamp: r.submittedAt ? new Date(r.submittedAt).getTime() : 0,
    });
  }
  rows.sort((a, b) => b.stamp - a.stamp);
  const kept = rows.slice(0, Math.max(1, Math.min(100, limit)));
  kept.sort((a, b) => a.start - b.start);
  return { kind: "rangebar", rows: kept.map(({ label, start, end }) => ({ label, start, end })) };
}

// KDE gaussiana com banda de Silverman — só derivados saem daqui (curva
// amostrada e estatísticas), nunca os valores individuais, porque a rota
// pública serializa este resultado.
function gaussianKde(sortedValues: number[]): { x: number; w: number }[] {
  const n = sortedValues.length;
  if (n < 3) return [];
  const sd = deviation(sortedValues) ?? 0;
  const q1 = quantileSorted(sortedValues, 0.25) ?? sortedValues[0];
  const q3 = quantileSorted(sortedValues, 0.75) ?? sortedValues[n - 1];
  const iqr = q3 - q1;
  let bw = 0.9 * Math.min(sd || Infinity, iqr > 0 ? iqr / 1.34 : Infinity) * Math.pow(n, -0.2);
  if (!Number.isFinite(bw) || bw <= 0) bw = Math.max(1e-6, (sortedValues[n - 1] - sortedValues[0]) / 10) || 1;

  const min = sortedValues[0];
  const max = sortedValues[n - 1];
  const steps = 41;
  const span = max - min || 1;
  const curve: { x: number; w: number }[] = [];
  let peak = 0;
  for (let i = 0; i < steps; i++) {
    const x = min + (span * i) / (steps - 1);
    let density = 0;
    for (const v of sortedValues) {
      const u = (x - v) / bw;
      density += Math.exp(-0.5 * u * u);
    }
    curve.push({ x, w: density });
    if (density > peak) peak = density;
  }
  return curve.map(p => ({ x: p.x, w: peak > 0 ? p.w / peak : 0 }));
}

// Boxplot/violino — estatísticas (quartis, cerca de 1,5×IQR, outliers) e
// curva de densidade por grupo. Sem groupField = um grupo só.
export function aggregateDistribution(
  responses: Response[],
  field: Pick<FormField, "id" | "label">,
  groupField?: Pick<FormField, "id" | "type" | "config">,
): DistributionResult {
  const groups: { key: string; label: string; responses: Response[] }[] = groupField
    ? fieldOptions(groupField).slice(0, 8).map(opt => ({
        key: opt.id, label: opt.label,
        responses: responses.filter(r => {
          const raw = (r.data as Record<string, unknown> | null)?.[groupField.id];
          const ids = Array.isArray(raw) ? raw : [raw];
          return ids.includes(opt.id);
        }),
      }))
    : [{ key: "__all", label: "Todas as respostas", responses }];

  const result: DistributionResult["groups"] = [];
  for (const g of groups) {
    const values = numericValues(g.responses, field.id).sort((a, b) => a - b);
    if (values.length === 0) continue;
    const q1 = quantileSorted(values, 0.25) ?? values[0];
    const median = quantileSorted(values, 0.5) ?? values[0];
    const q3 = quantileSorted(values, 0.75) ?? values[values.length - 1];
    const iqr = q3 - q1;
    const loFence = q1 - 1.5 * iqr;
    const hiFence = q3 + 1.5 * iqr;
    const inliers = values.filter(v => v >= loFence && v <= hiFence);
    const outliers = values.filter(v => v < loFence || v > hiFence).slice(0, 50);
    result.push({
      key: g.key, label: g.label, count: values.length,
      min: values[0], q1, median, q3, max: values[values.length - 1],
      lowerWhisker: inliers.length > 0 ? inliers[0] : values[0],
      upperWhisker: inliers.length > 0 ? inliers[inliers.length - 1] : values[values.length - 1],
      outliers,
      density: gaussianKde(values),
    });
  }
  return { kind: "distribution", groups: result, fieldLabel: field.label };
}

// Radar — cada eixo é a MÉDIA de um campo numérico/escala; compareField
// (escolha) gera um polígono por opção (média dentro do subgrupo).
export function aggregateRadar(
  responses: Response[],
  axisFields: Pick<FormField, "id" | "label">[],
  compareField?: Pick<FormField, "id" | "type" | "config">,
): RadarResult {
  const axes = axisFields.map(f => ({ key: f.id, label: f.label }));

  const subsets: { key: string; label: string; responses: Response[] }[] = compareField
    ? fieldOptions(compareField).slice(0, 6).map(opt => ({
        key: opt.id, label: opt.label,
        responses: responses.filter(r => {
          const raw = (r.data as Record<string, unknown> | null)?.[compareField.id];
          const ids = Array.isArray(raw) ? raw : [raw];
          return ids.includes(opt.id);
        }),
      }))
    : [{ key: "__all", label: "Média geral", responses }];

  const series = subsets.map(sub => {
    const values: Record<string, number | null> = {};
    for (const f of axisFields) {
      const nums = numericValues(sub.responses, f.id);
      values[f.id] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    }
    return { key: sub.key, label: sub.label, values };
  });

  return { kind: "radar", axes, series };
}

// Dumbbell (antes/depois) — divide as respostas já filtradas em período A
// (envio até splitDate, inclusive) e B (depois) e conta cada opção nos
// dois. splitDate undefined = data MEDIANA de envio (metade das respostas
// de cada lado — o corte automático mais neutro possível).
export function aggregateDumbbell(
  responses: Response[],
  field: Pick<FormField, "id" | "type" | "config">,
  splitDate?: string,
): DumbbellResult {
  const empty: DumbbellResult = { kind: "dumbbell", categories: [], periodALabel: "", periodBLabel: "", totalA: 0, totalB: 0 };
  const stamped = responses
    .map(r => ({ r, t: r.submittedAt ? new Date(r.submittedAt).getTime() : NaN }))
    .filter(x => !Number.isNaN(x.t))
    .sort((a, b) => a.t - b.t);
  if (stamped.length === 0) return empty;

  let splitTime: number;
  let splitKey: string;
  if (splitDate && /^\d{4}-\d{2}-\d{2}$/.test(splitDate)) {
    splitTime = new Date(`${splitDate}T23:59:59.999`).getTime();
    splitKey = splitDate;
  } else {
    const median = stamped[Math.floor((stamped.length - 1) / 2)].t;
    splitKey = new Date(median).toISOString().slice(0, 10);
    splitTime = new Date(`${splitKey}T23:59:59.999`).getTime();
  }
  const [y, m, d] = splitKey.split("-");
  const splitLabel = `${d}/${m}/${y}`;

  const inA = stamped.filter(x => x.t <= splitTime).map(x => x.r);
  const inB = stamped.filter(x => x.t > splitTime).map(x => x.r);
  const aggA = aggregateChoiceCounts(inA, field);
  const aggB = aggregateChoiceCounts(inB, field);
  const countsB = new Map(aggB.buckets.map(b => [b.optionId, b.count]));

  return {
    kind: "dumbbell",
    categories: aggA.buckets.map(b => ({ label: b.label, a: b.count, b: countsB.get(b.optionId) ?? 0 })),
    periodALabel: `Até ${splitLabel}`,
    periodBLabel: `Após ${splitLabel}`,
    totalA: aggA.totalResponses,
    totalB: aggB.totalResponses,
  };
}

// Campo matrix → cruzamento: linhas da matriz viram as linhas, colunas
// viram as colunas (valor gravado é { [linha]: coluna }). Alimenta a barra
// empilhada com um único campo.
export function aggregateMatrixCrosstab(responses: Response[], field: Pick<FormField, "id" | "config">): CrosstabResult {
  const cfg = (field.config ?? {}) as { matrixRows?: string[]; matrixCols?: string[] };
  const rows: ChoiceOption[] = (cfg.matrixRows ?? []).map(r => ({ id: r, label: r }));
  const cols: ChoiceOption[] = (cfg.matrixCols ?? []).map(c => ({ id: c, label: c }));
  const cells: number[][] = rows.map(() => cols.map(() => 0));
  const rowIndex = new Map(rows.map((o, i) => [o.id, i]));
  const colIndex = new Map(cols.map((o, i) => [o.id, i]));

  for (const r of responses) {
    const raw = (r.data as Record<string, unknown> | null)?.[field.id];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    for (const [rowKey, colVal] of Object.entries(raw as Record<string, unknown>)) {
      const ri = rowIndex.get(rowKey);
      const ci = typeof colVal === "string" ? colIndex.get(colVal) : undefined;
      if (ri === undefined || ci === undefined) continue;
      cells[ri][ci]++;
    }
  }

  const rowTotals = cells.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = cols.map((_, ci) => cells.reduce((a, row) => a + row[ci], 0));
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
  return { kind: "crosstab", rows, cols, cells, rowTotals, colTotals, grandTotal };
}

// Roteia os gráficos estendidos (config.chartKind) pro motor certo. Retorna
// null pra chartKind desconhecido — o chamador cai no comportamento padrão
// do tipo persistido (degradação graciosa, nunca erro).
function computeChartKindData(kind: ChartKind, config: Record<string, unknown>, fields: FormField[], responses: Response[]): WidgetData | null {
  const findField = (key: string) => {
    const id = typeof config[key] === "string" ? (config[key] as string) : "";
    return id ? fields.find(f => f.id === id) : undefined;
  };

  switch (kind) {
    case "area": {
      const interval = config.interval === "week" ? "week" : config.interval === "month" ? "month" : "day";
      return aggregateTimeSeries(responses, interval, findField("seriesFieldId"));
    }

    // Mesmos dados do gráfico de escolha — muda só a forma na renderização.
    case "treemap":
    case "dot_plot":
    case "lollipop":
    case "waffle": {
      const field = findField("fieldId");
      if (!field) return { kind: "choice", buckets: [], totalResponses: 0 };
      const result = aggregateChoiceCounts(responses, field);
      if (config.sortBy === "count_desc") result.buckets = [...result.buckets].sort((a, b) => b.count - a.count);
      return result;
    }

    case "stacked_bar": {
      const field = findField("fieldId");
      if (!field) return { kind: "crosstab", rows: [], cols: [], cells: [], rowTotals: [], colTotals: [], grandTotal: 0 };
      if (field.type === "matrix") return aggregateMatrixCrosstab(responses, field);
      const stackField = findField("stackFieldId");
      if (!stackField) return { kind: "crosstab", rows: [], cols: [], cells: [], rowTotals: [], colTotals: [], grandTotal: 0 };
      return aggregateCrosstab(responses, field, stackField);
    }

    case "diverging_bar": {
      const field = findField("fieldId");
      if (!field) return { kind: "diverging", buckets: [], totalResponses: 0 };
      return aggregateDiverging(responses, field, typeof config.neutralValue === "number" ? config.neutralValue : undefined);
    }

    case "histogram": {
      const field = findField("fieldId");
      if (!field) return { kind: "histogram", bins: [], total: 0 };
      return aggregateHistogram(responses, field.id, typeof config.bins === "number" ? config.bins : undefined);
    }

    case "scatter":
    case "bubble": {
      const xField = findField("xFieldId");
      const yField = findField("yFieldId");
      if (!xField || !yField) return { kind: "scatter", points: [], xLabel: "", yLabel: "" };
      const zField = kind === "bubble" ? findField("zFieldId") : undefined;
      return aggregateScatter(responses, xField, yField, zField);
    }

    case "range_bar": {
      const field = findField("fieldId");
      if (!field) return { kind: "rangebar", rows: [] };
      return aggregateRangeBar(responses, field.id, typeof config.limit === "number" ? config.limit : undefined);
    }

    case "boxplot":
    case "violin": {
      const field = findField("fieldId");
      if (!field) return { kind: "distribution", groups: [], fieldLabel: "" };
      return aggregateDistribution(responses, field, findField("groupFieldId"));
    }

    case "radar": {
      const ids = Array.isArray(config.axisFieldIds) ? (config.axisFieldIds as string[]) : [];
      const axisFields = ids.map(id => fields.find(f => f.id === id)).filter((f): f is FormField => !!f);
      if (axisFields.length < 3) return { kind: "radar", axes: [], series: [] }; // radar com <3 eixos não é radar
      return aggregateRadar(responses, axisFields, findField("compareFieldId"));
    }

    case "dumbbell": {
      const field = findField("fieldId");
      if (!field) return { kind: "dumbbell", categories: [], periodALabel: "", periodBLabel: "", totalA: 0, totalB: 0 };
      return aggregateDumbbell(responses, field, typeof config.splitDate === "string" ? config.splitDate : undefined);
    }

    default:
      return null;
  }
}

export function computeWidgetData(widget: Pick<Widget, "type" | "config">, fields: FormField[], responses: Response[]): WidgetData {
  const config = (widget.config ?? {}) as Record<string, unknown>;

  // Gráficos estendidos: o tipo persistido é um dos 12 do enum do banco,
  // mas config.chartKind manda no cálculo. Widgets antigos (sem chartKind)
  // seguem direto pro switch de sempre.
  const chartKind = resolveChartKind(config);
  if (chartKind) {
    const data = computeChartKindData(chartKind, config, fields, responses);
    if (data) return data;
  }

  switch (widget.type) {
    case "text":
      return { kind: "text", content: typeof config.content === "string" ? config.content : "" };

    case "image":
      return {
        kind: "image",
        imageUrl: typeof config.imageUrl === "string" ? config.imageUrl : "",
        fit: config.fit === "contain" ? "contain" : "cover",
      };

    case "crosstab": {
      const emptyResult: CrosstabResult = { kind: "crosstab", rows: [], cols: [], cells: [], rowTotals: [], colTotals: [], grandTotal: 0 };
      const rowFieldId = typeof config.fieldIdRows === "string" ? config.fieldIdRows : "";
      const colFieldId = typeof config.fieldIdCols === "string" ? config.fieldIdCols : "";
      const rowField = fields.find(f => f.id === rowFieldId);
      const colField = fields.find(f => f.id === colFieldId);
      if (!rowField || !colField) return emptyResult;
      return aggregateCrosstab(responses, rowField, colField);
    }

    case "table": {
      const fieldIds = Array.isArray(config.fieldIds) ? (config.fieldIds as string[]) : [];
      return buildTableRows(responses, fields, fieldIds, {
        limit: typeof config.limit === "number" ? config.limit : undefined,
        onlyCompleted: typeof config.onlyCompleted === "boolean" ? config.onlyCompleted : undefined,
      });
    }

    case "bar_chart":
    case "pie_chart":
    case "donut_chart": {
      const fieldId = typeof config.fieldId === "string" ? config.fieldId : "";
      const field = fields.find(f => f.id === fieldId);
      if (!field) return { kind: "choice", buckets: [], totalResponses: 0 };

      // Barras agrupadas (comparação): um segundo campo de escolha divide
      // cada opção do campo principal por opção do campo de comparação —
      // reaproveita o motor do cruzamento (linhas = campo principal,
      // colunas = campo de comparação), o renderer desenha como barras.
      if (widget.type === "bar_chart" && typeof config.compareFieldId === "string" && config.compareFieldId) {
        const compareField = fields.find(f => f.id === config.compareFieldId);
        if (compareField) return aggregateCrosstab(responses, field, compareField);
      }

      const result = aggregateChoiceCounts(responses, field);
      if (config.sortBy === "count_desc") result.buckets = [...result.buckets].sort((a, b) => b.count - a.count);
      return result;
    }

    case "line_chart": {
      const interval = config.interval === "week" ? "week" : config.interval === "month" ? "month" : "day";
      const seriesFieldId = typeof config.seriesFieldId === "string" ? config.seriesFieldId : undefined;
      const seriesField = seriesFieldId ? fields.find(f => f.id === seriesFieldId) : undefined;
      return aggregateTimeSeries(responses, interval, seriesField);
    }

    case "number_card": {
      const fieldId = typeof config.fieldId === "string" ? config.fieldId : undefined;
      const aggregation = typeof config.aggregation === "string" ? config.aggregation : "count";
      if (aggregation === "count" || aggregation === "count_completed") return aggregateCount(responses, fieldId);
      if (!fieldId) return { kind: "numeric", count: 0, avg: null, sum: 0, min: null, max: null };
      return aggregateNumeric(responses, fieldId);
    }

    case "map": {
      const geoFieldId = typeof config.geoFieldId === "string" ? config.geoFieldId : "";
      const geoField = fields.find(f => f.id === geoFieldId);
      if (!geoField) return { kind: "map", points: [] };
      const categoryFieldId = typeof config.categoryFieldId === "string" ? config.categoryFieldId : undefined;
      const categoryField = categoryFieldId ? fields.find(f => f.id === categoryFieldId) : undefined;
      const result = aggregateMapPoints(responses, geoField, categoryField);
      const categoryStyles = config.categoryStyles as MapResult["categoryStyles"];
      return categoryStyles ? { ...result, categoryStyles } : result;
    }

    case "heatmap":
      return computeHeatmapResult(config, fields, responses);

    case "globe": {
      const mode = config.mode === "heatmap" ? "heatmap" : "points";
      if (mode === "heatmap") return computeHeatmapResult(config, fields, responses);

      const geoFieldId = typeof config.geoFieldId === "string" ? config.geoFieldId : "";
      const geoField = fields.find(f => f.id === geoFieldId);
      if (!geoField) return { kind: "map", points: [] };
      const categoryFieldId = typeof config.categoryFieldId === "string" ? config.categoryFieldId : undefined;
      const categoryField = categoryFieldId ? fields.find(f => f.id === categoryFieldId) : undefined;
      const result = aggregateMapPoints(responses, geoField, categoryField);
      const categoryStyles = config.categoryStyles as MapResult["categoryStyles"];
      return categoryStyles ? { ...result, categoryStyles } : result;
    }

    default:
      return { kind: "text", content: "" };
  }
}

// Compartilhado entre o widget "heatmap" e o modo heatmap do "globe" — mesma
// normalização de indicadores (com compatibilidade pra widgets salvos antes
// de existir a lista) e mesmo motor de agregação por estado.
function computeHeatmapResult(config: Record<string, unknown>, fields: FormField[], responses: Response[]): HeatmapResult {
  const granularity = config.granularity === "city" ? "city" : "state";
  const geoFieldId = typeof config.geoFieldId === "string" ? config.geoFieldId : "";
  const geoField = fields.find(f => f.id === geoFieldId);
  if (!geoField) return { kind: "heatmap", indicators: [], byIndicator: {}, maxByIndicator: {} };

  // Granularidade "cidade": geoFieldId aponta pro campo geo_city (grava só o
  // nome) — o campo geo_state irmão no mesmo formulário dá a UF, necessária
  // pra resolver o código de 7 dígitos do município (nome de cidade não é
  // único no Brasil sem a UF junto).
  let stateField: Pick<FormField, "id"> | undefined;
  if (granularity === "city") {
    stateField = fields.find(f => f.type === "geo_state");
    if (!stateField) return { kind: "heatmap", indicators: [], byIndicator: {}, maxByIndicator: {} };
  }

  type RawIndicator = { key?: string; label?: string; mode?: string; fieldId?: string; optionId?: string };
  let rawIndicators: RawIndicator[] = Array.isArray(config.indicators) ? (config.indicators as RawIndicator[]) : [];

  // Compatibilidade: widgets salvos antes de existir a lista de
  // indicadores tinham indicatorMode/indicatorFieldId/indicatorOptionId
  // soltos — normaliza pra uma lista de 1 item, nada quebra.
  if (rawIndicators.length === 0 && (config.indicatorMode || config.indicatorFieldId)) {
    rawIndicators = [{
      key: "legacy",
      label: "Indicador",
      mode: config.indicatorMode === "choice_percent" ? "choice_percent" : "count",
      fieldId: typeof config.indicatorFieldId === "string" ? config.indicatorFieldId : undefined,
      optionId: typeof config.indicatorOptionId === "string" ? config.indicatorOptionId : undefined,
    }];
  }
  if (rawIndicators.length === 0) {
    rawIndicators = [{ key: "count", label: "Volume de respostas", mode: "count" }];
  }

  const indicators = rawIndicators.map((ind, i) => ({
    key: ind.key || `ind_${i}`,
    label: ind.label || (ind.mode === "choice_percent" ? "Indicador" : "Volume de respostas"),
    mode: (ind.mode === "choice_percent" ? "choice_percent" : "count") as "count" | "choice_percent",
    field: ind.fieldId ? fields.find(f => f.id === ind.fieldId) : undefined,
    optionId: ind.optionId,
  }));

  const result = granularity === "city"
    ? aggregateHeatmapByState(responses, stateField!, indicators, geoField)
    : aggregateHeatmapByState(responses, geoField, indicators);
  return { ...result, granularity };
}
