import { signIn } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar — Dataº" };

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex" style={{ background: "#0f1b3d" }}>

      {/* ── Lado esquerdo — identidade visual ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden">

        {/* Formas orgânicas de fundo */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="g1" cx="30%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#1a56db" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0f1b3d" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="g2" cx="80%" cy="70%" r="50%">
              <stop offset="0%" stopColor="#0d9e75" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0f1b3d" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="g3" cx="60%" cy="20%" r="40%">
              <stop offset="0%" stopColor="#534ab7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f1b3d" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="720" height="900" fill="#0f1b3d" />
          <ellipse cx="200" cy="250" rx="380" ry="320" fill="url(#g1)" />
          <ellipse cx="580" cy="650" rx="300" ry="280" fill="url(#g2)" />
          <ellipse cx="450" cy="150" rx="250" ry="200" fill="url(#g3)" />
          {/* Linhas decorativas */}
          <path d="M0 400 Q180 320 360 420 T720 380" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
          <path d="M0 500 Q200 420 400 520 T720 480" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <path d="M0 600 Q220 520 440 620 T720 580" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        </svg>

        {/* Conteúdo sobre o fundo */}
        <div className="relative z-10">
          <div className="text-2xl font-medium tracking-tight text-white">
            Data<span style={{ color: "#4785f7" }}>º</span>
          </div>
        </div>

        <div className="relative z-10 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Plataforma de pesquisa de campo
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ letterSpacing: "-0.8px" }}>
            Dados que<br />
            <span style={{ color: "#4785f7" }}>transformam</span><br />
            territórios.
          </h1>

          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Colete, sistematize e visualize dados de campo com a plataforma feita para pesquisadores, governos e comunidades.
          </p>

          {/* Cards de prova social */}
          <div className="mt-8 flex flex-col gap-3">
            {[
              { icon: "ti-clipboard-list", label: "Formulários inteligentes", desc: "18 tipos de campo, lógica condicional e coleta offline" },
              { icon: "ti-map-pin",         label: "Dados georreferenciados",  desc: "Integração com IBGE e mapas interativos" },
              { icon: "ti-chart-bar",       label: "Dashboards públicos",      desc: "Visualizações que qualquer pessoa pode acessar" },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(26,86,219,0.3)" }}>
                  <i className={`ti ${item.icon} text-sm`} style={{ color: "#4785f7" }} />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            © 2026 Dataº · Em conformidade com a LGPD
          </p>
        </div>
      </div>

      {/* ── Lado direito — formulário de login ── */}
      <div className="w-full lg:w-[420px] flex-shrink-0 flex items-center justify-center p-8" style={{ background: "#ffffff" }}>
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-2xl font-medium tracking-tight" style={{ color: "#0f1b3d" }}>
              Data<span style={{ color: "#1a56db" }}>º</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-1" style={{ color: "#0f1b3d", letterSpacing: "-0.5px" }}>
              Boas-vindas
            </h2>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Entre com sua conta para acessar a plataforma.
            </p>
          </div>

          {/* Botão Google */}
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:shadow-md active:scale-[0.99]"
              style={{ background: "#fff", border: "1.5px solid #e5e7eb", color: "#111827" }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "#e5e7eb" }} />
            <span className="text-xs" style={{ color: "#9ca3af" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "#e5e7eb" }} />
          </div>

          {/* Botão ORCID */}
          <form action={async () => { "use server"; await signIn("orcid", { redirectTo: "/dashboard" }); }}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:shadow-md active:scale-[0.99]"
              style={{ background: "#fff", border: "1.5px solid #e5e7eb", color: "#111827" }}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-black" style={{ background: "#A6CE39", color: "#fff" }}>
                ID
              </div>
              Continuar com ORCID
            </button>
          </form>

          {/* Nota LGPD */}
          <p className="text-center text-xs mt-8 leading-relaxed" style={{ color: "#9ca3af" }}>
            Ao entrar, você concorda com nossa{" "}
            <a href="/privacidade" className="underline hover:text-gray-600 transition-colors">
              Política de Privacidade
            </a>{" "}
            em conformidade com a LGPD.
          </p>

          {/* Stats */}
          <div className="mt-8 pt-6 grid grid-cols-3 gap-4" style={{ borderTop: "1px solid #f3f4f6" }}>
            {[
              { val: "100%",  label: "Gratuito para começar" },
              { val: "LGPD",  label: "Em conformidade" },
              { val: "Offline", label: "Coleta offline" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-sm font-bold" style={{ color: "#1a56db" }}>{stat.val}</p>
                <p className="text-2xs mt-0.5 leading-tight" style={{ color: "#9ca3af", fontSize: "10px" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
