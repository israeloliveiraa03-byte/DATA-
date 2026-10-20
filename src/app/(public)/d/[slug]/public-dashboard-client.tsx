"use client";

import { useEffect, useMemo, useState } from "react";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { DataLogo } from "@/components/layout/data-logo";
import { cn } from "@/lib/utils";
import type { FilterCondition, PublicFilterField, SupportedWidgetType, WidgetData } from "@/lib/dashboard/types";
import { downloadWidgetCsv, widgetRows } from "@/lib/dashboard/export";

interface PublicWidget {
  id: string; type: SupportedWidgetType; title: string | null;
  x: number; y: number; w: number; h: number; // x/w em %, y/h em px — grade livre
  config: Record<string, unknown>;
  data: WidgetData;
}

interface PublicDashboard {
  title: string; description: string | null; researchTitle: string;
  showAds: boolean; widgets: PublicWidget[];
  theme: string | null; coverUrl: string | null; colorPalette: string | null;
  canvasColor: string | null;
  filterFields: PublicFilterField[];
}

const fieldCls =
  "h-8 rounded-md border border-ink-700 bg-ink-900 px-2.5 text-xs text-ink-100 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function emptyPublicCondition(field: PublicFilterField): FilterCondition {
  if (field.kind === "choice") return { kind: "choice", fieldId: field.id, optionIds: [] };
  if (field.kind === "numeric") return { kind: "numeric", fieldId: field.id };
  if (field.kind === "geo") return { kind: "geo", fieldId: field.id, value: "" };
  return { kind: "date", fieldId: field.id };
}

