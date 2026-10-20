import { describe, it, expect } from "vitest";
import { conditionMet, visibleFieldIds, onlyVisibleAnswers } from "@/lib/forms/conditions";

const cond = (dependsOn: string, op: string, value = "") => ({ condDependsOn: dependsOn, condOperator: op, condValue: value });

describe("conditionMet", () => {
  it("sem condição, sempre visível", () => {
    expect(conditionMet({}, {})).toBe(true);
  });
  it("foi respondida", () => {
    expect(conditionMet(cond("a", "answered"), {})).toBe(false);
    expect(conditionMet(cond("a", "answered"), { a: "" })).toBe(false);
    expect(conditionMet(cond("a", "answered"), { a: [] })).toBe(false);
    expect(conditionMet(cond("a", "answered"), { a: "x" })).toBe(true);
  });
  it("igual / diferente, inclusive em múltipla escolha", () => {
    expect(conditionMet(cond("a", "equals", "r"), { a: "r" })).toBe(true);
    expect(conditionMet(cond("a", "equals", "r"), { a: ["u", "r"] })).toBe(true);
    expect(conditionMet(cond("a", "not_equals", "r"), { a: "u" })).toBe(true);
    expect(conditionMet(cond("a", "not_equals", "r"), {})).toBe(false);
  });
  it("contém o texto, sem diferenciar maiúsculas", () => {
    expect(conditionMet(cond("a", "contains", "quilombo"), { a: "Quilombo Mumbaça" })).toBe(true);
  });
  it("maior / menor que, aceitando vírgula decimal", () => {
    expect(conditionMet(cond("a", "gt", "10"), { a: "25" })).toBe(true);
    expect(conditionMet(cond("a", "gt", "10"), { a: "10" })).toBe(false);
    expect(conditionMet(cond("a", "lt", "2,5"), { a: "1,5" })).toBe(true);
    expect(conditionMet(cond("a", "gt", "10"), { a: "abc" })).toBe(false);
  });
});

describe("visibleFieldIds", () => {
  const fields = [
    { id: "f1", type: "single_choice" },
    { id: "f2", type: "short_text", config: cond("f1", "equals", "r") },
    { id: "s1", type: "section", config: cond("f1", "equals", "r") },
    { id: "f3", type: "yes_no" },
    { id: "f4", type: "number", config: cond("f3", "equals", "Sim") },
    { id: "s2", type: "section" },
    { id: "f5", type: "scale" },
  ];

  it("seção condicional esconde as perguntas até a próxima seção", () => {
    expect([...visibleFieldIds(fields, { f1: "u" })]).toEqual(["f1", "f5"]);
    expect([...visibleFieldIds(fields, { f1: "r" })]).toEqual(["f1", "f2", "f3", "f5"]);
  });

  it("condição em cadeia: resposta de pergunta oculta não conta", () => {
    // f3 = Sim ficou guardada, mas f3 sumiu porque f1 mudou para urbana.
    expect(visibleFieldIds(fields, { f1: "u", f3: "Sim" }).has("f4")).toBe(false);
    expect(visibleFieldIds(fields, { f1: "r", f3: "Sim" }).has("f4")).toBe(true);
  });

  it("respostas de perguntas ocultas não vão para o banco", () => {
    expect(onlyVisibleAnswers(fields, { f1: "u", f2: "Comunidade X", f3: "Sim", f5: 4 })).toEqual({ f1: "u", f5: 4 });
  });
});
