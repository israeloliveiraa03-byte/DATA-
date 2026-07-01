"use client";

import { useState, useRef } from "react";
import type { User } from "@/lib/types";

const PALETTE = [
  { id: "terracota",  color: "#b07d20", label: "Terracota" },
  { id: "floresta",   color: "#0a6e45", label: "Floresta"  },
  { id: "oceano",     color: "#1a56db", label: "Oceano"    },
  { id: "territorio", color: "#534ab7", label: "Território"},
  { id: "rio",        color: "#0d9e75", label: "Rio"       },
  { id: "rosa",       color: "#9f4e6e", label: "Rosa"      },
];

type Note = { id: string; title: string; body: string; tags: string[]; public: boolean; createdAt: string; };
type ProfileType = "researcher" | "institution";
type ActiveTab = "perfil" | "notas" | "privacidade";

const BRD = "1px solid #e8d8be";

function Toggle({ value, onChange, accent }: { value: boolean; onChange: () => void; accent: string }) {
  return (
    <button onClick={onChange}
      className="relative flex-shrink-0 transition-colors"
      style={{ width: "38px", height: "20px", borderRadius: "10px", background: value ? accent : "#d1d5db" }}>
      <span className="absolute bg-white rounded-full transition-all shadow-sm"
        style={{ width: "16px", height: "16px", top: "2px", left: value ? "20px" : "2px" }} />
    </button>
  );
}

// Logos das plataformas acadêmicas
function OrcidLogo() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20">
      <circle cx="128" cy="128" r="128" fill="#A6CE39"/>
      <path d="M86 75h18v106H86z" fill="#fff"/>
      <circle cx="95" cy="61" r="11" fill="#fff"/>
      <path d="M120 75h46c39 0 58 22 58 53s-19 53-58 53h-46V75zm18 91h26c26 0 40-14 40-38s-14-38-40-38h-26v76z" fill="#fff"/>
    </svg>
  );
}

