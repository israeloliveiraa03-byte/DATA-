import Link from "next/link";
import type { Metadata } from "next";
import { DataLogo } from "@/components/layout/data-logo";
import { buttonClasses } from "@/components/ui/button";
import { PanelPreview } from "@/components/marketing/panel-preview";

export const metadata: Metadata = {
  title: "Dataº — Do instrumento de coleta ao painel público",
  description: "Infraestrutura brasileira de conhecimento para pesquisa e territórios: instrumentos de coleta, coleta offline, georreferenciamento IBGE e painéis públicos que se atualizam a cada resposta.",
};

const NAV = [
  { href: "#ciclo", label: "Como funciona" },
  { href: "#paineis", label: "Painéis" },
  { href: "#rede", label: "Rede" },
  { href: "#territorio", label: "Dataº Território" },
];

const CYCLE = [
  {
    n: "01", icon: "ti-forms", title: "Instrumento",
    text: "Mais de 30 tipos de campo — escalas, matrizes, assinatura, GPS e cascata geográfica do IBGE — com lógica condicional e seções.",
  },
  {
    n: "02", icon: "ti-device-mobile", title: "Coleta",
    text: "Link público, equipe de campo com papéis e aplicativo que funciona sem internet e sincroniza ao reconectar.",
  },
  {
    n: "03", icon: "ti-git-merge", title: "Sistematização",
    text: "Cruzamentos entre perguntas, indicadores por território e vínculo de cada resposta a entidades com identificador persistente.",
  },
  {
    n: "04", icon: "ti-world", title: "Publicação",
    text: "Painéis públicos com mapas coropléticos, gráficos e filtros — atualizados a cada nova resposta, sem republicar.",
  },
];

const PANEL_TYPES = [
  { icon: "ti-clipboard-data", title: "Coleta primária", text: "O instrumento aplicado no Dataº gera o painel automaticamente: cada resposta recalcula indicadores e mapas.", status: "Disponível" },
  { icon: "ti-article", title: "Narrativo", text: "Visualizações intercaladas com texto editorial — um relatório vivo, com títulos, notas de leitura e imagens.", status: "Disponível" },
  { icon: "ti-arrows-cross", title: "Cruzamentos", text: "Compare grupos dentro da pesquisa: categoria × categoria, barras agrupadas, distribuições e divergências.", status: "Disponível" },
  { icon: "ti-table-import", title: "Dados importados", text: "Bases externas (INEP, IBGE, Fundação Palmares) em CSV ou XLSX transformadas em painel, com fonte e data citadas.", status: "Em desenvolvimento" },
];

const AUDIENCES = [
  { icon: "ti-building-bank", label: "Universidades e grupos de pesquisa" },
  { icon: "ti-users-group", label: "Movimentos sociais e redes" },
  { icon: "ti-building-community", label: "Prefeituras e secretarias" },
  { icon: "ti-plant-2", label: "Comunidades tradicionais" },
];

