// "Gerar painel a partir do instrumento": escolhe um gráfico adequado para
// cada pergunta e monta uma primeira versão do painel, já organizada em
// seções. É um ponto de partida — tudo continua editável depois.
//
// Regras de escolha (as mesmas que um analista usaria):
//   - escolha única com até 3 opções / sim-não → rosca (parte-do-todo)
//   - escolha única com mais opções ou múltipla escolha → barras deitadas em %
//     (nome de opção longo cabe; múltipla escolha soma mais de 100% e não
//     pode ser pizza)
//   - escala/Likert/NPS/escala semântica → barra divergente (concordo × discordo)
//   - número, termômetro, estrelas → histograma (como os valores se distribuem)
//   - matriz → barra empilhada
//   - estado (UF) → mapa coroplético; coordenadas (GPS) → mapa de pontos
//   - duas perguntas de escolha única → um cruzamento com teste de associação

export interface AutoWidget {
  type: "number_card" | "bar_chart" | "line_chart" | "pie_chart" | "donut_chart" | "table" | "text" | "map" | "heatmap" | "image" | "crosstab" | "globe";
  title: string;
  x: number; y: number; w: number; h: number;
  config: Record<string, unknown>;
}

interface FieldLike { id: string; type: string; label: string; config?: unknown }

const SECTION_H = 72;

function section(title: string, y: number): AutoWidget {
  return { type: "text", title: "", x: 0, y, w: 100, h: SECTION_H, config: { content: title, variant: "text", textStyle: { fontSize: 22, fontWeight: "bold", fontFamily: "serif" } } };
}

function optionCount(f: FieldLike): number {
  const opts = (f.config as { options?: unknown[] } | undefined)?.options;
  return Array.isArray(opts) ? opts.length : f.type === "yes_no" ? 2 : 0;
}

function short(label: string, max = 70): string {
  return label.length > max ? label.slice(0, max - 1) + "…" : label;
}

export function buildAutoDashboard(fields: FieldLike[], startY = 0): AutoWidget[] {
  const q = fields.filter(f => f.type !== "section" && f.type !== "instruction");
  const out: AutoWidget[] = [];
  let y = startY;

  // ─── Visão geral ───────────────────────────────────────────────────────
  out.push(section("Visão geral", y)); y += SECTION_H;
  const numeric = q.find(f => ["number", "slider", "stars", "scale", "nps"].includes(f.type));
  const kpis: AutoWidget[] = [
    { type: "number_card", title: "Respostas recebidas", x: 0, y, w: 0, h: 132, config: { aggregation: "count" } },
    { type: "number_card", title: "Respostas completas", x: 0, y, w: 0, h: 132, config: { aggregation: "count_completed" } },
  ];
  if (numeric) kpis.push({ type: "number_card", title: `Média — ${short(numeric.label, 40)}`, x: 0, y, w: 0, h: 132, config: { aggregation: "avg", fieldId: numeric.id, decimals: 1 } });
  const kw = 100 / kpis.length;
  out.push(...kpis.map((k, i) => ({ ...k, x: i * kw, w: kw })));
  y += 140;
  out.push({ type: "line_chart", title: "Ritmo da coleta", x: 0, y, w: 100, h: 220, config: {} });
  y += 228;

  // ─── Território ────────────────────────────────────────────────────────
  const uf = q.find(f => f.type === "geo_state");
  const gps = q.find(f => f.type === "geo_coords");
  if (uf || gps) {
    out.push(section("Território", y)); y += SECTION_H;
    if (uf && gps) {
      out.push({ type: "heatmap", title: "Respostas por unidade da federação", x: 0, y, w: 50, h: 420, config: { geoFieldId: uf.id, indicators: [{ key: "count", label: "Volume de respostas", mode: "count" }] } });
      out.push({ type: "map", title: "Onde as respostas foram coletadas", x: 50, y, w: 50, h: 420, config: { geoFieldId: gps.id } });
    } else if (uf) {
      out.push({ type: "heatmap", title: "Respostas por unidade da federação", x: 0, y, w: 100, h: 440, config: { geoFieldId: uf.id, indicators: [{ key: "count", label: "Volume de respostas", mode: "count" }] } });
    } else if (gps) {
      out.push({ type: "map", title: "Onde as respostas foram coletadas", x: 0, y, w: 100, h: 440, config: { geoFieldId: gps.id } });
    }
    y += 448;
  }

  // ─── Perguntas, duas por linha ─────────────────────────────────────────
  const charts: AutoWidget[] = [];
  for (const f of q) {
    const n = optionCount(f);
    const title = short(f.label);
    if (["single_choice", "yes_no", "consent"].includes(f.type)) {
      charts.push(n > 0 && n <= 3
        ? { type: "donut_chart", title, x: 0, y: 0, w: 50, h: 300, config: { fieldId: f.id, displayMode: "percent" } }
        : { type: "bar_chart", title, x: 0, y: 0, w: 50, h: 300, config: { fieldId: f.id, displayMode: "percent", orientation: "horizontal", sortBy: "count_desc", topN: n > 10 ? 10 : undefined } });
    } else if (f.type === "multiple_choice") {
      charts.push({ type: "bar_chart", title, x: 0, y: 0, w: 50, h: 300, config: { fieldId: f.id, displayMode: "percent", orientation: "horizontal", sortBy: "count_desc", topN: n > 10 ? 10 : undefined } });
    } else if (["scale", "nps", "semantic_scale", "weighted"].includes(f.type)) {
      charts.push({ type: "bar_chart", title, x: 0, y: 0, w: 50, h: 220, config: { chartKind: "diverging_bar", fieldId: f.id } });
    } else if (["number", "slider", "stars"].includes(f.type)) {
      charts.push({ type: "bar_chart", title, x: 0, y: 0, w: 50, h: 260, config: { chartKind: "histogram", fieldId: f.id } });
    } else if (f.type === "matrix") {
      charts.push({ type: "bar_chart", title, x: 0, y: 0, w: 50, h: 300, config: { chartKind: "stacked_bar", fieldId: f.id, displayMode: "percent" } });
    }
    if (charts.length >= 14) break;
  }
  if (charts.length > 0) {
    out.push(section("O que as respostas dizem", y)); y += SECTION_H;
    for (let i = 0; i < charts.length; i += 2) {
      const pair = charts.slice(i, i + 2);
      const h = Math.max(...pair.map(c => c.h));
      // Gráfico sozinho na última linha: barras ocupam a largura toda;
      // rosca fica com metade (esticada, sobra espaço vazio dos lados).
      const alone = pair.length === 1 && pair[0].type === "bar_chart";
      pair.forEach((c, j) => out.push({ ...c, x: j * 50, w: alone ? 100 : 50, y, h }));
      y += h + 8;
    }
  }

  // ─── Cruzamento ────────────────────────────────────────────────────────
  const singles = q.filter(f => ["single_choice", "yes_no"].includes(f.type) && optionCount(f) >= 2);
  if (singles.length >= 2) {
    out.push(section("Cruzamentos", y)); y += SECTION_H;
    out.push({ type: "crosstab", title: `${short(singles[0].label, 40)} × ${short(singles[1].label, 40)}`, x: 0, y, w: 100, h: 320,
      config: { fieldIdRows: singles[0].id, fieldIdCols: singles[1].id, valueMode: "row_percent" } });
    y += 328;
  }
  return out;
}
