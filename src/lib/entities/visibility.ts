// Regras puras (sem banco) de edição e de exposição de localização das
// entidades — separadas de access.ts para poderem ser testadas sozinhas.
// A explicação completa das regras está em src/lib/entities/access.ts.

type EntityLike = { id: string; createdBy: string };

export type EntityEditContext = { userId: string; isAdmin: boolean; teamEntityIds: Set<string> };

export function canEditEntity(entity: EntityLike, ctx: EntityEditContext): boolean {
  return ctx.isAdmin || entity.createdBy === ctx.userId || ctx.teamEntityIds.has(entity.id);
}

type Located = {
  latitude?: string | null;
  longitude?: string | null;
  boundaryPolygon?: unknown;
  locationDisclosure?: string | null;
};

function roundCoord(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : null;
}

/** Aplica o nível de exposição a um objeto com campos de localização (entidade ou snapshot). */
export function redactLocation<T extends Located>(obj: T, disclosure: string | null | undefined): T {
  if (disclosure === "exact") return obj;
  if (disclosure === "approximate") {
    return { ...obj, latitude: roundCoord(obj.latitude), longitude: roundCoord(obj.longitude), boundaryPolygon: null };
  }
  return { ...obj, latitude: null, longitude: null, boundaryPolygon: null };
}

/** Versão para quem está vendo: editor vê tudo; os demais, conforme a escolha de quem criou. */
export function entityForViewer<T extends EntityLike & Located>(entity: T, ctx: EntityEditContext): T & { canEdit: boolean } {
  const editable = canEditEntity(entity, ctx);
  const visible = editable ? entity : redactLocation(entity, entity.locationDisclosure);
  return { ...visible, canEdit: editable };
}

/** Snapshots do histórico também carregam geometria — mesma regra. */
export function versionsForViewer<V extends { snapshot: unknown }>(versions: V[], disclosure: string | null | undefined, editable: boolean): V[] {
  if (editable) return versions;
  return versions.map(v => ({
    ...v,
    snapshot: v.snapshot && typeof v.snapshot === "object" ? redactLocation(v.snapshot as Located, disclosure) : v.snapshot,
  }));
}
