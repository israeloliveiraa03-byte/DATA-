"use client";

import { useState, useEffect, useRef, useCallback, useMemo, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { DataLogo } from "@/components/layout/data-logo";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { computeWidgetData } from "@/lib/dashboard/aggregate";
import { SUPPORTED_WIDGET_TYPES, CHOICE_FIELD_TYPES, NUMERIC_FIELD_TYPES, DECORATIVE_ICON_OPTIONS, COLOR_PALETTES, type SupportedWidgetType, type HeatmapIndicatorConfig } from "@/lib/dashboard/types";
import type { Research, Dashboard, FormField, Response as ResponseRow } from "@/lib/types";

// react-moveable manipula o DOM direto (tamanho/posição via window/document)
// — igual ao Leaflet, quebra a renderização no servidor se importado direto.
// Tipagem própria da lib não sobrevive bem ao wrapper de import dinâmico
// (perde os mixins de snap/group no meio do caminho) — any é o escape
// pragmático aqui, só nesse limite com a biblioteca de terceiro.
const Moveable = dynamic(() => import("react-moveable"), { ssr: false }) as unknown as ComponentType<Record<string, unknown>>;

const BRD = "1px solid #e8d8be";
const TS  = { color: "#c48a42", fontSize: "9px" } as const;
// Grade de fundo só como referência visual solta — não trava mais o
// posicionamento (isso agora é livre, com guias de alinhamento via
// react-moveable). Mantém a mesma malha de 12 "colunas" que já existia.
const GRID_COLUMNS  = 12;
const GRID_ROW      = 32;

const DEFAULT_SIZE: Record<SupportedWidgetType, { w: number; h: number }> = {
  number_card:  { w: 25,        h: 64 },
  bar_chart:    { w: 50,        h: 160 },
  pie_chart:    { w: 41.666666, h: 160 },
  donut_chart:  { w: 41.666666, h: 160 },
  table:        { w: 66.666666, h: 192 },
  text:         { w: 33.333333, h: 64 },
  map:          { w: 50,        h: 320 },
  heatmap:      { w: 50,        h: 320 },
  image:        { w: 33.333333, h: 192 },
  crosstab:     { w: 50,        h: 224 },
  globe:        { w: 50,        h: 360 },
};

// Redimensiona uma imagem no cliente antes de guardar como base64 — usado
// tanto pra capa do dashboard quanto pro widget de imagem, evita inchar o
// banco com upload gigante sem comprimir.
function resizeImageToDataUrl(file: File, maxWidth: number, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface WidgetDraft {
  id: string;
  type: SupportedWidgetType;
  title: string;
  x: number; y: number; w: number; h: number; // x/w em %, y/h em px — grade livre
  config: Record<string, unknown>;
}

const DECORATIVE_PRESETS: { variant: "text" | "divider" | "block" | "icon"; label: string; icon: string; w: number; h: number; config: Record<string, unknown> }[] = [
  { variant: "text",    label: "Texto",         icon: "ti-typography",           w: 33.33, h: 64, config: { content: "Escreva aqui...", variant: "text" } },
  { variant: "divider", label: "Divisória",     icon: "ti-separator-horizontal", w: 50,    h: 24, config: { variant: "divider" } },
  { variant: "block",   label: "Bloco de cor",  icon: "ti-square-rounded",       w: 25,    h: 80, config: { variant: "block", style: { backgroundColor: "#7a9b5c", borderRadius: 8 } } },
  { variant: "icon",    label: "Ícone",         icon: "ti-map-pin",              w: 16.66, h: 80, config: { variant: "icon", iconName: "map-pin" } },
];

// Modelos de início — só tipo/posição/tamanho, sem campo vinculado (isso
// varia por pesquisa) — o pesquisador liga os dados depois de aplicar.
const TEMPLATES: { id: string; label: string; description: string; icon: string; widgets: Omit<WidgetDraft, "id">[] }[] = [
  {
    id: "kpi", label: "Painel de indicadores", icon: "ti-dashboard", description: "3 números + 1 gráfico de barras",
    widgets: [
      { type: "number_card", title: "Total de respostas", x: 0,     y: 0,  w: 33.33, h: 88,  config: { aggregation: "count" } },
      { type: "number_card", title: "Indicador 2",         x: 33.33, y: 0,  w: 33.33, h: 88,  config: { aggregation: "count" } },
      { type: "number_card", title: "Indicador 3",         x: 66.66, y: 0,  w: 33.34, h: 88,  config: { aggregation: "count" } },
      { type: "bar_chart",   title: "Distribuição",        x: 0,     y: 88, w: 100,   h: 240, config: {} },
    ],
  },
  {
    id: "map", label: "Mapa + resumo", icon: "ti-map", description: "Mapa de calor com números e tabela ao lado",
    widgets: [
      { type: "heatmap",     title: "Mapa de calor", x: 0,  y: 0,   w: 60, h: 320, config: { indicators: [{ key: "count", label: "Volume de respostas", mode: "count" }] } },
      { type: "number_card", title: "Total",         x: 60, y: 0,   w: 40, h: 100, config: { aggregation: "count" } },
      { type: "table",       title: "Respostas",      x: 60, y: 100, w: 40, h: 220, config: { fieldIds: [] } },
    ],
  },
  {
    id: "report", label: "Relatório narrativo", icon: "ti-file-text", description: "Título, texto e um gráfico",
    widgets: [
      { type: "text",        title: "", x: 0, y: 0,   w: 100, h: 56,  config: { content: "Título do relatório", variant: "text", textStyle: { fontSize: 24, fontWeight: "bold" } } },
      { type: "text",        title: "", x: 0, y: 56,  w: 100, h: 72,  config: { content: "Escreva aqui um resumo da pesquisa...", variant: "text" } },
      { type: "donut_chart", title: "Distribuição", x: 0,  y: 128, w: 50, h: 220, config: {} },
      { type: "table",       title: "Detalhamento", x: 50, y: 128, w: 50, h: 220, config: { fieldIds: [] } },
    ],
  },
];

function clamp(n: number, min: number, max: number) { return Math.min(Math.max(n, min), max); }

interface SavedWidget {
  id: string; type: string; title: string | null;
  x: number; y: number; w: number; h: number;
  config: unknown;
}

function hydrate(saved: SavedWidget[]): WidgetDraft[] {
  return saved.map(w => ({
    id: w.id, type: w.type as SupportedWidgetType, title: w.title ?? "",
    x: w.x, y: w.y, w: w.w, h: w.h,
    config: (w.config as Record<string, unknown>) ?? {},
  }));
}

export function DashboardBuilderClient({
  research, dashboard, fields, responses,
}: {
  research: Research; dashboard: Dashboard; fields: FormField[]; responses: ResponseRow[];
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const widgetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // widgetRefs é um ref (mutação não re-renderiza) — sem isso, o array de
  // elementGuidelines calculado no render fica preso ao commit anterior,
  // sempre um ciclo atrasado, e a guia de alinhamento nunca aparece.
  const [, setRefsVersion] = useState(0);
  // Callback de ref precisa ter a MESMA identidade entre renders pro React
  // não achar que é uma ref diferente — se recriar a função a cada render,
  // o React chama null na antiga + elemento na nova em TODO render, o que
  // aciona o setRefsVersion de novo, gerando outro render: loop infinito
  // (React error #185, "Maximum update depth exceeded"). Por isso cada id
  // recebe uma função própria, criada uma vez só e reaproveitada.
  const registerCallbacks = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const registerWidgetRef = useCallback((id: string) => {
    let fn = registerCallbacks.current.get(id);
    if (!fn) {
      fn = (el: HTMLDivElement | null) => {
        if (el) widgetRefs.current.set(id, el); else widgetRefs.current.delete(id);
        setRefsVersion(v => v + 1);
      };
      registerCallbacks.current.set(id, fn);
    }
    return fn;
  }, []);

  const [title,      setTitle]      = useState(dashboard.title);
  const [isPublic,   setIsPublic]   = useState(dashboard.isPublic);
  const [publicSlug, setPublicSlug] = useState(dashboard.publicSlug);
  const [widgets,     setWidgets]     = useState<WidgetDraft[]>([]);
  const [loaded,      setLoaded]      = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving,      setSaving]      = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [savedAt,     setSavedAt]     = useState<string | null>(null);

  const [dashboardTheme,    setDashboardTheme]    = useState(dashboard.theme ?? "light");
  const [dashboardCoverUrl, setDashboardCoverUrl]  = useState(dashboard.coverUrl);
  const [dashboardPalette, setDashboardPalette]    = useState(dashboard.colorPalette ?? "terracota");
  const [appearanceOpen,    setAppearanceOpen]     = useState(false);
  const [coverUploading,    setCoverUploading]     = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedWidget = selectedIdsArray.length === 1 ? widgets.find(w => w.id === selectedIdsArray[0]) ?? null : null;

  const selectWidget = useCallback((id: string, additive: boolean) => {
    setSelectedIds(prev => {
      if (!additive) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Desfazer/refazer — pilha de snapshots, empilhada só nos pontos de commit
  // que já existem (adicionar/remover/fim de arrastar/redimensionar/mudar
  // config) — nunca a cada pixel arrastado ou tecla digitada.
  const widgetsRef = useRef<WidgetDraft[]>([]);
  useEffect(() => { widgetsRef.current = widgets; }, [widgets]);
  const [history, setHistory] = useState<WidgetDraft[][]>([]);
  const [future,  setFuture]  = useState<WidgetDraft[][]>([]);

  const pushHistory = useCallback(() => {
    setHistory(h => [...h.slice(-49), widgetsRef.current]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      setFuture(f => [...f, widgetsRef.current]);
      setWidgets(h[h.length - 1]);
      setSelectedIds(new Set());
      return h.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      setHistory(h => [...h, widgetsRef.current]);
      setWidgets(f[f.length - 1]);
      setSelectedIds(new Set());
      return f.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        e.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, undo, redo]);

  const saveAppearance = useCallback(async (patch: { theme?: string; coverUrl?: string | null; colorPalette?: string }) => {
    await fetch(`/api/dashboards/${dashboard.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }, [dashboard.id]);

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setCoverUploading(true);
    // Fundo de página tende a ser maior que avatar/capa — 1600px de largura.
    resizeImageToDataUrl(file, 1600)
      .then(dataUrl => {
        setDashboardCoverUrl(dataUrl);
        return saveAppearance({ coverUrl: dataUrl });
      })
      .finally(() => setCoverUploading(false));
  }

  function removeCover() {
    setDashboardCoverUrl(null);
    saveAppearance({ coverUrl: null });
  }

  function setTheme(theme: string) {
    setDashboardTheme(theme);
    saveAppearance({ theme });
  }

  function setPalette(colorPalette: string) {
    setDashboardPalette(colorPalette);
    saveAppearance({ colorPalette });
  }

  // Carrega os widgets salvos ao montar
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboards/${dashboard.id}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancel) setWidgets(hydrate(json.data.widgets ?? []));
        }
      } finally {
        if (!cancel) setLoaded(true);
      }
    })();
    return () => { cancel = true; };
  }, [dashboard.id]);

  const addWidget = useCallback((type: SupportedWidgetType) => {
    pushHistory();
    const size = DEFAULT_SIZE[type];
    const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    const id = crypto.randomUUID();
    setWidgets(prev => [...prev, {
      id, type, title: SUPPORTED_WIDGET_TYPES.find(t => t.value === type)?.label ?? type,
      x: 0, y: maxY, w: size.w, h: size.h,
      config: type === "number_card" ? { aggregation: "count" }
        : type === "table" ? { fieldIds: [] }
        : type === "heatmap" ? { indicators: [{ key: crypto.randomUUID(), label: "Volume de respostas", mode: "count" as const }] }
        : type === "globe" ? { mode: "points" as const }
        : {},
    }]);
    setSelectedIds(new Set([id]));
  }, [widgets, pushHistory]);

  const addDecorative = useCallback((preset: typeof DECORATIVE_PRESETS[number]) => {
    pushHistory();
    const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    const id = crypto.randomUUID();
    setWidgets(prev => [...prev, {
      id, type: "text" as const, title: "",
      x: 0, y: maxY, w: preset.w, h: preset.h,
      config: preset.config,
    }]);
    setSelectedIds(new Set([id]));
  }, [widgets, pushHistory]);

  const applyTemplate = useCallback((template: typeof TEMPLATES[number]) => {
    pushHistory();
    setWidgets(template.widgets.map(w => ({ ...w, id: crypto.randomUUID() })));
    setSelectedIds(new Set());
  }, [pushHistory]);

  const updateWidget = useCallback((id: string, patch: Partial<WidgetDraft>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
  }, []);

  const updateConfig = useCallback((id: string, configPatch: Record<string, unknown>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, config: { ...w.config, ...configPatch } } : w));
  }, []);

  const deleteWidget = useCallback((id: string) => {
    pushHistory();
    setWidgets(prev => prev.filter(w => w.id !== id));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    registerCallbacks.current.delete(id);
  }, [pushHistory]);

  const deleteSelected = useCallback(() => {
    pushHistory();
    setWidgets(prev => prev.filter(w => !selectedIds.has(w.id)));
    selectedIds.forEach(id => registerCallbacks.current.delete(id));
    setSelectedIds(new Set());
  }, [selectedIds, pushHistory]);

  // Arrastar/redimensionar livre (react-moveable) — só o widget selecionado
  // vira alvo; os outros entram como `elementGuidelines` pra desenhar linha
  // de alinhamento contra borda/centro deles durante o gesto.
  function commitDrag(id: string, left: number, top: number) {
    if (!canvasRef.current) return;
    const canvasWidth = canvasRef.current.getBoundingClientRect().width;
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;
    const xPercent = clamp((left / canvasWidth) * 100, 0, 100 - widget.w);
    updateWidget(id, { x: xPercent, y: Math.max(0, top) });
  }

  function commitResize(id: string, width: number, height: number, left: number, top: number) {
    if (!canvasRef.current) return;
    const canvasWidth = canvasRef.current.getBoundingClientRect().width;
    const wPercent = clamp((width / canvasWidth) * 100, 4, 100);
    const xPercent = clamp((left / canvasWidth) * 100, 0, 100 - wPercent);
    updateWidget(id, { x: xPercent, y: Math.max(0, top), w: wPercent, h: Math.max(40, height) });
  }

  // Grupo (multi-seleção) — os eventos do Moveable dão o elemento DOM que se
  // moveu, não o id; acha o id de volta procurando no mapa de refs.
  function findWidgetIdByEl(el: HTMLElement): string | undefined {
    for (const [id, node] of widgetRefs.current.entries()) if (node === el) return id;
    return undefined;
  }

  const save = useCallback(async () => {
    setSaving(true);
    try {
      if (title !== dashboard.title) {
        await fetch(`/api/dashboards/${dashboard.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      }
      const res = await fetch(`/api/dashboards/${dashboard.id}/widgets`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgets: widgets.map((w, idx) => ({
            type: w.type, title: w.title || undefined,
            x: w.x, y: w.y, w: w.w, h: w.h,
            config: w.config, order: idx,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error("Erro ao salvar: " + (json?.error ?? res.status)); return; }
      setWidgets(hydrate(json.data));
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      toast.success("Dashboard salvo.");
    } catch (err) {
      toast.error("Erro de conexão ao salvar: " + String(err));
    } finally {
      setSaving(false);
    }
  }, [dashboard.id, dashboard.title, title, widgets]);

  const togglePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      const json = await res.json();
      if (res.ok) { setIsPublic(json.data.isPublic); setPublicSlug(json.data.publicSlug); }
    } finally {
      setPublishing(false);
    }
  }, [dashboard.id, isPublic]);

  const totalHeightPx = Math.max(400, widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0) + 64);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#fbf3e7" }}>

      {/* TOPBAR */}
      <header className="h-12 flex items-center justify-between px-4 flex-shrink-0 z-50" style={{ background: "#fbf3e7", borderBottom: BRD }}>
        <button onClick={() => router.push(`/researches/${research.id}/dashboard-builder`)}>
          <DataLogo className="text-lg" />
        </button>
        <div className="flex items-center gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="text-sm font-semibold border-none bg-transparent outline-none text-center border-b-2 border-transparent transition-colors min-w-48 px-1"
            style={{ color: "#0f172a" }}
            onFocus={e => e.currentTarget.style.borderBottomColor = "#d2a05c"}
            onBlur={e => e.currentTarget.style.borderBottomColor = "transparent"} />
          {savedAt && <span className="text-xs flex items-center gap-1" style={{ color: "#a06d28" }}><i className="ti ti-check" style={{ color: "#4c6b3c" }} /> Salvo às {savedAt}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={history.length === 0} title="Desfazer (Ctrl+Z)"
            className="w-7 h-7 flex items-center justify-center rounded-md disabled:opacity-30"
            style={{ border: BRD, background: "#fff", color: "#5c3f13" }}>
            <i className="ti ti-arrow-back-up text-sm" />
          </button>
          <button onClick={redo} disabled={future.length === 0} title="Refazer (Ctrl+Shift+Z)"
            className="w-7 h-7 flex items-center justify-center rounded-md disabled:opacity-30 mr-1"
            style={{ border: BRD, background: "#fff", color: "#5c3f13" }}>
            <i className="ti ti-arrow-forward-up text-sm" />
          </button>
          {isPublic && publicSlug && (
            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/d/${publicSlug}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md"
              style={{ border: BRD, background: "#eaf0e4", color: "#3a5430" }}>
              <i className="ti ti-link" /> Copiar link público
            </button>
          )}
          <button onClick={togglePublish} disabled={publishing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md disabled:opacity-50"
            style={{ border: BRD, background: "#fff", color: "#5c3f13" }}>
            <i className={`ti ${isPublic ? "ti-lock" : "ti-world"}`} />
            {isPublic ? "Despublicar" : "Publicar"}
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md disabled:opacity-50"
            style={{ background: "#c48a42", color: "#fff", border: "1.5px solid #7a5218" }}>
            <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-device-floppy"} />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Painel esquerdo — paleta de widgets */}
        <aside className="w-48 flex-shrink-0 overflow-y-auto py-3 px-2.5" style={{ background: "#fbf3e7", borderRight: BRD }}>

          {/* Aparência da página publicada — a página é do pesquisador, não
              chrome do Dataº: fundo e tom ficam com ele escolher. */}
          <button onClick={() => setAppearanceOpen(v => !v)}
            className="w-full flex items-center justify-between px-1 mb-1.5">
            <span className="font-bold uppercase tracking-widest" style={TS}>Aparência publicada</span>
            <i className={`ti ${appearanceOpen ? "ti-chevron-up" : "ti-chevron-down"} text-xs`} style={{ color: "#c48a42" }} />
          </button>
          {appearanceOpen && (
            <div className="mb-3 p-2 rounded-md" style={{ border: BRD, background: "#fff" }}>
              <p className="text-2xs font-bold uppercase mb-1.5" style={{ color: "#a06d28" }}>Imagem de fundo</p>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
              {dashboardCoverUrl && (
                <div className="relative h-16 rounded-md overflow-hidden mb-1.5" style={{ border: BRD }}>
                  <img src={dashboardCoverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              )}
              <div className="flex gap-1.5 mb-3">
                <button onClick={() => coverInputRef.current?.click()} disabled={coverUploading}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-2xs font-semibold disabled:opacity-50"
                  style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
                  <i className={`ti ${coverUploading ? "ti-loader-2 animate-spin" : "ti-photo"}`} />
                  {dashboardCoverUrl ? "Trocar" : "Adicionar"}
                </button>
                {dashboardCoverUrl && (
                  <button onClick={removeCover} className="px-2 py-1.5 rounded-md text-2xs font-semibold" style={{ border: BRD, color: "#c0392b" }}>
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>
              <p className="text-2xs font-bold uppercase mb-1.5" style={{ color: "#a06d28" }}>Tom</p>
              <div className="flex rounded-md overflow-hidden mb-3" style={{ border: BRD }}>
                {[{ v: "light", l: "Claro" }, { v: "dark", l: "Escuro" }].map(t => (
                  <button key={t.v} onClick={() => setTheme(t.v)}
                    className="flex-1 py-1.5 text-2xs font-semibold"
                    style={{ background: dashboardTheme === t.v ? "#c48a42" : "#fff", color: dashboardTheme === t.v ? "#fff" : "#5c3f13" }}>
                    {t.l}
                  </button>
                ))}
              </div>
              <p className="text-2xs font-bold uppercase mb-1.5" style={{ color: "#a06d28" }}>Paleta de cores</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(COLOR_PALETTES).map(([key, p]) => (
                  <button key={key} onClick={() => setPalette(key)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left"
                    style={{ border: dashboardPalette === key ? "2px solid #c48a42" : BRD, background: "#fff" }}>
                    <span className="flex flex-shrink-0" style={{ width: 18, height: 18, borderRadius: 4, overflow: "hidden" }}>
                      {p.chartColors.slice(0, 3).map((c, i) => <span key={i} className="flex-1 h-full" style={{ background: c }} />)}
                    </span>
                    <span className="text-2xs font-medium truncate" style={{ color: "#5c3f13" }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="px-1 mb-1.5 font-bold uppercase tracking-widest" style={TS}>Widgets</p>
          {SUPPORTED_WIDGET_TYPES.map(item => (
            <button key={item.value} onClick={() => addWidget(item.value)}
              title={item.description}
              className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md mb-1 text-left transition-all"
              style={{ border: BRD, background: "#fff" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#d2a05c"; e.currentTarget.style.background = "#fbf3e7"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8d8be"; e.currentTarget.style.background = "#fff"; }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ background: "#fbf3e7", color: "#c48a42" }}>
                <i className={`ti ${item.icon}`} />
              </div>
              <span className="flex-1 min-w-0">
                <span className="text-xs font-medium block" style={{ color: "#5c3f13" }}>{item.label}</span>
                <span className="text-2xs leading-snug block" style={{ color: "#a06d28" }}>{item.description}</span>
              </span>
            </button>
          ))}
          {fields.length === 0 && (
            <p className="text-xs mt-3 px-1" style={{ color: "#a06d28" }}>
              Esta pesquisa ainda não tem campos no formulário — os widgets vão ficar vazios até você criar perguntas.
            </p>
          )}

          <p className="px-1 mb-1.5 mt-3 font-bold uppercase tracking-widest" style={TS}>Decorativos</p>
          <div className="flex gap-1.5">
            {DECORATIVE_PRESETS.map(preset => (
              <button key={preset.variant} onClick={() => addDecorative(preset)}
                title={preset.label}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-md"
                style={{ border: BRD, background: "#fff" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fbf3e7"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                <i className={`ti ${preset.icon} text-sm`} style={{ color: "#c48a42" }} />
                <span className="text-2xs font-medium" style={{ color: "#5c3f13" }}>{preset.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto p-5" style={{ background: "#f3e4cb" }}>
          {!loaded ? (
            <p className="text-xs" style={{ color: "#a06d28" }}>Carregando...</p>
          ) : widgets.length === 0 ? (
            <div className="max-w-2xl mx-auto py-10">
              <div className="text-center mb-6">
                <i className="ti ti-layout-grid text-3xl block mb-2" style={{ color: "#d9bb8c" }} />
                <p className="text-sm font-semibold mb-1" style={{ color: "#5c3f13" }}>Comece com um modelo, ou monte do zero</p>
                <p className="text-xs" style={{ color: "#a06d28" }}>Um modelo só define tipo e posição — você liga os campos da sua pesquisa depois</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)}
                    className="p-4 rounded-xl text-left transition-all"
                    style={{ border: BRD, background: "#fff" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#d2a05c"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8d8be"; }}>
                    <i className={`ti ${t.icon} text-xl block mb-2`} style={{ color: "#c48a42" }} />
                    <p className="text-xs font-bold mb-1" style={{ color: "#5c3f13" }}>{t.label}</p>
                    <p className="text-2xs leading-snug" style={{ color: "#a06d28" }}>{t.description}</p>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs mt-6" style={{ color: "#a06d28" }}>
                Ou clique em um tipo de widget no painel esquerdo pra montar do zero
              </p>
            </div>
          ) : (
            <div ref={canvasRef} className="relative rounded-xl" style={{
              height: totalHeightPx, background: "#fff", border: BRD,
              // Grade sutil de fundo — só referência visual solta agora, não
              // trava mais o posicionamento (isso é livre, com guias via
              // react-moveable abaixo).
              backgroundImage: `repeating-linear-gradient(to right, transparent, transparent calc(${100 / GRID_COLUMNS}% - 1px), #f3e4cb calc(${100 / GRID_COLUMNS}% - 1px), #f3e4cb ${100 / GRID_COLUMNS}%), repeating-linear-gradient(to bottom, transparent, transparent ${GRID_ROW - 1}px, #f3e4cb ${GRID_ROW - 1}px, #f3e4cb ${GRID_ROW}px)`,
            }}
              onClick={e => { if (e.target === e.currentTarget) setSelectedIds(new Set()); }}>
              {widgets.map(w => (
                <GridWidget
                  key={w.id}
                  widget={w}
                  selected={selectedIds.has(w.id)}
                  data={computeWidgetData({ type: w.type, config: w.config }, fields, responses)}
                  palette={dashboardPalette}
                  registerRef={registerWidgetRef(w.id)}
                  onSelect={additive => selectWidget(w.id, additive)}
                  onDelete={() => deleteWidget(w.id)}
                />
              ))}
              {selectedIdsArray.length === 1 && widgetRefs.current.get(selectedIdsArray[0]) && (
                <Moveable
                  target={widgetRefs.current.get(selectedIdsArray[0])!}
                  draggable
                  resizable
                  keepRatio={false}
                  snappable
                  snapCenter
                  snapGap
                  isDisplaySnapDigit
                  snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
                  elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
                  elementGuidelines={Array.from(widgetRefs.current.entries())
                    .filter(([wid]) => wid !== selectedIdsArray[0])
                    .map(([, el]) => el)}
                  onDrag={({ target, left, top }: any) => {
                    target.style.left = `${left}px`;
                    target.style.top = `${top}px`;
                  }}
                  onDragEnd={({ lastEvent }: any) => {
                    if (!lastEvent) return;
                    pushHistory();
                    commitDrag(selectedIdsArray[0], lastEvent.left, lastEvent.top);
                  }}
                  onResize={({ target, width, height, drag }: any) => {
                    target.style.width = `${width}px`;
                    target.style.height = `${height}px`;
                    target.style.left = `${drag.left}px`;
                    target.style.top = `${drag.top}px`;
                  }}
                  onResizeEnd={({ lastEvent }: any) => {
                    if (!lastEvent) return;
                    pushHistory();
                    commitResize(selectedIdsArray[0], lastEvent.width, lastEvent.height, lastEvent.drag.left, lastEvent.drag.top);
                  }}
                />
              )}
              {selectedIdsArray.length > 1 && (
                <Moveable
                  target={selectedIdsArray.map(id => widgetRefs.current.get(id)).filter((el): el is HTMLDivElement => !!el)}
                  draggable
                  resizable
                  keepRatio={false}
                  snappable
                  onDragGroup={({ events }: any) => {
                    events.forEach((ev: any) => { ev.target.style.left = `${ev.left}px`; ev.target.style.top = `${ev.top}px`; });
                  }}
                  onDragGroupEnd={({ events }: any) => {
                    if (events.some((ev: any) => ev.lastEvent)) pushHistory();
                    events.forEach((ev: any) => {
                      if (!ev.lastEvent) return;
                      const id = findWidgetIdByEl(ev.target as HTMLElement);
                      if (id) commitDrag(id, ev.lastEvent.left, ev.lastEvent.top);
                    });
                  }}
                  onResizeGroup={({ events }: any) => {
                    events.forEach((ev: any) => {
                      ev.target.style.width = `${ev.width}px`;
                      ev.target.style.height = `${ev.height}px`;
                      ev.target.style.left = `${ev.drag.left}px`;
                      ev.target.style.top = `${ev.drag.top}px`;
                    });
                  }}
                  onResizeGroupEnd={({ events }: any) => {
                    if (events.some((ev: any) => ev.lastEvent)) pushHistory();
                    events.forEach((ev: any) => {
                      if (!ev.lastEvent) return;
                      const id = findWidgetIdByEl(ev.target as HTMLElement);
                      if (id) commitResize(id, ev.lastEvent.width, ev.lastEvent.height, ev.lastEvent.drag.left, ev.lastEvent.drag.top);
                    });
                  }}
                />
              )}
            </div>
          )}
        </main>

        {/* Painel direito — inspetor */}
        <aside className="w-64 flex-shrink-0 overflow-hidden flex flex-col" style={{ background: "#fbf3e7", borderLeft: BRD }}>
          <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: BRD }}>
            <i className="ti ti-settings text-sm" style={{ color: "#c48a42" }} />
            <span className="text-xs font-bold" style={{ color: "#5c3f13" }}>Propriedades</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {selectedIdsArray.length > 1 ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold" style={{ color: "#5c3f13" }}>{selectedIdsArray.length} widgets selecionados</p>
                <p className="text-2xs" style={{ color: "#a06d28" }}>Shift+clique adiciona ou remove da seleção. Arraste/redimensione juntos.</p>
                <button onClick={deleteSelected}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
                  style={{ border: "1px solid #f0b8ab", background: "#fdf0ee", color: "#c0392b" }}>
                  <i className="ti ti-trash" /> Remover selecionados
                </button>
              </div>
            ) : selectedWidget ? (
              <WidgetInspector
                widget={selectedWidget}
                fields={fields}
                onUpdate={patch => updateWidget(selectedWidget.id, patch)}
                onUpdateConfig={patch => updateConfig(selectedWidget.id, patch)}
                onDelete={() => deleteWidget(selectedWidget.id)}
              />
            ) : (
              <p className="text-xs" style={{ color: "#a06d28" }}>Selecione um widget no canvas pra editar. Shift+clique seleciona vários.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Widget posicionado na grade livre ────────────────────────────────────
// Arrastar/redimensionar são feitos pelo <Moveable> (react-moveable) que o
// componente pai liga a este elemento quando ele está selecionado — este
// componente só se posiciona a partir de x/y/w/h e expõe seu ref.

function GridWidget({
  widget, selected, data, palette, registerRef, onSelect, onDelete,
}: {
  widget: WidgetDraft; selected: boolean; data: ReturnType<typeof computeWidgetData>; palette: string;
  registerRef: (el: HTMLDivElement | null) => void;
  onSelect: (additive: boolean) => void; onDelete: () => void;
}) {
  const style: React.CSSProperties = {
    position: "absolute",
    left:   `${widget.x}%`,
    top:    widget.y,
    width:  `${widget.w}%`,
    height: widget.h,
    zIndex: selected ? 10 : 1,
    border: selected ? "2px solid #c48a42" : BRD,
    boxShadow: selected ? "0 0 0 3px rgba(196,138,66,0.1)" : "none",
    background: "#fff",
  };

  return (
    <div ref={registerRef} style={style} className="rounded-lg" onClick={e => { e.stopPropagation(); onSelect(e.shiftKey); }}>
      {selected && (
        <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-2.5 -right-2.5 w-5 h-5 flex items-center justify-center rounded-full z-20"
          style={{ background: "#c0392b", color: "#fff" }} aria-label="Remover widget">
          <i className="ti ti-x text-xs" />
        </button>
      )}
      <div className="absolute inset-0">
        <WidgetRenderer type={widget.type} title={widget.title} data={data} config={widget.config} palette={palette} />
      </div>
    </div>
  );
}

// ─── Inspetor de propriedades ─────────────────────────────────────────────

function WidgetInspector({
  widget, fields, onUpdate, onUpdateConfig, onDelete,
}: {
  widget: WidgetDraft; fields: FormField[];
  onUpdate: (patch: Partial<WidgetDraft>) => void;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const label = { className: "text-xs font-semibold mb-1 block", style: { color: "#5c3f13" } };
  const input = "w-full px-2.5 py-1.5 text-xs rounded-md focus:outline-none";
  const inputStyle = { border: BRD, background: "#fff", color: "#111" };

  const choiceFields = useMemo(() => fields.filter(f => (CHOICE_FIELD_TYPES as readonly string[]).includes(f.type)), [fields]);
  const numericFields = useMemo(() => fields.filter(f => (NUMERIC_FIELD_TYPES as readonly string[]).includes(f.type)), [fields]);
  const questionFields = useMemo(() => fields.filter(f => f.type !== "section" && f.type !== "instruction"), [fields]);
  const geoStateFields = useMemo(() => fields.filter(f => f.type === "geo_state"), [fields]);
  const geoCityFields = useMemo(() => fields.filter(f => f.type === "geo_city"), [fields]);
  const geoCoordsFields = useMemo(() => fields.filter(f => f.type === "geo_coords"), [fields]);

  const heatmapIndicators = (Array.isArray(widget.config.indicators) ? widget.config.indicators : []) as HeatmapIndicatorConfig[];
  function updateHeatmapIndicator(index: number, patch: Partial<HeatmapIndicatorConfig>) {
    onUpdateConfig({ indicators: heatmapIndicators.map((ind, i) => i === index ? { ...ind, ...patch } : ind) });
  }
  function removeHeatmapIndicator(index: number) {
    onUpdateConfig({ indicators: heatmapIndicators.filter((_, i) => i !== index) });
  }
  function addHeatmapIndicator() {
    onUpdateConfig({ indicators: [...heatmapIndicators, { key: crypto.randomUUID(), label: `Indicador ${heatmapIndicators.length + 1}`, mode: "count" as const }] });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label {...label}>Título do widget</label>
        <input className={input} style={inputStyle} value={widget.title} onChange={e => onUpdate({ title: e.target.value })} />
      </div>

      {widget.type === "number_card" && (
        <>
          <div>
            <label {...label}>Cálculo</label>
            <select className={input} style={inputStyle} value={(widget.config.aggregation as string) ?? "count"}
              onChange={e => onUpdateConfig({ aggregation: e.target.value })}>
              <option value="count">Contagem de respostas</option>
              <option value="count_completed">Contagem de respostas completas</option>
              <option value="avg">Média</option>
              <option value="sum">Soma</option>
              <option value="min">Mínimo</option>
              <option value="max">Máximo</option>
            </select>
          </div>
          {(widget.config.aggregation === "avg" || widget.config.aggregation === "sum" || widget.config.aggregation === "min" || widget.config.aggregation === "max") && (
            <div>
              <label {...label}>Campo numérico</label>
              <select className={input} style={inputStyle} value={(widget.config.fieldId as string) ?? ""}
                onChange={e => onUpdateConfig({ fieldId: e.target.value || undefined })}>
                <option value="">Selecione...</option>
                {numericFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label {...label}>Sufixo (opcional)</label>
            <input className={input} style={inputStyle} value={(widget.config.suffix as string) ?? ""} placeholder="ex: respostas, kg, %"
              onChange={e => onUpdateConfig({ suffix: e.target.value || undefined })} />
          </div>
        </>
      )}

      {(widget.type === "bar_chart" || widget.type === "pie_chart" || widget.type === "donut_chart") && (
        <>
          <div>
            <label {...label}>Campo de escolha</label>
            <select className={input} style={inputStyle} value={(widget.config.fieldId as string) ?? ""}
              onChange={e => onUpdateConfig({ fieldId: e.target.value || undefined })}>
              <option value="">Selecione...</option>
              {choiceFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            {choiceFields.length === 0 && <p className="text-xs mt-1" style={{ color: "#a06d28" }}>Nenhum campo de escolha (múltipla escolha, sim/não etc.) neste formulário ainda.</p>}
          </div>
          <div>
            <label {...label}>Ordenar por</label>
            <select className={input} style={inputStyle} value={(widget.config.sortBy as string) ?? "option_order"}
              onChange={e => onUpdateConfig({ sortBy: e.target.value })}>
              <option value="option_order">Ordem das opções</option>
              <option value="count_desc">Mais respondidas primeiro</option>
            </select>
          </div>
        </>
      )}

      {widget.type === "table" && (
        <>
          <div>
            <label {...label}>Colunas</label>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto rounded-md p-1.5" style={{ border: BRD, background: "#fff" }}>
              {questionFields.map(f => {
                const fieldIds = (widget.config.fieldIds as string[]) ?? [];
                const checked = fieldIds.includes(f.id);
                return (
                  <label key={f.id} className="flex items-center gap-1.5 text-xs" style={{ color: "#5c3f13" }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => onUpdateConfig({ fieldIds: checked ? fieldIds.filter(id => id !== f.id) : [...fieldIds, f.id] })} />
                    {f.label}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label {...label}>Só respostas completas</label>
            <input type="checkbox" checked={(widget.config.onlyCompleted as boolean) ?? true}
              onChange={e => onUpdateConfig({ onlyCompleted: e.target.checked })} />
          </div>
        </>
      )}

      {widget.type === "text" && (() => {
        const variant = (widget.config.variant as string) ?? "text";
        const textStyle = (widget.config.textStyle ?? {}) as { fontSize?: number; fontWeight?: "normal" | "bold"; fontFamily?: "sans" | "serif"; color?: string; align?: "left" | "center" | "right" };
        const updateTextStyle = (patch: Record<string, unknown>) => onUpdateConfig({ textStyle: { ...textStyle, ...patch } });
        return (
          <>
            <div>
              <label {...label}>Tipo</label>
              <select className={input} style={inputStyle} value={variant} onChange={e => onUpdateConfig({ variant: e.target.value })}>
                <option value="text">Texto</option>
                <option value="divider">Divisória</option>
                <option value="block">Bloco de cor</option>
                <option value="icon">Ícone</option>
              </select>
            </div>
            {variant === "text" && (
              <>
                <div>
                  <label {...label}>Conteúdo</label>
                  <textarea className={input} style={{ ...inputStyle, resize: "vertical" }} rows={4}
                    value={(widget.config.content as string) ?? ""} onChange={e => onUpdateConfig({ content: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label {...label}>Tamanho da fonte</label>
                    <input type="number" min={10} max={72} className={input} style={inputStyle}
                      value={textStyle.fontSize ?? 14} onChange={e => updateTextStyle({ fontSize: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label {...label}>Peso</label>
                    <select className={input} style={inputStyle} value={textStyle.fontWeight ?? "normal"}
                      onChange={e => updateTextStyle({ fontWeight: e.target.value })}>
                      <option value="normal">Normal</option>
                      <option value="bold">Negrito</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label {...label}>Fonte</label>
                  <select className={input} style={inputStyle} value={textStyle.fontFamily ?? "sans"}
                    onChange={e => updateTextStyle({ fontFamily: e.target.value })}>
                    <option value="sans">Regular</option>
                    <option value="serif">Serifada (títulos, destaques)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label {...label}>Cor do texto</label>
                    <input type="color" className="w-full h-8 rounded-md" style={{ border: BRD }}
                      value={textStyle.color ?? "#111111"} onChange={e => updateTextStyle({ color: e.target.value })} />
                  </div>
                  <div>
                    <label {...label}>Alinhamento</label>
                    <select className={input} style={inputStyle} value={textStyle.align ?? "left"}
                      onChange={e => updateTextStyle({ align: e.target.value })}>
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            {variant === "divider" && (
              <div>
                <label {...label}>Cor da linha</label>
                <input type="color" className="w-full h-8 rounded-md" style={{ border: BRD }}
                  value={textStyle.color ?? "#e8d8be"} onChange={e => updateTextStyle({ color: e.target.value })} />
              </div>
            )}
            {variant === "icon" && (
              <>
                <div>
                  <label {...label}>Ícone</label>
                  <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-md max-h-32 overflow-y-auto" style={{ border: BRD, background: "#fff" }}>
                    {DECORATIVE_ICON_OPTIONS.map(opt => {
                      const active = (widget.config.iconName as string) === opt.name;
                      return (
                        <button key={opt.name} title={opt.label} onClick={() => onUpdateConfig({ iconName: opt.name })}
                          className="aspect-square flex items-center justify-center rounded-md text-base"
                          style={{ border: active ? "2px solid #c48a42" : "1px solid transparent", color: "#5c3f13", background: active ? "#fbf3e7" : "transparent" }}>
                          <i className={`ti ti-${opt.name}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label {...label}>Tamanho</label>
                    <input type="number" min={12} max={96} className={input} style={inputStyle}
                      value={textStyle.fontSize ?? 32} onChange={e => updateTextStyle({ fontSize: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label {...label}>Cor</label>
                    <input type="color" className="w-full h-8 rounded-md" style={{ border: BRD }}
                      value={textStyle.color ?? "#c48a42"} onChange={e => updateTextStyle({ color: e.target.value })} />
                  </div>
                </div>
              </>
            )}
          </>
        );
      })()}

      {/* Aparência — fundo/borda, vale pra qualquer tipo de widget */}
      {(() => {
        const appearance = (widget.config.style ?? {}) as { backgroundColor?: string; borderRadius?: number };
        const updateAppearance = (patch: Record<string, unknown>) => onUpdateConfig({ style: { ...appearance, ...patch } });
        const isBlock = widget.type === "text" && widget.config.variant === "block";
        return (
          <div className="pt-2" style={{ borderTop: BRD }}>
            <label {...label}>{isBlock ? "Cor do bloco" : "Cor de fundo"}</label>
            <div className="flex items-center gap-2 mb-2">
              <input type="color" className="w-10 h-8 rounded-md flex-shrink-0" style={{ border: BRD }}
                value={appearance.backgroundColor ?? "#ffffff"} onChange={e => updateAppearance({ backgroundColor: e.target.value })} />
              {appearance.backgroundColor && (
                <button onClick={() => updateAppearance({ backgroundColor: undefined })} className="text-2xs font-semibold" style={{ color: "#a06d28" }}>
                  Remover
                </button>
              )}
            </div>
            {!isBlock && (
              <>
                <label {...label}>Borda arredondada</label>
                <input type="range" min={0} max={32} className="w-full"
                  value={appearance.borderRadius ?? 8} onChange={e => updateAppearance({ borderRadius: Number(e.target.value) })} />
              </>
            )}
          </div>
        );
      })()}

      {widget.type === "image" && (
        <ImageWidgetFields config={widget.config} onUpdateConfig={onUpdateConfig} />
      )}

      {widget.type === "map" && (() => {
        const categoryFieldId = (widget.config.categoryFieldId as string) ?? "";
        const categoryField = fields.find(f => f.id === categoryFieldId);
        const categoryOptions = categoryField
          ? (categoryField.type === "yes_no" ? [{ id: "Sim", label: "Sim" }, { id: "Não", label: "Não" }]
            : ((categoryField.config as { options?: { id: string; label: string }[] } | null)?.options ?? []))
          : [];
        const categoryStyles = (widget.config.categoryStyles ?? {}) as Record<string, { icon?: string; color?: string }>;
        function updateCategoryStyle(optionId: string, patch: { icon?: string; color?: string }) {
          onUpdateConfig({ categoryStyles: { ...categoryStyles, [optionId]: { ...categoryStyles[optionId], ...patch } } });
        }
        return (
          <>
            <div>
              <label {...label}>Campo de coordenadas</label>
              <select className={input} style={inputStyle} value={(widget.config.geoFieldId as string) ?? ""}
                onChange={e => onUpdateConfig({ geoFieldId: e.target.value || undefined })}>
                <option value="">Selecione...</option>
                {geoCoordsFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              {geoCoordsFields.length === 0 && <p className="text-xs mt-1" style={{ color: "#a06d28" }}>Nenhum campo de coordenadas (GPS) neste formulário ainda.</p>}
            </div>
            <div>
              <label {...label}>Categorizar marcador por (opcional)</label>
              <select className={input} style={inputStyle} value={categoryFieldId}
                onChange={e => onUpdateConfig({ categoryFieldId: e.target.value || undefined, categoryStyles: undefined })}>
                <option value="">Sem categoria (círculo padrão)</option>
                {choiceFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            {categoryField && categoryOptions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label {...label} className="mb-0">Ícone e cor por opção</label>
                {categoryOptions.map(opt => (
                  <div key={opt.id} className="flex items-center gap-1.5 p-1.5 rounded-md" style={{ border: BRD, background: "#fff" }}>
                    <span className="text-xs flex-1 truncate" style={{ color: "#5c3f13" }}>{opt.label}</span>
                    <select className="text-xs rounded-md px-1 py-1" style={inputStyle} value={categoryStyles[opt.id]?.icon ?? "map-pin"}
                      onChange={e => updateCategoryStyle(opt.id, { icon: e.target.value })}>
                      {DECORATIVE_ICON_OPTIONS.map(ic => <option key={ic.name} value={ic.name}>{ic.label}</option>)}
                    </select>
                    <input type="color" className="w-8 h-7 rounded-md flex-shrink-0" style={{ border: BRD }}
                      value={categoryStyles[opt.id]?.color ?? "#c48a42"} onChange={e => updateCategoryStyle(opt.id, { color: e.target.value })} />
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {widget.type === "heatmap" && (() => {
        const granularity = (widget.config.granularity as string) ?? "state";
        const isCity = granularity === "city";
        const geoOptions = isCity ? geoCityFields : geoStateFields;
        return (
          <>
            <div>
              <label {...label}>Granularidade</label>
              <select className={input} style={inputStyle} value={granularity}
                onChange={e => onUpdateConfig({ granularity: e.target.value, geoFieldId: undefined })}>
                <option value="state">Por estado (27 polígonos)</option>
                <option value="city">Por município (mapa mais pesado de carregar)</option>
              </select>
            </div>
            <div>
              <label {...label}>{isCity ? "Campo de cidade" : "Campo de estado"}</label>
              <select className={input} style={inputStyle} value={(widget.config.geoFieldId as string) ?? ""}
                onChange={e => onUpdateConfig({ geoFieldId: e.target.value || undefined })}>
                <option value="">Selecione...</option>
                {geoOptions.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              {geoOptions.length === 0 && <p className="text-xs mt-1" style={{ color: "#a06d28" }}>Nenhum campo de {isCity ? "cidade" : "estado"} neste formulário ainda.</p>}
              {isCity && geoStateFields.length === 0 && <p className="text-xs mt-1" style={{ color: "#c0392b" }}>Precisa também de um campo de estado (UF) no mesmo formulário, pra resolver o município certo.</p>}
            </div>

            <div>
            <div className="flex items-center justify-between mb-1">
              <label {...label} className="mb-0">Indicadores (o mapa deixa trocar entre eles)</label>
            </div>
            {heatmapIndicators.map((ind, i) => {
              const rowField = fields.find(f => f.id === ind.fieldId);
              const rowOptions = rowField
                ? (rowField.type === "yes_no" ? [{ id: "Sim", label: "Sim" }, { id: "Não", label: "Não" }]
                  : ((rowField.config as { options?: { id: string; label: string }[] } | null)?.options ?? []))
                : [];
              return (
                <div key={ind.key} className="p-2 rounded-md mb-1.5" style={{ border: BRD, background: "#fff" }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <input className={input} style={inputStyle} value={ind.label}
                      placeholder="Nome do indicador"
                      onChange={e => updateHeatmapIndicator(i, { label: e.target.value })} />
                    <button onClick={() => removeHeatmapIndicator(i)} className="flex-shrink-0 text-gray-300 hover:text-red-400">
                      <i className="ti ti-x text-xs" />
                    </button>
                  </div>
                  <select className={input} style={{ ...inputStyle, marginBottom: "6px" }} value={ind.mode}
                    onChange={e => updateHeatmapIndicator(i, { mode: e.target.value as "count" | "choice_percent", fieldId: undefined, optionId: undefined })}>
                    <option value="count">Volume de respostas</option>
                    <option value="choice_percent">% de respostas com uma opção específica</option>
                  </select>
                  {ind.mode === "choice_percent" && (
                    <>
                      <select className={input} style={{ ...inputStyle, marginBottom: "6px" }} value={ind.fieldId ?? ""}
                        onChange={e => updateHeatmapIndicator(i, { fieldId: e.target.value || undefined, optionId: undefined })}>
                        <option value="">Campo indicador...</option>
                        {choiceFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                      {rowField && (
                        <select className={input} style={inputStyle} value={ind.optionId ?? ""}
                          onChange={e => updateHeatmapIndicator(i, { optionId: e.target.value || undefined })}>
                          <option value="">Opção a medir...</option>
                          {rowOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <button onClick={addHeatmapIndicator}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold"
              style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
              <i className="ti ti-plus" /> Adicionar indicador
            </button>
            </div>
          </>
        );
      })()}

      {widget.type === "crosstab" && (
        <>
          <div>
            <label {...label}>Categoria A (linhas)</label>
            <select className={input} style={inputStyle} value={(widget.config.fieldIdRows as string) ?? ""}
              onChange={e => onUpdateConfig({ fieldIdRows: e.target.value || undefined })}>
              <option value="">Selecione...</option>
              {choiceFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label {...label}>Categoria B (colunas)</label>
            <select className={input} style={inputStyle} value={(widget.config.fieldIdCols as string) ?? ""}
              onChange={e => onUpdateConfig({ fieldIdCols: e.target.value || undefined })}>
              <option value="">Selecione...</option>
              {choiceFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            {choiceFields.length === 0 && <p className="text-xs mt-1" style={{ color: "#a06d28" }}>Nenhum campo de escolha neste formulário ainda.</p>}
          </div>
          <div>
            <label {...label}>Mostrar</label>
            <select className={input} style={inputStyle} value={(widget.config.valueMode as string) ?? "count"}
              onChange={e => onUpdateConfig({ valueMode: e.target.value })}>
              <option value="count">Contagem</option>
              <option value="row_percent">% da linha</option>
              <option value="col_percent">% da coluna</option>
            </select>
          </div>
        </>
      )}

      {widget.type === "globe" && (() => {
        const mode = (widget.config.mode as string) ?? "points";
        return (
          <>
            <div>
              <label {...label}>Modo</label>
              <select className={input} style={inputStyle} value={mode} onChange={e => onUpdateConfig({ mode: e.target.value })}>
                <option value="points">Marcadores por resposta (GPS)</option>
                <option value="heatmap">Mapa de calor por estado</option>
              </select>
            </div>
            {mode === "points" && (
              <div>
                <label {...label}>Campo de coordenadas</label>
                <select className={input} style={inputStyle} value={(widget.config.geoFieldId as string) ?? ""}
                  onChange={e => onUpdateConfig({ geoFieldId: e.target.value || undefined })}>
                  <option value="">Selecione...</option>
                  {geoCoordsFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {geoCoordsFields.length === 0 && <p className="text-xs mt-1" style={{ color: "#a06d28" }}>Nenhum campo de coordenadas (GPS) neste formulário ainda.</p>}
              </div>
            )}
            {mode === "heatmap" && (
              <div>
                <label {...label}>Campo de estado</label>
                <select className={input} style={inputStyle} value={(widget.config.geoFieldId as string) ?? ""}
                  onChange={e => onUpdateConfig({ geoFieldId: e.target.value || undefined })}>
                  <option value="">Selecione...</option>
                  {geoStateFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {geoStateFields.length === 0 && <p className="text-xs mt-1" style={{ color: "#a06d28" }}>Nenhum campo de estado neste formulário ainda.</p>}
                <p className="text-2xs mt-2" style={{ color: "#a06d28" }}>Usa o volume de respostas por estado — pra indicadores por opção, monte primeiro um widget de mapa de calor 2D e depois troque pra &ldquo;Globo 3D&rdquo;.</p>
              </div>
            )}
          </>
        );
      })()}

      <button onClick={onDelete}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold mt-2"
        style={{ border: "1px solid #f0b8ab", background: "#fdf0ee", color: "#c0392b" }}>
        <i className="ti ti-trash" /> Remover widget
      </button>
    </div>
  );
}

// ─── Widget de imagem — upload + modo de encaixe ──────────────────────────

interface LibraryAsset {
  id: string; name: string; imageUrl: string; isShared: boolean;
}

function ImageWidgetFields({
  config, onUpdateConfig,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
}) {
  const [tab, setTab] = useState<"upload" | "mine" | "community">("upload");
  const [uploading, setUploading] = useState(false);
  const [shareOnUpload, setShareOnUpload] = useState(false);
  const [mineAssets, setMineAssets] = useState<LibraryAsset[] | null>(null);
  const [communityAssets, setCommunityAssets] = useState<LibraryAsset[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageUrl = (config.imageUrl as string) ?? "";
  const fit = (config.fit as string) ?? "cover";

  useEffect(() => {
    if (tab === "mine" && mineAssets === null) {
      fetch("/api/assets").then(r => r.json()).then(j => setMineAssets(j.data ?? [])).catch(() => setMineAssets([]));
    }
    if (tab === "community" && communityAssets === null) {
      fetch("/api/assets/community").then(r => r.json()).then(j => setCommunityAssets(j.data ?? [])).catch(() => setCommunityAssets([]));
    }
  }, [tab, mineAssets, communityAssets]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    resizeImageToDataUrl(file, 1200)
      .then(dataUrl => {
        onUpdateConfig({ imageUrl: dataUrl });
        // Todo envio vira reaproveitável na biblioteca pessoal, sem passo
        // extra — só o compartilhamento com a comunidade é opt-in.
        const name = (file.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Imagem sem nome");
        return fetch("/api/assets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, imageUrl: dataUrl, isShared: shareOnUpload }),
        });
      })
      .then(() => setMineAssets(null))
      .finally(() => setUploading(false));
  }

  function pickAsset(asset: LibraryAsset) {
    onUpdateConfig({ imageUrl: asset.imageUrl });
  }

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)}
      className="flex-1 py-1.5 text-2xs font-semibold"
      style={{ background: tab === t ? "#c48a42" : "#fff", color: tab === t ? "#fff" : "#5c3f13" }}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold mb-1 block" style={{ color: "#5c3f13" }}>Imagem</label>
      {imageUrl && (
        <div className="relative h-24 rounded-md overflow-hidden" style={{ border: BRD }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- preview de base64 gerado no cliente */}
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: fit === "contain" ? "contain" : "cover" }} />
        </div>
      )}

      <div className="flex rounded-md overflow-hidden" style={{ border: BRD }}>
        {tabBtn("upload", "Enviar")}
        {tabBtn("mine", "Minha biblioteca")}
        {tabBtn("community", "Comunidade")}
      </div>

      {tab === "upload" && (
        <>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
            style={{ border: BRD, background: "#fff", color: "#5c3f13" }}>
            <i className={`ti ${uploading ? "ti-loader-2 animate-spin" : "ti-upload"}`} />
            {imageUrl ? "Trocar imagem" : "Enviar imagem"}
          </button>
          <label className="flex items-center gap-1.5 text-2xs" style={{ color: "#5c3f13" }}>
            <input type="checkbox" checked={shareOnUpload} onChange={e => setShareOnUpload(e.target.checked)} />
            Compartilhar com a comunidade Dataº (outros pesquisadores podem usar)
          </label>
        </>
      )}

      {tab === "mine" && (
        <AssetGrid assets={mineAssets} onPick={pickAsset} emptyMessage="Você ainda não tem imagens salvas — envie uma na aba &quot;Enviar&quot;." />
      )}

      {tab === "community" && (
        <AssetGrid assets={communityAssets} onPick={pickAsset} emptyMessage="Nenhuma imagem compartilhada pela comunidade ainda." />
      )}

      {imageUrl && (
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "#5c3f13" }}>Encaixe</label>
          <select className="w-full px-2.5 py-1.5 text-xs rounded-md focus:outline-none" style={{ border: BRD, background: "#fff", color: "#111" }}
            value={fit} onChange={e => onUpdateConfig({ fit: e.target.value })}>
            <option value="cover">Preencher (corta as bordas)</option>
            <option value="contain">Encaixar (mostra a imagem inteira)</option>
          </select>
        </div>
      )}
    </div>
  );
}

function AssetGrid({
  assets, onPick, emptyMessage,
}: {
  assets: LibraryAsset[] | null;
  onPick: (asset: LibraryAsset) => void;
  emptyMessage: string;
}) {
  if (assets === null) {
    return <p className="text-2xs" style={{ color: "#a06d28" }}>Carregando...</p>;
  }
  if (assets.length === 0) {
    return <p className="text-2xs" style={{ color: "#a06d28" }}>{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 rounded-md" style={{ border: BRD, background: "#fff" }}>
      {assets.map(a => (
        <button key={a.id} onClick={() => onPick(a)} title={a.name}
          className="aspect-square rounded-md overflow-hidden relative"
          style={{ border: BRD }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail de base64 gerado no cliente */}
          <img src={a.imageUrl} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}
