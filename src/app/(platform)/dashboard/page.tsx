import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getMyResearches } from "@/lib/researches/access";
import Link from "next/link";
import { ResearchStatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dashboard" };

const CTA_CLASS = "inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150";
const ROLE_LABEL: Record<string, string> = { editor: "Convidado (editor)", viewer: "Convidado (visualizador)" };

export default async function DashboardPage() {
  const session = await auth();
  const mine = await getMyResearches(session!.user!.id!);
  const roleByResearchId = Object.fromEntries(mine.map(m => [m.research.id, m.role]));
  const myResearches = mine.map(m => m.research);

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
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-7">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest font-condensed bg-ink-900 border border-ink-700 text-ink-300">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-brand-500" />
              Painel de controle
            </div>
            <h1 className="font-condensed font-bold text-2xl text-ink-100" style={{ letterSpacing: "-0.3px" }}>
              Olá, {firstName} 👋
            </h1>
            <p className="text-sm font-medium mt-0.5 text-ink-300">
              Gerencie suas pesquisas e visualize resultados.
            </p>
          </div>

          <Link href="/researches/new" className={CTA_CLASS}>
            <i className="ti ti-plus" aria-hidden="true" />
            Nova pesquisa
          </Link>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-lg p-4 border border-ink-700 bg-ink-900">
              <div className="flex items-center justify-between mb-2">
                <i className={`ti ${stat.icon} text-base text-brand-400`} aria-hidden="true" />
              </div>
              <p className="font-condensed font-bold text-2xl text-ink-100">
                {stat.val}
              </p>
              <p className="text-xs font-semibold mt-0.5 text-ink-300">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Pesquisas recentes */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-brand-500" />
            <h2 className="font-bold uppercase tracking-widest font-condensed text-ink-300" style={{ fontSize: "10px" }}>
              Pesquisas recentes
            </h2>
          </div>
          <Link href="/researches" className="text-xs font-semibold text-brand-400 hover:underline">
            Ver todas →
          </Link>
        </div>

        {myResearches.length === 0 ? (
          <div className="text-center py-16 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
            <i className="ti ti-clipboard-list text-3xl block mb-3 text-ink-500" aria-hidden="true" />
            <p className="text-sm font-semibold mb-1 text-ink-100">Nenhuma pesquisa ainda</p>
            <p className="text-xs mb-5 text-ink-300">Crie sua primeira pesquisa para começar a coletar dados</p>
            <Link href="/researches/new" className={CTA_CLASS}>
              <i className="ti ti-plus" aria-hidden="true" /> Criar primeira pesquisa
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myResearches.slice(0, 6).map(r => (
              <Link
                key={r.id}
                href={`/researches/${r.id}`}
                className="block rounded-lg p-4 border border-ink-700 bg-ink-900 transition-colors duration-150 hover:border-brand-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate text-ink-100">{r.title}</p>
                      {roleByResearchId[r.id] !== "owner" && (
                        <span className="text-2xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap bg-teal-500/15 text-teal-500">
                          {ROLE_LABEL[roleByResearchId[r.id]]}
                        </span>
                      )}
                    </div>
                    {r.cityName && (
                      <p className="text-xs font-medium mt-0.5 flex items-center gap-1 text-ink-300">
                        <i className="ti ti-map-pin text-xs text-brand-400" aria-hidden="true" />
                        {r.cityName}
                      </p>
                    )}
                  </div>
                  <ResearchStatusBadge status={r.status} />
                </div>

                {/* Barra de progresso decorativa */}
                <div className="mt-3 h-1 rounded-full overflow-hidden bg-ink-700">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: progressMap[r.status] ?? "20%" }} />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs font-medium text-ink-300">
                    {statusCopy[r.status] ?? "Rascunho"}
                  </p>
                  <i className="ti ti-arrow-right text-xs text-brand-400" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Dica rápida */}
        <div className="mt-6 p-4 rounded-lg flex items-start gap-3 bg-ink-900 border border-brand-500/30">
          <i className="ti ti-bulb text-lg flex-shrink-0 mt-0.5 text-brand-400" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold mb-0.5 text-ink-100">Dica</p>
            <p className="text-xs font-medium leading-relaxed text-ink-300">
              Após criar uma pesquisa, adicione campos no construtor de formulários e compartilhe o link com seus respondentes.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
