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

- Botão "Entrar com ORCID" no login (`(auth)/login/page.tsx`) chama `signIn("orcid", ...)`, mas `src/lib/auth/index.ts` só registra o provider do Google — o ORCID nunca foi configurado (precisa de client ID/secret do ORCID e decisão de Israel sobre isso). Clicar no botão hoje quebra. Descoberto em 2026-07-02 testando o Catálogo de Entidades, não é um bug introduzido agora.
- `DATABASE_URL` no `.env.local` roda em Postgres 18 (Neon), que cria constraints NOT NULL nomeadas (recurso do PG 17+). O `drizzle-kit` do projeto (`^0.27.0`) não reconhece isso e propõe (incorretamente) remover o NOT NULL de quase toda coluna do banco sempre que `npm run db:push` é rodado — **nunca aceitar esse lote de `DROP CONSTRAINT ..._not_null` do prompt do `db:push`**. Até resolver (upgrade de `drizzle-kit`/`drizzle-orm`, não testado ainda), aplicar mudanças de schema aditivas (tabelas/colunas novas) via SQL direto, só com os `CREATE TABLE`/`CREATE TYPE`/`ALTER TABLE ADD CONSTRAINT` relevantes.

Testado ao vivo por Israel em 2026-06-30 na Pesquisa Gênesis (`pesquisa-genesis-mqy406bg`) — cascata geográfica e seleção de opções confirmadas funcionando.

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

## Catálogo Global de Entidades (MVP construído em 2026-07-02)

Hierarquia planejada de longo prazo: País → Estado → Município → Território → Comunidade → Escola → Associação → Projeto → Documento. Entidades são "vivas" — versionadas, com rastreamento temporal (histórico de nome/geometria/vínculos), ID persistente (nunca muda) e espacialidade dinâmica (geometrias oficial, histórica, reivindicada, ambiental). Motor de relações entre entidades forma uma rede de conhecimento. Camada de inteligência territorial (lacunas de informação, entidades sem pesquisa, evolução de indicadores ao longo do tempo) ainda não existe — é evolução futura.

**MVP já funcional** (testado de ponta a ponta em 2026-07-02): schema (`src/lib/db/schema/entities.ts` — tabelas `entities`, `entity_versions`, `research_entities`, `entity_code_counters`), gerador de código persistente (`src/lib/db/entity-code.ts`, ex.: `COM-000001`), API (`/api/entities`, `/api/entities/[id]`, `/api/researches/[id]/entities`) e telas (`/entidades`, `/entidades/nova`, `/entidades/[id]`) com histórico de versões e vínculo entidade↔pesquisa. Só 6 dos 9 tipos da hierarquia existem hoje como `entity_type`: território, comunidade, escola, associação, projeto, documento (País/Estado/Município ficam como campos `stateCode`/`cityCode`/`cityName` na própria entidade, via IBGE, não como entidades separadas ainda).

**Lacuna conhecida**: o vínculo entidade↔pesquisa só aparece na tela da entidade (`/entidades/[id]`) — a tela de detalhe da pesquisa (`researches/[id]/research-page-client.tsx`) ainda não mostra quais entidades estão vinculadas a ela. Não implementado ainda, decisão de quando fazer fica com Israel.

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

## Identidade visual (redesenhada em 2026-07-01 — substitui o azul/slate de 2026-06-30)

A decisão de 2026-06-30 (azul `brand` + slate + Inter puro) durou menos de 24h: Israel trouxe um mockup HTML (`login-cartografico.html`) com uma direção cartográfica — paleta terracota/argila inspirada na malha do IBGE, com Fraunces serifada nos títulos — e pediu para adotar essa paleta em todo o projeto (não só na tela de login). Isso reverte a regra "sem serifada" e "não usar mais Georgia" da versão anterior.

