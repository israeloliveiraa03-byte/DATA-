"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Research, Entity } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  fieldwork: "Trabalho de campo", data_gap: "Preencher lacuna de dado",
  expertise: "Expertise específica", funding: "Financiamento",
};
const KIND_ICON: Record<string, string> = {
  fieldwork: "ti-map-pin", data_gap: "ti-database", expertise: "ti-bulb", funding: "ti-hand-heart",
};
const STATUS_VARIANT: Record<string, "teal" | "amber" | "default"> = {
  open: "teal", fulfilled: "amber", closed: "default",
};
const STATUS_LABEL: Record<string, string> = { open: "Aberta", fulfilled: "Preenchida", closed: "Encerrada" };
const APP_STATUS_VARIANT: Record<string, "amber" | "teal" | "default"> = {
  pending: "amber", accepted: "teal", declined: "default",
};
const APP_STATUS_LABEL: Record<string, string> = { pending: "Pendente", accepted: "Aceita", declined: "Recusada" };

type Applicant = { id: string; name: string };
type Application = { id: string; applicantId: string; status: "pending" | "accepted" | "declined"; message: string | null; applicant: Applicant };
type Call = {
  id: string; title: string; description: string; kind: string; status: "open" | "fulfilled" | "closed";
  createdBy: string; createdByUser: { id: string; name: string };
  research: { id: string; title: string } | null;
  entity: { id: string; name: string; code: string } | null;
  applications: Application[];
};

interface Props {
  calls: Call[];
  currentUserId: string;
  myResearches: Research[];
  myEntities: Entity[];
}

