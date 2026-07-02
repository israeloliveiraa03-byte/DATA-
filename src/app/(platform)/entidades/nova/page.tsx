"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStates, useCities } from "@/lib/hooks/use-geo";

const TYPES = [
  { value: "territorio", label: "Território" },
  { value: "comunidade", label: "Comunidade" },
  { value: "escola",     label: "Escola" },
  { value: "associacao", label: "Associação" },
  { value: "projeto",    label: "Projeto" },
  { value: "documento",  label: "Documento" },
];

export default function NovaEntidadePage() {
  const router = useRouter();
  const [type,        setType]        = useState("comunidade");
  const [name,         setName]        = useState("");
  const [description,  setDescription] = useState("");
  const [stateCode,    setStateCode]   = useState("");
  const [cityCode,     setCityCode]    = useState("");
  const [cityName,     setCityName]    = useState("");
  const [latitude,     setLatitude]    = useState("");
  const [longitude,    setLongitude]   = useState("");
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState("");

  const { states } = useStates();
  const { cities }  = useCities(stateCode || null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/entities", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, name, description: description || undefined,
          stateCode: stateCode || undefined,
          cityCode:  cityCode  || undefined,
          cityName:  cityName  || undefined,
          latitude:  latitude  || undefined,
          longitude: longitude || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Erro ao criar entidade");
        return;
      }

      router.push(`/entidades/${json.data.id}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">Catálogo Global</p>
          <h1 className="text-2xl font-bold text-slate-900">Nova entidade</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastre uma entidade com identificador persistente, pronta para ser vinculada a qualquer pesquisa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="type" className="text-sm font-medium text-gray-700">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={e => setType(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <Input
            label="Nome"
            required
            minLength={3}
            maxLength={500}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Comunidade Quilombola Boa Esperança"
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              id="description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Contexto, histórico ou observações relevantes..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="stateCode" className="text-sm font-medium text-gray-700">Estado</label>
              <select
                id="stateCode"
                value={stateCode}
                onChange={e => { setStateCode(e.target.value); setCityCode(""); setCityName(""); }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Selecione...</option>
                {states.map(s => <option key={s.sigla} value={s.sigla}>{s.nome}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="cityCode" className="text-sm font-medium text-gray-700">Município</label>
              <select
                id="cityCode"
                value={cityCode}
                disabled={!stateCode}
                onChange={e => {
                  const city = cities.find(c => String(c.id) === e.target.value);
                  setCityCode(e.target.value);
                  setCityName(city?.nome ?? "");
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
              >
                <option value="">Selecione...</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude"  value={latitude}  onChange={e => setLatitude(e.target.value)}  placeholder="-15.7801" />
            <Input label="Longitude" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-47.9292" />
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <i className="ti ti-alert-circle" /> {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Criar entidade
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