function ScholarLogo() {
  return (
    <svg viewBox="0 0 64 64" width="20" height="20">
      <path d="M32 2L2 24l30 10 30-10z" fill="#4285F4"/>
      <path d="M18 30v18l14 14 14-14V30L32 40z" fill="#356AC3"/>
      <circle cx="32" cy="49" r="11" fill="#DB4437"/>
      <circle cx="32" cy="49" r="7" fill="#fff"/>
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}

export function ProfileClient({ user }: { user: User }) {
  const [name,          setName]          = useState(user.name ?? "");
  const [bio,           setBio]           = useState(user.bio ?? "");
  const [institution,   setInstitution]   = useState(user.institution ?? "");
  const [cargo,         setCargo]         = useState("");
  const [city,          setCity]          = useState("");
  const [orcid,         setOrcid]         = useState(user.orcid ?? "");
  const [lattes,        setLattes]        = useState(user.lattesUrl ?? "");
  const [scholar,       setScholar]       = useState("");
  const [researchgate,  setResearchgate]  = useState("");
  const [linkedin,      setLinkedin]      = useState("");
  const [website,       setWebsite]       = useState("");
  const [photo,         setPhoto]         = useState<string | null>(user.avatarUrl ?? null);
  const [coverImage,    setCoverImage]    = useState<string | null>(null);
  const [color,         setColor]         = useState(PALETTE[0].color);
  const [profileType,   setProfileType]   = useState<ProfileType>("researcher");
  const [publicProfile, setPublicProfile] = useState(user.publicProfile ?? false);
  const [showResearches,setShowResearches]= useState(true);
  const [showProjects,  setShowProjects]  = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [savedMsg,      setSavedMsg]      = useState("");
  const [activeTab,     setActiveTab]     = useState<ActiveTab>("perfil");
  const [notes,         setNotes]         = useState<Note[]>([]);
  const [noteModal,     setNoteModal]     = useState(false);
  const [editNote,      setEditNote]      = useState<Note | null>(null);
  const [noteTitle,     setNoteTitle]     = useState("");
  const [noteBody,      setNoteBody]      = useState("");
  const [noteTags,      setNoteTags]      = useState("");
  const [notePublic,    setNotePublic]    = useState(true);

  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { if (ev.target?.result) setPhoto(ev.target.result as string); };
    r.readAsDataURL(file);
  }

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { if (ev.target?.result) setCoverImage(ev.target.result as string); };
    r.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, institution, orcid, lattesUrl: lattes, publicProfile }),
      });
      setSavedMsg("Salvo!"); setTimeout(() => setSavedMsg(""), 3000);
    } finally { setSaving(false); }
  }

  function openNewNote() { setEditNote(null); setNoteTitle(""); setNoteBody(""); setNoteTags(""); setNotePublic(true); setNoteModal(true); }
  function openEditNote(n: Note) { setEditNote(n); setNoteTitle(n.title); setNoteBody(n.body); setNoteTags(n.tags.join(", ")); setNotePublic(n.public); setNoteModal(true); }
  function saveNote() {
    const tags = noteTags.split(",").map(t => t.trim()).filter(Boolean);
    if (editNote) {
      setNotes(prev => prev.map(n => n.id === editNote.id ? { ...n, title: noteTitle, body: noteBody, tags, public: notePublic } : n));
    } else {
      setNotes(prev => [...prev, { id: Math.random().toString(36).slice(2,10), title: noteTitle, body: noteBody, tags, public: notePublic, createdAt: new Date().toLocaleDateString("pt-BR") }]);
    }
    setNoteModal(false);
  }
  function deleteNote(id: string) { setNotes(prev => prev.filter(n => n.id !== id)); }

  const accent = color;
  const accentLight = color + "15";

  const iStyle = { border: BRD, background: "#fbf3e7", color: "#111", fontFamily: "Inter, sans-serif" };
  const iCls = "w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-all";

  const LINKS = [
    { label: "ORCID", logo: <OrcidLogo />, bg: "#fff", border: BRD, val: orcid, set: setOrcid, ph: "0000-0000-0000-0000", connected: !!orcid },
    { label: "Lattes (CNPq)", logo: <span style={{ fontSize:"9px", fontWeight:900, fontFamily:"sans-serif", background:"#003a6e", color:"#fff", padding:"1px 4px", borderRadius:"3px" }}>CNPq</span>, bg: "#003a6e", border: "#003a6e", val: lattes, set: setLattes, ph: "lattes.cnpq.br/...", connected: !!lattes },
    { label: "Google Scholar", logo: <ScholarLogo />, bg: "#fff", border: BRD, val: scholar, set: setScholar, ph: "scholar.google.com/citations?user=...", connected: !!scholar },
    { label: "ResearchGate", logo: <span style={{ fontSize:"12px", fontWeight:900, fontFamily:"Georgia,serif", color:"#fff" }}>RG</span>, bg: "#00d0af", border: "#00b89a", val: researchgate, set: setResearchgate, ph: "researchgate.net/profile/...", connected: !!researchgate },
    { label: "LinkedIn", logo: <LinkedInLogo />, bg: "#0077B5", border: "#006097", val: linkedin, set: setLinkedin, ph: "linkedin.com/in/...", connected: !!linkedin },
    { label: "Site pessoal", logo: <i className="ti ti-world" style={{ color:"#a06d28", fontSize:"16px" }} />, bg: "#fbf3e7", border: "#e8d8be", val: website, set: setWebsite, ph: "seuperfil.com.br", connected: !!website },
  ];

  return (
    <div className="flex-1 overflow-auto" style={{ background: "#f3e4cb" }}>
      <div style={{ maxWidth: "940px", margin: "0 auto", background: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        {/* ── CAPA ── */}
        <div style={{ position: "relative", height: "200px", overflow: "hidden", background: "#fbf3e7", borderBottom: BRD }}>
          {coverImage
            ? <img src={coverImage} alt="Capa" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            : (
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 940 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs>
                  <pattern id="pg" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M 38 0 L 0 0 0 38" fill="none" stroke="#d9bb8c" strokeWidth="0.6"/></pattern>
                  <linearGradient id="pfr" x1="0" y1="0" x2="1" y2="0"><stop offset="55%" stopColor="#fbf3e7" stopOpacity="0"/><stop offset="100%" stopColor="#fbf3e7" stopOpacity="0.95"/></linearGradient>
                  <linearGradient id="pfb" x1="0" y1="0" x2="0" y2="1"><stop offset="50%" stopColor="#fbf3e7" stopOpacity="0"/><stop offset="100%" stopColor="#fbf3e7" stopOpacity="1"/></linearGradient>
                </defs>
                <rect width="940" height="200" fill="url(#pg)"/>
                <path d="M0 120 Q180 90 360 110 T720 100 T940 108" fill="none" stroke="#d2a05c" strokeWidth="1.2" opacity="0.35"/>
                <path d="M0 155 Q180 125 360 145 T720 135 T940 142" fill="none" stroke="#d2a05c" strokeWidth="0.8" opacity="0.22"/>
                <line x1="90" y1="55" x2="300" y2="90" stroke="#1a56db" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.5"/>
                <line x1="300" y1="90" x2="520" y2="42" stroke={accent} strokeWidth="1.5" strokeDasharray="8 5" opacity="0.55"/>
                <line x1="520" y1="42" x2="720" y2="105" stroke="#3a5430" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.5"/>
                <line x1="300" y1="90" x2="500" y2="160" stroke="#534ab7" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.38"/>
                <line x1="720" y1="105" x2="860" y2="58" stroke="#4c6b3c" strokeWidth="1" strokeDasharray="5 4" opacity="0.32"/>
                <circle cx="90"  cy="55"  r="15" fill="none" stroke="#1a56db" strokeWidth="2.2"/><circle cx="90"  cy="55"  r="5.5" fill="#1a56db"/>
                <circle cx="300" cy="90"  r="15" fill="none" stroke={accent} strokeWidth="2.2"/><circle cx="300" cy="90"  r="5.5" fill={accent}/>
                <circle cx="520" cy="42"  r="15" fill="none" stroke="#3a5430" strokeWidth="2.2"/><circle cx="520" cy="42"  r="5.5" fill="#3a5430"/>
                <circle cx="720" cy="105" r="13" fill="none" stroke="#4c6b3c" strokeWidth="2"/><circle cx="720" cy="105" r="4.5" fill="#4c6b3c"/>
                <circle cx="500" cy="160" r="11" fill="none" stroke="#534ab7" strokeWidth="2"/><circle cx="500" cy="160" r="4" fill="#534ab7"/>
                <circle cx="860" cy="58"  r="9"  fill="none" stroke="#a06d28" strokeWidth="1.8" opacity="0.55"/><circle cx="860" cy="58" r="3" fill="#a06d28" opacity="0.45"/>
                <circle cx="300" cy="90" r="22" fill="none" stroke={accent} strokeWidth="1" opacity="0.1">
                  <animate attributeName="r" values="15;30;15" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.1;0.02;0.1" dur="3s" repeatCount="indefinite"/>
                </circle>
                <rect width="940" height="200" fill="url(#pfr)"/>
                <rect width="940" height="200" fill="url(#pfb)"/>
              </svg>
            )}

          {/* Tipo de perfil */}
          <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", background: "rgba(255,255,255,0.92)", border: BRD, borderRadius: "8px", overflow: "hidden", backdropFilter: "blur(8px)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {(["researcher","institution"] as ProfileType[]).map(t => (
              <button key={t} onClick={() => setProfileType(t)}
                className="px-3 py-1.5 text-xs font-bold transition-all"
                style={{ background: profileType === t ? accent : "transparent", color: profileType === t ? "#fff" : "#a06d28", fontFamily: "Inter, sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {t === "researcher" ? "Pesquisador" : "Instituição"}
              </button>
            ))}
          </div>

          {/* Controles */}
          <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
            {coverImage && (
              <button onClick={() => setCoverImage(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.92)", border: BRD, color: "#c0392b", backdropFilter: "blur(8px)" }}>
                <i className="ti ti-x text-xs" /> Remover imagem
              </button>
            )}
            <button onClick={() => coverRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.92)", border: BRD, color: "#5c3f13", backdropFilter: "blur(8px)" }}>
              <i className="ti ti-photo text-xs" /> Imagem de capa
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.92)", border: BRD, backdropFilter: "blur(8px)" }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#9ca3af" }}>Cor</span>
              {PALETTE.map(p => (
                <button key={p.id} onClick={() => setColor(p.color)} title={p.label}
                  className="transition-transform hover:scale-125"
                  style={{ width: "16px", height: "16px", borderRadius: "50%", background: p.color, border: color === p.color ? "2px solid #0f172a" : "2px solid transparent", boxShadow: color === p.color ? "0 0 0 1px rgba(15,23,42,0.15)" : "none" }} />
              ))}
            </div>
          </div>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
        </div>

        {/* ── AVATAR + AÇÕES ── */}
        <div className="flex items-end justify-between px-8" style={{ marginTop: "-44px", marginBottom: "0", position: "relative", zIndex: 10 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div
              onClick={() => photoRef.current?.click()}
              className="flex items-center justify-center cursor-pointer"
              style={{ width: "88px", height: "88px", borderRadius: "20px", border: "4px solid #fff", background: photo ? "transparent" : `linear-gradient(135deg, ${accent}, #534ab7)`, boxShadow: `0 0 0 1px rgba(196,138,66,0.2), 0 4px 20px rgba(0,0,0,0.12)`, overflow: "hidden", position: "relative" }}>
              {photo
                ? <img src={photo} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "32px", fontWeight: 700, color: "#fff" }}>{name?.[0]?.toUpperCase() ?? "P"}</span>
              }
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.35)", borderRadius: "16px" }}>
                <i className="ti ti-camera text-white text-xl" />
              </div>
            </div>
            <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "18px", height: "18px", borderRadius: "50%", background: "#10b981", border: "2.5px solid #fff" }} />
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          <div className="flex items-center gap-3 pb-1.5">
            {savedMsg && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#ecfdf5", color: "#065f46" }}>
                <i className="ti ti-check" /> {savedMsg}
              </span>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Identidade verificada
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-all hover:-translate-y-px"
              style={{ background: accent, color: "#fff", border: "none", boxShadow: `0 2px 8px ${accent}40`, fontFamily: "Inter, sans-serif" }}>
              <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-device-floppy"} />
              {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </div>

        {/* ── IDENTIDADE HEADER ── */}
        <div className="px-8 pt-3 pb-4" style={{ borderBottom: BRD }}>
          <div className="flex items-center gap-2 mb-1.5">
            <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "22px", fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" }}>
              {name || "Seu nome"}
            </h1>
            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-sm mb-3" style={{ color: "#4b5563" }}>
            {cargo && <span>{cargo}</span>}
            {cargo && institution && <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#9ca3af", display: "inline-block" }} />}
            {institution && <span>{institution}</span>}
            {city && <><span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#9ca3af", display: "inline-block" }} /><span className="flex items-center gap-1"><i className="ti ti-map-pin text-xs" style={{ color: accent }} />{city}</span></>}
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {orcid && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#f0fae0", color: "#3a6600", border: "1px solid #a0c840" }}>
                <svg viewBox="0 0 256 256" width="12" height="12"><circle cx="128" cy="128" r="128" fill="#A6CE39"/><path d="M86 75h18v106H86z" fill="#fff"/><circle cx="95" cy="61" r="11" fill="#fff"/><path d="M120 75h46c39 0 58 22 58 53s-19 53-58 53h-46V75zm18 91h26c26 0 40-14 40-38s-14-38-40-38h-26v76z" fill="#fff"/></svg>
                ORCID
              </div>
            )}
            {lattes && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#e8f0fe", color: "#1e3a8a", border: "1px solid #93b4f0" }}>
                <span style={{ fontSize: "8px", fontWeight: 900, background: "#003a6e", color: "#fff", padding: "0 3px", borderRadius: "2px" }}>CNPq</span>
                Lattes
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#fbf3e7", color: "#7a5218", border: BRD }}>
              <i className="ti ti-notebook" style={{ fontSize: "10px" }} /> {notes.length} notas
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#fbf3e7", color: "#7a5218", border: BRD }}>
              <i className="ti ti-clipboard-list" style={{ fontSize: "10px" }} /> 1 pesquisa
            </div>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-5 pt-3" style={{ borderTop: BRD }}>
            {[
              { val: "1", label: "Pesquisas" },
              { val: String(notes.length), label: "Notas" },
              { val: "0", label: "Colaborações" },
              { val: "—", label: "Visualizações" },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-4">
                {i > 0 && <div style={{ width: "1px", height: "28px", background: BRD.replace("1px solid ", "") }} />}
                <div>
                  <p style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "20px", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{s.val}</p>
                  <p style={{ fontSize: "9px", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex px-8" style={{ borderBottom: BRD }}>
          {([
            { key: "perfil",      icon: "ti-user",     label: "Perfil" },
            { key: "notas",       icon: "ti-notebook", label: "Notas técnicas", count: notes.length },
            { key: "privacidade", icon: "ti-lock",     label: "Privacidade" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all -mb-px"
              style={{ borderBottomColor: activeTab === tab.key ? accent : "transparent", color: activeTab === tab.key ? accent : "#9ca3af", fontFamily: "Inter, sans-serif", letterSpacing: "0.01em" }}>
              <i className={`ti ${tab.icon}`} style={{ fontSize: "14px" }} />
              {tab.label}
              {"count" in tab && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: activeTab === tab.key ? accentLight : "#f3f4f6", color: activeTab === tab.key ? accent : "#6b7280" }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CONTEÚDO ── */}
        <div className="p-8">

          {/* TAB: PERFIL */}
          {activeTab === "perfil" && (
            <div className="grid grid-cols-2 gap-4">

              {/* Identidade */}
              <div className="rounded-xl p-5" style={{ border: BRD, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: accent, fontSize: "9px" }}>
                  Identidade <span style={{ flex: 1, height: "1px", background: "#e8d8be", display: "inline-block" }} />
                </p>
                {[
                  { label: "Nome completo", val: name, set: setName, ph: "Seu nome completo" },
                  { label: "Cargo / Título acadêmico", val: cargo, set: setCargo, ph: "Ex: Professora doutora, Pesquisador" },
                  { label: "Instituição de vínculo", val: institution, set: setInstitution, ph: "Ex: UFBA, IBGE, CIMI" },
                  { label: "Cidade / Estado", val: city, set: setCity, ph: "Ex: Salvador, BA" },
                ].map(f => (
                  <div key={f.label} className="mb-3">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4b5563" }}>{f.label}</label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} className={iCls} style={iStyle} placeholder={f.ph}
                      onFocus={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}18`; e.currentTarget.style.background = "#fff"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "#e8d8be"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#fbf3e7"; }} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4b5563" }}>Bio / Apresentação</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={5} className={iCls + " resize-none"} style={iStyle}
                    placeholder="Descreva sua trajetória, áreas de interesse e experiência em pesquisa de campo..."
                    onFocus={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}18`; e.currentTarget.style.background = "#fff"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#e8d8be"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#fbf3e7"; }} />
                  <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>Máximo 500 caracteres · Visível no perfil público</p>
                </div>
              </div>

              {/* Direita */}
              <div className="flex flex-col gap-4">

                {/* Links */}
                <div className="rounded-xl p-5" style={{ border: BRD, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: accent, fontSize: "9px" }}>
                    Links acadêmicos <span style={{ flex: 1, height: "1px", background: "#e8d8be", display: "inline-block" }} />
                  </p>
                  {LINKS.map(link => (
                    <div key={link.label} className="flex items-center gap-2.5 mb-2.5">
                      <div className="flex items-center justify-center flex-shrink-0"
                        style={{ width: "30px", height: "30px", borderRadius: "8px", background: link.bg, border: `1px solid ${link.border}`, overflow: "hidden" }}>
                        {link.logo}
                      </div>
                      <input value={link.val} onChange={e => link.set(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs border focus:outline-none transition-all"
                        style={{ border: BRD, background: "#fbf3e7", color: "#111", fontFamily: "Inter, sans-serif" }}
                        placeholder={link.ph}
                        onFocus={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}18`; e.currentTarget.style.background = "#fff"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "#e8d8be"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "#fbf3e7"; }} />
                      {link.connected && (
                        <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="ti ti-check" style={{ color: "#fff", fontSize: "9px" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: "#fff", border: `1.5px solid ${accent}40` }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, #c48a42, #534ab7, #4c6b3c)` }} />
                  <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "100px", height: "100px", borderRadius: "50%", background: `radial-gradient(circle, ${accent}18, transparent)` }} />
                  <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: accent, fontSize: "9px" }}>
                    <i className="ti ti-eye" /> Preview do perfil público
                  </p>
                  <div className="flex items-center gap-2.5 mb-2 relative z-10">
                    <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: `linear-gradient(135deg, ${accent}, #534ab7)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {photo
                        ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "15px", fontWeight: 700, color: "#fff" }}>{name?.[0]?.toUpperCase() ?? "P"}</span>
                      }
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827", fontFamily: "var(--font-serif), Georgia, serif" }}>{name || "Seu nome"}</p>
                      <p style={{ fontSize: "11px", color: "#4b5563", marginTop: "1px" }}>{cargo || "Cargo"}{institution ? ` · ${institution}` : ""}</p>
                    </div>
                  </div>
                  {bio && <p className="text-xs leading-relaxed line-clamp-2 relative z-10 mb-2" style={{ color: "#4b5563" }}>{bio}</p>}
                  <div className="flex gap-1.5 flex-wrap relative z-10">
                    {orcid && <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1" style={{ background: "#fff", border: BRD, color: "#4b5563" }}><svg viewBox="0 0 256 256" width="10" height="10"><circle cx="128" cy="128" r="128" fill="#A6CE39"/><path d="M86 75h18v106H86z" fill="#fff"/><circle cx="95" cy="61" r="11" fill="#fff"/></svg>ORCID</span>}
                    {lattes && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#fff", border: BRD, color: "#4b5563" }}>Lattes</span>}
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#fff", border: BRD, color: "#4b5563" }}>1 pesquisa</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="col-span-2 grid grid-cols-4 gap-3">
                {[
                  { icon: "ti-clipboard-list", bg: "#fbf3e7", color: accent,    val: "1",             label: "Pesquisas" },
                  { icon: "ti-notebook",       bg: "#ecfdf5", color: "#4c6b3c", val: String(notes.length), label: "Notas técnicas" },
                  { icon: "ti-users",          bg: "#eff6ff", color: "#1a56db", val: "0",             label: "Colaborações" },
                  { icon: "ti-eye",            bg: "#f5f3ff", color: "#534ab7", val: "—",             label: "Visualizações" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3 rounded-xl p-4 transition-all"
                    style={{ border: BRD, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: "18px" }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "22px", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{s.val}</p>
                      <p style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: NOTAS */}
          {activeTab === "notas" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-bold" style={{ color: "#111827", fontFamily: "var(--font-serif), Georgia, serif" }}>Notas metodológicas</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Orientações sobre como conduzir pesquisas em contextos específicos</p>
                </div>
                <button onClick={openNewNote} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: accent, color: "#fff", fontFamily: "Inter, sans-serif" }}>
                  <i className="ti ti-plus" /> Nova nota
                </button>
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-16 rounded-xl" style={{ border: "2px dashed #e8d8be", background: "#fbf3e7" }}>
                  <i className="ti ti-notebook text-4xl block mb-3" style={{ color: "#d9bb8c" }} />
                  <p className="text-sm font-semibold mb-1" style={{ color: "#111827", fontFamily: "var(--font-serif), Georgia, serif" }}>Nenhuma nota ainda</p>
                  <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>Publique orientações para outros pesquisadores</p>
                  <button onClick={openNewNote} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: accent, color: "#fff" }}>
                    <i className="ti ti-plus" /> Criar primeira nota
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {notes.map(note => (
                    <div key={note.id} className="rounded-xl p-4 transition-all" style={{ border: BRD, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111827", fontFamily: "var(--font-serif), Georgia, serif" }}>{note.title}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: note.public ? "#ecfdf5" : "#fbf3e7", color: note.public ? "#065f46" : "#a06d28", border: BRD }}>
                              {note.public ? "Pública" : "Privada"}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed mb-2 line-clamp-3" style={{ color: "#4b5563" }}>{note.body}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {note.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: accentLight, color: accent }}>#{tag}</span>
                            ))}
                            <span className="text-xs ml-auto" style={{ color: "#9ca3af" }}>{note.createdAt}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => openEditNote(note)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: BRD, background: "#fbf3e7", color: "#a06d28" }}><i className="ti ti-pencil text-xs" /></button>
                          <button onClick={() => deleteNote(note.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: BRD, background: "#fbf3e7", color: "#c0392b" }}><i className="ti ti-trash text-xs" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PRIVACIDADE */}
          {activeTab === "privacidade" && (
            <div style={{ maxWidth: "540px" }}>
              <div className="rounded-xl p-5" style={{ border: BRD, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: accent, fontSize: "9px" }}>Visibilidade do perfil</p>
                {[
                  { label: "Perfil público",   desc: "Seu perfil aparece na rede de pesquisadores do Dataº", val: publicProfile,    tog: () => setPublicProfile(v => !v) },
                  { label: "Exibir pesquisas", desc: "Mostra suas pesquisas ativas e publicadas no perfil",  val: showResearches,   tog: () => setShowResearches(v => !v) },
                  { label: "Exibir projetos",  desc: "Mostra os projetos em que você está envolvido",       val: showProjects,     tog: () => setShowProjects(v => !v) },
                ].map((item, i, arr) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-4" style={{ borderBottom: i < arr.length - 1 ? BRD : "none" }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#111827" }}>{item.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{item.desc}</p>
                    </div>
                    <Toggle value={item.val} onChange={item.tog} accent={accent} />
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-3 flex items-start gap-2 mt-4" style={{ background: "#fbf3e7", border: `1px solid ${accent}30` }}>
                <i className="ti ti-shield-check flex-shrink-0 mt-0.5" style={{ color: accent, fontSize: "16px" }} />
                <p className="text-xs leading-relaxed" style={{ color: "#5c3f13" }}>
                  Seus dados são tratados em conformidade com a <strong>LGPD</strong>. Você controla tudo que é visível publicamente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL NOTA ── */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setNoteModal(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl" style={{ background: "#fff", border: BRD }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", fontFamily: "var(--font-serif), Georgia, serif" }}>
                {editNote ? "Editar nota" : "Nova nota metodológica"}
              </h3>
              <button onClick={() => setNoteModal(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: BRD, color: "#a06d28" }}>
                <i className="ti ti-x text-xs" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Título *", val: noteTitle, set: setNoteTitle, ph: "Ex: Como trabalhar com comunidades quilombolas", rows: 0 },
                { label: "Conteúdo *", val: noteBody, set: setNoteBody, ph: "Descreva orientações, recomendações e aprendizados metodológicos...", rows: 6 },
                { label: "Tags (separadas por vírgula)", val: noteTags, set: setNoteTags, ph: "Ex: quilombola, território, conflito", rows: 0 },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4b5563" }}>{f.label}</label>
                  {f.rows > 0
                    ? <textarea value={f.val} onChange={e => f.set(e.target.value)} rows={f.rows} className={iCls + " resize-none"} style={iStyle} placeholder={f.ph} />
                    : <input value={f.val} onChange={e => f.set(e.target.value)} className={iCls} style={iStyle} placeholder={f.ph} />
                  }
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#4b5563" }}>Visibilidade</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{notePublic ? "Visível na rede de pesquisadores" : "Apenas você pode ver"}</p>
                </div>
                <Toggle value={notePublic} onChange={() => setNotePublic(v => !v)} accent={accent} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setNoteModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ border: BRD, background: "#fbf3e7", color: "#5c3f13", fontFamily: "Inter, sans-serif" }}>Cancelar</button>
              <button onClick={saveNote} disabled={!noteTitle || !noteBody} className="flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: accent, color: "#fff", fontFamily: "Inter, sans-serif" }}>
                {editNote ? "Salvar alterações" : "Publicar nota"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
