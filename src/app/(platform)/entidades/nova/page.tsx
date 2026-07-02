"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStates, useCities } from "@/lib/hooks/use-geo";
import { MunicipalityPicker, type MunicipalityValue } from "@/components/entities/municipality-picker";
import type { LatLngPoint } from "@/components/entities/polygon-map-editor";
import { parsePastedCoordinates } from "@/lib/entities/coordinates";

// Leaflet acessa `window` — precisa carregar só no cliente, sem SSR.
const PolygonMapEditor = dynamic(
  () => import("@/components/entities/polygon-map-editor").then(m => m.PolygonMapEditor),
  { ssr: false, loading: () => <div className="h-[360px] rounded-lg bg-gray-50 border border-gray-200 animate-pulse" /> }
);

const TYPES = [
  { value: "territorio",             label: "Território" },
  { value: "comunidade",             label: "Comunidade" },
  { value: "regiao_administrativa",  label: "Região administrativa" },
  { value: "escola",                 label: "Escola" },
  { value: "associacao",             label: "Associação" },
  { value: "projeto",                label: "Projeto" },
  { value: "pessoa",                 label: "Pessoa" },
  { value: "documento",              label: "Documento" },
];

const TERRITORIO_TYPES = ["territorio", "comunidade"];
const ORG_TYPES        = ["escola", "associacao", "projeto"];

const DOCUMENT_TYPES = [
  { value: "cnpj",  label: "CNPJ" },
  { value: "cnes",  label: "CNES (saúde)" },
  { value: "inep",  label: "INEP (escolas)" },
  { value: "outro", label: "Outro" },
];

