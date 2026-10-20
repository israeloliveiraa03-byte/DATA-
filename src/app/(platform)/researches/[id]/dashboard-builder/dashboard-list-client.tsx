"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Research, Dashboard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page";

// Tipos de painel — cada um abre o editor com um modelo de estrutura
// (ver TEMPLATES em dashboard-builder-client.tsx, aplicado via ?modelo=).
// "Dados importados" é o tipo para bases externas (INEP, IBGE, Palmares)
// e ainda não tem motor de importação — aparece sinalizado, sem ação.
const PANEL_TYPES = [
  { id: "primary", icon: "ti-clipboard-data", title: "Coleta primária", text: "Indicadores ao vivo do instrumento aplicado: números, mapa por UF, distribuição e ritmo da coleta.", example: "Ex.: Central de Confluência" },
  { id: "map", icon: "ti-map-2", title: "Território em foco", text: "Mapa coroplético como protagonista, com números e registros ao lado.", example: "Ex.: respostas por município" },
  { id: "compare", icon: "ti-arrows-cross", title: "Cruzamentos", text: "Compare grupos: categoria × categoria em tabela cruzada e barras agrupadas.", example: "Ex.: zona rural × urbana" },
  { id: "report", icon: "ti-article", title: "Narrativo", text: "Relatório vivo: texto editorial intercalado com gráficos que se atualizam.", example: "Ex.: boletim para assembleia" },
  { id: "imported", icon: "ti-table-import", title: "Dados importados", text: "Bases externas em CSV/XLSX (INEP, IBGE, Palmares) viram painel, com fonte citada.", example: "Ex.: Raizame, Escolas Quilombolas", soon: true },
  { id: "blank", icon: "ti-layout-grid-add", title: "Em branco", text: "Comece do zero e monte com os widgets que quiser.", example: "Arrastar e soltar livre" },
] as const;

type PanelTypeId = typeof PANEL_TYPES[number]["id"];

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

