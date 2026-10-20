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

// IndexedDB não aceita booleano como chave: IDBKeyRange.only(false) lança
// "parameter is not a valid key" e o índice "synced" nunca contém nenhum
// registro. Por isso a contagem e a sincronização liam sempre zero/erro e as
// respostas guardadas offline no site não subiam sozinhas. A fila é pequena
// (dezenas de itens por aparelho), então ler tudo e filtrar em JS é seguro.
async function getPending(db: IDBPDatabase): Promise<OfflineResponse[]> {
  const all = (await db.getAll(STORE_NAME)) as OfflineResponse[];
  return all.filter(e => !e.synced);
}

export function useOfflineStorage() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing,   setIsSyncing]    = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const db = await getDB();
      const pending = await getPending(db);
      setPendingCount(pending.filter(e => !e.error).length);
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
      // Leitura e escrita cada uma na sua própria transação curta (db.getAll/db.put)
      // em vez de uma transação só segurada por todo o loop — uma transação de IndexedDB
      // fecha sozinha assim que um await "de verdade" (rede) demora, e o fetch aqui dentro
      // é exatamente isso.
      const pending = await getPending(db);
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
