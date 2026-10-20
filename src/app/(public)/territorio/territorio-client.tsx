"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DataLogo } from "@/components/layout/data-logo";

const COMMUNITY_TYPES = [
  "Comunidade quilombola",
  "Povo indígena",
  "Comunidade ribeirinha",
  "Comunidade extrativista",
  "Pescadores artesanais",
  "Agricultores familiares organizados",
  "Povo de terreiro",
  "Comunidade cigana",
  "Assentamento rural",
  "Outra comunidade tradicional",
];

const LEGAL_NATURES = [
  "Associação",
  "Cooperativa",
  "Fundação",
  "Organização indígena",
  "Federação",
  "Outra",
];

type FormData = {
  // Dados jurídicos
  cnpj: string;
  razaoSocial: string;
  naturezaJuridica: string;
  enderecoSede: string;
  municipio: string;
  estado: string;
  // Tipo de comunidade
  tipoComunidade: string;
  outroTipo: string;
  // Descrição
  historico: string;
  territorioAtuacao: string;
  numeroMembros: string;
  // Responsável
  nomeResponsavel: string;
  cpfResponsavel: string;
  cargoResponsavel: string;
  emailResponsavel: string;
  telefoneResponsavel: string;
};

const EMPTY: FormData = {
  cnpj: "", razaoSocial: "", naturezaJuridica: "", enderecoSede: "",
  municipio: "", estado: "", tipoComunidade: "", outroTipo: "",
  historico: "", territorioAtuacao: "", numeroMembros: "",
  nomeResponsavel: "", cpfResponsavel: "", cargoResponsavel: "",
  emailResponsavel: "", telefoneResponsavel: "",
};

const BRD = "1px solid rgb(var(--color-ink-700))";
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: "8px",
  border: BRD, background: "rgb(var(--color-ink-900))", color: "rgb(var(--color-ink-50))",
  fontSize: "13px", outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 700,
  color: "rgb(var(--color-ink-100))", marginBottom: "5px",
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: "14px", fontWeight: 700, color: "rgb(var(--color-ink-50))",
  fontFamily: "var(--font-serif), Georgia, serif", marginBottom: "16px",
  paddingBottom: "8px", borderBottom: BRD,
};

