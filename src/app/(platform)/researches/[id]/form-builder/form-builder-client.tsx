"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Research } from "@/lib/types";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type FieldType =
  | "short_text" | "long_text" | "single_choice" | "multiple_choice"
  | "scale" | "yes_no" | "date" | "number" | "file" | "signature"
  | "matrix" | "geo_state" | "geo_city" | "geo_coords" | "section" | "instruction";

interface FieldOption { id: string; label: string; }

interface Field {
  id:          string;
  type:        FieldType;
  label:       string;
  description: string;
  required:    boolean;
  options:     FieldOption[];
  scaleMin:    number;
  scaleMax:    number;
}

// ─── Configuração dos tipos de campo ─────────────────────────────────────────

const FIELD_TYPES: {
  group: string;
  items: { type: FieldType; label: string; icon: string; color: string; bg: string }[];
}[] = [
  {
    group: "Básicos",
    items: [
      { type: "short_text",       label: "Texto curto",       icon: "ti-writing",       color: "#1a56db", bg: "#e8f0fe" },
      { type: "long_text",        label: "Texto longo",       icon: "ti-text-size",     color: "#1a56db", bg: "#e8f0fe" },
      { type: "single_choice",    label: "Múltipla escolha",  icon: "ti-list-check",    color: "#534ab7", bg: "#eeedfe" },
      { type: "multiple_choice",  label: "Caixas de seleção", icon: "ti-checkbox",      color: "#534ab7", bg: "#eeedfe" },
      { type: "scale",            label: "Escala numérica",   icon: "ti-star",          color: "#ba7517", bg: "#faeeda" },
      { type: "yes_no",           label: "Sim / Não",         icon: "ti-toggle-right",  color: "#0d9e75", bg: "#e1f5ee" },
    ],
  },
  {
    group: "Avançados",
    items: [
      { type: "date",      label: "Data",              icon: "ti-calendar",  color: "#1a56db", bg: "#e8f0fe" },
      { type: "number",    label: "Número",            icon: "ti-number",    color: "#1a56db", bg: "#e8f0fe" },
      { type: "file",      label: "Upload de arquivo", icon: "ti-upload",    color: "#ba7517", bg: "#faeeda" },
      { type: "signature", label: "Assinatura",        icon: "ti-signature", color: "#534ab7", bg: "#eeedfe" },
      { type: "matrix",    label: "Matriz",            icon: "ti-table",     color: "#534ab7", bg: "#eeedfe" },
    ],
  },
  {
    group: "Geográficos",
    items: [
      { type: "geo_state",  label: "Estado (UF)",   icon: "ti-map",       color: "#0d9e75", bg: "#e1f5ee" },
      { type: "geo_city",   label: "Município",     icon: "ti-building",  color: "#0d9e75", bg: "#e1f5ee" },
      { type: "geo_coords", label: "Lat / Long",    icon: "ti-crosshair", color: "#0d9e75", bg: "#e1f5ee" },
    ],
  },
  {
    group: "Layout",
    items: [
      { type: "section",     label: "Nova seção",    icon: "ti-layout-navbar", color: "#1a56db", bg: "#e8f0fe" },
      { type: "instruction", label: "Instrução",     icon: "ti-info-circle",   color: "#6b7280", bg: "#f3f4f6" },
    ],
  },
];

function getTypeInfo(type: FieldType) {
  for (const group of FIELD_TYPES) {
    const found = group.items.find(i => i.type === type);
    if (found) return found;
  }
  return { label: type, icon: "ti-forms", color: "#6b7280", bg: "#f3f4f6", type };
}

function newField(type: FieldType): Field {
  return {
    id:          Math.random().toString(36).slice(2, 10),
    type,
    label:       type === "section" ? "Nova seção" : type === "instruction" ? "Instrução" : "Nova pergunta",
    description: "",
    required:    false,
    options:     type === "single_choice" || type === "multiple_choice"
      ? [{ id: "1", label: "Opção 1" }, { id: "2", label: "Opção 2" }]
      : [],
    scaleMin: 1,
    scaleMax: 5,
  };
}

// ─── Preview de campo ─────────────────────────────────────────────────────────

