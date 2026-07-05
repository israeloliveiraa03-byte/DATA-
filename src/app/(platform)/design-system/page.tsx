import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge, ResearchStatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataLogo } from "@/components/layout/data-logo";

export const metadata: Metadata = { title: "Central de Design" };

// Escala neutra "Observatório" — papel/tinta. Muda com o modo de cor em /settings.
const inkScale = [
  { name: "ink-50",  cls: "bg-ink-50"  },
  { name: "ink-100", cls: "bg-ink-100" },
  { name: "ink-300", cls: "bg-ink-300" },
  { name: "ink-500", cls: "bg-ink-500" },
  { name: "ink-700", cls: "bg-ink-700" },
  { name: "ink-800", cls: "bg-ink-800" },
  { name: "ink-900", cls: "bg-ink-900" },
  { name: "ink-950", cls: "bg-ink-950" },
];

const brandScale = [
  { name: "brand-50",  cls: "bg-brand-50"  },
  { name: "brand-100", cls: "bg-brand-100" },
  { name: "brand-400", cls: "bg-brand-400" },
  { name: "brand-500", cls: "bg-brand-500" },
  { name: "brand-600", cls: "bg-brand-600" },
  { name: "brand-700", cls: "bg-brand-700" },
];

const statusAccents = [
  { name: "teal-500",   cls: "bg-teal-500"   },
  { name: "amber-500",  cls: "bg-amber-500"  },
  { name: "coral-500",  cls: "bg-coral-500"  },
  { name: "purple-500", cls: "bg-purple-500" },
];

