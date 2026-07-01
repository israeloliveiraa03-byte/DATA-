# Dataº — Contexto do Projeto

## Visão geral

Dataº é uma infraestrutura de conhecimento científico brasileira — não é apenas uma ferramenta de formulários/survey. A visão fundamental: entidades (municípios, comunidades, escolas, territórios, etc.) são cadastradas uma única vez com identidade permanente (ex: COM-000245) e contribuem para um patrimônio de conhecimento compartilhado entre projetos de pesquisa independentes.

Três conceitos centrais, sempre separados:
1. **Pesquisa** — projeto independente com equipe, metodologia, formulários e permissões próprios
2. **Entidades** — objetos sobre os quais o conhecimento é produzido
3. **Conhecimento** — produzido sobre entidades, não pertence a projetos individuais

## Quem está construindo

Israel da Silva Oliveira — desenvolvedor e empreendedor por trás do Dataº. Estratégia: institucionalização primeiro (parcerias com pesquisadores), depois monetização gradual. Mercado-alvo: universidades brasileiras, ONGs, governos e comunidades territoriais tradicionais (quilombolas, indígenas, ribeirinhas, extrativistas, pescadores artesanais, agricultores familiares, comunidades de terreiro, povos ciganos, assentamentos rurais).

## Stack técnico atual

- Next.js 15.3.6 (App Router) + TypeScript + Tailwind CSS
- Deploy: Vercel
- Drizzle ORM + Neon PostgreSQL (serverless)
- NextAuth v5

**Stack futuro (pós-MVP, reescrita planejada):** NestJS (backend), PostGIS (geoespacial), MapLibre GL, Object Storage, Redis/filas.

## Ambiente de desenvolvimento

