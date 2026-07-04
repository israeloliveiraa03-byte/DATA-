"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { Research, Form, FormField } from "@/lib/types";
import { DataLogo } from "@/components/layout/data-logo";
import { useOfflineStorage } from "@/lib/hooks/use-offline-storage";

// Leaflet nunca pode ser importado estaticamente (quebra o build no servidor) —
// mesma regra do PolygonMapEditor. O mapa só carrega quando o campo aparece.
const GeoMapField = dynamic(() => import("./geo-map-field"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-xl text-sm"
      style={{ border: "1px solid #e8d8be", background: "#fbf3e7", color: "#a06d28", height: 280 }}>
      <i className="ti ti-loader-2 animate-spin mr-2" /> Carregando mapa...
    </div>
  ),
});

// ─── Tipos de resposta ────────────────────────────────────────────────────────
type AnswerValue = string | string[] | number | boolean | Record<string, unknown> | Record<string, unknown>[] | null;
type Answers = Record<string, AnswerValue>;
type Opt = { id: string; label: string; weight?: number };

// ─── Lógica de exibição condicional ──────────────────────────────────────────
// Um campo do tipo "conditional" só aparece quando a condição configurada no
// form-builder (config.condDependsOn/condOperator/condValue) for satisfeita
// pela resposta já dada em outra pergunta.
function conditionMet(cfg: Record<string, unknown>, answers: Answers): boolean {
  const dependsOn = cfg.condDependsOn as string | undefined;
  if (!dependsOn) return true; // sem condição configurada → sempre visível
  const operator = (cfg.condOperator as string) || "answered";
  const target   = String(cfg.condValue ?? "");
  const answer   = answers[dependsOn];
  const answered = answer !== null && answer !== undefined && answer !== ""
    && !(Array.isArray(answer) && answer.length === 0);
  if (operator === "answered") return answered;
  if (!answered) return false;
  const values = Array.isArray(answer) ? answer.map(String) : [String(answer)];
  if (operator === "equals")     return values.includes(target);
  if (operator === "not_equals") return !values.includes(target);
  if (operator === "contains")   return values.some(v => v.toLowerCase().includes(target.toLowerCase()));
  return true;
}

const UFS_BY_REGIAO: Record<string, string[]> = {
  "Norte":         ["AC","AP","AM","PA","RO","RR","TO"],
  "Nordeste":      ["AL","BA","CE","MA","PB","PE","PI","RN","SE"],
  "Centro-Oeste":  ["DF","GO","MT","MS"],
  "Sudeste":       ["ES","MG","RJ","SP"],
  "Sul":           ["PR","RS","SC"],
};
const ALL_UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

