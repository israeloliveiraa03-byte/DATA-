"use client";

import { useState, useRef } from "react";

import Link from "next/link";
import type { Research, Entity, ResearchEntity } from "@/lib/types";

const ENTITY_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  territorio: { label: "Território",  icon: "ti-map" },
  comunidade: { label: "Comunidade",  icon: "ti-users" },
  escola:     { label: "Escola",      icon: "ti-school" },
  associacao: { label: "Associação",  icon: "ti-building-community" },
  projeto:    { label: "Projeto",     icon: "ti-clipboard-list" },
  documento:  { label: "Documento",   icon: "ti-file-text" },
};

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  draft:     { label: "Rascunho",  bg: "#fbf3e7", color: "#7a5218", dot: "#c48a42" },
  active:    { label: "Ativa",     bg: "#eaf0e4", color: "#3a5430", dot: "#4c6b3c" },
  paused:    { label: "Pausada",   bg: "#faeeda", color: "#854f0b", dot: "#ba7517" },
  closed:    { label: "Encerrada", bg: "#fdf0ef", color: "#8b2a1a", dot: "#c0392b" },
  published: { label: "Publicada", bg: "#e8f0fe", color: "#1041b2", dot: "#1a56db" },
};

const THEME_MAP: Record<string, string> = {
  health: "Saúde", education: "Educação", environment: "Meio ambiente",
  culture: "Cultura", economy: "Economia", governance: "Governança",
  territory: "Território", other: "Outro",
};

interface ResearchPageClientProps {
  research: Research;
  linkedEntities: (ResearchEntity & { entity: Entity })[];
  availableEntities: Entity[];
}

