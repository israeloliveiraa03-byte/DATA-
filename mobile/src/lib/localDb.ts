// Armazenamento local do app de campo.
//
// No aparelho (Android/iOS) usa SQLite de verdade (@capacitor-community/sqlite).
// No navegador (npm run dev, pra desenvolver as telas sem emulador) cai num
// fallback de localStorage com a MESMA interface — o resto do app não sabe a
// diferença. A "sync_outbox" do plano é derivada, não uma tabela própria:
// pendência = linha com sync_status = 'pending' em local_responses /
// local_entity_edits — evita manter dois registros do mesmo estado.

import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { LocalResponse, LocalEntityEdit, LocalMedia, ApiResearch, ApiForm } from "./types";
import type { ApiEntity } from "./api";

const DB_NAME = "datao_campo";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS local_responses (
  id          TEXT PRIMARY KEY,
  form_id     TEXT NOT NULL,
  research_id TEXT NOT NULL,
  data        TEXT NOT NULL,
  latitude    TEXT,
  longitude   TEXT,
  captured_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error  TEXT
);
CREATE TABLE IF NOT EXISTS local_entity_edits (
  id          TEXT PRIMARY KEY,
  entity_id   TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  points      TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error  TEXT
);
CREATE TABLE IF NOT EXISTS local_media (
  id          TEXT PRIMARY KEY,
  response_id TEXT,
  field_id    TEXT,
  file_path   TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE IF NOT EXISTS kv_cache (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// ─── Conexão SQLite (só no nativo) ───────────────────────────────────────────

let sqliteDb: SQLiteDBConnection | null = null;
let initPromise: Promise<void> | null = null;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function initNative(): Promise<void> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const consistency = await sqlite.checkConnectionsConsistency();
  const existing = await sqlite.isConnection(DB_NAME, false);
  sqliteDb = consistency.result && existing.result
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
  await sqliteDb.open();
  await sqliteDb.execute(SCHEMA_SQL);
}

export function initLocalDb(): Promise<void> {
  if (!initPromise) {
    initPromise = isNative() ? initNative() : Promise.resolve();
  }
  return initPromise;
}

// ─── Fallback web (localStorage) ─────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`datao.${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  localStorage.setItem(`datao.${key}`, JSON.stringify(value));
}

// ─── Respostas coletadas ─────────────────────────────────────────────────────

export async function saveResponse(r: LocalResponse): Promise<void> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    await sqliteDb.run(
      `INSERT OR REPLACE INTO local_responses
       (id, form_id, research_id, data, latitude, longitude, captured_at, sync_status, sync_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.formId, r.researchId, JSON.stringify(r.data), r.latitude, r.longitude, r.capturedAt, r.syncStatus, r.syncError]
    );
    return;
  }
  const all = lsGet<LocalResponse[]>("responses", []);
  lsSet("responses", [...all.filter(x => x.id !== r.id), r]);
}

export async function listResponses(): Promise<LocalResponse[]> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    const res = await sqliteDb.query(
      `SELECT * FROM local_responses ORDER BY captured_at DESC`
    );
    return (res.values ?? []).map(rowToResponse);
  }
  return lsGet<LocalResponse[]>("responses", [])
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export async function getPendingResponses(): Promise<LocalResponse[]> {
  const all = await listResponses();
  return all.filter(r => r.syncStatus === "pending");
}

export async function setResponseSyncState(
  id: string,
  syncStatus: LocalResponse["syncStatus"],
  syncError: string | null = null
): Promise<void> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    await sqliteDb.run(
      `UPDATE local_responses SET sync_status = ?, sync_error = ? WHERE id = ?`,
      [syncStatus, syncError, id]
    );
    return;
  }
  const all = lsGet<LocalResponse[]>("responses", []);
  lsSet("responses", all.map(r => (r.id === id ? { ...r, syncStatus, syncError } : r)));
}

function rowToResponse(row: Record<string, unknown>): LocalResponse {
  return {
    id:         String(row.id),
    formId:     String(row.form_id),
    researchId: String(row.research_id),
    data:       JSON.parse(String(row.data)),
    latitude:   (row.latitude as string | null) ?? null,
    longitude:  (row.longitude as string | null) ?? null,
    capturedAt: String(row.captured_at),
    syncStatus: row.sync_status as LocalResponse["syncStatus"],
    syncError:  (row.sync_error as string | null) ?? null,
  };
}

// ─── Edições de entidade (captura territorial) ───────────────────────────────

export async function saveEntityEdit(e: LocalEntityEdit): Promise<void> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    await sqliteDb.run(
      `INSERT OR REPLACE INTO local_entity_edits
       (id, entity_id, entity_name, points, captured_at, sync_status, sync_error)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.entityId, e.entityName, JSON.stringify(e.points), e.capturedAt, e.syncStatus, e.syncError]
    );
    return;
  }
  const all = lsGet<LocalEntityEdit[]>("entityEdits", []);
  lsSet("entityEdits", [...all.filter(x => x.id !== e.id), e]);
}

