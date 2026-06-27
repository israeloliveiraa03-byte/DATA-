"use client";

import { useState, useRef } from "react";
import type { User } from "@/lib/types";

const PALETTE = [
  { id: "terracota",  label: "Terracota",  color: "#b07d20" },
  { id: "floresta",   label: "Floresta",   color: "#0a6e45" },
  { id: "oceano",     label: "Oceano",     color: "#1a56db" },
  { id: "cerrado",    label: "Cerrado",    color: "#ba7517" },
  { id: "territorio", label: "Território", color: "#534ab7" },
  { id: "rio",        label: "Rio",        color: "#0d9e75" },
  { id: "noite",      label: "Noite",      color: "#1e293b" },
  { id: "rosavelho",  label: "Rosa velho", color: "#9f4e6e" },
];

type Note = {
  id: string; title: string; body: string;
  tags: string[]; public: boolean; createdAt: string;
};

const BRD = "1px solid #e8d9c0";
const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-all";

function Toggle({ value, onChange, accent }: { value: boolean; onChange: () => void; accent: string }) {
  return (
    <button onClick={onChange} className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
      style={{ background: value ? accent : "#e8d9c0" }}>
      <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all shadow-sm ${value ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

export function ProfileClient({ user }: { user: User }) {
  const [name,         setName]         = useState(user.name ?? "");
  const [bio,          setBio]          = useState(user.bio ?? "");
  const [institution,  setInstitution]  = useState(user.institution ?? "");
  const [cargo,        setCargo]        = useState("");
  const [city,         setCity]         = useState("");
  const [orcid,        setOrcid]        = useState(user.orcid ?? "");
  const [lattes,       setLattes]       = useState(user.lattesUrl ?? "");
  const [scholar,      setScholar]      = useState("");
  const [researchgate, setResearchgate] = useState("");
  const [linkedin,     setLinkedin]     = useState("");
  const [website,      setWebsite]      = useState("");
  const [photo,        setPhoto]        = useState<string | null>(user.avatarUrl ?? null);
  const [color,        setColor]        = useState(PALETTE[0].color);
  const [publicProfile,  setPublicProfile]  = useState(user.publicProfile ?? false);
  const [showResearches, setShowResearches] = useState(true);
  const [showProjects,   setShowProjects]   = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [savedMsg,     setSavedMsg]     = useState("");
  const [activeTab,    setActiveTab]    = useState<"perfil" | "notas" | "privacidade">("perfil");
  const [notes,        setNotes]        = useState<Note[]>([]);
  const [noteModal,    setNoteModal]    = useState(false);
  const [editNote,     setEditNote]     = useState<Note | null>(null);
  const [noteTitle,    setNoteTitle]    = useState("");
  const [noteBody,     setNoteBody]     = useState("");
  const [noteTags,     setNoteTags]     = useState("");
  const [notePublic,   setNotePublic]   = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setPhoto(ev.target.result as string); };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, institution, orcid, lattesUrl: lattes, publicProfile }),
      });
      setSavedMsg("Perfil salvo!"); setTimeout(() => setSavedMsg(""), 3000);
    } finally { setSaving(false); }
  }

  function openNewNote() {
    setEditNote(null); setNoteTitle(""); setNoteBody(""); setNoteTags(""); setNotePublic(true); setNoteModal(true);
  }
  function openEditNote(note: Note) {
    setEditNote(note); setNoteTitle(note.title); setNoteBody(note.body);
    setNoteTags(note.tags.join(", ")); setNotePublic(note.public); setNoteModal(true);
  }
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
  const accentLight = color + "18";
  const iStyle = { border: BRD, background: "#fff", color: "#111" };

  const LINKS = [
    { label: "ORCID",         icon: "ti-id-badge-2",       val: orcid,       set: setOrcid,       ph: "0000-0000-0000-0000",      c: "#A6CE39" },
    { label: "Lattes (CNPq)", icon: "ti-file-certificate", val: lattes,      set: setLattes,      ph: "http://lattes.cnpq.br/...", c: "#1a56db" },
    { label: "Google Scholar",icon: "ti-brand-google",     val: scholar,     set: setScholar,     ph: "Link do perfil Scholar",   c: "#4285F4" },
    { label: "ResearchGate",  icon: "ti-world",            val: researchgate,set: setResearchgate,ph: "Link do ResearchGate",     c: "#00d0af" },
    { label: "LinkedIn",      icon: "ti-brand-linkedin",   val: linkedin,    set: setLinkedin,    ph: "Link do LinkedIn",         c: "#0077B5" },
    { label: "Site pessoal",  icon: "ti-world",            val: website,     set: setWebsite,     ph: "https://seuperfil.com",   c: "#8b7355" },
  ];

  return (
    <div className="flex-1 overflow-auto" style={{ background: "#fff" }}>

      {/* Capa */}
      <div className="relative h-28 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}>
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 800 112" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <pattern id="pp" width="38" height="38" patternUnits="userSpaceOnUse">
            <path d="M 38 0 L 0 0 0 38" fill="none" stroke="#fff" strokeWidth="0.8"/>
          </pattern>
          <rect width="800" height="112" fill="url(#pp)"/>
        </svg>
        <div className="absolute top-3 right-4 flex items-center gap-1.5">
          {PALETTE.map(p => (
            <button key={p.id} onClick={() => setColor(p.color)} title={p.label}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: p.color, borderColor: color === p.color ? "#fff" : "transparent" }} />
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">

        {/* Avatar + ações */}
        <div className="flex items-end justify-between -mt-10 mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden shadow-lg flex items-center justify-center"
              style={{ background: accentLight }}>
              {photo
                ? <img src={photo} alt="Foto" className="w-full h-full object-cover" />
                : <i className="ti ti-user text-3xl" style={{ color: accent }} />}
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm"
              style={{ background: accent }}>
              <i className="ti ti-camera text-xs text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <div className="flex items-center gap-2 pb-1">
            {savedMsg && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: "#e1f5ee", color: "#0a6e45" }}>
                <i className="ti ti-check" /> {savedMsg}
              </span>
            )}
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
              style={{ background: accent, color: "#fff" }}>
              <i className={saving ? "ti ti-loader-2 animate-spin" : "ti ti-device-floppy"} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "#e8d9c0" }}>
          {([
            { key: "perfil",      icon: "ti-user",     label: "Perfil" },
            { key: "notas",       icon: "ti-notebook", label: "Notas técnicas" },
            { key: "privacidade", icon: "ti-lock",     label: "Privacidade" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px"
              style={{ borderBottomColor: activeTab === tab.key ? accent : "transparent", color: activeTab === tab.key ? accent : "#8b7355" }}>
              <i className={`ti ${tab.icon}`} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB PERFIL ── */}
        {activeTab === "perfil" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-10">
            <div className="rounded-xl p-5 flex flex-col gap-3" style={{ border: BRD, background: "#faf6ef" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent, fontSize: "9px" }}>Identidade</p>
              {[
                { label: "Nome completo",          val: name,        set: setName,        ph: "Seu nome completo" },
                { label: "Cargo / Título",         val: cargo,       set: setCargo,       ph: "Ex: Professora doutora, Pesquisador" },
                { label: "Instituição de vínculo", val: institution, set: setInstitution, ph: "Ex: UFBA, IBGE, CIMI" },
                { label: "Cidade / Estado",        val: city,        set: setCity,        ph: "Ex: Salvador, BA" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#5c4a2a" }}>{f.label}</label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} className={inputCls} style={iStyle} placeholder={f.ph} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#5c4a2a" }}>Bio / Apresentação</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={5}
                  className={inputCls + " resize-none"} style={iStyle}
                  placeholder="Descreva sua trajetória, áreas de interesse e experiência em pesquisa de campo..." />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl p-5 flex flex-col gap-3" style={{ border: BRD, background: "#faf6ef" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent, fontSize: "9px" }}>Links acadêmicos</p>
                {LINKS.map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "#5c4a2a" }}>
                      <i className={`ti ${f.icon}`} style={{ color: f.c }} /> {f.label}
                    </label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} className={inputCls} style={iStyle} placeholder={f.ph} />
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="rounded-xl p-4" style={{ border: `1.5px solid ${accent}30`, background: accentLight }}>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: accent }}>
                  <i className="ti ti-eye" /> Preview público
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: accent + "30" }}>
                    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <i className="ti ti-user" style={{ color: accent }} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#111" }}>{name || "Seu nome"}</p>
                    <p className="text-xs" style={{ color: "#8b7355" }}>{cargo || "Seu cargo"}{institution ? ` · ${institution}` : ""}</p>
                  </div>
                </div>
                {bio && <p className="text-xs mt-2 line-clamp-2 leading-relaxed" style={{ color: "#5c4a2a" }}>{bio}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB NOTAS ── */}
        {activeTab === "notas" && (
          <div className="pb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold" style={{ color: "#111" }}>Notas metodológicas</p>
                <p className="text-xs mt-0.5" style={{ color: "#8b7355" }}>Orientações sobre como conduzir pesquisas em contextos específicos</p>
              </div>
              <button onClick={openNewNote} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: accent, color: "#fff" }}>
                <i className="ti ti-plus" /> Nova nota
              </button>
            </div>
            {notes.length === 0 ? (
              <div className="text-center py-16 rounded-xl" style={{ border: "2px dashed #e8d9c0", background: "#faf6ef" }}>
                <i className="ti ti-notebook text-3xl block mb-3" style={{ color: "#d4b880" }} />
                <p className="text-sm font-semibold mb-1" style={{ color: "#5c4a2a" }}>Nenhuma nota ainda</p>
                <p className="text-xs mb-4" style={{ color: "#8b7355" }}>Crie orientações para outros pesquisadores</p>
                <button onClick={openNewNote} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: accent, color: "#fff" }}>
                  <i className="ti ti-plus" /> Criar primeira nota
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notes.map(note => (
                  <div key={note.id} className="rounded-xl p-4" style={{ border: BRD, background: "#faf6ef" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-bold" style={{ color: "#111" }}>{note.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: note.public ? "#e1f5ee" : "#faf6ef", color: note.public ? "#0a6e45" : "#8b7355", border: BRD }}>
                            {note.public ? "Pública" : "Privada"}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed mb-2 line-clamp-3" style={{ color: "#5c4a2a" }}>{note.body}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {note.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: accentLight, color: accent }}>#{tag}</span>
                          ))}
                          <span className="text-xs" style={{ color: "#b8a080" }}>{note.createdAt}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditNote(note)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: BRD, background: "#fff", color: "#8b7355" }}>
                          <i className="ti ti-pencil text-xs" />
                        </button>
                        <button onClick={() => deleteNote(note.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ border: BRD, background: "#fff", color: "#c0392b" }}>
                          <i className="ti ti-trash text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB PRIVACIDADE ── */}
        {activeTab === "privacidade" && (
          <div className="pb-10 max-w-lg">
            <div className="rounded-xl p-5 flex flex-col gap-4" style={{ border: BRD, background: "#faf6ef" }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accent, fontSize: "9px" }}>Visibilidade do perfil</p>
              {[
                { label: "Perfil público",  desc: "Seu perfil aparece na rede de pesquisadores", val: publicProfile,   tog: () => setPublicProfile(v => !v) },
                { label: "Exibir pesquisas",desc: "Mostra suas pesquisas no perfil público",      val: showResearches,  tog: () => setShowResearches(v => !v) },
                { label: "Exibir projetos", desc: "Mostra os projetos em que está envolvido",     val: showProjects,    tog: () => setShowProjects(v => !v) },
              ].map((item, i, arr) => (
                <div key={item.label} className="flex items-center justify-between gap-4 pb-4" style={{ borderBottom: i < arr.length - 1 ? BRD : "none" }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#111" }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#8b7355" }}>{item.desc}</p>
                  </div>
                  <Toggle value={item.val} onChange={item.tog} accent={accent} />
                </div>
              ))}
              <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "#fff8ec", border: `1px solid ${accent}30` }}>
                <i className="ti ti-shield-check text-sm flex-shrink-0 mt-0.5" style={{ color: accent }} />
                <p className="text-xs leading-relaxed" style={{ color: "#5c4a2a" }}>
                  Seus dados são tratados em conformidade com a <strong>LGPD</strong>. Você controla o que é visível publicamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL NOTA ── */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setNoteModal(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl" style={{ background: "#fff", border: BRD }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: "#111", fontFamily: "Georgia, serif" }}>
                {editNote ? "Editar nota" : "Nova nota metodológica"}
              </h3>
              <button onClick={() => setNoteModal(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: BRD, color: "#8b7355" }}>
                <i className="ti ti-x text-xs" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#5c4a2a" }}>Título *</label>
                <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} className={inputCls} style={iStyle} placeholder="Ex: Como trabalhar com comunidades quilombolas" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#5c4a2a" }}>Conteúdo *</label>
                <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} rows={6} className={inputCls + " resize-none"} style={iStyle} placeholder="Descreva orientações, recomendações e aprendizados metodológicos..." />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#5c4a2a" }}>Tags (separadas por vírgula)</label>
                <input value={noteTags} onChange={e => setNoteTags(e.target.value)} className={inputCls} style={iStyle} placeholder="Ex: quilombola, território, conflito" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#5c4a2a" }}>Visibilidade</p>
                  <p className="text-xs" style={{ color: "#8b7355" }}>{notePublic ? "Visível na rede de pesquisadores" : "Apenas você pode ver"}</p>
                </div>
                <Toggle value={notePublic} onChange={() => setNotePublic(v => !v)} accent={accent} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setNoteModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ border: BRD, background: "#faf6ef", color: "#5c4a2a" }}>Cancelar</button>
              <button onClick={saveNote} disabled={!noteTitle || !noteBody} className="flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: accent, color: "#fff" }}>
                {editNote ? "Salvar alterações" : "Publicar nota"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
