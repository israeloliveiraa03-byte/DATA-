"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Research } from "@/lib/types";
import { DataLogo } from "@/components/layout/data-logo";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type FieldType =
  // Básicos
  | "short_text" | "long_text" | "single_choice" | "multiple_choice"
  | "scale" | "yes_no"
  // Avançados e validação
  | "date" | "number" | "file" | "signature" | "matrix"
  | "email" | "phone" | "cpf_cnpj" | "cep" | "time" | "date_range"
  // Escalas e avaliações
  | "stars" | "nps" | "slider" | "semantic_scale"
  // Seleção e priorização
  | "ranking" | "points_distribution" | "card_sorting"
  // Lógica e cálculo
  | "conditional" | "weighted" | "calculated" | "consent"
  // Geográficos
  | "geo_region" | "geo_state" | "geo_mesoregion" | "geo_microregion"
  | "geo_city" | "geo_district" | "geo_neighborhood" | "geo_zone"
  | "geo_coords" | "geo_map" | "geo_relational"
  // Coleta estruturada
  | "observation" | "data_table" | "timeline" | "availability"
  | "signature_meta"
  // Onda 3 — em desenvolvimento
  | "audio" | "photo_annotation" | "doc_capture" | "pairwise"
  | "equation" | "dynamic_consent" | "field_diary"
  | "multi_upload" | "qr_barcode" | "bibliography"
  // Layout
  | "section" | "instruction";

interface FieldOption { id: string; label: string; weight?: number; }

interface Field {
  id:           string;
  type:         FieldType;
  label:        string;
  description:  string;
  required:     boolean;
  options:      FieldOption[];
  scaleMin:     number;
  scaleMax:     number;
  scaleLabel:   string;
  matrixRows:   string[];
  matrixCols:   string[];
  placeholder:  string;
  rankingItems: string[];
  totalPoints:  number;
  cardCategories: string[];
  cardItems:    string[];
  semanticLeft: string;
  semanticRight:string;
  timelineStart:string;
  timelineEnd:  string;
  zoneOptions:  string[];
  // Novos tipos (2026-07-04) — tudo persiste em form_fields.config (jsonb)
  tableColumns:        string[];                     // data_table
  availabilityDays:    string[];                     // availability
  availabilityPeriods: string[];                     // availability
  geoMapMode:          "point" | "area" | "both";    // geo_map
  condDependsOn:       string;                       // conditional — id do campo do qual depende
  condOperator:        string;                       // conditional — answered | equals | not_equals | contains
  condValue:           string;                       // conditional — valor comparado
  pairwiseItems:       string[];                     // pairwise
  formula:             string;                       // equation — ex: ({P1} / ({P2} * {P2}))
  consentText:         string;                       // dynamic_consent — texto do TCLE
  consentItems:        string[];                     // dynamic_consent — itens de consentimento
  uploadItems:         string[];                     // multi_upload — itens indexados
}

// ─── Modelos de capa ─────────────────────────────────────────────────────────

const COVER_PRESETS = [
  { id: "campo",      label: "Campo",      style: "linear-gradient(135deg,#c48a42,#7a5218)" },
  { id: "floresta",   label: "Floresta",   style: "linear-gradient(135deg,#3a5430,#4c6b3c)" },
  { id: "oceano",     label: "Oceano",     style: "linear-gradient(135deg,#0c447c,#1a56db)" },
  { id: "cerrado",    label: "Cerrado",    style: "linear-gradient(135deg,#854f0b,#ba7517)" },
  { id: "territorio", label: "Território", style: "linear-gradient(135deg,#3c3489,#534ab7)" },
];

// ─── Tipos em desenvolvimento (Onda 3) ────────────────────────────────────────

const DEV_TYPES: Record<string, string> = {
  audio:           "Gravação de voz — o respondente responde falando. Útil para comunidades com baixa alfabetização e entrevistas qualitativas.",
  photo_annotation:"Foto com anotação — o respondente tira uma foto e marca pontos ou áreas com comentários. Ideal para pesquisa de campo visual.",
  doc_capture:     "Captura de documento — foto de documento físico com extração automática de texto (OCR). Útil para certidões, notas e mapas impressos.",
  pairwise:        "Comparação par a par — apresenta dois itens por vez para o respondente escolher. O sistema calcula ranking global automaticamente.",
  equation:        "Equação calculada — campo automático alimentado por respostas anteriores. Ex: calcula o IMC a partir de peso e altura informados.",
  dynamic_consent: "Consentimento dinâmico — checkboxes que liberam outros campos conforme o TCLE. Garante conformidade ética e LGPD no próprio formulário.",
  field_diary:     "Diário de campo — bloco de texto com registro de data/hora automático a cada entrada, formando um log cronológico do pesquisador.",
  multi_upload:    "Upload múltiplo indexado — múltiplos arquivos vinculados a itens de uma lista. Ex: fotos de cada cômodo de uma residência.",
  qr_barcode:      "Código de barras / QR — leitura via câmera do dispositivo. Útil para inventários, rastreamento de amostras e catalogação.",
  bibliography:    "Citação bibliográfica — campos estruturados para registrar referência (autor, ano, título, DOI). Ideal para fichas de leitura e revisão sistemática.",
};

// ─── Configuração dos tipos de campo ─────────────────────────────────────────

type FieldGroup = {
  group: string;
  items: { type: FieldType; label: string; icon: string; color: string; bg: string; dev?: boolean }[];
};

