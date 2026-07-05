"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Ticket {
  id: string; subject: string; message: string;
  status: string; response: string | null;
  createdAt: Date;
  user: { name: string; email: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; variant: "amber" | "teal" | "default" }> = {
  open:     { label: "Aberto",     variant: "amber"   },
  answered: { label: "Respondido", variant: "teal"    },
  closed:   { label: "Encerrado",  variant: "default" },
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
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSavingId(null);
    }
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-16 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
        <i className="ti ti-headset text-3xl block mb-3 text-ink-500" aria-hidden="true" />
        <p className="text-sm font-semibold text-ink-100 mb-1">Nenhum chamado de suporte ainda</p>
        <p className="text-xs text-ink-300">Quando alguém abrir um chamado em /suporte, ele aparece nesta fila.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map(t => {
        const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.open;
        const saving = savingId === t.id;
        return (
          <div key={t.id} className="rounded-lg p-4 border border-ink-700 bg-ink-900">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-100">{t.subject}</p>
                <p className="text-xs text-ink-300 truncate">{t.user?.name} · {t.user?.email}</p>
              </div>
              <Badge variant={s.variant} className="flex-shrink-0 uppercase text-2xs font-bold">{s.label}</Badge>
            </div>
            <p className="text-xs text-ink-300 mb-3 whitespace-pre-wrap">{t.message}</p>

            {t.response && (
              <div className="mb-3 p-2.5 rounded-md bg-ink-800 border border-ink-700">
                <p className="text-2xs font-bold uppercase mb-1 text-brand-400">Resposta enviada</p>
                <p className="text-xs text-ink-100 whitespace-pre-wrap">{t.response}</p>
              </div>
            )}

            {t.status !== "closed" && (
              <>
                <label htmlFor={`resposta-${t.id}`} className="sr-only">Resposta ao chamado “{t.subject}”</label>
                <textarea id={`resposta-${t.id}`} value={drafts[t.id] ?? ""}
                  onChange={e => setDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                  rows={2} placeholder="Escrever resposta..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-md mb-2 border border-ink-700 bg-ink-950 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => respond(t.id)} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-send"} aria-hidden="true" />
                    {saving ? "Enviando..." : "Responder"}
                  </button>
                  <button onClick={() => close(t.id)} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border border-ink-700 bg-ink-900 text-ink-300 hover:bg-ink-800 hover:text-ink-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
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
