"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { normalizeBoundaryGeo } from "@/lib/entities/geo-format";
import {
  extractBoundary, compareBoundaries, formatHa,
  COMPARE_COLOR_A, COMPARE_COLOR_B,
  type BoundaryFeature,
} from "@/lib/entities/boundary-compare";
import { useNeighborBoundaries } from "@/lib/hooks/use-neighbor-boundaries";
import type { FeatureCollection } from "geojson";
import type {
  Entity, EntityVersion, Research, ResearchEntity,
  EntityMunicipality, EntityAdminDivision, EntityAdminDivisionCity, EntityOrgDocument, EntityPersonDetails,
} from "@/lib/types";

const DOCUMENT_TYPE_LABEL: Record<string, string> = { cnpj: "CNPJ", cnes: "CNES", inep: "INEP", outro: "Outro" };
const PERSON_KIND_LABEL: Record<string, string> = { publica_historica: "Figura pública/histórica", comum: "Pessoa comum" };

const PolygonMapEditor = dynamic(
  () => import("@/components/entities/polygon-map-editor").then(m => m.PolygonMapEditor),
  { ssr: false, loading: () => <div className="h-[320px] rounded-lg bg-ink-900 border border-ink-700 animate-pulse" aria-label="Carregando mapa..." /> }
);

const BoundaryCompareMap = dynamic(
  () => import("@/components/entities/boundary-compare-map").then(m => m.BoundaryCompareMap),
  { ssr: false, loading: () => <div className="h-[360px] rounded-lg bg-ink-900 border border-ink-700 animate-pulse" aria-label="Carregando mapa de comparação..." /> }
);

// Uma "parada" na linha do tempo do contorno: versão em que a geometria do
// território de fato mudou (versões que só alteraram nome/descrição são
// puladas — o snapshot carrega o mesmo contorno da anterior).
interface BoundaryStop {
  key:       string;
  label:     string;
  dateLabel: string;
  note:      string | null;
  boundary:  BoundaryFeature;
}

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

interface EntityNote {
  id: string;
  title: string;
  body: string;
  visibility: "public" | "private";
  authorId: string;
  author: { id: string; name: string };
  createdAt: Date | string;
}

interface Props {
  entity: EntityWithChildren;
  versions: EntityVersion[];
  links: (ResearchEntity & { research: Research })[];
  myResearches: Research[];
  notes: EntityNote[];
  currentUserId: string;
}

