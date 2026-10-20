"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Research } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ResearchStatusBadge } from "@/components/ui/badge";
import { fieldClasses } from "@/components/ui/input";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page";
import { ResearchCover } from "@/components/researches/research-cover";

const THEME_MAP: Record<string, string> = {
  health:      "Saúde",
  education:   "Educação",
  environment: "Meio ambiente",
  culture:     "Cultura",
  economy:     "Economia",
  governance:  "Governança",
  territory:   "Território",
  other:       "Outro",
};

const STATUS_FILTERS = [
  { key: "all",       label: "Todas" },
  { key: "active",    label: "Em coleta" },
  { key: "draft",     label: "Rascunhos" },
  { key: "paused",    label: "Pausadas" },
  { key: "published", label: "Publicadas" },
  { key: "closed",    label: "Encerradas" },
];

const ROLE_LABEL: Record<string, string> = { editor: "Convidado · editor", viewer: "Convidado · leitura" };

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

interface Props {
  researches: Research[];
  roleByResearchId?: Record<string, "owner" | "editor" | "viewer">;
}

export function ResearchesClient({ researches, roleByResearchId = {} }: Props) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [themeFilter,  setThemeFilter]  = useState("all");
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return researches.filter(r => {
      const matchSearch = !q || r.title.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q) || (r.cityName ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchTheme  = themeFilter  === "all" || r.theme  === themeFilter;
      return matchSearch && matchStatus && matchTheme;
    });
  }, [researches, search, statusFilter, themeFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: researches.length };
    researches.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [researches]);

  const hasFilters = !!search || statusFilter !== "all" || themeFilter !== "all";

  return (
    <PageContainer>
      <PageHeader
        kicker="Seu acervo"
        title="Pesquisas"
        description={`${researches.length} ${researches.length === 1 ? "pesquisa" : "pesquisas"} — cada uma com equipe, instrumento, coleta e painéis próprios.`}
        actions={
          <Link href="/researches/new" className={buttonClasses("primary", "md")}>
            <i className="ti ti-plus" aria-hidden="true" /> Nova pesquisa
          </Link>
        }
      />

      {researches.length === 0 ? (
        <EmptyState
          icon="ti-clipboard-plus"
          title="Nenhuma pesquisa ainda"
          description="Crie a primeira pesquisa para montar o instrumento, organizar a equipe de campo e publicar resultados."
          action={<Link href="/researches/new" className={buttonClasses("primary", "md")}><i className="ti ti-plus" aria-hidden="true" /> Criar pesquisa</Link>}
        />
      ) : (
        <>
          {/* Barra de filtros */}
          <div className="mb-6 rounded-xl border border-ink-700 bg-ink-900 shadow-xs">
            <div className="flex gap-1 overflow-x-auto px-2 pt-2 border-b border-ink-700" role="tablist" aria-label="Filtrar por situação">
              {STATUS_FILTERS.map(f => {
                const active = statusFilter === f.key;
                const n = counts[f.key] ?? 0;
                if (f.key !== "all" && n === 0) return null;
                return (
                  <button key={f.key} role="tab" aria-selected={active} onClick={() => setStatusFilter(f.key)}
                    className={cn(
                      "relative flex items-center gap-2 whitespace-nowrap px-3 pb-2.5 pt-1.5 text-sm font-medium transition-colors",
                      active ? "text-ink-50" : "text-ink-500 hover:text-ink-100",
                    )}>
                    {f.label}
                    <span className={cn("rounded-full px-1.5 text-2xs font-semibold tabular", active ? "bg-brand-500 text-on-accent" : "bg-ink-800 text-ink-500")}>{n}</span>
                    {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 p-3">
              <div className="relative flex-1">
                <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" aria-hidden="true" />
                <input value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar pesquisas"
                  placeholder="Buscar por título, descrição ou município"
                  className={cn(fieldClasses, "pl-9")} />
              </div>
              <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} aria-label="Filtrar por tema" className={cn(fieldClasses, "sm:w-48")}>
                <option value="all">Todos os temas</option>
                {Object.entries(THEME_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div className="flex rounded-md border border-ink-700 p-0.5 bg-ink-800/50 self-start sm:self-auto" role="group" aria-label="Modo de exibição">
                {([["grid", "ti-layout-grid", "Cartões"], ["list", "ti-list-details", "Tabela"]] as const).map(([mode, icon, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)} aria-pressed={viewMode === mode} title={label}
                    className={cn("h-8 w-9 rounded flex items-center justify-center transition-colors", viewMode === mode ? "bg-ink-900 text-brand-500 shadow-xs" : "text-ink-500 hover:text-ink-100")}>
                    <i className={cn("ti", icon)} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="ti-search-off" title="Nenhum resultado"
              description="Ajuste a busca ou os filtros para encontrar a pesquisa."
              action={hasFilters && <button onClick={() => { setSearch(""); setStatusFilter("all"); setThemeFilter("all"); }} className={buttonClasses("secondary", "sm")}>Limpar filtros</button>} />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 list-gap">
              {filtered.map(r => {
                const role = roleByResearchId[r.id];
                return (
                  <Link key={r.id} href={`/researches/${r.id}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-ink-600 hover:shadow-md">
                    <ResearchCover id={r.id} theme={r.theme} image={r.coverImage} className="h-28 border-b border-ink-700" />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        <ResearchStatusBadge status={r.status} />
                        <span className="text-2xs font-medium text-ink-500">{THEME_MAP[r.theme] ?? "Outro"}</span>
                      </div>
                      <h3 className="font-serif text-lg font-semibold leading-snug text-ink-50 line-clamp-2 group-hover:text-brand-400 transition-colors">{r.title}</h3>
                      {r.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-300 line-clamp-2">{r.description}</p>}
                      <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                        {r.cityName && <span className="inline-flex items-center gap-1"><i className="ti ti-map-pin text-xs" aria-hidden="true" />{r.cityName}</span>}
                        {role && role !== "owner" && <span className="inline-flex items-center gap-1"><i className="ti ti-users text-xs" aria-hidden="true" />{ROLE_LABEL[role]}</span>}
                        <span className="ml-auto inline-flex items-center gap-1"><i className="ti ti-clock text-xs" aria-hidden="true" />{formatDate(r.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-900 shadow-xs">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-ink-700 bg-ink-800/50 text-left">
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-500">Pesquisa</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-500">Situação</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-500">Tema</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-500">Local</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-500 text-right">Atualizada</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const role = roleByResearchId[r.id];
                    return (
                      <tr key={r.id} className="border-b border-ink-700 last:border-0 hover:bg-ink-800/50 transition-colors">
                        <td className="px-4 py-3 max-w-[22rem]">
                          <Link href={`/researches/${r.id}`} className="font-semibold text-ink-50 hover:text-brand-400 line-clamp-1">{r.title}</Link>
                          {role && role !== "owner" && <p className="text-xs text-ink-500 mt-0.5">{ROLE_LABEL[role]}</p>}
                        </td>
                        <td className="px-4 py-3"><ResearchStatusBadge status={r.status} /></td>
                        <td className="px-4 py-3 text-ink-300">{THEME_MAP[r.theme] ?? "Outro"}</td>
                        <td className="px-4 py-3 text-ink-300">{r.cityName ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-ink-500 whitespace-nowrap">{formatDate(r.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <p className="mt-6 text-center text-xs text-ink-500">Mostrando {filtered.length} de {researches.length} pesquisas</p>
          )}
        </>
      )}
    </PageContainer>
  );
}
