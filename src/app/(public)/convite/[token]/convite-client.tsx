"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataLogo } from "@/components/layout/data-logo";
import { useStates, useCities } from "@/lib/hooks/use-geo";

interface ConviteClientProps {
  token: string;
  suggestedName: string | null;
  invalid: boolean;
  isLoggedIn: boolean;
}

export function ConviteClient({ token, suggestedName, invalid, isLoggedIn }: ConviteClientProps) {
  const [name,        setName]        = useState(suggestedName ?? "");
  const [description, setDescription] = useState("");
  const [stateCode,   setStateCode]   = useState("");
  const [cityCode,    setCityCode]    = useState("");
  const [cityName,    setCityName]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [done,        setDone]        = useState(false);

  const { states } = useStates();
  const { cities }  = useCities(stateCode || null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/entities/person-invites/${token}/accept`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description: description || undefined,
          stateCode: stateCode || undefined,
          cityCode:  cityCode  || undefined,
          cityName:  cityName  || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao concluir o autocadastro"); return; }
      setDone(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <DataLogo />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-xl font-serif font-semibold text-slate-900 mb-1">Autocadastro de pessoa</h1>
          <p className="text-sm text-slate-500 mb-5">
            Você foi convidado(a) a se cadastrar como entidade de conhecimento no Dataº. Só você pode preencher este formulário.
          </p>

          {invalid && (
            <p className="text-sm text-coral-500 flex items-center gap-1">
              <i className="ti ti-alert-circle" /> Este convite não está mais válido. Peça um novo link a quem convidou você.
            </p>
          )}

          {!invalid && done && (
            <p className="text-sm text-teal-600 flex items-center gap-1">
              <i className="ti ti-circle-check" /> Cadastro concluído. Sua entidade já está no Catálogo Global do Dataº.
            </p>
          )}

          {!invalid && !done && !isLoggedIn && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Entre com sua conta para confirmar que é você mesmo(a) quem está se cadastrando.
              </p>
              <Button type="button" onClick={() => signIn("google", { callbackUrl: `/convite/${token}` })}>
                Entrar com Google
              </Button>
            </div>
          )}

          {!invalid && !done && isLoggedIn && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nome" required minLength={3} maxLength={500} value={name} onChange={e => setName(e.target.value)} />

              <div className="flex flex-col gap-1">
                <label htmlFor="description" className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
                <textarea
                  id="description"
                  rows={3}
                  maxLength={2000}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
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

              {error && (
                <p className="text-sm text-coral-500 flex items-center gap-1">
                  <i className="ti ti-alert-circle" /> {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Concluir meu cadastro
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