export function EntidadeDetailClient({ entity: initialEntity, versions: initialVersions, links: initialLinks, myResearches, notes: initialNotes, currentUserId }: Props) {
  const router = useRouter();
  const { municipalities, adminDivisions, orgDocument, personDetails, ...baseEntity } = initialEntity;
  const [entity,   setEntity]   = useState<Entity>(baseEntity);
  const [versions, setVersions] = useState(initialVersions);
  const [links,    setLinks]    = useState(initialLinks);

  const [editingName, setEditingName] = useState(entity.name);
  const [changeNote,  setChangeNote]  = useState("");
  const [savingName,  setSavingName]  = useState(false);
  const [nameError,   setNameError]   = useState("");

  const [notes,        setNotes]        = useState(initialNotes);
  const [noteTitle,    setNoteTitle]    = useState("");
  const [noteBody,     setNoteBody]     = useState("");
  const [notePublic,   setNotePublic]   = useState(true);
  const [notingNew,    setNotingNew]    = useState(false);
  const [noteSaving,   setNoteSaving]   = useState(false);
  const [noteError,    setNoteError]    = useState("");

  async function addEntityNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle || !noteBody) return;
    setNoteSaving(true);
    setNoteError("");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle, body: noteBody, entityId: entity.id, visibility: notePublic ? "public" : "private" }),
      });
      const json = await res.json();
      if (!res.ok) { setNoteError(json.error ?? "Erro ao publicar a nota"); return; }
      setNotes(prev => [{ ...json.data, author: { id: currentUserId, name: "Você" } }, ...prev]);
      setNoteTitle(""); setNoteBody(""); setNotePublic(true); setNotingNew(false);
      toast.success("Nota publicada.");
    } catch {
      setNoteError("Erro de conexão. Tente novamente.");
    } finally {
      setNoteSaving(false);
    }
  }

  async function deleteEntityNote(noteId: string) {
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao excluir a nota."); return; }
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }

  const [selectedResearchId, setSelectedResearchId] = useState("");
  const [relationNote,       setRelationNote]       = useState("");
  const [linking,             setLinking]             = useState(false);
  const [linkError,           setLinkError]           = useState("");

  const [boundaryPolygon, setBoundaryPolygon] = useState<FeatureCollection>(
    normalizeBoundaryGeo(entity.boundaryPolygon)
  );
  const [savingPolygon, setSavingPolygon] = useState(false);
  const [polygonError,  setPolygonError]  = useState("");
  const [polygonSaved,  setPolygonSaved]  = useState(false);

  const isTerritorio = TERRITORIO_TYPES.includes(entity.type);

  // Territórios vizinhos já cadastrados — o editor cruza o contorno atual
  // com eles e avisa sobre sobreposição (sem bloquear o salvamento).
  const neighbors = useNeighborBoundaries(entity.id, isTerritorio);

  // Linha do tempo do contorno: percorre as versões em ordem cronológica,
  // extrai o contorno principal de cada snapshot e guarda só as versões em
  // que a geometria realmente mudou. É isso que alimenta a comparação
  // visual "Evolução do território".
  const boundaryTimeline = useMemo<BoundaryStop[]>(() => {
    if (!isTerritorio) return [];
    const chronological = [...versions].sort((a, b) => a.version - b.version);
    const stops: BoundaryStop[] = [];
    for (const v of chronological) {
      const snap = v.snapshot as { boundaryPolygon?: unknown } | null;
      const boundary = extractBoundary(normalizeBoundaryGeo(snap?.boundaryPolygon));
      if (!boundary) continue;
      const prev = stops[stops.length - 1];
      if (prev && JSON.stringify(prev.boundary.geometry) === JSON.stringify(boundary.geometry)) continue;
      stops.push({
        key:       v.id,
        label:     `v${v.version}`,
        dateLabel: formatDateTime(v.createdAt),
        note:      v.changeNote,
        boundary,
      });
    }
    return stops;
  }, [versions, isTerritorio]);

  const boundaryStopKeys = useMemo(() => new Set(boundaryTimeline.map(s => s.key)), [boundaryTimeline]);

  // Comparação de versões: A = mais antiga (âmbar tracejado), B = mais
  // recente (verde sólido). Padrão: penúltima × última mudança de contorno.
  const [compareAKey, setCompareAKey] = useState<string | null>(null);
  const [compareBKey, setCompareBKey] = useState<string | null>(null);
  const sideA = boundaryTimeline.find(s => s.key === compareAKey) ?? boundaryTimeline[boundaryTimeline.length - 2];
  const sideB = boundaryTimeline.find(s => s.key === compareBKey) ?? boundaryTimeline[boundaryTimeline.length - 1];
  const comparison = useMemo(
    () => (sideA && sideB ? compareBoundaries(sideA.boundary, sideB.boundary) : null),
    [sideA, sideB]
  );

  async function savePolygon() {
    setSavingPolygon(true);
    setPolygonError("");
    setPolygonSaved(false);
    try {
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
      toast.success("Marcação salva — nova versão registrada no histórico.");
      router.refresh();
      // Mesmo padrão otimista do saveName: a nova versão entra na lista (e na
      // linha do tempo de contorno) sem esperar recarregar a página.
      setVersions(prev => [
        { id: `local-${Date.now()}`, entityId: entity.id, version: (prev[0]?.version ?? 0) + 1, snapshot: json.data, changeNote: "Polígono editado no mapa", changedBy: "", createdAt: new Date() },
        ...prev,
      ]);
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
      toast.success("Nome atualizado — nova versão registrada no histórico.");
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
      toast.success("Entidade vinculada à pesquisa.");
    } catch {
      setLinkError("Erro de conexão. Tente novamente.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-4xl mx-auto">

        <nav aria-label="Você está em" className="flex items-center gap-2 text-xs mb-5 text-ink-300">
          <Link href="/entidades" className="hover:underline text-brand-400">Entidades</Link>
          <i className="ti ti-chevron-right text-xs" />
          <span className="text-ink-100">{entity.name}</span>
        </nav>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="blue"><i className={`ti ${t.icon}`} /> {t.label}</Badge>
            <Badge variant={s.variant}>{s.label}</Badge>
            <span className="text-xs font-mono text-ink-300">{entity.code}</span>
          </div>
          <h1 className="text-2xl font-bold font-condensed text-ink-100">{entity.name}</h1>
          {entity.description && <p className="text-sm text-ink-300 mt-1">{entity.description}</p>}
          {entity.cityName && (
            <p className="text-xs flex items-center gap-1 mt-2 text-ink-300">
              <i className="ti ti-map-pin text-xs text-brand-400" aria-hidden="true" />
              {entity.cityName}{entity.stateCode ? ` — ${entity.stateCode}` : ""}
            </p>
          )}
          {(entity.type === "territorio" || entity.type === "comunidade") && (
            <Link
              href={`/entidades/${entity.id}/campo`}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:underline mt-3"
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
                    <p className="text-xs text-ink-300">Nenhuma divisão cadastrada.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {adminDivisions.map(d => (
                        <li key={d.id}>
                          <p className="text-sm font-semibold text-ink-100 mb-1">{d.name}</p>
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
                  <p className="text-sm text-ink-100">
                    <span className="font-semibold">{DOCUMENT_TYPE_LABEL[orgDocument.documentType] ?? orgDocument.documentType}</span>
                    {" "}— {orgDocument.documentNumber}
                  </p>
                  {orgDocument.officialAddress != null && (
                    <p className="text-xs text-ink-300 mt-1">
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
                  <p className="text-sm text-ink-100">
                    {PERSON_KIND_LABEL[personDetails.personKind] ?? personDetails.personKind}
                  </p>
                  <p className="text-xs text-ink-300 mt-1">
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
                  <p className="text-xs text-ink-300 mb-2">Nenhuma pesquisa vinculada ainda — o conhecimento desta entidade fica visível nas pesquisas que você vincular abaixo.</p>
                ) : (
                  <ul className="flex flex-col gap-2 mb-4">
                    {links.map(l => (
                      <li key={l.id}>
                        <Link href={`/researches/${l.research.id}`} className="flex items-center justify-between px-3 py-2 rounded-md border border-ink-700 hover:border-brand-500/40 hover:bg-ink-800 transition-colors duration-150">
                          <span className="text-sm font-medium text-ink-100">{l.research.title}</span>
                          <i className="ti ti-arrow-right text-xs text-brand-400" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {availableResearches.length > 0 && (
                  <form onSubmit={linkToResearch} className="flex flex-col gap-2 pt-3 border-t border-ink-700">
                    <p className="text-xs font-semibold text-ink-100">Vincular a uma pesquisa sua</p>
                    <div className="flex gap-2">
                      <select
                        value={selectedResearchId}
                        onChange={e => setSelectedResearchId(e.target.value)}
                        className="flex-1 min-w-0 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    {linkError && <p className="text-xs text-coral-500">{linkError}</p>}
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Notas técnicas sobre esta entidade</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setNotingNew(v => !v)}>
                  <i className="ti ti-plus" aria-hidden="true" /> Nova nota
                </Button>
              </CardHeader>
              <CardContent>
                {notingNew && (
                  <form onSubmit={addEntityNote} className="flex flex-col gap-2 mb-4 pb-4 border-b border-ink-700">
                    <Input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Título da nota" />
                    <textarea
                      value={noteBody}
                      onChange={e => setNoteBody(e.target.value)}
                      rows={4}
                      placeholder="Orientações, recomendações e aprendizados sobre esta entidade..."
                      className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                    />
                    <label className="flex items-center gap-2 text-xs text-ink-300">
                      <input type="checkbox" checked={notePublic} onChange={e => setNotePublic(e.target.checked)} />
                      Visível pra rede (desmarque pra manter privada, só sua)
                    </label>
                    {noteError && <p className="text-xs text-coral-500">{noteError}</p>}
                    <Button type="submit" size="sm" loading={noteSaving} disabled={!noteTitle || !noteBody}>Publicar nota</Button>
                  </form>
                )}

                {notes.length === 0 ? (
                  <p className="text-xs text-ink-300">Nenhuma nota técnica ainda sobre esta entidade.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {notes.map(note => (
                      <li key={note.id} className="px-3 py-2 rounded-md border border-ink-700">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-bold text-ink-100">{note.title}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={note.visibility === "public" ? "teal" : "default"}>
                              {note.visibility === "public" ? "Pública" : "Privada"}
                            </Badge>
                            {note.authorId === currentUserId && (
                              <button onClick={() => deleteEntityNote(note.id)} title="Excluir" className="text-coral-500 hover:text-coral-600">
                                <i className="ti ti-trash text-xs" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-ink-300 whitespace-pre-wrap line-clamp-4">{note.body}</p>
                        <p className="text-2xs text-ink-500 mt-1.5">{note.author.name}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {TERRITORIO_TYPES.includes(entity.type) && (
              <Card>
                <CardHeader>
                  <CardTitle>Marcação no mapa</CardTitle>
                </CardHeader>
                <CardContent>
                  <PolygonMapEditor
                    value={boundaryPolygon}
                    onChange={fc => { setBoundaryPolygon(fc); setPolygonSaved(false); }}
                    center={entity.latitude && entity.longitude ? { lat: parseFloat(entity.latitude), lng: parseFloat(entity.longitude) } : undefined}
                    neighbors={neighbors}
                  />
                  {polygonError && <p className="text-xs text-coral-500 mt-2">{polygonError}</p>}
                  {polygonSaved && <p className="text-xs text-teal-500 mt-2">Marcação salva.</p>}
                  <div className="mt-3">
                    <Button
                      size="sm"
                      loading={savingPolygon}
                      onClick={savePolygon}
                    >
                      Salvar marcação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evolução do território: compara o contorno entre duas versões do
                histórico — só existe porque cada mudança grava um snapshot
                completo em entity_versions, incluindo a geometria. */}
            {isTerritorio && boundaryTimeline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Evolução do território</CardTitle>
                </CardHeader>
                <CardContent>
                  {boundaryTimeline.length < 2 ? (
                    <p className="text-xs text-ink-300">
                      O contorno deste território tem um único registro até agora ({boundaryTimeline[0].label}, {boundaryTimeline[0].dateLabel}).
                      Quando a marcação no mapa mudar, você poderá comparar aqui como o limite evoluiu entre as versões — com a diferença de área calculada.
                    </p>
                  ) : sideA && sideB && (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1 text-xs text-ink-300">
                          <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true" className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: COMPARE_COLOR_A }} />
                            Versão A (referência)
                          </span>
                          <select
                            value={sideA.key}
                            onChange={e => setCompareAKey(e.target.value)}
                            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            {boundaryTimeline.map(s => (
                              <option key={s.key} value={s.key}>{s.label} — {s.dateLabel}{s.note ? ` · ${s.note}` : ""}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-ink-300">
                          <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true" className="inline-block w-4 border-t-2" style={{ borderColor: COMPARE_COLOR_B }} />
                            Versão B (comparada)
                          </span>
                          <select
                            value={sideB.key}
                            onChange={e => setCompareBKey(e.target.value)}
                            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            {boundaryTimeline.map(s => (
                              <option key={s.key} value={s.key}>{s.label} — {s.dateLabel}{s.note ? ` · ${s.note}` : ""}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <BoundaryCompareMap a={sideA.boundary} b={sideB.boundary} aKey={sideA.key} bKey={sideB.key} />

                      {comparison && (
                        <div className="rounded-lg border border-ink-700 bg-ink-900 p-3 text-xs text-ink-300">
                          {sideA.key === sideB.key ? (
                            <p>Você está comparando a mesma versão dos dois lados — escolha versões diferentes pra ver a mudança.</p>
                          ) : comparison.identical ? (
                            <p>Nenhuma mudança de contorno entre {sideA.label} e {sideB.label} — a geometria é exatamente a mesma.</p>
                          ) : Math.abs(comparison.deltaHa) < 0.01 ? (
                            <p>
                              O contorno mudou de forma entre {sideA.label} e {sideB.label}, mas a área ficou praticamente igual ({formatHa(comparison.areaBHa)}).
                            </p>
                          ) : (
                            <p>
                              De <strong className="text-ink-100">{sideA.label}</strong> ({sideA.dateLabel}) para <strong className="text-ink-100">{sideB.label}</strong> ({sideB.dateLabel}), a área passou de {formatHa(comparison.areaAHa)} para {formatHa(comparison.areaBHa)} — {" "}
                              <strong className={comparison.deltaHa > 0 ? "text-teal-500" : "text-coral-500"}>
                                {comparison.deltaHa > 0 ? "cresceu" : "reduziu"} {formatHa(Math.abs(comparison.deltaHa))}
                                {comparison.deltaPct !== null && ` (${comparison.deltaHa > 0 ? "+" : "−"}${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.abs(comparison.deltaPct))}%)`}
                              </strong>.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                  {nameError && <p className="text-xs text-coral-500">{nameError}</p>}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="default">v{v.version}</Badge>
                        <span className="text-ink-500">{formatDateTime(v.createdAt)}</span>
                        {boundaryStopKeys.has(v.id) && (
                          <Badge variant="teal"><i className="ti ti-polygon" aria-hidden="true" /> contorno</Badge>
                        )}
                      </div>
                      {v.changeNote && <p className="text-ink-300 mt-1">{v.changeNote}</p>}
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
