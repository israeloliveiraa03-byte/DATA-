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
  file_name   TEXT,
  mime_type   TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error  TEXT
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

  // Migração guardada: colunas adicionadas DEPOIS da criação da tabela
  // local_media. CREATE TABLE IF NOT EXISTS não altera tabela existente,
  // então aparelhos que já tinham o banco precisam do ALTER — e em banco
  // novo o ALTER falha porque a coluna já veio no CREATE. Os dois casos
  // são esperados, por isso o catch silencioso.
  for (const stmt of [
    "ALTER TABLE local_media ADD COLUMN file_name TEXT",
    "ALTER TABLE local_media ADD COLUMN sync_error TEXT",
  ]) {
    try { await sqliteDb.execute(stmt); } catch { /* coluna já existe */ }
  }
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

// ─── Mídia local (fotos/arquivos capturados no preenchimento — o arquivo em
//     si fica no Filesystem do aparelho; aqui só a referência e o estado de
//     sincronização. Upload: fila de mídia do syncWorker) ─────────────────────

export async function saveMedia(m: LocalMedia): Promise<void> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    await sqliteDb.run(
      `INSERT OR REPLACE INTO local_media
       (id, response_id, field_id, file_path, file_name, mime_type, captured_at, sync_status, sync_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.responseId, m.fieldId, m.filePath, m.fileName, m.mimeType, m.capturedAt, m.syncStatus, m.syncError]
    );
    return;
  }
  const all = lsGet<LocalMedia[]>("media", []);
  lsSet("media", [...all.filter(x => x.id !== m.id), m]);
}

export async function listMedia(): Promise<LocalMedia[]> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    const res = await sqliteDb.query(
      `SELECT * FROM local_media ORDER BY captured_at ASC`
    );
    return (res.values ?? []).map(rowToMedia);
  }
  return lsGet<LocalMedia[]>("media", [])
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

/** Pendentes em ordem de captura — recaptura do mesmo campo sobrescreve na ordem certa. */
export async function getPendingMedia(): Promise<LocalMedia[]> {
  const all = await listMedia();
  return all.filter(m => m.syncStatus === "pending");
}

export async function setMediaSyncState(
  id: string,
  syncStatus: LocalMedia["syncStatus"],
  syncError: string | null = null
): Promise<void> {
  await initLocalDb();
  if (isNative() && sqliteDb) {
    await sqliteDb.run(
      `UPDATE local_media SET sync_status = ?, sync_error = ? WHERE id = ?`,
      [syncStatus, syncError, id]
    );
    return;
  }
  const all = lsGet<LocalMedia[]>("media", []);
  lsSet("media", all.map(m => (m.id === id ? { ...m, syncStatus, syncError } : m)));
}

/**
 * Remove as mídias pendentes de um mesmo campo/resposta (recaptura antes de
 * enviar: a foto anterior sai da fila pra não subir duas e a antiga
 * sobrescrever a nova). Devolve as linhas removidas pra quem chamou poder
 * apagar os arquivos do Filesystem também.
 */
export async function removePendingMediaForField(
  responseId: string,
  fieldId: string
): Promise<LocalMedia[]> {
  const all = await listMedia();
  const doomed = all.filter(m =>
    m.responseId === responseId && m.fieldId === fieldId && m.syncStatus === "pending"
  );
  if (doomed.length === 0) return [];
  await initLocalDb();
  if (isNative() && sqliteDb) {
    for (const m of doomed) {
      await sqliteDb.run(`DELETE FROM local_media WHERE id = ?`, [m.id]);
    }
    return doomed;
  }
  const ids = new Set(doomed.map(m => m.id));
  lsSet("media", lsGet<LocalMedia[]>("media", []).filter(m => !ids.has(m.id)));
  return doomed;
}

function rowToMedia(row: Record<string, unknown>): LocalMedia {
  return {
    id:         String(row.id),
    responseId: (row.response_id as string | null) ?? null,
    fieldId:    (row.field_id as string | null) ?? null,
    filePath:   String(row.file_path),
    fileName:   (row.file_name as string | null) ?? null,
    mimeType:   String(row.mime_type),
    capturedAt: String(row.captured_at),
    syncStatus: row.sync_status as LocalMedia["syncStatus"],
    syncError:  (row.sync_error as string | null) ?? null,
  };
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