export function TerritorioClient({ loggedIn }: { loggedIn: boolean }) {
  const [form,      setForm]      = useState<FormData>(EMPTY);
  const [sending,   setSending]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors,    setErrors]    = useState<Partial<FormData>>({});

  function set(key: keyof FormData, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Partial<FormData> = {};
    if (!form.cnpj)              e.cnpj             = "Obrigatório";
    if (!form.razaoSocial)       e.razaoSocial       = "Obrigatório";
    if (!form.naturezaJuridica)  e.naturezaJuridica  = "Obrigatório";
    if (!form.enderecoSede)      e.enderecoSede      = "Obrigatório";
    if (!form.municipio)         e.municipio         = "Obrigatório";
    if (!form.estado)            e.estado            = "Obrigatório";
    if (!form.tipoComunidade)    e.tipoComunidade    = "Obrigatório";
    if (!form.historico)         e.historico         = "Obrigatório";
    if (!form.territorioAtuacao) e.territorioAtuacao = "Obrigatório";
    if (!form.numeroMembros)     e.numeroMembros     = "Obrigatório";
    if (!form.nomeResponsavel)   e.nomeResponsavel   = "Obrigatório";
    if (!form.cpfResponsavel)    e.cpfResponsavel    = "Obrigatório";
    if (!form.cargoResponsavel)  e.cargoResponsavel  = "Obrigatório";
    if (!form.emailResponsavel)  e.emailResponsavel  = "Obrigatório";
    if (!form.telefoneResponsavel) e.telefoneResponsavel = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSending(true);
    try {
      const res = await fetch("/api/territorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Erro ao enviar candidatura."); return; }
      setSubmitted(true);
    } catch {
      toast.error("Erro de conexão ao enviar candidatura.");
    } finally {
      setSending(false);
    }
  }

  // Tela de confirmação
  if (submitted) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "rgb(var(--color-ink-950))", padding: "24px" }}>
      <div style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgb(var(--color-brand-50))", border: "2px solid rgb(var(--color-brand-200))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <i className="ti ti-check" style={{ fontSize: "32px", color: "rgb(var(--color-brand-500))" }} />
        </div>
        <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "24px", fontWeight: 700, color: "rgb(var(--color-ink-50))", marginBottom: "12px" }}>
          Solicitação enviada!
        </h1>
        <p style={{ fontSize: "14px", color: "rgb(var(--color-ink-100))", lineHeight: 1.75, marginBottom: "8px" }}>
          Recebemos a candidatura de <strong>{form.razaoSocial}</strong> ao programa Dataº Território.
        </p>
        <p style={{ fontSize: "14px", color: "rgb(var(--color-ink-100))", lineHeight: 1.75, marginBottom: "24px" }}>
          Nossa equipe irá analisar as informações e entrará em contato com <strong>{form.emailResponsavel}</strong> em breve.
        </p>
        <div style={{ background: "rgb(var(--color-ink-950))", border: "1px solid rgb(var(--color-ink-600))", borderRadius: "12px", padding: "20px", marginBottom: "28px" }}>
          <i className="ti ti-hourglass" style={{ fontSize: "24px", color: "rgb(var(--color-brand-500))", display: "block", marginBottom: "8px" }} />
          <p style={{ fontSize: "13px", fontWeight: 700, color: "rgb(var(--color-ink-50))", marginBottom: "4px" }}>
            Candidatura em análise
          </p>
          <p style={{ fontSize: "12px", color: "rgb(var(--color-ink-100))", lineHeight: 1.6 }}>
            Nossa equipe vai avaliar as informações enviadas. Quando aprovada, o acesso institucional gratuito é liberado direto na sua conta.
          </p>
        </div>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgb(var(--color-brand-500))", color: "#fff", padding: "12px 24px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
          <i className="ti ti-arrow-right" /> Ir para o painel
        </Link>
        <div style={{ marginTop: "16px" }}>
          <Link href="/" style={{ fontSize: "12px", color: "rgb(var(--color-brand-500))", textDecoration: "underline" }}>
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );

  // Candidatura precisa estar vinculada a uma conta de verdade — é o que
  // permite aprovar direto na conta certa depois (plan = "territorio"),
  // em vez de só arquivar um formulário solto.
  if (!loggedIn) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "rgb(var(--color-ink-950))", padding: "24px" }}>
      <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
        <DataLogo className="text-2xl" />
        <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "22px", fontWeight: 700, color: "rgb(var(--color-ink-50))", margin: "20px 0 12px" }}>
          Entre na sua conta primeiro
        </h1>
        <p style={{ fontSize: "14px", color: "rgb(var(--color-ink-100))", lineHeight: 1.75, marginBottom: "24px" }}>
          A candidatura ao Dataº Território fica vinculada à sua conta — assim, quando aprovada, o acesso institucional gratuito já é liberado direto nela.
        </p>
        <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgb(var(--color-brand-500))", color: "#fff", padding: "12px 24px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
          <i className="ti ti-arrow-right" /> Entrar ou criar conta
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ background: "rgb(var(--color-ink-950))", minHeight: "100dvh" }}>

      {/* Header */}
      <header style={{ background: "rgb(var(--color-ink-900))", borderBottom: BRD, padding: "16px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <DataLogo className="text-2xl" />
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgb(var(--color-ink-100))", background: "rgb(var(--color-ink-950))", border: "1px solid rgb(var(--color-ink-600))", borderRadius: "3px", padding: "3px 10px" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgb(var(--color-brand-500))", display: "inline-block" }} />
          Programa social
        </div>
      </header>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Título */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "28px", fontWeight: 700, color: "rgb(var(--color-ink-50))", letterSpacing: "-0.4px", marginBottom: "8px" }}>
            Candidatura ao Dataº <span style={{ color: "rgb(var(--color-brand-500))" }}>Território</span>
          </h1>
          <p style={{ fontSize: "13px", color: "rgb(var(--color-ink-100))", lineHeight: 1.75 }}>
            Preencha o formulário abaixo para candidatar sua organização ao programa de acesso gratuito. Enquanto a candidatura é avaliada, sua conta tem <strong>30 dias de acesso completo</strong>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* 1. Dados jurídicos */}
          <div style={{ background: "rgb(var(--color-ink-900))", border: BRD, borderRadius: "12px", padding: "24px" }}>
            <p style={sectionTitleStyle}>
              <i className="ti ti-building" style={{ color: "rgb(var(--color-brand-500))", marginRight: "8px" }} />
              Dados jurídicos da organização
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={labelStyle}>CNPJ *</label>
                <input value={form.cnpj} onChange={e => set("cnpj", e.target.value)}
                  placeholder="00.000.000/0001-00" style={{ ...inputStyle, borderColor: errors.cnpj ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.cnpj && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.cnpj}</p>}
              </div>
              <div>
                <label style={labelStyle}>Natureza jurídica *</label>
                <select value={form.naturezaJuridica} onChange={e => set("naturezaJuridica", e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.naturezaJuridica ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }}>
                  <option value="">Selecione...</option>
                  {LEGAL_NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                {errors.naturezaJuridica && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.naturezaJuridica}</p>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Razão social *</label>
                <input value={form.razaoSocial} onChange={e => set("razaoSocial", e.target.value)}
                  placeholder="Nome oficial da organização" style={{ ...inputStyle, borderColor: errors.razaoSocial ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.razaoSocial && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.razaoSocial}</p>}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Endereço da sede *</label>
                <input value={form.enderecoSede} onChange={e => set("enderecoSede", e.target.value)}
                  placeholder="Rua, número, bairro" style={{ ...inputStyle, borderColor: errors.enderecoSede ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.enderecoSede && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.enderecoSede}</p>}
              </div>
              <div>
                <label style={labelStyle}>Município *</label>
                <input value={form.municipio} onChange={e => set("municipio", e.target.value)}
                  placeholder="Nome do município" style={{ ...inputStyle, borderColor: errors.municipio ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.municipio && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.municipio}</p>}
              </div>
              <div>
                <label style={labelStyle}>Estado (UF) *</label>
                <select value={form.estado} onChange={e => set("estado", e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.estado ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }}>
                  <option value="">Selecione...</option>
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
                {errors.estado && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.estado}</p>}
              </div>
            </div>
          </div>

          {/* 2. Tipo de comunidade */}
          <div style={{ background: "rgb(var(--color-ink-900))", border: BRD, borderRadius: "12px", padding: "24px" }}>
            <p style={sectionTitleStyle}>
              <i className="ti ti-users" style={{ color: "rgb(var(--color-brand-500))", marginRight: "8px" }} />
              Tipo de comunidade
            </p>
            <label style={labelStyle}>Selecione o tipo de comunidade que sua organização representa *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "12px" }}>
              {COMMUNITY_TYPES.map(type => (
                <button key={type} onClick={() => set("tipoComunidade", type)}
                  style={{ padding: "10px 12px", borderRadius: "8px", textAlign: "left", fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                    border: form.tipoComunidade === type ? "2px solid rgb(var(--color-brand-500))" : BRD,
                    background: form.tipoComunidade === type ? "rgb(var(--color-ink-950))" : "rgb(var(--color-ink-950))",
                    color: form.tipoComunidade === type ? "rgb(var(--color-amber-600))" : "rgb(var(--color-ink-100))",
                  }}>
                  {type}
                </button>
              ))}
            </div>
            {errors.tipoComunidade && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))" }}>{errors.tipoComunidade}</p>}
            {form.tipoComunidade === "Outra comunidade tradicional" && (
              <div style={{ marginTop: "8px" }}>
                <label style={labelStyle}>Descreva o tipo de comunidade</label>
                <input value={form.outroTipo} onChange={e => set("outroTipo", e.target.value)}
                  placeholder="Ex: Comunidade de fundo de pasto" style={inputStyle} />
              </div>
            )}
          </div>

          {/* 3. Descrição */}
          <div style={{ background: "rgb(var(--color-ink-900))", border: BRD, borderRadius: "12px", padding: "24px" }}>
            <p style={sectionTitleStyle}>
              <i className="ti ti-file-description" style={{ color: "rgb(var(--color-brand-500))", marginRight: "8px" }} />
              Sobre a organização
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Histórico e missão da organização *</label>
                <textarea value={form.historico} onChange={e => set("historico", e.target.value)}
                  rows={4} placeholder="Descreva brevemente a história e a missão da organização..."
                  style={{ ...inputStyle, resize: "vertical", borderColor: errors.historico ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.historico && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.historico}</p>}
              </div>
              <div>
                <label style={labelStyle}>Território de atuação *</label>
                <textarea value={form.territorioAtuacao} onChange={e => set("territorioAtuacao", e.target.value)}
                  rows={3} placeholder="Descreva a região ou território onde a organização atua..."
                  style={{ ...inputStyle, resize: "vertical", borderColor: errors.territorioAtuacao ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.territorioAtuacao && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.territorioAtuacao}</p>}
              </div>
              <div style={{ maxWidth: "200px" }}>
                <label style={labelStyle}>Número aproximado de membros *</label>
                <input type="number" value={form.numeroMembros} onChange={e => set("numeroMembros", e.target.value)}
                  placeholder="Ex: 150" style={{ ...inputStyle, borderColor: errors.numeroMembros ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.numeroMembros && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.numeroMembros}</p>}
              </div>
            </div>
          </div>

          {/* 4. Responsável */}
          <div style={{ background: "rgb(var(--color-ink-900))", border: BRD, borderRadius: "12px", padding: "24px" }}>
            <p style={sectionTitleStyle}>
              <i className="ti ti-user-check" style={{ color: "rgb(var(--color-brand-500))", marginRight: "8px" }} />
              Responsável pela inscrição
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nome completo *</label>
                <input value={form.nomeResponsavel} onChange={e => set("nomeResponsavel", e.target.value)}
                  placeholder="Nome do responsável" style={{ ...inputStyle, borderColor: errors.nomeResponsavel ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.nomeResponsavel && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.nomeResponsavel}</p>}
              </div>
              <div>
                <label style={labelStyle}>CPF *</label>
                <input value={form.cpfResponsavel} onChange={e => set("cpfResponsavel", e.target.value)}
                  placeholder="000.000.000-00" style={{ ...inputStyle, borderColor: errors.cpfResponsavel ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.cpfResponsavel && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.cpfResponsavel}</p>}
              </div>
              <div>
                <label style={labelStyle}>Cargo na organização *</label>
                <input value={form.cargoResponsavel} onChange={e => set("cargoResponsavel", e.target.value)}
                  placeholder="Ex: Presidente, Coordenador" style={{ ...inputStyle, borderColor: errors.cargoResponsavel ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.cargoResponsavel && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.cargoResponsavel}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.emailResponsavel} onChange={e => set("emailResponsavel", e.target.value)}
                  placeholder="contato@organizacao.org.br" style={{ ...inputStyle, borderColor: errors.emailResponsavel ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.emailResponsavel && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.emailResponsavel}</p>}
              </div>
              <div>
                <label style={labelStyle}>Telefone / WhatsApp *</label>
                <input value={form.telefoneResponsavel} onChange={e => set("telefoneResponsavel", e.target.value)}
                  placeholder="(00) 00000-0000" style={{ ...inputStyle, borderColor: errors.telefoneResponsavel ? "rgb(var(--color-coral-500))" : "rgb(var(--color-ink-700))" }} />
                {errors.telefoneResponsavel && <p style={{ fontSize: "12px", color: "rgb(var(--color-coral-500))", marginTop: "3px" }}>{errors.telefoneResponsavel}</p>}
              </div>
            </div>
          </div>

          {/* Aviso LGPD */}
          <div style={{ background: "rgb(var(--color-ink-950))", border: BRD, borderRadius: "10px", padding: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <i className="ti ti-shield-check" style={{ fontSize: "18px", color: "rgb(var(--color-brand-500))", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "11px", color: "rgb(var(--color-ink-100))", lineHeight: 1.7 }}>
              Os dados informados serão utilizados exclusivamente para análise e validação da candidatura ao programa Dataº Território, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>. Não compartilhamos suas informações com terceiros.
            </p>
          </div>

          {/* Botão */}
          <button onClick={handleSubmit} disabled={sending}
            style={{ width: "100%", padding: "14px", background: sending ? "rgb(var(--color-gold))" : "rgb(var(--color-brand-500))", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <i className={`ti ${sending ? "ti-loader-2" : "ti-send"}`} style={{ animation: sending ? "spin 1s linear infinite" : "none" }} />
            {sending ? "Enviando solicitação..." : "Enviar candidatura"}
          </button>

          <p style={{ textAlign: "center", fontSize: "11px", color: "rgb(var(--color-ink-500))" }}>
            Já tem uma conta?{" "}
            <Link href="/login" style={{ color: "rgb(var(--color-brand-500))", textDecoration: "underline" }}>Fazer login</Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