Direção atual: sério e institucional, mas com calor visual (tons de argila/terracota em vez de azul frio), inspirado na estética de malhas territoriais do IBGE. Fundo base ainda claro/branco, texto em slate como neutro, `brand` (agora argila/terracota, base `#c48a42`) como cor primária de chrome/ação, `teal` recolorido para verde-mata (base `#4c6b3c`) como acento de dado, `amber/coral/purple` inalterados, azul (`chart-1`, `#1a56db`) vira acento raro/institucional (ex.: ícones de País/Estado), não mais a cor de chrome. Tipografia: Inter para corpo de texto, **Fraunces** (`font-serif`) para títulos e wordmark em destaques grandes. Cantos moderadamente arredondados, sombras sutis, movimento discreto — isso não mudou.

- **Tokens**: `tailwind.config.ts` — cores `brand` (argila/terracota, primária), `teal` (verde-mata, acento de dado), `amber/coral/purple` (acentos, inalterados), `chart-1..6` (séries de gráfico, `chart-1` = azul institucional raro), `fontFamily.serif` (Fraunces). CSS vars equivalentes em `globals.css`.
- **Fonte serifada**: Fraunces carregada via `next/font/google` em `src/app/layout.tsx` (`--font-serif`), usar `font-serif` nos títulos/wordmarks de destaque. Inter continua sendo o corpo de texto (`font-sans`).
- **Logo**: `src/components/layout/data-logo.tsx` — o "º" de "Dataº" é um SVG com pequenos nós pulsando conectados por linhas, representando dados conectados. Usar `<DataLogo />` em vez de escrever "Data<span>º</span>" à mão. Prop `depth` aplica relevo 3D (Fraunces + `text-shadow` em camadas via classe `.logo-depth` em `globals.css`) — usar só em destaques grandes (hero, login), não no chrome pequeno (sidebar/topbar).
- **Componentes-base**: `src/components/ui/` (`button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`) — usar esses em vez de estilo inline em páginas novas.
- **Botões e sombreamento**:
  - Botões primários e cards de ação (ex.: login social, CTAs) usam sombra em camadas: repouso equivalente a `shadow-sm` (`0 2px 6px rgba(22,23,26,0.06), 0 6px 16px rgba(22,23,26,0.05)`); no hover, elevar com `-translate-y-0.5` e sombra maior (`0 6px 14px rgba(22,23,26,0.10), 0 14px 32px rgba(43,84,184,0.14)` — usa o azul brand em baixa opacidade). No `:active`, voltar a `translate-y-0`.
  - Transição suave em todo botão/card interativo: `transition-all` com curva `cubic-bezier(0.2,0.8,0.2,1)`, ~250ms.
  - Cards de conteúdo (features, métricas) têm sombra sutil em repouso (`shadow-xs`) e ganham `shadow-md` + leve elevação no hover; borda muda para a cor de acento apenas no hover.
  - Cantos moderadamente arredondados (`rounded-xl`/`rounded-2xl`), nunca pill em botões de ação.
  - Respeitar sempre `prefers-reduced-motion` (elevação/animação desativadas — já tratado em `globals.css`).
- **Central de design**: `/design-system` (link na sidebar, grupo "Produto") — referência viva de cores, tipografia, botões, badges, cards e movimento. Ajustar tokens ali reflete no resto do produto.
- **Reskin concluído (2026-07-01)**: dashboard, lista de pesquisas, detalhe de pesquisa, respostas, form-builder, perfil, respondente e território/landing page tinham cor e fonte fixas via `style={{ ... }}` (paleta dourada antiga, `fontFamily: "Georgia, serif"` ou `"Lora, Georgia, serif"` — de antes até do redesenho azul de 2026-06-30). Foi feita uma passada mecânica de recolor (só troca de valor hex/fontFamily, sem mudar estrutura/lógica) mapeando cada cor antiga para o token argila/verde-mata equivalente mais próximo e trocando Georgia/Lora por Fraunces (`var(--font-serif)`). Exceções propositais que **não** foram tocadas: o seletor de cor do perfil (`PALETTE` em `profile-client.tsx`, com opções nomeadas Terracota/Floresta/Oceano/Território/Rio/Rosa — são escolhas independentes do usuário, não o tema do app), cores de logos de terceiros (Google, ORCID, LinkedIn, ResearchGate), e tokens que não mudaram nesta rodada (amber, coral, purple, `chart-1` azul). Sidebar/topbar/botões/cards que já usavam os tokens Tailwind (`brand-*`, `teal-*`) herdaram a paleta automaticamente, sem precisar de reskin manual.

