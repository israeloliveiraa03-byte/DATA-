"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const FIELD_CLASS = "w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

const themes = [
  { value: "health",      label: "Saúde" },
  { value: "education",   label: "Educação" },
  { value: "environment", label: "Meio ambiente" },
  { value: "culture",     label: "Cultura" },
  { value: "economy",     label: "Economia" },
  { value: "governance",  label: "Governança" },
  { value: "territory",   label: "Território" },
  { value: "other",       label: "Outro" },
];

export default function NewResearchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const data = {
      title:       (form.elements.namedItem("title")       as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
      theme:       (form.elements.namedItem("theme")       as HTMLSelectElement).value,
    };

    try {
      const res = await fetch("/api/researches", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Erro ao criar pesquisa");
        return;
      }

      toast.success("Pesquisa criada — agora monte o instrumento de coleta.");
      router.push(`/researches/${json.data.id}/form-builder`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-condensed text-ink-100">Nova pesquisa</h1>
          <p className="text-sm text-ink-300 mt-0.5">
            Preencha as informações básicas para começar. Você monta o instrumento de coleta em seguida.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Título */}
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-sm font-medium text-ink-100">
              Título <span className="text-coral-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              minLength={5}
              maxLength={500}
              placeholder="Ex: Diagnóstico de saúde comunitária 2025"
              className={FIELD_CLASS}
            />
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium text-ink-100">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="Descreva o objetivo desta pesquisa..."
              className={`${FIELD_CLASS} resize-none`}
            />
          </div>

          {/* Tema */}
          <div className="flex flex-col gap-1">
            <label htmlFor="theme" className="text-sm font-medium text-ink-100">
              Tema <span className="text-coral-500">*</span>
            </label>
            <select
              id="theme"
              name="theme"
              required
              defaultValue="other"
              className={FIELD_CLASS}
            >
              {themes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-coral-500 flex items-center gap-1">
              <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
            </p>
          )}

          {/* Botões */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded text-sm font-semibold bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />}
              {loading ? "Criando..." : "Criar pesquisa"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2 text-sm rounded text-ink-300 hover:text-ink-100 hover:bg-ink-900 transition-colors duration-150"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
