"use client";

import { useState, useCallback } from "react";
import type { Research, Form, FormField } from "@/lib/types";

// ─── Tipos de resposta ────────────────────────────────────────────────────────
type AnswerValue = string | string[] | number | boolean | null;
type Answers = Record<string, AnswerValue>;

// ─── Componentes de campo ─────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
}) {
  const cfg = (field.config ?? {}) as Record<string, unknown>;
  const BRD = "1px solid #e8d9c0";
  const inputCls = "w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 transition-shadow";
  const inputStyle = { border: BRD, background: "#fff", color: "#1a0f00", boxShadow: "none" };

  switch (field.type) {
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

    case "single_choice": {
      const options = (cfg.options as Array<{ value: string; label: string }>) ?? [];
      return (
        <div className="flex flex-col gap-2">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all"
              style={{
                border: value === opt.value ? "2px solid #b07d20" : BRD,
                background: value === opt.value ? "#fff8ec" : "#fff",
                color: "#1a0f00",
              }}
            >
              <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ border: value === opt.value ? "5px solid #b07d20" : "2px solid #c4a35a" }} />
              {opt.label}
            </button>
          ))}
        </div>
      );
    }

    case "multiple_choice": {
      const options = (cfg.options as Array<{ value: string; label: string }>) ?? [];
      const selected = (value as string[]) ?? [];
      return (
        <div className="flex flex-col gap-2">
          {options.map(opt => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (isSelected) onChange(selected.filter(v => v !== opt.value));
                  else onChange([...selected, opt.value]);
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

    case "geo_city":
      return (
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
      );

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
        {isPreview && (
          <button onClick={() => { setSubmitted(false); setStep(0); setAnswers({}); }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "#b07d20", color: "#fff" }}>
            Reiniciar prévia
          </button>
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
