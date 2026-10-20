import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge, ResearchStatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataLogo } from "@/components/layout/data-logo";
import { PageContainer, PageHeader, SectionHeader, StatGrid, EmptyState, Callout } from "@/components/ui/page";

export const metadata: Metadata = { title: "Sistema visual" };

// Referência viva do sistema visual "Confluência" — tudo aqui lê os mesmos
// tokens de src/styles/globals.css e tailwind.config.ts. Trocar o tema em
// Preferências muda esta página junto.

const swatches: { group: string; items: { name: string; cls: string; note?: string }[] }[] = [
  {
    group: "Papel e tinta (ink)",
    items: [
      { name: "ink-950", cls: "bg-ink-950", note: "fundo da página" },
      { name: "ink-900", cls: "bg-ink-900", note: "superfície" },
      { name: "ink-800", cls: "bg-ink-800", note: "hover / elevada" },
      { name: "ink-700", cls: "bg-ink-700", note: "borda" },
      { name: "ink-600", cls: "bg-ink-600", note: "borda forte" },
      { name: "ink-500", cls: "bg-ink-500", note: "texto terciário" },
      { name: "ink-300", cls: "bg-ink-300", note: "texto secundário" },
      { name: "ink-100", cls: "bg-ink-100", note: "texto principal" },
    ],
  },
  {
    group: "Verde institucional (brand)",
    items: [
      { name: "brand-50", cls: "bg-brand-50", note: "fundo de destaque" },
      { name: "brand-200", cls: "bg-brand-200" },
      { name: "brand-400", cls: "bg-brand-400", note: "texto de link" },
      { name: "brand-500", cls: "bg-brand-500", note: "ação primária" },
      { name: "brand-600", cls: "bg-brand-600", note: "hover" },
      { name: "brand-700", cls: "bg-brand-700", note: "faixas institucionais" },
    ],
  },
  {
    group: "Acentos semânticos",
    items: [
      { name: "gold", cls: "bg-gold", note: "rótulos editoriais" },
      { name: "teal-500", cls: "bg-teal-500", note: "em coleta / rio" },
      { name: "amber-500", cls: "bg-amber-500", note: "atenção" },
      { name: "coral-500", cls: "bg-coral-500", note: "erro / terracota" },
      { name: "purple-500", cls: "bg-purple-500" },
    ],
  },
  {
    group: "Séries de gráfico",
    items: [1, 2, 3, 4, 5, 6].map(i => ({ name: `chart-${i}`, cls: `bg-chart-${i}` })),
  },
];

