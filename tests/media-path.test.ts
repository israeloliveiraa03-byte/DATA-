import { describe, it, expect } from "vitest";
import { parseMediaPath } from "@/lib/media/storage";

const R = "11111111-1111-4111-8111-111111111111";
const F = "22222222-2222-4222-8222-222222222222";
const N = "33333333-3333-4333-8333-333333333333";

describe("caminho de mídia privada", () => {
  it("aceita o padrão respostas/{resposta}/{campo}/{arquivo}", () => {
    expect(parseMediaPath(`respostas/${R}/${F}/${N}.jpg`)).toEqual({ responseId: R, fieldId: F });
  });
  it("recusa caminhos fora do padrão (tentativa de ler outro arquivo)", () => {
    expect(parseMediaPath(`respostas/${R}/../../segredo.txt`)).toBeNull();
    expect(parseMediaPath(`assets/${N}.png`)).toBeNull();
    expect(parseMediaPath(`respostas/${R}/${F}/${N}.jpg/extra`)).toBeNull();
  });
});
