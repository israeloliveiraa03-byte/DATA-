import { describe, it, expect } from "vitest";
import { chiSquarePValue, crosstabStats, describeStats } from "@/lib/dashboard/stats";

describe("p-valor do qui-quadrado", () => {
  // Valores de referência de tabela (χ² crítico para p = 0,05).
  it("df=1, χ²=3,841 → p≈0,05", () => expect(chiSquarePValue(3.841, 1)).toBeCloseTo(0.05, 3));
  it("df=4, χ²=9,488 → p≈0,05", () => expect(chiSquarePValue(9.488, 4)).toBeCloseTo(0.05, 3));
  it("df=2, χ²=13,816 → p≈0,001", () => expect(chiSquarePValue(13.816, 2)).toBeCloseTo(0.001, 4));
  it("χ²=0 → p=1", () => expect(chiSquarePValue(0, 3)).toBeCloseTo(1, 6));
});

describe("estatística do cruzamento", () => {
  it("tabela independente: sem associação", () => {
    const s = crosstabStats([[20, 20], [30, 30]])!;
    expect(s.chi2).toBeCloseTo(0, 6);
    expect(s.significant).toBe(false);
    expect(s.cramersV).toBeCloseTo(0, 6);
  });
  it("tabela com associação forte", () => {
    const s = crosstabStats([[45, 5], [5, 45]])!;
    expect(s.chi2).toBeCloseTo(64, 0); // (40²/25)·4 = 64
    expect(s.significant).toBe(true);
    expect(s.cramersV).toBeCloseTo(0.8, 2);
    expect(s.strength).toBe("forte");
    expect(s.residuals[0][0]).toBeGreaterThan(1.96);
    expect(s.residuals[0][1]).toBeLessThan(-1.96);
    expect(describeStats(s)).toContain("forte");
  });
  it("ignora linhas e colunas vazias", () => {
    const s = crosstabStats([[10, 0, 2], [0, 0, 0], [3, 0, 9]])!;
    expect(s.df).toBe(1);
    expect(s.residuals[1][1]).toBe(0);
  });
  it("avisa quando há poucas respostas por célula", () => {
    expect(crosstabStats([[2, 1], [1, 3]])!.lowExpected).toBe(true);
  });
  it("sem dados suficientes → null", () => {
    expect(crosstabStats([[5, 5]])).toBeNull();
  });
});

import { aggregateHistogram } from "@/lib/dashboard/aggregate";
describe("histograma com faixas redondas", () => {
  it("valores inteiros de 20 a 317 viram faixas de 50", () => {
    const responses = [20, 57, 99, 150, 151, 200, 250, 317].map((v, i) => ({ id: `r${i}`, data: { f: String(v) } })) as never;
    const h = aggregateHistogram(responses, "f");
    expect(h.bins[0].label).toBe("0–49");
    expect(h.bins.at(-1)!.label).toBe("300–349");
    expect(h.bins.reduce((a, b) => a + b.count, 0)).toBe(8);
  });
});