export default function LandingPage() {
  return (
    <div data-theme="light" className="min-h-dvh bg-ink-950 text-ink-100">
      {/* ── Navegação ── */}
      <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-950/80 backdrop-blur supports-[backdrop-filter]:bg-ink-950/65">
        <div className="max-w-page mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="text-ink-50" aria-label="Dataº — início"><DataLogo className="text-2xl" /></Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-300" aria-label="Seções">
            {NAV.map(n => <a key={n.href} href={n.href} className="hover:text-ink-50 transition-colors">{n.label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonClasses("ghost", "sm", "hidden sm:inline-flex")}>Entrar</Link>
            <Link href="/login" className={buttonClasses("primary", "sm")}>Começar gratuitamente</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <svg className="motif-roots absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M60,600 C90,520 40,470 90,400 C120,350 90,300 140,260" />
          <path d="M60,600 C100,540 130,530 150,470 C165,430 210,420 220,360" />
          <path d="M60,600 C40,530 70,490 40,430 C20,390 40,350 15,300" />
          <path d="M150,470 C180,455 195,420 230,415" />
          <path d="M90,400 C60,385 55,355 20,350" />
        </svg>
        <div className="relative max-w-page mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <p className="kicker mb-5">Infraestrutura de conhecimento · pesquisa e territórios</p>
            <h1 className="font-serif text-5xl sm:text-6xl font-semibold text-ink-50 leading-[1.02]">
              Do instrumento de coleta ao <span className="italic text-brand-400">painel público</span>, num só lugar.
            </h1>
            <p className="mt-6 text-lg text-ink-300 leading-relaxed max-w-xl">
              O Dataº une criação de instrumentos, coleta em campo — inclusive sem internet —, georreferenciamento pela malha do IBGE e painéis que se atualizam a cada resposta. Feito para a realidade da pesquisa brasileira.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className={buttonClasses("primary", "lg")}>
                Criar conta gratuita <i className="ti ti-arrow-right" aria-hidden="true" />
              </Link>
              <a href="#ciclo" className={buttonClasses("secondary", "lg")}>Ver como funciona</a>
            </div>
            <dl className="mt-10 grid grid-cols-3 max-w-lg border-t border-ink-700 pt-5 gap-4">
              {[["30+", "tipos de campo"], ["5.570", "municípios na malha IBGE"], ["Offline", "coleta sem internet"]].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-serif text-2xl font-semibold text-ink-50">{v}</dd>
                  <dd className="mt-0.5 text-xs text-ink-500 leading-snug">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <PanelPreview />
        </div>
      </section>

      {/* ── Para quem ── */}
      <section className="border-y border-ink-700 bg-ink-900">
        <div className="max-w-page mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <p className="kicker-plain">Pensado para</p>
          {AUDIENCES.map(a => (
            <span key={a.label} className="inline-flex items-center gap-2 text-sm font-medium text-ink-300">
              <i className={`ti ${a.icon} text-lg text-brand-500`} aria-hidden="true" /> {a.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Ciclo da pesquisa ── */}
      <section id="ciclo" className="scroll-mt-20 max-w-page mx-auto px-4 sm:px-8 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="kicker mb-3">O ciclo completo</p>
          <h2 className="font-serif text-4xl font-semibold text-ink-50 leading-tight">Cada etapa da pesquisa conversa com a seguinte.</h2>
          <p className="mt-4 text-base text-ink-300 leading-relaxed">Sem exportar planilhas entre ferramentas: o que é coletado já chega estruturado, georreferenciado e pronto para virar indicador público.</p>
        </div>
        <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ink-700 border border-ink-700 rounded-2xl overflow-hidden">
          {CYCLE.map(c => (
            <li key={c.n} className="bg-ink-900 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="w-11 h-11 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center"><i className={`ti ${c.icon} text-xl`} aria-hidden="true" /></span>
                <span className="font-serif text-3xl text-ink-500/80 font-semibold tabular" aria-hidden="true">{c.n}</span>
              </div>
              <h3 className="mt-5 font-serif text-xl font-semibold text-ink-50">{c.title}</h3>
              <p className="mt-2 text-sm text-ink-300 leading-relaxed">{c.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Tipos de painel ── */}
      <section id="paineis" className="scroll-mt-20 bg-ink-900 border-y border-ink-700">
        <div className="max-w-page mx-auto px-4 sm:px-8 py-20 sm:py-24 grid lg:grid-cols-[0.9fr_1.1fr] gap-12">
          <div>
            <p className="kicker mb-3">Painéis</p>
            <h2 className="font-serif text-4xl font-semibold text-ink-50 leading-tight">Dados públicos com o rigor de uma publicação.</h2>
            <p className="mt-4 text-base text-ink-300 leading-relaxed">
              O registro editorial dos painéis nasceu da prática de pesquisa com redes quilombolas: indicadores com base declarada, notas de leitura, fontes citadas e mapas pela malha oficial do IBGE.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-ink-300">
              {["Mapas coropléticos por UF e por município", "Filtros que recortam o painel inteiro ao mesmo tempo", "Versão empilhada e legível no celular", "Tema claro ou escuro, capa e paleta próprias"].map(t => (
                <li key={t} className="flex gap-2.5"><i className="ti ti-circle-check text-lg text-brand-500 flex-shrink-0" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {PANEL_TYPES.map(p => (
              <div key={p.title} className="rounded-xl border border-ink-700 bg-ink-950 p-6">
                <div className="flex items-start justify-between gap-3">
                  <i className={`ti ${p.icon} text-2xl text-gold`} aria-hidden="true" />
                  <span className={`text-2xs font-semibold rounded-full px-2 py-0.5 border ${p.status === "Disponível" ? "bg-brand-50 text-brand-400 border-brand-500/25" : "bg-ink-800 text-ink-500 border-ink-700"}`}>{p.status}</span>
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-ink-50">{p.title}</h3>
                <p className="mt-1.5 text-sm text-ink-300 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rede e entidades ── */}
      <section id="rede" className="scroll-mt-20 max-w-page mx-auto px-4 sm:px-8 py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="kicker mb-3">Conhecimento que se acumula</p>
          <h2 className="font-serif text-4xl font-semibold text-ink-50 leading-tight">Cada território registrado uma vez. Cada pesquisa somando ao que já se sabe.</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { icon: "ti-fingerprint", title: "Identificador persistente", text: "Comunidades, escolas e territórios recebem um código permanente (ex.: COM-000245), com histórico de nomes, limites e vínculos." },
            { icon: "ti-map-pin-cog", title: "Geometria viva", text: "Desenhe limites, pontos e trilhas sobre o mapa ou capture o contorno caminhando em campo, com GPS ponto a ponto." },
            { icon: "ti-notebook", title: "Rede de pesquisa", text: "Notas metodológicas, chamadas de colaboração e um mapa geral em que cada um decide o que é visível — oculto por padrão." },
          ].map(f => (
            <div key={f.title} className="border-t-2 border-gold/60 pt-5">
              <i className={`ti ${f.icon} text-2xl text-brand-500`} aria-hidden="true" />
              <h3 className="mt-3 font-serif text-xl font-semibold text-ink-50">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-300 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dataº Território ── */}
      <section id="territorio" data-theme="dark" className="scroll-mt-20 bg-brand-700 text-ink-100" style={{ background: "#24382a" }}>
        <div className="max-w-page mx-auto px-4 sm:px-8 py-20 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="kicker mb-3">Programa social</p>
            <h2 className="font-serif text-4xl font-semibold text-white leading-tight">Dataº Território</h2>
            <p className="mt-4 text-base text-white/75 leading-relaxed">
              Acesso completo e gratuito para organizações que representam comunidades tradicionais — porque quem vive no território é quem produz o conhecimento sobre ele. Comunidades como coautoras dos dados, não como objeto de estudo.
            </p>
            <Link href="/territorio" className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-[#24382a] hover:bg-white/90 transition-colors">
              Candidatar minha organização <i className="ti ti-arrow-right" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px rounded-2xl overflow-hidden border border-white/15 bg-white/15">
            {[
              { icon: "ti-home-heart", title: "Comunidades quilombolas", text: "Associações e federações" },
              { icon: "ti-trees", title: "Povos indígenas", text: "Organizações e coordenações" },
              { icon: "ti-fish", title: "Pesca artesanal", text: "Colônias e associações" },
              { icon: "ti-plant", title: "Agricultura familiar", text: "Cooperativas e assentamentos" },
            ].map(c => (
              <div key={c.title} className="p-6" style={{ background: "#2a4231" }}>
                <i className={`ti ${c.icon} text-2xl text-gold`} aria-hidden="true" />
                <p className="mt-3 font-semibold text-white">{c.title}</p>
                <p className="mt-0.5 text-sm text-white/60">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chamada final ── */}
      <section className="max-w-page mx-auto px-4 sm:px-8 py-20">
        <div className="rounded-2xl border border-ink-700 bg-ink-900 shadow-sm px-6 sm:px-12 py-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-serif text-3xl font-semibold text-ink-50">Comece pela próxima pesquisa.</h2>
            <p className="mt-2 text-base text-ink-300">Gratuito para começar, com login pelo Google. Seus dados seguem a LGPD (Lei nº 13.709/2018).</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={buttonClasses("primary", "lg")}>Criar conta gratuita</Link>
            <Link href="/territorio" className={buttonClasses("secondary", "lg")}>Conhecer o Território</Link>
          </div>
        </div>
      </section>

      {/* ── Rodapé ── */}
      <footer className="border-t border-ink-700 bg-ink-900">
        <div className="max-w-page mx-auto px-4 sm:px-8 py-10 grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <DataLogo className="text-2xl text-ink-50" animated={false} />
            <p className="mt-3 text-sm text-ink-500 max-w-sm">Infraestrutura brasileira de conhecimento para pesquisa e territórios.</p>
          </div>
          <div>
            <p className="kicker-plain mb-3">Plataforma</p>
            <ul className="space-y-2 text-sm text-ink-300">
              <li><a href="#ciclo" className="hover:text-ink-50">Como funciona</a></li>
              <li><a href="#paineis" className="hover:text-ink-50">Painéis</a></li>
              <li><Link href="/login" className="hover:text-ink-50">Entrar</Link></li>
            </ul>
          </div>
          <div>
            <p className="kicker-plain mb-3">Institucional</p>
            <ul className="space-y-2 text-sm text-ink-300">
              <li><Link href="/territorio" className="hover:text-ink-50">Dataº Território</Link></li>
              <li><Link href="/privacidade" className="hover:text-ink-50">Política de privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-ink-700">
          <p className="max-w-page mx-auto px-4 sm:px-8 py-4 text-xs text-ink-500">© {new Date().getFullYear()} Dataº · Em conformidade com a LGPD</p>
        </div>
      </footer>
    </div>
  );
}