## Mapa do Brasil (elemento visual)

O contorno do Brasil usado como elemento visual (login e telas territoriais) deve vir da malha **oficial do IBGE**, nunca desenhado à mão.

- **Fonte oficial**: API de malhas do IBGE — `https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria`. A mesma API já usada nos campos geográficos (mesorregião/microrregião/município) pode fornecer malhas por UF, região, etc.
- **Como gerar (estático, para login/landing)**: script Node que baixa o GeoJSON, projeta lon/lat para SVG (Y invertido — latitude cresce para cima), simplifica ~1 a cada 5 pontos e descarta anéis com menos de ~40 pontos (remove ilhotas/ruído). Salvar o resultado como asset/componente SVG estático. **Não** buscar da rede em runtime na tela de login — o mapa ali é decorativo e deve carregar instantâneo.
- **Mapas interativos dentro da plataforma** (dashboards, territórios, resultados): usar a malha do IBGE ao vivo com MapLibre/Leaflet — isso é pós-MVP, alinhado ao stack futuro (PostGIS + MapLibre).
- **Conexão com o logo**: do `º` do `<DataLogo />` partem conectivos (linhas azuis, cor brand) até nós posicionados sobre o mapa — a narrativa é o núcleo Dataº irradiando conhecimento para o território. Os nós podem ter pulso sutil; respeitar `prefers-reduced-motion`.
- **Nunca** aproximar o contorno do Brasil manualmente em SVG — fica geograficamente impreciso. Sempre partir da malha oficial.

## Linguagem interna do projeto (terminologia)

Manter consistência de vocabulário em toda a interface, textos e código. O registro é **técnico-institucional**, não comercial/casual.

- **Infraestrutura de conhecimento**, não "ferramenta de formulários" nem "app de survey".
- **Instrumento** (ou "instrumento de coleta") para o formulário de pesquisa; **respondente** para quem preenche; **coleta** para o ato de responder em campo.
- **Entidade** para os objetos de conhecimento (município, comunidade, escola, território) — com **identificador persistente** (ex.: COM-000245). Entidades são **vivas/versionadas**.
- **Pesquisa** = projeto independente (equipe, metodologia, permissões próprias). Nunca confundir Pesquisa, Entidade e Conhecimento — são camadas separadas.
- **Georreferenciamento** e **malha territorial** (termos do IBGE); citar **SIRGAS 2000** e **setor censitário** quando couber, pois são a linguagem oficial.
- **Comunidades tradicionais** como **agentes/coautores produtores de dados**, nunca "sujeitos de pesquisa" nem "objetos de estudo".
- **Dataº Território** = nome próprio do programa social (acesso gratuito para comunidades tradicionais).
- Conformidade sempre referida como **LGPD** / **Lei nº 13.709/2018**.
- Evitar jargão de marketing ("solução completa", "revolucionário"); preferir descrição funcional e precisa.



- GitHub: usuário `israeloliveiraa03-byte`, repositório `DATA-`
- Rota de debug: `/api/debug-form/[id]` para queries diretas de campos no banco

## Como me ajudar (instruções para o Claude Code)

- Israel não é desenvolvedor profissional — explique decisões técnicas de forma direta e didática quando relevante
- Sempre confirme em qual pasta/arquivo a mudança está sendo feita antes de aplicar, para evitar o erro recorrente de arquivo na pasta errada
- Ao mexer em schema do banco (Drizzle), avise se vai ser necessário rodar `npm run db:push` ou reset de schema
- Priorize resolver os bugs ativos listados acima antes de novas funcionalidades, a menos que Israel peça o contrário
- Mantenha a separação conceitual entre Pesquisa, Entidades e Conhecimento em qualquer nova modelagem de dados
