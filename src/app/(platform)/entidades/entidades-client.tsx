"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Entity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { PageContainer, PageHeader, EmptyState, StatGrid } from "@/components/ui/page";

const TYPE_MAP: Record<string, { label: string; plural: string; icon: string }> = {
  territorio:            { label: "Território",            plural: "Territórios",             icon: "ti-map" },
  comunidade:            { label: "Comunidade",            plural: "Comunidades",             icon: "ti-users" },
  regiao_administrativa: { label: "Região administrativa", plural: "Regiões administrativas", icon: "ti-map-2" },
  escola:                { label: "Escola",                plural: "Escolas",                 icon: "ti-school" },
  associacao:            { label: "Associação",            plural: "Associações",             icon: "ti-building-community" },
  projeto:               { label: "Projeto",               plural: "Projetos",                icon: "ti-clipboard-list" },
  pessoa:                { label: "Pessoa",                plural: "Pessoas",                 icon: "ti-user" },
  documento:             { label: "Documento",             plural: "Documentos",              icon: "ti-file-text" },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Rascunho",  cls: "border-ink-700 bg-ink-800 text-ink-300" },
  published: { label: "Publicada", cls: "border-teal-500/25 bg-teal-50 text-teal-600" },
  archived:  { label: "Arquivada", cls: "border-amber-500/25 bg-amber-50 text-amber-600" },
};

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function EntidadesClient({ entities }: { entities: Entity[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [view, setView] = useState<"table" | "cards">("table");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    entities.forEach(e => { c[e.type] = (c[e.type] ?? 0) + 1; });
    return c;
  }, [entities]);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return entities.filter(e =>
      (type === "all" || e.type === type) &&
      (!nq || norm(`${e.name} ${e.code} ${e.cityName ?? ""} ${e.stateCode ?? ""}`).includes(nq)),
    );
  }, [entities, q, type]);

  const states = new Set(entities.map(e => e.stateCode).filter(Boolean)).size;
  const territorial = (counts.territorio ?? 0) + (counts.comunidade ?? 0);

  return (
    <PageContainer>
      <PageHeader
        kicker="Catálogo global"
        title="Entidades"
        description="Territórios, comunidades, escolas e organizações registrados uma única vez, com identificador persistente — o conhecimento produzido por pesquisas diferentes se acumula sobre cada um."
        actions={
          <Link href="/entidades/nova" className={buttonClasses("primary", "md")}>
            <i className="ti ti-plus" aria-hidden="true" /> Cadastrar entidade
          </Link>
        }
      />

      {entities.length === 0 ? (
        <EmptyState
          icon="ti-map-pin-plus"
          title="Nenhuma entidade ainda"
          description="Cadastre territórios, comunidades, escolas e outras entidades para que diferentes pesquisas somem conhecimento sobre cada uma."
          action={<Link href="/entidades/nova" className={buttonClasses("primary", "md")}><i className="ti ti-plus" aria-hidden="true" /> Cadastrar primeira entidade</Link>}
        />
      ) : (
        <>
          <StatGrid className="mb-8" items={[
            { label: "Entidades", value: entities.length, tone: "ink", icon: "ti-database" },
            { label: "Territórios e comunidades", value: territorial, tone: "brand", icon: "ti-map" },
            { label: "Escolas e organizações", value: (counts.escola ?? 0) + (counts.associacao ?? 0) + (counts.projeto ?? 0), tone: "teal", icon: "ti-school" },
            { label: "Unidades da federação", value: states, tone: "amber", icon: "ti-map-2" },
          ]} />

          <div className="mb-5 rounded-xl border border-ink-700 bg-ink-900 shadow-xs">
            <div className="flex gap-1.5 overflow-x-auto p-2 border-b border-ink-700" role="group" aria-label="Filtrar por tipo">
              {[["all", "Todas", "ti-list", entities.length] as const, ...Object.entries(TYPE_MAP).filter(([k]) => counts[k]).map(([k, v]) => [k, v.plural, v.icon, counts[k]] as const)].map(([k, label, icon, n]) => (
                <button key={k} onClick={() => setType(k)} aria-pressed={type === k}
                  className={cn(
                    "flex-shrink-0 inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium transition-colors",
                    type === k ? "bg-brand-50 text-brand-400" : "text-ink-300 hover:bg-ink-800 hover:text-ink-50",
                  )}>
                  <i className={cn("ti", icon, "text-base")} aria-hidden="true" /> {label}
                  <span className="text-2xs tabular text-ink-500">{n}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 p-3">
              <div className="relative flex-1">
                <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" aria-hidden="true" />
                <input value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar entidades"
                  placeholder="Buscar por nome, código (ex.: COM-000245) ou município" className={cn(fieldClasses, "pl-9")} />
              </div>
              <div className="flex rounded-md border border-ink-700 p-0.5 bg-ink-800/50 self-start sm:self-auto" role="group" aria-label="Modo de exibição">
                {([["table", "ti-list-details", "Tabela"], ["cards", "ti-layout-grid", "Cartões"]] as const).map(([m, icon, label]) => (
                  <button key={m} onClick={() => setView(m)} aria-pressed={view === m} title={label} aria-label={label}
                    className={cn("h-8 w-9 rounded flex items-center justify-center transition-colors", view === m ? "bg-ink-900 text-brand-500 shadow-xs" : "text-ink-500 hover:text-ink-100")}>
                    <i className={cn("ti", icon)} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="ti-search-off" title="Nenhuma entidade encontrada" description="Tente outro nome, código ou tipo." />
          ) : view === "table" ? (
            <div className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-900 shadow-xs">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-ink-700 bg-ink-800/50 text-left">
                    {["Identificador", "Nome", "Tipo", "Local", "Situação"].map(h => (
                      <th key={h} className="px-4 py-3 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const t = TYPE_MAP[e.type] ?? { label: e.type, icon: "ti-tag" };
                    const s = STATUS_MAP[e.status] ?? STATUS_MAP.draft;
                    return (
                      <tr key={e.id} className="border-b border-ink-700 last:border-0 hover:bg-ink-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-medium rounded border border-ink-700 bg-ink-800 px-1.5 py-0.5 text-ink-100">{e.code}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[22rem]">
                          <Link href={`/entidades/${e.id}`} className="font-semibold text-ink-50 hover:text-brand-400 line-clamp-1">{e.name}</Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-300">
                          <span className="inline-flex items-center gap-1.5"><i className={cn("ti", t.icon, "text-ink-500")} aria-hidden="true" />{t.label}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-300">{e.cityName ? `${e.cityName}${e.stateCode ? ` · ${e.stateCode}` : ""}` : e.stateCode ?? "—"}</td>
                        <td className="px-4 py-3"><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-2xs font-semibold", s.cls)}>{s.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(e => {
                const t = TYPE_MAP[e.type] ?? { label: e.type, icon: "ti-tag" };
                const s = STATUS_MAP[e.status] ?? STATUS_MAP.draft;
                return (
                  <Link key={e.id} href={`/entidades/${e.id}`}
                    className="group flex flex-col rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-xs transition-[border-color,box-shadow] hover:border-ink-600 hover:shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-10 h-10 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center"><i className={cn("ti", t.icon, "text-xl")} aria-hidden="true" /></span>
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-2xs font-semibold", s.cls)}>{s.label}</span>
                    </div>
                    <p className="mt-4 font-mono text-xs text-ink-500">{e.code}</p>
                    <h3 className="mt-0.5 font-serif text-lg font-semibold leading-snug text-ink-50 line-clamp-2 group-hover:text-brand-400 transition-colors">{e.name}</h3>
                    <p className="mt-auto pt-3 text-xs text-ink-500 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">{t.label}</span>
                      {e.cityName && <span className="inline-flex items-center gap-1"><i className="ti ti-map-pin" aria-hidden="true" />{e.cityName}{e.stateCode ? ` · ${e.stateCode}` : ""}</span>}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-ink-500">Mostrando {filtered.length} de {entities.length} entidades</p>
        </>
      )}
    </PageContainer>
  );
}
