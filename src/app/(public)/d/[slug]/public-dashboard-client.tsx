"use client";

import { useEffect, useState } from "react";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { DataLogo } from "@/components/layout/data-logo";
import type { SupportedWidgetType, WidgetData } from "@/lib/dashboard/types";

const COLUMNS    = 12;
const ROW_HEIGHT = 32;

interface PublicWidget {
  id: string; type: SupportedWidgetType; title: string | null;
  col: number; row: number; width: number; height: number;
  config: Record<string, unknown>;
  data: WidgetData;
}

interface PublicDashboard {
  title: string; description: string | null; researchTitle: string;
  showAds: boolean; widgets: PublicWidget[];
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

  const totalHeightPx = Math.max(300, dashboard.widgets.reduce((m, w) => Math.max(m, (w.row + w.height) * ROW_HEIGHT), 0) + ROW_HEIGHT);

  return (
    <div className="min-h-screen" style={{ background: "#fbf3e7" }}>
      <header className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #e8d8be", background: "#fff" }}>
        <DataLogo />
        <span className="text-xs font-medium" style={{ color: "#a06d28" }}>Dashboard público</span>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#c48a42" }}>{dashboard.researchTitle}</p>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif" }}>{dashboard.title}</h1>
        {dashboard.description && <p className="text-sm mb-4" style={{ color: "#5c3f13" }}>{dashboard.description}</p>}

        {dashboard.showAds && (
          <div className="rounded-lg p-3 mb-4 text-center text-xs" style={{ border: "1px dashed #d9bb8c", background: "#fff", color: "#a06d28" }}>
            Espaço publicitário — reservado pelo pesquisador para manter este dashboard gratuito
          </div>
        )}

        {dashboard.widgets.length === 0 ? (
          <p className="text-sm py-16 text-center" style={{ color: "#a06d28" }}>Este dashboard ainda não tem widgets.</p>
        ) : (
          <div className="relative rounded-xl" style={{ height: totalHeightPx, background: "#fff", border: "1px solid #e8d8be" }}>
            {dashboard.widgets.map(w => (
              <div key={w.id} className="absolute rounded-lg"
                style={{
                  left: `${(w.col / COLUMNS) * 100}%`, top: w.row * ROW_HEIGHT,
                  width: `${(w.width / COLUMNS) * 100}%`, height: w.height * ROW_HEIGHT,
                  border: "1px solid #e8d8be",
                }}>
                <WidgetRenderer type={w.type} title={w.title} data={w.data} config={w.config} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
