"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import type { LatLngPoint } from "@/components/entities/polygon-map-editor";
import type {
  Entity, EntityVersion, Research, ResearchEntity,
  EntityMunicipality, EntityAdminDivision, EntityAdminDivisionCity, EntityOrgDocument, EntityPersonDetails,
} from "@/lib/types";

const DOCUMENT_TYPE_LABEL: Record<string, string> = { cnpj: "CNPJ", cnes: "CNES", inep: "INEP", outro: "Outro" };
const PERSON_KIND_LABEL: Record<string, string> = { publica_historica: "Figura pública/histórica", comum: "Pessoa comum" };

const PolygonMapEditor = dynamic(
  () => import("@/components/entities/polygon-map-editor").then(m => m.PolygonMapEditor),
  { ssr: false, loading: () => <div className="h-[320px] rounded-lg bg-gray-50 border border-gray-200 animate-pulse" /> }
);

const TYPE_MAP: Record<string, { label: string; icon: string }> = {
  territorio:             { label: "Território",             icon: "ti-map" },
  comunidade:             { label: "Comunidade",              icon: "ti-users" },
  regiao_administrativa:  { label: "Região administrativa",   icon: "ti-map-2" },
  escola:                 { label: "Escola",                  icon: "ti-school" },
  associacao:             { label: "Associação",               icon: "ti-building-community" },
  projeto:                { label: "Projeto",                  icon: "ti-clipboard-list" },
  pessoa:                 { label: "Pessoa",                   icon: "ti-user" },
  documento:              { label: "Documento",                icon: "ti-file-text" },
};

const TERRITORIO_TYPES = ["territorio", "comunidade"];

const STATUS_MAP: Record<string, { label: string; variant: "default"|"teal"|"amber" }> = {
  draft:     { label: "Rascunho",  variant: "default" },
  published: { label: "Publicada", variant: "teal" },
  archived:  { label: "Arquivada", variant: "amber" },
};

interface EntityWithChildren extends Entity {
  municipalities: EntityMunicipality[];
  adminDivisions: (EntityAdminDivision & { cities: EntityAdminDivisionCity[] })[];
  orgDocument:    EntityOrgDocument | null;
  personDetails:  EntityPersonDetails | null;
}

interface Props {
  entity: EntityWithChildren;
  versions: EntityVersion[];
  links: (ResearchEntity & { research: Research })[];
  myResearches: Research[];
}