export function ColaboracaoClient({ calls: initialCalls, currentUserId, myResearches, myEntities }: Props) {
  const [calls, setCalls] = useState(initialCalls);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("fieldwork");
  const [researchId, setResearchId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function createCall(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/collaboration-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, kind,
          researchId: researchId || undefined,
          entityId: entityId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.error ?? "Erro ao criar chamada"); return; }
      const research = myResearches.find(r => r.id === researchId) ?? null;
      const entity = myEntities.find(e => e.id === entityId) ?? null;
      setCalls(prev => [{
        ...json.data,
        createdByUser: { id: currentUserId, name: "Você" },
        research: research ? { id: research.id, title: research.title } : null,
        entity: entity ? { id: entity.id, name: entity.name, code: entity.code } : null,
        applications: [],
      }, ...prev]);
      setTitle(""); setDescription(""); setResearchId(""); setEntityId(""); setShowNew(false);
      toast.success("Chamada publicada.");
    } catch {
      setCreateError("Erro de conexão. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  async function applyToCall(callId: string) {
    const res = await fetch(`/api/collaboration-calls/${callId}/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Erro ao se candidatar"); return; }
    setCalls(prev => prev.map(c => c.id === callId
      ? { ...c, applications: [...c.applications, { ...json.data, applicant: { id: currentUserId, name: "Você" } }] }
      : c));
    toast.success("Candidatura enviada.");
  }

  async function reviewApplication(callId: string, appId: string, status: "accepted" | "declined") {
    const res = await fetch(`/api/collaboration-calls/${callId}/applications/${appId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error("Erro ao atualizar candidatura."); return; }
    setCalls(prev => prev.map(c => c.id === callId
      ? { ...c, applications: c.applications.map(a => a.id === appId ? { ...a, status } : a) }
      : c));
    toast.success(status === "accepted" ? "Candidatura aceita." : "Candidatura recusada.");
  }

  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-1">Rede</p>
            <h1 className="text-2xl font-bold font-condensed text-ink-100">Chamadas de colaboração</h1>
            <p className="text-sm text-ink-300 mt-0.5">
              Peça ajuda de campo, dado ou expertise — sem taxa, é ponte entre pessoas e território.
            </p>
          </div>
          <Button onClick={() => setShowNew(v => !v)}>
            <i className="ti ti-plus" aria-hidden="true" /> Nova chamada
          </Button>
        </div>

        {showNew && (
          <Card className="p-4 mb-6">
            <form onSubmit={createCall} className="flex flex-col gap-3">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da chamada" required minLength={3} />
              <textarea
                value={description} onChange={e => setDescription(e.target.value)} rows={4} required
                placeholder="O que você precisa e por quê..."
                className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={kind} onChange={e => setKind(e.target.value)} className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100">
                  {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <select value={researchId} onChange={e => setResearchId(e.target.value)} className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100">
                  <option value="">Sem pesquisa vinculada</option>
                  {myResearches.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
                <select value={entityId} onChange={e => setEntityId(e.target.value)} className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100">
                  <option value="">Sem entidade vinculada</option>
                  {myEntities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                </select>
              </div>
              {createError && <p className="text-xs text-coral-500">{createError}</p>}
              <div>
                <Button type="submit" loading={creating} disabled={!title || !description}>Publicar chamada</Button>
              </div>
            </form>
          </Card>
        )}

        {calls.length === 0 ? (
          <div className="text-center py-20 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
            <i className="ti ti-hand-heart text-4xl block mb-3 text-ink-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink-100 mb-1">Nenhuma chamada ainda</p>
            <p className="text-xs text-ink-300">Publique a primeira chamada de colaboração da rede.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {calls.map(call => {
              const isOwn = call.createdBy === currentUserId;
              const myApplication = call.applications.find(a => a.applicantId === currentUserId);
              return (
                <Card key={call.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="blue"><i className={`ti ${KIND_ICON[call.kind]}`} aria-hidden="true" /> {KIND_LABEL[call.kind]}</Badge>
                        <Badge variant={STATUS_VARIANT[call.status]}>{STATUS_LABEL[call.status]}</Badge>
                      </div>
                      <CardTitle>{call.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-ink-300 mb-3 whitespace-pre-wrap">{call.description}</p>

                    <div className="flex items-center gap-3 flex-wrap mb-3 text-xs text-ink-300">
                      <span><i className="ti ti-user text-brand-400" aria-hidden="true" /> {call.createdByUser.name}</span>
                      {call.research && (
                        <Link href={`/researches/${call.research.id}`} className="text-brand-400 hover:underline flex items-center gap-1">
                          <i className="ti ti-clipboard-list" aria-hidden="true" /> {call.research.title}
                        </Link>
                      )}
                      {call.entity && (
                        <Link href={`/entidades/${call.entity.id}`} className="text-brand-400 hover:underline flex items-center gap-1">
                          <i className="ti ti-database" aria-hidden="true" /> {call.entity.name}
                        </Link>
                      )}
                    </div>

                    {!isOwn && call.status === "open" && (
                      myApplication
                        ? <Badge variant={APP_STATUS_VARIANT[myApplication.status]}>Sua candidatura: {APP_STATUS_LABEL[myApplication.status]}</Badge>
                        : <Button size="sm" onClick={() => applyToCall(call.id)}>Quero colaborar</Button>
                    )}

                    {isOwn && call.applications.length > 0 && (
                      <div className="mt-2 pt-3 border-t border-ink-700">
                        <p className="text-xs font-semibold text-ink-100 mb-2">Candidaturas ({call.applications.length})</p>
                        <ul className="flex flex-col gap-2">
                          {call.applications.map(app => (
                            <li key={app.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-ink-700">
                              <div>
                                <p className="text-xs font-semibold text-ink-100">{app.applicant.name}</p>
                                {app.message && <p className="text-2xs text-ink-300 mt-0.5">{app.message}</p>}
                              </div>
                              {app.status === "pending" ? (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <Button size="sm" variant="secondary" onClick={() => reviewApplication(call.id, app.id, "declined")}>Recusar</Button>
                                  <Button size="sm" onClick={() => reviewApplication(call.id, app.id, "accepted")}>Aceitar</Button>
                                </div>
                              ) : (
                                <Badge variant={APP_STATUS_VARIANT[app.status]}>{APP_STATUS_LABEL[app.status]}</Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
