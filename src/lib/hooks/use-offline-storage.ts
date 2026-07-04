"use client";
import { useEffect, useState, useCallback } from "react";
import { openDB, type IDBPDatabase } from "idb";
import type { OfflineResponse } from "@/lib/types";

const DB_NAME = "datazero-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-responses";

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("formId",     "formId",     { unique: false });
        store.createIndex("researchId", "researchId", { unique: false });
        store.createIndex("synced",     "synced",     { unique: false });
      }
    },
  });
}

export function useOfflineStorage() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing,   setIsSyncing]    = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const db    = await getDB();
      const index = db.transaction(STORE_NAME).store.index("synced");
      const count = await index.count(IDBKeyRange.only(false));
      setPendingCount(count);
    } catch { /* SSR */ }
  }, []);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  const saveOffline = useCallback(async (formId: string, researchId: string, data: Record<string, unknown>) => {
    // UUID de verdade — é a chave primária da resposta no Postgres (responses.id),
    // e é o que permite ao servidor reconhecer reenvio depois de falha sem duplicar.
    const entry: OfflineResponse = { id: crypto.randomUUID(), formId, researchId, data, createdAt: new Date().toISOString(), synced: false };
    const db = await getDB();
    await db.add(STORE_NAME, entry);
    await refreshCount();
    return entry.id;
  }, [refreshCount]);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const db = await getDB();
      // Leitura e escrita cada uma na sua própria transação curta (db.getAllFromIndex/db.put)
      // em vez de uma transação só segurada por todo o loop — uma transação de IndexedDB
      // fecha sozinha assim que um await "de verdade" (rede) demora, e o fetch aqui dentro
      // é exatamente isso.
      const pending = await db.getAllFromIndex(STORE_NAME, "synced", IDBKeyRange.only(false));
      for (const entry of pending) {
        if (entry.error) continue; // erro permanente já classificado — não repete sozinho
        try {
          const res = await fetch(`/api/forms/${entry.formId}/responses`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: entry.id, data: entry.data, collectedOffline: true }),
          });
          if (res.ok) {
            await db.put(STORE_NAME, { ...entry, synced: true });
          } else if (res.status >= 400 && res.status < 500) {
            // erro de validação — reenviar sem mudar nada não vai resolver
            await db.put(STORE_NAME, { ...entry, synced: false, error: true });
          }
          // 5xx: deixa como está, tenta de novo na próxima reconexão
        } catch { /* falha de rede — mantém pendente */ }
      }
      await refreshCount();
    } finally { setIsSyncing(false); }
  }, [isSyncing, refreshCount]);

  useEffect(() => {
    window.addEventListener("online", syncPending);
    return () => window.removeEventListener("online", syncPending);
  }, [syncPending]);

  return { saveOffline, syncPending, pendingCount, isSyncing };
}
