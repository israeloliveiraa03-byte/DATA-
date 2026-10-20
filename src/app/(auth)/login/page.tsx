import { signIn } from "@/lib/auth";
import type { Metadata } from "next";
import Link from "next/link";
import { DataLogo } from "@/components/layout/data-logo";
import { BRAZIL_STATES, BRAZIL_STATES_VIEWBOX, BRAZIL_STATE_CENTROIDS } from "@/components/layout/brazil-states-paths";
import { AccessibilityControls } from "./accessibility-controls";

export const metadata: Metadata = { title: "Entrar" };

// O ORCID só aparece quando as credenciais existem no ambiente — antes o
// botão ficava sempre visível e quebrava ao clicar (provider não registrado,
// ver "Bugs ativos" no CLAUDE.md).
const ORCID_ENABLED = !!process.env.ORCID_CLIENT_ID && !!process.env.ORCID_CLIENT_SECRET;

const POINTS: { uf: string; delay: string }[] = [
  { uf: "MA", delay: "0s" }, { uf: "BA", delay: "0.6s" }, { uf: "PA", delay: "1.2s" },
  { uf: "AL", delay: "1.8s" }, { uf: "MG", delay: "2.4s" }, { uf: "AP", delay: "3s" },
];

const PILLARS = [
  { icon: "ti-fingerprint", title: "Identidade permanente", text: "Cada território, comunidade ou escola registrado uma vez, com código imutável e histórico." },
  { icon: "ti-recycle", title: "Conhecimento que se soma", text: "Pesquisas independentes acumulam conhecimento sobre a mesma entidade." },
  { icon: "ti-heart-handshake", title: "Comunidades como autoras", text: "Povos tradicionais como produtores de dados sobre si — com acesso gratuito." },
];

export default function LoginPage() {
  return (
    <div data-theme="light" className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr] bg-ink-950">
      {/* ── Lado institucional ── */}
      <aside data-theme="dark" className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16 text-white" style={{ background: "#1f3024" }}>
        {/* Malha oficial das UFs (IBGE) com nós de coleta pulsando */}
        <svg viewBox={BRAZIL_STATES_VIEWBOX} className="absolute -right-10 top-1/2 -translate-y-1/2 h-[86%] w-auto opacity-[0.2] pointer-events-none" aria-hidden="true">
          {Object.entries(BRAZIL_STATES).map(([uf, d]) => (
            <path key={uf} d={d} fill="none" stroke="#d6aa62" strokeWidth={0.8} strokeLinejoin="round" />
          ))}
          {POINTS.map(p => {
            const [x, y] = BRAZIL_STATE_CENTROIDS[p.uf];
            return (
              <g key={p.uf}>
                <circle cx={x} cy={y} r={10} fill="#d6aa62" opacity={0.25} className="animate-pulse-soft" style={{ animationDelay: p.delay, transformOrigin: `${x}px ${y}px` }} />
                <circle cx={x} cy={y} r={3.2} fill="#f3e4cb" />
              </g>
            );
          })}
        </svg>

        <div className="relative">
          <Link href="/" aria-label="Dataº — página inicial"><DataLogo className="text-3xl text-white" /></Link>
        </div>

        <div className="relative max-w-lg">
          <p className="kicker mb-5">Infraestrutura de conhecimento</p>
          <h1 className="font-serif text-5xl xl:text-6xl font-semibold leading-[1.03] text-white">
            Dados que <em className="font-normal text-[#d6aa62]">fundamentam</em> territórios.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-white/70">
            Instrumentos de coleta, trabalho de campo sem internet, malha do IBGE e painéis públicos — para pesquisadores, governos e comunidades brasileiras.
          </p>

          <ul className="mt-10 space-y-5">
            {PILLARS.map(p => (
              <li key={p.title} className="flex gap-4">
                <span className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <i className={`ti ${p.icon} text-lg text-[#d6aa62]`} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-white">{p.title}</p>
                  <p className="text-sm text-white/60 leading-relaxed">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-white/45">
          <i className="ti ti-shield-check" aria-hidden="true" /> Em conformidade com a LGPD (Lei nº 13.709/2018) · Referência geodésica SIRGAS 2000
        </p>
      </aside>

      {/* ── Formulário de acesso ── */}
      <main className="flex flex-col px-6 py-10 sm:px-12">
        <div className="lg:hidden mb-10">
          <Link href="/" aria-label="Dataº — página inicial"><DataLogo className="text-3xl text-ink-50" /></Link>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto animate-fade-in">
            <p className="kicker mb-3">Acesso seguro</p>
            <h2 className="font-serif text-4xl font-semibold text-ink-50">Boas-vindas</h2>
            <p className="mt-2 text-base text-ink-300">Entre com sua conta para acessar suas pesquisas.</p>

            <div className="mt-8 space-y-3">
              <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
                <button type="submit" className="w-full h-12 flex items-center justify-center gap-3 rounded-lg border border-ink-700 bg-ink-900 text-sm font-semibold text-ink-50 shadow-xs transition-[border-color,box-shadow] hover:border-ink-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar com Google
                </button>
              </form>

              {ORCID_ENABLED && (
                <form action={async () => { "use server"; await signIn("orcid", { redirectTo: "/dashboard" }); }}>
                  <button type="submit" className="w-full h-12 flex items-center justify-center gap-3 rounded-lg border border-ink-700 bg-ink-900 text-sm font-semibold text-ink-50 shadow-xs transition-[border-color,box-shadow] hover:border-ink-600 hover:shadow-md">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-2xs font-black" style={{ background: "#A6CE39", color: "#fff" }} aria-hidden="true">iD</span>
                    Continuar com ORCID
                  </button>
                </form>
              )}
            </div>

            <dl className="mt-8 grid grid-cols-3 rounded-lg border border-ink-700 bg-ink-900 divide-x divide-ink-700 text-center">
              {[["LGPD", "Conformidade"], ["Offline", "Coleta em campo"], ["IBGE", "Malha oficial"]].map(([v, l]) => (
                <div key={l} className="py-3 px-2">
                  <dt className="text-sm font-semibold text-brand-400">{v}</dt>
                  <dd className="mt-0.5 text-2xs text-ink-500">{l}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 text-xs text-ink-500 leading-relaxed">
              Ao entrar, você concorda com a <Link href="/privacidade" className="link">Política de Privacidade</Link>, em conformidade com a LGPD.
            </p>

            <div className="mt-8 pt-6 border-t border-ink-700">
              <p className="kicker-plain mb-3">Acessibilidade</p>
              <AccessibilityControls />
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-ink-500">
          Organização de comunidade tradicional? <Link href="/territorio" className="link">Conheça o Dataº Território</Link>
        </p>
      </main>
    </div>
  );
}
