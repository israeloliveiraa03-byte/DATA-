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
  scaleLabel:  string;
  matrixRows:  string[];
  matrixCols:  string[];
  placeholder: string;
}

// ─── Modelos de capa ─────────────────────────────────────────────────────────

const COVER_PRESETS = [
  { id: "campo",      label: "Campo",      style: "linear-gradient(135deg,#b07d20,#7a3d00)" },
  { id: "floresta",   label: "Floresta",   style: "linear-gradient(135deg,#0a6e45,#0d9e75)" },
  { id: "oceano",     label: "Oceano",     style: "linear-gradient(135deg,#0c447c,#1a56db)" },
  { id: "cerrado",    label: "Cerrado",    style: "linear-gradient(135deg,#854f0b,#ba7517)" },
  { id: "territorio", label: "Território", style: "linear-gradient(135deg,#3c3489,#534ab7)" },
];

// ─── Configuração dos tipos de campo ─────────────────────────────────────────

const FIELD_TYPES: {
  group: string;
  items: { type: FieldType; label: string; icon: string; color: string; bg: string }[];
}[] = [
  {
    group: "Básicos",
    items: [
      { type: "short_text",      label: "Texto curto",       icon: "ti-writing",       color: "#1a56db", bg: "#e8f0fe" },
      { type: "long_text",       label: "Texto longo",       icon: "ti-text-size",     color: "#1a56db", bg: "#e8f0fe" },
      { type: "single_choice",   label: "Múltipla escolha",  icon: "ti-list-check",    color: "#534ab7", bg: "#eeedfe" },
      { type: "multiple_choice", label: "Caixas de seleção", icon: "ti-checkbox",      color: "#534ab7", bg: "#eeedfe" },
      { type: "scale",           label: "Escala numérica",   icon: "ti-star",          color: "#b07d20", bg: "#fff8ec" },
      { type: "yes_no",          label: "Sim / Não",         icon: "ti-toggle-right",  color: "#0d9e75", bg: "#e1f5ee" },
    ],
  },
  {
    group: "Avançados",
    items: [
      { type: "date",      label: "Data",              icon: "ti-calendar",  color: "#1a56db", bg: "#e8f0fe" },
      { type: "number",    label: "Número",            icon: "ti-number",    color: "#1a56db", bg: "#e8f0fe" },
      { type: "file",      label: "Upload de arquivo", icon: "ti-upload",    color: "#b07d20", bg: "#fff8ec" },
      { type: "signature", label: "Assinatura",        icon: "ti-signature", color: "#534ab7", bg: "#eeedfe" },
      { type: "matrix",    label: "Matriz",            icon: "ti-table",     color: "#534ab7", bg: "#eeedfe" },
    ],
  },
  {
    group: "Geográficos",
    items: [
      { type: "geo_state",  label: "Estado (UF)",  icon: "ti-map",       color: "#0d9e75", bg: "#e1f5ee" },
      { type: "geo_city",   label: "Município",    icon: "ti-building",  color: "#0d9e75", bg: "#e1f5ee" },
      { type: "geo_coords", label: "Lat / Long",   icon: "ti-crosshair", color: "#0d9e75", bg: "#e1f5ee" },
    ],
  },
  {
    group: "Layout",
    items: [
      { type: "section",     label: "Nova seção",  icon: "ti-layout-navbar", color: "#b07d20", bg: "#fff8ec" },
      { type: "instruction", label: "Instrução",   icon: "ti-info-circle",   color: "#6b7280", bg: "#f3f4f6" },
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
    label:       type === "section" ? "Nova seção" : type === "instruction" ? "Texto de instrução" : "Nova pergunta",
    description: "",
    required:    false,
    options:     (type === "single_choice" || type === "multiple_choice")
      ? [{ id: "1", label: "Opção 1" }, { id: "2", label: "Opção 2" }]
      : [],
    scaleMin:    1,
    scaleMax:    5,
    scaleLabel:  "",
    matrixRows:  ["Linha 1", "Linha 2"],
    matrixCols:  ["Coluna 1", "Coluna 2", "Coluna 3"],
    placeholder: "",
  };
}

// ─── Preview de campo ─────────────────────────────────────────────────────────

function FieldPreview({ field }: { field: Field }) {
  const cls = "w-full px-3 py-2 rounded-lg border text-xs cursor-not-allowed";
  const empty = { border: "1px solid #e8d9c0", background: "#faf6ef", color: "#b8a080" };

  if (field.type === "instruction") return (
    <div className="text-xs italic p-3 rounded-lg" style={{ background: "#faf6ef", border: "1px solid #e8d9c0", color: "#5c4a2a" }}>
      {field.label || "Texto de instrução..."}
    </div>
  );
  if (field.type === "section") return null;
  if (field.type === "short_text") return (
    <div className={cls} style={empty}>{field.placeholder || "Resposta curta..."}</div>
  );
  if (field.type === "long_text") return (
    <div className={cls} style={{ ...empty, minHeight: "64px" }}>{field.placeholder || "Resposta longa..."}</div>
  );
  if (field.type === "number") return (
    <div className={cls} style={empty}>0</div>
  );
  if (field.type === "date") return (
    <div className={cls + " flex items-center gap-2"} style={empty}>
      <i className="ti ti-calendar" /> dd/mm/aaaa
    </div>
  );
  if (field.type === "file") return (
    <div className={cls + " flex items-center gap-2"} style={empty}>
      <i className="ti ti-upload" /> Selecionar arquivo
    </div>
  );
  if (field.type === "signature") return (
    <div className={cls + " flex items-center justify-center"} style={{ ...empty, height: "56px" }}>
      <i className="ti ti-signature mr-1.5" /> Área de assinatura
    </div>
  );
  if (field.type === "geo_state") return (
    <div className={cls + " flex items-center gap-2"} style={empty}>
      <i className="ti ti-map" /> Selecione o estado...
    </div>
  );
  if (field.type === "geo_city") return (
    <div className={cls + " flex items-center gap-2"} style={empty}>
      <i className="ti ti-building" /> Selecione o município...
    </div>
  );
  if (field.type === "geo_coords") return (
    <div className={cls + " flex items-center gap-2"} style={empty}>
      <i className="ti ti-crosshair" /> Capturar localização GPS
    </div>
  );
  if (field.type === "yes_no") return (
    <div className="flex gap-2 mt-1">
      {["Sim", "Não"].map(o => (
        <div key={o} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ border: "1px solid #e8d9c0", background: "#faf6ef", color: "#8b7355" }}>
          <div className="w-3 h-3 rounded-full" style={{ border: "1.5px solid #c4a35a" }} /> {o}
        </div>
      ))}
    </div>
  );
  if (field.type === "scale") return (
    <div>
      <div className="flex gap-1 mt-1 flex-wrap">
        {Array.from({ length: Math.min(field.scaleMax - field.scaleMin + 1, 10) }, (_, i) => i + field.scaleMin).map(n => (
          <div key={n} className="w-7 h-7 rounded-md flex items-center justify-center text-xs"
            style={{ border: "1px solid #e8d9c0", background: "#faf6ef", color: "#8b7355" }}>{n}</div>
        ))}
      </div>
      {field.scaleLabel && <p className="text-xs mt-1" style={{ color: "#b8a080" }}>{field.scaleLabel}</p>}
    </div>
  );
  if (field.type === "single_choice" || field.type === "multiple_choice") return (
    <div className="flex flex-col gap-1.5 mt-1">
      {field.options.map(opt => (
        <div key={opt.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ border: "1px solid #e8d9c0", background: "#faf6ef", color: "#8b7355" }}>
          <div className={`w-3 h-3 flex-shrink-0 ${field.type === "single_choice" ? "rounded-full" : "rounded"}`}
            style={{ border: "1.5px solid #c4a35a" }} />
          {opt.label}
        </div>
      ))}
    </div>
  );
  if (field.type === "matrix") return (
    <div className="mt-1 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1.5 text-left" style={{ color: "#8b7355", fontWeight: 500 }}></th>
            {field.matrixCols.map((col, i) => (
              <th key={i} className="p-1.5 text-center" style={{ color: "#5c4a2a", fontWeight: 600, fontSize: "10px" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {field.matrixRows.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid #e8d9c0" }}>
              <td className="p-1.5 pr-3" style={{ color: "#5c4a2a", fontWeight: 500, fontSize: "10px" }}>{row}</td>
              {field.matrixCols.map((_, j) => (
                <td key={j} className="p-1.5 text-center">
                  <div className="w-3.5 h-3.5 rounded-full mx-auto" style={{ border: "1.5px solid #c4a35a" }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return null;
}

// ─── Painel de capa ───────────────────────────────────────────────────────────

function CoverPanel({
  cover,
  coverImage,
  onSelectCover,
  onUploadImage,
}: {
  cover: string;
  coverImage: string | null;
  onSelectCover: (id: string) => void;
  onUploadImage: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) onUploadImage(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="p-3">
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#b07d20", fontSize: "9px" }}>Modelos de capa</p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {COVER_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => onSelectCover(p.id)}
            className="relative h-10 rounded-md overflow-hidden text-white text-xs font-semibold flex items-center justify-center transition-all"
            style={{
              background: p.style,
              outline: cover === p.id ? "2px solid #b07d20" : "none",
              outlineOffset: "2px",
            }}
          >
            {p.label}
            {cover === p.id && (
              <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <i className="ti ti-check text-xs" style={{ color: "#b07d20" }} />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="border-t pt-3" style={{ borderColor: "#e8d9c0" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Imagem personalizada</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-colors"
          style={{ border: "1.5px dashed #c4a35a", background: "#fff8ec", color: "#7a3d00" }}
        >
          <i className="ti ti-upload" /> Fazer upload de imagem
        </button>
        {coverImage && (
          <div className="mt-2 rounded-md overflow-hidden h-12 relative">
            <img src={coverImage} alt="Capa" className="w-full h-full object-cover" />
            <button
              onClick={() => onUploadImage("")}
              className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
            >
              <i className="ti ti-x text-white text-xs" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Painel direito ───────────────────────────────────────────────────────────

function RightPanel({
  field,
  onUpdate,
  onDelete,
  showCover,
  cover,
  coverImage,
  onSelectCover,
  onUploadImage,
}: {
  field: Field | null;
  onUpdate: (f: Field) => void;
  onDelete: () => void;
  showCover: boolean;
  cover: string;
  coverImage: string | null;
  onSelectCover: (id: string) => void;
  onUploadImage: (url: string) => void;
}) {
  if (showCover) return (
    <CoverPanel
      cover={cover}
      coverImage={coverImage}
      onSelectCover={onSelectCover}
      onUploadImage={onUploadImage}
    />
  );

  if (!field) return (
    <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
      <i className="ti ti-click text-3xl opacity-20" style={{ color: "#b07d20" }} />
      <span className="text-xs leading-relaxed" style={{ color: "#8b7355" }}>Selecione um campo para editar suas propriedades</span>
    </div>
  );

  const info = getTypeInfo(field.type);

  function update(patch: Partial<Field>) {
    onUpdate({ ...field, ...patch } as Field);
  }

  function addOption() {
    if (!field) return;
    update({ options: [...field.options, { id: Math.random().toString(36).slice(2, 8), label: `Opção ${field.options.length + 1}` }] });
  }

  function updateOption(id: string, label: string) {
    if (!field) return;
    update({ options: field.options.map(o => o.id === id ? { ...o, label } : o) });
  }

  function removeOption(id: string) {
    if (!field) return;
    update({ options: field.options.filter(o => o.id !== id) });
  }

  const inputCls = "w-full px-2 py-1.5 text-xs rounded border focus:outline-none focus:ring-1";
  const inputStyle = { border: "1px solid #e8d9c0", background: "#fff", color: "#1a0f00" };

  return (
    <div className="flex flex-col overflow-y-auto p-3 gap-4">

      {/* Tipo */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Tipo</p>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs"
          style={{ background: "#faf6ef", border: "1px solid #e8d9c0", color: "#5c4a2a" }}>
          <i className={`ti ${info.icon}`} style={{ color: info.color }} />
          {info.label}
        </div>
      </div>

      {/* Label */}
      {field.type !== "section" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>
            {field.type === "instruction" ? "Texto" : "Pergunta"}
          </p>
          <input value={field.label} onChange={e => update({ label: e.target.value })}
            className={inputCls} style={inputStyle} placeholder="Digite aqui..." />
        </div>
      )}

      {/* Placeholder */}
      {(field.type === "short_text" || field.type === "long_text" || field.type === "number") && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Placeholder</p>
          <input value={field.placeholder} onChange={e => update({ placeholder: e.target.value })}
            className={inputCls} style={inputStyle} placeholder="Texto de ajuda..." />
        </div>
      )}

      {/* Descrição */}
      {field.type !== "section" && field.type !== "instruction" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Descrição</p>
          <textarea value={field.description} onChange={e => update({ description: e.target.value })}
            rows={2} className={inputCls + " resize-none"} style={inputStyle} placeholder="Descrição opcional..." />
        </div>
      )}

      {/* Obrigatório */}
      {field.type !== "section" && field.type !== "instruction" && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "#5c4a2a" }}>Obrigatório</span>
          <button onClick={() => update({ required: !field.required })}
            className="w-8 h-4 rounded-full relative transition-colors"
            style={{ background: field.required ? "#b07d20" : "#e8d9c0" }}>
            <span className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${field.required ? "left-4" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {/* Opções (single/multiple choice) */}
      {(field.type === "single_choice" || field.type === "multiple_choice") && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Opções</p>
          <div className="flex flex-col gap-1">
            {field.options.map(opt => (
              <div key={opt.id} className="flex items-center gap-1">
                <input value={opt.label} onChange={e => updateOption(opt.id, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none"
                  style={inputStyle} />
                {field.options.length > 1 && (
                  <button onClick={() => removeOption(opt.id)} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                    <i className="ti ti-x text-xs" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addOption} className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: "#b07d20" }}>
              <i className="ti ti-plus" /> Adicionar opção
            </button>
          </div>
        </div>
      )}

      {/* Escala */}
      {field.type === "scale" && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Intervalo</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: "#8b7355" }}>Mínimo</p>
                <input type="number" value={field.scaleMin} onChange={e => update({ scaleMin: +e.target.value })}
                  className={inputCls} style={inputStyle} />
              </div>
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: "#8b7355" }}>Máximo</p>
                <input type="number" value={field.scaleMax} onChange={e => update({ scaleMax: +e.target.value })}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Legenda</p>
            <input value={field.scaleLabel} onChange={e => update({ scaleLabel: e.target.value })}
              className={inputCls} style={inputStyle} placeholder="Ex: 1 = Ruim, 5 = Ótimo" />
          </div>
        </div>
      )}

      {/* Matriz */}
      {field.type === "matrix" && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Linhas</p>
            <div className="flex flex-col gap-1">
              {field.matrixRows.map((row, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={row}
                    onChange={e => update({ matrixRows: field.matrixRows.map((r, j) => j === i ? e.target.value : r) })}
                    className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={inputStyle} />
                  {field.matrixRows.length > 1 && (
                    <button onClick={() => update({ matrixRows: field.matrixRows.filter((_, j) => j !== i) })}
                      className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                      <i className="ti ti-x text-xs" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => update({ matrixRows: [...field.matrixRows, `Linha ${field.matrixRows.length + 1}`] })}
                className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "#b07d20" }}>
                <i className="ti ti-plus" /> Adicionar linha
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#b07d20", fontSize: "9px" }}>Colunas</p>
            <div className="flex flex-col gap-1">
              {field.matrixCols.map((col, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={col}
                    onChange={e => update({ matrixCols: field.matrixCols.map((c, j) => j === i ? e.target.value : c) })}
                    className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={inputStyle} />
                  {field.matrixCols.length > 1 && (
                    <button onClick={() => update({ matrixCols: field.matrixCols.filter((_, j) => j !== i) })}
                      className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                      <i className="ti ti-x text-xs" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => update({ matrixCols: [...field.matrixCols, `Coluna ${field.matrixCols.length + 1}`] })}
                className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "#b07d20" }}>
                <i className="ti ti-plus" /> Adicionar coluna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletar */}
      <button onClick={onDelete} className="mt-2 flex items-center gap-1.5 text-xs font-semibold transition-colors"
        style={{ color: "#c0392b" }}>
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
  const [cover,       setCover]       = useState("campo");
  const [coverImage,  setCoverImage]  = useState<string | null>(null);
  const [showCover,   setShowCover]   = useState(false);
  const dragRef = useRef<number | null>(null);

  const selectedField = fields.find(f => f.id === selectedId) ?? null;
  const coverStyle    = coverImage
    ? { backgroundImage: `url(${coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: COVER_PRESETS.find(p => p.id === cover)?.style ?? COVER_PRESETS[0].style };

  const addField = useCallback((type: FieldType) => {
    const field = newField(type);
    setFields(prev => [...prev, field]);
    setSelectedId(field.id);
    setShowCover(false);
  }, []);

  const updateField = useCallback((updated: Field) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
  }, []);

  const deleteField = useCallback(() => {
    if (!selectedId) return;
    setFields(prev => prev.filter(f => f.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const moveField = useCallback((fromIdx: number, toIdx: number) => {
    setFields(prev => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/researches/${research.id}/form`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: formTitle, fields }),
      });
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setSaving(false);
    }
  }, [research.id, formTitle, fields]);

  const questionFields = fields.filter(f => f.type !== "section" && f.type !== "instruction");
  const sectionFields  = fields.filter(f => f.type === "section");

  const TS = { color: "#b07d20", fontSize: "9px" } as const;
  const BRD = "1px solid #e8d9c0";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#faf6ef" }}>

      {/* ── TOPBAR ── */}
      <header className="h-12 flex items-center justify-between px-4 flex-shrink-0 z-50"
        style={{ background: "#faf6ef", borderBottom: BRD }}>
        <button onClick={() => router.push("/dashboard")} className="text-lg font-bold tracking-tight"
          style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
          Data<span style={{ color: "#b07d20" }}>º</span>
        </button>

        <div className="flex items-center gap-2">
          <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
            className="text-sm font-semibold border-none bg-transparent outline-none text-center border-b-2 border-transparent transition-colors min-w-48 px-1"
            style={{ color: "#0a1628", borderBottomColor: "transparent" }}
            onFocus={e => e.currentTarget.style.borderBottomColor = "#c4a35a"}
            onBlur={e => e.currentTarget.style.borderBottomColor = "transparent"} />
          {savedAt && (
            <span className="text-xs flex items-center gap-1" style={{ color: "#8b7355" }}>
              <i className="ti ti-check" style={{ color: "#0d9e75" }} /> Salvo às {savedAt}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
            style={{ border: BRD, background: "#fff", color: "#5c4a2a" }}>
            <i className="ti ti-eye" /> Preview
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors disabled:opacity-50"
            style={{ background: "#b07d20", color: "#fff", border: "1.5px solid #8b5e0a" }}>
            <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-device-floppy"} />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      {/* ── EDITOR ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Painel esquerdo */}
        <aside className="w-48 flex-shrink-0 overflow-y-auto py-3 px-2.5"
          style={{ background: "#faf6ef", borderRight: BRD }}>
          {FIELD_TYPES.map(group => (
            <div key={group.group}>
              <p className="px-1 mb-1.5 mt-3 first:mt-0 font-bold uppercase tracking-widest" style={TS}>
                {group.group}
              </p>
              {group.items.map(item => (
                <button key={item.type} onClick={() => addField(item.type)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md mb-1 text-left transition-all"
                  style={{ border: BRD, background: "#fff" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#c4a35a"; e.currentTarget.style.background = "#fff8ec"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8d9c0"; e.currentTarget.style.background = "#fff"; }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                    style={{ background: item.bg, color: item.color }}>
                    <i className={`ti ${item.icon}`} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#3d2f1a" }}>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto p-5" style={{ background: "#f5f0e8" }}>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { val: questionFields.length, label: "Perguntas" },
              { val: sectionFields.length,  label: "Seções" },
              { val: `~${Math.max(1, Math.ceil(questionFields.length * 1.2))} min`, label: "Tempo est." },
              { val: 0, label: "Respostas" },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg p-3 text-center"
                style={{ background: "#fff", border: BRD }}>
                <p className="text-lg font-bold" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>{stat.val}</p>
                <p className="font-semibold mt-0.5" style={{ color: "#8b7355", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Cabeçalho do formulário */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "#fff", border: BRD }}>
            {/* Capa */}
            <div
              className="w-full h-20 rounded-lg mb-3 flex items-center justify-center text-white text-xs gap-2 cursor-pointer transition-opacity hover:opacity-90"
              style={coverStyle}
              onClick={() => { setShowCover(true); setSelectedId(null); }}
            >
              <i className="ti ti-photo" />
              <span className="font-semibold">Clique para alterar a capa</span>
            </div>

            <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
              className="w-full text-xl font-bold border-none bg-transparent outline-none border-b-2 border-transparent transition-colors pb-1"
              style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}
              placeholder="Título do formulário"
              onFocus={e => e.currentTarget.style.borderBottomColor = "#c4a35a"}
              onBlur={e => e.currentTarget.style.borderBottomColor = "transparent"} />
            <p className="text-xs mt-1 font-medium" style={{ color: "#8b7355" }}>
              {research.description ?? "Sem descrição"}
            </p>
          </div>

          {/* Campos */}
          {fields.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ border: "2px dashed #d4b880", background: "#faf6ef" }}>
              <i className="ti ti-forms text-3xl block mb-2" style={{ color: "#d4b880" }} />
              <p className="text-sm font-semibold mb-1" style={{ color: "#5c4a2a" }}>Nenhum campo adicionado</p>
              <p className="text-xs" style={{ color: "#8b7355" }}>Clique nos tipos de campo no painel esquerdo</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {fields.map((field, idx) => {
                const info      = getTypeInfo(field.type);
                const isSection = field.type === "section";
                const selected  = field.id === selectedId;

                if (isSection) return (
                  <div key={field.id} onClick={() => { setSelectedId(field.id); setShowCover(false); }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                    style={{ background: "#b07d20", outline: selected ? "2px solid #7a3d00" : "none", outlineOffset: "2px" }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                      <i className="ti ti-layout-navbar text-white text-xs" />
                    </div>
                    <input value={field.label}
                      onChange={e => updateField({ ...field, label: e.target.value })}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-transparent border-none outline-none text-white text-sm font-semibold placeholder:text-white/60" />
                    <div className="flex gap-1">
                      {[
                        { icon: "ti-arrow-up",   action: () => idx > 0 && moveField(idx, idx - 1) },
                        { icon: "ti-arrow-down", action: () => idx < fields.length - 1 && moveField(idx, idx + 1) },
                        { icon: "ti-x",          action: () => { setFields(prev => prev.filter(f => f.id !== field.id)); setSelectedId(null); } },
                      ].map((btn, i) => (
                        <button key={i} onClick={e => { e.stopPropagation(); btn.action(); }}
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.15)" }}>
                          <i className={`ti ${btn.icon} text-white text-xs`} />
                        </button>
                      ))}
                    </div>
                  </div>
                );

                const qNum = field.type !== "instruction"
                  ? fields.slice(0, idx).filter(f => f.type !== "section" && f.type !== "instruction").length + 1
                  : null;

                return (
                  <div key={field.id}
                    onClick={() => { setSelectedId(field.id); setShowCover(false); }}
                    draggable
                    onDragStart={() => { dragRef.current = idx; }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragRef.current !== null && dragRef.current !== idx) moveField(dragRef.current, idx); dragRef.current = null; }}
                    className="rounded-xl p-4 cursor-pointer transition-all"
                    style={{
                      background: "#fff",
                      border: selected ? "2px solid #b07d20" : BRD,
                      boxShadow: selected ? "0 0 0 3px rgba(176,125,32,0.1)" : "none",
                    }}>

                    <div className="flex items-start gap-2 mb-3">
                      <i className="ti ti-grip-vertical text-base mt-0.5 cursor-grab" style={{ color: "#d4b880" }} />
                      {qNum !== null && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5"
                          style={{ background: "#fff8ec", color: "#b07d20", border: "1px solid #e8d9c0" }}>
                          P{qNum}
                        </span>
                      )}
                      <input value={field.label}
                        onChange={e => updateField({ ...field, label: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 text-sm font-semibold border-none bg-transparent outline-none border-b-2 border-transparent transition-colors"
                        style={{ color: "#0a1628" }}
                        placeholder="Enunciado da pergunta" />
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 font-semibold"
                        style={{ background: info.bg, color: info.color }}>
                        {info.label}
                      </span>
                      <div className="flex gap-1">
                        {[
                          { icon: "ti-arrow-up",   action: () => idx > 0 && moveField(idx, idx - 1) },
                          { icon: "ti-arrow-down", action: () => idx < fields.length - 1 && moveField(idx, idx + 1) },
                          { icon: "ti-trash",      action: () => { setFields(prev => prev.filter(f => f.id !== field.id)); setSelectedId(null); }, danger: true },
                        ].map((btn, i) => (
                          <button key={i} onClick={e => { e.stopPropagation(); btn.action(); }}
                            className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                            style={{ border: BRD, background: "#faf6ef", color: btn.danger ? "#c0392b" : "#8b7355" }}>
                            <i className={`ti ${btn.icon} text-xs`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {selected && field.type !== "section" && (
                      <input value={field.description}
                        onChange={e => updateField({ ...field, description: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        className="w-full text-xs border-none bg-transparent outline-none border-b transition-colors mb-2 pl-8"
                        style={{ color: "#8b7355", borderBottomColor: "#e8d9c0" }}
                        placeholder="Descrição opcional..." />
                    )}

                    <div className="pl-8">
                      <FieldPreview field={field} />
                      {field.required && (
                        <p className="text-xs mt-1 font-semibold" style={{ color: "#c0392b" }}>* Obrigatório</p>
                      )}
                    </div>
                  </div>
                );
              })}

              <button onClick={() => addField("short_text")}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{ border: "2px dashed #d4b880", background: "#faf6ef", color: "#8b7355" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#b07d20"; e.currentTarget.style.color = "#b07d20"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#d4b880"; e.currentTarget.style.color = "#8b7355"; }}>
                <i className="ti ti-plus" /> Adicionar campo
              </button>
            </div>
          )}
        </main>

        {/* Painel direito */}
        <aside className="w-56 flex-shrink-0 overflow-hidden flex flex-col"
          style={{ background: "#faf6ef", borderLeft: BRD }}>
          <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: BRD }}>
            <i className="ti ti-settings text-sm" style={{ color: "#b07d20" }} />
            <span className="text-xs font-bold" style={{ color: "#5c4a2a" }}>
              {showCover ? "Capa do formulário" : "Propriedades"}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <RightPanel
              field={selectedField}
              onUpdate={updateField}
              onDelete={deleteField}
              showCover={showCover}
              cover={cover}
              coverImage={coverImage}
              onSelectCover={id => { setCover(id); setCoverImage(null); }}
              onUploadImage={url => { setCoverImage(url); setCover(""); }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