const chartSeries = [
  { name: "chart-1", cls: "bg-chart-1" },
  { name: "chart-2", cls: "bg-chart-2" },
  { name: "chart-3", cls: "bg-chart-3" },
  { name: "chart-4", cls: "bg-chart-4" },
  { name: "chart-5", cls: "bg-chart-5" },
  { name: "chart-6", cls: "bg-chart-6" },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 animate-fade-in">
      <h2 className="text-base font-bold font-condensed text-ink-100 mb-1">{title}</h2>
      {description && <p className="text-sm text-ink-300 mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 rounded-md border border-ink-700 ${className}`} />
      <span className="text-2xs font-medium text-ink-300 font-mono">{label}</span>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-1">Central de design</p>
          <h1 className="text-2xl font-bold font-condensed text-ink-100 mb-1">Identidade Dataº — Observatório</h1>
          <p className="text-sm text-ink-300 max-w-xl">
            Referência viva dos tokens, componentes e padrões visuais do produto. Ajuste tudo por aqui —
            cores em <code className="text-xs bg-ink-800 px-1 py-0.5 rounded font-mono">tailwind.config.ts</code> e{" "}
            <code className="text-xs bg-ink-800 px-1 py-0.5 rounded font-mono">globals.css</code>,
            botões/badges/cards/inputs em <code className="text-xs bg-ink-800 px-1 py-0.5 rounded font-mono">src/components/ui</code>.
            O modo de cor, contraste, tamanho de texto e densidade são preferências de quem usa, em{" "}
            <code className="text-xs bg-ink-800 px-1 py-0.5 rounded font-mono">/settings</code>.
          </p>
        </div>

        <Section title="Logotipo" description="O “º” representa dados conectados — os nós pulsam suavemente, respeitando prefers-reduced-motion. Usar sempre <DataLogo />, nunca escrever a wordmark à mão.">
          <Card className="p-6 flex items-center gap-8 flex-wrap">
            <DataLogo className="text-3xl text-ink-100" />
            <DataLogo className="text-xl text-ink-100" animated={false} />
          </Card>
        </Section>

        <Section title="Papel e tinta — escala ink" description="Neutros ligados a variável CSS: fundo (950/900/800), borda (700/500), texto (300 auxiliar, 100 principal). Invertem no modo claro sem trocar classe.">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {inkScale.map(s => <Swatch key={s.name} label={s.name} className={s.cls} />)}
          </div>
        </Section>

        <Section title="Acento de ação — brand" description="Verde-dado, o único acento de chrome/ação: botão primário, link ativo, foco. Usar com disciplina; texto sobre preenchimento sólido é on-accent.">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {brandScale.map(s => <Swatch key={s.name} label={s.name} className={s.cls} />)}
          </div>
        </Section>

        <Section title="Acentos de status" description="Reservados a badges de status e indicadores — nunca em navegação/chrome.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {statusAccents.map(s => <Swatch key={s.name} label={s.name} className={s.cls} />)}
          </div>
        </Section>

        <Section title="Séries de gráfico" description="Paleta multi-categoria pra dados, calibrada pra fundo escuro.">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {chartSeries.map(s => <Swatch key={s.name} label={s.name} className={s.cls} />)}
          </div>
        </Section>

        <Section title="Tipografia" description="IBM Plex Sans no corpo, IBM Plex Sans Condensed (font-condensed) em títulos e rótulos de seção, IBM Plex Mono em códigos e identificadores.">
          <Card className="p-5 flex flex-col gap-3">
            <p className="text-2xl font-bold font-condensed text-ink-100">Título de página — 2xl bold condensed</p>
            <p className="text-base font-bold font-condensed text-ink-100">Título de seção — base bold condensed</p>
            <p className="text-sm font-semibold text-ink-100">Rótulo / label — sm semibold</p>
            <p className="text-sm text-ink-300">Corpo de texto padrão — sm regular, para parágrafos e descrições.</p>
            <p className="text-xs text-ink-300">Texto auxiliar / metadado — xs, tom ink-300.</p>
            <p className="text-xs font-mono text-ink-300">Identificador persistente — COM-000245 (mono)</p>
          </Card>
        </Section>

        <Section title="Botões" description="Troca seca de cor no hover, sem elevação 3D. Estado de carregamento com pontinhos (ThinkingDots).">
          <Card className="p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Primário</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Destrutivo</Button>
              <Button variant="primary" loading>Carregando</Button>
              <Button variant="primary" disabled>Desabilitado</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Pequeno</Button>
              <Button size="md">Médio</Button>
              <Button size="lg">Grande</Button>
            </div>
          </Card>
        </Section>

        <Section title="Badges" description="Status sempre com rótulo em texto, nunca só cor.">
          <Card className="p-5 flex flex-wrap items-center gap-2">
            <Badge variant="default">Padrão</Badge>
            <Badge variant="blue">Brand</Badge>
            <Badge variant="teal">Teal</Badge>
            <Badge variant="amber">Âmbar</Badge>
            <Badge variant="red">Coral</Badge>
            <Badge variant="purple">Roxo</Badge>
            <ResearchStatusBadge status="active" />
            <ResearchStatusBadge status="draft" />
          </Card>
        </Section>

        <Section title="Campos de entrada" description="Input com label, dica e erro embutidos — usar em vez de input solto.">
          <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nome da pesquisa" placeholder="Ex.: Pesquisa Gênesis" hint="Como aparece pro respondente" />
            <Input label="E-mail" iconLeft="ti-mail" placeholder="voce@instituicao.br" error="E-mail inválido" />
          </Card>
        </Section>

        <Section title="Cards" description="Profundidade vem de borda + camada de fundo, não de sombra pesada. Padding via .card-pad responde à densidade escolhida em /settings.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card hoverable>
              <CardHeader>
                <CardTitle>Card com cabeçalho</CardTitle>
                <CardDescription>Borda ganha tom brand no hover.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-300">Conteúdo do card, com padding consistente.</p>
              </CardContent>
            </Card>
            <div className="text-center py-8 px-4 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
              <i className="ti ti-inbox text-3xl block mb-2 text-ink-500" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink-100 mb-1">Estado vazio padrão</p>
              <p className="text-xs text-ink-300 mb-4">Sempre orienta a próxima ação, nunca só “sem dados”.</p>
              <Button size="sm"><i className="ti ti-plus" /> Ação sugerida</Button>
            </div>
          </div>
        </Section>

        <Section title="Movimento" description="Seco e discreto — fade-in curto em entradas, pulso em indicadores ao vivo. Sempre respeitando prefers-reduced-motion e a opção “Reduzir movimento” de /settings.">
          <Card className="p-5 flex items-center gap-4">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse-soft" />
            <span className="text-sm text-ink-300">Indicador “ao vivo” — animate-pulse-soft</span>
          </Card>
        </Section>
      </div>
    </div>
  );
}