export function EntidadeDetailClient({ entity: initialEntity, versions: initialVersions, links: initialLinks, myResearches }: Props) {
  const router = useRouter();
  const { municipalities, adminDivisions, orgDocument, personDetails, ...baseEntity } = initialEntity;
  const [entity,   setEntity]   = useState<Entity>(baseEntity);
  const [versions, setVersions] = useState(initialVersions);
  const [links,    setLinks]    = useState(initialLinks);

  const [editingName, setEditingName] = useState(entity.name);
  const [changeNote,  setChangeNote]  = useState("");
  const [savingName,  setSavingName]  = useState(false);
  const [nameError,   setNameError]   = useState("");

  const [selectedResearchId, setSelectedResearchId] = useState("");
  const [relationNote,       setRelationNote]       = useState("");
  const [linking,             setLinking]             = useState(false);
  const [linkError,           setLinkError]           = useState("");

  const [boundaryPolygon, setBoundaryPolygon] = useState<LatLngPoint[]>(
    Array.isArray(entity.boundaryPolygon) ? (entity.boundaryPolygon as LatLngPoint[]) : []
  );
  const [savingPolygon, setSavingPolygon] = useState(false);
  const [polygonError,  setPolygonError]  = useState("");
  const [polygonSaved,  setPolygonSaved]  = useState(false);

  async function savePolygon() {
    setSavingPolygon(true);
    setPolygonError("");
    setPolygonSaved(false);
    try {
      // updateEntitySchema exige mínimo 3 pontos quando o campo é enviado — não dá
      // pra "limpar" o polígono por aqui ainda (TODO: endpoint dedicado de remoção).
      const res = await fetch(`/api/entities/${entity.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boundaryPolygon,
          changeNote: "Polígono editado no mapa",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setPolygonError(json.error ?? "Erro ao salvar polígono"); return; }
      setEntity(json.data);
      setPolygonSaved(true);
      router.refresh();
    } catch {
      setPolygonError("Erro de conexão. Tente novamente.");
    } finally {
      setSavingPolygon(false);
    }
  }

  const t = TYPE_MAP[entity.type] ?? { label: entity.type, icon: "ti-tag" };
  const s = STATUS_MAP[entity.status] ?? STATUS_MAP.draft;

  const linkedResearchIds = new Set(links.map(l => l.researchId));
  const availableResearches = myResearches.filter(r => !linkedResearchIds.has(r.id));

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (editingName.trim() === entity.name) return;
    setSavingName(true);
    setNameError("");
    try {
      const res = await fetch(`/api/entities/${entity.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim(), changeNote: changeNote || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setNameError(json.error ?? "Erro ao salvar"); return; }
      setEntity(json.data);
      setChangeNote("");
      router.refresh();
      setVersions(prev => [
        { id: `local-${Date.now()}`, entityId: entity.id, version: (prev[0]?.version ?? 0) + 1, snapshot: json.data, changeNote: changeNote || "Atualização da entidade", changedBy: "", createdAt: new Date() },
        ...prev,
      ]);
    } catch {
      setNameError("Erro de conexão. Tente novamente.");
    } finally {
      setSavingName(false);
    }
  }

  async function linkToResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResearchId) return;
    setLinking(true);
    setLinkError("");
    try {
      const res = await fetch(`/api/researches/${selectedResearchId}/entities`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: entity.id, relationNote: relationNote || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setLinkError(json.error ?? "Erro ao vincular"); return; }
      const research = myResearches.find(r => r.id === selectedResearchId)!;
      setLinks(prev => [...prev, { ...json.data, research }]);
      setSelectedResearchId("");
      setRelationNote("");
    } catch {
      setLinkError("Erro de conexão. Tente novamente.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-6 max-w-4xl mx-auto">

        <div className="flex items-center gap-2 text-xs mb-5 text-slate-500">
          <Link href="/entidades" className="hover:underline text-brand-600">Entidades</Link>
          <i className="ti ti-chevron-right text-xs" />
          <span className="text-slate-700">{entity.name}</span>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="blue"><i className={`ti ${t.icon}`} /> {t.label}</Badge>
            <Badge variant={s.variant}>{s.label}</Badge>
            <span className="text-xs font-mono text-slate-400">{entity.code}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{entity.name}</h1>
          {entity.description && <p className="text-sm text-slate-500 mt-1">{entity.description}</p>}
          {entity.cityName && (
            <p className="text-xs flex items-center gap-1 mt-2 text-slate-500">
              <i className="ti ti-map-pin text-xs text-brand-500" />
              {entity.cityName}{entity.stateCode ? ` — ${entity.stateCode}` : ""}
            </p>
          )}
          {(entity.type === "territorio" || entity.type === "comunidade") && (
            <Link
              href={`/entidades/${entity.id}/campo`}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 mt-3"
            >
              <i className="ti ti-map-pin-plus" /> Captar pontos/limites em campo
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 flex flex-col gap-4">

            {TERRITORIO_TYPES.includes(entity.type) && municipalities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Municípios adicionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {municipalities.map(m => (
                      <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 text-xs px-2.5 py-1">
                        {m.cityName}/{m.stateCode}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {entity.type === "regiao_administrativa" && (
              <Card>
                <CardHeader>
                  <CardTitle>Divisões</CardTitle>
                </CardHeader>
                <CardContent>
                  {adminDivisions.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhuma divisão cadastrada.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {adminDivisions.map(d => (
                        <li key={d.id}>
                          <p className="text-sm font-semibold text-slate-800 mb-1">{d.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {d.cities.map(c => (
                              <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 text-xs px-2.5 py-1">
                                {c.cityName}/{c.stateCode}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {orgDocument && (
              <Card>
                <CardHeader>
                  <CardTitle>Documento público</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{DOCUMENT_TYPE_LABEL[orgDocument.documentType] ?? orgDocument.documentType}</span>
                    {" "}— {orgDocument.documentNumber}
                  </p>
                  {orgDocument.officialAddress != null && (
                    <p className="text-xs text-slate-500 mt-1">
                      Endereço oficial (BrasilAPI) já vinculado ao cadastro.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {personDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Dados de pessoa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-800">
                    {PERSON_KIND_LABEL[personDetails.personKind] ?? personDetails.personKind}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {personDetails.selfRegistered ? "Autocadastrada via convite" : "Cadastrada por um pesquisador"}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Pesquisas vinculadas</CardTitle>
              </CardHeader>
              <CardContent>
                {links.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhuma pesquisa vinculada a esta entidade ainda.</p>
                ) : (
                  <ul className="flex flex-col gap-2 mb-4">
                    {links.map(l => (
                      <li key={l.id}>
                        <Link href={`/researches/${l.research.id}`} className="flex items-center justify-between px-3 py-2 rounded-md border border-slate-100 hover:border-brand-200 hover:bg-brand-50/40 transition-colors">
                          <span className="text-sm font-medium text-slate-800">{l.research.title}</span>
                          <i className="ti ti-arrow-right text-xs text-brand-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {availableResearches.length > 0 && (
                  <form onSubmit={linkToResearch} className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">Vincular a uma pesquisa sua</p>
                    <div className="flex gap-2">
                      <select
                        value={selectedResearchId}
                        onChange={e => setSelectedResearchId(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">Selecione uma pesquisa...</option>
                        {availableResearches.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                      </select>
                      <Button type="submit" loading={linking} disabled={!selectedResearchId}>Vincular</Button>
                    </div>
                    <Input
                      value={relationNote}
                      onChange={e => setRelationNote(e.target.value)}
                      placeholder="Nota sobre o vínculo (opcional)"
                    />
                    {linkError && <p className="text-xs text-red-500">{linkError}</p>}
                  </form>
                )}
              </CardContent>
            </Card>

            {TERRITORIO_TYPES.includes(entity.type) && (
              <Card>
                <CardHeader>
                  <CardTitle>Polígono no mapa</CardTitle>
                </CardHeader>
                <CardContent>
                  <PolygonMapEditor
                    value={boundaryPolygon}
                    onChange={points => { setBoundaryPolygon(points); setPolygonSaved(false); }}
                    center={entity.latitude && entity.longitude ? { lat: parseFloat(entity.latitude), lng: parseFloat(entity.longitude) } : undefined}
                  />
                  {boundaryPolygon.length > 0 && boundaryPolygon.length < 3 && (
                    <p className="text-xs text-amber-600 mt-2">Desenhe pelo menos 3 pontos para formar um polígono válido.</p>
                  )}
                  {polygonError && <p className="text-xs text-red-500 mt-2">{polygonError}</p>}
                  {polygonSaved && <p className="text-xs text-teal-700 mt-2">Polígono salvo.</p>}
                  <div className="mt-3">
                    <Button
                      size="sm"
                      loading={savingPolygon}
                      disabled={boundaryPolygon.length > 0 && boundaryPolygon.length < 3}
                      onClick={savePolygon}
                    >
                      Salvar polígono
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Editar nome</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveName} className="flex flex-col gap-2">
                  <Input value={editingName} onChange={e => setEditingName(e.target.value)} minLength={3} maxLength={500} />
                  <Input
                    value={changeNote}
                    onChange={e => setChangeNote(e.target.value)}
                    placeholder="Nota sobre a alteração (opcional)"
                  />
                  {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                  <div>
                    <Button type="submit" size="sm" loading={savingName} disabled={editingName.trim() === entity.name || editingName.trim().length < 3}>
                      Salvar alteração
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de versões</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {versions.map(v => (
                    <li key={v.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">v{v.version}</Badge>
                        <span className="text-slate-400">{formatDateTime(v.createdAt)}</span>
                      </div>
                      {v.changeNote && <p className="text-slate-600 mt-1">{v.changeNote}</p>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
