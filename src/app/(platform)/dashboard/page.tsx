import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ResearchStatusBadge } from "@/components/ui/badge";

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

  const progressMap: Record<string, string> = { published: "100%", closed: "100%", active: "65%", paused: "40%", draft: "20%" };
  const statusCopy: Record<string, string> = { draft: "Em construção", active: "Coletando dados", paused: "Pausada", closed: "Encerrada", published: "Dashboard público" };

  const firstName = session?.user?.name?.split(" ")[0] ?? "pesquisador";

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest bg-brand-50 border border-brand-200 text-brand-700">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-brand-500" />
              Painel de controle
            </div>
            <h1 className="font-serif font-semibold text-2xl text-slate-900" style={{ letterSpacing: "-0.4px" }}>
              Olá, {firstName} 👋
            </h1>
            <p className="text-sm font-medium mt-0.5 text-slate-500">
              Gerencie suas pesquisas e visualize resultados.
            </p>
          </div>

          <Link
            href="/researches/new"
            className="btn-elevate inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <i className="ti ti-plus" aria-hidden="true" />
            Nova pesquisa
          </Link>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-xl p-4 border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <i className={`ti ${stat.icon} text-base text-brand-600`} aria-hidden="true" />
              </div>
              <p className="font-serif font-semibold text-2xl text-slate-900">
                {stat.val}
              </p>
              <p className="text-xs font-semibold mt-0.5 text-slate-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Pesquisas recentes */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-brand-500" />
            <h2 className="font-bold uppercase tracking-widest text-slate-500" style={{ fontSize: "10px" }}>
              Pesquisas recentes
            </h2>
          </div>
          <Link href="/researches" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Ver todas →
          </Link>
        </div>

        {myResearches.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
            <i className="ti ti-clipboard-list text-3xl block mb-3 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-semibold mb-1 text-slate-600">Nenhuma pesquisa ainda</p>
            <p className="text-xs mb-5 text-slate-400">Crie sua primeira pesquisa para começar a coletar dados</p>
            <Link
              href="/researches/new"
              className="btn-elevate inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700"
            >
              <i className="ti ti-plus" aria-hidden="true" /> Criar primeira pesquisa
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myResearches.map(r => (
              <Link
                key={r.id}
                href={`/researches/${r.id}`}
                className="block rounded-xl p-4 border border-slate-200 bg-white shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-brand-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate text-slate-900">{r.title}</p>
                    {r.cityName && (
                      <p className="text-xs font-medium mt-0.5 flex items-center gap-1 text-slate-500">
                        <i className="ti ti-map-pin text-xs text-brand-500" aria-hidden="true" />
                        {r.cityName}
                      </p>
                    )}
                  </div>
                  <ResearchStatusBadge status={r.status} />
                </div>

                {/* Barra de progresso decorativa */}
                <div className="mt-3 h-1 rounded-full overflow-hidden bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: progressMap[r.status] ?? "20%" }} />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs font-medium text-slate-500">
                    {statusCopy[r.status] ?? "Rascunho"}
                  </p>
                  <i className="ti ti-arrow-right text-xs text-brand-500" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Dica rápida */}
        <div className="mt-6 p-4 rounded-xl flex items-start gap-3 bg-brand-50 border border-brand-200">
          <i className="ti ti-bulb text-lg flex-shrink-0 mt-0.5 text-brand-600" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold mb-0.5 text-brand-800">Dica</p>
            <p className="text-xs font-medium leading-relaxed text-brand-700">
              Após criar uma pesquisa, adicione campos no construtor de formulários e compartilhe o link com seus respondentes.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