export default function DesignSystemPage() {
  return (
    <PageContainer>
      <PageHeader
        kicker="Equipe Dataº"
        title="Sistema visual Confluência"
        description="Registro editorial-institucional herdado dos painéis de pesquisa com redes quilombolas: papel creme, verde institucional, rótulos dourados, Source Serif 4 nos títulos e Inter no corpo."
        meta={<>
          <span><strong className="text-ink-100">Tokens:</strong> src/styles/globals.css</span>
          <span><strong className="text-ink-100">Tailwind:</strong> tailwind.config.ts</span>
          <span><strong className="text-ink-100">Componentes:</strong> src/components/ui</span>
        </>}
      />

      <section className="mb-12">
        <SectionHeader kicker="Marca" title="Wordmark" />
        <Card className="p-8 flex flex-wrap items-end gap-10">
          <DataLogo className="text-5xl text-ink-50" depth />
          <DataLogo className="text-3xl text-ink-50" />
          <DataLogo className="text-xl text-ink-50" animated={false} />
        </Card>
      </section>

      <section className="mb-12">
        <SectionHeader kicker="Cor" title="Paleta" description="Todas as cores são variáveis e se ajustam aos temas claro, escuro e alto contraste." />
        <div className="space-y-6">
          {swatches.map(g => (
            <div key={g.group}>
              <p className="kicker-plain mb-2">{g.group}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {g.items.map(s => (
                  <div key={s.name} className="rounded-lg border border-ink-700 bg-ink-900 overflow-hidden">
                    <div className={`h-14 ${s.cls}`} />
                    <div className="px-2.5 py-2">
                      <p className="font-mono text-2xs text-ink-100">{s.name}</p>
                      {s.note && <p className="text-2xs text-ink-500">{s.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <SectionHeader kicker="Tipografia" title="Escala" />
        <Card className="p-6 space-y-4">
          <p className="kicker">Rótulo editorial (.kicker)</p>
          <p className="font-serif text-5xl font-semibold text-ink-50">Título de página — Source Serif 4</p>
          <p className="font-serif text-2xl font-semibold text-ink-50">Título de seção</p>
          <p className="text-base text-ink-100 max-w-prose">Corpo de texto em Inter. Frases curtas, vocabulário técnico-institucional: instrumento, coleta, entidade, georreferenciamento, malha territorial.</p>
          <p className="text-sm text-ink-300">Texto secundário para descrições e metadados.</p>
          <p className="font-mono text-sm text-ink-300">COM-000245 · identificador persistente</p>
        </Card>
      </section>

      <section className="mb-12">
        <SectionHeader kicker="Dados" title="Indicadores" />
        <StatGrid items={[
          { label: "Respostas", value: "1.284", tone: "ink", note: "base: formulários completos" },
          { label: "Escolas", value: "724", tone: "brand" },
          { label: "Em coleta", value: "12", tone: "teal" },
          { label: "Sem água potável", value: "31%", tone: "coral" },
        ]} />
      </section>

      <section className="mb-12 grid lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader kicker="Ação" title="Botões" />
          <Card className="p-6 flex flex-wrap gap-3">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Discreto</Button>
            <Button variant="danger">Excluir</Button>
            <Button loading>Salvando</Button>
            <Button size="sm">Pequeno</Button>
            <Button size="lg">Grande</Button>
          </Card>
        </div>
        <div>
          <SectionHeader kicker="Estado" title="Selos" />
          <Card className="p-6 flex flex-wrap gap-2">
            {["draft", "active", "paused", "closed", "published"].map(s => <ResearchStatusBadge key={s} status={s} />)}
            <Badge>Padrão</Badge><Badge variant="teal">Rio</Badge><Badge variant="amber">Atenção</Badge><Badge variant="red">Erro</Badge><Badge variant="outline">Contorno</Badge>
          </Card>
        </div>
      </section>

      <section className="mb-12 grid lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader kicker="Entrada" title="Campos" />
          <Card className="p-6 space-y-4">
            <Input label="Nome da comunidade" placeholder="Ex.: Quilombo Mumbaça" required />
            <Input label="Buscar" iconLeft="ti-search" placeholder="Buscar entidade" />
            <Input label="Código IBGE" error="Código precisa ter 7 dígitos" defaultValue="27043" />
          </Card>
        </div>
        <div>
          <SectionHeader kicker="Leitura" title="Notas e cartões" />
          <div className="space-y-3">
            <Callout title="Como ler" icon="ti-info-circle">Percentuais calculados sobre quem respondeu à pergunta; a base aparece ao passar o cursor.</Callout>
            <Callout title="Cuidado na leitura" icon="ti-alert-triangle" tone="warn">Estados com menos de 10 respostas têm estimativas instáveis.</Callout>
            <Card>
              <CardHeader><CardTitle>Cartão</CardTitle><CardDescription>Cabeçalho, conteúdo e rodapé opcionais.</CardDescription></CardHeader>
              <CardContent><p className="text-sm text-ink-300">Superfície branca, borda de 1px e sombra leve.</p></CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader kicker="Vazio" title="Estado vazio" />
        <EmptyState icon="ti-map-pin-plus" title="Nenhuma entidade vinculada" description="Vincule comunidades, escolas ou territórios para acompanhar o conhecimento produzido sobre cada lugar." action={<Button size="sm">Vincular entidade</Button>} />
      </section>
    </PageContainer>
  );
}
