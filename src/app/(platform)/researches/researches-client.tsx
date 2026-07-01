"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Research } from "@/lib/types";

const BRD = "1px solid #e8d8be";

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  draft:     { label: "Rascunho",  bg: "#fbf3e7", color: "#7a5218", dot: "#c48a42" },
  active:    { label: "Ativa",     bg: "#eaf0e4", color: "#3a5430", dot: "#4c6b3c" },
  paused:    { label: "Pausada",   bg: "#faeeda", color: "#854f0b", dot: "#ba7517" },
  closed:    { label: "Encerrada", bg: "#fdf0ef", color: "#8b2a1a", dot: "#c0392b" },
  published: { label: "Publicada", bg: "#e8f0fe", color: "#1041b2", dot: "#1a56db" },
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
    <div className="flex-1 overflow-auto" style={{ background: "#fff" }}>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest"
              style={{ background: "#fbf3e7", border: BRD, color: "#5c3f13" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c48a42" }} />
              Minhas pesquisas
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif", letterSpacing: "-0.4px" }}>
              Pesquisas
            </h1>
            <p className="text-sm font-medium mt-0.5" style={{ color: "#5c3f13" }}>
              {researches.length} {researches.length === 1 ? "pesquisa" : "pesquisas"} no total
            </p>
          </div>
          <Link href="/researches/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-bold"
            style={{ background: "#c48a42", color: "#fff", border: "1.5px solid #7a5218" }}>
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
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                border:     statusFilter === f.key ? "1.5px solid #c48a42" : BRD,
                background: statusFilter === f.key ? "#fbf3e7" : "#fbf3e7",
                color:      statusFilter === f.key ? "#7a5218" : "#5c3f13",
              }}>
              {f.label}
              {counts[f.key] !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: statusFilter === f.key ? "#c48a42" : "#e8d8be", color: statusFilter === f.key ? "#fff" : "#5c3f13" }}>
                  {counts[f.key] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Busca e filtros secundários */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#d9bb8c" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou descrição..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none"
              style={{ border: BRD, background: "#fff", color: "#111" }} />
          </div>

          {/* Filtro de tema */}
          <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border focus:outline-none"
            style={{ border: BRD, background: "#fff", color: "#5c3f13" }}>
            <option value="all">Todos os temas</option>
            {Object.entries(THEME_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Alternar view */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: BRD }}>
            {[
              { mode: "grid", icon: "ti-layout-grid" },
              { mode: "list", icon: "ti-list" },
            ].map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode as "grid" | "list")}
                className="px-3 py-2 transition-colors"
                style={{ background: viewMode === v.mode ? "#fbf3e7" : "#fff", borderRight: v.mode === "grid" ? BRD : "none" }}>
                <i className={`ti ${v.icon} text-sm`} style={{ color: viewMode === v.mode ? "#c48a42" : "#a06d28" }} />
              </button>
            ))}
          </div>
        </div>

        {/* Resultado vazio */}
        {researches.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ border: "2px dashed #d9bb8c", background: "#fbf3e7" }}>
            <i className="ti ti-clipboard-list text-4xl block mb-3" style={{ color: "#d9bb8c" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "#5c3f13" }}>Nenhuma pesquisa ainda</p>
            <p className="text-xs mb-5" style={{ color: "#a06d28" }}>Crie sua primeira pesquisa para começar a coletar dados</p>
            <Link href="/researches/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold"
              style={{ background: "#c48a42", color: "#fff" }}>
              <i className="ti ti-plus" /> Criar primeira pesquisa
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ border: BRD, background: "#fbf3e7" }}>
            <i className="ti ti-search text-3xl block mb-3" style={{ color: "#d9bb8c" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "#5c3f13" }}>Nenhum resultado encontrado</p>
            <p className="text-xs" style={{ color: "#a06d28" }}>Tente ajustar os filtros ou a busca</p>
          </div>
        ) : viewMode === "grid" ? (

          /* ── GRID ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => {
              const s = STATUS_MAP[r.status] ?? STATUS_MAP.draft;
              const progress = PROGRESS_MAP[r.status] ?? 20;
              return (
                <Link key={r.id} href={`/researches/${r.id}`}
                  className="block rounded-xl p-4 transition-all group"
                  style={{ border: BRD, background: "#fff" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#d2a05c"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(196,138,66,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e8d8be"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>

                  {/* Status + Tema */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: s.bg, color: s.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                      {s.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "#fbf3e7", border: BRD, color: "#5c3f13" }}>
                      {THEME_MAP[r.theme] ?? "Outro"}
                    </span>
                  </div>

                  {/* Título */}
                  <h3 className="text-sm font-bold mb-1 line-clamp-2 leading-snug" style={{ color: "#0f172a" }}>
                    {r.title}
                  </h3>

                  {/* Descrição */}
                  {r.description && (
                    <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: "#a06d28" }}>
                      {r.description}
                    </p>
                  )}

                  {/* Localização */}
                  {r.cityName && (
                    <p className="text-xs flex items-center gap-1 mb-3" style={{ color: "#a06d28" }}>
                      <i className="ti ti-map-pin text-xs" style={{ color: "#c48a42" }} />
                      {r.cityName}
                    </p>
                  )}

                  {/* Barra de progresso */}
                  <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "#f3e4cb" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "#c48a42" }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium" style={{ color: "#a06d28" }}>
                      {r.status === "draft"     ? "Em construção"    :
                       r.status === "active"    ? "Coletando dados"  :
                       r.status === "paused"    ? "Coleta pausada"   :
                       r.status === "published" ? "Dashboard público":
                       "Encerrada"}
                    </p>
                    <i className="ti ti-arrow-right text-xs transition-transform group-hover:translate-x-0.5" style={{ color: "#c48a42" }} />
                  </div>
                </Link>
              );
            })}
          </div>

        ) : (

          /* ── LISTA ── */
          <div className="rounded-xl overflow-hidden" style={{ border: BRD }}>
            {filtered.map((r, idx) => {
              const s = STATUS_MAP[r.status] ?? STATUS_MAP.draft;
              return (
                <Link key={r.id} href={`/researches/${r.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors"
                  style={{ borderBottom: idx < filtered.length - 1 ? BRD : "none", background: "#fff" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fbf3e7"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>

                  {/* Status dot */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: s.bg }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} />
                  </div>

                  {/* Título e desc */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "#0f172a" }}>{r.title}</p>
                    {r.description && (
                      <p className="text-xs truncate mt-0.5" style={{ color: "#a06d28" }}>{r.description}</p>
                    )}
                  </div>

                  {/* Tema */}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap hidden md:block"
                    style={{ background: "#fbf3e7", border: BRD, color: "#5c3f13" }}>
                    {THEME_MAP[r.theme] ?? "Outro"}
                  </span>

                  {/* Status */}
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
                    style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>

                  <i className="ti ti-chevron-right text-xs flex-shrink-0" style={{ color: "#c48a42" }} />
                </Link>
              );
            })}
          </div>
        )}

        {/* Resumo */}
        {filtered.length > 0 && (
          <p className="text-center text-xs mt-6 font-medium" style={{ color: "#d9bb8c" }}>
            Mostrando {filtered.length} de {researches.length} pesquisas
          </p>
        )}
      </div>
    </div>
  );
}
