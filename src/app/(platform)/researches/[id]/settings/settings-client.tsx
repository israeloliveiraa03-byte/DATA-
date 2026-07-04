"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { Research } from "@/lib/types";

const BRD = "1px solid #e8d8be";
const TS  = { color: "#c48a42", fontSize: "9px" } as const;

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
    <div className="min-h-screen" style={{ background: "#fbf3e7" }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-xs mb-5" style={{ color: "#a06d28" }}>
          <Link href={`/researches/${research.id}`} className="hover:underline" style={{ color: "#c48a42" }}>{research.title}</Link>
          <i className="ti ti-chevron-right text-xs" />
          <span style={{ color: "#5c3f13" }}>Configurações</span>
        </div>

        <h1 className="text-xl font-bold mb-6" style={{ color: "#0f172a" }}>Configurações da pesquisa</h1>

        <div className="rounded-xl p-4 mb-4" style={{ border: BRD, background: "#fff" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={TS}>Identificação</p>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "#5c3f13" }}>Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm rounded-md mb-3 focus:outline-none"
            style={{ border: BRD, background: "#fff", color: "#111" }} />
          <label className="text-xs font-semibold mb-1 block" style={{ color: "#5c3f13" }}>Descrição</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full px-2.5 py-1.5 text-sm rounded-md focus:outline-none"
            style={{ border: BRD, background: "#fff", color: "#111", resize: "vertical" }} />
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ border: BRD, background: "#fff" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={TS}>Configurações de coleta</p>
          <div className="flex flex-col gap-3">
            {toggles.map(t => (
              <div key={t.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className={`ti ${t.icon} text-sm`} style={{ color: "#c48a42" }} />
                  <span className="text-sm font-medium" style={{ color: "#5c3f13" }}>{t.label}</span>
                </div>
                <button type="button" onClick={() => t.set(!t.value)}
                  className="w-9 h-5 rounded-full relative transition-colors"
                  style={{ background: t.value ? "#c48a42" : "#e8d8be" }}
                  aria-label={t.label} aria-pressed={t.value}>
                  <span className="absolute w-3.5 h-3.5 bg-white rounded-full top-0.75 transition-all" style={{ left: t.value ? "18px" : "3px", top: "3px" }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={saveSettings} disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-bold mb-6 disabled:opacity-50"
          style={{ background: "#c48a42", color: "#fff" }}>
          <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-device-floppy"} />
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>

        <div className="rounded-xl p-4" style={{ border: "1px solid #f0d0cc", background: "#fdf8f7" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#c0392b", fontSize: "9px" }}>Zona de risco</p>

          {status !== "closed" && (
            <button onClick={() => toggleStatus("closed")} disabled={saving}
              className="w-full flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold mb-2 disabled:opacity-50"
              style={{ border: "1px solid #f0d0cc", background: "#fff", color: "#c0392b" }}>
              <i className="ti ti-lock" /> Encerrar pesquisa
            </button>
          )}

          <button onClick={deleteResearch} disabled={deleting}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold disabled:opacity-50"
            style={{ border: "1px solid #f0d0cc", background: confirmDelete ? "#c0392b" : "#fff", color: confirmDelete ? "#fff" : "#c0392b" }}>
            <i className={deleting ? "ti ti-loader-2 animate-spin" : "ti ti-trash"} />
            {confirmDelete ? "Confirmar exclusão — clique de novo" : "Excluir pesquisa"}
          </button>
          {confirmDelete && (
            <p className="text-2xs mt-2" style={{ color: "#a06d28" }}>
              A pesquisa some das suas listas, mas os dados não são apagados de verdade (poderemos restaurar se pedir).{" "}
              <button onClick={() => setConfirmDelete(false)} className="underline">Cancelar</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