function NewPanelDialog({ research, onClose }: { research: Research; onClose: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<PanelTypeId>("primary");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim() || PANEL_TYPES.find(t => t.id === type)!.title;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/researches/${research.id}/dashboards`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Não foi possível criar o painel."); return; }
      toast.success("Painel criado — abrindo o editor.");
      const modelo = type === "blank" ? "" : `?modelo=${type}`;
      router.push(`/researches/${research.id}/dashboard-builder/${json.data.id}${modelo}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="novo-painel-titulo">
      <button className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-label="Fechar" tabIndex={-1} />
      <form onSubmit={create} className="relative w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-ink-700 bg-ink-900 shadow-xl animate-fade-in">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-900 px-6 py-5">
          <div>
            <p className="kicker mb-1.5">Novo painel</p>
            <h2 id="novo-painel-titulo" className="font-serif text-2xl font-semibold text-ink-50">Que tipo de painel você quer publicar?</h2>
            <p className="mt-1 text-sm text-ink-300">O tipo define a estrutura inicial — tudo pode ser rearranjado depois no editor.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-ink-500 hover:bg-ink-800 hover:text-ink-100">
            <i className="ti ti-x text-lg" aria-hidden="true" />
          </button>
        </div>

        <fieldset className="px-6 pt-5">
          <legend className="sr-only">Tipo de painel</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PANEL_TYPES.map(t => {
              const soon = "soon" in t && t.soon;
              const selected = type === t.id;
              return (
                <label key={t.id}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-4 transition-[border-color,box-shadow,background-color]",
                    soon ? "cursor-not-allowed opacity-60 border-ink-700 bg-ink-800/40" : "cursor-pointer",
                    !soon && (selected ? "border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-500" : "border-ink-700 bg-ink-900 hover:border-ink-600"),
                  )}>
                  <input type="radio" name="tipo" value={t.id} checked={selected} disabled={soon}
                    onChange={() => { setType(t.id); titleRef.current?.focus(); }} className="sr-only" />
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", selected ? "bg-ink-900 border-brand-500/30 text-brand-500" : "bg-ink-800 border-ink-700 text-gold")}>
                      <i className={cn("ti", t.icon, "text-xl")} aria-hidden="true" />
                    </span>
                    {soon ? (
                      <span className="text-2xs font-semibold rounded-full border border-ink-700 bg-ink-800 px-2 py-0.5 text-ink-500">Em desenvolvimento</span>
                    ) : selected ? (
                      <i className="ti ti-circle-check-filled text-xl text-brand-500" aria-hidden="true" />
                    ) : null}
                  </div>
                  <span className="mt-3 font-serif text-lg font-semibold text-ink-50">{t.title}</span>
                  <span className="mt-1 text-sm text-ink-300 leading-relaxed">{t.text}</span>
                  <span className="mt-3 text-xs text-ink-500 italic">{t.example}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="px-6 pt-5 pb-6">
          <label htmlFor="novo-painel-nome" className="block text-sm font-medium text-ink-100 mb-1.5">Nome do painel</label>
          <input id="novo-painel-nome" ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
            placeholder={PANEL_TYPES.find(t => t.id === type)!.title + " — " + research.title.slice(0, 40)}
            className={fieldClasses} />
          {error && <p className="mt-2 text-sm text-coral-500">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-ink-700 bg-ink-800/80 backdrop-blur px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>
            {!saving && <i className="ti ti-arrow-right" aria-hidden="true" />} Criar e abrir o editor
          </Button>
        </div>
      </form>
    </div>
  );
}

export function DashboardListClient({ research, dashboards: initial }: { research: Research; dashboards: Dashboard[] }) {
  const [dashboards, setDashboards] = useState(initial);
  const [creating,   setCreating]   = useState(false);
  const [busyId,     setBusyId]     = useState<string | null>(null);

  async function duplicateDashboard(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboards/${id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error("Erro ao duplicar painel."); return; }
      setDashboards(prev => [json.data, ...prev]);
      toast.success("Painel duplicado.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublish(dash: Dashboard) {
    setBusyId(dash.id);
    try {
      const res = await fetch(`/api/dashboards/${dash.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !dash.isPublic }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error("Erro ao atualizar publicação."); return; }
      setDashboards(prev => prev.map(d => d.id === dash.id ? json.data : d));
      toast.success(dash.isPublic ? "Painel despublicado." : "Painel publicado — link público disponível.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDashboard(id: string) {
    if (!confirm("Apagar este painel e todos os seus widgets? Não dá pra desfazer.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao apagar painel."); return; }
      setDashboards(prev => prev.filter(d => d.id !== id));
      toast.success("Painel apagado.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setBusyId(null);
    }
  }

  const published = dashboards.filter(d => d.isPublic).length;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Pesquisas", href: "/researches" }, { label: research.title, href: `/researches/${research.id}` }, { label: "Painéis" }]}
        kicker="Painéis da pesquisa"
        title="Painéis"
        description={`Publique os resultados de “${research.title}” em páginas que se atualizam a cada resposta.`}
        actions={<Button onClick={() => setCreating(true)}><i className="ti ti-plus" aria-hidden="true" /> Novo painel</Button>}
        meta={<>
          <span><strong className="text-ink-100">{dashboards.length}</strong> {dashboards.length === 1 ? "painel" : "painéis"}</span>
          <span><strong className="text-ink-100">{published}</strong> {published === 1 ? "publicado" : "publicados"}</span>
        </>}
      />

      {creating && <NewPanelDialog research={research} onClose={() => setCreating(false)} />}

      {dashboards.length === 0 ? (
        <EmptyState
          icon="ti-layout-dashboard"
          title="Nenhum painel ainda"
          description="Escolha um tipo de painel — coleta primária, território, cruzamentos ou narrativo — e o editor abre com a estrutura pronta."
          action={<Button onClick={() => setCreating(true)}><i className="ti ti-plus" aria-hidden="true" /> Criar primeiro painel</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dashboards.map(dash => {
            const busy = busyId === dash.id;
            return (
              <article key={dash.id} className="group flex flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-xs transition-[border-color,box-shadow] hover:border-ink-600 hover:shadow-md">
                {/* Miniatura abstrata do painel */}
                <Link href={`/researches/${research.id}/dashboard-builder/${dash.id}`} className="block border-b border-ink-700 bg-ink-800/50 p-4" aria-label={`Abrir ${dash.title} no editor`} tabIndex={-1}>
                  <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                    {[0, 1, 2, 3].map(i => <div key={i} className="h-5 rounded bg-ink-900 border border-ink-700" />)}
                    <div className="col-span-2 h-16 rounded bg-ink-900 border border-ink-700 p-1.5 flex items-end gap-1">
                      {[40, 70, 55, 85, 30].map((h, i) => <span key={i} className="flex-1 rounded-sm bg-brand-500/60" style={{ height: `${h}%` }} />)}
                    </div>
                    <div className="col-span-2 h-16 rounded bg-ink-900 border border-ink-700 flex items-center justify-center">
                      <span className="h-10 w-10 rounded-full border-[6px] border-gold/60 border-r-brand-500/70" />
                    </div>
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {dash.isPublic ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-50 px-2 py-0.5 text-2xs font-semibold text-brand-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Publicado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-800 px-2 py-0.5 text-2xs font-semibold text-ink-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-ink-500" /> Rascunho
                      </span>
                    )}
                    <span className="text-2xs text-ink-500 ml-auto">{formatDate(dash.updatedAt)}</span>
                  </div>
                  <Link href={`/researches/${research.id}/dashboard-builder/${dash.id}`} className="font-serif text-lg font-semibold leading-snug text-ink-50 hover:text-brand-400">
                    {dash.title}
                  </Link>
                  {dash.description && <p className="mt-1 text-sm text-ink-300 line-clamp-2">{dash.description}</p>}

                  {dash.isPublic && dash.publicSlug && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <a href={`/d/${dash.publicSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline underline-offset-4">
                        <i className="ti ti-external-link text-sm" aria-hidden="true" /> Ver página pública
                      </a>
                      <span className="text-ink-600" aria-hidden="true">·</span>
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/d/${dash.publicSlug}`); toast.success("Link público copiado."); }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-300 hover:text-ink-50">
                        <i className="ti ti-link text-sm" aria-hidden="true" /> Copiar link
                      </button>
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex items-center gap-1.5">
                    <Link href={`/researches/${research.id}/dashboard-builder/${dash.id}`} className={buttonClasses("secondary", "sm", "flex-1")}>
                      <i className="ti ti-pencil text-sm" aria-hidden="true" /> Editar
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => togglePublish(dash)} disabled={busy} title={dash.isPublic ? "Despublicar" : "Publicar"}>
                      <i className={cn("ti text-sm", busy ? "ti-loader-2 animate-spin" : dash.isPublic ? "ti-lock" : "ti-world-upload")} aria-hidden="true" />
                      {dash.isPublic ? "Despublicar" : "Publicar"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicateDashboard(dash.id)} disabled={busy} aria-label="Duplicar painel" title="Duplicar">
                      <i className="ti ti-copy" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteDashboard(dash.id)} disabled={busy} aria-label="Apagar painel" title="Apagar" className="text-coral-500 hover:text-coral-600 hover:bg-coral-50">
                      <i className="ti ti-trash" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
