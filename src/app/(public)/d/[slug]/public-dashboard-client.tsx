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
  theme: string | null; coverUrl: string | null;
}

export function PublicDashboardClient({ slug }: { slug: string }) {
  const [dashboard, setDashboard] = useState<PublicDashboard | null>(null);
  const [error,     setError]     = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/dashboards/${slug}`);
        const json = await res.json();
        if (cancel) return;
        if (!res.ok) { setError(json.error ?? "Dashboard não encontrado"); return; }
        setDashboard(json.data);
      } catch {
        if (!cancel) setError("Erro de conexão");
      }
    })();
    return () => { cancel = true; };
  }, [slug]);

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

  return (
    <div className="min-h-screen relative" style={{ background: pageBg }}>
      {dashboard.coverUrl && (
        <>
          <div className="absolute inset-x-0 top-0 h-72 bg-cover bg-center" style={{ backgroundImage: `url(${dashboard.coverUrl})` }} />
          <div className="absolute inset-x-0 top-0 h-72" style={{ background: `linear-gradient(to bottom, transparent 40%, ${pageBg})` }} />
        </>
      )}

      <div className="relative max-w-[1400px] mx-auto px-6 pt-10 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#c48a42" }}>{dashboard.researchTitle}</p>
        <h1 className="text-3xl font-bold mb-1.5" style={{ color: textPrimary, fontFamily: "var(--font-serif), Georgia, serif" }}>{dashboard.title}</h1>
        {dashboard.description && <p className="text-sm mb-6 max-w-2xl" style={{ color: textMuted }}>{dashboard.description}</p>}

        {dashboard.showAds && (
          <div className="rounded-lg p-3 mb-6 text-center text-xs" style={{ border: `1px dashed ${cardBorder}`, background: cardBg, color: textMuted }}>
            Espaço publicitário — reservado pelo pesquisador para manter este dashboard gratuito
          </div>
        )}

        {dashboard.widgets.length === 0 ? (
          <p className="text-sm py-16 text-center" style={{ color: textMuted }}>Este dashboard ainda não tem widgets.</p>
        ) : (
          <div className="relative rounded-xl" style={{ height: totalHeightPx, background: cardBg, border: `1px solid ${cardBorder}` }}>
            {dashboard.widgets.map(w => (
              <div key={w.id} className="absolute rounded-lg"
                style={{
                  left: `${w.x}%`, top: w.y,
                  width: `${w.w}%`, height: w.h,
                  border: `1px solid ${cardBorder}`,
                }}>
                <WidgetRenderer type={w.type} title={w.title} data={w.data} config={w.config} />
              </div>
            ))}
          </div>
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
