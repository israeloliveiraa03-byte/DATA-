"use client";

import { useState } from "react";
import { toast } from "sonner";

const BRD = "1px solid #e8d8be";

interface Ticket {
  id: string; subject: string; message: string;
  status: string; response: string | null;
  createdAt: Date;
  user: { name: string; email: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  open:     { label: "Aberto",     color: "#7a5218", bg: "#fbf3e7" },
  answered: { label: "Respondido", color: "#3a5430", bg: "#eaf0e4" },
  closed:   { label: "Encerrado",  color: "#5c3f13", bg: "#f3e4cb" },
};

export function SuporteAdminClient({ tickets }: { tickets: Ticket[] }) {
  const [list, setList] = useState(tickets);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function respond(id: string) {
    const response = drafts[id]?.trim();
    if (!response) { toast.error("Escreva uma resposta antes de enviar."); return; }
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/suporte/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) { toast.error("Erro ao responder."); return; }
      setList(prev => prev.map(t => t.id === id ? { ...t, response, status: "answered" } : t));
      toast.success("Resposta enviada.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSavingId(null);
    }
  }

  async function close(id: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/suporte/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (!res.ok) { toast.error("Erro ao encerrar."); return; }
      setList(prev => prev.map(t => t.id === id ? { ...t, status: "closed" } : t));
      toast.success("Chamado encerrado.");
    } finally {
      setSavingId(null);
    }
  }

  if (list.length === 0) return <p className="text-sm" style={{ color: "#a06d28" }}>Nenhum chamado de suporte ainda.</p>;

  return (
    <div className="flex flex-col gap-3">
      {list.map(t => {
        const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.open;
        return (
          <div key={t.id} className="rounded-xl p-4" style={{ border: BRD, background: "#fff" }}>
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{t.subject}</p>
                <p className="text-xs" style={{ color: "#a06d28" }}>{t.user?.name} · {t.user?.email}</p>
              </div>
              <span className="text-2xs font-bold uppercase px-2 py-1 rounded-full flex-shrink-0" style={{ color: s.color, background: s.bg }}>{s.label}</span>
            </div>
            <p className="text-xs mb-3" style={{ color: "#5c3f13" }}>{t.message}</p>

            {t.response && (
              <div className="mb-3 p-2 rounded-md" style={{ background: "#eaf0e4" }}>
                <p className="text-2xs font-bold uppercase mb-1" style={{ color: "#4c6b3c" }}>Resposta enviada</p>
                <p className="text-xs" style={{ color: "#3a5430" }}>{t.response}</p>
              </div>
            )}

            {t.status !== "closed" && (
              <>
                <textarea value={drafts[t.id] ?? ""} onChange={e => setDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                  rows={2} placeholder="Escrever resposta..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-md mb-2 focus:outline-none"
                  style={{ border: BRD, background: "#fff", color: "#111", resize: "vertical" }} />
                <div className="flex gap-2">
                  <button onClick={() => respond(t.id)} disabled={savingId === t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                    style={{ background: "#c48a42", color: "#fff" }}>
                    <i className="ti ti-send" /> Responder
                  </button>
                  <button onClick={() => close(t.id)} disabled={savingId === t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                    style={{ border: BRD, color: "#5c3f13" }}>
                    Encerrar sem responder
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
