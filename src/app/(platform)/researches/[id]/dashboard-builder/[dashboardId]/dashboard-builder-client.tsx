"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { DataLogo } from "@/components/layout/data-logo";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { computeWidgetData } from "@/lib/dashboard/aggregate";
import { SUPPORTED_WIDGET_TYPES, CHOICE_FIELD_TYPES, NUMERIC_FIELD_TYPES, type SupportedWidgetType } from "@/lib/dashboard/types";
import type { Research, Dashboard, FormField, Response as ResponseRow } from "@/lib/types";

const BRD = "1px solid #e8d8be";
const TS  = { color: "#c48a42", fontSize: "9px" } as const;
const COLUMNS    = 12;
const ROW_HEIGHT = 32; // px por unidade de altura

const DEFAULT_SIZE: Record<SupportedWidgetType, { width: number; height: number }> = {
  number_card:  { width: 3, height: 2 },
  bar_chart:    { width: 6, height: 5 },
  pie_chart:    { width: 5, height: 5 },
  donut_chart:  { width: 5, height: 5 },
  table:        { width: 8, height: 6 },
  text:         { width: 4, height: 2 },
  map:          { width: 6, height: 6 },
  heatmap:      { width: 6, height: 6 },
};

interface WidgetDraft {
  id: string;
  type: SupportedWidgetType;
  title: string;
  col: number; row: number; width: number; height: number;
  config: Record<string, unknown>;
}

function clamp(n: number, min: number, max: number) { return Math.min(Math.max(n, min), max); }

interface SavedWidget {
  id: string; type: string; title: string | null;
  col: number; row: number; width: number; height: number;
  config: unknown;
}

