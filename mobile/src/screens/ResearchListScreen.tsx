// Lista de pesquisas do usuário + painel de sincronização.
// Online: atualiza a lista e baixa/atualiza o formulário de cada pesquisa
// aberta (cache local). Offline: usa o que está em cache.

import { useCallback, useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import type { ApiResearch } from "../lib/types";
import { fetchResearches, fetchForm, clearToken } from "../lib/api";
import {
  cacheResearches, getCachedResearches, cacheForm, getCachedForm,
  getPendingResponses, getPendingEntityEdits,
} from "../lib/localDb";
import { runSync, onSyncStateChange, type SyncSummary } from "../lib/syncWorker";

interface Props {
  onOpenForm:    (researchId: string) => void;
  onOpenCapture: () => void;
  onLogout:      () => void;
}

export function ResearchListScreen({ onOpenForm, onOpenCapture, onLogout }: Props) {
  const [researches, setResearches] = useState<ApiResearch[]>([]);
  const [loading, setLoading]       = useState(true);
  const [offline, setOffline]       = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing]       = useState(false);
  const [lastSync, setLastSync]     = useState<SyncSummary | null>(null);
  const [openingId, setOpeningId]   = useState<string | null>(null);
  const [error, setError]           = useState("");

  const refreshPendingCount = useCallback(async () => {
    const [responses, edits] = await Promise.all([getPendingResponses(), getPendingEntityEdits()]);
    setPendingCount(responses.length + edits.length);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const cached = await getCachedResearches();
    if (cached) setResearches(cached);

    const status = await Network.getStatus();
    setOffline(!status.connected);
    if (status.connected) {
      try {
        const fresh = await fetchResearches();
        setResearches(fresh);
        await cacheResearches(fresh);
      } catch {
        if (!cached) setError("Não foi possível carregar as pesquisas — verifique o código do aparelho.");
      }
    }
    await refreshPendingCount();
    setLoading(false);
  }, [refreshPendingCount]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    return onSyncStateChange((running, summary) => {
      setSyncing(running);
      setLastSync(summary);
      if (!running) void refreshPendingCount();
    });
  }, [refreshPendingCount]);

  async function openResearch(researchId: string) {
    setOpeningId(researchId);
    setError("");
    try {
      const status = await Network.getStatus();
      if (status.connected) {
        // Online: baixa/atualiza o formulário pro cache antes de abrir.
        const form = await fetchForm(researchId);
        if (form) await cacheForm(researchId, form);
      }
      const cached = await getCachedForm(researchId);
      if (!cached) {
        setError("Esta pesquisa ainda não tem formulário baixado — abra uma vez com internet antes de ir a campo.");
        return;
      }
      onOpenForm(researchId);
    } finally {
      setOpeningId(null);
    }
  }

  async function logout() {
    await clearToken();
    onLogout();
  }

  return (
    <div className="screen">
      <div className="topbar">
        <p className="kicker" style={{ margin: 0 }}>Dataº Campo</p>
        <button className="topbar-back" onClick={logout}>Sair</button>
      </div>
      <h1 className="screen-title">Suas pesquisas</h1>
      <p className="screen-subtitle">
        {offline ? "Sem conexão — usando dados baixados neste aparelho." : "Toque numa pesquisa para coletar respostas."}
      </p>

      <div className="card">
        <p className="field-label">
          Sincronização{" "}
          <span className={pendingCount > 0 ? "badge badge--pending" : "badge badge--synced"}>
            {pendingCount > 0 ? `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}` : "em dia"}
          </span>
        </p>
        {lastSync && (
          <p className="field-desc">
            Última sincronização: {lastSync.synced} enviada(s), {lastSync.duplicate} já estavam salvas,{" "}
            {lastSync.failed} com erro, {lastSync.remaining} na fila.
          </p>
        )}
        <button className="btn btn--ghost" onClick={() => void runSync()} disabled={syncing || offline}>
          {syncing ? <span className="spinner" /> : null}
          {syncing ? "Sincronizando..." : offline ? "Sem conexão" : "Sincronizar agora"}
        </button>
      </div>

      <button className="btn btn--ghost" style={{ marginBottom: 16 }} onClick={onOpenCapture}>
        Captura de ponto territorial (GPS)
      </button>

      {error && <p className="msg-error">{error}</p>}

      {loading && researches.length === 0 && <p className="msg-muted">Carregando...</p>}

      {!loading && researches.length === 0 && (
        <div className="empty">
          Nenhuma pesquisa encontrada. Crie uma pesquisa no site do Dataº — ela aparece aqui.
        </div>
      )}

      {researches.map(research => (
        <div
          key={research.id}
          className="card card--tap"
          onClick={() => void openResearch(research.id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter") void openResearch(research.id); }}
        >
          <p className="field-label" style={{ marginBottom: 2 }}>
            {research.title}{" "}
            {openingId === research.id && <span className="spinner" />}
          </p>
          {research.description && <p className="field-desc" style={{ margin: 0 }}>{research.description}</p>}
        </div>
      ))}
    </div>
  );
}
