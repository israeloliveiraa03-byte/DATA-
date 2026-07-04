"use client";

import { useState } from "react";
import { toast } from "sonner";

const BRD = "1px solid #e8d8be";
const TS  = { color: "#c48a42", fontSize: "9px" } as const;

interface Ticket {
  id: string; subject: string; message: string;
  status: string; response: string | null;
  createdAt: Date; respondedAt: Date | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  open:     { label: "Aberto",     color: "#7a5218", bg: "#fbf3e7" },
  answered: { label: "Respondido", color: "#3a5430", bg: "#eaf0e4" },
  closed:   { label: "Encerrado",  color: "#5c3f13", bg: "#f3e4cb" },
};

export function SuporteClient({ tickets }: { tickets: Ticket[] }) {
  const [list, setList] = useState(tickets);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!subject.trim() || !message.trim()) { toast.error("Preencha assunto e mensagem."); return; }
    setSending(true);
    try {
      const res = await fetch("/api/suporte", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Erro ao enviar chamado."); return; }
      setList(prev => [json.data, ...prev]);
      setSubject(""); setMessage("");
      toast.success("Chamado enviado — respondemos por aqui.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#fbf3e7" }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold mb-6" style={{ color: "#0f172a" }}>Suporte</h1>

        <div className="rounded-xl p-4 mb-6" style={{ border: BRD, background: "#fff" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={TS}>Novo chamado</p>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "#5c3f13" }}>Assunto</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm rounded-md mb-3 focus:outline-none"
            style={{ border: BRD, background: "#fff", color: "#111" }} />
          <label className="text-xs font-semibold mb-1 block" style={{ color: "#5c3f13" }}>Mensagem</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
            className="w-full px-2.5 py-1.5 text-sm rounded-md mb-3 focus:outline-none"
            style={{ border: BRD, background: "#fff", color: "#111", resize: "vertical" }} />
          <button onClick={submit} disabled={sending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold disabled:opacity-50"
            style={{ background: "#c48a42", color: "#fff" }}>
            <i className={sending ? "ti ti-loader-2 animate-spin" : "ti ti-send"} /> Enviar chamado
          </button>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={TS}>Seus chamados</p>
        {list.length === 0 && <p className="text-sm" style={{ color: "#a06d28" }}>Nenhum chamado ainda.</p>}
        <div className="flex flex-col gap-3">
          {list.map(t => {
            const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.open;
            return (
              <div key={t.id} className="rounded-xl p-4" style={{ border: BRD, background: "#fff" }}>
                <div className="flex items-start justify-between mb-1.5">
                  <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{t.subject}</p>
                  <span className="text-2xs font-bold uppercase px-2 py-1 rounded-full flex-shrink-0" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                </div>
                <p className="text-xs mb-2" style={{ color: "#5c3f13" }}>{t.message}</p>
                {t.response && (
                  <div className="mt-2 pt-2" style={{ borderTop: BRD }}>
                    <p className="text-2xs font-bold uppercase mb-1" style={{ color: "#4c6b3c" }}>Resposta</p>
                    <p className="text-xs" style={{ color: "#3a5430" }}>{t.response}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