const FIELD_TYPES: FieldGroup[] = [
  {
    group: "Básicos",
    items: [
      { type: "short_text",      label: "Texto curto",       icon: "ti-writing",        color: "#1a56db", bg: "#e8f0fe" },
      { type: "long_text",       label: "Texto longo",       icon: "ti-text-size",      color: "#1a56db", bg: "#e8f0fe" },
      { type: "single_choice",   label: "Múltipla escolha",  icon: "ti-list-check",     color: "#534ab7", bg: "#eeedfe" },
      { type: "multiple_choice", label: "Caixas de seleção", icon: "ti-checkbox",       color: "#534ab7", bg: "#eeedfe" },
      { type: "scale",           label: "Escala numérica",   icon: "ti-adjustments",    color: "#c48a42", bg: "#fbf3e7" },
      { type: "yes_no",          label: "Sim / Não",         icon: "ti-toggle-right",   color: "#4c6b3c", bg: "#eaf0e4" },
    ],
  },
  {
    group: "Validação",
    items: [
      { type: "email",     label: "E-mail",           icon: "ti-mail",          color: "#1a56db", bg: "#e8f0fe" },
      { type: "phone",     label: "Telefone",         icon: "ti-phone",         color: "#1a56db", bg: "#e8f0fe" },
      { type: "cpf_cnpj", label: "CPF / CNPJ",       icon: "ti-id-badge",      color: "#534ab7", bg: "#eeedfe" },
      { type: "cep",       label: "CEP",              icon: "ti-map-pin",       color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "date",      label: "Data",             icon: "ti-calendar",      color: "#1a56db", bg: "#e8f0fe" },
      { type: "time",      label: "Hora",             icon: "ti-clock",         color: "#1a56db", bg: "#e8f0fe" },
      { type: "date_range",label: "Intervalo de datas",icon: "ti-calendar-event",color: "#534ab7", bg: "#eeedfe" },
      { type: "number",    label: "Número",           icon: "ti-number",        color: "#1a56db", bg: "#e8f0fe" },
    ],
  },
  {
    group: "Escalas e avaliação",
    items: [
      { type: "stars",          label: "Estrelas",            icon: "ti-star",          color: "#c48a42", bg: "#fbf3e7" },
      { type: "nps",            label: "NPS (0–10)",          icon: "ti-chart-bar",     color: "#c48a42", bg: "#fbf3e7" },
      { type: "slider",         label: "Termômetro / Slider", icon: "ti-adjustments-horizontal", color: "#c48a42", bg: "#fbf3e7" },
      { type: "semantic_scale", label: "Escala semântica",    icon: "ti-arrows-left-right", color: "#534ab7", bg: "#eeedfe" },
    ],
  },
  {
    group: "Seleção e priorização",
    items: [
      { type: "ranking",             label: "Ranking",               icon: "ti-list-numbers", color: "#534ab7", bg: "#eeedfe" },
      { type: "points_distribution", label: "Distribuição de pontos",icon: "ti-coins",        color: "#c48a42", bg: "#fbf3e7" },
      { type: "card_sorting",        label: "Card sorting",          icon: "ti-layout-cards", color: "#534ab7", bg: "#eeedfe" },
    ],
  },
  {
    group: "Lógica e cálculo",
    items: [
      { type: "conditional", label: "Condicional",        icon: "ti-git-branch",  color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "weighted",    label: "Com peso / escore",  icon: "ti-scale",       color: "#c48a42", bg: "#fbf3e7" },
      { type: "consent",     label: "Consentimento TCLE", icon: "ti-shield-check",color: "#4c6b3c", bg: "#eaf0e4" },
    ],
  },
  {
    group: "Geográficos",
    items: [
      { type: "geo_region",       label: "Região (5 grandes)",   icon: "ti-map-pin",      color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_state",        label: "Estado (UF)",          icon: "ti-map",          color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_mesoregion",   label: "Mesorregião (IBGE)",   icon: "ti-topology-ring",color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_microregion",  label: "Microrregião (IBGE)",  icon: "ti-topology-star",color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_city",         label: "Município",            icon: "ti-building",     color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_district",     label: "Distrito",             icon: "ti-map-pins",     color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_neighborhood", label: "Bairro",               icon: "ti-home",         color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_zone",         label: "Zona da cidade",       icon: "ti-layout-grid",  color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_coords",       label: "Lat / Long (GPS)",     icon: "ti-crosshair",    color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_map",          label: "Mapa — ponto / área",  icon: "ti-map-2",        color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "geo_relational",   label: "Localização relacional",icon: "ti-point",       color: "#4c6b3c", bg: "#eaf0e4" },
    ],
  },
  {
    group: "Coleta estruturada",
    items: [
      { type: "matrix",          label: "Matriz",                  icon: "ti-table",          color: "#534ab7", bg: "#eeedfe" },
      { type: "observation",     label: "Observação estruturada",  icon: "ti-eye",            color: "#534ab7", bg: "#eeedfe" },
      { type: "data_table",      label: "Tabela de coleta",        icon: "ti-table-column",   color: "#534ab7", bg: "#eeedfe" },
      { type: "timeline",        label: "Linha do tempo",          icon: "ti-timeline",       color: "#c48a42", bg: "#fbf3e7" },
      { type: "availability",    label: "Calendário de disponibilidade", icon: "ti-calendar-check", color: "#1a56db", bg: "#e8f0fe" },
      { type: "file",            label: "Upload de arquivo",       icon: "ti-upload",         color: "#c48a42", bg: "#fbf3e7" },
      { type: "signature",       label: "Assinatura",              icon: "ti-signature",      color: "#534ab7", bg: "#eeedfe" },
      { type: "signature_meta",  label: "Assinatura com metadados",icon: "ti-fingerprint",    color: "#534ab7", bg: "#eeedfe" },
    ],
  },
  {
    group: "Coleta avançada",
    items: [
      { type: "audio",           label: "Gravação de voz",         icon: "ti-microphone",     color: "#534ab7", bg: "#eeedfe" },
      { type: "photo_annotation",label: "Foto com anotação",       icon: "ti-photo-edit",     color: "#c48a42", bg: "#fbf3e7" },
      { type: "doc_capture",     label: "Captura de documento",    icon: "ti-scan",           color: "#1a56db", bg: "#e8f0fe" },
      { type: "pairwise",        label: "Comparação par a par",    icon: "ti-arrows-diff",    color: "#534ab7", bg: "#eeedfe" },
      { type: "equation",        label: "Equação calculada",       icon: "ti-math",           color: "#c48a42", bg: "#fbf3e7" },
      { type: "dynamic_consent", label: "Consentimento dinâmico",  icon: "ti-lock-check",     color: "#4c6b3c", bg: "#eaf0e4" },
      { type: "field_diary",     label: "Diário de campo",         icon: "ti-notebook",       color: "#c48a42", bg: "#fbf3e7" },
      { type: "multi_upload",    label: "Upload múltiplo indexado",icon: "ti-files",          color: "#1a56db", bg: "#e8f0fe" },
      { type: "qr_barcode",      label: "QR / Código de barras",   icon: "ti-qrcode",         color: "#534ab7", bg: "#eeedfe" },
      { type: "bibliography",    label: "Citação bibliográfica",   icon: "ti-book-2",         color: "#1a56db", bg: "#e8f0fe" },
    ],
  },
  {
    group: "Layout",
    items: [
      { type: "section",     label: "Nova seção", icon: "ti-layout-navbar", color: "#c48a42", bg: "#fbf3e7" },
      { type: "instruction", label: "Instrução",  icon: "ti-info-circle",   color: "#6b7280", bg: "#f3f4f6" },
    ],
  },
];

function getTypeInfo(type: FieldType) {
  for (const group of FIELD_TYPES) {
    const found = group.items.find(i => i.type === type);
    if (found) return found;
  }
  return { label: type, icon: "ti-forms", color: "#6b7280", bg: "#f3f4f6", type, dev: false };
}

function newField(type: FieldType): Field {
  const rankingDefaults   = ["Item 1", "Item 2", "Item 3"];
  const cardDefaults      = ["Categoria A", "Categoria B"];
  const cardItemDefaults  = ["Item 1", "Item 2", "Item 3", "Item 4"];
  const hasOptions = ["single_choice","multiple_choice","weighted","consent"].includes(type);
  const hasRanking = ["ranking"].includes(type);

  return {
    id:             Math.random().toString(36).slice(2, 10),
    type,
    label:          type === "section" ? "Nova seção" : type === "instruction" ? "Texto de instrução" : "Nova pergunta",
    description:    "",
    required:       false,
    options:        hasOptions ? [{ id: "1", label: "Opção 1", weight: 1 }, { id: "2", label: "Opção 2", weight: 2 }] : [],
    scaleMin:       1,
    scaleMax:       type === "nps" ? 10 : type === "stars" ? 5 : 5,
    scaleLabel:     "",
    matrixRows:     ["Linha 1", "Linha 2"],
    matrixCols:     ["Coluna 1", "Coluna 2", "Coluna 3"],
    placeholder:    "",
    rankingItems:   hasRanking ? rankingDefaults : [],
    totalPoints:    100,
    cardCategories: cardDefaults,
    cardItems:      cardItemDefaults,
    semanticLeft:   "Discordo totalmente",
    semanticRight:  "Concordo totalmente",
    timelineStart:  "2020",
    timelineEnd:    new Date().getFullYear().toString(),
    zoneOptions:    ["Norte", "Sul", "Leste", "Oeste", "Centro"],
    tableColumns:        ["Nome", "Idade", "Observação"],
    availabilityDays:    ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    availabilityPeriods: ["Manhã", "Tarde", "Noite"],
    geoMapMode:          "point",
    condDependsOn:       "",
    condOperator:        "answered",
    condValue:           "",
    pairwiseItems:       ["Item A", "Item B", "Item C"],
    formula:             "",
    consentText:         "",
    consentItems:        ["Li e aceito participar da pesquisa", "Autorizo o uso dos dados para fins acadêmicos"],
    uploadItems:         ["Item 1", "Item 2"],
  };
}

// ─── Preview de campo ─────────────────────────────────────────────────────────

function FieldPreview({ field }: { field: Field }) {
  const cls  = "w-full px-3 py-2 rounded-lg border text-xs cursor-not-allowed";
  const empty = { border: "1px solid #e8d8be", background: "#fbf3e7", color: "#d9bb8c" };

  if (field.type === "instruction") return (
    <div className="text-xs italic p-3 rounded-lg" style={{ background: "#fbf3e7", border: "1px solid #e8d8be", color: "#5c3f13" }}>
      {field.label || "Texto de instrução..."}
    </div>
  );
  if (field.type === "section") return null;

  // Texto
  if (field.type === "short_text") return <div className={cls} style={empty}>{field.placeholder || "Resposta curta..."}</div>;
  if (field.type === "long_text")  return <div className={cls} style={{ ...empty, minHeight: "64px" }}>{field.placeholder || "Resposta longa..."}</div>;
  if (field.type === "number")     return <div className={cls} style={empty}>0</div>;
  if (field.type === "email")      return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-mail"/>exemplo@email.com</div>;
  if (field.type === "phone")      return <div className={cls} style={empty}>(00) 00000-0000</div>;
  if (field.type === "cpf_cnpj")  return <div className={cls} style={empty}>000.000.000-00</div>;
  if (field.type === "cep")        return (
    <div>
      <div className={cls + " flex items-center gap-2 mb-1"} style={empty}><i className="ti ti-map-pin"/>00000-000</div>
      <div className="grid grid-cols-2 gap-1">
        <div className={cls} style={{ ...empty, fontSize: "10px" }}>Rua...</div>
        <div className={cls} style={{ ...empty, fontSize: "10px" }}>Cidade...</div>
      </div>
    </div>
  );
  if (field.type === "date")       return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-calendar"/>dd/mm/aaaa</div>;
  if (field.type === "time")       return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-clock"/>00:00</div>;
  if (field.type === "date_range") return (
    <div className="flex gap-1">
      <div className={cls + " flex items-center gap-1"} style={empty}><i className="ti ti-calendar text-xs"/>Início</div>
      <div className={cls + " flex items-center gap-1"} style={empty}><i className="ti ti-calendar text-xs"/>Fim</div>
    </div>
  );
  if (field.type === "file")       return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-upload"/>Selecionar arquivo</div>;
  if (field.type === "signature" || field.type === "signature_meta") return (
    <div className={cls + " flex flex-col items-center justify-center"} style={{ ...empty, height: "56px" }}>
      <i className="ti ti-signature mr-1" /> Área de assinatura
      {field.type === "signature_meta" && <span className="text-xs mt-0.5" style={{ color: "#d9bb8c", fontSize: "9px" }}>Captura: hora · GPS · dispositivo</span>}
    </div>
  );

  // Escalas
  if (field.type === "stars") return (
    <div className="flex gap-1 mt-1">
      {Array.from({ length: field.scaleMax || 5 }).map((_, i) => (
        <i key={i} className="ti ti-star text-lg" style={{ color: i < 3 ? "#c48a42" : "#e8d8be" }} />
      ))}
    </div>
  );
  if (field.type === "nps") return (
    <div>
      <div className="flex gap-0.5 mt-1">
        {Array.from({ length: 11 }, (_, i) => (
          <div key={i} className="flex-1 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: i <= 6 ? "#fdf0ef" : i <= 8 ? "#fbf3e7" : "#eaf0e4", color: i <= 6 ? "#c0392b" : i <= 8 ? "#c48a42" : "#4c6b3c", border: "1px solid #e8d8be" }}>
            {i}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: "#c0392b", fontSize: "9px" }}>Detrator</span>
        <span className="text-xs" style={{ color: "#4c6b3c", fontSize: "9px" }}>Promotor</span>
      </div>
    </div>
  );
  if (field.type === "slider") return (
    <div className="mt-2 px-1">
      <div className="relative h-1.5 rounded-full" style={{ background: "#e8d8be" }}>
        <div className="absolute left-0 h-full w-1/2 rounded-full" style={{ background: "#c48a42" }} />
        <div className="absolute w-4 h-4 rounded-full bg-white border-2 top-1/2 -translate-y-1/2" style={{ left: "calc(50% - 8px)", borderColor: "#c48a42" }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: "#a06d28", fontSize: "9px" }}>{field.scaleMin}</span>
        <span className="text-xs" style={{ color: "#a06d28", fontSize: "9px" }}>{field.scaleMax}</span>
      </div>
    </div>
  );
  if (field.type === "semantic_scale") return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "#5c3f13", fontSize: "10px", minWidth: "80px" }}>{field.semanticLeft}</span>
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5].map(n => (
            <div key={n} className="flex-1 h-6 rounded flex items-center justify-center text-xs"
              style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#a06d28" }}>{n}</div>
          ))}
        </div>
        <span className="text-xs font-medium text-right" style={{ color: "#5c3f13", fontSize: "10px", minWidth: "80px" }}>{field.semanticRight}</span>
      </div>
    </div>
  );
  if (field.type === "scale") return (
    <div>
      <div className="flex gap-1 mt-1 flex-wrap">
        {Array.from({ length: Math.min(field.scaleMax - field.scaleMin + 1, 10) }, (_, i) => i + field.scaleMin).map(n => (
          <div key={n} className="w-7 h-7 rounded-md flex items-center justify-center text-xs"
            style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#a06d28" }}>{n}</div>
        ))}
      </div>
      {field.scaleLabel && <p className="text-xs mt-1" style={{ color: "#d9bb8c" }}>{field.scaleLabel}</p>}
    </div>
  );

  // Escolha
  if (field.type === "yes_no") return (
    <div className="flex gap-2 mt-1">
      {["Sim", "Não"].map(o => (
        <div key={o} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#a06d28" }}>
          <div className="w-3 h-3 rounded-full" style={{ border: "1.5px solid #d2a05c" }} /> {o}
        </div>
      ))}
    </div>
  );
  if (field.type === "single_choice" || field.type === "multiple_choice" || field.type === "weighted" || field.type === "consent") return (
    <div className="flex flex-col gap-1.5 mt-1">
      {field.options.map(opt => (
        <div key={opt.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#a06d28" }}>
          <div className={`w-3 h-3 flex-shrink-0 ${field.type === "single_choice" ? "rounded-full" : "rounded"}`}
            style={{ border: "1.5px solid #d2a05c" }} />
          {opt.label}
          {field.type === "weighted" && opt.weight !== undefined && (
            <span className="ml-auto text-xs font-bold" style={{ color: "#c48a42" }}>{opt.weight}pts</span>
          )}
        </div>
      ))}
    </div>
  );

  // Priorização
  if (field.type === "ranking") return (
    <div className="flex flex-col gap-1 mt-1">
      {field.rankingItems.map((item, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#5c3f13" }}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "#fbf3e7", color: "#c48a42", border: "1px solid #e8d8be" }}>{i+1}</span>
          <i className="ti ti-grip-vertical text-xs" style={{ color: "#d9bb8c" }} />
          {item}
        </div>
      ))}
    </div>
  );
  if (field.type === "points_distribution") return (
    <div className="flex flex-col gap-1 mt-1">
      <p className="text-xs font-semibold mb-1" style={{ color: "#c48a42" }}>Total: {field.totalPoints} pontos</p>
      {field.options.slice(0, 3).map(opt => (
        <div key={opt.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ border: "1px solid #e8d8be", background: "#fbf3e7" }}>
          <span className="flex-1 text-xs" style={{ color: "#5c3f13" }}>{opt.label}</span>
          <div className="w-12 h-5 rounded border text-center text-xs" style={{ border: "1px solid #e8d8be", color: "#a06d28" }}>0</div>
        </div>
      ))}
    </div>
  );
  if (field.type === "card_sorting") return (
    <div className="mt-1">
      <div className="flex gap-2">
        {field.cardCategories.slice(0, 2).map((cat, i) => (
          <div key={i} className="flex-1 rounded-lg p-2" style={{ border: "1px dashed #d2a05c", background: "#fbf3e7" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#c48a42" }}>{cat}</p>
            <div className="h-8 rounded" style={{ background: "#fbf3e7", border: "1px solid #e8d8be" }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-2 flex-wrap">
        {field.cardItems.slice(0, 3).map((item, i) => (
          <div key={i} className="px-2 py-1 rounded text-xs font-medium"
            style={{ border: "1px solid #d2a05c", background: "#fff", color: "#5c3f13" }}>{item}</div>
        ))}
      </div>
    </div>
  );

  // Lógica
  if (field.type === "conditional") return (
    <div className="p-3 rounded-lg mt-1" style={{ background: "#eaf0e4", border: "1px solid #a0d4b8" }}>
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#3a5430" }}>
        <i className="ti ti-git-branch" /> Esta pergunta aparece condicionalmente
      </div>
      <p className="text-xs mt-1" style={{ color: "#3d8c60" }}>Configure a condição no painel de propriedades.</p>
    </div>
  );

  // Geográficos
  if (field.type === "geo_region")       return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-map-pin"/>Selecione a região...</div>;
  if (field.type === "geo_state")        return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-map"/>Selecione o estado...</div>;
  if (field.type === "geo_mesoregion")   return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-topology-ring"/>Mesorregião (carrega do estado)...</div>;
  if (field.type === "geo_microregion")  return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-topology-star"/>Microrregião (carrega do estado)...</div>;
  if (field.type === "geo_city")         return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-building"/>Município (carrega do estado)...</div>;
  if (field.type === "geo_district")     return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-map-pins"/>Distrito (carrega do município)...</div>;
  if (field.type === "geo_neighborhood") return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-home"/>Digite o bairro...</div>;
  if (field.type === "geo_zone")         return (
    <div className="flex flex-wrap gap-1 mt-1">
      {field.zoneOptions.map((z, i) => (
        <div key={i} className="px-2 py-1 rounded text-xs" style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#a06d28" }}>{z}</div>
      ))}
    </div>
  );
  if (field.type === "geo_coords")       return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-crosshair"/>Capturar localização GPS</div>;
  if (field.type === "geo_map")          return (
    <div className="rounded-lg overflow-hidden mt-1" style={{ border: "1px solid #e8d8be", height: "80px", background: "#e8f4e0" }}>
      <div className="w-full h-full flex items-center justify-center gap-2 text-xs font-semibold" style={{ color: "#3a5430" }}>
        <i className="ti ti-map-2 text-lg" /> Mapa interativo — clique para marcar ponto ou desenhar área
      </div>
    </div>
  );
  if (field.type === "geo_relational")   return <div className={cls + " flex items-center gap-2"} style={empty}><i className="ti ti-point"/>Selecionar ponto de interesse...</div>;

  // Coleta estruturada
  if (field.type === "matrix" || field.type === "observation") return (
    <div className="mt-1 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1.5 text-left" style={{ color: "#a06d28", fontWeight: 500 }}></th>
            {field.matrixCols.map((col, i) => (
              <th key={i} className="p-1.5 text-center" style={{ color: "#5c3f13", fontWeight: 600, fontSize: "10px" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {field.matrixRows.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid #e8d8be" }}>
              <td className="p-1.5 pr-3" style={{ color: "#5c3f13", fontWeight: 500, fontSize: "10px" }}>{row}</td>
              {field.matrixCols.map((_, j) => (
                <td key={j} className="p-1.5 text-center">
                  <div className="w-3.5 h-3.5 rounded-full mx-auto" style={{ border: "1.5px solid #d2a05c" }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (field.type === "data_table") return (
    <div className="mt-1 rounded-lg overflow-hidden" style={{ border: "1px solid #e8d8be" }}>
      <div className="flex" style={{ background: "#fbf3e7", borderBottom: "1px solid #e8d8be" }}>
        {field.tableColumns.map((h, i) => (
          <div key={i} className="flex-1 px-2 py-1.5 text-xs font-bold" style={{ color: "#c48a42", borderLeft: i > 0 ? "1px solid #e8d8be" : "none" }}>{h}</div>
        ))}
      </div>
      {[0,1].map(i => (
        <div key={i} className="flex" style={{ borderBottom: "1px solid #f3e4cb", background: i % 2 === 0 ? "#fff" : "#fbf3e7" }}>
          {field.tableColumns.map((_, j) => (
            <div key={j} className="flex-1 px-2 py-1.5 text-xs" style={{ color: "#d9bb8c", borderLeft: j > 0 ? "1px solid #f3e4cb" : "none" }}>...</div>
          ))}
        </div>
      ))}
      <div className="px-2 py-1.5 text-xs font-semibold" style={{ color: "#c48a42" }}>+ Adicionar linha</div>
    </div>
  );
  if (field.type === "timeline") return (
    <div className="mt-2 px-1">
      <div className="relative">
        <div className="h-0.5 rounded-full" style={{ background: "#e8d8be" }} />
        {[0.2, 0.5, 0.8].map((pos, i) => (
          <div key={i} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pos * 100}%` }}>
            <div className="w-3 h-3 rounded-full bg-white border-2" style={{ borderColor: "#c48a42" }} />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap" style={{ color: "#a06d28", fontSize: "9px" }}>
              {[field.timelineStart, "Evento", field.timelineEnd][i]}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-6">
        <span className="text-xs font-semibold" style={{ color: "#c48a42", fontSize: "9px" }}>{field.timelineStart}</span>
        <span className="text-xs font-semibold" style={{ color: "#c48a42", fontSize: "9px" }}>{field.timelineEnd}</span>
      </div>
    </div>
  );
  if (field.type === "availability") return (
    <div className="mt-1 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.max(field.availabilityDays.length, 1)}, minmax(0, 1fr))` }}>
      {field.availabilityDays.map((d, i) => (
        <div key={i} className="text-center">
          <div className="text-xs font-bold mb-0.5" style={{ color: "#a06d28", fontSize: "9px" }}>{d}</div>
          {field.availabilityPeriods.map((_, r) => (
            <div key={r} className="h-5 rounded mb-0.5 flex items-center justify-center"
              style={{ background: (i+r)%3===0 ? "#eaf0e4" : "#fbf3e7", border: "1px solid #e8d8be" }}>
              {(i+r)%3===0 && <i className="ti ti-check text-xs" style={{ color: "#4c6b3c" }} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // Coleta avançada
  if (field.type === "audio") return (
    <div className={cls + " flex items-center gap-2"} style={{ ...empty, cursor: "default" }}>
      <i className="ti ti-microphone" style={{ color: "#c48a42" }} /> Gravar resposta em áudio
    </div>
  );
  if (field.type === "photo_annotation") return (
    <div className={cls + " flex flex-col items-center justify-center gap-1"} style={{ ...empty, height: "64px", cursor: "default" }}>
      <span className="flex items-center gap-2"><i className="ti ti-photo-edit" /> Foto com marcações comentadas</span>
    </div>
  );
  if (field.type === "doc_capture") return (
    <div className={cls + " flex items-center gap-2"} style={{ ...empty, cursor: "default" }}>
      <i className="ti ti-scan" /> Foto do documento + transcrição
    </div>
  );
  if (field.type === "pairwise") return (
    <div className="flex items-center gap-2 mt-1">
      {field.pairwiseItems.slice(0, 2).map((item, i) => (
        <div key={i} className="flex-1 px-3 py-2 rounded-lg text-xs text-center font-medium"
          style={{ border: "1px solid #d2a05c", background: "#fbf3e7", color: "#5c3f13" }}>{item}</div>
      ))}
      <span className="text-xs font-bold" style={{ color: "#c48a42" }}>vs</span>
    </div>
  );
  if (field.type === "equation") return (
    <div className={cls + " flex items-center gap-2"} style={{ ...empty, cursor: "default", fontFamily: "monospace" }}>
      <i className="ti ti-math" /> {field.formula || "Ex.: {P1} / ({P2} * {P2})"}
    </div>
  );
  if (field.type === "dynamic_consent") return (
    <div className="flex flex-col gap-1.5 mt-1">
      {field.consentItems.slice(0, 3).map((item, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#a06d28" }}>
          <div className="w-3 h-3 rounded flex-shrink-0" style={{ border: "1.5px solid #d2a05c" }} /> {item}
        </div>
      ))}
    </div>
  );
  if (field.type === "field_diary") return (
    <div className={cls + " flex flex-col gap-1"} style={{ ...empty, cursor: "default" }}>
      <span className="flex items-center gap-2"><i className="ti ti-notebook" /> Registro cronológico com data/hora</span>
      <span style={{ fontSize: "9px" }}>Cada entrada recebe carimbo de data/hora automático</span>
    </div>
  );
  if (field.type === "multi_upload") return (
    <div className="flex flex-col gap-1 mt-1">
      {field.uploadItems.slice(0, 3).map((item, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#a06d28" }}>
          <i className="ti ti-upload text-xs" /> {item}
        </div>
      ))}
    </div>
  );
  if (field.type === "qr_barcode") return (
    <div className={cls + " flex items-center gap-2"} style={{ ...empty, cursor: "default" }}>
      <i className="ti ti-qrcode" /> Ler QR / código de barras pela câmera
    </div>
  );
  if (field.type === "bibliography") return (
    <div className="grid grid-cols-2 gap-1 mt-1">
      {["Autor(es)", "Ano", "Título", "DOI / Fonte"].map((h, i) => (
        <div key={i} className={cls} style={{ ...empty, fontSize: "10px", cursor: "default" }}>{h}</div>
      ))}
    </div>
  );

  return null;
}

// ─── Modal de tipo em desenvolvimento ────────────────────────────────────────

function DevModal({ type, onClose }: { type: FieldType; onClose: () => void }) {
  const info = getTypeInfo(type);
  const desc = DEV_TYPES[type] ?? "Este recurso está em desenvolvimento.";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl p-6 shadow-xl"
        style={{ background: "#fff", border: "1px solid #e8d8be" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: info.bg }}>
            <i className={`ti ${info.icon} text-lg`} style={{ color: info.color }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{info.label}</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#fbf3e7", color: "#c48a42", border: "1px solid #e8d8be" }}>
              Em desenvolvimento
            </span>
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "#5c3f13" }}>{desc}</p>
        <button onClick={onClose} className="w-full py-2 rounded-lg text-sm font-bold"
          style={{ background: "#c48a42", color: "#fff" }}>
          Entendido
        </button>
      </div>
    </div>
  );
}

// ─── Painel de capa ───────────────────────────────────────────────────────────

function CoverPanel({ cover, coverImage, onSelectCover, onUploadImage }: {
  cover: string; coverImage: string | null;
  onSelectCover: (id: string) => void; onUploadImage: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onUploadImage(ev.target.result as string); };
    reader.readAsDataURL(file);
  }

  return (
    <div className="p-3">
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#c48a42", fontSize: "9px" }}>Modelos de capa</p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {COVER_PRESETS.map(p => (
          <button key={p.id} onClick={() => onSelectCover(p.id)}
            className="relative h-10 rounded-md overflow-hidden text-white text-xs font-semibold flex items-center justify-center transition-all"
            style={{ background: p.style, outline: cover === p.id ? "2px solid #c48a42" : "none", outlineOffset: "2px" }}>
            {p.label}
            {cover === p.id && (
              <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <i className="ti ti-check text-xs" style={{ color: "#c48a42" }} />
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="border-t pt-3" style={{ borderColor: "#e8d8be" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#c48a42", fontSize: "9px" }}>Imagem personalizada</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold"
          style={{ border: "1.5px dashed #d2a05c", background: "#fbf3e7", color: "#7a5218" }}>
          <i className="ti ti-upload" /> Fazer upload de imagem
        </button>
        {coverImage && (
          <div className="mt-2 rounded-md overflow-hidden h-12 relative">
            <img src={coverImage} alt="Capa" className="w-full h-full object-cover" />
            <button onClick={() => onUploadImage("")}
              className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
              <i className="ti ti-x text-white text-xs" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editor genérico de lista de textos (colunas, itens, dias...) ────────────

function StrListEditor({ label, items, minItems = 1, addLabel, onChange }: {
  label: string; items: string[]; minItems?: number; addLabel: string;
  onChange: (items: string[]) => void;
}) {
  const iS = { border: "1px solid #e8d8be", background: "#fff", color: "#3d2a0d" };
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#c48a42", fontSize: "9px" }}>{label}</p>
      <div className="flex flex-col gap-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <input value={item} onChange={e => onChange(items.map((r, j) => j === i ? e.target.value : r))}
              className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
            {items.length > minItems && (
              <button onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                <i className="ti ti-x text-xs" />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => onChange([...items, `${addLabel} ${items.length + 1}`])}
          className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
          <i className="ti ti-plus" /> Adicionar {addLabel.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

// ─── Painel direito ───────────────────────────────────────────────────────────

function RightPanel({ field, allFields, onUpdate, onDelete, showCover, cover, coverImage, onSelectCover, onUploadImage }: {
  field: Field | null; allFields: Field[]; onUpdate: (f: Field) => void; onDelete: () => void;
  showCover: boolean; cover: string; coverImage: string | null;
  onSelectCover: (id: string) => void; onUploadImage: (url: string) => void;
}) {
  if (showCover) return <CoverPanel cover={cover} coverImage={coverImage} onSelectCover={onSelectCover} onUploadImage={onUploadImage} />;

  if (!field) return (
    <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
      <i className="ti ti-click text-3xl opacity-20" style={{ color: "#c48a42" }} />
      <span className="text-xs leading-relaxed" style={{ color: "#a06d28" }}>Selecione um campo para editar suas propriedades</span>
    </div>
  );

  const info = getTypeInfo(field.type);
  const f = field;
  function update(patch: Partial<Field>) { onUpdate({ ...f, ...patch } as Field); }
  function addOption() { update({ options: [...f.options, { id: Math.random().toString(36).slice(2,8), label: `Opção ${f.options.length + 1}`, weight: f.options.length + 1 }] }); }
  function updateOption(id: string, label: string) { update({ options: f.options.map(o => o.id === id ? { ...o, label } : o) }); }
  function updateWeight(id: string, weight: number) { update({ options: f.options.map(o => o.id === id ? { ...o, weight } : o) }); }
  function removeOption(id: string) { update({ options: f.options.filter(o => o.id !== id) }); }

  const iS = { border: "1px solid #e8d8be", background: "#fff", color: "#3d2a0d" };
  const iC = "w-full px-2 py-1.5 text-xs rounded border focus:outline-none focus:ring-1";
  const TS = { color: "#c48a42", fontSize: "9px" } as const;

  return (
    <div className="flex flex-col overflow-y-auto p-3 gap-4">
      {/* Tipo */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Tipo</p>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs" style={{ background: "#fbf3e7", border: "1px solid #e8d8be", color: "#5c3f13" }}>
          <i className={`ti ${info.icon}`} style={{ color: info.color }} /> {info.label}
        </div>
      </div>

      {/* Label */}
      {field.type !== "section" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>
            {field.type === "instruction" ? "Texto" : "Pergunta"}
          </p>
          <input value={field.label} onChange={e => update({ label: e.target.value })} className={iC} style={iS} placeholder="Digite aqui..." />
        </div>
      )}

      {/* Placeholder */}
      {["short_text","long_text","number","email","phone","cpf_cnpj","cep"].includes(field.type) && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Placeholder</p>
          <input value={field.placeholder} onChange={e => update({ placeholder: e.target.value })} className={iC} style={iS} placeholder="Texto de ajuda..." />
        </div>
      )}

      {/* Descrição */}
      {!["section","instruction"].includes(field.type) && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Descrição</p>
          <textarea value={field.description} onChange={e => update({ description: e.target.value })}
            rows={2} className={iC + " resize-none"} style={iS} placeholder="Descrição opcional..." />
        </div>
      )}

      {/* Obrigatório */}
      {!["section","instruction"].includes(field.type) && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "#5c3f13" }}>Obrigatório</span>
          <button onClick={() => update({ required: !field.required })}
            className="w-8 h-4 rounded-full relative transition-colors"
            style={{ background: field.required ? "#c48a42" : "#e8d8be" }}>
            <span className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${field.required ? "left-4" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {/* Opções */}
      {["single_choice","multiple_choice","points_distribution","consent"].includes(field.type) && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Opções</p>
          <div className="flex flex-col gap-1">
            {field.options.map(opt => (
              <div key={opt.id} className="flex items-center gap-1">
                <input value={opt.label} onChange={e => updateOption(opt.id, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
                {field.options.length > 1 && (
                  <button onClick={() => removeOption(opt.id)} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                    <i className="ti ti-x text-xs" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addOption} className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
              <i className="ti ti-plus" /> Adicionar opção
            </button>
          </div>
        </div>
      )}

      {/* Pesos */}
      {field.type === "weighted" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Opções e pesos</p>
          <div className="flex flex-col gap-1">
            {field.options.map(opt => (
              <div key={opt.id} className="flex items-center gap-1">
                <input value={opt.label} onChange={e => updateOption(opt.id, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
                <input type="number" value={opt.weight ?? 1} onChange={e => updateWeight(opt.id, +e.target.value)}
                  className="w-12 px-1 py-1 text-xs rounded border text-center focus:outline-none" style={iS} />
                {field.options.length > 1 && (
                  <button onClick={() => removeOption(opt.id)} className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                    <i className="ti ti-x text-xs" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addOption} className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
              <i className="ti ti-plus" /> Adicionar opção
            </button>
          </div>
        </div>
      )}

      {/* Escala */}
      {["scale","stars","nps","slider"].includes(field.type) && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Intervalo</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Mínimo</p>
                <input type="number" value={field.scaleMin} onChange={e => update({ scaleMin: +e.target.value })} className={iC} style={iS} />
              </div>
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Máximo</p>
                <input type="number" value={field.scaleMax} onChange={e => update({ scaleMax: +e.target.value })} className={iC} style={iS} />
              </div>
            </div>
          </div>
          {["scale","slider"].includes(field.type) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Legenda</p>
              <input value={field.scaleLabel} onChange={e => update({ scaleLabel: e.target.value })} className={iC} style={iS} placeholder="Ex: 1 = Ruim, 5 = Ótimo" />
            </div>
          )}
        </div>
      )}

      {/* Escala semântica */}
      {field.type === "semantic_scale" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={TS}>Extremos</p>
          <div>
            <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Polo esquerdo</p>
            <input value={field.semanticLeft} onChange={e => update({ semanticLeft: e.target.value })} className={iC} style={iS} />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Polo direito</p>
            <input value={field.semanticRight} onChange={e => update({ semanticRight: e.target.value })} className={iC} style={iS} />
          </div>
        </div>
      )}

      {/* Ranking */}
      {field.type === "ranking" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Itens para ordenar</p>
          <div className="flex flex-col gap-1">
            {field.rankingItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="w-4 text-xs font-bold text-center" style={{ color: "#c48a42" }}>{i+1}</span>
                <input value={item} onChange={e => update({ rankingItems: field.rankingItems.map((r, j) => j === i ? e.target.value : r) })}
                  className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
                {field.rankingItems.length > 2 && (
                  <button onClick={() => update({ rankingItems: field.rankingItems.filter((_, j) => j !== i) })}
                    className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                    <i className="ti ti-x text-xs" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => update({ rankingItems: [...field.rankingItems, `Item ${field.rankingItems.length + 1}`] })}
              className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
              <i className="ti ti-plus" /> Adicionar item
            </button>
          </div>
        </div>
      )}

      {/* Distribuição de pontos */}
      {field.type === "points_distribution" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Total de pontos</p>
          <input type="number" value={field.totalPoints} onChange={e => update({ totalPoints: +e.target.value })} className={iC} style={iS} />
        </div>
      )}

      {/* Card sorting */}
      {field.type === "card_sorting" && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Categorias</p>
            <div className="flex flex-col gap-1">
              {field.cardCategories.map((cat, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={cat} onChange={e => update({ cardCategories: field.cardCategories.map((c, j) => j === i ? e.target.value : c) })}
                    className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
                  {field.cardCategories.length > 1 && (
                    <button onClick={() => update({ cardCategories: field.cardCategories.filter((_, j) => j !== i) })}
                      className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                      <i className="ti ti-x text-xs" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => update({ cardCategories: [...field.cardCategories, `Categoria ${field.cardCategories.length + 1}`] })}
                className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
                <i className="ti ti-plus" /> Adicionar categoria
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Cartões</p>
            <div className="flex flex-col gap-1">
              {field.cardItems.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={item} onChange={e => update({ cardItems: field.cardItems.map((c, j) => j === i ? e.target.value : c) })}
                    className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
                  {field.cardItems.length > 2 && (
                    <button onClick={() => update({ cardItems: field.cardItems.filter((_, j) => j !== i) })}
                      className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                      <i className="ti ti-x text-xs" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => update({ cardItems: [...field.cardItems, `Item ${field.cardItems.length + 1}`] })}
                className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
                <i className="ti ti-plus" /> Adicionar cartão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zona da cidade */}
      {field.type === "geo_zone" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Zonas</p>
          <div className="flex flex-col gap-1">
            {field.zoneOptions.map((zone, i) => (
              <div key={i} className="flex items-center gap-1">
                <input value={zone} onChange={e => update({ zoneOptions: field.zoneOptions.map((z, j) => j === i ? e.target.value : z) })}
                  className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
                {field.zoneOptions.length > 1 && (
                  <button onClick={() => update({ zoneOptions: field.zoneOptions.filter((_, j) => j !== i) })}
                    className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                    <i className="ti ti-x text-xs" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => update({ zoneOptions: [...field.zoneOptions, `Zona ${field.zoneOptions.length + 1}`] })}
              className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
              <i className="ti ti-plus" /> Adicionar zona
            </button>
          </div>
        </div>
      )}

      {/* Matriz / Observação */}
      {["matrix","observation"].includes(field.type) && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Linhas</p>
            <div className="flex flex-col gap-1">
              {field.matrixRows.map((row, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={row} onChange={e => update({ matrixRows: field.matrixRows.map((r, j) => j === i ? e.target.value : r) })}
                    className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
                  {field.matrixRows.length > 1 && (
                    <button onClick={() => update({ matrixRows: field.matrixRows.filter((_, j) => j !== i) })}
                      className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                      <i className="ti ti-x text-xs" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => update({ matrixRows: [...field.matrixRows, `Linha ${field.matrixRows.length + 1}`] })}
                className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
                <i className="ti ti-plus" /> Adicionar linha
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Colunas</p>
            <div className="flex flex-col gap-1">
              {field.matrixCols.map((col, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={col} onChange={e => update({ matrixCols: field.matrixCols.map((c, j) => j === i ? e.target.value : c) })}
                    className="flex-1 px-2 py-1 text-xs rounded border focus:outline-none" style={iS} />
                  {field.matrixCols.length > 1 && (
                    <button onClick={() => update({ matrixCols: field.matrixCols.filter((_, j) => j !== i) })}
                      className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400">
                      <i className="ti ti-x text-xs" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => update({ matrixCols: [...field.matrixCols, `Coluna ${field.matrixCols.length + 1}`] })}
                className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: "#c48a42" }}>
                <i className="ti ti-plus" /> Adicionar coluna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linha do tempo */}
      {field.type === "timeline" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={TS}>Período</p>
          <div>
            <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Ano inicial</p>
            <input value={field.timelineStart} onChange={e => update({ timelineStart: e.target.value })} className={iC} style={iS} placeholder="Ex: 2000" />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Ano final</p>
            <input value={field.timelineEnd} onChange={e => update({ timelineEnd: e.target.value })} className={iC} style={iS} placeholder="Ex: 2024" />
          </div>
        </div>
      )}

      {/* Condicional — condição de exibição */}
      {field.type === "conditional" && (() => {
        const candidates = allFields.filter(o => o.id !== f.id && !["section", "instruction", "conditional"].includes(o.type));
        const target = candidates.find(o => o.id === f.condDependsOn) ?? null;
        const targetHasOptions = target !== null && ["single_choice", "multiple_choice", "weighted", "consent"].includes(target.type);
        return (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={TS}>Condição de exibição</p>
            <div>
              <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Depende da pergunta</p>
              <select value={f.condDependsOn} onChange={e => update({ condDependsOn: e.target.value, condValue: "" })} className={iC} style={iS}>
                <option value="">Selecione a pergunta...</option>
                {candidates.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Condição</p>
              <select value={f.condOperator} onChange={e => update({ condOperator: e.target.value })} className={iC} style={iS}>
                <option value="answered">Foi respondida (qualquer valor)</option>
                <option value="equals">É igual a</option>
                <option value="not_equals">É diferente de</option>
                <option value="contains">Contém o texto</option>
              </select>
            </div>
            {f.condOperator !== "answered" && (
              <div>
                <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Valor comparado</p>
                {targetHasOptions && f.condOperator !== "contains" && target ? (
                  <select value={f.condValue} onChange={e => update({ condValue: e.target.value })} className={iC} style={iS}>
                    <option value="">Selecione a opção...</option>
                    {target.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                ) : target && target.type === "yes_no" && f.condOperator !== "contains" ? (
                  <select value={f.condValue} onChange={e => update({ condValue: e.target.value })} className={iC} style={iS}>
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                ) : target && target.type === "geo_zone" && f.condOperator !== "contains" ? (
                  <select value={f.condValue} onChange={e => update({ condValue: e.target.value })} className={iC} style={iS}>
                    <option value="">Selecione a zona...</option>
                    {target.zoneOptions.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                ) : (
                  <input value={f.condValue} onChange={e => update({ condValue: e.target.value })} className={iC} style={iS} placeholder="Valor..." />
                )}
              </div>
            )}
            <p className="text-xs leading-relaxed" style={{ color: "#a06d28" }}>
              Esta pergunta só aparece para o respondente quando a condição for satisfeita. A resposta é registrada como texto curto.
            </p>
          </div>
        );
      })()}

      {/* Mapa — ponto / área */}
      {field.type === "geo_map" && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Tipo de marcação</p>
          <select value={f.geoMapMode} onChange={e => update({ geoMapMode: e.target.value as Field["geoMapMode"] })} className={iC} style={iS}>
            <option value="point">Ponto único</option>
            <option value="area">Área (polígono)</option>
            <option value="both">Ponto ou área — respondente escolhe</option>
          </select>
          <p className="text-xs leading-relaxed mt-2" style={{ color: "#a06d28" }}>
            O respondente marca a localização direto num mapa interativo (toque/clique).
          </p>
        </div>
      )}

      {/* Localização relacional (Catálogo de Entidades) */}
      {field.type === "geo_relational" && (
        <p className="text-xs leading-relaxed p-2 rounded" style={{ background: "#fbf3e7", border: "1px solid #e8d8be", color: "#5c3f13" }}>
          O respondente busca e seleciona uma entidade já cadastrada no Catálogo de Entidades
          (identificador persistente, ex.: COM-000245). Não há configuração adicional.
        </p>
      )}

      {/* Tabela de coleta */}
      {field.type === "data_table" && (
        <StrListEditor label="Colunas da tabela" addLabel="Coluna" items={f.tableColumns}
          onChange={v => update({ tableColumns: v })} />
      )}

      {/* Calendário de disponibilidade */}
      {field.type === "availability" && (
        <div className="flex flex-col gap-3">
          <StrListEditor label="Dias" addLabel="Dia" items={f.availabilityDays}
            onChange={v => update({ availabilityDays: v })} />
          <StrListEditor label="Períodos" addLabel="Período" items={f.availabilityPeriods}
            onChange={v => update({ availabilityPeriods: v })} />
        </div>
      )}

      {/* Comparação par a par */}
      {field.type === "pairwise" && (
        <div className="flex flex-col gap-2">
          <StrListEditor label="Itens para comparar" addLabel="Item" minItems={2} items={f.pairwiseItems}
            onChange={v => update({ pairwiseItems: v })} />
          <p className="text-xs leading-relaxed" style={{ color: "#a06d28" }}>
            {f.pairwiseItems.length} itens geram {f.pairwiseItems.length * (f.pairwiseItems.length - 1) / 2} comparações.
            O ranking final é calculado automaticamente.
          </p>
        </div>
      )}

      {/* Equação calculada */}
      {field.type === "equation" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={TS}>Fórmula</p>
          <input value={f.formula} onChange={e => update({ formula: e.target.value })}
            className={iC} style={{ ...iS, fontFamily: "monospace" }} placeholder="Ex.: {P1} / ({P2} * {P2})" />
          <p className="text-xs leading-relaxed" style={{ color: "#a06d28" }}>
            Use {"{P1}"}, {"{P2}"}... para referenciar respostas numéricas de outras perguntas,
            com + − * / e parênteses. Numeração atual:
          </p>
          <div className="flex flex-col gap-0.5">
            {allFields.filter(o => !["section", "instruction"].includes(o.type)).map((o, i) => o.id === f.id ? null : (
              <p key={o.id} className="text-xs truncate" style={{ color: "#5c3f13" }}>
                <span className="font-bold" style={{ color: "#c48a42" }}>{`{P${i + 1}}`}</span> {o.label}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Consentimento dinâmico */}
      {field.type === "dynamic_consent" && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Texto do consentimento (TCLE)</p>
            <textarea value={f.consentText} onChange={e => update({ consentText: e.target.value })}
              rows={5} className={iC + " resize-none"} style={iS}
              placeholder="Cole aqui o termo de consentimento livre e esclarecido..." />
          </div>
          <StrListEditor label="Itens de consentimento" addLabel="Item" items={f.consentItems}
            onChange={v => update({ consentItems: v })} />
          <p className="text-xs leading-relaxed" style={{ color: "#a06d28" }}>
            O respondente marca cada item individualmente. Se o campo for obrigatório,
            é preciso marcar pelo menos um item para avançar.
          </p>
        </div>
      )}

      {/* Upload múltiplo indexado */}
      {field.type === "multi_upload" && (
        <StrListEditor label="Itens da lista (um arquivo por item)" addLabel="Item" items={f.uploadItems}
          onChange={v => update({ uploadItems: v })} />
      )}

      {/* Deletar */}
      <button onClick={onDelete} className="mt-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#c0392b" }}>
        <i className="ti ti-trash" /> Remover campo
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

// ─── Conversão de campos salvos do banco para o formato do construtor ─────────
interface SavedForm { id: string; title: string; description: string | null; }
interface SavedField {
  id: string; type: string; label: string; description: string | null;
  placeholder: string | null; required: boolean; order: number;
  config: unknown;
}

function hydrateFields(saved: SavedField[]): Field[] {
  return saved.map(sf => {
    const cfg = (sf.config ?? {}) as Record<string, unknown>;
    const base = newField(sf.type as FieldType);
    return {
      ...base,
      id:           sf.id,
      type:         sf.type as FieldType,
      label:        sf.label || base.label,
      description:  sf.description ?? "",
      required:     Boolean(sf.required),
      placeholder:  (sf.placeholder ?? cfg.placeholder as string) ?? "",
      options:      Array.isArray(cfg.options) ? cfg.options as Field["options"] : base.options,
      scaleMin:     (cfg.min as number) ?? base.scaleMin,
      scaleMax:     (cfg.max as number) ?? base.scaleMax,
      scaleLabel:   (cfg.label as string) ?? base.scaleLabel,
      matrixRows:   Array.isArray(cfg.matrixRows) ? cfg.matrixRows as string[] : base.matrixRows,
      matrixCols:   Array.isArray(cfg.matrixCols) ? cfg.matrixCols as string[] : base.matrixCols,
      rankingItems: Array.isArray(cfg.rankingItems) ? cfg.rankingItems as string[] : base.rankingItems,
      totalPoints:  (cfg.totalPoints as number) ?? base.totalPoints,
      cardCategories: Array.isArray(cfg.cardCategories) ? cfg.cardCategories as string[] : base.cardCategories,
      cardItems:    Array.isArray(cfg.cardItems) ? cfg.cardItems as string[] : base.cardItems,
      semanticLeft: (cfg.semanticLeft as string) ?? base.semanticLeft,
      semanticRight:(cfg.semanticRight as string) ?? base.semanticRight,
      timelineStart:(cfg.timelineStart as string) ?? base.timelineStart,
      timelineEnd:  (cfg.timelineEnd as string) ?? base.timelineEnd,
      zoneOptions:  Array.isArray(cfg.zoneOptions) ? cfg.zoneOptions as string[] : base.zoneOptions,
      tableColumns:        Array.isArray(cfg.tableColumns) ? cfg.tableColumns as string[] : base.tableColumns,
      availabilityDays:    Array.isArray(cfg.availabilityDays) ? cfg.availabilityDays as string[] : base.availabilityDays,
      availabilityPeriods: Array.isArray(cfg.availabilityPeriods) ? cfg.availabilityPeriods as string[] : base.availabilityPeriods,
      geoMapMode:          (cfg.geoMapMode as Field["geoMapMode"]) ?? base.geoMapMode,
      condDependsOn:       (cfg.condDependsOn as string) ?? base.condDependsOn,
      condOperator:        (cfg.condOperator as string) ?? base.condOperator,
      condValue:           (cfg.condValue as string) ?? base.condValue,
      pairwiseItems:       Array.isArray(cfg.pairwiseItems) ? cfg.pairwiseItems as string[] : base.pairwiseItems,
      formula:             (cfg.formula as string) ?? base.formula,
      consentText:         (cfg.consentText as string) ?? base.consentText,
      consentItems:        Array.isArray(cfg.consentItems) ? cfg.consentItems as string[] : base.consentItems,
      uploadItems:         Array.isArray(cfg.uploadItems) ? cfg.uploadItems as string[] : base.uploadItems,
    };
  });
}

export function FormBuilderClient({ research, savedForm, savedFields }: { research: Research; savedForm?: SavedForm | null; savedFields?: SavedField[] }) {
  const router = useRouter();
  const [fields,          setFields]          = useState<Field[]>(() => hydrateFields(savedFields ?? []));
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [saving,          setSaving]          = useState(false);
  const [savedAt,         setSavedAt]         = useState<string | null>(null);
  const [formTitle,       setFormTitle]       = useState(savedForm?.title ?? research.title);
  const [formDescription, setFormDescription] = useState(savedForm?.description ?? research.description ?? "");
  const [cover,           setCover]           = useState("campo");
  const [coverImage,      setCoverImage]      = useState<string | null>(null);
  const [showCover,       setShowCover]       = useState(false);
  const [devModal,        setDevModal]        = useState<FieldType | null>(null);
  const dragRef = useRef<number | null>(null);

  const selectedField = fields.find(f => f.id === selectedId) ?? null;

  // Carrega os campos salvos da API ao montar (fonte confiável, evita perder dados)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`/api/researches/${research.id}/form`);
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data ?? json;
        if (!data || !Array.isArray(data.fields) || data.fields.length === 0) return;
        if (cancel) return;
        const hydrated = hydrateFields(data.fields as SavedField[]);
        // Só sobrescreve se o estado atual estiver vazio (não apaga trabalho em progresso)
        setFields(prev => prev.length === 0 ? hydrated : prev);
        if (data.title) setFormTitle((t: string) => t || data.title);
      } catch { /* silencioso */ }
    })();
    return () => { cancel = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const coverStyle = coverImage
    ? { backgroundImage: `url(${coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: COVER_PRESETS.find(p => p.id === cover)?.style ?? COVER_PRESETS[0].style };

  const handleAddField = useCallback((type: FieldType, isDev: boolean) => {
    if (isDev) { setDevModal(type); return; }
    const field = newField(type);
    setFields(prev => [...prev, field]);
    setSelectedId(field.id);
    setShowCover(false);
  }, []);

  const updateField  = useCallback((updated: Field) => { setFields(prev => prev.map(f => f.id === updated.id ? updated : f)); }, []);
  const deleteField  = useCallback(() => { if (!selectedId) return; setFields(prev => prev.filter(f => f.id !== selectedId)); setSelectedId(null); }, [selectedId]);
  const moveField    = useCallback((fromIdx: number, toIdx: number) => {
    setFields(prev => { const arr = [...prev]; const [item] = arr.splice(fromIdx, 1); arr.splice(toIdx, 0, item); return arr; });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/researches/${research.id}/form`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, description: formDescription, fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Erro ao salvar: " + (data?.error || res.status + " — verifique os campos"));
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      toast.success("Formulário salvo.");
    } catch (err) {
      toast.error("Erro de conexão ao salvar: " + String(err));
    } finally { setSaving(false); }
  }, [research.id, formTitle, formDescription, fields]);

  const questionFields = fields.filter(f => f.type !== "section" && f.type !== "instruction");
  const sectionFields  = fields.filter(f => f.type === "section");
  const BRD = "1px solid #e8d8be";
  const TS  = { color: "#c48a42", fontSize: "9px" } as const;

  return (
    <>
      {devModal && <DevModal type={devModal} onClose={() => setDevModal(null)} />}

      <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#fbf3e7" }}>

        {/* TOPBAR */}
        <header className="h-12 flex items-center justify-between px-4 flex-shrink-0 z-50"
          style={{ background: "#fbf3e7", borderBottom: BRD }}>
          <button onClick={() => router.push("/dashboard")}>
            <DataLogo className="text-lg" />
          </button>
          <div className="flex items-center gap-2">
            <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
              className="text-sm font-semibold border-none bg-transparent outline-none text-center border-b-2 border-transparent transition-colors min-w-48 px-1"
              style={{ color: "#0f172a" }}
              onFocus={e => e.currentTarget.style.borderBottomColor = "#d2a05c"}
              onBlur={e => e.currentTarget.style.borderBottomColor = "transparent"} />
            {savedAt && <span className="text-xs flex items-center gap-1" style={{ color: "#a06d28" }}><i className="ti ti-check" style={{ color: "#4c6b3c" }} /> Salvo às {savedAt}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.open(`/p/${research.slug}?preview=true`, "_blank")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md"
              style={{ border: BRD, background: "#fff", color: "#5c3f13" }}>
              <i className="ti ti-eye" /> Preview
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

          {/* Painel esquerdo */}
          <aside className="w-48 flex-shrink-0 overflow-y-auto py-3 px-2.5" style={{ background: "#fbf3e7", borderRight: BRD }}>
            {FIELD_TYPES.map(group => (
              <div key={group.group}>
                <p className="px-1 mb-1.5 mt-3 first:mt-0 font-bold uppercase tracking-widest" style={TS}>{group.group}</p>
                {group.items.map(item => (
                  <button key={item.type} onClick={() => handleAddField(item.type, item.dev ?? false)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md mb-1 text-left transition-all relative"
                    style={{ border: BRD, background: item.dev ? "#f9fafb" : "#fff", opacity: item.dev ? 0.75 : 1 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = item.dev ? "#d1d5db" : "#d2a05c"; e.currentTarget.style.background = item.dev ? "#f3f4f6" : "#fbf3e7"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8d8be"; e.currentTarget.style.background = item.dev ? "#f9fafb" : "#fff"; }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0" style={{ background: item.bg, color: item.color }}>
                      <i className={`ti ${item.icon}`} />
                    </div>
                    <span className="text-xs font-medium flex-1" style={{ color: item.dev ? "#9ca3af" : "#5c3f13" }}>{item.label}</span>
                    {item.dev && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "#fef3c7", color: "#92400e", fontSize: "8px", fontWeight: 700 }}>Dev</span>}
                  </button>
                ))}
              </div>
            ))}
          </aside>

          {/* Canvas */}
          <main className="flex-1 overflow-y-auto p-5" style={{ background: "#f3e4cb" }}>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { val: questionFields.length, label: "Perguntas" },
                { val: sectionFields.length,  label: "Seções" },
                { val: `~${Math.max(1, Math.ceil(questionFields.length * 1.2))} min`, label: "Tempo est." },
                { val: 0, label: "Respostas" },
              ].map(stat => (
                <div key={stat.label} className="rounded-lg p-3 text-center" style={{ background: "#fff", border: BRD }}>
                  <p className="text-lg font-bold" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif" }}>{stat.val}</p>
                  <p className="font-semibold mt-0.5" style={{ ...TS, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Cabeçalho */}
            <div className="rounded-xl p-4 mb-4" style={{ background: "#fff", border: BRD }}>
              <div className="w-full h-20 rounded-lg mb-3 flex items-center justify-center text-white text-xs gap-2 cursor-pointer transition-opacity hover:opacity-90"
                style={coverStyle} onClick={() => { setShowCover(true); setSelectedId(null); }}>
                <i className="ti ti-photo" />
                <span className="font-semibold">Clique para alterar a capa</span>
              </div>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)}
                className="w-full text-xl font-bold border-none bg-transparent outline-none border-b-2 border-transparent transition-colors pb-1"
                style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif" }}
                placeholder="Título do formulário"
                onFocus={e => e.currentTarget.style.borderBottomColor = "#d2a05c"}
                onBlur={e => e.currentTarget.style.borderBottomColor = "transparent"} />
              <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                rows={2} className="w-full text-xs border-none bg-transparent outline-none resize-none mt-1 font-medium"
                style={{ color: "#a06d28" }} placeholder="Adicione uma descrição para o formulário..."
                onClick={e => e.stopPropagation()} />
            </div>

            {/* Campos */}
            {fields.length === 0 ? (
              <div className="text-center py-16 rounded-xl" style={{ border: "2px dashed #d9bb8c", background: "#fbf3e7" }}>
                <i className="ti ti-forms text-3xl block mb-2" style={{ color: "#d9bb8c" }} />
                <p className="text-sm font-semibold mb-1" style={{ color: "#5c3f13" }}>Nenhum campo adicionado</p>
                <p className="text-xs" style={{ color: "#a06d28" }}>Clique nos tipos de campo no painel esquerdo</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {fields.map((field, idx) => {
                  const info      = getTypeInfo(field.type);
                  const isSection = field.type === "section";
                  const selected  = field.id === selectedId;

                  if (isSection) return (
                    <div key={field.id} onClick={() => { setSelectedId(field.id); setShowCover(false); }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer"
                      style={{ background: "#c48a42", outline: selected ? "2px solid #7a5218" : "none", outlineOffset: "2px" }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                        <i className="ti ti-layout-navbar text-white text-xs" />
                      </div>
                      <input value={field.label} onChange={e => updateField({ ...field, label: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-transparent border-none outline-none text-white text-sm font-semibold" />
                      <div className="flex gap-1">
                        {[
                          { icon: "ti-arrow-up",   action: () => idx > 0 && moveField(idx, idx - 1) },
                          { icon: "ti-arrow-down", action: () => idx < fields.length - 1 && moveField(idx, idx + 1) },
                          { icon: "ti-x",          action: () => { setFields(prev => prev.filter(f => f.id !== field.id)); setSelectedId(null); } },
                        ].map((btn, i) => (
                          <button key={i} onClick={e => { e.stopPropagation(); btn.action(); }}
                            className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
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
                      style={{ background: "#fff", border: selected ? "2px solid #c48a42" : BRD, boxShadow: selected ? "0 0 0 3px rgba(196,138,66,0.1)" : "none" }}>

                      <div className="flex items-start gap-2 mb-3">
                        <i className="ti ti-grip-vertical text-base mt-0.5 cursor-grab" style={{ color: "#d9bb8c" }} />
                        {qNum !== null && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5"
                            style={{ background: "#fbf3e7", color: "#c48a42", border: BRD }}>P{qNum}</span>
                        )}
                        <input value={field.label} onChange={e => updateField({ ...field, label: e.target.value })}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 text-sm font-semibold border-none bg-transparent outline-none border-b-2 border-transparent transition-colors"
                          style={{ color: "#0f172a" }} placeholder="Enunciado da pergunta" />
                        <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 font-semibold"
                          style={{ background: info.bg, color: info.color }}>{info.label}</span>
                        <div className="flex gap-1">
                          {[
                            { icon: "ti-arrow-up",   action: () => idx > 0 && moveField(idx, idx - 1) },
                            { icon: "ti-arrow-down", action: () => idx < fields.length - 1 && moveField(idx, idx + 1) },
                            { icon: "ti-trash",      action: () => { setFields(prev => prev.filter(f => f.id !== field.id)); setSelectedId(null); }, danger: true },
                          ].map((btn, i) => (
                            <button key={i} onClick={e => { e.stopPropagation(); btn.action(); }}
                              className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                              style={{ border: BRD, background: "#fbf3e7", color: btn.danger ? "#c0392b" : "#a06d28" }}>
                              <i className={`ti ${btn.icon} text-xs`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {selected && field.type !== "section" && (
                        <input value={field.description} onChange={e => updateField({ ...field, description: e.target.value })}
                          onClick={e => e.stopPropagation()}
                          className="w-full text-xs border-none bg-transparent outline-none border-b transition-colors mb-2 pl-8"
                          style={{ color: "#a06d28", borderBottomColor: "#e8d8be" }} placeholder="Descrição opcional..." />
                      )}

                      <div className="pl-8">
                        <FieldPreview field={field} />
                        {field.required && <p className="text-xs mt-1 font-semibold" style={{ color: "#c0392b" }}>* Obrigatório</p>}
                      </div>
                    </div>
                  );
                })}

                <button onClick={() => handleAddField("short_text", false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ border: "2px dashed #d9bb8c", background: "#fbf3e7", color: "#a06d28" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#c48a42"; e.currentTarget.style.color = "#c48a42"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#d9bb8c"; e.currentTarget.style.color = "#a06d28"; }}>
                  <i className="ti ti-plus" /> Adicionar campo
                </button>
              </div>
            )}
          </main>

          {/* Painel direito */}
          <aside className="w-56 flex-shrink-0 overflow-hidden flex flex-col" style={{ background: "#fbf3e7", borderLeft: BRD }}>
            <div className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: BRD }}>
              <i className="ti ti-settings text-sm" style={{ color: "#c48a42" }} />
              <span className="text-xs font-bold" style={{ color: "#5c3f13" }}>
                {showCover ? "Capa do formulário" : "Propriedades"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RightPanel
                field={selectedField} allFields={fields} onUpdate={updateField} onDelete={deleteField}
                showCover={showCover} cover={cover} coverImage={coverImage}
                onSelectCover={id => { setCover(id); setCoverImage(null); }}
                onUploadImage={url => { setCoverImage(url); setCover(""); }}
              />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