function FieldPreview({ field }: { field: Field }) {
  if (field.type === "section") return null;
  if (field.type === "instruction") return (
    <p className="text-xs text-gray-400 italic mt-1">Texto de instrução...</p>
  );

  const cls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400 cursor-not-allowed";

  if (field.type === "short_text") return <div className={cls}>Resposta curta...</div>;
  if (field.type === "long_text")  return <div className={`${cls} h-16`}>Resposta longa...</div>;
  if (field.type === "number")     return <div className={cls}>0</div>;
  if (field.type === "date")       return <div className={cls}>dd/mm/aaaa</div>;
  if (field.type === "file")       return <div className={`${cls} flex items-center gap-2`}><i className="ti ti-upload" /> Selecionar arquivo</div>;
  if (field.type === "signature")  return <div className={`${cls} h-12 flex items-center justify-center`}><i className="ti ti-signature" /> Área de assinatura</div>;
  if (field.type === "geo_state")  return <div className={cls}>Selecione o estado...</div>;
  if (field.type === "geo_city")   return <div className={cls}>Selecione o município...</div>;
  if (field.type === "geo_coords") return <div className={`${cls} flex items-center gap-2`}><i className="ti ti-crosshair" /> Capturar localização GPS</div>;
  if (field.type === "matrix")     return <div className={`${cls} h-14 flex items-center justify-center`}><i className="ti ti-table" /> Matriz de avaliação</div>;

  if (field.type === "yes_no") return (
    <div className="flex gap-2 mt-1">
      {["Sim", "Não"].map(o => (
        <div key={o} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400">
          <div className="w-3 h-3 rounded-full border border-gray-300" /> {o}
        </div>
      ))}
    </div>
  );

  if (field.type === "scale") return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {Array.from({ length: field.scaleMax - field.scaleMin + 1 }, (_, i) => i + field.scaleMin).map(n => (
        <div key={n} className="w-7 h-7 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">{n}</div>
      ))}
    </div>
  );

  if (field.type === "single_choice" || field.type === "multiple_choice") return (
    <div className="flex flex-col gap-1.5 mt-1">
      {field.options.map(opt => (
        <div key={opt.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400">
          <div className={`w-3 h-3 border border-gray-300 flex-shrink-0 ${field.type === "single_choice" ? "rounded-full" : "rounded"}`} />
          {opt.label}
        </div>
      ))}
    </div>
  );

  return null;
}

// ─── Painel direito ───────────────────────────────────────────────────────────

