import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataLogo } from "@/components/layout/data-logo";

export const metadata: Metadata = { title: "Central de Design" };

const brandScale = ["50","100","200","300","400","500","600","700","800","900"] as const;
const chartAccents = [
  { name: "chart-1 · brand",  cls: "bg-chart-1" },
  { name: "chart-2 · teal",   cls: "bg-chart-2" },
  { name: "chart-3 · amber",  cls: "bg-chart-3" },
  { name: "chart-4 · purple", cls: "bg-chart-4" },
  { name: "chart-5 · coral",  cls: "bg-chart-5" },
  { name: "chart-6 · cyan",   cls: "bg-chart-6" },
];
const neutrals = ["white","slate-50","slate-100","slate-200","slate-400","slate-500","slate-700","slate-900"];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 animate-fade-in">
      <h2 className="text-base font-bold text-slate-900 mb-1">{title}</h2>
      {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 rounded-md border border-slate-200 ${className}`} />
      <span className="text-2xs font-medium text-slate-500">{label}</span>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">Central de design</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Identidade Dataº</h1>
        <p className="text-sm text-slate-500 max-w-xl">
          Referência viva dos tokens, componentes e padrões visuais do produto. Ajuste tudo por aqui —
          cores em <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">tailwind.config.ts</code>,
          botões/badges/cards em <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">src/components/ui</code>.
        </p>
      </div>

      <Section title="Logotipo" description="O “º” representa dados conectados — os nós pulsam suavemente, respeitando prefers-reduced-motion.">
        <Card className="p-6 flex items-center gap-8 bg-slate-900 border-slate-800">
          <DataLogo className="text-3xl text-white" />
          <DataLogo className="text-xl text-white" animated={false} />
        </Card>
      </Section>

      <Section title="Cor primária — brand" description="Chrome, ações, links, foco. Tom sério e institucional.">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {brandScale.map(s => <Swatch key={s} label={s} className={`bg-brand-${s}`} />)}
        </div>
      </Section>

      <Section title="Acentos de dados" description="Reservados a gráficos, indicadores e badges de status — nunca em chrome/navegação.">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {chartAccents.map(c => <Swatch key={c.name} label={c.name} className={c.cls} />)}
        </div>
      </Section>

      <Section title="Neutros" description="Fundo, bordas e texto — base sóbria em slate.">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {neutrals.map(n => <Swatch key={n} label={n} className={`bg-${n}`} />)}
        </div>
      </Section>

      <Section title="Tipografia">
        <Card className="p-5 flex flex-col gap-3">
          <p className="text-2xl font-bold text-slate-900">Título grande — 2xl bold</p>
          <p className="text-lg font-bold text-slate-900">Título de seção — lg bold</p>
          <p className="text-sm font-semibold text-slate-900">Rótulo / label — sm semibold</p>
          <p className="text-sm text-slate-600">Corpo de texto padrão — sm regular, para parágrafos e descrições.</p>
          <p className="text-xs text-slate-500">Texto auxiliar / metadado — xs, tom slate-500.</p>
        </Card>
      </Section>

      <Section title="Botões">
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

      <Section title="Badges">
        <Card className="p-5 flex flex-wrap items-center gap-2">
          <Badge variant="default">Padrão</Badge>
          <Badge variant="blue">Azul</Badge>
          <Badge variant="teal">Teal</Badge>
          <Badge variant="amber">Âmbar</Badge>
          <Badge variant="red">Vermelho</Badge>
          <Badge variant="purple">Roxo</Badge>
        </Card>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card hoverable>
            <CardHeader>
              <CardTitle>Card com cabeçalho</CardTitle>
              <CardDescription>Sombra sobe suavemente no hover.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">Conteúdo do card, com padding consistente.</p>
            </CardContent>
          </Card>
          <Card className="p-5 bg-brand-glow">
            <p className="text-sm font-semibold text-slate-900 mb-1">Card com glow</p>
            <p className="text-sm text-slate-600">Gradiente sutil de destaque — usar com moderação, em cards de call-to-action.</p>
          </Card>
        </div>
      </Section>

      <Section title="Movimento" description="Sutil, nunca exagerado — entradas com fade-in, pulso suave em indicadores ao vivo.">
        <Card className="p-5 flex items-center gap-4">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse-soft" />
          <span className="text-sm text-slate-600">Indicador “ao vivo” — animate-pulse-soft</span>
        </Card>
      </Section>
    </div>
  );
}