// Uma condição de filtro — mesmo leque de campos filtráveis do editor
// (escolha/numérico/geo/data).
function PublicFilterConditionRow({ condition, field, onChange, onRemove }: {
  condition: FilterCondition;
  field: PublicFilterField | undefined;
  onChange: (c: FilterCondition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {condition.kind === "choice" && (
        <div className="flex flex-wrap gap-1">
          {(field?.options ?? []).map(o => {
            const checked = condition.optionIds.includes(o.id);
            return (
              <button key={o.id} type="button" aria-pressed={checked}
                onClick={() => onChange({ ...condition, optionIds: checked ? condition.optionIds.filter(id => id !== o.id) : [...condition.optionIds, o.id] })}
                className={cn(
                  "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  checked ? "border-brand-500 bg-brand-500 text-on-accent" : "border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600",
                )}>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
      {condition.kind === "numeric" && (
        <>
          <input type="number" placeholder="mín" aria-label="Mínimo" className={cn(fieldCls, "w-20")}
            value={condition.min ?? ""} onChange={e => onChange({ ...condition, min: e.target.value === "" ? undefined : Number(e.target.value) })} />
          <span className="text-xs text-ink-500">a</span>
          <input type="number" placeholder="máx" aria-label="Máximo" className={cn(fieldCls, "w-20")}
            value={condition.max ?? ""} onChange={e => onChange({ ...condition, max: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </>
      )}
      {condition.kind === "geo" && (
        <select className={fieldCls} aria-label="Local" value={condition.value} onChange={e => onChange({ ...condition, value: e.target.value })}>
          <option value="">Selecione...</option>
          {(field?.values ?? []).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      )}
      {condition.kind === "date" && (
        <>
          <input type="date" aria-label="De" className={fieldCls} value={condition.from ?? ""} onChange={e => onChange({ ...condition, from: e.target.value || undefined })} />
          <span className="text-xs text-ink-500">a</span>
          <input type="date" aria-label="Até" className={fieldCls} value={condition.to ?? ""} onChange={e => onChange({ ...condition, to: e.target.value || undefined })} />
        </>
      )}
      <button onClick={onRemove} aria-label="Remover condição"
        className="h-7 w-7 rounded-md flex items-center justify-center text-ink-500 hover:text-coral-500 hover:bg-coral-50">
        <i className="ti ti-x text-sm" aria-hidden="true" />
      </button>
    </div>
  );
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

// Widgets "de página" (títulos, divisórias, blocos, ícones, imagens) não
// ganham moldura de cartão — eles compõem o layout, não são indicadores.
function isFramed(w: PublicWidget) {
  if (w.type === "text" || w.type === "image") return false;
  return true;
}

// Texto curto em destaque (título de bloco) vira âncora de seção — é assim
// que o pesquisador já organiza o painel no editor, sem configuração nova.
function sectionTitle(w: PublicWidget): string | null {
  if (w.type !== "text" || w.data.kind !== "text") return null;
  const variant = (w.config.variant as string | undefined) ?? "text";
  if (variant !== "text") return null;
  const content = (w.data.content ?? "").trim();
  if (!content || content.length > 80 || content.includes("\n")) return null;
  const ts = (w.config.textStyle ?? {}) as { fontSize?: number; fontWeight?: string };
  return (ts.fontSize ?? 14) >= 18 || ts.fontWeight === "bold" ? content : null;
}

// Ações de cada indicador: ampliar e baixar os dados agregados (CSV).
function WidgetActions({ w, onExpand }: { w: PublicWidget; onExpand: () => void }) {
  const canDownload = !!widgetRows(w.data);
  const btn = "h-7 w-7 rounded-md flex items-center justify-center bg-ink-900/90 border border-ink-700 text-ink-300 hover:text-ink-50 hover:border-ink-600 shadow-xs backdrop-blur";
  return (
    <div className="absolute top-2.5 right-2.5 z-[2] flex gap-1 opacity-100 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      {canDownload && (
        <button type="button" className={btn} title="Baixar dados (CSV)" aria-label={`Baixar dados de ${w.title ?? "indicador"} em CSV`}
          onClick={() => downloadWidgetCsv(w.data, w.title || "indicador")}>
          <i className="ti ti-download text-sm" aria-hidden="true" />
        </button>
      )}
      <button type="button" className={btn} title="Ampliar" aria-label={`Ampliar ${w.title ?? "indicador"}`} onClick={onExpand}>
        <i className="ti ti-arrows-maximize text-sm" aria-hidden="true" />
      </button>
    </div>
  );
}

function ExpandedWidget({ w, palette, onClose }: { w: PublicWidget; palette?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const canDownload = !!widgetRows(w.data);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={w.title ?? "Indicador ampliado"}>
      <button className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-label="Fechar" tabIndex={-1} />
      <div className="relative w-full max-w-6xl h-[88dvh] flex flex-col rounded-2xl border border-ink-700 bg-ink-900 shadow-xl overflow-hidden animate-fade-in">
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-b border-ink-700 bg-ink-800/50">
          {canDownload && (
            <button type="button" onClick={() => downloadWidgetCsv(w.data, w.title || "indicador")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-3 text-xs font-semibold text-ink-100 hover:border-ink-600">
              <i className="ti ti-download text-sm" aria-hidden="true" /> Baixar dados (CSV)
            </button>
          )}
          <button type="button" onClick={onClose} autoFocus aria-label="Fechar"
            className="h-8 w-8 rounded-md flex items-center justify-center text-ink-500 hover:bg-ink-800 hover:text-ink-50">
            <i className="ti ti-x text-lg" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 min-h-0 p-2 sm:p-4">
          <WidgetRenderer type={w.type} title={w.title} data={w.data} config={w.config} palette={palette} />
        </div>
      </div>
    </div>
  );
}

export function PublicDashboardClient({ slug }: { slug: string }) {
  const [dashboard, setDashboard] = useState<PublicDashboard | null>(null);
  const [error,     setError]     = useState("");
  // Filtro geral — uma linha só, acima de todos os widgets. O servidor já
  // recorta as respostas ANTES de agregar (rota pública nunca expõe
  // resposta crua). from/to = data de ENVIO; conditions = perguntas.
  const [from, setFrom] = useState("");
  const [to,   setTo]   = useState("");
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [refetching, setRefetching] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [expanded, setExpanded] = useState<PublicWidget | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const desktop = useIsDesktop();

  const conditionsKey = JSON.stringify(conditions);

  useEffect(() => {
    let cancel = false;
    const isRefetch = dashboard !== null;
    if (isRefetch) setRefetching(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to)   params.set("to", to);
    if (conditions.length > 0) params.set("conditions", conditionsKey);
    const qs = params.toString();
    (async () => {
      try {
        const res = await fetch(`/api/public/dashboards/${slug}${qs ? `?${qs}` : ""}`);
        const json = await res.json();
        if (cancel) return;
        if (!res.ok) { setError(json.error ?? "Painel não encontrado"); return; }
        setDashboard(json.data);
      } catch {
        if (!cancel) setError("Não foi possível carregar o painel. Verifique sua conexão.");
      } finally {
        if (!cancel) setRefetching(false);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, from, to, conditionsKey]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const stacked = useMemo(
    () => [...(dashboard?.widgets ?? [])].sort((a, b) => (a.y - b.y) || (a.x - b.x)),
    [dashboard?.widgets],
  );
  const sections = useMemo(
    () => stacked.map(w => ({ id: w.id, title: sectionTitle(w) })).filter((x): x is { id: string; title: string } => !!x.title),
    [stacked],
  );

  // Destaca a seção visível na barra de seções (scroll-spy)
  useEffect(() => {
    if (sections.length < 2) return;
    const els = sections.map(s => document.getElementById(`secao-${s.id}`)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id.replace("secao-", ""));
    }, { rootMargin: "-90px 0px -60% 0px" });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [sections, desktop]);

  if (error) {
    return (
      <div data-theme="light" className="min-h-dvh flex items-center justify-center bg-ink-950 px-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-coral-50 text-coral-500 flex items-center justify-center">
            <i className="ti ti-map-off text-2xl" aria-hidden="true" />
          </div>
          <p className="font-serif text-xl font-semibold text-ink-50">Painel indisponível</p>
          <p className="mt-1 text-sm text-ink-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div data-theme="light" className="min-h-dvh bg-ink-950">
        <div className="h-9 bg-brand-700" />
        <div className="max-w-page mx-auto px-4 sm:px-8 pt-12">
          <div className="h-3 w-40 rounded bg-ink-700 animate-pulse" />
          <div className="mt-4 h-10 w-2/3 rounded bg-ink-700 animate-pulse" />
          <div className="mt-3 h-4 w-1/2 rounded bg-ink-800 animate-pulse" />
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-ink-800 animate-pulse" />)}
          </div>
          <div className="mt-4 h-80 rounded-xl bg-ink-800 animate-pulse" />
        </div>
        <span className="sr-only" role="status">Carregando painel</span>
      </div>
    );
  }

  const dark = dashboard.theme === "dark";
  const totalHeightPx = Math.max(300, dashboard.widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0) + 16);
  const hasFilter = !!(from || to || conditions.length > 0);
  const activeCount = (from ? 1 : 0) + (to ? 1 : 0) + conditions.length;
  const filterFields = dashboard.filterFields ?? [];
  const indicatorCount = dashboard.widgets.filter(isFramed).length;

  function addCondition() {
    const firstField = filterFields[0];
    if (!firstField) return;
    setConditions(prev => [...prev, emptyPublicCondition(firstField)]);
    setFiltersOpen(true);
  }
  function updateConditionField(index: number, fieldId: string) {
    const field = filterFields.find(f => f.id === fieldId);
    if (!field) return;
    setConditions(prev => prev.map((c, i) => i === index ? emptyPublicCondition(field) : c));
  }
  function updateCondition(index: number, cond: FilterCondition) {
    setConditions(prev => prev.map((c, i) => i === index ? cond : c));
  }
  function removeCondition(index: number) {
    setConditions(prev => prev.filter((_, i) => i !== index));
  }

  // [&>div>p:first-child]:pr-16 = espaço para os botões de ação ao lado do título
  const frame = (w: PublicWidget) => isFramed(w)
    ? "rounded-xl border border-ink-700 bg-ink-900 shadow-xs overflow-hidden transition-shadow hover:shadow-md [&>div>p:first-child]:pr-16"
    : "overflow-hidden";

  return (
    <div data-theme={dark ? "dark" : "light"} className="min-h-dvh bg-ink-950 text-ink-100">
      {/* Faixa institucional */}
      <div className="bg-brand-700 text-white/85 text-xs">
        <div className="max-w-page mx-auto px-4 sm:px-8 h-9 flex items-center justify-between gap-4">
          <span className="truncate"><strong className="font-semibold text-white">Painel de pesquisa</strong> · {dashboard.researchTitle}</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 flex-shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 animate-pulse-soft" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Atualizado a cada nova resposta
          </span>
        </div>
      </div>

      {/* Cabeçalho editorial */}
      <header className="relative overflow-hidden border-b border-ink-700 bg-ink-900">
        {dashboard.coverUrl ? (
          <>
            <div className="absolute inset-0 bg-cover bg-center opacity-90" style={{ backgroundImage: `url(${dashboard.coverUrl})` }} />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/90 to-ink-900/40" />
          </>
        ) : (
          <svg className="motif-roots absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1000 260" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M940,260 C910,190 960,150 910,90 C880,50 910,10 860,-10" />
            <path d="M940,260 C900,210 870,205 850,150 C835,115 790,110 780,60" />
            <path d="M940,260 C960,200 930,170 960,120 C980,90 960,60 985,20" />
            <path d="M850,150 C820,140 805,110 770,105" />
            <path d="M910,90 C940,75 945,50 980,45" />
            <path d="M720,260 C740,200 700,175 720,120 C735,85 710,55 730,10" />
          </svg>
        )}
        <div className="relative max-w-page mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-8 sm:pb-10">
          <div className="border-l-4 border-gold pl-5 sm:pl-6 max-w-3xl">
            <p className="kicker mb-3">{dashboard.researchTitle}</p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold leading-[1.05] text-ink-50">{dashboard.title}</h1>
            {dashboard.description && <p className="mt-4 font-serif text-lg text-ink-300 leading-relaxed">{dashboard.description}</p>}
          </div>
          <div className="mt-7 pt-5 border-t border-ink-700 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-500">
            <span><strong className="font-semibold text-ink-100">Fonte:</strong> dados primários da pesquisa</span>
            <span><strong className="font-semibold text-ink-100">Indicadores:</strong> {indicatorCount}</span>
            <span><strong className="font-semibold text-ink-100">Atualização:</strong> contínua, a cada resposta recebida</span>
          </div>
        </div>
      </header>

      {dashboard.widgets.length > 0 && (
        /* Filtro geral — fixo no topo ao rolar, igual à "faixa de recorte" do Raizame */
        <div className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/90 backdrop-blur supports-[backdrop-filter]:bg-ink-950/75">
          <div className="max-w-page mx-auto px-4 sm:px-8 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setFiltersOpen(o => !o)} aria-expanded={filtersOpen}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-3 text-xs font-semibold text-ink-100 hover:border-ink-600">
                <i className="ti ti-adjustments-horizontal text-sm" aria-hidden="true" /> Filtros
                {activeCount > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-2xs text-on-accent tabular">{activeCount}</span>}
              </button>
              <label className="flex items-center gap-1.5 text-xs text-ink-500">
                De <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={fieldCls} />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink-500">
                até <input type="date" value={to} onChange={e => setTo(e.target.value)} className={fieldCls} />
              </label>
              {hasFilter && (
                <button onClick={() => { setFrom(""); setTo(""); setConditions([]); }}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-coral-500 hover:bg-coral-50">
                  <i className="ti ti-filter-off text-sm" aria-hidden="true" /> Limpar
                </button>
              )}
              <span className="ml-auto text-xs text-ink-500 flex items-center gap-1.5" aria-live="polite">
                {refetching ? <><i className="ti ti-loader-2 animate-spin" aria-hidden="true" /> Recalculando…</> : hasFilter ? "Recorte aplicado a todo o painel" : "Mostrando todas as respostas"}
              </span>
            </div>

            {sections.length >= 2 && (
              <nav aria-label="Seções do painel" className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                {sections.map(sec => (
                  <a key={sec.id} href={`#secao-${sec.id}`} aria-current={activeSection === sec.id ? "true" : undefined}
                    className={cn(
                      "flex-shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      activeSection === sec.id ? "border-brand-500 bg-brand-500 text-on-accent" : "border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600 hover:text-ink-50",
                    )}>
                    {sec.title}
                  </a>
                ))}
              </nav>
            )}

            {filtersOpen && (
              <div className="mt-2.5 rounded-lg border border-ink-700 bg-ink-900 p-3 space-y-2.5 animate-fade-in">
                {conditions.length === 0 && <p className="text-xs text-ink-500">Combine condições sobre as perguntas do instrumento. O recorte vale para todos os gráficos e mapas.</p>}
                {conditions.map((cond, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 border-l-2 border-gold/60 pl-3">
                    <select className={cn(fieldCls, "max-w-[16rem]")} aria-label="Pergunta" value={cond.fieldId} onChange={e => updateConditionField(i, e.target.value)}>
                      {filterFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                    <PublicFilterConditionRow condition={cond} field={filterFields.find(f => f.id === cond.fieldId)}
                      onChange={c => updateCondition(i, c)} onRemove={() => removeCondition(i)} />
                  </div>
                ))}
                {filterFields.length > 0 && (
                  <button onClick={addCondition} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline underline-offset-4">
                    <i className="ti ti-plus text-sm" aria-hidden="true" /> Adicionar condição
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-page mx-auto px-4 sm:px-8 py-8 sm:py-10">
        {dashboard.showAds && (
          <aside aria-label="Publicidade" className="mb-8 rounded-lg border border-dashed border-ink-600 bg-ink-900/60 px-4 py-5 text-center">
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-500">Publicidade</p>
            <p className="mt-1 text-xs text-ink-500">Espaço que mantém este painel gratuito e público</p>
          </aside>
        )}

        {dashboard.widgets.length === 0 ? (
          <div className="py-20 text-center">
            <i className="ti ti-layout-dashboard text-3xl text-ink-600" aria-hidden="true" />
            <p className="mt-3 font-serif text-lg text-ink-300">Este painel ainda não tem indicadores publicados.</p>
          </div>
        ) : desktop ? (
          <div className="relative transition-opacity duration-200"
            style={{
              height: totalHeightPx,
              opacity: refetching ? 0.55 : 1,
              background: dashboard.canvasColor ?? undefined,
              borderRadius: dashboard.canvasColor ? 16 : undefined,
            }}>
            {dashboard.widgets.map(w => (
              <section key={w.id} id={sectionTitle(w) ? `secao-${w.id}` : undefined} aria-label={w.title ?? undefined}
                className={cn("absolute group scroll-mt-28", frame(w))}
                style={{ left: `calc(${w.x}% + 6px)`, top: w.y + 6, width: `calc(${w.w}% - 12px)`, height: w.h - 12 }}>
                <WidgetRenderer type={w.type} title={w.title} data={w.data} config={w.config} palette={dashboard.colorPalette ?? undefined} />
                {isFramed(w) && <WidgetActions w={w} onExpand={() => setExpanded(w)} />}
              </section>
            ))}
          </div>
        ) : (
          /* Celular/tablet: empilha na ordem de leitura (de cima pra baixo, da esquerda pra direita) */
          <div className="grid grid-cols-2 gap-3 transition-opacity duration-200" style={{ opacity: refetching ? 0.55 : 1 }}>
            {stacked.map(w => {
              const isMap = w.type === "map" || w.type === "heatmap" || w.type === "globe";
              const isNumber = w.type === "number_card";
              const h = isNumber ? 132 : isMap ? Math.max(360, Math.min(w.h, 480)) : w.type === "text" ? undefined : Math.max(200, Math.min(w.h, 420));
              return (
                <section key={w.id} id={sectionTitle(w) ? `secao-${w.id}` : undefined} aria-label={w.title ?? undefined}
                  className={cn("relative group scroll-mt-28", frame(w), isNumber ? "col-span-1" : "col-span-2")} style={{ height: h, minHeight: w.type === "text" ? 40 : undefined }}>
                  <WidgetRenderer type={w.type} title={w.title} data={w.data} config={w.config} palette={dashboard.colorPalette ?? undefined} />
                  {isFramed(w) && !isNumber && <WidgetActions w={w} onExpand={() => setExpanded(w)} />}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Rodapé institucional */}
      <footer className="mt-6 bg-brand-700 text-white/75">
        <div className="max-w-page mx-auto px-4 sm:px-8 py-10 grid gap-8 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-white mb-2">Sobre este painel</p>
            <p className="leading-relaxed">Indicadores calculados a partir das respostas do instrumento da pesquisa <em>{dashboard.researchTitle}</em>. Os números mudam à medida que novas respostas chegam.</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-white mb-2">Como ler</p>
            <p className="leading-relaxed">Passe o cursor (ou toque) sobre gráficos e mapas para ver valores e bases. Use os filtros para recortar todo o painel ao mesmo tempo.</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-white mb-2">Proteção de dados</p>
            <p className="leading-relaxed">Este painel exibe apenas dados agregados. Respostas individuais não são publicadas (LGPD, Lei nº 13.709/2018).</p>
          </div>
        </div>
        <div className="border-t border-white/15">
          <div className="max-w-page mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/55">
            <span>Painel publicado pela equipe da pesquisa.</span>
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              Construído com <DataLogo className="text-sm text-white" animated={false} />
            </a>
          </div>
        </div>
      </footer>

      {expanded && <ExpandedWidget w={expanded} palette={dashboard.colorPalette ?? undefined} onClose={() => setExpanded(null)} />}

      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Voltar ao topo"
        className={cn(
          "fixed right-4 bottom-4 z-40 h-11 w-11 rounded-full bg-brand-500 text-on-accent shadow-lg flex items-center justify-center transition-all duration-200",
          showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
        )}>
        <i className="ti ti-arrow-up text-lg" aria-hidden="true" />
      </button>
    </div>
  );
}
