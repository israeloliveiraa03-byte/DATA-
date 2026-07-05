"use client";

import { useState, useRef, useEffect } from "react";

import Link from "next/link";
import QRCode from "qrcode";
import { toast } from "sonner";
import type { Research, Entity, ResearchEntity } from "@/lib/types";
import type { ReliabilityStatus } from "@/lib/dashboard/reliability";
import { SIGLA_TO_CODAREA } from "@/lib/geo/uf";

const ENTITY_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  territorio: { label: "Território",  icon: "ti-map" },
  comunidade: { label: "Comunidade",  icon: "ti-users" },
  escola:     { label: "Escola",      icon: "ti-school" },
  associacao: { label: "Associação",  icon: "ti-building-community" },
  projeto:    { label: "Projeto",     icon: "ti-clipboard-list" },
  documento:  { label: "Documento",   icon: "ti-file-text" },
};

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: "Rascunho",  bg: "bg-ink-800",    text: "text-ink-300",   dot: "bg-ink-300" },
  active:    { label: "Ativa",     bg: "bg-brand-50",   text: "text-brand-700", dot: "bg-brand-500" },
  paused:    { label: "Pausada",   bg: "bg-amber-50",   text: "text-amber-500", dot: "bg-amber-500" },
  closed:    { label: "Encerrada", bg: "bg-coral-50",   text: "text-coral-500", dot: "bg-coral-500" },
  published: { label: "Publicada", bg: "bg-chart-1/15", text: "text-chart-1",   dot: "bg-chart-1" },
};

const THEME_MAP: Record<string, string> = {
  health: "Saúde", education: "Educação", environment: "Meio ambiente",
  culture: "Cultura", economy: "Economia", governance: "Governança",
  territory: "Território", other: "Outro",
};

const FIELD_CLASS = "rounded-md border border-ink-700 bg-ink-950 text-ink-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500";
const PILL_BTN = "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold border border-ink-700 bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-ink-100 transition-colors duration-150";

interface ResearchPageClientProps {
  research: Research;
  linkedEntities: (ResearchEntity & { entity: Entity })[];
  availableEntities: Entity[];
}

