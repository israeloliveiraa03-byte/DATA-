"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Research, Dashboard } from "@/lib/types";

const TOOL_BTN = "flex items-center justify-center rounded border border-ink-700 bg-ink-900 hover:bg-ink-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

export function DashboardListClient({ research, dashboards: initial }: { research: Research; dashboards: Dashboard[] }) {
  const router = useRouter();
  const [dashboards, setDashboards] = useState(initial);
  const [creating,    setCreating]    = useState(false);
  const [newTitle,    setNewTitle]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [busyId,      setBusyId]      = useState<string | null>(null);

  async function createDashboard(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/researches/${research.id}/dashboards`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao criar dashboard"); return; }
      toast.success("Dashboard criado — abrindo o editor.");
      router.push(`/researches/${research.id}/dashboard-builder/${json.data.id}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateDashboard(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboards/${id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error("Erro ao duplicar dashboard."); return; }
      setDashboards(prev => [json.data, ...prev]);
      toast.success("Dashboard duplicado.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublish(dash: Dashboard) {
    setBusyId(dash.id);
    try {
      const res = await fetch(`/api/dashboards/${dash.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !dash.isPublic }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error("Erro ao atualizar publicação."); return; }
      setDashboards(prev => prev.map(d => d.id === dash.id ? json.data : d));
      toast.success(dash.isPublic ? "Dashboard despublicado." : "Dashboard publicado — link público disponível.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDashboard(id: string) {
    if (!confirm("Apagar este dashboard e todos os seus widgets? Não dá pra desfazer.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao apagar dashboard."); return; }
      setDashboards(prev => prev.filter(d => d.id !== id));
      toast.success("Dashboard apagado.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-5xl mx-auto">

        <nav aria-label="Você está em" className="flex items-center gap-2 text-xs mb-5 text-ink-300 flex-wrap">
          <Link href="/dashboard" className="hover:underline text-brand-400">Início</Link>
          <i className="ti ti-chevron-right text-xs" aria-hidden="true" />
          <Link href={`/researches/${research.id}`} className="hover:underline text-brand-400 truncate max-w-[40%]">{research.title}</Link>
          <i className="ti ti-chevron-right text-xs" aria-hidden="true" />
          <span className="text-ink-100">Dashboards</span>
        </nav>

        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest font-condensed bg-ink-900 border border-ink-700 text-ink-300">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Dashboards
            </div>
            <h1 className="text-2xl font-bold font-condensed text-ink-100" style={{ letterSpacing: "-0.3px" }}>
              {research.title}
            </h1>
            <p className="text-sm mt-0.5 text-ink-300">
              {dashboards.length} {dashboards.length === 1 ? "dashboard" : "dashboards"}
            </p>
          </div>
          <button
            onClick={() => setCreating(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150">
            <i className="ti ti-plus" aria-hidden="true" /> Novo dashboard
          </button>
        </div>

        {creating && (
          <form onSubmit={createDashboard} className="rounded-lg p-4 mb-5 flex items-center gap-2 flex-wrap border border-ink-700 bg-ink-900">
            <label htmlFor="novo-dashboard-titulo" className="sr-only">Nome do dashboard</label>
            <input
              id="novo-dashboard-titulo"
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Nome do dashboard (ex: Visão geral, Resultados por região...)"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-md border border-ink-700 bg-ink-950 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" disabled={saving || !newTitle.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving && <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />}
              {saving ? "Criando..." : "Criar"}
            </button>
          </form>
        )}
        {error && <p className="text-sm mb-4 text-coral-500">{error}</p>}

        {dashboards.length === 0 && !creating ? (
          <div className="text-center py-20 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
            <i className="ti ti-chart-bar text-4xl block mb-3 text-ink-500" aria-hidden="true" />
            <p className="text-sm font-semibold mb-1 text-ink-100">Nenhum dashboard ainda</p>
            <p className="text-xs mb-5 text-ink-300">
              Crie painéis com gráficos e indicadores a partir das respostas desta pesquisa
            </p>
            <button onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150">
              <i className="ti ti-plus" aria-hidden="true" /> Criar primeiro dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map(dash => (
              <div key={dash.id} className="rounded-lg p-4 flex flex-col border border-ink-700 bg-ink-900 transition-colors duration-150 hover:border-brand-500/40">
                <Link href={`/researches/${research.id}/dashboard-builder/${dash.id}`} className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-ink-800">
                      <i className="ti ti-chart-bar text-sm text-brand-400" aria-hidden="true" />
                    </div>
                    {dash.isPublic && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700">
                        Publicado
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold mb-1 text-ink-100">{dash.title}</h3>
                  {dash.description && <p className="text-xs text-ink-300">{dash.description}</p>}
                </Link>

                {dash.isPublic && dash.publicSlug && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/d/${dash.publicSlug}`); toast.success("Link público copiado."); }}
                    className="mt-2 flex items-center gap-1 text-xs font-medium truncate text-brand-400 hover:underline">
                    <i className="ti ti-link text-xs" aria-hidden="true" /> Copiar link público
                  </button>
                )}

                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-ink-700">
                  <button onClick={() => togglePublish(dash)} disabled={busyId === dash.id}
                    className={`${TOOL_BTN} flex-1 gap-1 px-2 py-1.5 text-xs font-semibold text-ink-300 hover:text-ink-100`}>
                    <i className={`ti ${busyId === dash.id ? "ti-loader-2 animate-spin" : dash.isPublic ? "ti-lock" : "ti-world"} text-xs`} aria-hidden="true" />
                    {dash.isPublic ? "Despublicar" : "Publicar"}
                  </button>
                  <button onClick={() => duplicateDashboard(dash.id)} disabled={busyId === dash.id}
                    className={`${TOOL_BTN} w-8 h-8 text-ink-300 hover:text-ink-100`} aria-label="Duplicar">
                    <i className="ti ti-copy text-xs" aria-hidden="true" />
                  </button>
                  <button onClick={() => deleteDashboard(dash.id)} disabled={busyId === dash.id}
                    className={`${TOOL_BTN} w-8 h-8 text-coral-500 hover:text-coral-600`} aria-label="Apagar">
                    <i className="ti ti-trash text-xs" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
