"use client";

import { useState } from "react";
import { toast } from "sonner";

const BRD = "1px solid #e8d8be";

interface Application {
  id: string;
  razaoSocial: string;
  cnpj: string;
  tipoComunidade: string;
  municipio: string;
  estado: string;
  nomeResponsavel: string;
  emailResponsavel: string;
  historico: string;
  status: string;
  createdAt: Date;
  applicant: { name: string; email: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "Pendente",  color: "#7a5218", bg: "#fbf3e7" },
  approved: { label: "Aprovada",  color: "#3a5430", bg: "#eaf0e4" },
  rejected: { label: "Rejeitada", color: "#8b2a1a", bg: "#fdf0ef" },
};

export function TerritorioAdminClient({ applications }: { applications: Application[] }) {
  const [list, setList] = useState(applications);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function review(id: string, status: "approved" | "rejected") {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/territorio/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Erro ao atualizar candidatura."); return; }
      setList(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast.success(status === "approved" ? "Candidatura aprovada — acesso institucional liberado." : "Candidatura rejeitada.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSavingId(null);
    }
  }

  if (list.length === 0) {
    return <p className="text-sm" style={{ color: "#a06d28" }}>Nenhuma candidatura ao Dataº Território ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map(app => {
        const s = STATUS_LABEL[app.status] ?? STATUS_LABEL.pending;
        return (
          <div key={app.id} className="rounded-xl p-4" style={{ border: BRD, background: "#fff" }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{app.razaoSocial}</p>
                <p className="text-xs" style={{ color: "#a06d28" }}>{app.tipoComunidade} · {app.municipio}/{app.estado} · CNPJ {app.cnpj}</p>
              </div>
              <span className="text-2xs font-bold uppercase px-2 py-1 rounded-full" style={{ color: s.color, background: s.bg }}>{s.label}</span>
            </div>
            <p className="text-xs mb-2" style={{ color: "#5c3f13" }}>
              Responsável: {app.nomeResponsavel} · {app.emailResponsavel} · Conta: {app.applicant?.name} ({app.applicant?.email})
            </p>
            <p className="text-xs mb-3 line-clamp-3" style={{ color: "#5c3f13" }}>{app.historico}</p>
            {app.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => review(app.id, "approved")} disabled={savingId === app.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                  style={{ background: "#4c6b3c", color: "#fff" }}>
                  <i className="ti ti-check" /> Aprovar
                </button>
                <button onClick={() => review(app.id, "rejected")} disabled={savingId === app.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                  style={{ border: "1px solid #f0d0cc", color: "#c0392b" }}>
                  <i className="ti ti-x" /> Rejeitar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
