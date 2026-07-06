// Cliente HTTP do app de campo. Autentica com o token de dispositivo
// (Authorization: Bearer) guardado via @capacitor/preferences — o app nativo
// não usa cookie de navegador. O token é gerado no site em /parear-aparelho
// (que chama POST /api/auth/device-token) e colado aqui uma única vez.

import { Preferences } from "@capacitor/preferences";
import type { ApiResearch, ApiForm, SyncResultItem, LocalResponse } from "./types";

// Domínio de produção da plataforma. Pra testar contra `next dev` local no
// emulador Android, troque por http://10.0.2.2:3000 (alias do localhost do host).
export const API_BASE = "https://catadados.com";

const TOKEN_KEY = "datao_device_token";

export async function getStoredToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value ?? null;
}

export async function storeToken(token: string): Promise<void> {
  await Preferences.set({ key: TOKEN_KEY, value: token });
}

export async function clearToken(): Promise<void> {
  await Preferences.remove({ key: TOKEN_KEY });
}

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: string; code?: string };

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json || !json.success) {
    const message = json && !json.success ? json.error : `Erro ${res.status}`;
    const code    = json && !json.success ? json.code : undefined;
    throw new ApiError(message, res.status, code);
  }
  return json.data;
}

/** Valida o token colado no pareamento buscando as pesquisas do usuário. */
export async function fetchResearches(): Promise<ApiResearch[]> {
  return request<ApiResearch[]>("/api/researches");
}

/** Formulário ativo da pesquisa, com campos — baixado pra cache local antes de ir a campo. */
export async function fetchForm(researchId: string): Promise<ApiForm | null> {
  return request<ApiForm | null>(`/api/researches/${researchId}/form`);
}

/** Sincronização em lote — POST /api/sync/responses (idempotente por id). */
export async function syncResponsesBatch(
  items: LocalResponse[]
): Promise<SyncResultItem[]> {
  const payload = {
    responses: items.map(r => ({
      id:               r.id,
      formId:           r.formId,
      data:             r.data,
      collectedOffline: true,
      latitude:         r.latitude ?? undefined,
      longitude:        r.longitude ?? undefined,
    })),
  };
  const data = await request<{ results: SyncResultItem[] }>("/api/sync/responses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.results;
}

export interface ApiEntity {
  id:              string;
  code:            string;
  name:            string;
  type:            string;
  boundaryPolygon: GeoFeatureCollection | Array<{ lat: number; lng: number }> | null;
  currentVersion?: number;
}

interface GeoFeature {
  type:       "Feature";
  properties: Record<string, unknown> | null;
  geometry:   { type: string; coordinates: unknown };
}
interface GeoFeatureCollection {
  type:     "FeatureCollection";
  features: GeoFeature[];
}

export async function fetchEntities(): Promise<ApiEntity[]> {
  return request<ApiEntity[]>("/api/entities");
}

export async function fetchEntity(entityId: string): Promise<ApiEntity> {
  return request<ApiEntity>(`/api/entities/${entityId}`);
}

/**
 * Envia os pontos capturados em campo como o contorno principal da entidade
 * (feature com properties.role === "boundary"), preservando as outras feições
 * já marcadas no editor de mesa — mesmo comportamento da mini-pesquisa de
 * campo do site (campo-client.tsx). Busca a entidade atual primeiro e manda
 * `baseVersion`: se alguém editou no meio tempo, o servidor devolve 409
 * (version_conflict) e o item fica marcado como erro pra revisão manual.
 */
export async function pushEntityBoundary(
  entityId: string,
  points: Array<{ lat: number; lng: number }>
): Promise<void> {
  const current = await fetchEntity(entityId);

  const ring = points.map(p => [p.lng, p.lat]);
  if (ring.length > 0) ring.push(ring[0]);
  const boundaryFeature: GeoFeature = {
    type: "Feature",
    properties: { role: "boundary" },
    geometry: { type: "Polygon", coordinates: [ring] },
  };

  const existing: GeoFeature[] =
    current.boundaryPolygon && !Array.isArray(current.boundaryPolygon)
      ? current.boundaryPolygon.features
      : [];
  const others = existing.filter(f => f.properties?.role !== "boundary");

  await request(`/api/entities/${entityId}`, {
    method: "PATCH",
    body: JSON.stringify({
      boundaryPolygon: { type: "FeatureCollection", features: [boundaryFeature, ...others] },
      baseVersion: current.currentVersion,
      changeNote: "Pontos capturados em campo (app Dataº Campo)",
    }),
  });
}