export function ResearchPageClient({ research, linkedEntities, availableEntities }: ResearchPageClientProps) {
  const [status,      setStatus]      = useState(research.status);
  const [copied,      setCopied]      = useState(false);
  const [showQR,      setShowQR]      = useState(false);
  const [qrDataUrl,   setQrDataUrl]   = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [coverImage,  setCoverImage]  = useState(research.coverImage);
  const [coverSaving, setCoverSaving] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const [accessMode,  setAccessMode]  = useState<"public" | "restricted">("public");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites,     setInvites]     = useState<string[]>([]);

  const [reliability,        setReliability]        = useState<ReliabilityStatus | null>(null);
  const [geoFields,          setGeoFields]           = useState<{ id: string; type: string; label: string }[]>([]);
  const [showReliabilityHelp, setShowReliabilityHelp] = useState(false);
  const [universeInput,      setUniverseInput]       = useState(research.universeSize?.toString() ?? "");
  const [confidenceLevel,    setConfidenceLevelInput] = useState(research.confidenceLevel);
  const [marginErrorInput,   setMarginErrorInput]     = useState(research.marginError);
  const [stratumFieldId,     setStratumFieldId]       = useState(research.reliabilityStratumFieldId ?? "");
  const [stratumUniverses,   setStratumUniverses]     = useState<Record<string, string>>(
    (research.universeByStratum as Record<string, number> | null) ?
      Object.fromEntries(Object.entries(research.universeByStratum as Record<string, number>).map(([k, v]) => [k, String(v)])) : {}
  );
  const [addStratumKey,      setAddStratumKey]        = useState("");
  const [reliabilitySaving,  setReliabilitySaving]    = useState(false);

  async function loadReliability() {
    const res = await fetch(`/api/researches/${research.id}/reliability`);
    if (res.ok) setReliability((await res.json()).data);
  }

  useEffect(() => {
    loadReliability();
    (async () => {
      const res = await fetch(`/api/researches/${research.id}/form`);
      if (!res.ok) return;
      const form = (await res.json()).data;
      const fields = (form?.fields ?? []) as { id: string; type: string; label: string }[];
      setGeoFields(fields.filter(f => f.type === "geo_state" || f.type === "geo_region"));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveReliabilityConfig() {
    setReliabilitySaving(true);
    try {
      await fetch(`/api/researches/${research.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universeSize: universeInput ? Number(universeInput) : null,
          confidenceLevel,
          marginError: marginErrorInput,
          reliabilityStratumFieldId: stratumFieldId || null,
          universeByStratum: Object.keys(stratumUniverses).length > 0
            ? Object.fromEntries(Object.entries(stratumUniverses).filter(([, v]) => v).map(([k, v]) => [k, Number(v)]))
            : null,
        }),
      });
      await loadReliability();
      toast.success("Configuração de confiabilidade salva.");
    } catch {
      toast.error("Erro de conexão ao salvar.");
    } finally {
      setReliabilitySaving(false);
    }
  }

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
      toast.success("Entidade vinculada.");
    } catch {
      setLinkError("Erro de conexão. Tente novamente.");
    } finally {
      setLinking(false);
    }
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://datazero.vercel.app"}/p/${research.slug}`;

  // Gera o QR só quando o pesquisador pede pra ver — evita trabalho à toa
  // toda vez que a página carrega.
  useEffect(() => {
    if (!showQR || qrDataUrl) return;
    QRCode.toDataURL(publicUrl, { width: 256, margin: 1, color: { dark: "#14140f", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQR]);

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode-${research.slug}.png`;
    a.click();
  }

  const s = STATUS_MAP[status] ?? STATUS_MAP.draft;

  async function toggleStatus(newStatus: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/researches/${research.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { toast.error("Erro ao atualizar status."); return; }
      setStatus(newStatus as Research["status"]);
      toast.success("Status atualizado.");
    } catch {
      toast.error("Erro de conexão.");
    } finally { setSaving(false); }
  }

  async function saveCover(value: string | null) {
    setCoverSaving(true);
    try {
      const res = await fetch(`/api/researches/${research.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: value }),
      });
      if (!res.ok) { toast.error("Erro ao salvar capa."); return; }
      setCoverImage(value);
    } catch {
      toast.error("Erro de conexão.");
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
    toast.success("Link copiado.");
    setTimeout(() => setCopied(false), 2000);
  }

  function addInvite() {
    if (!inviteEmail || invites.includes(inviteEmail)) return;
    setInvites(prev => [...prev, inviteEmail]);
    setInviteEmail("");
  }

  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      {/* Capa da pesquisa */}
      <div className="relative h-36 max-w-4xl mx-auto mt-6 rounded-lg overflow-hidden border border-ink-700 bg-ink-900">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- upload em base64 client-side, não é otimizável por next/image
          <img src={coverImage} alt="Capa da pesquisa" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="ti ti-photo text-3xl text-ink-500" aria-hidden="true" />
          </div>
        )}
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} aria-label="Escolher imagem de capa" />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {coverImage && (
            <button onClick={() => saveCover(null)} disabled={coverSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-ink-950/90 border border-ink-700 text-coral-500 backdrop-blur-sm disabled:opacity-50">
              <i className="ti ti-x text-xs" aria-hidden="true" /> Remover
            </button>
          )}
          <button onClick={() => coverRef.current?.click()} disabled={coverSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-ink-950/90 border border-ink-700 text-ink-100 backdrop-blur-sm disabled:opacity-50">
            <i className={coverSaving ? "ti ti-loader-2 animate-spin" : "ti ti-camera text-xs"} aria-hidden="true" /> {coverImage ? "Trocar capa" : "Adicionar capa"}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <nav aria-label="Você está em" className="flex items-center gap-2 text-xs mb-5 text-ink-300 flex-wrap">
          <Link href="/dashboard" className="hover:underline text-brand-400">Dashboard</Link>
          <i className="ti ti-chevron-right text-xs" aria-hidden="true" />
          <Link href="/researches" className="hover:underline text-brand-400">Pesquisas</Link>
          <i className="ti ti-chevron-right text-xs" aria-hidden="true" />
          <span className="text-ink-100 truncate max-w-[50%]">{research.title}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-ink-900 border border-ink-700 text-ink-100">
                {THEME_MAP[research.theme] ?? "Outro"}
              </span>
              {research.cityName && (
                <span className="text-xs flex items-center gap-1 text-ink-300">
                  <i className="ti ti-map-pin text-xs text-brand-400" aria-hidden="true" />
                  {research.cityName}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold font-condensed text-ink-100" style={{ letterSpacing: "-0.3px" }}>
              {research.title}
            </h1>
            {research.description && (
              <p className="text-sm mt-1 font-medium text-ink-300">{research.description}</p>
            )}
          </div>

          {/* Ações principais */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Link href={`/researches/${research.id}/form-builder`} className={PILL_BTN}>
              <i className="ti ti-forms" aria-hidden="true" /> Formulário
            </Link>
            <Link href={`/researches/${research.id}/responses`} className={PILL_BTN}>
              <i className="ti ti-table" aria-hidden="true" /> Respostas
            </Link>
            <Link href={`/researches/${research.id}/dashboard-builder`} className={PILL_BTN}>
              <i className="ti ti-chart-bar" aria-hidden="true" /> Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Coluna principal */}
          <div className="md:col-span-2 flex flex-col gap-4">

            {/* Publicação */}
            <div className="rounded-lg p-5 border border-ink-700 bg-ink-900">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-ink-800">
                  <i className="ti ti-world text-sm text-brand-400" aria-hidden="true" />
                </div>
                <h2 className="text-sm font-bold text-ink-100">Publicação</h2>
              </div>

              {/* Toggle coleta */}
              <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-lg mb-4 bg-ink-800 border border-ink-700">
                <div>
                  <p className="text-xs font-bold text-ink-100">
                    {status === "active" ? "Coleta ativa" : status === "published" ? "Publicada" : "Coleta pausada"}
                  </p>
                  <p className="text-xs mt-0.5 text-ink-300">
                    {status === "active" ? "Respondentes podem acessar o formulário" : "O formulário não está aceitando respostas"}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {status !== "active" && status !== "published" ? (
                    <button onClick={() => toggleStatus("active")} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-teal-500 text-on-accent disabled:opacity-50 transition-colors duration-150">
                      <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-player-play"} aria-hidden="true" /> Ativar coleta
                    </button>
                  ) : (
                    <button onClick={() => toggleStatus("paused")} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-amber-50 text-amber-500 border border-amber-500/30 disabled:opacity-50 transition-colors duration-150">
                      <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-player-pause"} aria-hidden="true" /> Pausar coleta
                    </button>
                  )}
                  {status !== "published" && (
                    <button onClick={() => toggleStatus("published")} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-500 text-on-accent disabled:opacity-50 transition-colors duration-150">
                      <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-world-upload"} aria-hidden="true" /> Publicar
                    </button>
                  )}
                </div>
              </div>

              {/* Modo de acesso */}
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest font-condensed mb-2 text-brand-400">Modo de acesso</p>
                <div className="flex gap-2">
                  {[
                    { key: "public",     icon: "ti-world",    label: "Link público" },
                    { key: "restricted", icon: "ti-lock",     label: "Acesso restrito" },
                  ].map(mode => (
                    <button key={mode.key} onClick={() => setAccessMode(mode.key as "public" | "restricted")}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors duration-150 border ${
                        accessMode === mode.key ? "border-brand-500 bg-ink-800 text-brand-400" : "border-ink-700 bg-ink-800 text-ink-300"
                      }`}>
                      <i className={`ti ${mode.icon}`} aria-hidden="true" /> {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Link público */}
              {accessMode === "public" && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest font-condensed mb-2 text-brand-400">Link do formulário</p>
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex-1 min-w-0 px-3 py-2 rounded-md text-xs font-medium overflow-hidden border border-ink-700 bg-ink-800 text-ink-100">
                      <span className="truncate block">{publicUrl}</span>
                    </div>
                    <button onClick={copyLink}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-colors duration-150 text-on-accent ${copied ? "bg-teal-500" : "bg-brand-500"}`}>
                      <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} aria-hidden="true" />
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>

                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button onClick={() => setShowQR(!showQR)} className={PILL_BTN}>
                      <i className="ti ti-qrcode" aria-hidden="true" /> {showQR ? "Ocultar" : "Ver"} QR Code
                    </button>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={PILL_BTN}>
                      <i className="ti ti-external-link" aria-hidden="true" /> Abrir link
                    </a>
                  </div>

                  {showQR && (
                    <div className="mt-3 p-4 rounded-lg flex flex-col items-center gap-2 border border-ink-700 bg-ink-800">
                      <div className="w-32 h-32 rounded-lg flex items-center justify-center overflow-hidden bg-white border border-ink-700">
                        {qrDataUrl
                          ? // eslint-disable-next-line @next/next/no-img-element -- imagem gerada em base64 no cliente
                            <img src={qrDataUrl} alt="QR Code do formulário" className="w-full h-full" />
                          : <i className="ti ti-loader-2 animate-spin text-2xl text-brand-400" aria-hidden="true" />}
                      </div>
                      <p className="text-xs font-semibold text-ink-100">QR Code do formulário</p>
                      <button onClick={downloadQr} disabled={!qrDataUrl}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-500 text-on-accent disabled:opacity-50 transition-colors duration-150">
                        <i className="ti ti-download" aria-hidden="true" /> Baixar QR Code
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Acesso restrito */}
              {accessMode === "restricted" && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest font-condensed mb-2 text-brand-400">Pesquisadores autorizados</p>
                  <div className="flex gap-2 mb-2">
                    <label htmlFor="convite-email" className="sr-only">E-mail do pesquisador a convidar</label>
                    <input id="convite-email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addInvite()}
                      placeholder="email@instituicao.br"
                      className={`flex-1 min-w-0 ${FIELD_CLASS}`} />
                    <button onClick={addInvite}
                      className="px-3 py-2 rounded-md text-xs font-bold bg-brand-500 text-on-accent transition-colors duration-150">
                      <i className="ti ti-plus" aria-hidden="true" /> Convidar
                    </button>
                  </div>
                  {invites.length === 0 ? (
                    <p className="text-xs py-3 text-center text-ink-300">Nenhum pesquisador convidado ainda</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {invites.map(email => (
                        <div key={email} className="flex items-center justify-between px-3 py-2 rounded-md text-xs border border-ink-700 bg-ink-800">
                          <div className="flex items-center gap-2">
                            <i className="ti ti-user-circle text-brand-400" aria-hidden="true" />
                            <span className="text-ink-100">{email}</span>
                          </div>
                          <button onClick={() => setInvites(prev => prev.filter(e => e !== email))}
                            className="text-ink-500 hover:text-coral-500 transition-colors duration-150" aria-label={`Remover convite de ${email}`}>
                            <i className="ti ti-x text-xs" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confiabilidade estatística */}
            <div className="rounded-lg p-5 border border-ink-700 bg-ink-900">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-ink-800">
                    <i className="ti ti-chart-arcs text-sm text-teal-500" aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-bold text-ink-100">Confiabilidade estatística</h2>
                </div>
                <button onClick={() => setShowReliabilityHelp(v => !v)} className="text-2xs font-semibold underline text-ink-300 hover:text-ink-100">
                  {showReliabilityHelp ? "Ocultar explicação" : "Como isso é calculado?"}
                </button>
              </div>

              {showReliabilityHelp && (
                <div className="text-2xs rounded-lg p-3 mb-3 mt-2 bg-ink-800 text-ink-300 leading-relaxed">
                  <p className="mb-1.5">Calculamos quantas respostas você precisa pra ter confiança estatística nos
                  resultados, usando a fórmula de Cochran (a mesma usada em pesquisas de opinião e amostragem de censo).</p>
                  <p className="mb-1.5"><strong className="text-ink-100">Nível de confiança</strong>: se você repetisse essa pesquisa 100 vezes,
                  em quantas o resultado ficaria dentro da margem de erro.</p>
                  <p className="mb-1.5"><strong className="text-ink-100">Margem de erro</strong>: o quanto o resultado pode variar pra mais ou pra menos.</p>
                  <p>Se sua pesquisa cobre várias regiões/estados com contextos muito diferentes, estratificar por
                  estado (abaixo) evita que uma região fique sub-representada mesmo que o total geral já pareça suficiente.</p>
                </div>
              )}

              {/* Config */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <div>
                  <label htmlFor="rel-universo" className="text-2xs font-bold uppercase block mb-1 text-ink-300">Universo</label>
                  <input id="rel-universo" type="number" min={0} value={universeInput} onChange={e => setUniverseInput(e.target.value)}
                    placeholder="Ex: 50000"
                    className={`w-full ${FIELD_CLASS}`} />
                </div>
                <div>
                  <label htmlFor="rel-confianca" className="text-2xs font-bold uppercase block mb-1 text-ink-300">Confiança</label>
                  <select id="rel-confianca" value={confidenceLevel} onChange={e => setConfidenceLevelInput(Number(e.target.value))}
                    className={`w-full ${FIELD_CLASS}`}>
                    <option value={90}>90%</option>
                    <option value={95}>95%</option>
                    <option value={99}>99%</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="rel-margem" className="text-2xs font-bold uppercase block mb-1 text-ink-300">Margem de erro</label>
                  <select id="rel-margem" value={marginErrorInput} onChange={e => setMarginErrorInput(Number(e.target.value))}
                    className={`w-full ${FIELD_CLASS}`}>
                    <option value={1}>±1%</option>
                    <option value={3}>±3%</option>
                    <option value={5}>±5%</option>
                    <option value={10}>±10%</option>
                  </select>
                </div>
              </div>

              {/* Estratificação por estado/região */}
              {geoFields.length > 0 && (
                <div className="mb-3">
                  <label htmlFor="rel-estrato" className="text-2xs font-bold uppercase block mb-1 text-ink-300">
                    Estratificar por (opcional — pra pesquisas nacionais/multi-região)
                  </label>
                  <select id="rel-estrato" value={stratumFieldId} onChange={e => setStratumFieldId(e.target.value)}
                    className={`w-full mb-2 ${FIELD_CLASS}`}>
                    <option value="">Não estratificar (só meta geral)</option>
                    {geoFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>

                  {stratumFieldId && (
                    <div className="flex flex-col gap-1.5">
                      {Object.entries(stratumUniverses).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs font-mono w-10 text-ink-100">{key}</span>
                          <label htmlFor={`rel-estrato-${key}`} className="sr-only">Universo de {key}</label>
                          <input id={`rel-estrato-${key}`} type="number" min={0} value={val}
                            onChange={e => setStratumUniverses(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="Universo desse estado"
                            className={`flex-1 min-w-0 ${FIELD_CLASS}`} />
                          <button onClick={() => setStratumUniverses(prev => { const n = { ...prev }; delete n[key]; return n; })}
                            className="text-ink-500 hover:text-coral-500 transition-colors duration-150" aria-label={`Remover estrato ${key}`}>
                            <i className="ti ti-x text-xs" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <label htmlFor="rel-add-estrato" className="sr-only">Adicionar estado ao estrato</label>
                        <select id="rel-add-estrato" value={addStratumKey} onChange={e => {
                          if (e.target.value) { setStratumUniverses(prev => ({ ...prev, [e.target.value]: "" })); setAddStratumKey(""); }
                        }} className={`flex-1 min-w-0 ${FIELD_CLASS}`}>
                          <option value="">+ Adicionar estado...</option>
                          {Object.keys(SIGLA_TO_CODAREA).filter(uf => !(uf in stratumUniverses)).map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button onClick={saveReliabilityConfig} disabled={reliabilitySaving}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50 mb-3 bg-brand-500 text-on-accent transition-colors duration-150">
                <i className={`ti ${reliabilitySaving ? "ti-loader-2 animate-spin" : "ti-device-floppy"}`} aria-hidden="true" /> Salvar configuração
              </button>

              {/* Progresso */}
              {reliability?.configured && (
                <div className="pt-3 border-t border-ink-700">
                  <div className={`p-3 rounded-lg mb-2 border border-ink-700 ${reliability.overall.met ? "bg-teal-50/10" : "bg-ink-800"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold ${reliability.overall.met ? "text-teal-500" : "text-amber-500"}`}>
                        {reliability.overall.met ? "✓ Meta geral atingida" : "Meta geral em progresso"}
                      </span>
                      <span className="text-xs font-mono text-ink-100">
                        {reliability.overall.current} / {reliability.overall.required}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-ink-700">
                      <div className={`h-full ${reliability.overall.met ? "bg-teal-500" : "bg-brand-500"}`}
                        style={{ width: `${Math.min(100, (reliability.overall.current / reliability.overall.required) * 100)}%` }} />
                    </div>
                  </div>

                  {reliability.mode === "stratified" && reliability.strata.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2">
                      {reliability.strata.map(s => (
                        <div key={s.key} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md border border-ink-700 ${s.met ? "bg-teal-50/10" : "bg-ink-900"}`}>
                          <span className="text-ink-100">{s.met && "✓ "}{s.label}</span>
                          <span className="font-mono text-ink-100">{s.current} / {s.required}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {reliability.perResearcher && reliability.perResearcher.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-ink-700">
                      <p className="text-2xs font-bold uppercase mb-1.5 text-ink-300">Por pesquisador</p>
                      <div className="flex flex-col gap-1">
                        {reliability.perResearcher.map(r => (
                          <div key={r.userId} className="flex items-center justify-between text-xs">
                            <span className="text-ink-100">{r.met && "✓ "}{r.name}</span>
                            <span className="font-mono text-ink-100">{r.current} / {r.quota}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Testar formulário */}
            <div className="rounded-lg p-5 border border-ink-700 bg-ink-900">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-ink-800">
                  <i className="ti ti-test-pipe text-sm text-teal-500" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink-100">Testar formulário</h2>
                  <p className="text-xs text-ink-300">As respostas de teste não são salvas</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link href={`/p/${research.slug}?preview=true`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-teal-500 text-on-accent transition-colors duration-150">
                  <i className="ti ti-eye" aria-hidden="true" /> Abrir prévia do formulário
                </Link>
                <Link href={`/researches/${research.id}/form-builder`} className={PILL_BTN}>
                  <i className="ti ti-edit" aria-hidden="true" /> Editar formulário
                </Link>
              </div>
            </div>

          </div>

          {/* Coluna lateral */}
          <div className="flex flex-col gap-4">

            {/* Métricas */}
            <div className="rounded-lg p-4 border border-ink-700 bg-ink-900">
              <p className="text-xs font-bold uppercase tracking-widest font-condensed mb-3 text-brand-400">Métricas</p>
              {[
                { icon: "ti-clipboard-list", label: "Respostas",   val: "0" },
                { icon: "ti-clock",          label: "Tempo médio", val: "—" },
                { icon: "ti-chart-pie",      label: "Conclusão",   val: "—" },
              ].map((m, i, arr) => (
                <div key={m.label} className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? "border-b border-ink-700" : ""}`}>
                  <div className="flex items-center gap-2">
                    <i className={`ti ${m.icon} text-sm text-brand-400`} aria-hidden="true" />
                    <span className="text-xs font-medium text-ink-300">{m.label}</span>
                  </div>
                  <span className="text-sm font-bold text-ink-100">{m.val}</span>
                </div>
              ))}
            </div>

            {/* Entidades vinculadas */}
            <div className="rounded-lg p-4 border border-ink-700 bg-ink-900">
              <p className="text-xs font-bold uppercase tracking-widest font-condensed mb-3 text-brand-400">Entidades vinculadas</p>

              {links.length === 0 ? (
                <p className="text-xs mb-3 text-ink-300">Nenhuma entidade vinculada ainda.</p>
              ) : (
                <div className="flex flex-col gap-2 mb-3">
                  {links.map(l => {
                    const t = ENTITY_TYPE_MAP[l.entity.type] ?? { label: l.entity.type, icon: "ti-tag" };
                    return (
                      <Link key={l.id} href={`/entidades/${l.entity.id}`}
                        className="flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150 border border-ink-700 bg-ink-800 hover:border-brand-500/40">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <i className={`ti ${t.icon} text-xs text-brand-400`} aria-hidden="true" />
                            <span className="text-xs font-bold truncate text-ink-100">{l.entity.name}</span>
                          </div>
                          <p className="text-2xs font-mono mt-0.5 text-ink-300">{l.entity.code}</p>
                        </div>
                        <i className="ti ti-arrow-right text-xs flex-shrink-0 text-brand-400" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              )}

              {remainingEntities.length > 0 && (
                <form onSubmit={linkEntity} className="flex flex-col gap-2 pt-3 border-t border-ink-700">
                  <label htmlFor="vincular-entidade" className="sr-only">Vincular entidade existente</label>
                  <select
                    id="vincular-entidade"
                    value={selectedEntityId}
                    onChange={e => setSelectedEntityId(e.target.value)}
                    className={`w-full ${FIELD_CLASS}`}
                  >
                    <option value="">Vincular entidade existente...</option>
                    {remainingEntities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <label htmlFor="vincular-nota" className="sr-only">Nota sobre o vínculo</label>
                  <input
                    id="vincular-nota"
                    value={relationNote}
                    onChange={e => setRelationNote(e.target.value)}
                    placeholder="Nota sobre o vínculo (opcional)"
                    className={`w-full ${FIELD_CLASS}`}
                  />
                  {linkError && <p className="text-2xs text-coral-500">{linkError}</p>}
                  <button type="submit" disabled={!selectedEntityId || linking}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50 bg-brand-500 text-on-accent transition-colors duration-150">
                    <i className={`ti ${linking ? "ti-loader-2 animate-spin" : "ti-link"}`} aria-hidden="true" /> Vincular
                  </button>
                </form>
              )}

              <Link href="/entidades" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:underline">
                <i className="ti ti-database" aria-hidden="true" /> Ver catálogo de entidades
              </Link>
            </div>

            {/* Configurações rápidas */}
            <div className="rounded-lg p-4 border border-ink-700 bg-ink-900">
              <p className="text-xs font-bold uppercase tracking-widest font-condensed mb-3 text-brand-400">Configurações</p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: "ti-user-off",     label: "Anônimo",      active: research.allowAnonymous },
                  { icon: "ti-wifi-off",     label: "Offline",      active: research.offlineEnabled },
                  { icon: "ti-map-pin",      label: "Coleta GPS",   active: research.collectGps },
                  { icon: "ti-world",        label: "Dashboard público", active: research.publicDashboard },
                ].map(cfg => (
                  <div key={cfg.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className={`ti ${cfg.icon} text-sm text-brand-400`} aria-hidden="true" />
                      <span className="text-xs font-medium text-ink-300">{cfg.label}</span>
                    </div>
                    <div className={`w-7 h-3.5 rounded-full relative ${cfg.active ? "bg-brand-500" : "bg-ink-700"}`} aria-hidden="true">
                      <span className={`absolute w-2.5 h-2.5 bg-ink-950 rounded-full top-0.5 transition-all duration-150 ${cfg.active ? "left-3.5" : "left-0.5"}`} />
                    </div>
                  </div>
                ))}
              </div>
              <Link href={`/researches/${research.id}/settings`}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:underline">
                <i className="ti ti-settings" aria-hidden="true" /> Editar configurações
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