// ─── Componentes de campo ─────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  allAnswers,
  allFields,
}: {
  field: FormField;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  allAnswers: Answers;
  allFields: FormField[];
}) {
  const cfg = (field.config ?? {}) as Record<string, unknown>;
  const BRD = "1px solid #e8d8be";
  const inputCls = "w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-shadow";
  const inputStyle = { border: BRD, background: "#fff", color: "#3d2a0d", boxShadow: "none" };

  switch (field.type as string) {
    case "short_text":
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={cfg.placeholder as string || "Sua resposta..."}
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "long_text":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={cfg.placeholder as string || "Sua resposta..."}
          rows={4}
          className={inputCls + " resize-none"}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={cfg.placeholder as string || "0"}
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "email":
      return (
        <input
          type="email"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="seu@email.com"
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "phone":
      return (
        <input
          type="tel"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="(00) 00000-0000"
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "time":
      return (
        <input
          type="time"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "yes_no":
      return (
        <div className="flex gap-3">
          {["Sim", "Não"].map(opt => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                border: value === opt ? "2px solid #c48a42" : BRD,
                background: value === opt ? "#fbf3e7" : "#fff",
                color: value === opt ? "#7a5218" : "#5c3f13",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      );

    case "single_choice":
    case "weighted":
    case "consent": {
      const options = (cfg.options as Opt[]) ?? [];
      return (
        <div className="flex flex-col gap-2">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
              style={{
                border: value === opt.id ? "2px solid #c48a42" : BRD,
                background: value === opt.id ? "#fbf3e7" : "#fff",
                color: "#3d2a0d",
              }}
            >
              <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ border: value === opt.id ? "5px solid #c48a42" : "2px solid #d2a05c" }} />
              <span className="flex-1">{opt.label}</span>
              {field.type === "weighted" && opt.weight !== undefined && (
                <span className="text-xs font-bold" style={{ color: "#c48a42" }}>{opt.weight}pts</span>
              )}
            </button>
          ))}
        </div>
      );
    }

    case "multiple_choice": {
      const options = (cfg.options as Opt[]) ?? [];
      const selected = (value as string[]) ?? [];
      return (
        <div className="flex flex-col gap-2">
          {options.map(opt => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => {
                  if (isSelected) onChange(selected.filter(v => v !== opt.id));
                  else onChange([...selected, opt.id]);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
                style={{
                  border: isSelected ? "2px solid #c48a42" : BRD,
                  background: isSelected ? "#fbf3e7" : "#fff",
                  color: "#3d2a0d",
                }}
              >
                <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                  style={{ border: isSelected ? "none" : "2px solid #d2a05c", background: isSelected ? "#c48a42" : "transparent" }}>
                  {isSelected && <i className="ti ti-check text-white text-xs" />}
                </div>
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "scale": {
      const min = (cfg.min as number) ?? 1;
      const max = (cfg.max as number) ?? 5;
      const label = cfg.label as string;
      return (
        <div>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className="w-11 h-11 rounded-xl text-sm font-bold transition-all"
                style={{
                  border: value === n ? "2px solid #c48a42" : BRD,
                  background: value === n ? "#c48a42" : "#fff",
                  color: value === n ? "#fff" : "#5c3f13",
                }}
              >{n}</button>
            ))}
          </div>
          {label && <p className="text-xs mt-2" style={{ color: "#a06d28" }}>{label}</p>}
        </div>
      );
    }

    case "stars": {
      const max = (cfg.max as number) ?? 5;
      const current = (value as number) ?? 0;
      return (
        <div className="flex gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => onChange(n)} className="text-3xl transition-transform hover:scale-110">
              <i className={`ti ti-star${current >= n ? "-filled" : ""}`}
                style={{ color: current >= n ? "#c48a42" : "#e8d8be" }} />
            </button>
          ))}
        </div>
      );
    }

    case "nps": {
      const current = value as number;
      return (
        <div>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 11 }, (_, i) => i).map(n => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className="w-10 h-10 rounded-lg text-sm font-bold transition-all"
                style={{
                  border: current === n ? "2px solid #c48a42" : BRD,
                  background: current === n ? (n <= 6 ? "#c0392b" : n <= 8 ? "#c48a42" : "#4c6b3c") : "#fff",
                  color: current === n ? "#fff" : "#5c3f13",
                }}
              >{n}</button>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-medium" style={{ color: "#c0392b" }}>Muito improvável</span>
            <span className="text-xs font-medium" style={{ color: "#4c6b3c" }}>Muito provável</span>
          </div>
        </div>
      );
    }

    case "slider": {
      const min = (cfg.min as number) ?? 1;
      const max = (cfg.max as number) ?? 5;
      const current = (value as number) ?? min;
      return (
        <div className="px-1">
          <input
            type="range"
            min={min}
            max={max}
            value={current}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full accent-current"
            style={{ accentColor: "#c48a42" }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: "#a06d28" }}>{min}</span>
            <span className="text-sm font-bold" style={{ color: "#c48a42" }}>{current}</span>
            <span className="text-xs" style={{ color: "#a06d28" }}>{max}</span>
          </div>
        </div>
      );
    }

    case "semantic_scale": {
      const left  = (cfg.semanticLeft as string)  || "Discordo totalmente";
      const right = (cfg.semanticRight as string) || "Concordo totalmente";
      const current = value as number;
      return (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "#5c3f13", minWidth: "90px" }}>{left}</span>
            <div className="flex-1 flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => onChange(n)}
                  className="flex-1 h-11 rounded-lg text-sm font-bold transition-all"
                  style={{
                    border: current === n ? "2px solid #c48a42" : BRD,
                    background: current === n ? "#c48a42" : "#fff",
                    color: current === n ? "#fff" : "#5c3f13",
                  }}
                >{n}</button>
              ))}
            </div>
            <span className="text-xs font-medium text-right" style={{ color: "#5c3f13", minWidth: "90px" }}>{right}</span>
          </div>
        </div>
      );
    }

    case "cpf_cnpj": {
      function formatCpfCnpj(raw: string) {
        const d = raw.replace(/\D/g, "").slice(0, 14);
        if (d.length <= 11) {
          return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        }
        return d.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
      }
      return (
        <input
          type="text"
          inputMode="numeric"
          value={(value as string) ?? ""}
          onChange={e => onChange(formatCpfCnpj(e.target.value))}
          placeholder="000.000.000-00"
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );
    }

    case "date_range": {
      const range = (value as Record<string, unknown>) ?? {};
      return (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Início</p>
            <input type="date" value={(range.start as string) ?? ""}
              onChange={e => onChange({ ...range, start: e.target.value })}
              className={inputCls} style={inputStyle} />
          </div>
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: "#a06d28" }}>Fim</p>
            <input type="date" value={(range.end as string) ?? ""}
              onChange={e => onChange({ ...range, end: e.target.value })}
              className={inputCls} style={inputStyle} />
          </div>
        </div>
      );
    }

    case "ranking": {
      const items = (cfg.rankingItems as string[]) ?? [];
      const order = ((value as string[]) ?? items).filter(i => items.includes(i));
      const ordered = [...order, ...items.filter(i => !order.includes(i))];
      function move(i: number, dir: -1 | 1) {
        const next = [...ordered];
        const j = i + dir;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
      }
      return (
        <div className="flex flex-col gap-2">
          {ordered.map((item, i) => (
            <div key={item} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium"
              style={{ border: BRD, background: "#fff", color: "#3d2a0d" }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "#fbf3e7", color: "#c48a42", border: "1px solid #e8d8be" }}>{i + 1}</span>
              <span className="flex-1">{item}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center disabled:opacity-30" style={{ color: "#c48a42" }}>
                <i className="ti ti-chevron-up" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === ordered.length - 1} className="w-6 h-6 flex items-center justify-center disabled:opacity-30" style={{ color: "#c48a42" }}>
                <i className="ti ti-chevron-down" />
              </button>
            </div>
          ))}
        </div>
      );
    }

    case "points_distribution": {
      const options = (cfg.options as Opt[]) ?? [];
      const total = (cfg.totalPoints as number) ?? 100;
      const dist = (value as Record<string, unknown>) ?? {};
      const used = options.reduce((sum, o) => sum + (Number(dist[o.id]) || 0), 0);
      const remaining = total - used;
      return (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold" style={{ color: remaining < 0 ? "#c0392b" : "#c48a42" }}>
            {remaining} de {total} pontos restantes
          </p>
          {options.map(opt => (
            <div key={opt.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ border: BRD, background: "#fff" }}>
              <span className="flex-1 text-sm font-medium" style={{ color: "#3d2a0d" }}>{opt.label}</span>
              <input
                type="number"
                min={0}
                max={total}
                value={Number(dist[opt.id]) || 0}
                onChange={e => onChange({ ...dist, [opt.id]: Math.max(0, Number(e.target.value)) })}
                className="w-16 px-2 py-1 rounded-lg text-sm text-center border"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      );
    }

    case "card_sorting": {
      const categories = (cfg.cardCategories as string[]) ?? [];
      const items = (cfg.cardItems as string[]) ?? [];
      const assigned = (value as Record<string, unknown>) ?? {};
      return (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ border: BRD, background: "#fff" }}>
              <span className="flex-1 text-sm font-medium" style={{ color: "#3d2a0d" }}>{item}</span>
              <select
                value={(assigned[item] as string) ?? ""}
                onChange={e => onChange({ ...assigned, [item]: e.target.value })}
                className="px-2 py-1.5 rounded-lg text-sm border"
                style={inputStyle}
              >
                <option value="">Categorizar...</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          ))}
        </div>
      );
    }

    case "geo_zone": {
      const zones = (cfg.zoneOptions as string[]) ?? [];
      return (
        <div className="flex flex-col gap-2">
          {zones.map(zone => (
            <button
              key={zone}
              onClick={() => onChange(zone)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
              style={{
                border: value === zone ? "2px solid #c48a42" : BRD,
                background: value === zone ? "#fbf3e7" : "#fff",
                color: "#3d2a0d",
              }}
            >
              <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ border: value === zone ? "5px solid #c48a42" : "2px solid #d2a05c" }} />
              {zone}
            </button>
          ))}
        </div>
      );
    }

    case "matrix":
    case "observation": {
      const rows = (cfg.matrixRows as string[]) ?? [];
      const cols = (cfg.matrixCols as string[]) ?? [];
      const answersByRow = (value as Record<string, unknown>) ?? {};
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left"></th>
                {cols.map(col => (
                  <th key={col} className="p-2 text-center text-xs font-semibold" style={{ color: "#5c3f13" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row} style={{ borderTop: BRD }}>
                  <td className="p-2 pr-3 text-xs font-medium" style={{ color: "#5c3f13" }}>{row}</td>
                  {cols.map(col => (
                    <td key={col} className="p-2 text-center">
                      <button
                        onClick={() => onChange({ ...answersByRow, [row]: col })}
                        className="w-4 h-4 rounded-full mx-auto flex items-center justify-center"
                        style={{ border: answersByRow[row] === col ? "5px solid #c48a42" : "2px solid #d2a05c" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "signature":
    case "signature_meta":
      return (
        <SignatureField
          value={value}
          onChange={onChange}
          captureMetadata={field.type === "signature_meta"}
        />
      );

    case "geo_state": {
      const regionField = allFields.find(f => (f.type as string) === "geo_region");
      const selectedRegion = regionField ? (allAnswers[regionField.id] as string) : "";
      const ufs = selectedRegion ? (UFS_BY_REGIAO[selectedRegion] ?? ALL_UFS) : ALL_UFS;
      return (
        <select
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">Selecione o estado...</option>
          {ufs.map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
      );
    }

    case "geo_region":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">Selecione a região...</option>
          {["Norte","Nordeste","Centro-Oeste","Sudeste","Sul"].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      );

    case "geo_mesoregion":
      return <IbgeCascadeField kind="mesorregioes" placeholder="mesorregião" value={value} onChange={onChange} allAnswers={allAnswers} allFields={allFields} inputCls={inputCls} inputStyle={inputStyle} />;

    case "geo_microregion":
      return <IbgeCascadeField kind="microrregioes" placeholder="microrregião" value={value} onChange={onChange} allAnswers={allAnswers} allFields={allFields} inputCls={inputCls} inputStyle={inputStyle} />;

    case "geo_city":
      return <GeoCityField value={value} onChange={onChange} allAnswers={allAnswers} allFields={allFields} inputCls={inputCls} inputStyle={inputStyle} />;

    case "geo_neighborhood":
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="Digite o nome do bairro..."
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "geo_district":
      return <GeoDistrictField value={value} onChange={onChange} allAnswers={allAnswers} allFields={allFields} inputCls={inputCls} inputStyle={inputStyle} />;

    case "cep":
      return <CepField value={value} onChange={onChange} inputCls={inputCls} inputStyle={inputStyle} />;

    case "geo_coords":
      return (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(pos => {
                onChange(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
              });
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
            style={{ border: "2px solid #c48a42", background: "#fbf3e7", color: "#7a5218" }}
          >
            <i className="ti ti-crosshair" /> Capturar minha localização (GPS)
          </button>
          {value && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
              style={{ border: BRD, background: "#eaf0e4", color: "#3a5430" }}>
              <i className="ti ti-check" /> {value as string}
            </div>
          )}
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            placeholder="Ou digite: -15.7801, -47.9292"
            className={inputCls}
            style={{ ...inputStyle, fontSize: "12px" }}
            onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
            onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
          />
        </div>
      );

    case "file":
      return (
        <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer transition-colors"
          style={{ border: "2px dashed #d9bb8c", background: "#fbf3e7" }}>
          <i className="ti ti-upload text-2xl" style={{ color: "#c48a42" }} />
          <span className="text-sm font-semibold" style={{ color: "#5c3f13" }}>Clique para selecionar arquivo</span>
          <span className="text-xs" style={{ color: "#a06d28" }}>ou arraste e solte aqui</span>
          <input type="file" className="hidden" onChange={e => onChange(e.target.files?.[0]?.name ?? null)} />
        </label>
      );

    case "conditional":
      // A visibilidade é controlada em RespondentClient (conditionMet) — quando
      // este campo aparece, a resposta em si é registrada como texto curto.
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={cfg.placeholder as string || "Sua resposta..."}
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
      );

    case "geo_map":
      return (
        <GeoMapField
          mode={(cfg.geoMapMode as "point" | "area" | "both") ?? "point"}
          value={value}
          onChange={val => onChange(val)}
        />
      );

    case "geo_relational":
      return <GeoRelationalField value={value} onChange={onChange} inputCls={inputCls} inputStyle={inputStyle} />;

    case "data_table": {
      const cols = (cfg.tableColumns as string[]) ?? [];
      const rows = (value as Record<string, unknown>[]) ?? [];
      const setRows = (next: Record<string, unknown>[]) => onChange(next.length > 0 ? next : null);
      return (
        <div>
          <div className="overflow-x-auto rounded-xl" style={{ border: BRD }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "#fbf3e7" }}>
                  {cols.map(col => (
                    <th key={col} className="px-2 py-2 text-left text-xs font-bold" style={{ color: "#7a5218" }}>{col}</th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ borderTop: BRD }}>
                    {cols.map(col => (
                      <td key={col} className="p-1">
                        <input
                          value={(row[col] as string) ?? ""}
                          onChange={e => setRows(rows.map((r, j) => j === i ? { ...r, [col]: e.target.value } : r))}
                          className="w-full px-2 py-1.5 rounded-lg text-sm border focus:outline-none"
                          style={inputStyle}
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button onClick={() => setRows(rows.filter((_, j) => j !== i))}
                        className="w-6 h-6 inline-flex items-center justify-center" style={{ color: "#c0392b" }}>
                        <i className="ti ti-x text-xs" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="px-3 py-4 text-xs text-center" style={{ color: "#a06d28" }}>Nenhuma linha adicionada ainda.</p>
            )}
          </div>
          <button onClick={() => setRows([...rows, {}])}
            className="mt-2 flex items-center gap-1 text-sm font-semibold" style={{ color: "#c48a42" }}>
            <i className="ti ti-plus" /> Adicionar linha
          </button>
        </div>
      );
    }

    case "availability": {
      const days    = (cfg.availabilityDays as string[])    ?? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
      const periods = (cfg.availabilityPeriods as string[]) ?? ["Manhã", "Tarde", "Noite"];
      const sel = (value as Record<string, unknown>) ?? {};
      const toggle = (day: string, period: string) => {
        const current = Array.isArray(sel[day]) ? (sel[day] as string[]) : [];
        const nextDay = current.includes(period) ? current.filter(p => p !== period) : [...current, period];
        const next: Record<string, unknown> = { ...sel };
        if (nextDay.length > 0) next[day] = nextDay; else delete next[day];
        onChange(Object.keys(next).length > 0 ? next : null);
      };
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th />
                {days.map(d => (
                  <th key={d} className="p-1.5 text-center font-semibold" style={{ color: "#5c3f13" }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(period => (
                <tr key={period} style={{ borderTop: BRD }}>
                  <td className="p-1.5 pr-2 font-medium whitespace-nowrap" style={{ color: "#5c3f13" }}>{period}</td>
                  {days.map(day => {
                    const on = Array.isArray(sel[day]) && (sel[day] as string[]).includes(period);
                    return (
                      <td key={day} className="p-1">
                        <button onClick={() => toggle(day, period)}
                          className="w-full h-9 rounded-lg flex items-center justify-center transition-all"
                          style={{ border: on ? "2px solid #c48a42" : BRD, background: on ? "#fbf3e7" : "#fff" }}>
                          {on && <i className="ti ti-check" style={{ color: "#c48a42" }} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-1.5" style={{ color: "#a06d28" }}>Toque nos horários em que você está disponível.</p>
        </div>
      );
    }

    case "audio":
      return <AudioField value={value} onChange={onChange} />;

    case "photo_annotation":
      return <PhotoAnnotationField value={value} onChange={onChange} />;

    case "doc_capture":
      return <DocCaptureField value={value} onChange={onChange} inputStyle={inputStyle} />;

    case "pairwise":
      return <PairwiseField items={(cfg.pairwiseItems as string[]) ?? []} value={value} onChange={onChange} />;

    case "equation":
      return (
        <EquationField
          formula={(cfg.formula as string) ?? ""}
          allFields={allFields}
          allAnswers={allAnswers}
          value={value}
          onChange={onChange}
        />
      );

    case "dynamic_consent": {
      const consentText = (cfg.consentText as string) || "";
      const items = (cfg.consentItems as string[]) ?? [];
      const checked = (value as Record<string, unknown>) ?? {};
      const toggleItem = (item: string) => {
        const next = { ...checked, [item]: !checked[item] };
        const anyChecked = items.some(i => Boolean(next[i]));
        onChange(anyChecked ? next : null);
      };
      return (
        <div className="flex flex-col gap-3">
          {consentText && (
            <div className="px-4 py-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto"
              style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13", maxHeight: 190 }}>
              {consentText}
            </div>
          )}
          {items.map(item => {
            const on = Boolean(checked[item]);
            return (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
                style={{
                  border: on ? "2px solid #c48a42" : BRD,
                  background: on ? "#fbf3e7" : "#fff",
                  color: "#3d2a0d",
                }}
              >
                <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                  style={{ border: on ? "none" : "2px solid #d2a05c", background: on ? "#c48a42" : "transparent" }}>
                  {on && <i className="ti ti-check text-white text-xs" />}
                </div>
                {item}
              </button>
            );
          })}
        </div>
      );
    }

    case "field_diary":
      return <FieldDiaryField value={value} onChange={onChange} inputStyle={inputStyle} />;

    case "multi_upload": {
      const items = (cfg.uploadItems as string[]) ?? [];
      const filesByItem = (value as Record<string, unknown>) ?? {};
      const setFile = (item: string, name: string | null) => {
        const next = { ...filesByItem };
        if (name) next[item] = name; else delete next[item];
        onChange(Object.keys(next).length > 0 ? next : null);
      };
      return (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <label key={item} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
              style={{ border: filesByItem[item] ? "2px solid #a0d4b8" : BRD, background: filesByItem[item] ? "#eaf0e4" : "#fff" }}>
              <i className={`ti ${filesByItem[item] ? "ti-check" : "ti-upload"}`}
                style={{ color: filesByItem[item] ? "#4c6b3c" : "#c48a42" }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "#3d2a0d" }}>{item}</p>
                <p className="text-xs" style={{ color: filesByItem[item] ? "#3a5430" : "#a06d28" }}>
                  {filesByItem[item] ? String(filesByItem[item]) : "Toque para selecionar o arquivo"}
                </p>
              </div>
              <input type="file" className="hidden" onChange={e => setFile(item, e.target.files?.[0]?.name ?? null)} />
            </label>
          ))}
        </div>
      );
    }

    case "qr_barcode":
      return <QrBarcodeField value={value} onChange={onChange} inputCls={inputCls} inputStyle={inputStyle} />;

    case "bibliography": {
      const stored = (value as Record<string, unknown>[]) ?? [];
      const entries = stored.length > 0 ? stored : [{}];
      const setEntries = (next: Record<string, unknown>[]) => {
        const anyFilled = next.some(en => Object.values(en).some(v => String(v ?? "").trim() !== ""));
        onChange(anyFilled ? next : null);
      };
      const BIB_FIELDS = [
        { key: "author", label: "Autor(es)",                     span: false },
        { key: "year",   label: "Ano",                           span: false },
        { key: "title",  label: "Título",                        span: true  },
        { key: "source", label: "Fonte (revista, livro, site)",  span: false },
        { key: "doi",    label: "DOI / URL",                     span: false },
      ];
      return (
        <div className="flex flex-col gap-3">
          {entries.map((entry, i) => (
            <div key={i} className="rounded-xl p-3 flex flex-col gap-2" style={{ border: BRD, background: "#fff" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: "#c48a42" }}>Referência {i + 1}</p>
                {entries.length > 1 && (
                  <button onClick={() => setEntries(entries.filter((_, j) => j !== i))}
                    className="text-xs font-semibold" style={{ color: "#c0392b" }}>Remover</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BIB_FIELDS.map(bf => (
                  <div key={bf.key} className={bf.span ? "col-span-2" : ""}>
                    <p className="text-xs mb-1" style={{ color: "#a06d28" }}>{bf.label}</p>
                    <input
                      value={(entry[bf.key] as string) ?? ""}
                      onChange={e => setEntries(entries.map((en, j) => j === i ? { ...en, [bf.key]: e.target.value } : en))}
                      className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setEntries([...entries, {}])}
            className="flex items-center gap-1 text-sm font-semibold" style={{ color: "#c48a42" }}>
            <i className="ti ti-plus" /> Adicionar referência
          </button>
        </div>
      );
    }

    default:
      return (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ border: BRD, background: "#fbf3e7", color: "#a06d28" }}>
          Campo em desenvolvimento
        </div>
      );
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

// ─── Campo de CEP com autopreenchimento ViaCEP ───────────────────────────────
function CepField({
  value, onChange, inputCls, inputStyle,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  inputCls: string;
  inputStyle: React.CSSProperties;
}) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<{ logradouro: string; bairro: string; localidade: string; uf: string } | null>(null);
  const [error, setError] = useState("");

  // Pseudo-evento: o CepField não consegue alterar outros campos diretamente,
  // mas mostra os dados resolvidos para o respondente conferir.
  function formatCep(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  }

  async function lookup(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) { setResolved(null); setError(""); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { setError("CEP não encontrado."); setResolved(null); }
      else setResolved({ logradouro: data.logradouro, bairro: data.bairro, localidade: data.localidade, uf: data.uf });
    } catch {
      setError("Não foi possível consultar o CEP.");
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={(value as string) ?? ""}
          onChange={e => { const f = formatCep(e.target.value); onChange(f); lookup(f); }}
          placeholder="00000-000"
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
        {loading && (
          <i className="ti ti-loader-2 animate-spin absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#c48a42" }} />
        )}
      </div>

      {error && (
        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#c0392b" }}>
          <i className="ti ti-alert-circle" /> {error}
        </p>
      )}

      {resolved && (
        <div className="mt-2 px-4 py-3 rounded-xl text-xs" style={{ background: "#eaf0e4", border: "1px solid #a0d4b8", color: "#3a5430" }}>
          <p className="flex items-center gap-1.5 font-bold mb-1">
            <i className="ti ti-map-pin-check" /> Endereço localizado
          </p>
          <p style={{ color: "#3a5430" }}>
            {resolved.logradouro && `${resolved.logradouro}, `}
            {resolved.bairro && `${resolved.bairro} — `}
            {resolved.localidade}/{resolved.uf}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Campo de meso/microrregião (cascata do estado) ───────────────────────────
function IbgeCascadeField({
  kind, placeholder, value, onChange, allAnswers, allFields, inputCls, inputStyle,
}: {
  kind: "mesorregioes" | "microrregioes";
  placeholder: string;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  allAnswers: Answers;
  allFields: FormField[];
  inputCls: string;
  inputStyle: React.CSSProperties;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const stateField = allFields.find(f => (f.type as string) === "geo_state");
  const selectedUF = stateField ? (allAnswers[stateField.id] as string) : "";

  useEffect(() => {
    if (!selectedUF) { setItems([]); return; }
    setLoading(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUF}/${kind}`)
      .then(r => r.json())
      .then((data: Array<{ nome: string }>) => {
        setItems(data.map(m => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR")));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [selectedUF, kind]);

  if (!selectedUF) {
    return (
      <div>
        <input type="text" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
          placeholder={`Digite a ${placeholder}...`} className={inputCls} style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"} />
        <p className="text-xs mt-1.5" style={{ color: "#a06d28" }}>
          Dica: se houver um campo de estado antes, selecione-o para carregar a lista.
        </p>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={inputStyle}>
      <i className="ti ti-loader-2 animate-spin" style={{ color: "#c48a42" }} />
      <span style={{ color: "#a06d28" }}>Carregando {placeholder}s de {selectedUF}...</span>
    </div>
  );

  return (
    <div>
      <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle}>
        <option value="">Selecione a {placeholder}...</option>
        {items.map(i => <option key={i} value={i}>{i}</option>)}
      </select>
      <p className="text-xs mt-1.5" style={{ color: "#a06d28" }}>
        Nome oficial do IBGE para a {placeholder} — em alguns estados coincide com o nome do município-sede.
      </p>
    </div>
  );
}

// ─── Campo de distrito (cascata do município) ─────────────────────────────────
function GeoDistrictField({
  value, onChange, allAnswers, allFields, inputCls, inputStyle,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  allAnswers: Answers;
  allFields: FormField[];
  inputCls: string;
  inputStyle: React.CSSProperties;
}) {
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);

  // Precisa do município E do estado para resolver o código do município
  const stateField = allFields.find(f => (f.type as string) === "geo_state");
  const cityField  = allFields.find(f => (f.type as string) === "geo_city");
  const selectedUF   = stateField ? (allAnswers[stateField.id] as string) : "";
  const selectedCity = cityField  ? (allAnswers[cityField.id]  as string) : "";

  useEffect(() => {
    if (!selectedUF || !selectedCity) { setDistricts([]); return; }
    setLoading(true);
    // Busca municípios do estado para achar o código do município selecionado
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUF}/municipios`)
      .then(r => r.json())
      .then((munis: Array<{ id: number; nome: string }>) => {
        const muni = munis.find(m => m.nome.toLowerCase() === selectedCity.toLowerCase());
        if (!muni) { setDistricts([]); setLoading(false); return; }
        return fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${muni.id}/distritos`)
          .then(r => r.json())
          .then((dist: Array<{ nome: string }>) => {
            setDistricts(dist.map(d => d.nome).sort((a, b) => a.localeCompare(b, "pt-BR")));
          });
      })
      .catch(() => setDistricts([]))
      .finally(() => setLoading(false));
  }, [selectedUF, selectedCity]);

  if (!selectedCity || manual || (!loading && districts.length === 0)) {
    return (
      <div>
        <input type="text" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
          placeholder="Digite o nome do distrito..." className={inputCls} style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"} />
        {!selectedCity && (
          <p className="text-xs mt-1.5" style={{ color: "#a06d28" }}>
            Dica: selecione o estado e o município antes para carregar os distritos.
          </p>
        )}
        {selectedCity && manual && (
          <button onClick={() => setManual(false)} className="text-xs mt-1.5 font-medium" style={{ color: "#c48a42" }}>
            ← Voltar para a lista de distritos
          </button>
        )}
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={inputStyle}>
      <i className="ti ti-loader-2 animate-spin" style={{ color: "#c48a42" }} />
      <span style={{ color: "#a06d28" }}>Carregando distritos de {selectedCity}...</span>
    </div>
  );

  return (
    <div>
      <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle}>
        <option value="">Selecione o distrito...</option>
        {districts.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <button onClick={() => setManual(true)} className="text-xs mt-1.5 font-medium" style={{ color: "#c48a42" }}>
        Não encontrou? Digite manualmente
      </button>
    </div>
  );
}

// ─── Campo de município com cascata IBGE ──────────────────────────────────────
function GeoCityField({
  value, onChange, allAnswers, allFields, inputCls, inputStyle,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  allAnswers: Answers;
  allFields: FormField[];
  inputCls: string;
  inputStyle: React.CSSProperties;
}) {
  const [cities,  setCities]  = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual,  setManual]  = useState(false);

  // Encontra o estado selecionado em outro campo geo_state
  const stateField = allFields.find(f => (f.type as string) === "geo_state");
  const selectedUF = stateField ? (allAnswers[stateField.id] as string) : "";

  useEffect(() => {
    if (!selectedUF) { setCities([]); return; }
    setLoading(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUF}/municipios`)
      .then(r => r.json())
      .then((data: Array<{ nome: string }>) => {
        setCities(data.map(m => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR")));
      })
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, [selectedUF]);

  // Sem estado selecionado ou modo manual → campo de texto livre
  if (!selectedUF || manual) {
    return (
      <div>
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="Digite o nome do município..."
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
        {selectedUF && manual && (
          <button onClick={() => setManual(false)} className="text-xs mt-1.5 font-medium" style={{ color: "#c48a42" }}>
            ← Voltar para a lista de municípios de {selectedUF}
          </button>
        )}
        {!selectedUF && (
          <p className="text-xs mt-1.5" style={{ color: "#a06d28" }}>
            Dica: se houver um campo de estado antes, selecione-o para carregar a lista de municípios.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={inputStyle}>
          <i className="ti ti-loader-2 animate-spin" style={{ color: "#c48a42" }} />
          <span style={{ color: "#a06d28" }}>Carregando municípios de {selectedUF}...</span>
        </div>
      ) : (
        <select
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">Selecione o município...</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      <button onClick={() => setManual(true)} className="text-xs mt-1.5 font-medium" style={{ color: "#c48a42" }}>
        Não encontrou? Digite manualmente
      </button>
    </div>
  );
}

// ─── Campo de assinatura (canvas) ─────────────────────────────────────────────
function SignatureField({
  value, onChange, captureMetadata,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  captureMetadata: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const BRD = "1px solid #e8d8be";

  function pos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const p = "touches" in e ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = pos(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#3d2a0d";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  }

  function finish() {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) return;
    const dataUrl = canvas.toDataURL("image/png");
    if (captureMetadata) {
      const meta: Record<string, unknown> = { dataUrl, signedAt: new Date().toISOString() };
      navigator.geolocation?.getCurrentPosition(p => {
        onChange({ ...meta, latitude: p.coords.latitude, longitude: p.coords.longitude });
      }, () => onChange(meta));
      onChange(meta);
    } else {
      onChange(dataUrl);
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    onChange(null);
  }

  const signedDataUrl = captureMetadata
    ? ((value as Record<string, unknown>)?.dataUrl as string | undefined)
    : (value as string | undefined);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480}
        height={160}
        className="w-full rounded-xl touch-none"
        style={{ border: BRD, background: "#fff" }}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={finish}
        onMouseLeave={finish}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={finish}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs" style={{ color: "#a06d28" }}>
          {captureMetadata ? "Assine acima — hora e localização serão registradas" : "Assine no espaço acima"}
        </p>
        <button onClick={clear} className="text-xs font-semibold" style={{ color: "#c0392b" }}>Limpar</button>
      </div>
      {signedDataUrl && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#3a5430" }}>
          <i className="ti ti-check" /> Assinatura capturada
        </p>
      )}
    </div>
  );
}

// ─── Campo relacional ao Catálogo de Entidades ────────────────────────────────
type EntityHit = {
  id: string; code: string; type: string; name: string;
  cityName: string | null; stateCode: string | null;
};

function GeoRelationalField({
  value, onChange, inputCls, inputStyle,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  inputCls: string;
  inputStyle: React.CSSProperties;
}) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<EntityHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const BRD = "1px solid #e8d8be";

  const selected = value as Record<string, unknown> | null;
  const hasSelection = Boolean(selected && selected.entityId);

  useEffect(() => {
    if (hasSelection) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/entities/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(Array.isArray(json?.data) ? json.data : []);
        setSearched(true);
      } catch {
        setResults([]);
      } finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, hasSelection]);

  if (hasSelection && selected) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ border: "2px solid #c48a42", background: "#fbf3e7" }}>
        <i className="ti ti-point-filled text-lg" style={{ color: "#c48a42" }} />
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "#3d2a0d" }}>{String(selected.name ?? "")}</p>
          <p className="text-xs font-medium" style={{ color: "#a06d28" }}>{String(selected.code ?? "")}</p>
        </div>
        <button onClick={() => onChange(null)} className="text-xs font-semibold" style={{ color: "#c0392b" }}>
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nome ou código (ex.: COM-000245)..."
          className={inputCls}
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
        />
        {loading && (
          <i className="ti ti-loader-2 animate-spin absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#c48a42" }} />
        )}
      </div>
      <div className="flex flex-col gap-1.5 mt-2 overflow-y-auto" style={{ maxHeight: 230 }}>
        {results.map(r => (
          <button key={r.id}
            onClick={() => onChange({ entityId: r.id, code: r.code, name: r.name, type: r.type })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
            style={{ border: BRD, background: "#fff" }}>
            <i className="ti ti-point" style={{ color: "#c48a42" }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "#3d2a0d" }}>{r.name}</p>
              <p className="text-xs" style={{ color: "#a06d28" }}>
                {r.code}{r.cityName ? ` · ${r.cityName}${r.stateCode ? `/${r.stateCode}` : ""}` : ""}
              </p>
            </div>
          </button>
        ))}
        {searched && !loading && results.length === 0 && (
          <p className="text-xs px-1 py-2" style={{ color: "#a06d28" }}>
            Nenhuma entidade encontrada no Catálogo para esta busca.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Campo de gravação de voz ─────────────────────────────────────────────────
function AudioField({
  value, onChange,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [error,     setError]     = useState("");
  const recRef   = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recRef.current?.stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = ev => { if (ev.target?.result) onChange(ev.target.result as string); };
        reader.readAsDataURL(blob);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function stop() {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  const audioUrl = typeof value === "string" ? value : null;
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-2">
      {audioUrl ? (
        <>
          <audio controls src={audioUrl} className="w-full" />
          <button onClick={() => onChange(null)}
            className="self-start text-xs font-semibold" style={{ color: "#c0392b" }}>
            Remover e gravar novamente
          </button>
        </>
      ) : recording ? (
        <button onClick={stop}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
          style={{ border: "2px solid #c0392b", background: "#fdf0ef", color: "#c0392b" }}>
          <i className="ti ti-player-stop-filled animate-pulse" /> Parar gravação ({mmss})
        </button>
      ) : (
        <button onClick={start}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
          style={{ border: "2px solid #c48a42", background: "#fbf3e7", color: "#7a5218" }}>
          <i className="ti ti-microphone" /> Gravar resposta em áudio
        </button>
      )}
      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: "#c0392b" }}>
          <i className="ti ti-alert-circle" /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Campo de foto com anotação ───────────────────────────────────────────────
function PhotoAnnotationField({
  value, onChange,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
}) {
  const v = value as Record<string, unknown> | null;
  const image = (v?.image as string) || "";
  const notes = Array.isArray(v?.notes) ? (v?.notes as Array<{ x: number; y: number; text: string }>) : [];
  const BRD = "1px solid #e8d8be";

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onChange({ image: ev.target.result as string, notes: [] }); };
    reader.readAsDataURL(file);
  }

  function addNote(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = +(((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = +(((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    onChange({ image, notes: [...notes, { x, y, text: "" }] });
  }

  if (!image) {
    return (
      <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer transition-colors"
        style={{ border: "2px dashed #d9bb8c", background: "#fbf3e7" }}>
        <i className="ti ti-photo-edit text-2xl" style={{ color: "#c48a42" }} />
        <span className="text-sm font-semibold" style={{ color: "#5c3f13" }}>Tirar ou escolher uma foto</span>
        <span className="text-xs" style={{ color: "#a06d28" }}>Depois, toque na imagem para marcar pontos comentados</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
    );
  }

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden cursor-crosshair" style={{ border: BRD }} onClick={addNote}>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem local (data URL) do respondente, next/image não se aplica */}
        <img src={image} alt="Foto enviada para anotação" className="w-full block" />
        {notes.map((n, i) => (
          <div key={i}
            className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-xs font-bold pointer-events-none"
            style={{ left: `${n.x}%`, top: `${n.y}%`, background: "#c48a42", color: "#fff", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
            {i + 1}
          </div>
        ))}
      </div>
      <p className="text-xs mt-1.5" style={{ color: "#a06d28" }}>Toque na foto para marcar um ponto e descreva-o abaixo.</p>
      {notes.map((n, i) => (
        <div key={i} className="flex items-center gap-2 mt-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "#fbf3e7", color: "#c48a42", border: BRD }}>{i + 1}</span>
          <input
            value={n.text}
            onChange={e => onChange({ image, notes: notes.map((note, j) => j === i ? { ...note, text: e.target.value } : note) })}
            placeholder="Comentário do ponto..."
            className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none"
            style={{ border: BRD, background: "#fff", color: "#3d2a0d" }}
          />
          <button onClick={() => onChange({ image, notes: notes.filter((_, j) => j !== i) })}
            className="w-6 h-6 flex items-center justify-center" style={{ color: "#c0392b" }}>
            <i className="ti ti-x text-xs" />
          </button>
        </div>
      ))}
      <button onClick={() => onChange(null)} className="text-xs font-semibold mt-2" style={{ color: "#c0392b" }}>
        Remover foto
      </button>
    </div>
  );
}

// ─── Campo de captura de documento ────────────────────────────────────────────
function DocCaptureField({
  value, onChange, inputStyle,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  inputStyle: React.CSSProperties;
}) {
  const v = value as Record<string, unknown> | null;
  const image = (v?.image as string) || "";
  const transcript = (v?.transcript as string) || "";
  const BRD = "1px solid #e8d8be";

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onChange({ image: ev.target.result as string, transcript }); };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      {image ? (
        <div className="relative rounded-xl overflow-hidden" style={{ border: BRD }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem local (data URL) do respondente, next/image não se aplica */}
          <img src={image} alt="Documento capturado" className="w-full block" style={{ maxHeight: 260, objectFit: "contain", background: "#fbf3e7" }} />
          <button onClick={() => onChange(transcript ? { image: "", transcript } : null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)" }}>
            <i className="ti ti-x text-white text-sm" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer transition-colors"
          style={{ border: "2px dashed #d9bb8c", background: "#fbf3e7" }}>
          <i className="ti ti-scan text-2xl" style={{ color: "#c48a42" }} />
          <span className="text-sm font-semibold" style={{ color: "#5c3f13" }}>Fotografar o documento</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </label>
      )}
      <textarea
        value={transcript}
        onChange={e => {
          const t = e.target.value;
          onChange(image || t ? { image, transcript: t } : null);
        }}
        rows={3}
        placeholder="Transcreva aqui os dados relevantes do documento..."
        className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none resize-none"
        style={inputStyle}
      />
      <p className="text-xs" style={{ color: "#a06d28" }}>
        A extração automática de texto (OCR) ainda não está disponível — transcreva os campos importantes.
      </p>
    </div>
  );
}

// ─── Campo de comparação par a par ────────────────────────────────────────────
function PairwiseField({
  items, value, onChange,
}: {
  items: string[];
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
}) {
  const BRD = "1px solid #e8d8be";
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) pairs.push([items[i], items[j]]);
  }

  const v = value as Record<string, unknown> | null;
  const choices = Array.isArray(v?.choices) ? (v?.choices as Array<{ a: string; b: string; winner: string }>) : [];
  const idx = choices.length;

  if (pairs.length === 0) {
    return <p className="text-xs" style={{ color: "#a06d28" }}>Nenhum item configurado para comparação.</p>;
  }

  function pick(winner: string) {
    const [a, b] = pairs[idx];
    const nextChoices = [...choices, { a, b, winner }];
    const scores: Record<string, number> = {};
    items.forEach(item => { scores[item] = 0; });
    nextChoices.forEach(c => { scores[c.winner] = (scores[c.winner] ?? 0) + 1; });
    onChange({ choices: nextChoices, scores });
  }

  if (idx >= pairs.length) {
    const scores = (v?.scores as Record<string, number>) ?? {};
    const ranked = [...items].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "#4c6b3c" }}>
          <i className="ti ti-check" /> Comparações concluídas — ranking calculado:
        </p>
        {ranked.map((item, i) => (
          <div key={item} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ border: BRD, background: "#fff", color: "#3d2a0d" }}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "#fbf3e7", color: "#c48a42", border: BRD }}>{i + 1}</span>
            <span className="flex-1">{item}</span>
            <span className="text-xs font-bold" style={{ color: "#c48a42" }}>{scores[item] ?? 0} pt{(scores[item] ?? 0) === 1 ? "" : "s"}</span>
          </div>
        ))}
        <button onClick={() => onChange(null)} className="self-start text-xs font-semibold" style={{ color: "#c0392b" }}>
          Refazer comparações
        </button>
      </div>
    );
  }

  const [optionA, optionB] = pairs[idx];
  return (
    <div>
      <p className="text-xs mb-2 font-medium" style={{ color: "#a06d28" }}>
        Comparação {idx + 1} de {pairs.length} — qual você prioriza?
      </p>
      <div className="flex items-stretch gap-3">
        <button onClick={() => pick(optionA)}
          className="flex-1 px-4 py-6 rounded-xl text-sm font-semibold transition-all"
          style={{ border: "2px solid #d2a05c", background: "#fff", color: "#3d2a0d" }}>
          {optionA}
        </button>
        <span className="self-center text-xs font-bold" style={{ color: "#c48a42" }}>vs</span>
        <button onClick={() => pick(optionB)}
          className="flex-1 px-4 py-6 rounded-xl text-sm font-semibold transition-all"
          style={{ border: "2px solid #d2a05c", background: "#fff", color: "#3d2a0d" }}>
          {optionB}
        </button>
      </div>
    </div>
  );
}

// ─── Campo de equação calculada ───────────────────────────────────────────────
// Fórmula com tokens {P1}, {P2}... (numeração das perguntas do instrumento) e
// operadores + - * / ( ). Avaliação só acontece se, após substituir os tokens,
// a expressão contiver apenas números e operadores (nunca código arbitrário).
function EquationField({
  formula, allFields, allAnswers, value, onChange,
}: {
  formula: string;
  allFields: FormField[];
  allAnswers: Answers;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
}) {
  const questionFields = allFields.filter(f => f.type !== "section" && f.type !== "instruction");

  let missing = false;
  const expr = formula.replace(/\{P(\d+)\}/g, (_m, num: string) => {
    const qf = questionFields[Number(num) - 1];
    const raw = qf ? allAnswers[qf.id] : undefined;
    const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
    if (!isFinite(n)) { missing = true; return "0"; }
    return `(${n})`;
  });

  let result: number | null = null;
  if (formula && !missing && /^[-+*/().\d\s]+$/.test(expr)) {
    try {
      const r = new Function(`"use strict"; return (${expr});`)() as unknown;
      if (typeof r === "number" && isFinite(r)) result = Math.round(r * 10000) / 10000;
    } catch { result = null; }
  }

  useEffect(() => {
    if (result !== null && value !== result) onChange(result);
    else if (result === null && value !== null && value !== undefined) onChange(null);
  }, [result, value, onChange]);

  return (
    <div>
      <div className="px-4 py-3 rounded-xl flex items-center justify-between"
        style={{ border: "1px solid #e8d8be", background: "#fbf3e7" }}>
        <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: "#a06d28" }}>
          <i className="ti ti-math" /> Valor calculado automaticamente
        </span>
        <span className="text-lg font-bold" style={{ color: result !== null ? "#7a5218" : "#d9bb8c" }}>
          {result !== null ? result.toLocaleString("pt-BR") : "—"}
        </span>
      </div>
      {formula && missing && (
        <p className="text-xs mt-1.5" style={{ color: "#a06d28" }}>
          Aguardando as respostas numéricas usadas na fórmula.
        </p>
      )}
      {!formula && (
        <p className="text-xs mt-1.5" style={{ color: "#a06d28" }}>
          Nenhuma fórmula configurada para este campo.
        </p>
      )}
    </div>
  );
}

// ─── Campo de diário de campo ─────────────────────────────────────────────────
function FieldDiaryField({
  value, onChange, inputStyle,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  inputStyle: React.CSSProperties;
}) {
  const [draft, setDraft] = useState("");
  const BRD = "1px solid #e8d8be";
  const entries = Array.isArray(value) ? (value as unknown as Array<{ text: string; at: string }>) : [];

  function addEntry() {
    const text = draft.trim();
    if (!text) return;
    const next = [...entries, { text, at: new Date().toISOString() }];
    onChange(next as unknown as Record<string, unknown>[]);
    setDraft("");
  }

  function removeEntry(i: number) {
    const next = entries.filter((_, j) => j !== i);
    onChange(next.length > 0 ? (next as unknown as Record<string, unknown>[]) : null);
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, i) => (
        <div key={i} className="px-4 py-3 rounded-xl" style={{ border: BRD, background: "#fff" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "#c48a42" }}>
              <i className="ti ti-clock" />
              {new Date(entry.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
            <button onClick={() => removeEntry(i)} className="text-xs font-semibold" style={{ color: "#c0392b" }}>
              Remover
            </button>
          </div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "#3d2a0d" }}>{entry.text}</p>
        </div>
      ))}
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={3}
        placeholder="Escreva o registro de campo..."
        className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none resize-none"
        style={inputStyle}
      />
      <button onClick={addEntry} disabled={!draft.trim()}
        className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
        style={{ background: "#c48a42", color: "#fff" }}>
        <i className="ti ti-plus" /> Adicionar registro
      </button>
      <p className="text-xs" style={{ color: "#a06d28" }}>
        Cada registro recebe carimbo de data/hora automático, formando um log cronológico.
      </p>
    </div>
  );
}

// ─── Campo de QR / código de barras ───────────────────────────────────────────
// Usa a API nativa BarcodeDetector quando o navegador suporta (Chrome/Android);
// caso contrário, o respondente digita o código manualmente.
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function QrBarcodeField({
  value, onChange, inputCls, inputStyle,
}: {
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  inputCls: string;
  inputStyle: React.CSSProperties;
}) {
  const [scanning, setScanning] = useState(false);
  const [error,    setError]    = useState("");
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number | null>(null);
  const BRD = "1px solid #e8d8be";

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  function stopScan() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function startScan() {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector) {
      setError("Este navegador não suporta leitura pela câmera — digite o código abaixo.");
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const detector = new Detector({ formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"] });

      const tick = async () => {
        const video = videoRef.current;
        if (!streamRef.current) return;
        if (!video) { rafRef.current = requestAnimationFrame(tick); return; }
        if (!video.srcObject) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0 && codes[0].rawValue) {
            onChange(codes[0].rawValue);
            stopScan();
            return;
          }
        } catch { /* frame ainda não disponível — tenta o próximo */ }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Não foi possível acessar a câmera. Digite o código manualmente.");
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {scanning ? (
        <div className="flex flex-col gap-2">
          <video ref={videoRef} muted playsInline className="w-full rounded-xl"
            style={{ border: BRD, maxHeight: 260, objectFit: "cover", background: "#000" }} />
          <button onClick={stopScan}
            className="self-start text-xs font-semibold" style={{ color: "#c0392b" }}>
            Cancelar leitura
          </button>
        </div>
      ) : (
        <button onClick={startScan}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
          style={{ border: "2px solid #c48a42", background: "#fbf3e7", color: "#7a5218" }}>
          <i className="ti ti-qrcode" /> Ler código com a câmera
        </button>
      )}
      {typeof value === "string" && value && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
          style={{ border: BRD, background: "#eaf0e4", color: "#3a5430" }}>
          <i className="ti ti-check" /> Código lido: {value}
        </div>
      )}
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder="Ou digite o código manualmente..."
        className={inputCls}
        style={inputStyle}
        onFocus={e => e.currentTarget.style.borderColor = "#c48a42"}
        onBlur={e => e.currentTarget.style.borderColor = "#e8d8be"}
      />
      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: "#c0392b" }}>
          <i className="ti ti-alert-circle" /> {error}
        </p>
      )}
    </div>
  );
}

export function RespondentClient({
  research,
  form,
  fields,
  isPreview,
}: {
  research: Research;
  form: Form | null;
  fields: FormField[];
  isPreview: boolean;
}) {
  const [answers,   setAnswers]   = useState<Answers>({});
  const [step,      setStep]      = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittedOffline, setSubmittedOffline] = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const { saveOffline, syncPending } = useOfflineStorage();

  // Tenta destravar respostas pendentes de uma visita anterior assim que a
  // conexão volta — mesmo evento que o hook já escuta, chamado aqui de novo
  // só pra cobrir o caso de já estar online ao abrir esta tela.
  useEffect(() => { syncPending(); }, [syncPending]);

  // Filtra campos visíveis (ignora seções e instruções para navegação).
  // Campos condicionais só entram na sequência quando a condição configurada
  // no form-builder é satisfeita pelas respostas já dadas.
  const questionFields = fields
    .filter(f => f.type !== "section" && f.type !== "instruction")
    .filter(f => (f.type as string) !== "conditional"
      || conditionMet((f.config ?? {}) as Record<string, unknown>, answers));
  const totalSteps     = questionFields.length;
  const currentField   = questionFields[step];

  const setAnswer = useCallback((fieldId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
  }, []);

  // Se um campo condicional deixa de ser visível (a resposta da qual ele
  // dependia mudou), a quantidade de passos encolhe — recua o passo atual
  // para nunca apontar para fora da sequência.
  useEffect(() => {
    if (totalSteps > 0 && step >= totalSteps) setStep(totalSteps - 1);
  }, [step, totalSteps]);

  function validate(): boolean {
    if (!currentField) return true;
    if (currentField.required && !answers[currentField.id]) {
      setErrors({ [currentField.id]: "Este campo é obrigatório" });
      return false;
    }
    return true;
  }

  function next() {
    if (!validate()) return;
    if (step < totalSteps - 1) setStep(s => s + 1);
    else handleSubmit();
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  async function handleSubmit() {
    if (isPreview) { setSubmitted(true); return; }
    if (!form) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      // Sem sinal e a pesquisa aceita coleta offline: nem tenta a rede, salva
      // local direto — mais rápido pra quem já sabe que está sem internet.
      if (research.offlineEnabled && !navigator.onLine) {
        await saveOffline(form.id, research.id, answers);
        setSubmittedOffline(true);
        setSubmitted(true);
        return;
      }

      const res = await fetch(`/api/forms/${form.id}/responses`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ data: answers, completed: true }),
      });
      if (!res.ok) throw new Error("Falha ao enviar resposta");
      setSubmitted(true);
    } catch {
      // Rede caiu no meio do envio (não só "estava offline antes de começar").
      if (research.offlineEnabled) {
        await saveOffline(form.id, research.id, answers);
        setSubmittedOffline(true);
        setSubmitted(true);
      } else {
        setSubmitError("Não foi possível enviar sua resposta agora. Verifique a conexão e tente novamente.");
      }
    } finally { setSubmitting(false); }
  }

  const BRD = "1px solid #e8d8be";
  const progress = totalSteps > 0 ? ((step) / totalSteps) * 100 : 0;

  // Tela de sucesso
  if (submitted) return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: "#fbf3e7" }}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: submittedOffline ? "#fbf0da" : "#eaf0e4", border: submittedOffline ? "2px solid #e3c07f" : "2px solid #a0d4b8" }}>
          <i className={`ti ${submittedOffline ? "ti-cloud-off" : "ti-check"} text-4xl`} style={{ color: submittedOffline ? "#a06d28" : "#4c6b3c" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif" }}>
          {isPreview ? "Prévia concluída!" : submittedOffline ? "Resposta salva neste aparelho" : "Resposta enviada!"}
        </h1>
        <p className="text-sm mb-6" style={{ color: "#5c3f13" }}>
          {isPreview
            ? "Esta era uma prévia do formulário. As respostas não foram salvas."
            : submittedOffline
              ? "Sem conexão agora — a resposta fica guardada neste aparelho e é enviada automaticamente assim que a internet voltar."
              : "Obrigado pela sua participação. Sua resposta foi registrada com sucesso."}
        </p>

        <button onClick={() => { setSubmitted(false); setSubmittedOffline(false); setStep(0); setAnswers({}); setErrors({}); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: "#c48a42", color: "#fff" }}>
          <i className="ti ti-refresh" />
          {isPreview ? "Reiniciar prévia" : "Enviar outra resposta"}
        </button>

        {!isPreview && (
          <p className="mt-4 text-xs" style={{ color: "#a06d28" }}>
            Você pode registrar uma nova resposta sem recarregar a página.
          </p>
        )}

        <div className="mt-6 text-xs" style={{ color: "#d9bb8c" }}>
          Powered by <span style={{ color: "#c48a42", fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 700 }}>Dataº</span>
        </div>
      </div>
    </div>
  );

  // Formulário vazio
  if (!form || totalSteps === 0) return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: "#fbf3e7" }}>
      <div className="text-center max-w-sm">
        <i className="ti ti-forms text-4xl block mb-3" style={{ color: "#d9bb8c" }} />
        <h1 className="text-xl font-bold mb-2" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif" }}>
          Formulário em construção
        </h1>
        <p className="text-sm" style={{ color: "#5c3f13" }}>
          Este formulário ainda não tem perguntas adicionadas.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#fbf3e7" }}>

      {/* Banner de prévia */}
      {isPreview && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold"
          style={{ background: "#fbf3e7", borderBottom: BRD, color: "#7a5218" }}>
          <i className="ti ti-eye" /> Modo de prévia — as respostas não serão salvas
        </div>
      )}

      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between"
        style={{ background: "#fff", borderBottom: BRD }}>
        <DataLogo className="text-sm" />
        <div className="text-xs font-medium" style={{ color: "#a06d28" }}>
          {step + 1} de {totalSteps}
        </div>
      </header>

      {/* Barra de progresso */}
      <div className="h-1" style={{ background: "#e8d8be" }}>
        <div className="h-full transition-all duration-500 rounded-r-full"
          style={{ width: `${progress}%`, background: "#c48a42" }} />
      </div>

      {/* Conteúdo */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">

          {/* Capa e título (só no primeiro campo) */}
          {step === 0 && (
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif", letterSpacing: "-0.4px" }}>
                {research.title}
              </h1>
              {research.description && (
                <p className="text-sm" style={{ color: "#5c3f13" }}>{research.description}</p>
              )}
            </div>
          )}

          {/* Campo atual */}
          {currentField && (
            <div className="rounded-2xl p-6" style={{ background: "#fff", border: BRD, boxShadow: "0 2px 12px rgba(196,138,66,0.06)" }}>
              {/* Número da pergunta */}
              <div className="flex items-start gap-3 mb-4">
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ background: "#fbf3e7", color: "#c48a42", border: BRD }}>
                  P{step + 1}
                </span>
                <div className="flex-1">
                  <p className="text-base font-bold leading-snug" style={{ color: "#0f172a" }}>
                    {currentField.label}
                    {currentField.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  {currentField.description && (
                    <p className="text-xs mt-1" style={{ color: "#a06d28" }}>{currentField.description}</p>
                  )}
                </div>
              </div>

              {/* Campo de resposta */}
              <FieldInput
                field={currentField}
                value={answers[currentField.id] ?? null}
                onChange={val => setAnswer(currentField.id, val)}
                allAnswers={answers}
                allFields={fields}
              />

              {/* Erro */}
              {errors[currentField.id] && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#c0392b" }}>
                  <i className="ti ti-alert-circle" /> {errors[currentField.id]}
                </p>
              )}
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between mt-5">
            <button onClick={prev} disabled={step === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
              style={{ border: BRD, background: "#fff", color: "#5c3f13" }}>
              <i className="ti ti-arrow-left" /> Anterior
            </button>

            <button onClick={next} disabled={submitting}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: "#c48a42", color: "#fff" }}>
              {submitting ? (
                <><i className="ti ti-loader-2 animate-spin" /> Enviando...</>
              ) : step === totalSteps - 1 ? (
                <><i className="ti ti-send" /> Enviar resposta</>
              ) : (
                <>Próxima <i className="ti ti-arrow-right" /></>
              )}
            </button>
          </div>

          {/* Erro de envio (só quando a pesquisa não aceita coleta offline) */}
          {submitError && (
            <p className="text-xs mt-3 text-center flex items-center justify-center gap-1" style={{ color: "#c0392b" }}>
              <i className="ti ti-alert-circle" /> {submitError}
            </p>
          )}

          {/* Rodapé */}
          <p className="text-center text-xs mt-6" style={{ color: "#d9bb8c" }}>
            Powered by <span style={{ color: "#c48a42", fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 700 }}>Dataº</span>
            {research.allowAnonymous && " · Respostas anônimas"}
          </p>
        </div>
      </main>
    </div>
  );
}
