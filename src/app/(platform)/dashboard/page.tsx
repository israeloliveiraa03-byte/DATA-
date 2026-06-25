import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const myResearches = await db.query.researches.findMany({
    where:   eq(researches.ownerId, session!.user!.id!),
    orderBy: desc(researches.createdAt),
    limit:   6,
  });

  const stats = [
    { val: myResearches.length,                                          label: "Total",      icon: "ti-clipboard-list" },
    { val: myResearches.filter(r => r.status === "active").length,    label: "Ativas",     icon: "ti-player-play"    },
    { val: myResearches.filter(r => r.status === "draft").length,     label: "Rascunhos",  icon: "ti-pencil"         },
    { val: myResearches.filter(r => r.status === "published").length, label: "Publicadas", icon: "ti-world"          },
  ];

  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
    draft:     { label: "Rascunho",  bg: "#fff8ec", color: "#7a3d00" },
    active:    { label: "Ativa",     bg: "#e1f5ee", color: "#0a6e45" },
    paused:    { label: "Pausada",   bg: "#faeeda", color: "#854f0b" },
    closed:    { label: "Encerrada", bg: "#fdf0ef", color: "#8b2a1a" },
    published: { label: "Publicada", bg: "#e8f0fe", color: "#1041b2" },
  };

  const firstName = session?.user?.name?.split(" ")[0] ?? "pesquisador";

  return (
    <div className="flex-1 overflow-auto" style={{ background: "#fff" }}>
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest"
              style={{ background: "#fff8ec", border: "1px solid #d4b880", color: "#5c4a2a" }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#b07d20" }} />
              Painel de controle
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0a1628", fontFamily: "Georgia, serif", letterSpacing: "-0.4px" }}>
              Olá, {firstName} 👋
            </h1>
            <p className="text-sm font-medium mt-0.5" style={{ color: "#5c4a2a" }}>
              Gerencie suas pesquisas e visualize resultados.
            </p>
          </div>

          <Link
            href="/researches/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-bold transition-colors"
            style={{ background: "#b07d20", color: "#fff", border: "1.5px solid #8b5e0a" }}
          >
            <i className="ti ti-plus" />
            Nova pesquisa
          </Link>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-lg p-4"
              style={{ background: "#faf6ef", border: "1px solid #e8d9c0" }}>
              <div className="flex items-center justify-between mb-2">
                <i className={`ti ${stat.icon} text-base`} style={{ color: "#b07d20" }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
                {stat.val}
              </p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: "#5c4a2a" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Pesquisas recentes */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "#b07d20" }} />
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "#5c4a2a", fontSize: "10px" }}>
              Pesquisas recentes
            </h2>
          </div>
          <Link href="/researches" className="text-xs font-semibold" style={{ color: "#b07d20" }}>
            Ver todas →
          </Link>
        </div>

        {myResearches.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ border: "2px dashed #d4b880", background: "#faf6ef" }}>
            <i className="ti ti-clipboard-list text-3xl block mb-3" style={{ color: "#d4b880" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "#5c4a2a" }}>Nenhuma pesquisa ainda</p>
            <p className="text-xs mb-5" style={{ color: "#8b7355" }}>Crie sua primeira pesquisa para começar a coletar dados</p>
            <Link
              href="/researches/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold"
              style={{ background: "#b07d20", color: "#fff" }}
            >
              <i className="ti ti-plus" /> Criar primeira pesquisa
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myResearches.map(r => {
              const s = statusMap[r.status] ?? statusMap.draft;
              return (
                <Link
                  key={r.id}
                  href={`/researches/${r.id}/form-builder`}
                  className="block rounded-xl p-4 transition-all"
                  style={{ border: "1px solid #e8d9c0", background: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#c4a35a")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8d9c0")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: "#0a1628" }}>{r.title}</p>
                      {r.cityName && (
                        <p className="text-xs font-medium mt-0.5 flex items-center gap-1" style={{ color: "#8b7355" }}>
                          <i className="ti ti-map-pin text-xs" style={{ color: "#b07d20" }} />
                          {r.cityName}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0"
                      style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </div>

                  {/* Barra de progresso decorativa */}
                  <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "#f0e8d8" }}>
                    <div className="h-full rounded-full" style={{ width: r.status === "published" ? "100%" : r.status === "active" ? "65%" : r.status === "closed" ? "100%" : "20%", background: "#b07d20" }} />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs font-medium" style={{ color: "#8b7355" }}>
                      {r.status === "draft" ? "Em construção" : r.status === "active" ? "Coletando dados" : r.status === "published" ? "Dashboard público" : "Encerrada"}
                    </p>
                    <i className="ti ti-arrow-right text-xs" style={{ color: "#b07d20" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Dica rápida */}
        <div className="mt-6 p-4 rounded-xl flex items-start gap-3"
          style={{ background: "#fff8ec", border: "1px solid #d4b880" }}>
          <i className="ti ti-bulb text-lg flex-shrink-0 mt-0.5" style={{ color: "#b07d20" }} />
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: "#5c4a2a" }}>Dica</p>
            <p className="text-xs font-medium leading-relaxed" style={{ color: "#7a5c20" }}>
              Após criar uma pesquisa, adicione campos no construtor de formulários e compartilhe o link com seus respondentes.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
