import type { WidgetData } from "@/lib/dashboard/types";

// Exporta os dados JÁ AGREGADOS de um widget em CSV — é o mesmo número que
// o leitor vê no gráfico, nunca resposta individual (a rota pública não
// expõe resposta crua). Separador ";" e BOM UTF-8 para abrir direto no
// Excel em português sem quebrar acentos nem decimais.

type Row = (string | number | null | undefined)[];

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v).replace(".", ",") : "";
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Row[]): string {
  return "﻿" + rows.map(r => r.map(cell).join(";")).join("\r\n");
}

/** Linhas do CSV para um widget, ou null quando o tipo não tem dado tabular. */
export function widgetRows(data: WidgetData): Row[] | null {
  switch (data.kind) {
    case "count":
      return [["Indicador", "Valor"], ["Total de respostas", data.total], ["Respostas completas", data.completed]];
    case "numeric":
      return [["Medida", "Valor"], ["Respostas", data.count], ["Média", data.avg], ["Soma", data.sum], ["Mínimo", data.min], ["Máximo", data.max]];
    case "choice":
      return [["Opção", "Respostas", "% de quem respondeu"],
        ...data.buckets.map(b => [b.label, b.count, data.totalResponses > 0 ? Math.round((b.count / data.totalResponses) * 1000) / 10 : null])];
    case "timeseries":
      return [["Data", ...data.series.map(s => s.label)], ...data.points.map(p => [p.date, ...data.series.map(s => p.values[s.key] ?? 0)])];
    case "crosstab":
      return [["", ...data.cols.map(c => c.label), "Total"],
        ...data.rows.map((r, ri) => [r.label, ...data.cells[ri], data.rowTotals[ri]]),
        ["Total", ...data.colTotals, data.grandTotal]];
    case "table":
      return [data.columns.map(c => c.label), ...data.rows.map(r => data.columns.map(c => {
        const v = r.values[c.fieldId];
        return v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : (v as string | number);
      }))];
    case "heatmap": {
      const out: Row[] = [["Indicador", "Local", "Valor", "Respostas"]];
      for (const ind of data.indicators) {
        for (const [k, v] of Object.entries(data.byIndicator[ind.key] ?? {})) out.push([ind.label, k, Math.round(v.value * 10) / 10, v.count]);
      }
      return out;
    }
    case "map":
      return [["Ponto", "Latitude", "Longitude", "Categoria"], ...data.points.map(p => [p.label, p.lat, p.lng, p.categoryValue ?? ""])];
    case "diverging":
    case "histogram":
    case "scatter":
    case "rangebar":
    case "distribution":
    case "radar":
    case "dumbbell":
      return null;
    default:
      return null;
  }
}

export function downloadWidgetCsv(data: WidgetData, filename: string): boolean {
  const rows = widgetRows(data);
  if (!rows) return false;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^\p{L}\p{N}\-_ ]+/gu, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 80) + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
