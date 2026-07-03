"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Research } from "@/lib/types";

const CTA_CLASS = "inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold bg-brand-500 text-ink-950 border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150";

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: "Rascunho",  bg: "bg-ink-800",    text: "text-ink-300",   dot: "bg-ink-300" },
  active:    { label: "Ativa",     bg: "bg-brand-50",   text: "text-brand-700", dot: "bg-brand-500" },
  paused:    { label: "Pausada",   bg: "bg-amber-50",   text: "text-amber-500", dot: "bg-amber-500" },
  closed:    { label: "Encerrada", bg: "bg-coral-50",   text: "text-coral-500", dot: "bg-coral-500" },
  published: { label: "Publicada", bg: "bg-chart-1/15", text: "text-chart-1",   dot: "bg-chart-1" },
};

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

const PROGRESS_MAP: Record<string, number> = {
  draft: 20, active: 65, paused: 65, closed: 100, published: 100,
};

export function ResearchesClient({ researches }: { researches: Research[] }) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [themeFilter,  setThemeFilter]  = useState("all");
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    return researches.filter(r => {
      const matchSearch = !search.trim() ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchTheme  = themeFilter  === "all" || r.theme  === themeFilter;
      return matchSearch && matchStatus && matchTheme;
    });
  }, [researches, search, statusFilter, themeFilter]);

  // Contadores por status
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: researches.length };
    researches.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [researches]);

  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest font-condensed bg-ink-900 border border-ink-700 text-ink-300">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Minhas pesquisas
            </div>
            <h1 className="text-2xl font-bold font-condensed text-ink-100" style={{ letterSpacing: "-0.3px" }}>
              Pesquisas
            </h1>
            <p className="text-sm font-medium mt-0.5 text-ink-300">
              {researches.length} {researches.length === 1 ? "pesquisa" : "pesquisas"} no total
            </p>
          </div>
          <Link href="/researches/new" className={CTA_CLASS}>
            <i className="ti ti-plus" /> Nova pesquisa
          </Link>
        </div>

        {/* Filtros de status */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {[
            { key: "all",       label: "Todas"     },
            { key: "draft",     label: "Rascunho"  },
            { key: "active",    label: "Ativas"    },
            { key: "paused",    label: "Pausadas"  },
            { key: "published", label: "Publicadas"},
            { key: "closed",    label: "Encerradas"},
          ].map(f => {
            const active = statusFilter === f.key;
            return (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-condensed border transition-colors duration-150 ${
                  active
                    ? "border-brand-500 bg-brand-50/10 text-brand-400"
                    : "border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-500 hover:text-ink-100"
                }`}>
                {f.label}
                {counts[f.key] !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${active ? "bg-brand-500 text-ink-950" : "bg-ink-700 text-ink-300"}`}>
                    {counts[f.key] ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Busca e filtros secundários */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou descrição..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-ink-700 bg-ink-900 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors duration-150" />
          </div>

          {/* Filtro de tema */}
          <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-md border border-ink-700 bg-ink-900 text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="all">Todos os temas</option>
            {Object.entries(THEME_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Alternar view */}
          <div className="flex rounded-md overflow-hidden border border-ink-700">
            {[
              { mode: "grid", icon: "ti-layout-grid" },
              { mode: "list", icon: "ti-list" },
            ].map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode as "grid" | "list")}
                className={`px-3 py-2 transition-colors duration-150 ${viewMode === v.mode ? "bg-ink-800" : "bg-ink-900"} ${v.mode === "grid" ? "border-r border-ink-700" : ""}`}>
                <i className={`ti ${v.icon} text-sm ${viewMode === v.mode ? "text-brand-400" : "text-ink-500"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Resultado vazio */}
        {researches.length === 0 ? (
          <div className="text-center py-20 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
            <i className="ti ti-clipboard-list text-4xl block mb-3 text-ink-500" />
            <p className="text-sm font-semibold mb-1 text-ink-100">Nenhuma pesquisa ainda</p>
            <p className="text-xs mb-5 text-ink-300">Crie sua primeira pesquisa para começar a coletar dados</p>
            <Link href="/researches/new" className={CTA_CLASS}>
              <i className="ti ti-plus" /> Criar primeira pesquisa
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-lg border border-ink-700 bg-ink-900">
            <i className="ti ti-search text-3xl block mb-3 text-ink-500" />
            <p className="text-sm font-semibold mb-1 text-ink-100">Nenhum resultado encontrado</p>
            <p className="text-xs text-ink-300">Tente ajustar os filtros ou a busca</p>
          </div>
        ) : viewMode === "grid" ? (

          /* ── GRID ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => {
              const s = STATUS_MAP[r.status] ?? STATUS_MAP.draft;
              const progress = PROGRESS_MAP[r.status] ?? 20;
              return (
                <Link key={r.id} href={`/researches/${r.id}`}
                  className="block rounded-lg overflow-hidden border border-ink-700 bg-ink-900 transition-colors duration-150 hover:border-brand-500/40 group">

                  {/* Capa */}
                  <div className="h-28 w-full bg-ink-800 relative overflow-hidden">
                    {r.coverImage ? (
                      <img src={r.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className="ti ti-photo text-2xl text-ink-700" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Status + Tema */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-ink-800 border border-ink-700 text-ink-300">
                        {THEME_MAP[r.theme] ?? "Outro"}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className="text-sm font-bold mb-1 line-clamp-2 leading-snug font-condensed text-ink-100">
                      {r.title}
                    </h3>

                    {/* Descrição */}
                    {r.description && (
                      <p className="text-xs mb-3 line-clamp-2 leading-relaxed text-ink-300">
                        {r.description}
                      </p>
                    )}

                    {/* Localização */}
                    {r.cityName && (
                      <p className="text-xs flex items-center gap-1 mb-3 text-ink-300">
                        <i className="ti ti-map-pin text-xs text-brand-400" />
                        {r.cityName}
                      </p>
                    )}

                    {/* Barra de progresso */}
                    <div className="h-1 rounded-full overflow-hidden mb-2 bg-ink-700">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-ink-300">
                        {r.status === "draft"     ? "Em construção"    :
                         r.status === "active"    ? "Coletando dados"  :
                         r.status === "paused"    ? "Coleta pausada"   :
                         r.status === "published" ? "Dashboard público":
                         "Encerrada"}
                      </p>
                      <i className="ti ti-arrow-right text-xs text-brand-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

        ) : (

          /* ── LISTA ── */
          <div className="rounded-lg overflow-hidden border border-ink-700">
            {filtered.map((r, idx) => {
              const s = STATUS_MAP[r.status] ?? STATUS_MAP.draft;
              return (
                <Link key={r.id} href={`/researches/${r.id}`}
                  className={`flex items-center gap-4 px-4 py-3 bg-ink-900 hover:bg-ink-800 transition-colors duration-150 ${idx < filtered.length - 1 ? "border-b border-ink-700" : ""}`}>

                  {/* Status dot */}
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                  </div>

                  {/* Título e desc */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-ink-100">{r.title}</p>
                    {r.description && (
                      <p className="text-xs truncate mt-0.5 text-ink-300">{r.description}</p>
                    )}
                  </div>

                  {/* Tema */}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap hidden md:block bg-ink-800 border border-ink-700 text-ink-300">
                    {THEME_MAP[r.theme] ?? "Outro"}
                  </span>

                  {/* Status */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${s.bg} ${s.text}`}>
                    {s.label}
                  </span>

                  <i className="ti ti-chevron-right text-xs flex-shrink-0 text-brand-400" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Resumo */}
        {filtered.length > 0 && (
          <p className="text-center text-xs mt-6 font-medium text-ink-500">
            Mostrando {filtered.length} de {researches.length} pesquisas
          </p>
        )}
      </div>
    </div>
  );
}
