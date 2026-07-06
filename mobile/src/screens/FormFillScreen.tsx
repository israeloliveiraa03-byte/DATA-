// Preenchimento do instrumento de coleta em campo — grava SEMPRE local
// primeiro (SQLite/localStorage) e deixa a sincronização pro syncWorker.
// A renderização de cada field_type segue o padrão do respondente do site
// (src/app/(public)/p/[slug]/respondent-client.tsx): mesmas chaves de config
// (options com {id,label,weight}, min/max, semanticLeft/Right etc.), mesmas
// respostas gravadas (opt.id, nunca opt.label). Tipos que exigem recurso que
// o app ainda não tem (mapa, arquivo, assinatura desenhada) caem num aviso.

import { useMemo, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Network } from "@capacitor/network";
import type { ApiForm, ApiFormField, Answers, AnswerValue, Opt } from "../lib/types";
import { saveResponse } from "../lib/localDb";
import { runSync } from "../lib/syncWorker";

// ─── Exibição condicional (mesma regra do site) ──────────────────────────────
function conditionMet(cfg: Record<string, unknown>, answers: Answers): boolean {
  const dependsOn = cfg.condDependsOn as string | undefined;
  if (!dependsOn) return true;
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

// ─── Campo individual ────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange }: {
  field: ApiFormField;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
}) {
  const cfg = (field.config ?? {}) as Record<string, unknown>;

  switch (field.type) {
    case "short_text":
    case "cpf_cnpj":
    case "cep":
      return (
        <input type="text" className="input"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={(cfg.placeholder as string) || "Sua resposta..."} />
      );

    case "long_text":
    case "observation":
      return (
        <textarea className="input" rows={4}
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={(cfg.placeholder as string) || "Sua resposta..."} />
      );

    case "number":
      return (
        <input type="number" className="input"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={(cfg.placeholder as string) || "0"} />
      );

    case "email":
      return (
        <input type="email" className="input"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="seu@email.com" />
      );

    case "phone":
      return (
        <input type="tel" className="input"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="(00) 00000-0000" />
      );

    case "date":
      return (
        <input type="date" className="input"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)} />
      );

    case "time":
      return (
        <input type="time" className="input"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)} />
      );

    case "yes_no":
      return (
        <div className="scale-row">
          {["Sim", "Não"].map(opt => (
            <button key={opt} type="button"
              className={`scale-opt${value === opt ? " scale-opt--selected" : ""}`}
              onClick={() => onChange(opt)}>
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
        <div>
          {options.map(opt => (
            <button key={opt.id} type="button"
              className={`choice${value === opt.id ? " choice--selected" : ""}`}
              onClick={() => onChange(opt.id)}>
              <span style={{ flex: 1 }}>{opt.label}</span>
              {field.type === "weighted" && opt.weight !== undefined && (
                <span style={{ color: "var(--brand-400)", fontWeight: 700, fontSize: 12 }}>{opt.weight}pts</span>
              )}
            </button>
          ))}
        </div>
      );
    }

    case "multiple_choice": {
      const options  = (cfg.options as Opt[]) ?? [];
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          {options.map(opt => {
            const isOn = selected.includes(opt.id);
            return (
              <button key={opt.id} type="button"
                className={`choice${isOn ? " choice--selected" : ""}`}
                onClick={() => onChange(isOn ? selected.filter(v => v !== opt.id) : [...selected, opt.id])}>
                <span style={{ width: 16 }}>{isOn ? "☑" : "☐"}</span>
                <span style={{ flex: 1 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    case "scale":
    case "nps": {
      const min = Number(cfg.min ?? (field.type === "nps" ? 0 : 1));
      const max = Number(cfg.max ?? (field.type === "nps" ? 10 : 5));
      const opts: number[] = [];
      for (let n = min; n <= max; n++) opts.push(n);
      return (
        <div className="scale-row">
          {opts.map(n => (
            <button key={n} type="button"
              className={`scale-opt${value === n ? " scale-opt--selected" : ""}`}
              onClick={() => onChange(n)}>
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "stars": {
      const max = Number(cfg.max ?? 5);
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="scale-row">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button key={n} type="button"
              className={`scale-opt${n <= current ? " scale-opt--selected" : ""}`}
              onClick={() => onChange(n)}
              aria-label={`${n} de ${max}`}>
              {n <= current ? "★" : "☆"}
            </button>
          ))}
        </div>
      );
    }

    case "slider": {
      const min = Number(cfg.min ?? 0);
      const max = Number(cfg.max ?? 100);
      const current = typeof value === "number" ? value : Math.round((min + max) / 2);
      return (
        <div>
          <input type="range" min={min} max={max} value={current}
            onChange={e => onChange(Number(e.target.value))}
            style={{ width: "100%" }} />
          <p className="field-desc" style={{ textAlign: "center", margin: "4px 0 0" }}>{current}</p>
        </div>
      );
    }

    case "semantic_scale": {
      const left  = (cfg.semanticLeft as string)  || "Discordo";
      const right = (cfg.semanticRight as string) || "Concordo";
      const opts = [1, 2, 3, 4, 5, 6, 7];
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-300)", marginBottom: 6 }}>
            <span>{left}</span><span>{right}</span>
          </div>
          <div className="scale-row">
            {opts.map(n => (
              <button key={n} type="button"
                className={`scale-opt${value === n ? " scale-opt--selected" : ""}`}
                onClick={() => onChange(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "geo_coords":
      return <GeoCoordsInput value={value} onChange={onChange} />;

    case "section":
      return null;

    default:
      // Tipo que o app ainda não renderiza (mapa, arquivo, assinatura, matriz
      // etc.) — visível como aviso em vez de sumir, pra ninguém achar que o
      // formulário está incompleto sem explicação.
      return (
        <p className="msg-muted" style={{ border: "1px dashed var(--ink-700)", borderRadius: 8, padding: 10 }}>
          Este tipo de pergunta ({field.type}) ainda não é preenchível no app —
          responda pelo site se for essencial.
        </p>
      );
  }
}

function GeoCoordsInput({ value, onChange }: { value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const coords = (value as { lat?: number; lng?: number } | null) ?? null;

  async function capture() {
    setBusy(true);
    setError("");
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError("Não foi possível obter a localização agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn--ghost" onClick={capture} disabled={busy}>
        {busy ? <span className="spinner" /> : null}
        {coords?.lat !== undefined ? "Capturar de novo" : "Capturar localização (GPS)"}
      </button>
      {coords?.lat !== undefined && (
        <p className="msg-success">{coords.lat!.toFixed(5)}, {coords.lng!.toFixed(5)}</p>
      )}
      {error && <p className="msg-error">{error}</p>}
    </div>
  );
}

// ─── Tela ────────────────────────────────────────────────────────────────────

interface Props {
  form:   ApiForm;
  onDone: () => void;
  onBack: () => void;
}

export function FormFillScreen({ form, onDone, onBack }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [savedOffline, setSavedOffline] = useState<boolean | null>(null);

  const visibleFields = useMemo(
    () => form.fields.filter(f =>
      f.type !== "conditional" || conditionMet((f.config ?? {}) as Record<string, unknown>, answers)
    ),
    [form.fields, answers]
  );

  function setAnswer(fieldId: string, val: AnswerValue) {
    setAnswers(prev => ({ ...prev, [fieldId]: val }));
  }

  async function save() {
    // Validação de obrigatórios (só entre os campos visíveis).
    for (const field of visibleFields) {
      if (!field.required || field.type === "section") continue;
      const answer = answers[field.id];
      const empty = answer === null || answer === undefined || answer === ""
        || (Array.isArray(answer) && answer.length === 0);
      if (empty) { setError(`Responda: "${field.label}"`); return; }
    }

    setSaving(true);
    setError("");
    try {
      // GPS da coleta (melhor esforço — sem GPS a resposta vale igual).
      let latitude: string | null = null;
      let longitude: string | null = null;
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000 });
        latitude  = String(pos.coords.latitude);
        longitude = String(pos.coords.longitude);
      } catch { /* segue sem localização */ }

      await saveResponse({
        id:         crypto.randomUUID(),
        formId:     form.id,
        researchId: form.researchId,
        data:       answers,
        latitude,
        longitude,
        capturedAt: new Date().toISOString(),
        syncStatus: "pending",
        syncError:  null,
      });

      // Se tem internet agora, já tenta drenar a fila — senão fica pro gatilho.
      const status = await Network.getStatus();
      if (status.connected) {
        void runSync();
        setSavedOffline(false);
      } else {
        setSavedOffline(true);
      }
    } catch {
      setError("Não foi possível gravar neste aparelho. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  if (savedOffline !== null) {
    return (
      <div className="screen">
        <div className="card" style={{ textAlign: "center", padding: 28 }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>{savedOffline ? "📥" : "✅"}</p>
          <h1 className="screen-title">{savedOffline ? "Salvo neste aparelho" : "Resposta registrada"}</h1>
          <p className="screen-subtitle" style={{ marginBottom: 20 }}>
            {savedOffline
              ? "Sem conexão agora — a resposta sincroniza sozinha quando a internet voltar (ou pelo botão Sincronizar)."
              : "A resposta foi gravada e enviada pra plataforma."}
          </p>
          <button className="btn" onClick={() => { setAnswers({}); setSavedOffline(null); }}>
            Coletar outra resposta
          </button>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn--ghost" onClick={onDone}>Voltar às pesquisas</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>‹ Voltar</button>
      </div>
      <p className="kicker">Coleta em campo</p>
      <h1 className="screen-title">{form.title}</h1>
      {form.description && <p className="screen-subtitle">{form.description}</p>}

      {visibleFields.map(field => (
        <div key={field.id} className="card">
          {field.type === "section" ? (
            <p className="kicker" style={{ margin: 0 }}>{field.label}</p>
          ) : (
            <>
              <label className="field-label">
                {field.label} {field.required && <span className="field-required">*</span>}
              </label>
              {field.description && <p className="field-desc">{field.description}</p>}
              <FieldInput field={field} value={answers[field.id] ?? null} onChange={val => setAnswer(field.id, val)} />
            </>
          )}
        </div>
      ))}

      {error && <p className="msg-error">{error}</p>}

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? <span className="spinner" /> : null}
        {saving ? "Gravando..." : "Registrar resposta"}
      </button>
      <p className="msg-muted" style={{ textAlign: "center" }}>
        A resposta é gravada primeiro neste aparelho — funciona sem internet.
      </p>
    </div>
  );
}
