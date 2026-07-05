"use client";

import { useEffect, useState } from "react";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { DataLogo } from "@/components/layout/data-logo";
import type { SupportedWidgetType, WidgetData } from "@/lib/dashboard/types";

interface PublicWidget {
  id: string; type: SupportedWidgetType; title: string | null;
  x: number; y: number; w: number; h: number; // x/w em %, y/h em px — grade livre
  config: Record<string, unknown>;
  data: WidgetData;
}

interface PublicDashboard {
  title: string; description: string | null; researchTitle: string;
  showAds: boolean; widgets: PublicWidget[];
  theme: string | null; coverUrl: string | null; colorPalette: string | null;
  canvasColor: string | null;
}

export function PublicDashboardClient({ slug }: { slug: string }) {
  const [dashboard, setDashboard] = useState<PublicDashboard | null>(null);
  const [error,     setError]     = useState("");
  // Filtro geral por data de resposta — uma linha só, acima de todos os
  // widgets, nunca por widget (ver anti-padrão "per-chart filters" evitado
  // aqui de propósito). O servidor já recorta as respostas ANTES de agregar
  // (rota pública nunca expõe resposta crua pro navegador de qualquer jeito).
  const [from, setFrom] = useState("");
  const [to,   setTo]   = useState("");
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    let cancel = false;
    const isRefetch = dashboard !== null;
    if (isRefetch) setRefetching(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to)   params.set("to", to);
    const qs = params.toString();
    (async () => {
      try {
        const res = await fetch(`/api/public/dashboards/${slug}${qs ? `?${qs}` : ""}`);
        const json = await res.json();
        if (cancel) return;
        if (!res.ok) { setError(json.error ?? "Dashboard não encontrado"); return; }
        setDashboard(json.data);
      } catch {
        if (!cancel) setError("Erro de conexão");
      } finally {
        if (!cancel) setRefetching(false);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, from, to]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fbf3e7" }}>
        <p className="text-sm" style={{ color: "#c0392b" }}>{error}</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fbf3e7" }}>
        <p className="text-sm" style={{ color: "#a06d28" }}>Carregando...</p>
      </div>
    );
  }

  const dark = dashboard.theme === "dark";
  const totalHeightPx = Math.max(300, dashboard.widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0) + 32);

  // A página é do pesquisador, não uma extensão do chrome do Dataº — o fundo
  // e o tom seguem o que ele escolheu (imagem de capa + claro/escuro),
  // nossa marca fica só no crédito discreto no canto.
  const pageBg = dark ? "#14140f" : "#f5f0e6";
  const textPrimary = dark ? "#e8e4d9" : "#1c1917";
  const textMuted = dark ? "#9c9884" : "#6b6350";
  const cardBg = dark ? "#1e1d17" : "#ffffff";
  const cardBorder = dark ? "#302e22" : "#ddd3bb";
  const canvasBg = dashboard.canvasColor ?? cardBg;
  const hasFilter = !!(from || to);

  return (
    <div className="min-h-screen relative" style={{ background: pageBg }}>
      {dashboard.coverUrl && (
        <>
          <div className="absolute inset-x-0 top-0 h-72 bg-cover bg-center" style={{ backgroundImage: `url(${dashboard.coverUrl})` }} />
          <div className="absolute inset-x-0 top-0 h-72" style={{ background: `linear-gradient(to bottom, transparent 40%, ${pageBg})` }} />
        </>
      )}

      <div className="relative max-w-[1400px] mx-auto px-6 pt-10 pb-20">
        {/* Título com mais presença visual — a marca d'água do pesquisador
            nesta página, não um rótulo pequeno entre outros elementos. */}
        <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: "#c48a42" }}>
          <span className="inline-block w-6 h-px" style={{ background: "#c48a42" }} />
          {dashboard.researchTitle}
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-2 leading-tight" style={{ color: textPrimary, fontFamily: "var(--font-serif), Georgia, serif" }}>
          {dashboard.title}
        </h1>
        {dashboard.description && <p className="text-sm mb-6 max-w-2xl" style={{ color: textMuted }}>{dashboard.description}</p>}

        {dashboard.showAds && (
          <div className="rounded-lg p-3 mb-6 text-center text-xs" style={{ border: `1px dashed ${cardBorder}`, background: cardBg, color: textMuted }}>
            Espaço publicitário — reservado pelo pesquisador para manter este dashboard gratuito
          </div>
        )}

        {dashboard.widgets.length === 0 ? (
          <p className="text-sm py-16 text-center" style={{ color: textMuted }}>Este dashboard ainda não tem widgets.</p>
        ) : (
          <>
            {/* Filtro geral — uma linha só, acima de tudo que ela afeta.
                Convive com o seletor de indicador que já existe dentro do
                mapa de calor (esse é específico de um widget só; este aqui
                é o filtro padrão, o mesmo recorte pra todo mundo). */}
            <div className="flex flex-wrap items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ border: `1px solid ${cardBorder}`, background: cardBg }}>
              <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide flex-shrink-0" style={{ color: textMuted }}>
                <i className="ti ti-filter" /> Filtrar por data
              </span>
              <label className="text-xs flex items-center gap-1.5" style={{ color: textPrimary }}>
                De
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="text-xs rounded px-2 py-1"
                  style={{ border: `1px solid ${cardBorder}`, background: dark ? "#14140f" : "#fff", color: textPrimary }} />
              </label>
              <label className="text-xs flex items-center gap-1.5" style={{ color: textPrimary }}>
                Até
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="text-xs rounded px-2 py-1"
                  style={{ border: `1px solid ${cardBorder}`, background: dark ? "#14140f" : "#fff", color: textPrimary }} />
              </label>
              {hasFilter && (
                <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs font-semibold flex items-center gap-1 flex-shrink-0" style={{ color: "#c0392b" }}>
                  <i className="ti ti-x" /> Limpar
                </button>
              )}
              {refetching && <i className="ti ti-loader-2 animate-spin text-xs ml-auto flex-shrink-0" style={{ color: textMuted }} />}
            </div>

            {/* Sem "esqueleto" de recarregamento: enquanto refiltra, o
                dashboard anterior fica visível em opacidade reduzida — nunca
                pisca ou salta de layout (mesma regra da skill de dataviz). */}
            <div className="relative rounded-xl transition-opacity duration-200" style={{ height: totalHeightPx, background: canvasBg, border: `1px solid ${cardBorder}`, opacity: refetching ? 0.6 : 1 }}>
              {dashboard.widgets.map(w => (
                <div key={w.id} className="absolute rounded-lg"
                  style={{
                    left: `${w.x}%`, top: w.y,
                    width: `${w.w}%`, height: w.h,
                    border: `1px solid ${cardBorder}`,
                  }}>
                  <WidgetRenderer type={w.type} title={w.title} data={w.data} config={w.config} palette={dashboard.colorPalette ?? undefined} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Crédito discreto — a página é do pesquisador, não chrome do Dataº */}
      <a href="https://datazero.vercel.app" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-2xs font-medium shadow-sm transition-opacity hover:opacity-100"
        style={{ background: dark ? "rgba(30,29,23,0.92)" : "rgba(255,255,255,0.92)", color: textMuted, border: `1px solid ${cardBorder}`, opacity: 0.85, backdropFilter: "blur(6px)" }}>
        Powered by <DataLogo className="text-xs" animated={false} />
      </a>
    </div>
  );
}