interface AdminDivisionDraft {
  name:   string;
  cities: MunicipalityValue[];
}

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

  // Território / comunidade
  const [municipalities, setMunicipalities] = useState<MunicipalityValue[]>([]);
  const [pasteCoords,    setPasteCoords]    = useState("");
  const [gpsLoading,     setGpsLoading]     = useState(false);
  const [boundaryPolygon, setBoundaryPolygon] = useState<LatLngPoint[]>([]);

  // Região administrativa
  const [adminDivisions, setAdminDivisions] = useState<AdminDivisionDraft[]>([{ name: "", cities: [] }]);

  // Organização / entidade jurídica
  const [documentType,     setDocumentType]     = useState("cnpj");
  const [documentNumber,   setDocumentNumber]   = useState("");
  const [cnpjLoading,      setCnpjLoading]       = useState(false);
  const [cnpjError,        setCnpjError]         = useState("");
  const [officialAddress,  setOfficialAddress]   = useState<Record<string, unknown> | null>(null);

  // Pessoa
  const [personKind,      setPersonKind]      = useState<"publica_historica" | "comum">("publica_historica");
  const [inviteContact,   setInviteContact]   = useState("");
  const [inviteLoading,   setInviteLoading]   = useState(false);
  const [inviteLink,      setInviteLink]      = useState("");
  const [inviteError,     setInviteError]     = useState("");

  const { states } = useStates();
  const { cities }  = useCities(stateCode || null);

  const isTerritorio = TERRITORIO_TYPES.includes(type);
  const isRegiao     = type === "regiao_administrativa";
  const isOrg        = ORG_TYPES.includes(type);
  const isPessoa     = type === "pessoa";
  const isPessoaComum = isPessoa && personKind === "comum";

  function useGps() {
    if (!navigator.geolocation) {
      setError("Este dispositivo/navegador não suporta captura de GPS.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
        setGpsLoading(false);
      },
      () => { setError("Não foi possível obter a localização do dispositivo."); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function applyPastedCoords() {
    const parsed = parsePastedCoordinates(pasteCoords);
    if (!parsed) { setError("Não consegui identificar coordenadas nesse texto."); return; }
    setLatitude(parsed.latitude);
    setLongitude(parsed.longitude);
    setError("");
  }

  function addAdminDivision() {
    setAdminDivisions(d => [...d, { name: "", cities: [] }]);
  }

  function removeAdminDivision(index: number) {
    setAdminDivisions(d => d.filter((_, i) => i !== index));
  }

  function updateAdminDivisionName(index: number, value: string) {
    setAdminDivisions(d => d.map((div, i) => i === index ? { ...div, name: value } : div));
  }

  function updateAdminDivisionCities(index: number, value: MunicipalityValue[]) {
    setAdminDivisions(d => d.map((div, i) => i === index ? { ...div, cities: value } : div));
  }

  async function lookupCnpj() {
    setCnpjError("");
    const digits = documentNumber.replace(/\D/g, "");
    if (digits.length !== 14) { setCnpjError("Informe os 14 dígitos do CNPJ."); return; }

    setCnpjLoading(true);
    try {
      const res = await fetch(`/api/entities/cnpj-lookup?cnpj=${digits}`);
      const json = await res.json();
      if (!res.ok) { setCnpjError(json.error ?? "Erro ao consultar CNPJ"); return; }

      const { razaoSocial, stateCode: uf, cityName: municipio } = json.data;
      setOfficialAddress(json.data);
      if (!name && razaoSocial) setName(razaoSocial);
      if (uf) {
        setStateCode(uf);
        if (municipio) {
          const citiesRes = await fetch(`/api/geo?type=cities&state=${uf}`).then(r => r.json());
          if (citiesRes.success) {
            const match = citiesRes.data.find(
              (c: { id: number; nome: string }) => c.nome.toLowerCase() === municipio.toLowerCase()
            );
            if (match) { setCityCode(String(match.id)); setCityName(match.nome); }
          }
        }
      }
    } catch {
      setCnpjError("Erro de conexão ao consultar a BrasilAPI.");
    } finally {
      setCnpjLoading(false);
    }
  }

  async function generateInvite() {
    setInviteError("");
    if (!name.trim()) { setInviteError("Informe um nome/apelido de referência para o convite."); return; }

    setInviteLoading(true);
    try {
      const res = await fetch("/api/entities/person-invites", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestedName: name, contact: inviteContact || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setInviteError(json.error ?? "Erro ao gerar convite"); return; }

      setInviteLink(`${window.location.origin}/convite/${json.data.token}`);
    } catch {
      setInviteError("Erro de conexão. Tente novamente.");
    } finally {
      setInviteLoading(false);
    }
  }

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
          municipalities: isTerritorio && municipalities.length ? municipalities : undefined,
          boundaryPolygon: isTerritorio && boundaryPolygon.length >= 3 ? boundaryPolygon : undefined,
          adminDivisions: isRegiao
            ? adminDivisions.filter(d => d.name.trim() && d.cities.length).map(d => ({ name: d.name, cities: d.cities }))
            : undefined,
          documentType:    isOrg ? documentType   : undefined,
          documentNumber:  isOrg ? documentNumber : undefined,
          officialAddress: isOrg && documentType === "cnpj" && officialAddress ? officialAddress : undefined,
          personKind:      isPessoa ? personKind  : undefined,
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
            placeholder={isPessoa ? "Ex: Maria da Silva" : "Ex: Comunidade Quilombola Boa Esperança"}
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

          {/* Pessoa: distinção pública/histórica x comum, com fluxo de convite */}
          {isPessoa && (
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Tipo de pessoa</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="personKind"
                    checked={personKind === "publica_historica"}
                    onChange={() => setPersonKind("publica_historica")}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Figura pública/histórica</strong> — pode ser cadastrada normalmente por um pesquisador.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="personKind"
                    checked={personKind === "comum"}
                    onChange={() => setPersonKind("comum")}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Pessoa comum</strong> — por LGPD, só ela mesma pode se cadastrar. Você gera um link de convite abaixo.
                  </span>
                </label>
              </div>

              {isPessoaComum && (
                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <Input
                    label="Contato para envio do convite (opcional)"
                    value={inviteContact}
                    onChange={e => setInviteContact(e.target.value)}
                    placeholder="e-mail ou telefone"
                  />
                  <Button type="button" variant="secondary" loading={inviteLoading} onClick={generateInvite}>
                    Gerar link de convite
                  </Button>
                  {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
                  {inviteLink && (
                    <div className="rounded-lg bg-brand-50 border border-brand-200 p-3 text-sm">
                      <p className="text-brand-700 font-medium mb-1">Convite gerado — válido por 30 dias</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate text-xs bg-white rounded px-2 py-1 border border-brand-200">{inviteLink}</code>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => navigator.clipboard.writeText(inviteLink)}
                        >
                          Copiar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Organização / entidade jurídica: documento público */}
          {isOrg && (
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Documento público <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="documentType" className="text-xs text-gray-500">Tipo</label>
                  <select
                    id="documentType"
                    value={documentType}
                    onChange={e => setDocumentType(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {DOCUMENT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <Input
                  label="Número"
                  required
                  value={documentNumber}
                  onChange={e => setDocumentNumber(e.target.value)}
                  placeholder={documentType === "cnpj" ? "00.000.000/0001-00" : "Número do documento"}
                />
              </div>
              {documentType === "cnpj" && (
                <div className="space-y-1.5">
                  <Button type="button" size="sm" variant="secondary" loading={cnpjLoading} onClick={lookupCnpj}>
                    Buscar endereço via BrasilAPI
                  </Button>
                  {cnpjError && <p className="text-xs text-red-500">{cnpjError}</p>}
                  <p className="text-xs text-gray-400">Preenche automaticamente estado e município a partir do CNPJ.</p>
                </div>
              )}
            </div>
          )}

          {/* Estado/Município principal — não se aplica a pessoa comum (endereço vem do autocadastro) */}
          {!isPessoaComum && (
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
          )}

          {/* Território / comunidade: coordenadas, multi-município, polígono e mini-pesquisa de campo */}
          {isTerritorio && (
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Coordenadas (ponto de referência)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Latitude"  value={latitude}  onChange={e => setLatitude(e.target.value)}  placeholder="-15.7801" />
                  <Input label="Longitude" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-47.9292" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button type="button" size="sm" variant="secondary" loading={gpsLoading} onClick={useGps}>
                    <i className="ti ti-current-location" /> Usar GPS do dispositivo
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={pasteCoords}
                    onChange={e => setPasteCoords(e.target.value)}
                    placeholder="Colar coordenadas ou link do Google Maps"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={applyPastedCoords}>Aplicar</Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Municípios adicionais <span className="text-gray-400 font-normal">(território cruza divisas)</span>
                </p>
                <MunicipalityPicker value={municipalities} onChange={setMunicipalities} />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Desenho de polígono no mapa <span className="text-gray-400 font-normal">(opcional — mínimo 3 pontos)</span>
                </p>
                <PolygonMapEditor
                  value={boundaryPolygon}
                  onChange={setBoundaryPolygon}
                  center={latitude && longitude ? { lat: parseFloat(latitude), lng: parseFloat(longitude) } : undefined}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use o ícone de polígono no canto do mapa para desenhar o limite; dá pra editar ou apagar depois.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <p><strong>Mini-pesquisa de campo</strong> (captar pontos via GPS) já está disponível — fica em &quot;Captar pontos/limites em campo&quot;, na tela da entidade, depois de criá-la.</p>
              </div>
            </div>
          )}

          {/* Região administrativa: divisões nomeadas, cada uma com seus municípios */}
          {isRegiao && (
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <p className="text-sm font-medium text-gray-700">
                Divisões <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(ex.: &quot;1ª Regional de Assistência Social&quot;, &quot;GRE Maceió&quot;)</span>
              </p>
              {adminDivisions.map((division, index) => (
                <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={division.name}
                      onChange={e => updateAdminDivisionName(index, e.target.value)}
                      placeholder="Nome da divisão"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {adminDivisions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAdminDivision(index)}
                        className="text-gray-400 hover:text-red-500"
                        aria-label="Remover divisão"
                      >
                        <i className="ti ti-trash" />
                      </button>
                    )}
                  </div>
                  <MunicipalityPicker value={division.cities} onChange={v => updateAdminDivisionCities(index, v)} />
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={addAdminDivision}>
                <i className="ti ti-plus" /> Adicionar divisão
              </Button>
              <p className="text-xs text-gray-400">
                TODO: no futuro, cada divisão poderá ser publicada numa biblioteca de regiões reutilizável, com atribuição ao criador.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <i className="ti ti-alert-circle" /> {error}
            </p>
          )}

          {!isPessoaComum && (
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={loading}>
                Criar entidade
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          )}
          {isPessoaComum && (
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Voltar
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
