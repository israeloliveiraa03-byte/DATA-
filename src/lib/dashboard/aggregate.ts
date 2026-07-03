import type { FormField, Response, Widget } from "@/lib/types";
import { parsePastedCoordinates } from "@/lib/entities/coordinates";
import {
  CHOICE_FIELD_TYPES,
  type ChoiceAggResult,
  type ChoiceOption,
  type CountResult,
  type HeatmapResult,
  type MapResult,
  type NumericResult,
  type TableResult,
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

export function aggregateMapPoints(responses: Response[], geoField: Pick<FormField, "id">): MapResult {
  const points = [];
  for (const r of responses) {
    const raw = (r.data as Record<string, unknown> | null)?.[geoField.id];
    if (typeof raw !== "string") continue;
    const parsed = parsePastedCoordinates(raw);
    if (!parsed) continue;
    const label = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("pt-BR") : "Resposta";
    points.push({ lat: parseFloat(parsed.latitude), lng: parseFloat(parsed.longitude), label });
  }
  return { kind: "map", points };
}

export interface HeatmapIndicatorInput {
  key: string;
  label: string;
  mode: "count" | "choice_percent";
  field?: Pick<FormField, "id" | "type" | "config">;
  optionId?: string;
}

// Agrupa respostas por UF (via campo geo_state), uma vez, e calcula cada
// indicador configurado sobre esse mesmo agrupamento. Modo "count" = volume
// de respostas por estado; "choice_percent" = % das respostas do estado em
// que outro campo de escolha bate com a opção escolhida (reproduz
// indicadores tipo "% de escolas com racismo" da referência CONAQ). Vários
// indicadores podem coexistir no mesmo mapa — o widget deixa trocar qual
// colore o país sem precisar reconfigurar.
export function aggregateHeatmapByState(
  responses: Response[],
  geoField: Pick<FormField, "id">,
  indicators: HeatmapIndicatorInput[],
): HeatmapResult {
  const byState: Record<string, { count: number; matchesByIndicator: Record<string, number> }> = {};

  for (const r of responses) {
    const data = r.data as Record<string, unknown> | null;
    const uf = data?.[geoField.id];
    if (typeof uf !== "string" || !uf.trim()) continue;

    if (!byState[uf]) byState[uf] = { count: 0, matchesByIndicator: {} };
    byState[uf].count++;

    for (const ind of indicators) {
      if (ind.mode !== "choice_percent" || !ind.field || !ind.optionId) continue;
      const raw = data?.[ind.field.id];
      if (!hasValue(raw)) continue;
      const ids = Array.isArray(raw) ? raw : [raw];
      if (ids.includes(ind.optionId)) {
        byState[uf].matchesByIndicator[ind.key] = (byState[uf].matchesByIndicator[ind.key] ?? 0) + 1;
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
    indicators: indicators.map(i => ({ key: i.key, label: i.label })),
    byIndicator,
    maxByIndicator,
  };
}

export function computeWidgetData(widget: Pick<Widget, "type" | "config">, fields: FormField[], responses: Response[]): WidgetData {
  const config = (widget.config ?? {}) as Record<string, unknown>;

  switch (widget.type) {
    case "text":
      return { kind: "text", content: typeof config.content === "string" ? config.content : "" };

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
      const result = aggregateChoiceCounts(responses, field);
      if (config.sortBy === "count_desc") result.buckets = [...result.buckets].sort((a, b) => b.count - a.count);
      return result;
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
      return aggregateMapPoints(responses, geoField);
    }

    case "heatmap": {
      const geoFieldId = typeof config.geoFieldId === "string" ? config.geoFieldId : "";
      const geoField = fields.find(f => f.id === geoFieldId);
      if (!geoField) return { kind: "heatmap", indicators: [], byIndicator: {}, maxByIndicator: {} };

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

      return aggregateHeatmapByState(responses, geoField, indicators);
    }

    default:
      return { kind: "text", content: "" };
  }
}
