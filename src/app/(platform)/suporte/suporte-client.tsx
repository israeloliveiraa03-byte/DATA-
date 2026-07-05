"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Ticket {
  id: string; subject: string; message: string;
  status: string; response: string | null;
  createdAt: Date; respondedAt: Date | null;
}

const STATUS_LABEL: Record<string, { label: string; variant: "amber" | "teal" | "default" }> = {
  open:     { label: "Aberto",     variant: "amber"   },
  answered: { label: "Respondido", variant: "teal"    },
  closed:   { label: "Encerrado",  variant: "default" },
};

const FIELD_CLASS = "w-full px-2.5 py-1.5 text-sm rounded-md mb-3 border border-ink-700 bg-ink-950 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

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
    <div className="min-h-full bg-ink-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-condensed text-ink-100">Suporte</h1>
          <p className="text-sm font-medium mt-0.5 text-ink-300">
            Abra um chamado e acompanhe a resposta da equipe por aqui mesmo.
          </p>
        </div>

        <div className="rounded-lg p-4 mb-6 border border-ink-700 bg-ink-900">
          <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-3">Novo chamado</p>
          <label htmlFor="suporte-assunto" className="text-xs font-semibold mb-1 block text-ink-100">Assunto</label>
          <input id="suporte-assunto" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Ex.: dúvida sobre coleta offline"
            className={FIELD_CLASS} />
          <label htmlFor="suporte-mensagem" className="text-xs font-semibold mb-1 block text-ink-100">Mensagem</label>
          <textarea id="suporte-mensagem" value={message} onChange={e => setMessage(e.target.value)} rows={4}
            placeholder="Descreva o que aconteceu ou o que você precisa"
            className={`${FIELD_CLASS} resize-y`} />
          <button onClick={submit} disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
            <i className={sending ? "ti ti-loader-2 animate-spin" : "ti ti-send"} aria-hidden="true" />
            {sending ? "Enviando..." : "Enviar chamado"}
          </button>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-3">Seus chamados</p>
        {list.length === 0 && (
          <div className="text-center py-10 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
            <i className="ti ti-message-circle text-3xl block mb-2 text-ink-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink-100 mb-1">Nenhum chamado ainda</p>
            <p className="text-xs text-ink-300">Use o formulário acima para enviar o primeiro — a resposta aparece nesta lista.</p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {list.map(t => {
            const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.open;
            return (
              <div key={t.id} className="rounded-lg p-4 border border-ink-700 bg-ink-900">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-ink-100">{t.subject}</p>
                  <Badge variant={s.variant} className="flex-shrink-0 uppercase text-2xs font-bold">{s.label}</Badge>
                </div>
                <p className="text-xs text-ink-300 mb-2 whitespace-pre-wrap">{t.message}</p>
                {t.response ? (
                  <div className="mt-2 pt-2 border-t border-ink-700">
                    <p className="text-2xs font-bold uppercase mb-1 text-brand-400">Resposta</p>
                    <p className="text-xs text-ink-100 whitespace-pre-wrap">{t.response}</p>
                  </div>
                ) : t.status === "open" ? (
                  <p className="text-2xs text-ink-500 mt-1">Aguardando resposta da equipe — você será respondido aqui.</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
