"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

const STATUS_LABEL: Record<string, { label: string; variant: "amber" | "teal" | "red" }> = {
  pending:  { label: "Pendente",  variant: "amber" },
  approved: { label: "Aprovada",  variant: "teal"  },
  rejected: { label: "Rejeitada", variant: "red"   },
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
    return (
      <div className="text-center py-16 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
        <i className="ti ti-map text-3xl block mb-3 text-ink-500" aria-hidden="true" />
        <p className="text-sm font-semibold text-ink-100 mb-1">Nenhuma candidatura ao Dataº Território ainda</p>
        <p className="text-xs text-ink-300">As candidaturas enviadas pela página pública /territorio aparecem aqui para revisão.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map(app => {
        const s = STATUS_LABEL[app.status] ?? STATUS_LABEL.pending;
        const saving = savingId === app.id;
        return (
          <div key={app.id} className="rounded-lg p-4 border border-ink-700 bg-ink-900">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-100">{app.razaoSocial}</p>
                <p className="text-xs text-ink-300">{app.tipoComunidade} · {app.municipio}/{app.estado} · CNPJ {app.cnpj}</p>
              </div>
              <Badge variant={s.variant} className="flex-shrink-0 uppercase text-2xs font-bold">{s.label}</Badge>
            </div>
            <p className="text-xs text-ink-300 mb-2">
              Responsável: {app.nomeResponsavel} · {app.emailResponsavel} · Conta: {app.applicant?.name} ({app.applicant?.email})
            </p>
            <p className="text-xs text-ink-300 mb-3 line-clamp-3">{app.historico}</p>
            {app.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => review(app.id, "approved")} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                  <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-check"} aria-hidden="true" />
                  {saving ? "Atualizando..." : "Aprovar"}
                </button>
                <button onClick={() => review(app.id, "rejected")} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border border-coral-500/40 bg-ink-900 text-coral-500 hover:bg-coral-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                  <i className="ti ti-x" aria-hidden="true" /> Rejeitar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
