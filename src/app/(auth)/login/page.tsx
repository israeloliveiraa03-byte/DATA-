import { signIn } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar — Dataº" };

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex" style={{ background: "#faf6ef" }}>

      {/* ── Lado esquerdo ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-10 relative overflow-hidden" style={{ background: "#faf6ef" }}>

        {/* Mapa de fundo */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#d4b880" strokeWidth="0.6"/>
            </pattern>
          </defs>
          <rect width="600" height="800" fill="url(#grid)"/>

          {/* Curvas de nível */}
          <path d="M0 350 Q150 300 300 340 T600 320" fill="none" stroke="#c4a35a" strokeWidth="1.4" opacity="0.4"/>
          <path d="M0 390 Q150 340 300 380 T600 360" fill="none" stroke="#c4a35a" strokeWidth="1" opacity="0.3"/>
          <path d="M0 430 Q150 380 300 420 T600 400" fill="none" stroke="#c4a35a" strokeWidth="0.7" opacity="0.2"/>

          {/* Ponto A — azul */}
          <circle cx="160" cy="260" r="30" fill="#1a56db" opacity="0.08">
            <animate attributeName="r" values="18;34;18" dur="2.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.08;0.02;0.08" dur="2.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="160" cy="260" r="9" fill="#1a56db" opacity="0.9"/>
          <circle cx="160" cy="260" r="4" fill="#fff"/>

          {/* Ponto B — dourado */}
          <circle cx="340" cy="200" r="30" fill="#b07d20" opacity="0.1">
            <animate attributeName="r" values="18;34;18" dur="3.2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.1;0.03;0.1" dur="3.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="340" cy="200" r="9" fill="#b07d20" opacity="0.9"/>
          <circle cx="340" cy="200" r="4" fill="#fff"/>

          {/* Ponto C — verde */}
          <circle cx="490" cy="300" r="30" fill="#0d9e75" opacity="0.08">
            <animate attributeName="r" values="18;34;18" dur="3.6s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.08;0.02;0.08" dur="3.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="490" cy="300" r="9" fill="#0d9e75" opacity="0.9"/>
          <circle cx="490" cy="300" r="4" fill="#fff"/>

          {/* Pontos menores */}
          <circle cx="260" cy="400" r="6" fill="#1a56db" opacity="0.55"/><circle cx="260" cy="400" r="2.5" fill="#fff"/>
          <circle cx="90"  cy="460" r="6" fill="#b07d20" opacity="0.55"/><circle cx="90"  cy="460" r="2.5" fill="#fff"/>
          <circle cx="530" cy="430" r="6" fill="#0d9e75" opacity="0.55"/><circle cx="530" cy="430" r="2.5" fill="#fff"/>
          <circle cx="400" cy="480" r="5" fill="#1a56db" opacity="0.4"/> <circle cx="400" cy="480" r="2"   fill="#fff"/>
          <circle cx="200" cy="520" r="5" fill="#0d9e75" opacity="0.4"/> <circle cx="200" cy="520" r="2"   fill="#fff"/>

          {/* Linhas conectoras */}
          <line x1="160" y1="260" x2="340" y2="200" stroke="#1a56db" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.3"/>
          <line x1="340" y1="200" x2="490" y2="300" stroke="#b07d20" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.3"/>
          <line x1="160" y1="260" x2="260" y2="400" stroke="#0d9e75" strokeWidth="1"   strokeDasharray="6 4" opacity="0.25"/>
          <line x1="490" y1="300" x2="530" y2="430" stroke="#0d9e75" strokeWidth="0.9" strokeDasharray="6 4" opacity="0.2"/>
          <line x1="260" y1="400" x2="400" y2="480" stroke="#1a56db" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.2"/>
        </svg>

        {/* Conteúdo */}
        <div className="relative z-10">
          <div className="text-xl font-bold tracking-tight" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
            Data<span style={{ color: "#b07d20" }}>º</span>
          </div>
        </div>

        <div className="relative z-10">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "#fff8ec", border: "1px solid #c4a35a", color: "#5c4a2a" }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#b07d20" }} />
            Pesquisa de campo
          </div>

          {/* Título */}
          <h1 className="font-bold leading-tight mb-3"
            style={{ fontSize: "clamp(24px,3vw,34px)", color: "#0a1628", fontFamily: "Georgia, serif", letterSpacing: "-0.6px" }}>
            Dados que<br/>
            <span style={{ color: "#b07d20" }}>fundamentam</span><br/>
            territórios.
          </h1>

          <p className="text-sm font-medium mb-6" style={{ color: "#3d2f1a", lineHeight: 1.75, maxWidth: "300px" }}>
            Plataforma de coleta, sistematização e visualização para pesquisadores, governos e comunidades brasileiras.
          </p>

          {/* Features */}
          <div className="flex flex-col gap-2">
            {[
              { icon: "ti-clipboard-list", label: "Formulários com lógica condicional" },
              { icon: "ti-map-pin",        label: "Dados georreferenciados com IBGE" },
              { icon: "ti-chart-bar",      label: "Dashboards públicos e exportação" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-md"
                style={{ background: "#fff", border: "1px solid #d4b880" }}>
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: "#b07d20" }}>
                  <i className={`ti ${item.icon} text-white`} style={{ fontSize: "12px" }} aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold" style={{ color: "#1a0f00" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#5c4a2a" }}>
          <i className="ti ti-shield-check" aria-hidden="true" />
          © 2026 Dataº · Em conformidade com a LGPD
        </div>
      </div>

      {/* ── Lado direito ── */}
      <div className="w-full lg:w-[400px] flex-shrink-0 flex items-center justify-center p-8"
        style={{ background: "#ffffff", borderLeft: "1px solid #e8d9c0" }}>
        <div className="w-full max-w-xs">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-2xl font-bold" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
              Data<span style={{ color: "#b07d20" }}>º</span>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#8b5e0a" }}>
            Acesso seguro
          </p>
          <h2 className="text-xl font-bold mb-1" style={{ color: "#0a1628", fontFamily: "Georgia, serif", letterSpacing: "-0.3px" }}>
            Boas-vindas
          </h2>
          <p className="text-sm font-medium mb-5" style={{ color: "#4a3010" }}>
            Entre com sua conta para continuar
          </p>

          {/* Google */}
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
            <button type="submit" className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ border: "1.5px solid #c4a35a", background: "#fff", color: "#1a0f00" }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Entrar com Google
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1" style={{ height: "1px", background: "#d4b880" }} />
            <span className="text-xs font-semibold" style={{ color: "#7a5c20" }}>ou</span>
            <div className="flex-1" style={{ height: "1px", background: "#d4b880" }} />
          </div>

          {/* ORCID */}
          <form action={async () => { "use server"; await signIn("orcid", { redirectTo: "/dashboard" }); }}>
            <button type="submit" className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ border: "1.5px solid #c4a35a", background: "#fff", color: "#1a0f00" }}>
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs font-black"
                style={{ background: "#1b4001", color: "#A6CE39" }}>
                ID
              </div>
              Entrar com ORCID
            </button>
          </form>

          {/* Stats */}
          <div className="flex mt-5 pt-4" style={{ borderTop: "1.5px solid #d4b880" }}>
            {[
              { val: "LGPD",   label: "Conformidade" },
              { val: "Offline", label: "Disponível" },
              { val: "IBGE",   label: "Integrado" },
            ].map((s, i) => (
              <div key={s.label} className="flex-1 text-center" style={{ borderLeft: i > 0 ? "1px solid #d4b880" : "none" }}>
                <p className="text-xs font-bold" style={{ color: "#7a3d00" }}>{s.val}</p>
                <p className="mt-0.5 font-medium" style={{ fontSize: "9px", color: "#5c4a2a" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-4 font-medium leading-relaxed" style={{ fontSize: "9px", color: "#4a3010" }}>
            Ao entrar, você concorda com nossa{" "}
            <a href="/privacidade" className="underline" style={{ color: "#7a3d00" }}>Política de Privacidade</a>{" "}
            em conformidade com a LGPD.
          </p>
        </div>
      </div>
    </div>
  );
}
