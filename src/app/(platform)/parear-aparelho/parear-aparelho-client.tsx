"use client";

import { useState } from "react";
import { toast } from "sonner";

const FIELD_CLASS = "w-full px-2.5 py-1.5 text-sm rounded-md border border-ink-700 bg-ink-950 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

export function ParearAparelhoClient() {
  const [label, setLabel]         = useState("");
  const [token, setToken]         = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/auth/device-token", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ label: label.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Erro ao gerar o código."); return; }
      setToken(json.data.token);
      setExpiresAt(json.data.expiresAt);
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Código copiado — cole no app Dataº Campo.");
    } catch {
      toast.error("Não foi possível copiar automaticamente — selecione e copie o texto.");
    }
  }

  return (
    <div className="min-h-full bg-ink-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-condensed text-ink-100">Parear aparelho de campo</h1>
          <p className="text-sm font-medium mt-0.5 text-ink-300">
            Gere um código de acesso pro app <strong>Dataº Campo</strong> — ele permite coletar
            respostas e pontos de GPS sem internet e sincronizar depois, sem precisar entrar
            com a conta Google dentro do app.
          </p>
        </div>

        {!token && (
          <div className="rounded-lg p-4 border border-ink-700 bg-ink-900">
            <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-3">Novo código</p>
            <label htmlFor="parear-label" className="text-xs font-semibold mb-1 block text-ink-100">
              Nome do aparelho (opcional)
            </label>
            <input id="parear-label" value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Ex.: celular do trabalho de campo"
              className={`${FIELD_CLASS} mb-3`} maxLength={200} />
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              <i className={generating ? "ti ti-loader-2 animate-spin" : "ti ti-device-mobile-plus"} aria-hidden="true" />
              {generating ? "Gerando..." : "Gerar código do aparelho"}
            </button>
          </div>
        )}

        {token && (
          <div className="rounded-lg p-4 border border-ink-700 bg-ink-900">
            <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-3">Código gerado</p>
            <p className="text-sm text-ink-300 mb-3">
              Copie o código abaixo e cole no app Dataº Campo, na tela de entrada.
              <strong className="text-amber-500"> Ele só aparece esta única vez</strong> — se perder,
              gere um código novo.
            </p>
            <div className="rounded-md border border-ink-700 bg-ink-950 px-3 py-2.5 mb-3">
              <code className="text-sm font-mono break-all text-teal-500">{token}</code>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={copy}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150">
                <i className="ti ti-copy" aria-hidden="true" /> Copiar código
              </button>
              <button onClick={() => { setToken(null); setExpiresAt(null); }}
                className="text-sm font-semibold text-ink-300 hover:text-ink-100 transition-colors duration-150">
                Gerar outro
              </button>
            </div>
            {expiresAt && (
              <p className="text-xs text-ink-500 mt-3">
                Válido até {new Date(expiresAt).toLocaleDateString("pt-BR")} — depois disso, basta parear de novo.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