function hydrate(saved: SavedWidget[]): WidgetDraft[] {
  return saved.map(w => ({
    id: w.id, type: w.type as SupportedWidgetType, title: w.title ?? "",
    col: w.col, row: w.row, width: w.width, height: w.height,
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

  const [title,      setTitle]      = useState(dashboard.title);
  const [isPublic,   setIsPublic]   = useState(dashboard.isPublic);
  const [publicSlug, setPublicSlug] = useState(dashboard.publicSlug);
  const [widgets,    setWidgets]    = useState<WidgetDraft[]>([]);
  const [loaded,     setLoaded]     = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt,    setSavedAt]    = useState<string | null>(null);

  const [dashboardTheme,    setDashboardTheme]    = useState(dashboard.theme ?? "light");
  const [dashboardCoverUrl, setDashboardCoverUrl]  = useState(dashboard.coverUrl);
  const [appearanceOpen,    setAppearanceOpen]     = useState(false);
  const [coverUploading,    setCoverUploading]     = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const selectedWidget = widgets.find(w => w.id === selectedId) ?? null;

  const saveAppearance = useCallback(async (patch: { theme?: string; coverUrl?: string | null }) => {
    await fetch(`/api/dashboards/${dashboard.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }, [dashboard.id]);

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setCoverUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        // Redimensiona no cliente antes de guardar (fundo de página tende a
        // ser maior que avatar/capa — evita inchar o banco com base64 gigante).
        const maxWidth = 1600;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setDashboardCoverUrl(dataUrl);
        saveAppearance({ coverUrl: dataUrl }).finally(() => setCoverUploading(false));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function removeCover() {
    setDashboardCoverUrl(null);
    saveAppearance({ coverUrl: null });
  }

  function setTheme(theme: string) {
    setDashboardTheme(theme);
    saveAppearance({ theme });
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
    const size = DEFAULT_SIZE[type];
    const maxRow = widgets.reduce((m, w) => Math.max(m, w.row + w.height), 0);
    const id = crypto.randomUUID();
    setWidgets(prev => [...prev, {
      id, type, title: SUPPORTED_WIDGET_TYPES.find(t => t.value === type)?.label ?? type,
      col: 0, row: maxRow, width: size.width, height: size.height,
      config: type === "number_card" ? { aggregation: "count" }
        : type === "table" ? { fieldIds: [] }
        : type === "heatmap" ? { indicatorMode: "count" }
        : {},
    }]);
    setSelectedId(id);
  }, [widgets]);

  const updateWidget = useCallback((id: string, patch: Partial<WidgetDraft>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
  }, []);

  const updateConfig = useCallback((id: string, configPatch: Record<string, unknown>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, config: { ...w.config, ...configPatch } } : w));
  }, []);

  const deleteWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, delta } = e;
    if (!canvasRef.current || (delta.x === 0 && delta.y === 0)) return;
    const cellWidth = canvasRef.current.getBoundingClientRect().width / COLUMNS;
    const deltaCol = Math.round(delta.x / cellWidth);
    const deltaRow = Math.round(delta.y / ROW_HEIGHT);
    if (deltaCol === 0 && deltaRow === 0) return;
    setWidgets(prev => prev.map(w => w.id === active.id ? {
      ...w,
      col: clamp(w.col + deltaCol, 0, COLUMNS - w.width),
      row: Math.max(0, w.row + deltaRow),
    } : w));
  }, []);

  const startResize = useCallback((e: React.PointerEvent, widgetId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget || !canvasRef.current) return;
    const cellWidth = canvasRef.current.getBoundingClientRect().width / COLUMNS;
    const startX = e.clientX, startY = e.clientY;
    const startWidth = widget.width, startHeight = widget.height, col = widget.col;

    function onMove(ev: PointerEvent) {
      const deltaCol = Math.round((ev.clientX - startX) / cellWidth);
      const deltaRow = Math.round((ev.clientY - startY) / ROW_HEIGHT);
      setWidgets(prev => prev.map(w => w.id === widgetId ? {
        ...w,
        width:  clamp(startWidth + deltaCol, 2, COLUMNS - col),
        height: Math.max(2, startHeight + deltaRow),
      } : w));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [widgets]);

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
            col: w.col, row: w.row, width: w.width, height: w.height,
            config: w.config, order: idx,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { alert("Erro ao salvar: " + (json?.error ?? res.status)); return; }
      setWidgets(hydrate(json.data));
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      alert("Erro de conexão ao salvar: " + String(err));
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

  const totalHeightPx = Math.max(400, widgets.reduce((m, w) => Math.max(m, (w.row + w.height) * ROW_HEIGHT), 0) + ROW_HEIGHT * 2);

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
              <div className="flex rounded-md overflow-hidden" style={{ border: BRD }}>
                {[{ v: "light", l: "Claro" }, { v: "dark", l: "Escuro" }].map(t => (
                  <button key={t.v} onClick={() => setTheme(t.v)}
                    className="flex-1 py-1.5 text-2xs font-semibold"
                    style={{ background: dashboardTheme === t.v ? "#c48a42" : "#fff", color: dashboardTheme === t.v ? "#fff" : "#5c3f13" }}>
                    {t.l}
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
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto p-5" style={{ background: "#f3e4cb" }}>
          {!loaded ? (
            <p className="text-xs" style={{ color: "#a06d28" }}>Carregando...</p>
          ) : widgets.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ border: "2px dashed #d9bb8c", background: "#fbf3e7" }}>
              <i className="ti ti-layout-grid text-3xl block mb-2" style={{ color: "#d9bb8c" }} />
              <p className="text-sm font-semibold mb-1" style={{ color: "#5c3f13" }}>Nenhum widget ainda</p>
              <p className="text-xs" style={{ color: "#a06d28" }}>Clique em um tipo de widget no painel esquerdo pra adicionar</p>
            </div>
          ) : (
            <DndContext onDragEnd={handleDragEnd}>
              <div ref={canvasRef} className="relative rounded-xl" style={{
                height: totalHeightPx, background: "#fff", border: BRD,
                // Grade sutil de fundo (colunas + linhas de altura) — guia visual de
                // alinhamento enquanto arrasta/redimensiona, igual Metabase/Grafana.
                backgroundImage: `repeating-linear-gradient(to right, transparent, transparent calc(${100 / COLUMNS}% - 1px), #f3e4cb calc(${100 / COLUMNS}% - 1px), #f3e4cb ${100 / COLUMNS}%), repeating-linear-gradient(to bottom, transparent, transparent ${ROW_HEIGHT - 1}px, #f3e4cb ${ROW_HEIGHT - 1}px, #f3e4cb ${ROW_HEIGHT}px)`,
              }}>
                {widgets.map(w => (
                  <GridWidget
                    key={w.id}
                    widget={w}
                    selected={w.id === selectedId}
                    data={computeWidgetData({ type: w.type, config: w.config }, fields, responses)}
                    onSelect={() => setSelectedId(w.id)}
                    onResizeStart={e => startResize(e, w.id)}
                    onDelete={() => deleteWidget(w.id)}
                  />
                ))}
              </div>
            </DndContext>
          )}
        </main>

        {/* Painel direito — inspetor */}
        <aside className="w-64 flex-shrink-0 overflow-hidden flex flex-col" style={{ background: "#fbf3e7", borderLeft: BRD }}>
          <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: BRD }}>
            <i className="ti ti-settings text-sm" style={{ color: "#c48a42" }} />
            <span className="text-xs font-bold" style={{ color: "#5c3f13" }}>Propriedades</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {selectedWidget ? (
              <WidgetInspector
                widget={selectedWidget}
                fields={fields}
                onUpdate={patch => updateWidget(selectedWidget.id, patch)}
                onUpdateConfig={patch => updateConfig(selectedWidget.id, patch)}
                onDelete={() => deleteWidget(selectedWidget.id)}
              />
            ) : (
              <p className="text-xs" style={{ color: "#a06d28" }}>Selecione um widget no canvas pra editar.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Widget posicionado na grade ──────────────────────────────────────────

function GridWidget({
  widget, selected, data, onSelect, onResizeStart, onDelete,
}: {
  widget: WidgetDraft; selected: boolean; data: ReturnType<typeof computeWidgetData>;
  onSelect: () => void; onResizeStart: (e: React.PointerEvent) => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: widget.id });

  const cellPercent = 100 / COLUMNS;
  const style: React.CSSProperties = {
    position: "absolute",
    left:   `${widget.col * cellPercent}%`,
    top:    widget.row * ROW_HEIGHT,
    width:  `${widget.width * cellPercent}%`,
    height: widget.height * ROW_HEIGHT,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 20 : selected ? 10 : 1,
    border: selected ? "2px solid #c48a42" : BRD,
    boxShadow: selected ? "0 0 0 3px rgba(196,138,66,0.1)" : isDragging ? "0 8px 20px rgba(0,0,0,0.15)" : "none",
    background: "#fff",
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg" onClick={onSelect}>
      <div {...listeners} {...attributes}
        className="absolute top-0 left-0 right-0 h-5 flex items-center justify-between px-1.5 cursor-grab rounded-t-lg"
        style={{ background: selected ? "#fbf3e7" : "transparent" }}>
        <i className="ti ti-grip-vertical text-xs" style={{ color: "#d9bb8c" }} />
        <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-4 h-4 flex items-center justify-center rounded" style={{ color: "#c0392b" }} aria-label="Remover widget">
          <i className="ti ti-x text-xs" />
        </button>
      </div>
      <div className="absolute inset-0 pt-5">
        <WidgetRenderer type={widget.type} title={widget.title} data={data} config={widget.config} />
      </div>
      <div onPointerDown={onResizeStart}
        className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize" style={{ color: "#d9bb8c" }}>
        <i className="ti ti-corner-down-right-double text-xs" style={{ position: "absolute", bottom: 0, right: 0 }} />
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
  const geoCoordsFields = useMemo(() => fields.filter(f => f.type === "geo_coords"), [fields]);
  const indicatorField = fields.find(f => f.id === widget.config.indicatorFieldId);
  const indicatorOptions = indicatorField ? (indicatorField.type === "yes_no" ? [{ id: "Sim", label: "Sim" }, { id: "Não", label: "Não" }] : ((indicatorField.config as { options?: { id: string; label: string }[] } | null)?.options ?? [])) : [];

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

      {widget.type === "text" && (
        <div>
          <label {...label}>Conteúdo</label>
          <textarea className={input} style={{ ...inputStyle, resize: "vertical" }} rows={5}
            value={(widget.config.content as string) ?? ""} onChange={e => onUpdateConfig({ content: e.target.value })} />
        </div>
      )}

      {widget.type === "map" && (
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

      {widget.type === "heatmap" && (
        <>
          <div>
            <label {...label}>Campo de estado</label>
            <select className={input} style={inputStyle} value={(widget.config.geoFieldId as string) ?? ""}
              onChange={e => onUpdateConfig({ geoFieldId: e.target.value || undefined })}>
              <option value="">Selecione...</option>
              {geoStateFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            {geoStateFields.length === 0 && <p className="text-xs mt-1" style={{ color: "#a06d28" }}>Nenhum campo de estado neste formulário ainda.</p>}
          </div>
          <div>
            <label {...label}>Colorir por</label>
            <select className={input} style={inputStyle} value={(widget.config.indicatorMode as string) ?? "count"}
              onChange={e => onUpdateConfig({ indicatorMode: e.target.value, indicatorFieldId: undefined, indicatorOptionId: undefined })}>
              <option value="count">Volume de respostas</option>
              <option value="choice_percent">% de respostas com uma opção específica</option>
            </select>
          </div>
          {widget.config.indicatorMode === "choice_percent" && (
            <>
              <div>
                <label {...label}>Campo indicador</label>
                <select className={input} style={inputStyle} value={(widget.config.indicatorFieldId as string) ?? ""}
                  onChange={e => onUpdateConfig({ indicatorFieldId: e.target.value || undefined, indicatorOptionId: undefined })}>
                  <option value="">Selecione...</option>
                  {choiceFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              {indicatorField && (
                <div>
                  <label {...label}>Opção a medir</label>
                  <select className={input} style={inputStyle} value={(widget.config.indicatorOptionId as string) ?? ""}
                    onChange={e => onUpdateConfig({ indicatorOptionId: e.target.value || undefined })}>
                    <option value="">Selecione...</option>
                    {indicatorOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </>
      )}

      <button onClick={onDelete}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold mt-2"
        style={{ border: "1px solid #f0b8ab", background: "#fdf0ee", color: "#c0392b" }}>
        <i className="ti ti-trash" /> Remover widget
      </button>
    </div>
  );
}
