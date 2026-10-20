import Link from "next/link";
import type { Research } from "@/lib/types";
import { ResearchStatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PageContainer, PageHeader, SectionHeader, StatGrid, EmptyState } from "@/components/ui/page";

const ROLE_LABEL: Record<string, string> = { editor: "Convidado · editor", viewer: "Convidado · leitura" };
const STATUS_COPY: Record<string, string> = {
  draft: "Instrumento em construção",
  active: "Coleta em andamento",
  paused: "Coleta pausada",
  closed: "Coleta encerrada",
  published: "Painel público no ar",
};
// Etapa do ciclo de vida da pesquisa (instrumento → coleta → publicação)
const STAGE: Record<string, number> = { draft: 0, active: 1, paused: 1, closed: 2, published: 2 };
const STAGES = ["Instrumento", "Coleta", "Publicação"];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardView({ firstName, researches: myResearches, roleByResearchId }: {
  firstName: string;
  researches: Research[];
  roleByResearchId: Record<string, string>;
}) {
  const count = (s: string) => myResearches.filter(r => r.status === s).length;
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <PageContainer>
      <PageHeader
        kicker={today}
        title={<>{greeting()}, {firstName}.</>}
        description="Acompanhe suas pesquisas do instrumento à publicação — e o conhecimento que elas produzem sobre cada território."
        actions={
          <>
            <Link href="/entidades" className={buttonClasses("secondary", "md")}>
              <i className="ti ti-database" aria-hidden="true" /> Catálogo de entidades
            </Link>
            <Link href="/researches/new" className={buttonClasses("primary", "md")}>
              <i className="ti ti-plus" aria-hidden="true" /> Nova pesquisa
            </Link>
          </>
        }
      />

      <StatGrid
        className="mb-10"
        items={[
          { label: "Pesquisas", value: myResearches.length, icon: "ti-clipboard-data", tone: "ink", note: "Próprias e compartilhadas" },
          { label: "Em coleta", value: count("active"), icon: "ti-broadcast", tone: "teal", note: "Recebendo respostas agora" },
          { label: "Rascunhos", value: count("draft"), icon: "ti-pencil", tone: "amber", note: "Instrumento em construção" },
          { label: "Publicadas", value: count("published"), icon: "ti-world", tone: "brand", note: "Com painel público" },
        ]}
      />

      <SectionHeader
        kicker="Seu trabalho"
        title="Pesquisas recentes"
        action={myResearches.length > 0 && (
          <Link href="/researches" className="text-sm font-semibold text-brand-400 hover:underline underline-offset-4 inline-flex items-center gap-1">
            Ver todas <i className="ti ti-arrow-right text-sm" aria-hidden="true" />
          </Link>
        )}
      />

      {myResearches.length === 0 ? (
        <EmptyState
          icon="ti-clipboard-plus"
          title="Comece pela primeira pesquisa"
          description="Crie o instrumento de coleta, convide a equipe de campo e publique um painel que se atualiza a cada resposta."
          action={
            <Link href="/researches/new" className={buttonClasses("primary", "md")}>
              <i className="ti ti-plus" aria-hidden="true" /> Criar pesquisa
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myResearches.slice(0, 6).map(r => {
            const stage = STAGE[r.status] ?? 0;
            const role = roleByResearchId[r.id];
            return (
              <Link
                key={r.id}
                href={`/researches/${r.id}`}
                className="group block rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-ink-600 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-lg font-semibold text-ink-50 leading-snug line-clamp-2 group-hover:text-brand-400 transition-colors">{r.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                      {r.cityName && (
                        <span className="inline-flex items-center gap-1"><i className="ti ti-map-pin text-xs" aria-hidden="true" />{r.cityName}</span>
                      )}
                      {role && role !== "owner" && (
                        <span className="inline-flex items-center gap-1"><i className="ti ti-users text-xs" aria-hidden="true" />{ROLE_LABEL[role]}</span>
                      )}
                    </div>
                  </div>
                  <ResearchStatusBadge status={r.status} />
                </div>

                {/* Ciclo de vida: instrumento → coleta → publicação */}
                <ol className="mt-5 grid grid-cols-3 gap-1.5" aria-label="Etapa da pesquisa">
                  {STAGES.map((s, i) => (
                    <li key={s}>
                      <div className={`h-1 rounded-full ${i <= stage ? "bg-brand-500" : "bg-ink-700"}`} />
                      <p className={`mt-1.5 text-2xs font-medium ${i === stage ? "text-ink-100" : "text-ink-500"}`}>{s}</p>
                    </li>
                  ))}
                </ol>

                <div className="mt-4 pt-3 border-t border-ink-700 flex items-center justify-between">
                  <p className="text-xs text-ink-300">{STATUS_COPY[r.status] ?? "Rascunho"}</p>
                  <i className="ti ti-arrow-right text-sm text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { icon: "ti-forms", title: "Monte o instrumento", text: "Mais de 30 tipos de campo, lógica condicional, georreferenciamento IBGE e coleta offline.", href: "/researches" },
          { icon: "ti-chart-dots-3", title: "Publique o painel", text: "Mapas coropléticos, cruzamentos e indicadores que se atualizam a cada resposta recebida.", href: "/researches" },
          { icon: "ti-map-2", title: "Conecte ao território", text: "Vincule respostas a entidades com identificador persistente e acompanhe o que já se sabe sobre cada lugar.", href: "/entidades" },
        ].map(t => (
          <Link key={t.title} href={t.href} className="group flex gap-4 rounded-xl border border-ink-700 bg-ink-800/40 p-5 hover:bg-ink-800 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-ink-900 border border-ink-700 flex items-center justify-center text-brand-500 flex-shrink-0">
              <i className={`ti ${t.icon} text-xl`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-50">{t.title}</p>
              <p className="mt-1 text-xs text-ink-300 leading-relaxed">{t.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
