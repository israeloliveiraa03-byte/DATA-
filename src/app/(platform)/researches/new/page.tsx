"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

      router.push(`/researches/${json.data.id}/form-builder`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nova pesquisa</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Preencha as informações básicas para começar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Título */}
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="text-sm font-medium text-gray-700">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={5}
            maxLength={500}
            placeholder="Ex: Diagnóstico de saúde comunitária 2025"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            placeholder="Descreva o objetivo desta pesquisa..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Tema */}
        <div className="flex flex-col gap-1">
          <label htmlFor="theme" className="text-sm font-medium text-gray-700">
            Tema <span className="text-red-500">*</span>
          </label>
          <select
            id="theme"
            name="theme"
            required
            defaultValue="other"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {themes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Erro */}
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <i className="ti ti-alert-circle" /> {error}
          </p>
        )}

        {/* Botões */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar pesquisa"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}