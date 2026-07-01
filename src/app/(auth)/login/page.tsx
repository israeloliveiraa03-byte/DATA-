import { signIn } from "@/lib/auth";
import type { Metadata } from "next";
import { DataLogo } from "@/components/layout/data-logo";
import { BRAZIL_MAP_PATH } from "@/components/layout/brazil-map-outline";

export const metadata: Metadata = { title: "Entrar — Dataº" };

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex bg-white">

      {/* ── Lado esquerdo ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-10 relative overflow-hidden bg-slate-900">

        {/* Malha do território + rede de conhecimento irradiando do logo */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#1e293b" strokeWidth="0.6"/>
            </pattern>
          </defs>
          <rect width="600" height="800" fill="url(#grid)"/>

          {/* Contorno oficial do Brasil (malha IBGE) — ver src/components/layout/brazil-map-outline.tsx */}
          <g transform="translate(120,200) scale(0.82)" opacity="0.4">
            <path d={BRAZIL_MAP_PATH} fill="#1a56db" fillOpacity="0.05" stroke="#4785f7" strokeWidth="1.2" strokeLinejoin="round"/>
          </g>

          {/* Conectivos do núcleo Dataº (º do logo) até nós sobre o território */}
          <line x1="70" y1="50" x2="330.5" y2="525.6" stroke="#4785f7" strokeWidth="1" strokeDasharray="6 4" opacity="0.3"/>
          <line x1="70" y1="50" x2="232.3" y2="249.0" stroke="#0d9e75" strokeWidth="1" strokeDasharray="6 4" opacity="0.3"/>
          <line x1="70" y1="50" x2="473.1" y2="432.6" stroke="#ba7517" strokeWidth="1" strokeDasharray="6 4" opacity="0.3"/>
          <line x1="70" y1="50" x2="180.3" y2="289.5" stroke="#534ab7" strokeWidth="1" strokeDasharray="6 4" opacity="0.3"/>
          <line x1="70" y1="50" x2="296.8" y2="490.3" stroke="#0d9e75" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.22"/>

          {/* Nós pulsando sobre o território */}
          <circle cx="330.5" cy="525.6" r="26" fill="#4785f7" opacity="0.1">
            <animate attributeName="r" values="16;30;16" dur="2.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.1;0.02;0.1" dur="2.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="330.5" cy="525.6" r="7" fill="#4785f7" opacity="0.9"/>
          <circle cx="330.5" cy="525.6" r="3" fill="#fff"/>

          <circle cx="232.3" cy="249.0" r="26" fill="#0d9e75" opacity="0.12">
            <animate attributeName="r" values="16;30;16" dur="3.2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.12;0.03;0.12" dur="3.2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="232.3" cy="249.0" r="7" fill="#0d9e75" opacity="0.9"/>
          <circle cx="232.3" cy="249.0" r="3" fill="#fff"/>

          <circle cx="473.1" cy="432.6" r="26" fill="#ba7517" opacity="0.1">
            <animate attributeName="r" values="16;30;16" dur="3.6s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.1;0.02;0.1" dur="3.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="473.1" cy="432.6" r="7" fill="#ba7517" opacity="0.9"/>
          <circle cx="473.1" cy="432.6" r="3" fill="#fff"/>

          <circle cx="180.3" cy="289.5" r="20" fill="#534ab7" opacity="0.1">
            <animate attributeName="r" values="12;22;12" dur="3.1s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.1;0.02;0.1" dur="3.1s" repeatCount="indefinite"/>
          </circle>
          <circle cx="180.3" cy="289.5" r="5.5" fill="#534ab7" opacity="0.85"/>
          <circle cx="180.3" cy="289.5" r="2.5" fill="#fff"/>

          <circle cx="296.8" cy="490.3" r="5" fill="#0d9e75" opacity="0.4"/>
          <circle cx="296.8" cy="490.3" r="2" fill="#fff"/>
        </svg>

        {/* Conteúdo */}
        <div className="relative z-10">
          <DataLogo className="text-xl text-white" />
        </div>

        <div className="relative z-10 animate-fade-in">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md mb-3 text-xs font-semibold uppercase tracking-widest bg-white/5 border border-white/10 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-brand-400" />
            Pesquisa de campo
          </div>

          {/* Título */}
          <h1 className="font-bold leading-tight mb-3 text-white" style={{ fontSize: "clamp(24px,3vw,34px)", letterSpacing: "-0.6px" }}>
            Dados que<br/>
            <span className="text-brand-400">fundamentam</span><br/>
            territórios.
          </h1>

          <p className="text-sm font-medium mb-6 text-slate-400" style={{ lineHeight: 1.75, maxWidth: "300px" }}>
            Plataforma de coleta, sistematização e visualização para pesquisadores, governos e comunidades brasileiras.
          </p>

          {/* Features */}
          <div className="flex flex-col gap-2">
            {[
              { icon: "ti-clipboard-list", label: "Formulários com lógica condicional" },
              { icon: "ti-map-pin",        label: "Dados georreferenciados com IBGE" },
              { icon: "ti-chart-bar",      label: "Dashboards públicos e exportação" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-md bg-white/5 border border-white/10">
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-brand-500">
                  <i className={`ti ${item.icon} text-white`} style={{ fontSize: "12px" }} aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-slate-200">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <i className="ti ti-shield-check" aria-hidden="true" />
          © 2026 Dataº · Em conformidade com a LGPD
        </div>
      </div>

      {/* ── Lado direito ── */}
      <div className="w-full lg:w-[400px] flex-shrink-0 flex items-center justify-center p-8 bg-white lg:border-l border-slate-200">
        <div className="w-full max-w-xs animate-fade-in">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <DataLogo className="text-2xl justify-center" />
          </div>

          <p className="text-xs font-bold uppercase tracking-widest mb-1 text-brand-600">
            Acesso seguro
          </p>
          <h2 className="text-xl font-bold mb-1 text-slate-900" style={{ letterSpacing: "-0.3px" }}>
            Boas-vindas
          </h2>
          <p className="text-sm font-medium mb-5 text-slate-500">
            Entre com sua conta para continuar
          </p>

          {/* Google */}
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
            <button type="submit" className="btn-elevate w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-900 hover:border-brand-200">
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
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* ORCID */}
          <form action={async () => { "use server"; await signIn("orcid", { redirectTo: "/dashboard" }); }}>
            <button type="submit" className="btn-elevate w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-900 hover:border-brand-200">
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs font-black"
                style={{ background: "#1b4001", color: "#A6CE39" }}>
                ID
              </div>
              Entrar com ORCID
            </button>
          </form>

          {/* Stats */}
          <div className="flex mt-5 pt-4 border-t border-slate-200">
            {[
              { val: "LGPD",   label: "Conformidade" },
              { val: "Offline", label: "Disponível" },
              { val: "IBGE",   label: "Integrado" },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 text-center ${i > 0 ? "border-l border-slate-200" : ""}`}>
                <p className="text-xs font-bold text-brand-700">{s.val}</p>
                <p className="mt-0.5 font-medium text-slate-500" style={{ fontSize: "9px" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <p className="text-center mt-4 font-medium leading-relaxed text-slate-400" style={{ fontSize: "9px" }}>
            Ao entrar, você concorda com nossa{" "}
            <a href="/privacidade" className="underline text-brand-600">Política de Privacidade</a>{" "}
            em conformidade com a LGPD.
          </p>
        </div>
      </div>
    </div>
  );
}