export function ResearchPageClient({ research, linkedEntities, availableEntities }: ResearchPageClientProps) {
  // // const router = useRouter();
  const [status,      setStatus]      = useState(research.status);
  const [copied,      setCopied]      = useState(false);
  const [showQR,      setShowQR]      = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [coverImage,  setCoverImage]  = useState(research.coverImage);
  const [coverSaving, setCoverSaving] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const [accessMode,  setAccessMode]  = useState<"public" | "restricted">("public");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites,     setInvites]     = useState<string[]>([]);

  const [links,            setLinks]            = useState(linkedEntities);
  const [remainingEntities, setRemainingEntities] = useState(availableEntities);
  const [selectedEntityId, setSelectedEntityId]   = useState("");
  const [relationNote,     setRelationNote]       = useState("");
  const [linking,          setLinking]            = useState(false);
  const [linkError,        setLinkError]          = useState("");

  async function linkEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntityId) return;
    setLinking(true);
    setLinkError("");
    try {
      const res = await fetch(`/api/researches/${research.id}/entities`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: selectedEntityId, relationNote: relationNote || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setLinkError(json.error ?? "Erro ao vincular"); return; }
      const entity = remainingEntities.find(e => e.id === selectedEntityId)!;
      setLinks(prev => [...prev, { ...json.data, entity }]);
      setRemainingEntities(prev => prev.filter(e => e.id !== selectedEntityId));
      setSelectedEntityId("");
      setRelationNote("");
    } catch {
      setLinkError("Erro de conexão. Tente novamente.");
    } finally {
      setLinking(false);
    }
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://datazero.vercel.app"}/p/${research.slug}`;
  const s = STATUS_MAP[status] ?? STATUS_MAP.draft;
  const BRD = "1px solid #e8d8be";
  const TS  = { color: "#c48a42", fontSize: "9px" } as const;

  async function toggleStatus(newStatus: string) {
    setSaving(true);
    try {
      await fetch(`/api/researches/${research.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus as Research["status"]);
    } finally { setSaving(false); }
  }

  async function saveCover(value: string | null) {
    setCoverSaving(true);
    try {
      await fetch(`/api/researches/${research.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: value }),
      });
      setCoverImage(value);
    } finally { setCoverSaving(false); }
  }

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { if (ev.target?.result) saveCover(ev.target.result as string); };
    r.readAsDataURL(file);
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function addInvite() {
    if (!inviteEmail || invites.includes(inviteEmail)) return;
    setInvites(prev => [...prev, inviteEmail]);
    setInviteEmail("");
  }

  return (
    <div className="flex-1 overflow-auto" style={{ background: "#fff" }}>
      {/* Capa da pesquisa */}
      <div className="relative h-36 max-w-4xl mx-auto mt-6 rounded-xl overflow-hidden" style={{ border: BRD, background: "#fbf3e7" }}>
        {coverImage ? (
          <img src={coverImage} alt="Capa da pesquisa" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="ti ti-photo text-3xl" style={{ color: "#d9bb8c" }} />
          </div>
        )}
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {coverImage && (
            <button onClick={() => saveCover(null)} disabled={coverSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.92)", border: BRD, color: "#c0392b", backdropFilter: "blur(8px)" }}>
              <i className="ti ti-x text-xs" /> Remover
            </button>
          )}
          <button onClick={() => coverRef.current?.click()} disabled={coverSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.92)", border: BRD, color: "#5c3f13", backdropFilter: "blur(8px)" }}>
            <i className="ti ti-camera text-xs" /> {coverImage ? "Trocar capa" : "Adicionar capa"}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs mb-5" style={{ color: "#a06d28" }}>
          <Link href="/dashboard" className="hover:underline" style={{ color: "#c48a42" }}>Dashboard</Link>
          <i className="ti ti-chevron-right text-xs" />
          <Link href="/researches" className="hover:underline" style={{ color: "#c48a42" }}>Pesquisas</Link>
          <i className="ti ti-chevron-right text-xs" />
          <span style={{ color: "#5c3f13" }}>{research.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: s.bg, color: s.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                {s.label}
              </span>
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: "#fbf3e7", border: BRD, color: "#5c3f13" }}>
                {THEME_MAP[research.theme] ?? "Outro"}
              </span>
              {research.cityName && (
                <span className="text-xs flex items-center gap-1" style={{ color: "#a06d28" }}>
                  <i className="ti ti-map-pin text-xs" style={{ color: "#c48a42" }} />
                  {research.cityName}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0f172a", fontFamily: "var(--font-serif), Georgia, serif", letterSpacing: "-0.4px" }}>
              {research.title}
            </h1>
            {research.description && (
              <p className="text-sm mt-1 font-medium" style={{ color: "#5c3f13" }}>{research.description}</p>
            )}
          </div>

          {/* Ações principais */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/researches/${research.id}/form-builder`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors"
              style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
              <i className="ti ti-forms" /> Formulário
            </Link>
            <Link href={`/researches/${research.id}/responses`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors"
              style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
              <i className="ti ti-table" /> Respostas
            </Link>
            <Link href={`/researches/${research.id}/dashboard-builder`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors"
              style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
              <i className="ti ti-chart-bar" /> Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Coluna principal */}
          <div className="md:col-span-2 flex flex-col gap-4">

            {/* Publicação */}
            <div className="rounded-xl p-5" style={{ border: BRD, background: "#fff" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "#fbf3e7" }}>
                  <i className="ti ti-world text-sm" style={{ color: "#c48a42" }} />
                </div>
                <h2 className="text-sm font-bold" style={{ color: "#0f172a" }}>Publicação</h2>
              </div>

              {/* Toggle coleta */}
              <div className="flex items-center justify-between p-3 rounded-lg mb-4"
                style={{ background: "#fbf3e7", border: BRD }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: "#0f172a" }}>
                    {status === "active" ? "Coleta ativa" : status === "published" ? "Publicada" : "Coleta pausada"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#a06d28" }}>
                    {status === "active" ? "Respondentes podem acessar o formulário" : "O formulário não está aceitando respostas"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {status !== "active" && status !== "published" ? (
                    <button onClick={() => toggleStatus("active")} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                      style={{ background: "#4c6b3c", color: "#fff" }}>
                      <i className="ti ti-player-play" /> Ativar coleta
                    </button>
                  ) : (
                    <button onClick={() => toggleStatus("paused")} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                      style={{ background: "#faeeda", color: "#854f0b", border: "1px solid #d2a05c" }}>
                      <i className="ti ti-player-pause" /> Pausar coleta
                    </button>
                  )}
                  {status !== "published" && (
                    <button onClick={() => toggleStatus("published")} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                      style={{ background: "#c48a42", color: "#fff" }}>
                      <i className="ti ti-world-upload" /> Publicar
                    </button>
                  )}
                </div>
              </div>

              {/* Modo de acesso */}
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Modo de acesso</p>
                <div className="flex gap-2">
                  {[
                    { key: "public",     icon: "ti-world",    label: "Link público" },
                    { key: "restricted", icon: "ti-lock",     label: "Acesso restrito" },
                  ].map(mode => (
                    <button key={mode.key} onClick={() => setAccessMode(mode.key as "public" | "restricted")}
                      className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all"
                      style={{
                        border: accessMode === mode.key ? "1.5px solid #c48a42" : BRD,
                        background: accessMode === mode.key ? "#fbf3e7" : "#fbf3e7",
                        color: accessMode === mode.key ? "#7a5218" : "#5c3f13",
                      }}>
                      <i className={`ti ${mode.icon}`} /> {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Link público */}
              {accessMode === "public" && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Link do formulário</p>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 rounded-md text-xs font-medium overflow-hidden"
                      style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
                      <span className="truncate block">{publicUrl}</span>
                    </div>
                    <button onClick={copyLink}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-colors"
                      style={{ background: copied ? "#4c6b3c" : "#c48a42", color: "#fff" }}>
                      <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} />
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setShowQR(!showQR)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
                      style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
                      <i className="ti ti-qrcode" /> {showQR ? "Ocultar" : "Ver"} QR Code
                    </button>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
                      style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
                      <i className="ti ti-external-link" /> Abrir link
                    </a>
                  </div>

                  {/* QR Code placeholder */}
                  {showQR && (
                    <div className="mt-3 p-4 rounded-lg flex flex-col items-center gap-2"
                      style={{ border: BRD, background: "#fbf3e7" }}>
                      <div className="w-32 h-32 rounded-lg flex items-center justify-center"
                        style={{ background: "#fff", border: BRD }}>
                        <i className="ti ti-qrcode text-5xl" style={{ color: "#c48a42" }} />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: "#5c3f13" }}>QR Code do formulário</p>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold"
                        style={{ background: "#c48a42", color: "#fff" }}>
                        <i className="ti ti-download" /> Baixar QR Code
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Acesso restrito */}
              {accessMode === "restricted" && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Pesquisadores autorizados</p>
                  <div className="flex gap-2 mb-2">
                    <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addInvite()}
                      placeholder="email@instituicao.br"
                      className="flex-1 px-3 py-2 rounded-md text-xs border focus:outline-none"
                      style={{ border: BRD, background: "#fff", color: "#3d2a0d" }} />
                    <button onClick={addInvite}
                      className="px-3 py-2 rounded-md text-xs font-bold"
                      style={{ background: "#c48a42", color: "#fff" }}>
                      <i className="ti ti-plus" /> Convidar
                    </button>
                  </div>
                  {invites.length === 0 ? (
                    <p className="text-xs py-3 text-center" style={{ color: "#a06d28" }}>Nenhum pesquisador convidado ainda</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {invites.map(email => (
                        <div key={email} className="flex items-center justify-between px-3 py-2 rounded-md text-xs"
                          style={{ border: BRD, background: "#fbf3e7" }}>
                          <div className="flex items-center gap-2">
                            <i className="ti ti-user-circle" style={{ color: "#c48a42" }} />
                            <span style={{ color: "#5c3f13" }}>{email}</span>
                          </div>
                          <button onClick={() => setInvites(prev => prev.filter(e => e !== email))}
                            className="text-gray-300 hover:text-red-400">
                            <i className="ti ti-x text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Testar formulário */}
            <div className="rounded-xl p-5" style={{ border: BRD, background: "#fff" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "#eaf0e4" }}>
                  <i className="ti ti-test-pipe text-sm" style={{ color: "#4c6b3c" }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold" style={{ color: "#0f172a" }}>Testar formulário</h2>
                  <p className="text-xs" style={{ color: "#a06d28" }}>As respostas de teste não são salvas</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/p/${research.slug}?preview=true`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold"
                  style={{ background: "#4c6b3c", color: "#fff" }}>
                  <i className="ti ti-eye" /> Abrir prévia do formulário
                </Link>
                <Link href={`/researches/${research.id}/form-builder`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold"
                  style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13" }}>
                  <i className="ti ti-edit" /> Editar formulário
                </Link>
              </div>
            </div>

          </div>

          {/* Coluna lateral */}
          <div className="flex flex-col gap-4">

            {/* Métricas */}
            <div className="rounded-xl p-4" style={{ border: BRD, background: "#fbf3e7" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={TS}>Métricas</p>
              {[
                { icon: "ti-clipboard-list", label: "Respostas",   val: "0" },
                { icon: "ti-clock",          label: "Tempo médio", val: "—" },
                { icon: "ti-chart-pie",      label: "Conclusão",   val: "—" },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between py-2"
                  style={{ borderBottom: BRD }}>
                  <div className="flex items-center gap-2">
                    <i className={`ti ${m.icon} text-sm`} style={{ color: "#c48a42" }} />
                    <span className="text-xs font-medium" style={{ color: "#5c3f13" }}>{m.label}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#0f172a" }}>{m.val}</span>
                </div>
              ))}
            </div>

            {/* Entidades vinculadas */}
            <div className="rounded-xl p-4" style={{ border: BRD, background: "#fff" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={TS}>Entidades vinculadas</p>

              {links.length === 0 ? (
                <p className="text-xs mb-3" style={{ color: "#a06d28" }}>Nenhuma entidade vinculada ainda.</p>
              ) : (
                <div className="flex flex-col gap-2 mb-3">
                  {links.map(l => {
                    const t = ENTITY_TYPE_MAP[l.entity.type] ?? { label: l.entity.type, icon: "ti-tag" };
                    return (
                      <Link key={l.id} href={`/entidades/${l.entity.id}`}
                        className="flex items-center justify-between px-3 py-2 rounded-md transition-colors"
                        style={{ border: BRD, background: "#fbf3e7" }}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <i className={`ti ${t.icon} text-xs`} style={{ color: "#c48a42" }} />
                            <span className="text-xs font-bold truncate" style={{ color: "#0f172a" }}>{l.entity.name}</span>
                          </div>
                          <p className="text-2xs font-mono mt-0.5" style={{ color: "#a06d28" }}>{l.entity.code}</p>
                        </div>
                        <i className="ti ti-arrow-right text-xs flex-shrink-0" style={{ color: "#c48a42" }} />
                      </Link>
                    );
                  })}
                </div>
              )}

              {remainingEntities.length > 0 && (
                <form onSubmit={linkEntity} className="flex flex-col gap-2 pt-3" style={{ borderTop: BRD }}>
                  <select
                    value={selectedEntityId}
                    onChange={e => setSelectedEntityId(e.target.value)}
                    className="w-full rounded-md text-xs px-2 py-1.5 focus:outline-none"
                    style={{ border: BRD, background: "#fff", color: "#3d2a0d" }}
                  >
                    <option value="">Vincular entidade existente...</option>
                    {remainingEntities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <input
                    value={relationNote}
                    onChange={e => setRelationNote(e.target.value)}
                    placeholder="Nota sobre o vínculo (opcional)"
                    className="w-full rounded-md text-xs px-2 py-1.5 focus:outline-none"
                    style={{ border: BRD, background: "#fff", color: "#3d2a0d" }}
                  />
                  {linkError && <p className="text-2xs" style={{ color: "#c0392b" }}>{linkError}</p>}
                  <button type="submit" disabled={!selectedEntityId || linking}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                    style={{ background: "#c48a42", color: "#fff" }}>
                    <i className={`ti ${linking ? "ti-loader-2 animate-spin" : "ti-link"}`} /> Vincular
                  </button>
                </form>
              )}

              <Link href="/entidades"
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "#c48a42" }}>
                <i className="ti ti-database" /> Ver catálogo de entidades
              </Link>
            </div>

            {/* Configurações rápidas */}
            <div className="rounded-xl p-4" style={{ border: BRD, background: "#fff" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={TS}>Configurações</p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: "ti-user-off",     label: "Anônimo",      active: research.allowAnonymous },
                  { icon: "ti-wifi-off",     label: "Offline",      active: research.offlineEnabled },
                  { icon: "ti-map-pin",      label: "Coleta GPS",   active: research.collectGps },
                  { icon: "ti-world",        label: "Dashboard público", active: research.publicDashboard },
                ].map(cfg => (
                  <div key={cfg.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className={`ti ${cfg.icon} text-sm`} style={{ color: "#c48a42" }} />
                      <span className="text-xs font-medium" style={{ color: "#5c3f13" }}>{cfg.label}</span>
                    </div>
                    <div className="w-7 h-3.5 rounded-full relative" style={{ background: cfg.active ? "#c48a42" : "#e8d8be" }}>
                      <span className={`absolute w-2.5 h-2.5 bg-white rounded-full top-0.5 transition-all ${cfg.active ? "left-3.5" : "left-0.5"}`} />
                    </div>
                  </div>
                ))}
              </div>
              <Link href={`/researches/${research.id}/settings`}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "#c48a42" }}>
                <i className="ti ti-settings" /> Editar configurações
              </Link>
            </div>

            {/* Ações perigosas */}
            <div className="rounded-xl p-4" style={{ border: "1px solid #f0d0cc", background: "#fdf8f7" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#c0392b", fontSize: "9px" }}>Zona de risco</p>
              <button onClick={() => toggleStatus("closed")} disabled={saving}
                className="w-full flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold mb-2 disabled:opacity-50"
                style={{ border: "1px solid #f0d0cc", background: "#fff", color: "#c0392b" }}>
                <i className="ti ti-lock" /> Encerrar pesquisa
              </button>
              <button className="w-full flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold"
                style={{ border: "1px solid #f0d0cc", background: "#fff", color: "#c0392b" }}>
                <i className="ti ti-trash" /> Excluir pesquisa
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
