import { describe, it, expect } from "vitest";
import { brandCssVars, contrastRatio, generatePalette, googleFontsHref, similarPairs } from "@/lib/dashboard/brand";

const parse = (t: string) => t.split(" ").map(Number) as [number, number, number];

describe("identidade visual: contraste garantido", () => {
  it("cor clara escolhida vira texto legível (≥ 4,5:1) no cartão claro", () => {
    const v = brandCssVars({ accent: "#f2c94c" }, false);
    expect(contrastRatio(parse(v["--color-brand-400"]), [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    // botão amarelo-claro ganha texto escuro
    expect(v["--color-on-accent"]).toBe("20 19 15");
  });
  it("cor escura no tema escuro é clareada para leitura", () => {
    const v = brandCssVars({ accent: "#1f4e8c" }, true);
    expect(contrastRatio(parse(v["--color-brand-400"]), [25, 28, 23])).toBeGreaterThanOrEqual(4.5);
  });
  it("faixa institucional sempre aceita texto branco", () => {
    for (const accent of ["#f2c94c", "#7cb88a", "#3b5d42", "#b3261e"]) {
      expect(contrastRatio(parse(brandCssVars({ accent }, false)["--color-brand-700"]), [255, 255, 255])).toBeGreaterThanOrEqual(7);
    }
  });
  it("fundo próprio só vale no tema claro", () => {
    expect(brandCssVars({ background: "#ffffff" }, false)["--color-ink-950"]).toBe("255 255 255");
    expect(brandCssVars({ background: "#ffffff" }, true)["--color-ink-950"]).toBeUndefined();
  });
  it("sem identidade, nada é sobrescrito", () => {
    expect(brandCssVars(null, false)).toEqual({});
  });
});

describe("paletas e fontes", () => {
  it("gera 6 cores distintas", () => {
    const p = generatePalette("#3b5d42", "triad");
    expect(p).toHaveLength(6);
    expect(new Set(p).size).toBe(6);
  });
  it("detecta cores parecidas", () => {
    expect(similarPairs(["#3b5d42", "#3c5e43", "#b9812f"])).toEqual([[0, 1]]);
  });
  it("só pede ao Google as fontes que não vêm com o app", () => {
    expect(googleFontsHref({ headingFont: "source-serif", bodyFont: "inter" })).toBeNull();
    expect(googleFontsHref({ headingFont: "lora", bodyFont: "inter" })).toContain("family=Lora");
  });
});
