import { describe, it, expect } from "vitest";
import { canEditEntity, entityForViewer, redactLocation, versionsForViewer } from "@/lib/entities/visibility";

const base = {
  id: "e1", createdBy: "ana",
  latitude: "-9.6658", longitude: "-35.7350",
  boundaryPolygon: { type: "FeatureCollection", features: [] },
};
const ctx = (userId: string, extra: Partial<{ isAdmin: boolean; teamEntityIds: Set<string> }> = {}) =>
  ({ userId, isAdmin: false, teamEntityIds: new Set<string>(), ...extra });

describe("quem pode editar uma entidade", () => {
  it("quem cadastrou", () => expect(canEditEntity(base, ctx("ana"))).toBe(true));
  it("outra conta qualquer, não", () => expect(canEditEntity(base, ctx("bruno"))).toBe(false));
  it("equipe interna admin", () => expect(canEditEntity(base, ctx("bruno", { isAdmin: true }))).toBe(true));
  it("equipe de pesquisa vinculada", () => expect(canEditEntity(base, ctx("bruno", { teamEntityIds: new Set(["e1"]) }))).toBe(true));
});

describe("o que quem não edita vê da localização", () => {
  it("oculta: nada de coordenada nem contorno", () => {
    const v = entityForViewer({ ...base, locationDisclosure: "hidden" }, ctx("bruno"));
    expect(v.latitude).toBeNull(); expect(v.longitude).toBeNull(); expect(v.boundaryPolygon).toBeNull(); expect(v.canEdit).toBe(false);
  });
  it("aproximada: coordenada arredondada, sem contorno", () => {
    const v = entityForViewer({ ...base, locationDisclosure: "approximate" }, ctx("bruno"));
    expect(v.latitude).toBe("-9.7"); expect(v.longitude).toBe("-35.7"); expect(v.boundaryPolygon).toBeNull();
  });
  it("exata: tudo", () => {
    const v = entityForViewer({ ...base, locationDisclosure: "exact" }, ctx("bruno"));
    expect(v.latitude).toBe("-9.6658"); expect(v.boundaryPolygon).not.toBeNull();
  });
  it("quem edita vê tudo mesmo com localização oculta", () => {
    const v = entityForViewer({ ...base, locationDisclosure: "hidden" }, ctx("ana"));
    expect(v.latitude).toBe("-9.6658"); expect(v.canEdit).toBe(true);
  });
  it("histórico de versões também é filtrado", () => {
    const versions = [{ id: "v1", snapshot: { ...base } }];
    expect((versionsForViewer(versions, "hidden", false)[0].snapshot as typeof base).boundaryPolygon).toBeNull();
    expect((versionsForViewer(versions, "hidden", true)[0].snapshot as typeof base).boundaryPolygon).not.toBeNull();
  });
  it("valor ausente vira oculta (padrão seguro)", () => {
    expect(redactLocation({ ...base }, undefined).latitude).toBeNull();
  });
});
