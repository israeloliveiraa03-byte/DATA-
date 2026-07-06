// Drena a fila de pendências locais contra o servidor. Três gatilhos simples
// (sem job de segundo plano do SO — frágil demais nesta fase):
//   1. app volta ao primeiro plano  (@capacitor/app)
//   2. rede volta a ficar disponível (@capacitor/network)
//   3. botão manual "Sincronizar agora"
//
// Respostas vão em lote pro POST /api/sync/responses (idempotente por id:
// reenviar nunca duplica — "duplicate" é confirmação de que já está salvo).
// Edições de entidade vão uma a uma no PATCH /api/entities/[id] (cada uma
// precisa mesclar com a FeatureCollection atual da entidade).
//
// Classificação de erro (mesma regra do hook offline do site):
//   4xx = erro permanente (o dado está errado; sai da fila de retry, fica
//         marcado "error" pra revisão manual)
//   5xx / falha de rede = transitório (continua "pending", tenta no próximo gatilho)

import { App } from "@capacitor/app";
import { Network } from "@capacitor/network";
import {
  getPendingResponses, setResponseSyncState,
  getPendingEntityEdits, setEntityEditSyncState,
} from "./localDb";
import { syncResponsesBatch, pushEntityBoundary, ApiError } from "./api";

export interface SyncSummary {
  synced:    number;
  duplicate: number;
  failed:    number;
  remaining: number;
}

type Listener = (running: boolean, last: SyncSummary | null) => void;

let running = false;
let lastSummary: SyncSummary | null = null;
const listeners = new Set<Listener>();

export function onSyncStateChange(fn: Listener): () => void {
  listeners.add(fn);
  fn(running, lastSummary);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn(running, lastSummary);
}

/** Drena a fila inteira. Seguro chamar em paralelo — só roda uma por vez. */
export async function runSync(): Promise<SyncSummary | null> {
  if (running) return lastSummary;
  running = true;
  notify();

  const summary: SyncSummary = { synced: 0, duplicate: 0, failed: 0, remaining: 0 };
  try {
    // 1. Respostas — em lote.
    const pending = await getPendingResponses();
    if (pending.length > 0) {
      try {
        const results = await syncResponsesBatch(pending);
        for (const result of results) {
          if (result.status === "created") {
            summary.synced++;
            await setResponseSyncState(result.id, "synced");
          } else if (result.status === "duplicate") {
            summary.duplicate++;
            await setResponseSyncState(result.id, "synced");
          } else {
            summary.failed++;
            await setResponseSyncState(result.id, "error", result.error ?? "Erro no servidor");
          }
        }
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          // Lote inteiro rejeitado (ex.: token expirado = 401). Não marca os
          // itens como erro permanente — o problema é da credencial/requisição,
          // não do dado; um novo pareamento resolve e a fila continua intacta.
          summary.failed += pending.length;
        }
        // Falha de rede/5xx: fica tudo "pending" pro próximo gatilho.
      }
    }

    // 2. Edições de entidade (pontos de campo) — uma a uma.
    const edits = await getPendingEntityEdits();
    for (const edit of edits) {
      try {
        await pushEntityBoundary(edit.entityId, edit.points);
        summary.synced++;
        await setEntityEditSyncState(edit.id, "synced");
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          summary.failed++;
          const msg = err.code === "version_conflict"
            ? "A entidade foi editada por outra pessoa — revise no site antes de reenviar"
            : err.message;
          await setEntityEditSyncState(edit.id, "error", msg);
        }
        // Transitório: continua pending.
      }
    }

    const stillPending = await getPendingResponses();
    const stillPendingEdits = await getPendingEntityEdits();
    summary.remaining = stillPending.length + stillPendingEdits.length;
    lastSummary = summary;
    return summary;
  } finally {
    running = false;
    notify();
  }
}

let triggersRegistered = false;

/** Registra os gatilhos automáticos — chamar uma vez, na inicialização do app. */
export function registerSyncTriggers(): void {
  if (triggersRegistered) return;
  triggersRegistered = true;

  // App voltou ao primeiro plano.
  App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) void runSync();
  });

  // Rede voltou.
  Network.addListener("networkStatusChange", status => {
    if (status.connected) void runSync();
  });
}
