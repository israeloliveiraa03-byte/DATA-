"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Research, Dashboard } from "@/lib/types";

const BRD = "1px solid #e8d8be";

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
      if (res.ok) setDashboards(prev => [json.data, ...prev]);
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
      if (res.ok) setDashboards(prev => prev.map(d => d.id === dash.id ? json.data : d));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDashboard(id: string) {
    if (!confirm("Apagar este dashboard e todos os seus widgets? Não dá pra desfazer.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
      if (res.ok) setDashboards(prev => prev.filter(d => d.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex-1 overflow-auto" style={{ background: "#fff" }}>
      <div className="p-6 max-w-5xl mx-auto">

        <div className="flex items-center gap-2 text-xs mb-5" style={{ color: "#a06d28" }}>
          <Link href="/dashboard" className="hover:underline" style={{ color: "#c48a42" }}>Início</Link>
          <i className="ti ti-chevron-right text-xs" />
          <Link href={`/researches/${research.id}`} className="hover:underline" style={{ color: "#c48a42" }}>{research.title}</Link>
          <i className="ti ti-chevron-right text-xs" />
          <span style={{ color: "#5c3f13" }}>Dashboards</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest"
              style={{ background: "#fbf3e7", border: BRD, color: "#5c3f13" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c48a42" }} />
              Dashboards
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif", letterSpacing: "-0.4px" }}>
              {research.title}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#a06d28" }}>
              {dashboards.length} {dashboards.length === 1 ? "dashboard" : "dashboards"}
            </p>
          </div>
          <button
            onClick={() => setCreating(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold"
            style={{ background: "#c48a42", color: "#fff", border: "1.5px solid #7a5218" }}>
            <i className="ti ti-plus" /> Novo dashboard
          </button>
        </div>

        {creating && (
          <form onSubmit={createDashboard} className="rounded-xl p-4 mb-5 flex items-center gap-2" style={{ border: BRD, background: "#fbf3e7" }}>
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Nome do dashboard (ex: Visão geral, Resultados por região...)"
              className="flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none"
              style={{ border: BRD, background: "#fff", color: "#111" }}
            />
            <button type="submit" disabled={saving || !newTitle.trim()}
              className="px-3 py-2 rounded-md text-xs font-bold disabled:opacity-50"
              style={{ background: "#c48a42", color: "#fff" }}>
              {saving ? "Criando..." : "Criar"}
            </button>
          </form>
        )}
        {error && <p className="text-sm mb-4" style={{ color: "#c0392b" }}>{error}</p>}

        {dashboards.length === 0 && !creating ? (
          <div className="text-center py-20 rounded-xl" style={{ border: "2px dashed #d9bb8c", background: "#fbf3e7" }}>
            <i className="ti ti-chart-bar text-4xl block mb-3" style={{ color: "#d9bb8c" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "#5c3f13" }}>Nenhum dashboard ainda</p>
            <p className="text-xs mb-5" style={{ color: "#a06d28" }}>
              Crie painéis com gráficos e indicadores a partir das respostas desta pesquisa
            </p>
            <button onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold"
              style={{ background: "#c48a42", color: "#fff" }}>
              <i className="ti ti-plus" /> Criar primeiro dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map(dash => (
              <div key={dash.id} className="rounded-xl p-4 flex flex-col" style={{ border: BRD, background: "#fff" }}>
                <Link href={`/researches/${research.id}/dashboard-builder/${dash.id}`} className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#fbf3e7" }}>
                      <i className="ti ti-chart-bar text-sm" style={{ color: "#c48a42" }} />
                    </div>
                    {dash.isPublic && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#eaf0e4", color: "#3a5430" }}>
                        Publicado
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: "#0f172a" }}>{dash.title}</h3>
                  {dash.description && <p className="text-xs" style={{ color: "#a06d28" }}>{dash.description}</p>}
                </Link>

                {dash.isPublic && dash.publicSlug && (
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/d/${dash.publicSlug}`)}
                    className="mt-2 flex items-center gap-1 text-xs font-medium truncate"
                    style={{ color: "#3a5430" }}>
                    <i className="ti ti-link text-xs" /> Copiar link público
                  </button>
                )}

                <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: BRD }}>
                  <button onClick={() => togglePublish(dash)} disabled={busyId === dash.id}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                    style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
                    <i className={`ti ${dash.isPublic ? "ti-lock" : "ti-world"} text-xs`} />
                    {dash.isPublic ? "Despublicar" : "Publicar"}
                  </button>
                  <button onClick={() => duplicateDashboard(dash.id)} disabled={busyId === dash.id}
                    className="w-8 h-8 flex items-center justify-center rounded disabled:opacity-50"
                    style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }} aria-label="Duplicar">
                    <i className="ti ti-copy text-xs" />
                  </button>
                  <button onClick={() => deleteDashboard(dash.id)} disabled={busyId === dash.id}
                    className="w-8 h-8 flex items-center justify-center rounded disabled:opacity-50"
                    style={{ border: BRD, background: "#fbf3e7", color: "#c0392b" }} aria-label="Apagar">
                    <i className="ti ti-trash text-xs" />
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
