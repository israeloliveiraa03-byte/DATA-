import { describe, it, expect } from "vitest";
import { buildAutoDashboard } from "@/lib/dashboard/auto-layout";

const opts = (n: number) => ({ options: Array.from({ length: n }, (_, i) => ({ id: `o${i}`, label: `Opção ${i}` })) });

describe("painel gerado a partir do instrumento", () => {
  const fields = [
    { id: "a", type: "single_choice", label: "Zona", config: opts(2) },
    { id: "b", type: "multiple_choice", label: "Infraestrutura", config: opts(6) },
    { id: "c", type: "scale", label: "Avaliação" },
    { id: "d", type: "number", label: "Nº de estudantes" },
    { id: "e", type: "geo_state", label: "UF" },
    { id: "f", type: "yes_no", label: "Transporte escolar?" },
    { id: "g", type: "long_text", label: "Comentários" },
  ];
  const w = buildAutoDashboard(fields);

  it("escolhe o gráfico pelo tipo da pergunta", () => {
    expect(w.find(x => x.config.fieldId === "a")?.type).toBe("donut_chart");
    expect(w.find(x => x.config.fieldId === "b")?.config.orientation).toBe("horizontal");
    expect(w.find(x => x.config.fieldId === "c" && x.type === "bar_chart")?.config.chartKind).toBe("diverging_bar");
    expect(w.find(x => x.config.fieldId === "d" && x.type === "bar_chart")?.config.chartKind).toBe("histogram");
    expect(w.some(x => x.type === "heatmap" && x.config.geoFieldId === "e")).toBe(true);
  });
  it("texto aberto não vira gráfico", () => {
    expect(w.some(x => x.config.fieldId === "g")).toBe(false);
  });
  it("cria um cruzamento entre duas perguntas de escolha única", () => {
    const ct = w.find(x => x.type === "crosstab");
    expect(ct?.config).toMatchObject({ fieldIdRows: "a", fieldIdCols: "f" });
  });
  it("nenhum widget se sobrepõe a outro", () => {
    for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) {
      const A = w[i], B = w[j];
      const overlap = A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h;
      expect(overlap, `${A.title} × ${B.title}`).toBe(false);
    }
  });
});
