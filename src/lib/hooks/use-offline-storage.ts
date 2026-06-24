"use client";
import { useEffect, useState, useCallback } from "react";
import { openDB, type IDBPDatabase } from "idb";
import type { OfflineResponse } from "@/lib/types";
import { shortId } from "@/lib/utils";

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
    const entry: OfflineResponse = { id: shortId(), formId, researchId, data, createdAt: new Date().toISOString(), synced: false };
    const db = await getDB();
    await db.add(STORE_NAME, entry);
    await refreshCount();
    return entry.id;
  }, [refreshCount]);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const db      = await getDB();
      const tx      = db.transaction(STORE_NAME, "readwrite");
      const pending = await tx.store.index("synced").getAll(IDBKeyRange.only(false));
      for (const entry of pending) {
        try {
          const res = await fetch(`/api/forms/${entry.formId}/responses`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...entry, collectedOffline: true }),
          });
          if (res.ok) await tx.store.put({ ...entry, synced: true });
        } catch { /* mantém na fila */ }
      }
      await tx.done;
      await refreshCount();
    } finally { setIsSyncing(false); }
  }, [isSyncing, refreshCount]);

  useEffect(() => {
    window.addEventListener("online", syncPending);
    return () => window.removeEventListener("online", syncPending);
  }, [syncPending]);

  return { saveOffline, syncPending, pendingCount, isSyncing };
}