function RightPanel({
  field,
  onUpdate,
  onDelete,
}: {
  field: Field | null;
  onUpdate: (f: Field) => void;
  onDelete: () => void;
}) {
  if (!field) return (
    <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400 text-center px-4">
      <i className="ti ti-click text-3xl opacity-30" />
      <span className="text-xs opacity-60 leading-relaxed">Selecione um campo para editar suas propriedades</span>
    </div>
  );

  const info = getTypeInfo(field.type);

  function update(patch: Partial<Field>) {
    onUpdate({ ...field, ...patch });
  }

  function addOption() {
    update({ options: [...field.options, { id: Math.random().toString(36).slice(2, 8), label: `Opção ${field.options.length + 1}` }] });
  }

  function updateOption(id: string, label: string) {
    update({ options: field.options.map(o => o.id === id ? { ...o, label } : o) });
  }

  function removeOption(id: string) {
    update({ options: field.options.filter(o => o.id !== id) });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-4">

      {/* Tipo */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2">Tipo</p>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-xs text-gray-600">
          <i className={`ti ${info.icon}`} style={{ color: info.color }} />
          {info.label}
        </div>
      </div>

      {/* Label */}
      {field.type !== "section" && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2">Pergunta</p>
          <input
            value={field.label}
            onChange={e => update({ label: e.target.value })}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Digite a pergunta..."
          />
        </div>
      )}

      {/* Descrição */}
      {field.type !== "section" && field.type !== "instruction" && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2">Descrição</p>
          <textarea
            value={field.description}
            onChange={e => update({ description: e.target.value })}
            rows={2}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
            placeholder="Descrição opcional..."
          />
        </div>
      )}

      {/* Obrigatório */}
      {field.type !== "section" && field.type !== "instruction" && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Obrigatório</span>
          <button
            onClick={() => update({ required: !field.required })}
            className={`w-8 h-4 rounded-full relative transition-colors ${field.required ? "bg-brand-500" : "bg-gray-200"}`}
          >
            <span className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${field.required ? "left-4" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {/* Opções */}
      {(field.type === "single_choice" || field.type === "multiple_choice") && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2">Opções</p>
          <div className="flex flex-col gap-1">
            {field.options.map(opt => (
              <div key={opt.id} className="flex items-center gap-1">
                <input
                  value={opt.label}
                  onChange={e => updateOption(opt.id, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button onClick={() => removeOption(opt.id)} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                  <i className="ti ti-x text-xs" />
                </button>
              </div>
            ))}
            <button onClick={addOption} className="mt-1 flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600">
              <i className="ti ti-plus" /> Adicionar opção
            </button>
          </div>
        </div>
      )}

      {/* Escala */}
      {field.type === "scale" && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2">Intervalo</p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Mínimo</p>
              <input type="number" value={field.scaleMin} onChange={e => update({ scaleMin: +e.target.value })}
                className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Máximo</p>
              <input type="number" value={field.scaleMax} onChange={e => update({ scaleMax: +e.target.value })}
                className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
        </div>
      )}

      {/* Deletar */}
      <button onClick={onDelete} className="mt-auto flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
        <i className="ti ti-trash" /> Remover campo
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FormBuilderClient({ research }: { research: Research }) {
  const router = useRouter();
  const [fields,      setFields]      = useState<Field[]>([]);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [savedAt,     setSavedAt]     = useState<string | null>(null);
  const [formTitle,   setFormTitle]   = useState(research.title);
  const [activeTab,   setActiveTab]   = useState<"fields" | "settings">("fields");
  const dragRef = useRef<number | null>(null);

  const selectedField = fields.find(f => f.id === selectedId) ?? null;

  // Adiciona campo
  const addField = useCallback((type: FieldType) => {
    const field = newField(type);
    setFields(prev => [...prev, field]);
    setSelectedId(field.id);
  }, []);

  // Atualiza campo
  const updateField = useCallback((updated: Field) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
  }, []);

  // Remove campo
  const deleteField = useCallback(() => {
    if (!selectedId) return;
    setFields(prev => prev.filter(f => f.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Mover campo
  const moveField = useCallback((fromIdx: number, toIdx: number) => {
    setFields(prev => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  }, []);

  // Salvar
  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/researches/${research.id}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, fields }),
      });
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setSaving(false);
    }
  }, [research.id, formTitle, fields]);

  const questionFields = fields.filter(f => f.type !== "section" && f.type !== "instruction");
  const sectionFields  = fields.filter(f => f.type === "section");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">

      {/* ── TOPBAR ── */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-gray-100 bg-white flex-shrink-0 z-50">
        <button onClick={() => router.push("/dashboard")} className="text-lg font-medium tracking-tight text-gray-900 hover:opacity-80">
          Data<span className="text-brand-500">º</span>
        </button>

        <div className="flex items-center gap-2">
          <input
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            className="text-sm font-medium border-none bg-transparent outline-none text-center border-b-2 border-transparent hover:border-brand-300 focus:border-brand-500 transition-colors min-w-48 px-1"
          />
          {savedAt && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <i className="ti ti-check" /> Salvo às {savedAt}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/researches/${research.id}/respondents`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <i className="ti ti-eye" /> Preview
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-device-floppy"} />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      {/* ── TABS ── */}
      <div className="flex border-b border-gray-100 bg-white px-4 flex-shrink-0">
        {[
          { key: "fields",   icon: "ti-forms",    label: "Perguntas" },
          { key: "settings", icon: "ti-settings",  label: "Configurações" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "fields" | "settings")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-500 text-brand-600 font-medium"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            <i className={`ti ${tab.icon}`} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── EDITOR ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Painel esquerdo — tipos */}
        <aside className="w-48 flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto py-3 px-2.5">
          {FIELD_TYPES.map(group => (
            <div key={group.group}>
              <p className="text-2xs font-medium text-gray-400 uppercase tracking-widest px-1 mb-1.5 mt-3 first:mt-0">
                {group.group}
              </p>
              {group.items.map(item => (
                <button
                  key={item.type}
                  onClick={() => addField(item.type)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-100 mb-1.5 text-left hover:border-brand-200 hover:bg-brand-50 transition-all"
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0" style={{ background: item.bg, color: item.color }}>
                    <i className={`ti ${item.icon}`} />
                  </div>
                  <span className="text-xs text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Canvas central */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-5">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { val: questionFields.length, label: "Perguntas" },
              { val: sectionFields.length,  label: "Seções" },
              { val: `~${Math.max(1, Math.ceil(questionFields.length * 1.2))} min`, label: "Tempo est." },
              { val: 0, label: "Respostas" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-lg border border-gray-100 p-3 text-center">
                <p className="text-lg font-medium text-gray-900">{stat.val}</p>
                <p className="text-2xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Cabeçalho do formulário */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <div className="w-full h-16 rounded-lg mb-3 flex items-center justify-center text-white text-xs gap-1.5 cursor-pointer" style={{ background: "linear-gradient(135deg,#1a56db,#0d9e75)" }}>
              <i className="ti ti-photo" /> Capa do formulário
            </div>
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="w-full text-lg font-semibold border-none bg-transparent outline-none text-gray-900 border-b-2 border-transparent hover:border-brand-300 focus:border-brand-500 transition-colors pb-1"
              placeholder="Título do formulário"
            />
            <p className="text-xs text-gray-400 mt-1">{research.description ?? "Sem descrição"}</p>
          </div>

          {/* Campos */}
          {fields.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
              <i className="ti ti-forms text-3xl text-gray-300 block mb-2" />
              <p className="text-sm text-gray-400 mb-1">Nenhum campo adicionado</p>
              <p className="text-xs text-gray-300">Clique nos tipos de campo no painel esquerdo</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {fields.map((field, idx) => {
                const info    = getTypeInfo(field.type);
                const isSection = field.type === "section";
                const selected  = field.id === selectedId;

                if (isSection) return (
                  <div
                    key={field.id}
                    onClick={() => setSelectedId(field.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selected ? "ring-2 ring-brand-500" : ""}`}
                    style={{ background: "#1a56db" }}
                  >
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                      <i className="ti ti-layout-navbar text-white text-xs" />
                    </div>
                    <input
                      value={field.label}
                      onChange={e => updateField({ ...field, label: e.target.value })}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-transparent border-none outline-none text-white text-sm font-medium placeholder:text-white/60"
                      placeholder="Nome da seção"
                    />
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); if (idx > 0) moveField(idx, idx - 1); }} className="w-5 h-5 bg-white/15 hover:bg-white/30 rounded flex items-center justify-center">
                        <i className="ti ti-arrow-up text-white text-xs" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); if (idx < fields.length - 1) moveField(idx, idx + 1); }} className="w-5 h-5 bg-white/15 hover:bg-white/30 rounded flex items-center justify-center">
                        <i className="ti ti-arrow-down text-white text-xs" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setFields(prev => prev.filter(f => f.id !== field.id)); setSelectedId(null); }} className="w-5 h-5 bg-white/15 hover:bg-white/30 rounded flex items-center justify-center">
                        <i className="ti ti-x text-white text-xs" />
                      </button>
                    </div>
                  </div>
                );

                const qNum = fields.slice(0, idx).filter(f => f.type !== "section" && f.type !== "instruction").length + 1;

                return (
                  <div
                    key={field.id}
                    onClick={() => setSelectedId(field.id)}
                    draggable
                    onDragStart={() => { dragRef.current = idx; }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragRef.current !== null && dragRef.current !== idx) moveField(dragRef.current, idx); dragRef.current = null; }}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                      selected ? "border-brand-500 ring-2 ring-brand-100" : "border-gray-100 hover:border-brand-200"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <i className="ti ti-grip-vertical text-gray-300 text-base mt-0.5 cursor-grab" />
                      {field.type !== "instruction" && (
                        <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                          P{qNum}
                        </span>
                      )}
                      <input
                        value={field.label}
                        onChange={e => updateField({ ...field, label: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 text-sm font-medium border-none bg-transparent outline-none text-gray-900 border-b-2 border-transparent focus:border-brand-500 transition-colors"
                        placeholder="Enunciado da pergunta"
                      />
                      <span
                        onClick={e => e.stopPropagation()}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap mt-0.5"
                        style={{ background: info.bg, color: info.color }}
                      >
                        {info.label}
                      </span>
                      {/* Ações */}
                      <div className={`flex gap-1 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <button onClick={e => { e.stopPropagation(); if (idx > 0) moveField(idx, idx - 1); }} className="w-6 h-6 rounded border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-200 hover:bg-brand-50">
                          <i className="ti ti-arrow-up text-xs" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); if (idx < fields.length - 1) moveField(idx, idx + 1); }} className="w-6 h-6 rounded border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-500 hover:border-brand-200 hover:bg-brand-50">
                          <i className="ti ti-arrow-down text-xs" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setFields(prev => prev.filter(f => f.id !== field.id)); setSelectedId(null); }} className="w-6 h-6 rounded border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-200 hover:bg-red-50">
                          <i className="ti ti-trash text-xs" />
                        </button>
                      </div>
                    </div>

                    {/* Descrição */}
                    {selected && (
                      <input
                        value={field.description}
                        onChange={e => updateField({ ...field, description: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        className="w-full text-xs text-gray-400 border-none bg-transparent outline-none border-b border-transparent focus:border-gray-200 transition-colors mb-2 pl-8"
                        placeholder="Descrição opcional..."
                      />
                    )}

                    {/* Preview */}
                    <div className="pl-8">
                      <FieldPreview field={field} />
                      {field.required && <p className="text-xs text-red-400 mt-1">* Obrigatório</p>}
                    </div>
                  </div>
                );
              })}

              {/* Botão adicionar */}
              <button
                onClick={() => addField("short_text")}
                className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-all"
              >
                <i className="ti ti-plus" /> Adicionar campo
              </button>
            </div>
          )}
        </main>

        {/* Painel direito */}
        <aside className="w-56 flex-shrink-0 border-l border-gray-100 bg-white overflow-hidden flex flex-col">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
            <i className="ti ti-settings text-brand-500 text-sm" />
            <span className="text-xs font-medium text-gray-700">Propriedades</span>
          </div>
          <RightPanel
            field={selectedField}
            onUpdate={updateField}
            onDelete={deleteField}
          />
        </aside>
      </div>
    </div>
  );
}