- Windows, terminal CMD/PowerShell (não usa WSL)
- Deploy via `git add/commit/push` e `vercel --prod`
- Cache de build do Vercel pode ficar obsoleto → usar `vercel --prod --force` quando necessário
- Mudanças de enum no banco exigem reset do schema Neon: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` seguido de `npm run db:push`

## Funcionalidades já construídas

- **Perfil de pesquisador**: estética afro-tecnológica (fontes Lora/Inter, paleta dourada), upload de foto/capa, seletor de cor, toggle pesquisador/instituição, links acadêmicos com logos reais (ORCID, CNPq, Scholar, ResearchGate, LinkedIn), card de prévia pública, estatísticas, aba de notas, aba de privacidade
- **Campos geográficos com IBGE**: cascata Região → Estado → Mesorregião → Microrregião → Município → Distrito, campo de bairro em texto livre, CEP com auto-preenchimento via ViaCEP
- **Form builder**: campos conectados à API, salvamento confirmado funcionando (persistência no banco)
- Card do programa **Dataº Território** na sidebar

## Bugs ativos / bloqueadores conhecidos

Nenhum no momento. Testado ao vivo por Israel em 2026-06-30 na Pesquisa Gênesis (`pesquisa-genesis-mqy406bg`) — cascata geográfica e seleção de opções confirmadas funcionando.

## Bugs recém-resolvidos

- ~~Página de respondente `/p/[slug]` retornando 404~~ — causa raiz: `page.tsx` da rota tinha sido apagado por engano no commit `b975c5c`. Recriado (`bf4ff28`).
- ~~Preview de formulário não funcional~~ — botão "Preview" no form-builder não tinha `onClick`. Agora abre `/p/[slug]?preview=true` em nova aba (`4a0af11`).
- ~~Confusão entre UUID e slug causando erros de roteamento~~ — auditoria completa não encontrou mistura entre `researches.id` e `researches.slug`. Era sintoma do bug do `page.tsx` apagado.
- ~~Bug crítico de dados em single_choice/multiple_choice~~ — form-builder salva opções como `{id,label,weight}`, mas o respondente lia `opt.value` (sempre `undefined`): toda resposta gravava `undefined` e todas as opções apareciam marcadas ao mesmo tempo (era o que parecia ser "bug do sim/não"). Corrigido para `opt.id` (`c659432`).
- ~~Cascata Região → Estado não filtrava~~ — campo de estado mostrava as 27 UFs sempre, ignorando a região escolhida. Agora usa mapa estático região→UF (`2425da1`).
- ~~"Confusão" entre microrregião e município (ex: Alagoas)~~ — não era bug de dados: o nome oficial IBGE de várias microrregiões é igual ao do município-sede (ex: "Maceió", "Arapiraca"). Adicionada nota explicativa abaixo do campo.

## Tipos de campo implementados na tela do respondente (2026-06-30)

`respondent-client.tsx` foi ampliado de 23 para 35 dos 47 tipos de `field_type` (`researches.ts:7-28`): cpf_cnpj, date_range, slider, semantic_scale, ranking, points_distribution, card_sorting, weighted, consent, geo_zone, matrix, observation, signature, signature_meta — todos usando as mesmas chaves de config que o form-builder já salva (`options`, `matrixRows/Cols`, `rankingItems`, `totalPoints`, `cardCategories/Items`, `semanticLeft/Right`, `zoneOptions`).

## Tipos de campo ainda pendentes (precisam de decisão de Israel antes de implementar)

- `geo_map` — precisa de lib de mapa (Leaflet/MapLibre = dependência nova a decidir)
- `geo_relational` — depende do Catálogo Global de Entidades, que ainda não existe
- `data_table`, `availability` — o form-builder ainda não tem editor de configuração pra eles (só mockup visual); precisa definir a estrutura de dados antes
- `conditional` — é lógica de exibição condicional entre perguntas, não um tipo de resposta; o builder também não tem editor da condição ainda
- Onda 3 (audio, photo_annotation, doc_capture, pairwise, equation, dynamic_consent, field_diary, multi_upload, qr_barcode, bibliography) — marcados `dev: true` no form-builder, nem são selecionáveis lá ainda
- `calculated`, `image`, `location` — nem aparecem como selecionáveis no form-builder hoje

## Erros recorrentes a evitar

- Arquivos caindo na pasta errada — erro mais comum é conteúdo de `page.tsx` trocado entre rotas
- TypeScript "field possibly null" em closures → corrigir criando `const f = field` depois do null check
- Warnings do ESLint viram erros de build no Vercel (variáveis não usadas, tags `<img>`)

## Próxima grande funcionalidade: Catálogo Global de Entidades

Hierarquia: País → Estado → Município → Território → Comunidade → Escola → Associação → Projeto → Documento. Entidades são "vivas" — versionadas, com rastreamento temporal (histórico de nome/geometria/vínculos), ID persistente (nunca muda) e espacialidade dinâmica (geometrias oficial, histórica, reivindicada, ambiental). Motor de relações entre entidades forma uma rede de conhecimento. Camada de inteligência territorial: lacunas de informação, entidades sem pesquisa, evolução de indicadores ao longo do tempo.

## Funcionalidades planejadas (visão de longo prazo)

- **Sistema Colaborativo de Território**: editor de mapas (Leaflet), versionamento estilo Git com conformidade ABNT, pull requests geográficos, forks com atribuição, biblioteca colaborativa de GeoJSON
- **Rede Social de Pesquisa**: perfil público, publicação de mapas/territórios, notas metodológicas, chamadas de colaboração, grupos temáticos, biblioteca de instrumentos avaliada pela comunidade, revisão por pares leve com reputação científica (ORCID/Lattes)
- **Painel Admin**: gestão de usuários/planos, helpdesk, aprovação do programa Dataº Território, métricas da plataforma
- **Governança e Rastreabilidade**: Scientific Ledger com ID permanente, timestamp e hash criptográfico para cada evento relevante; blockchain entra só como camada de certificação pós-MVP (XRPL, Polygon, Hyperledger)
- **IA (longo prazo)**: sugerir entidades existentes, identificar duplicatas no catálogo, auxiliar construção de formulários, sugerir indicadores, interpretar respostas abertas, gerar mapas, detectar inconsistências

## Modelo de negócio

- R$10/mês por projeto de pesquisa ativo (usuários e respostas ilimitados)
- Dashboards publicados gratuitos com anúncios obrigatórios colocados pelo pesquisador
- R$5/mês para dashboards premium sem anúncios
- Biblioteca de território: publicar gera R$1 de desconto por uso de terceiros
- Chamadas de colaboração pagas: Dataº cobra taxa
- Curadoria de biblioteca de instrumentos: paga

**Dataº Território**: acesso gratuito completo para instituições que representam comunidades tradicionais. Vagas calculadas para sustentabilidade (~10% da base pagante como referência). Fundamental para a base ética da plataforma.

## Princípios-chave

- Dataº é infraestrutura, não ferramenta de formulário. O diferencial são entidades de conhecimento permanentes ligadas a territórios — posiciona comunidades tradicionais como produtoras de conhecimento, não sujeitos de pesquisa.
- O maior risco é execução e gestão de escopo, não obsolescência conceitual. Validação focada do MVP antes de expandir escopo é crítico.
- Blockchain entra depois do MVP — rastreabilidade via hash resolve a maior parte da necessidade de auditabilidade científica sem a complexidade do blockchain agora.
- Passe de design unificado vem depois da funcionalidade — identidade visual já está definida e aprovada, mas intencionalmente adiada.

## Identidade visual (aplicar somente quando solicitado — design vem depois da funcionalidade)

Paleta "afro-tecnológica terrosa": fundo areia `#F7F2E8`, areia `#E8D8BE`, barro `#C48A42`, terra `#7A5B3A`, verde floresta `#4C6B3C`, azul dados `#355FC7`, preto `#1C1B18`. Tipografia: Fraunces ou Cormorant Garamond (títulos) + Inter (corpo). Stack de design system: shadcn/ui, Framer Motion, Lucide, next-themes, React Aria, WCAG 2.2 AA.

## Repositório

- GitHub: usuário `israeloliveiraa03-byte`, repositório `DATA-`
- Rota de debug: `/api/debug-form/[id]` para queries diretas de campos no banco

## Como me ajudar (instruções para o Claude Code)

- Israel não é desenvolvedor profissional — explique decisões técnicas de forma direta e didática quando relevante
- Sempre confirme em qual pasta/arquivo a mudança está sendo feita antes de aplicar, para evitar o erro recorrente de arquivo na pasta errada
- Ao mexer em schema do banco (Drizzle), avise se vai ser necessário rodar `npm run db:push` ou reset de schema
- Priorize resolver os bugs ativos listados acima antes de novas funcionalidades, a menos que Israel peça o contrário
- Mantenha a separação conceitual entre Pesquisa, Entidades e Conhecimento em qualquer nova modelagem de dados
