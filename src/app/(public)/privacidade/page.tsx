import type { Metadata } from "next";
import Link from "next/link";
import { DataLogo } from "@/components/layout/data-logo";

export const metadata: Metadata = { title: "Política de Privacidade — Dataº" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-2 font-serif">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link href="/"><DataLogo className="text-lg" /></Link>
        <Link href="/login" className="text-xs font-semibold text-brand-600 hover:underline">Voltar ao login</Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">Conformidade LGPD</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2 font-serif">Política de Privacidade</h1>
        <p className="text-xs text-slate-400 mb-8">
          Última atualização: julho de 2026 · Em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais)
        </p>

        <Section title="1. Quem trata seus dados">
          <p>
            O Dataº é uma infraestrutura de conhecimento científico que conecta pesquisadores, instituições e
            territórios. Existem dois papéis distintos, com responsabilidades diferentes sobre os dados:
          </p>
          <p>
            <strong>O Dataº</strong> é o <strong>operador</strong> da plataforma — processa os dados conforme as
            instruções de quem cria cada pesquisa, e é o <strong>controlador</strong> dos dados de cadastro
            (perfil de pesquisador, conta, autenticação).
          </p>
          <p>
            <strong>O pesquisador ou instituição</strong> que cria uma pesquisa é o <strong>controlador</strong> dos
            dados coletados <em>dentro daquela pesquisa</em> — é quem define o instrumento, decide o que perguntar,
            e é responsável por como usa as respostas obtidas. O Dataº não acessa nem usa esses dados de resposta
            para finalidade própria.
          </p>
        </Section>

        <Section title="2. Quais dados coletamos">
          <p><strong>Dados de conta e perfil:</strong> nome, e-mail, foto, instituição, links acadêmicos (ORCID, Lattes) — fornecidos por você ao criar seu perfil de pesquisador.</p>
          <p><strong>Dados de autenticação:</strong> login é feito via Google (OAuth) — não armazenamos sua senha do Google, apenas as informações básicas de perfil que você autoriza no momento do login.</p>
          <p><strong>Dados de pesquisa:</strong> respostas de instrumentos de coleta, incluindo, quando o pesquisador configurar o instrumento pra isso, dados de localização/georreferenciamento (coordenadas GPS, município, estado). Esses dados pertencem à pesquisa que os coletou e são de responsabilidade do pesquisador que a conduz.</p>
          <p><strong>Dados de entidades:</strong> informações sobre municípios, territórios, comunidades, escolas e outras entidades cadastradas no Catálogo Global — nome, identificador persistente, geometria territorial, vínculos com pesquisas. Esse é conhecimento de caráter público/institucional, não dado pessoal de indivíduo.</p>
        </Section>

        <Section title="3. Comunidades tradicionais como agentes, não sujeitos">
          <p>
            O Dataº parte do princípio de que comunidades tradicionais (quilombolas, indígenas, ribeirinhas,
            extrativistas, pescadores artesanais, agricultores familiares, comunidades de terreiro, povos ciganos,
            assentamentos rurais, entre outras) são <strong>agentes e coautoras</strong> do conhecimento produzido
            sobre seus territórios — nunca objetos de estudo. Isso orienta como pedimos consentimento e como
            estruturamos o acesso aos dados territoriais na plataforma.
          </p>
        </Section>

        <Section title="4. Para que usamos os dados">
          <p>Operar a plataforma (autenticação, salvar e exibir pesquisas, formulários e dashboards); permitir que pesquisadores publiquem dashboards e formulários; manter o Catálogo Global de Entidades como patrimônio de conhecimento compartilhado; cumprir obrigações legais quando aplicável.</p>
          <p>Não vendemos dados pessoais a terceiros, nem usamos dados de resposta de pesquisa para publicidade.</p>
        </Section>

        <Section title="5. Seus direitos como titular de dados">
          <p>Conforme a LGPD, você tem direito a: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; e eliminação dos dados tratados com consentimento.</p>
          <p>Para exercer esses direitos sobre seus <strong>dados de conta/perfil</strong>, use a aba de privacidade no seu perfil ou entre em contato conosco. Para dados coletados <strong>dentro de uma pesquisa específica</strong>, o pedido deve ser direcionado ao pesquisador responsável por aquela pesquisa, já que ele é o controlador desses dados.</p>
        </Section>

        <Section title="6. Retenção e exclusão">
          <p>Dados de conta são mantidos enquanto sua conta estiver ativa. Ao excluir uma pesquisa, ela deixa de aparecer nas listagens, mas os dados não são apagados de forma irreversível de imediato — mantemos uma janela de recuperação antes da remoção definitiva, para proteger contra exclusões acidentais.</p>
        </Section>

        <Section title="7. Segurança">
          <p>Os dados são armazenados em infraestrutura de banco de dados gerenciada (PostgreSQL via Neon), com controle de acesso por autenticação e verificação de propriedade em cada operação — cada pesquisador só acessa suas próprias pesquisas e o que foi explicitamente compartilhado ou publicado.</p>
        </Section>

        <Section title="8. Contato">
          <p>Dúvidas sobre esta política ou pedidos relacionados aos seus dados pessoais podem ser enviados diretamente ao responsável pela plataforma através dos canais de contato informados no seu perfil ou no rodapé da página inicial.</p>
        </Section>
      </div>
    </div>
  );
}
