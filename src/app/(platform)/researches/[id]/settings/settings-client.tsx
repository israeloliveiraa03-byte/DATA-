"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { Research } from "@/lib/types";

const FIELD_CLASS = "w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-700 bg-ink-950 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

interface Props {
  research: Research;
}

export function ResearchSettingsClient({ research }: Props) {
  const router = useRouter();
  const [title,       setTitle]       = useState(research.title);
  const [description, setDescription] = useState(research.description ?? "");
  const [allowAnonymous, setAllowAnonymous] = useState(research.allowAnonymous);
  const [collectGps,     setCollectGps]     = useState(research.collectGps);
  const [offlineEnabled, setOfflineEnabled] = useState(research.offlineEnabled);
  const [publicDashboard,setPublicDashboard] = useState(research.publicDashboard);
  const [status,      setStatus]      = useState(research.status);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch(`/api/researches/${research.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, allowAnonymous, collectGps, offlineEnabled, publicDashboard }),
      });
      if (!res.ok) { toast.error("Erro ao salvar configurações."); return; }
      toast.success("Configurações salvas.");
    } catch {
      toast.error("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(newStatus: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/researches/${research.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { toast.error("Erro ao atualizar status."); return; }
      setStatus(newStatus as Research["status"]);
      toast.success(newStatus === "closed" ? "Pesquisa encerrada." : "Status atualizado.");
    } catch {
      toast.error("Erro de conexão ao atualizar status.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteResearch() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/researches/${research.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir pesquisa."); return; }
      toast.success("Pesquisa excluída.");
      router.push("/researches");
    } catch {
      toast.error("Erro de conexão ao excluir.");
    } finally {
      setDeleting(false);
    }
  }

  const toggles = [
    { key: "allowAnonymous", label: "Permitir respostas anônimas", icon: "ti-user-off", value: allowAnonymous, set: setAllowAnonymous },
    { key: "offlineEnabled", label: "Coleta offline",              icon: "ti-wifi-off", value: offlineEnabled, set: setOfflineEnabled },
    { key: "collectGps",     label: "Coletar localização (GPS)",   icon: "ti-map-pin",  value: collectGps,     set: setCollectGps },
    { key: "publicDashboard",label: "Dashboard público por padrão",icon: "ti-world",    value: publicDashboard,set: setPublicDashboard },
  ] as const;

  return (
    <div className="min-h-full bg-ink-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <nav aria-label="Você está em" className="flex items-center gap-2 text-xs mb-5 text-ink-300">
          <Link href={`/researches/${research.id}`} className="text-brand-400 hover:underline truncate max-w-[60%]">{research.title}</Link>
          <i className="ti ti-chevron-right text-xs" aria-hidden="true" />
          <span className="text-ink-100">Configurações</span>
        </nav>

        <h1 className="text-2xl font-bold font-condensed text-ink-100 mb-6">Configurações da pesquisa</h1>

        <div className="rounded-lg p-4 mb-4 border border-ink-700 bg-ink-900">
          <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-3">Identificação</p>
          <label htmlFor="pesquisa-titulo" className="text-xs font-semibold mb-1 block text-ink-100">Título</label>
          <input id="pesquisa-titulo" value={title} onChange={e => setTitle(e.target.value)}
            className={`${FIELD_CLASS} mb-3`} />
          <label htmlFor="pesquisa-descricao" className="text-xs font-semibold mb-1 block text-ink-100">Descrição</label>
          <textarea id="pesquisa-descricao" value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className={`${FIELD_CLASS} resize-y`} />
        </div>

        <div className="rounded-lg p-4 mb-4 border border-ink-700 bg-ink-900">
          <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-3">Configurações de coleta</p>
          <div className="flex flex-col gap-3">
            {toggles.map(t => (
              <div key={t.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <i className={`ti ${t.icon} text-sm text-brand-400`} aria-hidden="true" />
                  <span className="text-sm font-medium text-ink-100">{t.label}</span>
                </div>
                <button type="button" onClick={() => t.set(!t.value)}
                  className={`w-9 h-5 rounded-full relative transition-colors duration-150 flex-shrink-0 ${t.value ? "bg-brand-500" : "bg-ink-700"}`}
                  aria-label={t.label} aria-pressed={t.value}>
                  <span className="absolute w-3.5 h-3.5 bg-ink-950 rounded-full transition-all duration-150" style={{ left: t.value ? "18px" : "3px", top: "3px" }} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-2xs text-ink-500 mt-3">As mudanças só valem depois de “Salvar configurações”.</p>
        </div>

        <button onClick={saveSettings} disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-sm font-bold mb-6 bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
          <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-device-floppy"} aria-hidden="true" />
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>

        <div className="rounded-lg p-4 border border-coral-500/40 bg-ink-900">
          <p className="text-xs font-bold uppercase tracking-widest font-condensed text-coral-500 mb-3">Zona de risco</p>

          {status !== "closed" && (
            <button onClick={() => toggleStatus("closed")} disabled={saving}
              className="w-full flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold mb-2 border border-coral-500/40 bg-ink-950 text-coral-500 hover:bg-coral-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              <i className="ti ti-lock" aria-hidden="true" /> Encerrar pesquisa
            </button>
          )}

          <button onClick={deleteResearch} disabled={deleting}
            className={`w-full flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold border transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmDelete
                ? "bg-coral-500 text-on-accent border-coral-500 hover:bg-coral-600 hover:border-coral-600"
                : "border-coral-500/40 bg-ink-950 text-coral-500 hover:bg-coral-50"
            }`}>
            <i className={deleting ? "ti ti-loader-2 animate-spin" : "ti ti-trash"} aria-hidden="true" />
            {deleting ? "Excluindo..." : confirmDelete ? "Confirmar exclusão — clique de novo" : "Excluir pesquisa"}
          </button>
          {confirmDelete && (
            <p className="text-2xs mt-2 text-ink-300">
              A pesquisa some das suas listas, mas os dados não são apagados de verdade (poderemos restaurar se pedir).{" "}
              <button onClick={() => setConfirmDelete(false)} className="underline text-ink-100">Cancelar</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
