import Link from "next/link";
import type { Metadata } from "next";
import { DataLogo } from "@/components/layout/data-logo";

export const metadata: Metadata = {
  title: "Dataº — Plataforma de pesquisa de campo",
  description: "Plataforma brasileira de coleta, sistematização e visualização de dados para pesquisadores, governos e comunidades tradicionais.",
};

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "sans-serif", background: "#f8f5ef" }}>

      {/* ── HERO ── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#f8f5ef", padding: "36px 48px 0", minHeight: "500px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

        {/* SVG de fundo */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 900 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="hg" width="38" height="38" patternUnits="userSpaceOnUse">
              <path d="M 38 0 L 0 0 0 38" fill="none" stroke="#ddd0b8" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="hf" x1="0" y1="0" x2="1" y2="0">
              <stop offset="45%" stopColor="#f8f5ef" stopOpacity="0"/>
              <stop offset="100%" stopColor="#f8f5ef" stopOpacity="1"/>
            </linearGradient>
            <linearGradient id="hfb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="55%" stopColor="#f8f5ef" stopOpacity="0"/>
              <stop offset="100%" stopColor="#f8f5ef" stopOpacity="1"/>
            </linearGradient>
          </defs>
          <rect width="900" height="500" fill="url(#hg)"/>
          {/* Linhas saindo do º */}
          <line x1="156" y1="48" x2="490" y2="82" stroke="#1a56db" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.6"/>
          <line x1="156" y1="48" x2="360" y2="175" stroke="#b07d20" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.6"/>
          <line x1="156" y1="48" x2="620" y2="195" stroke="#0a6e45" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.55"/>
          <line x1="156" y1="48" x2="520" y2="310" stroke="#0d9e75" strokeWidth="1.3" strokeDasharray="7 5" opacity="0.5"/>
          <line x1="156" y1="48" x2="740" y2="130" stroke="#534ab7" strokeWidth="1.2" strokeDasharray="6 5" opacity="0.45"/>
          {/* Rede */}
          <line x1="490" y1="82" x2="360" y2="175" stroke="#b07d20" strokeWidth="1" strokeDasharray="5 4" opacity="0.3"/>
          <line x1="490" y1="82" x2="620" y2="195" stroke="#1a56db" strokeWidth="1" strokeDasharray="5 4" opacity="0.28"/>
          <line x1="360" y1="175" x2="520" y2="310" stroke="#0d9e75" strokeWidth="1" strokeDasharray="5 4" opacity="0.32"/>
          <line x1="620" y1="195" x2="520" y2="310" stroke="#0a6e45" strokeWidth="1" strokeDasharray="5 4" opacity="0.28"/>
          <line x1="740" y1="130" x2="620" y2="195" stroke="#534ab7" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.28"/>
          {/* Pontos — anéis */}
          <circle cx="490" cy="82" r="12" fill="none" stroke="#1a56db" strokeWidth="2.5"/>
          <circle cx="490" cy="82" r="5" fill="#1a56db"/>
          <circle cx="360" cy="175" r="12" fill="none" stroke="#b07d20" strokeWidth="2.5"/>
          <circle cx="360" cy="175" r="5" fill="#b07d20"/>
          <circle cx="620" cy="195" r="12" fill="none" stroke="#0a6e45" strokeWidth="2.5"/>
          <circle cx="620" cy="195" r="5" fill="#0a6e45"/>
          <circle cx="520" cy="310" r="11" fill="none" stroke="#0d9e75" strokeWidth="2.5"/>
          <circle cx="520" cy="310" r="4.5" fill="#0d9e75"/>
          <circle cx="740" cy="130" r="12" fill="none" stroke="#534ab7" strokeWidth="2.5"/>
          <circle cx="740" cy="130" r="5" fill="#534ab7"/>
          <circle cx="680" cy="320" r="8" fill="none" stroke="#8b7355" strokeWidth="1.8" opacity="0.6"/>
          <circle cx="680" cy="320" r="3" fill="#8b7355" opacity="0.5"/>
          <rect width="900" height="500" fill="url(#hf)"/>
          <rect width="900" height="500" fill="url(#hfb)"/>
        </svg>

        {/* Topbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
          <div>
            <DataLogo className="text-3xl" />
            <span style={{ display: "block", width: "24px", height: "2.5px", background: "#1a56db", marginTop: "3px", borderRadius: "2px" }} />
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {["Funcionalidades", "Rede", "Território"].map(l => (
              <a key={l} style={{ fontSize: "11px", fontWeight: 600, color: "#5c4a2a", textDecoration: "none", cursor: "pointer" }}>{l}</a>
            ))}
            <Link href="/login" style={{ background: "#b07d20", color: "#fff", padding: "7px 16px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, textDecoration: "none" }}>
              Começar agora
            </Link>
          </nav>
        </div>

        {/* Headline */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: "460px", paddingTop: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5c4a2a", background: "#fff8ec", border: "1px solid #d4b880", borderRadius: "3px", padding: "3px 10px", marginBottom: "14px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#b07d20", display: "inline-block" }} />
            Plataforma de pesquisa de campo
          </div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "38px", fontWeight: 700, color: "#111", lineHeight: 1.1, letterSpacing: "-0.6px", marginBottom: "14px" }}>
            Dados que<br/><span style={{ color: "#b07d20" }}>fundamentam</span><br/>territórios.
          </h1>
          <p style={{ fontSize: "12px", color: "#5c4a2a", lineHeight: 1.75, fontWeight: 500, maxWidth: "380px", marginBottom: "24px" }}>
            Plataforma brasileira de coleta, sistematização e visualização de dados para pesquisadores, governos e comunidades tradicionais. Em conformidade com a LGPD.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/login" style={{ background: "#b07d20", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
              Criar conta gratuita
            </Link>
            <a style={{ background: "#fff", color: "#5c4a2a", padding: "10px 20px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: "1.5px solid #d4b880", cursor: "pointer", textDecoration: "none" }}>
              Ver funcionalidades
            </a>
          </div>
        </div>

        {/* Cards de funcionalidade */}
        <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", paddingBottom: "32px", marginTop: "28px" }}>
          {[
            { icon: "ti-clipboard-list", bg: "#e8f0fe", color: "#1a56db", title: "Formulários inteligentes", desc: "50+ tipos de campo, coleta offline e GPS" },
            { icon: "ti-map-pin",        bg: "#e1f5ee", color: "#0a6e45", title: "Georreferenciamento IBGE", desc: "Hierarquia territorial completa" },
            { icon: "ti-users",          bg: "#fff8ec", color: "#b07d20", title: "Rede de pesquisadores",  desc: "Colaboração, notas e instrumentos" },
          ].map(f => (
            <div key={f.title} style={{ background: "#fff", border: "1px solid #e8d9c0", borderRadius: "8px", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0, background: f.bg, color: f.color }}>
                <i className={`ti ${f.icon}`} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#111", marginBottom: "2px" }}>{f.title}</strong>
                <span style={{ fontSize: "9px", color: "#8b7355" }}>{f.desc}</span>
              </div>
              <i className="ti ti-chevron-right" style={{ color: "#b07d20", fontSize: "12px", alignSelf: "center", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </section>

      {/* Seals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", padding: "16px 48px", background: "#fff", borderTop: "1px solid #e8d9c0", borderBottom: "1px solid #e8d9c0" }}>
        {[
          { icon: "ti-shield-check", title: "LGPD", desc: "Em conformidade com a Lei Geral de Proteção de Dados" },
          { icon: "ti-wifi-off",     title: "Coleta offline", desc: "Funciona sem internet, sincroniza depois" },
          { icon: "ti-plug",         title: "Integrado ao IBGE", desc: "Estados, municípios e regiões atualizados" },
        ].map(s => (
          <div key={s.title} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <i className={`ti ${s.icon}`} style={{ fontSize: "16px", color: "#b07d20" }} />
            <div>
              <strong style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#111" }}>{s.title}</strong>
              <span style={{ fontSize: "9px", color: "#8b7355" }}>{s.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* FUNCIONALIDADES */}
      <section style={{ padding: "48px", background: "#fff" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#b07d20", marginBottom: "6px" }}>Funcionalidades</p>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "26px", fontWeight: 700, color: "#111", letterSpacing: "-0.4px", marginBottom: "6px" }}>
          Tudo que sua pesquisa <span style={{ color: "#b07d20" }}>precisa</span>
        </h2>
        <p style={{ fontSize: "12px", color: "#5c4a2a", fontWeight: 500, lineHeight: 1.7, maxWidth: "480px", marginBottom: "28px" }}>
          Do campo ao relatório público — em uma única plataforma pensada para a realidade brasileira.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          {[
            { icon: "ti-forms",          bg: "#e8f0fe", color: "#1a56db", title: "Construtor de formulários",    desc: "50+ tipos de campo incluindo escalas, matrizes, GPS, assinatura, NPS e campos geográficos com hierarquia IBGE. Lógica condicional e coleta offline.", tag: "✓ Disponível", tagBg: "#e1f5ee", tagColor: "#0a6e45" },
            { icon: "ti-map-2",          bg: "#e1f5ee", color: "#0a6e45", title: "Biblioteca de territórios",   desc: "Criação colaborativa de territórios com versionamento, pull requests geográficos e atribuição acadêmica automática. Integrado à hierarquia do IBGE.", tag: "⧗ Em desenvolvimento", tagBg: "#fff8ec", tagColor: "#7a3d00" },
            { icon: "ti-chart-dots",     bg: "#fff8ec", color: "#b07d20", title: "Sistematização automática",   desc: "Indicadores e índices calculados a partir das respostas. Suporte a pesos, escalas e fórmulas personalizadas pelo pesquisador.", tag: "⧗ Em desenvolvimento", tagBg: "#fff8ec", tagColor: "#7a3d00" },
            { icon: "ti-layout-dashboard",bg: "#eeedfe",color: "#534ab7", title: "Dashboards públicos",         desc: "Editor visual com mapas, gráficos e tabelas interativas. Dashboards publicáveis com URL própria, sem necessidade de programação.", tag: "⧗ Em desenvolvimento", tagBg: "#fff8ec", tagColor: "#7a3d00" },
          ].map(f => (
            <div key={f.title} style={{ background: "#faf6ef", border: "1px solid #e8d9c0", borderRadius: "10px", padding: "18px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "10px", background: f.bg, color: f.color }}>
                <i className={`ti ${f.icon}`} />
              </div>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#111", marginBottom: "4px", fontFamily: "Georgia, serif" }}>{f.title}</h3>
              <p style={{ fontSize: "10px", color: "#8b7355", lineHeight: 1.6 }}>{f.desc}</p>
              <span style={{ display: "inline-block", fontSize: "8px", fontWeight: 700, padding: "2px 7px", borderRadius: "10px", marginTop: "8px", background: f.tagBg, color: f.tagColor }}>{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* REDE DE PESQUISADORES */}
      <section style={{ padding: "48px", background: "#fff", borderTop: "1px solid #e8d9c0" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#b07d20", marginBottom: "6px" }}>Rede de pesquisadores</p>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "26px", fontWeight: 700, color: "#111", letterSpacing: "-0.4px", marginBottom: "6px" }}>
          Colabore, publique e <span style={{ color: "#b07d20" }}>cresça</span>
        </h2>
        <p style={{ fontSize: "12px", color: "#5c4a2a", fontWeight: 500, lineHeight: 1.7, maxWidth: "480px", marginBottom: "28px" }}>
          O Dataº é também uma rede profissional de pesquisa de campo — onde pesquisadores compartilham metodologias, territórios e projetos.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {[
            { icon: "ti-user-circle",    title: "Perfil público",           desc: "ORCID, Lattes e Google Scholar integrados. Controle total sobre o que é público — pesquisas, projetos e publicações." },
            { icon: "ti-notebook",       title: "Notas metodológicas",      desc: "Publique orientações sobre como conduzir pesquisas em contextos específicos — quilombos, zonas de conflito, populações vulneráveis." },
            { icon: "ti-users-group",    title: "Grupos de pesquisa",       desc: "Organize-se em grupos temáticos com repositório compartilhado de formulários, territórios e instrumentos." },
            { icon: "ti-speakerphone",   title: "Chamadas de colaboração",  desc: "Lance chamadas voluntárias, institucionais ou remuneradas para compor equipes de pesquisa. Gratuito para publicar." },
            { icon: "ti-clipboard-check",title: "Biblioteca de instrumentos",desc: "Formulários validados pela comunidade, reutilizáveis e adaptáveis. Curadoria de destaque disponível no plano pago." },
            { icon: "ti-award",          title: "Reputação científica",     desc: "Indicador de contribuição integrado com ORCID e Lattes. Cada mapa criado e nota publicada gera credibilidade verificável." },
          ].map(f => (
            <div key={f.title} style={{ border: "1px solid #e8d9c0", borderRadius: "10px", padding: "18px", background: "#faf6ef" }}>
              <i className={`ti ${f.icon}`} style={{ fontSize: "22px", color: "#b07d20", marginBottom: "10px", display: "block" }} />
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#111", marginBottom: "4px", fontFamily: "Georgia, serif" }}>{f.title}</h3>
              <p style={{ fontSize: "10px", color: "#8b7355", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TERRITÓRIO */}
      <section style={{ background: "#111", padding: "48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c4a35a", background: "rgba(196,163,90,0.1)", border: "1px solid rgba(196,163,90,0.3)", borderRadius: "3px", padding: "3px 10px", marginBottom: "14px" }}>
              Programa social
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "26px", fontWeight: 700, color: "#f0e6d0", lineHeight: 1.2, letterSpacing: "-0.4px", marginBottom: "12px" }}>
              Dataº <span style={{ color: "#c4a35a" }}>Território</span>
            </h2>
            <p style={{ fontSize: "11px", color: "rgba(240,230,208,0.7)", lineHeight: 1.75, fontWeight: 500, marginBottom: "12px" }}>
              Acesso completo e gratuito à plataforma para instituições representantes de comunidades tradicionais. Porque quem vive no território é quem melhor conhece ele.
            </p>
            <p style={{ fontSize: "11px", color: "rgba(240,230,208,0.7)", lineHeight: 1.75, fontWeight: 500, marginBottom: "12px" }}>
              Quilombolas, indígenas, ribeirinhos, pescadores artesanais, agricultores familiares organizados, povos de terreiro e outros povos tradicionais podem candidatar suas organizações.
            </p>
            <p style={{ fontSize: "10px", color: "rgba(240,230,208,0.4)", marginBottom: "20px", lineHeight: 1.6 }}>
              O número de vagas é calculado para garantir a sustentabilidade da plataforma. Durante a análise da candidatura, a instituição tem acesso gratuito por 30 dias.
            </p>
            <Link href="/territorio" style={{ background: "#b07d20", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              Candidatar minha organização →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            {[
              { icon: "ti-home",   title: "Comunidades quilombolas", desc: "Associações e federações representativas" },
              { icon: "ti-trees",  title: "Povos indígenas",         desc: "Organizações e coordenações territoriais" },
              { icon: "ti-fish",   title: "Pesca artesanal",         desc: "Colônias e associações de pescadores" },
              { icon: "ti-plant",  title: "Agricultura familiar",    desc: "Cooperativas e assentamentos organizados" },
            ].map(c => (
              <div key={c.title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,163,90,0.2)", borderRadius: "8px", padding: "14px" }}>
                <i className={`ti ${c.icon}`} style={{ fontSize: "18px", color: "#c4a35a", marginBottom: "8px", display: "block" }} />
                <strong style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#f0e6d0", marginBottom: "3px" }}>{c.title}</strong>
                <span style={{ fontSize: "9px", color: "rgba(240,230,208,0.55)", lineHeight: 1.5, display: "block" }}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#b07d20", padding: "48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
        <div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "24px", fontWeight: 700, color: "#fff", letterSpacing: "-0.3px", marginBottom: "6px" }}>Comece sua pesquisa hoje</h2>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Gratuito para começar. Login com Google ou ORCID. Sem cartão de crédito.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
          <Link href="/login" style={{ background: "#fff", color: "#b07d20", padding: "10px 20px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
            Criar conta gratuita
          </Link>
          <a style={{ background: "transparent", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: "1.5px solid rgba(255,255,255,0.5)", cursor: "pointer", textDecoration: "none" }}>
            Ver funcionalidades
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#111", padding: "28px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <DataLogo className="text-lg text-white" animated={false} />
          <div style={{ fontSize: "9px", color: "rgba(240,230,208,0.4)", marginTop: "3px" }}>© 2026 Dataº · Em conformidade com a LGPD</div>
        </div>
        <div style={{ display: "flex", gap: "20px" }}>
          {["Política de Privacidade","Termos de Uso","Suporte","Dataº Território"].map(l => (
            <a key={l} style={{ fontSize: "10px", color: "rgba(240,230,208,0.5)", cursor: "pointer", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
