"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Research, Form, FormField } from "@/lib/types";

// ─── Tipos de resposta ────────────────────────────────────────────────────────
type AnswerValue = string | string[] | number | boolean | Record<string, unknown> | Record<string, unknown>[] | null;
type Answers = Record<string, AnswerValue>;
type Opt = { id: string; label: string; weight?: number };

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
  const BRD = "1px solid #e8d9c0";
  const inputCls = "w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-shadow";
  const inputStyle = { border: BRD, background: "#fff", color: "#1a0f00", boxShadow: "none" };

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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
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
                border: value === opt ? "2px solid #b07d20" : BRD,
                background: value === opt ? "#fff8ec" : "#fff",
                color: value === opt ? "#7a3d00" : "#5c4a2a",
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
                border: value === opt.id ? "2px solid #b07d20" : BRD,
                background: value === opt.id ? "#fff8ec" : "#fff",
                color: "#1a0f00",
              }}
            >
              <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ border: value === opt.id ? "5px solid #b07d20" : "2px solid #c4a35a" }} />
              <span className="flex-1">{opt.label}</span>
              {field.type === "weighted" && opt.weight !== undefined && (
                <span className="text-xs font-bold" style={{ color: "#b07d20" }}>{opt.weight}pts</span>
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
                  border: isSelected ? "2px solid #b07d20" : BRD,
                  background: isSelected ? "#fff8ec" : "#fff",
                  color: "#1a0f00",
                }}
              >
                <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                  style={{ border: isSelected ? "none" : "2px solid #c4a35a", background: isSelected ? "#b07d20" : "transparent" }}>
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
                  border: value === n ? "2px solid #b07d20" : BRD,
                  background: value === n ? "#b07d20" : "#fff",
                  color: value === n ? "#fff" : "#5c4a2a",
                }}
              >{n}</button>
            ))}
          </div>
          {label && <p className="text-xs mt-2" style={{ color: "#8b7355" }}>{label}</p>}
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
                style={{ color: current >= n ? "#b07d20" : "#e8d9c0" }} />
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
                  border: current === n ? "2px solid #b07d20" : BRD,
                  background: current === n ? (n <= 6 ? "#c0392b" : n <= 8 ? "#b07d20" : "#0d9e75") : "#fff",
                  color: current === n ? "#fff" : "#5c4a2a",
                }}
              >{n}</button>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-medium" style={{ color: "#c0392b" }}>Muito improvável</span>
            <span className="text-xs font-medium" style={{ color: "#0d9e75" }}>Muito provável</span>
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
            style={{ accentColor: "#b07d20" }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: "#8b7355" }}>{min}</span>
            <span className="text-sm font-bold" style={{ color: "#b07d20" }}>{current}</span>
            <span className="text-xs" style={{ color: "#8b7355" }}>{max}</span>
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
            <span className="text-xs font-medium" style={{ color: "#5c4a2a", minWidth: "90px" }}>{left}</span>
            <div className="flex-1 flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => onChange(n)}
                  className="flex-1 h-11 rounded-lg text-sm font-bold transition-all"
                  style={{
                    border: current === n ? "2px solid #b07d20" : BRD,
                    background: current === n ? "#b07d20" : "#fff",
                    color: current === n ? "#fff" : "#5c4a2a",
                  }}
                >{n}</button>
              ))}
            </div>
            <span className="text-xs font-medium text-right" style={{ color: "#5c4a2a", minWidth: "90px" }}>{right}</span>
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
        />
      );
    }

    case "date_range": {
      const range = (value as Record<string, unknown>) ?? {};
      return (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: "#8b7355" }}>Início</p>
            <input type="date" value={(range.start as string) ?? ""}
              onChange={e => onChange({ ...range, start: e.target.value })}
              className={inputCls} style={inputStyle} />
          </div>
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: "#8b7355" }}>Fim</p>
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
              style={{ border: BRD, background: "#fff", color: "#1a0f00" }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "#fff8ec", color: "#b07d20", border: "1px solid #e8d9c0" }}>{i + 1}</span>
              <span className="flex-1">{item}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center disabled:opacity-30" style={{ color: "#b07d20" }}>
                <i className="ti ti-chevron-up" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === ordered.length - 1} className="w-6 h-6 flex items-center justify-center disabled:opacity-30" style={{ color: "#b07d20" }}>
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
          <p className="text-xs font-semibold" style={{ color: remaining < 0 ? "#c0392b" : "#b07d20" }}>
            {remaining} de {total} pontos restantes
          </p>
          {options.map(opt => (
            <div key={opt.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ border: BRD, background: "#fff" }}>
              <span className="flex-1 text-sm font-medium" style={{ color: "#1a0f00" }}>{opt.label}</span>
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
              <span className="flex-1 text-sm font-medium" style={{ color: "#1a0f00" }}>{item}</span>
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
                border: value === zone ? "2px solid #b07d20" : BRD,
                background: value === zone ? "#fff8ec" : "#fff",
                color: "#1a0f00",
              }}
            >
              <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ border: value === zone ? "5px solid #b07d20" : "2px solid #c4a35a" }} />
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
                  <th key={col} className="p-2 text-center text-xs font-semibold" style={{ color: "#5c4a2a" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row} style={{ borderTop: BRD }}>
                  <td className="p-2 pr-3 text-xs font-medium" style={{ color: "#5c4a2a" }}>{row}</td>
                  {cols.map(col => (
                    <td key={col} className="p-2 text-center">
                      <button
                        onClick={() => onChange({ ...answersByRow, [row]: col })}
                        className="w-4 h-4 rounded-full mx-auto flex items-center justify-center"
                        style={{ border: answersByRow[row] === col ? "5px solid #b07d20" : "2px solid #c4a35a" }}
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

    case "geo_state":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">Selecione o estado...</option>
          {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
      );

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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
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
            style={{ border: "2px solid #b07d20", background: "#fff8ec", color: "#7a3d00" }}
          >
            <i className="ti ti-crosshair" /> Capturar minha localização (GPS)
          </button>
          {value && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
              style={{ border: BRD, background: "#e1f5ee", color: "#0a6e45" }}>
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
            onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
            onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
          />
        </div>
      );

    case "file":
      return (
        <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer transition-colors"
          style={{ border: "2px dashed #d4b880", background: "#faf6ef" }}>
          <i className="ti ti-upload text-2xl" style={{ color: "#b07d20" }} />
          <span className="text-sm font-semibold" style={{ color: "#5c4a2a" }}>Clique para selecionar arquivo</span>
          <span className="text-xs" style={{ color: "#8b7355" }}>ou arraste e solte aqui</span>
          <input type="file" className="hidden" onChange={e => onChange(e.target.files?.[0]?.name ?? null)} />
        </label>
      );

    default:
      return (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ border: BRD, background: "#faf6ef", color: "#8b7355" }}>
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
        />
        {loading && (
          <i className="ti ti-loader-2 animate-spin absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#b07d20" }} />
        )}
      </div>

      {error && (
        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#c0392b" }}>
          <i className="ti ti-alert-circle" /> {error}
        </p>
      )}

      {resolved && (
        <div className="mt-2 px-4 py-3 rounded-xl text-xs" style={{ background: "#e1f5ee", border: "1px solid #a0d4b8", color: "#0a6e45" }}>
          <p className="flex items-center gap-1.5 font-bold mb-1">
            <i className="ti ti-map-pin-check" /> Endereço localizado
          </p>
          <p style={{ color: "#0a6e45" }}>
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"} />
        <p className="text-xs mt-1.5" style={{ color: "#8b7355" }}>
          Dica: se houver um campo de estado antes, selecione-o para carregar a lista.
        </p>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={inputStyle}>
      <i className="ti ti-loader-2 animate-spin" style={{ color: "#b07d20" }} />
      <span style={{ color: "#8b7355" }}>Carregando {placeholder}s de {selectedUF}...</span>
    </div>
  );

  return (
    <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle}>
      <option value="">Selecione a {placeholder}...</option>
      {items.map(i => <option key={i} value={i}>{i}</option>)}
    </select>
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"} />
        {!selectedCity && (
          <p className="text-xs mt-1.5" style={{ color: "#8b7355" }}>
            Dica: selecione o estado e o município antes para carregar os distritos.
          </p>
        )}
        {selectedCity && manual && (
          <button onClick={() => setManual(false)} className="text-xs mt-1.5 font-medium" style={{ color: "#b07d20" }}>
            ← Voltar para a lista de distritos
          </button>
        )}
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={inputStyle}>
      <i className="ti ti-loader-2 animate-spin" style={{ color: "#b07d20" }} />
      <span style={{ color: "#8b7355" }}>Carregando distritos de {selectedCity}...</span>
    </div>
  );

  return (
    <div>
      <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle}>
        <option value="">Selecione o distrito...</option>
        {districts.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <button onClick={() => setManual(true)} className="text-xs mt-1.5 font-medium" style={{ color: "#b07d20" }}>
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
          onFocus={e => e.currentTarget.style.borderColor = "#b07d20"}
          onBlur={e => e.currentTarget.style.borderColor = "#e8d9c0"}
        />
        {selectedUF && manual && (
          <button onClick={() => setManual(false)} className="text-xs mt-1.5 font-medium" style={{ color: "#b07d20" }}>
            ← Voltar para a lista de municípios de {selectedUF}
          </button>
        )}
        {!selectedUF && (
          <p className="text-xs mt-1.5" style={{ color: "#8b7355" }}>
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
          <i className="ti ti-loader-2 animate-spin" style={{ color: "#b07d20" }} />
          <span style={{ color: "#8b7355" }}>Carregando municípios de {selectedUF}...</span>
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
      <button onClick={() => setManual(true)} className="text-xs mt-1.5 font-medium" style={{ color: "#b07d20" }}>
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
  const BRD = "1px solid #e8d9c0";

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
    ctx.strokeStyle = "#1a0f00";
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
        <p className="text-xs" style={{ color: "#8b7355" }}>
          {captureMetadata ? "Assine acima — hora e localização serão registradas" : "Assine no espaço acima"}
        </p>
        <button onClick={clear} className="text-xs font-semibold" style={{ color: "#c0392b" }}>Limpar</button>
      </div>
      {signedDataUrl && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#0a6e45" }}>
          <i className="ti ti-check" /> Assinatura capturada
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
  const [submitting,setSubmitting]= useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  // Filtra campos visíveis (ignora seções e instruções para navegação)
  const questionFields = fields.filter(f => f.type !== "section" && f.type !== "instruction");
  const totalSteps     = questionFields.length;
  const currentField   = questionFields[step];

  const setAnswer = useCallback((fieldId: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
  }, []);

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
    try {
      await fetch(`/api/forms/${form.id}/responses`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ data: answers, completed: true }),
      });
      setSubmitted(true);
    } finally { setSubmitting(false); }
  }

  const BRD = "1px solid #e8d9c0";
  const progress = totalSteps > 0 ? ((step) / totalSteps) * 100 : 0;

  // Tela de sucesso
  if (submitted) return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: "#faf6ef" }}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "#e1f5ee", border: "2px solid #a0d4b8" }}>
          <i className="ti ti-check text-4xl" style={{ color: "#0d9e75" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
          {isPreview ? "Prévia concluída!" : "Resposta enviada!"}
        </h1>
        <p className="text-sm mb-6" style={{ color: "#5c4a2a" }}>
          {isPreview
            ? "Esta era uma prévia do formulário. As respostas não foram salvas."
            : "Obrigado pela sua participação. Sua resposta foi registrada com sucesso."}
        </p>

        <button onClick={() => { setSubmitted(false); setStep(0); setAnswers({}); setErrors({}); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: "#b07d20", color: "#fff" }}>
          <i className="ti ti-refresh" />
          {isPreview ? "Reiniciar prévia" : "Enviar outra resposta"}
        </button>

        {!isPreview && (
          <p className="mt-4 text-xs" style={{ color: "#8b7355" }}>
            Você pode registrar uma nova resposta sem recarregar a página.
          </p>
        )}

        <div className="mt-6 text-xs" style={{ color: "#b8a080" }}>
          Powered by <span style={{ color: "#b07d20", fontFamily: "Georgia, serif", fontWeight: 700 }}>Dataº</span>
        </div>
      </div>
    </div>
  );

  // Formulário vazio
  if (!form || totalSteps === 0) return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: "#faf6ef" }}>
      <div className="text-center max-w-sm">
        <i className="ti ti-forms text-4xl block mb-3" style={{ color: "#d4b880" }} />
        <h1 className="text-xl font-bold mb-2" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
          Formulário em construção
        </h1>
        <p className="text-sm" style={{ color: "#5c4a2a" }}>
          Este formulário ainda não tem perguntas adicionadas.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#faf6ef" }}>

      {/* Banner de prévia */}
      {isPreview && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold"
          style={{ background: "#fff8ec", borderBottom: BRD, color: "#7a3d00" }}>
          <i className="ti ti-eye" /> Modo de prévia — as respostas não serão salvas
        </div>
      )}

      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between"
        style={{ background: "#fff", borderBottom: BRD }}>
        <div className="text-sm font-bold" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
          Data<span style={{ color: "#b07d20" }}>º</span>
        </div>
        <div className="text-xs font-medium" style={{ color: "#8b7355" }}>
          {step + 1} de {totalSteps}
        </div>
      </header>

      {/* Barra de progresso */}
      <div className="h-1" style={{ background: "#e8d9c0" }}>
        <div className="h-full transition-all duration-500 rounded-r-full"
          style={{ width: `${progress}%`, background: "#b07d20" }} />
      </div>

      {/* Conteúdo */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">

          {/* Capa e título (só no primeiro campo) */}
          {step === 0 && (
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#0a1628", fontFamily: "Georgia, serif", letterSpacing: "-0.4px" }}>
                {research.title}
              </h1>
              {research.description && (
                <p className="text-sm" style={{ color: "#5c4a2a" }}>{research.description}</p>
              )}
            </div>
          )}

          {/* Campo atual */}
          {currentField && (
            <div className="rounded-2xl p-6" style={{ background: "#fff", border: BRD, boxShadow: "0 2px 12px rgba(176,125,32,0.06)" }}>
              {/* Número da pergunta */}
              <div className="flex items-start gap-3 mb-4">
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ background: "#fff8ec", color: "#b07d20", border: BRD }}>
                  P{step + 1}
                </span>
                <div className="flex-1">
                  <p className="text-base font-bold leading-snug" style={{ color: "#0a1628" }}>
                    {currentField.label}
                    {currentField.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  {currentField.description && (
                    <p className="text-xs mt-1" style={{ color: "#8b7355" }}>{currentField.description}</p>
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
              style={{ border: BRD, background: "#fff", color: "#5c4a2a" }}>
              <i className="ti ti-arrow-left" /> Anterior
            </button>

            <button onClick={next} disabled={submitting}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: "#b07d20", color: "#fff" }}>
              {submitting ? (
                <><i className="ti ti-loader-2 animate-spin" /> Enviando...</>
              ) : step === totalSteps - 1 ? (
                <><i className="ti ti-send" /> Enviar resposta</>
              ) : (
                <>Próxima <i className="ti ti-arrow-right" /></>
              )}
            </button>
          </div>

          {/* Rodapé */}
          <p className="text-center text-xs mt-6" style={{ color: "#b8a080" }}>
            Powered by <span style={{ color: "#b07d20", fontFamily: "Georgia, serif", fontWeight: 700 }}>Dataº</span>
            {research.allowAnonymous && " · Respostas anônimas"}
          </p>
        </div>
      </main>
    </div>
  );
}