export async function listEntityEdits(): Promise<LocalEntityEdit[]> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    const res = await sqliteDb.query(
      `SELECT * FROM local_entity_edits ORDER BY captured_at DESC`
    );
    return (res.values ?? []).map(row => ({
      id:         String(row.id),
      entityId:   String(row.entity_id),
      entityName: String(row.entity_name),
      points:     JSON.parse(String(row.points)),
      capturedAt: String(row.captured_at),
      syncStatus: row.sync_status as LocalEntityEdit["syncStatus"],
      syncError:  (row.sync_error as string | null) ?? null,
    }));
  }
  return lsGet<LocalEntityEdit[]>("entityEdits", [])
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export async function getPendingEntityEdits(): Promise<LocalEntityEdit[]> {
  const all = await listEntityEdits();
  return all.filter(e => e.syncStatus === "pending");
}

export async function setEntityEditSyncState(
  id: string,
  syncStatus: LocalEntityEdit["syncStatus"],
  syncError: string | null = null
): Promise<void> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    await sqliteDb.run(
      `UPDATE local_entity_edits SET sync_status = ?, sync_error = ? WHERE id = ?`,
      [syncStatus, syncError, id]
    );
    return;
  }
  const all = lsGet<LocalEntityEdit[]>("entityEdits", []);
  lsSet("entityEdits", all.map(e => (e.id === id ? { ...e, syncStatus, syncError } : e)));
}

// ─── Mídia local (fotos etc. — referência ao arquivo, upload fica pra fase da
//     rota de mídia no servidor, que ainda não existe) ────────────────────────

export async function saveMedia(m: LocalMedia): Promise<void> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    await sqliteDb.run(
      `INSERT OR REPLACE INTO local_media
       (id, response_id, field_id, file_path, mime_type, captured_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.responseId, m.fieldId, m.filePath, m.mimeType, m.capturedAt, m.syncStatus]
    );
    return;
  }
  const all = lsGet<LocalMedia[]>("media", []);
  lsSet("media", [...all.filter(x => x.id !== m.id), m]);
}

// ─── Cache de leitura (pesquisas/formulários/entidades baixados) ─────────────

async function cacheSet(key: string, value: unknown): Promise<void> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    await sqliteDb.run(
      `INSERT OR REPLACE INTO kv_cache (key, value) VALUES (?, ?)`,
      [key, JSON.stringify(value)]
    );
    return;
  }
  lsSet(`cache.${key}`, value);
}

async function cacheGet<T>(key: string): Promise<T | null> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    const res = await sqliteDb.query(`SELECT value FROM kv_cache WHERE key = ?`, [key]);
    const row = res.values?.[0];
    return row ? (JSON.parse(String(row.value)) as T) : null;
  }
  return lsGet<T | null>(`cache.${key}`, null);
}

export const cacheResearches   = (list: ApiResearch[]) => cacheSet("researches", list);
export const getCachedResearches = () => cacheGet<ApiResearch[]>("researches");

export const cacheForm      = (researchId: string, form: ApiForm) => cacheSet(`form.${researchId}`, form);
export const getCachedForm  = (researchId: string) => cacheGet<ApiForm>(`form.${researchId}`);

export const cacheEntities     = (list: ApiEntity[]) => cacheSet("entities", list);
export const getCachedEntities = () => cacheGet<ApiEntity[]>("entities");
