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
- Leaflet + react-leaflet + leaflet-draw (desde 2026-07-02, só na captação de localização de território/comunidade — mapa base OpenStreetMap, carregado via `next/dynamic({ ssr:false })`, não é a malha oficial do IBGE nem MapLibre)
- react-moveable (arrastar/redimensionar livre no dashboard-builder) e react-globe.gl (globo 3D, Three.js por baixo) — mesma regra do Leaflet: **sempre** `next/dynamic({ ssr:false })`, nunca import estático (já causou crash em produção uma vez, ver "Erros recorrentes")

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

- ~~Dashboard-builder: "imagens somem ou estão cortadas"~~ — causa raiz era `leaflet/dist/leaflet.css` nunca carregado nas rotas de dashboard; corrigido centralizando o import em `map-common.tsx` durante o pacote de modernização de mapas/gráficos de 2026-07-04/05 (não estava mais pendente, só o registro no CLAUDE.md que ficou desatualizado até a auditoria de 2026-07-07).

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

**MVP já funcional** (testado de ponta a ponta em 2026-07-02): schema (`src/lib/db/schema/entities.ts` — tabelas `entities`, `entity_versions`, `research_entities`, `entity_code_counters`), gerador de código persistente (`src/lib/db/entity-code.ts`, ex.: `COM-000001`), API (`/api/entities`, `/api/entities/[id]`, `/api/researches/[id]/entities`) e telas (`/entidades`, `/entidades/nova`, `/entidades/[id]`) com histórico de versões e vínculo entidade↔pesquisa — visível dos dois lados: na entidade (`entidade-detail-client.tsx`) e agora também na pesquisa (`research-page-client.tsx`, card "Entidades vinculadas" na coluna lateral, mesmo endpoint `/api/researches/[id]/entities`). 8 dos 9 tipos da hierarquia existem hoje como `entity_type`: território, comunidade, escola, associação, projeto, documento, região administrativa, pessoa (só Estado/Município ficam como campos `stateCode`/`cityCode`/`cityName` na própria entidade, via IBGE, não como entidades separadas ainda; País nem se aplica aqui).

### Captação de localização por categoria de entidade (2026-07-02)

Cada categoria tem um método de captura próprio, tudo em `entidades/nova/page.tsx` e replicado (visualização + alguma edição) em `entidade-detail-client.tsx`:

- **Território/comunidade**: GPS do dispositivo (`getCurrentPosition`), digitar lat/long, colar coordenadas/link (regex em `src/lib/entities/coordinates.ts`), multi-município via `MunicipalityPicker` (tabela `entity_municipalities`), e marcação no mapa (`PolygonMapEditor`, `src/components/entities/polygon-map-editor.tsx`) salva em `entities.boundary_polygon` (jsonb). Editável depois de criada, tanto a marcação (card "Marcação no mapa" na tela de detalhe) quanto pontos capturados em campo em `/entidades/[id]/campo` (mini-pesquisa de campo: caminhar o limite tocando "Capturar ponto", GPS por ponto).
  - **Atualizado em 2026-07-04** com base num editor de mapas separado que Israel construiu (`geomanager`, React+Leaflet+turf) já testado e funcionando: `PolygonMapEditor` agora desenha ponto/linha/polígono (não só polígono), calcula área (ha/m²) e comprimento (km) de verdade via `@turf/turf`, permite editar/excluir atributos por feição clicada, e importar/exportar GeoJSON. `boundaryPolygon` deixou de ser um array solto `{lat,lng}[]` e virou uma `FeatureCollection` GeoJSON real — uma entidade pode ter o contorno principal do território (`properties.role === "boundary"`) **mais** pontos/trilhas de interesse marcados dentro dele, cada um com seus próprios atributos. `src/lib/entities/geo-format.ts` (`normalizeBoundaryGeo`) converte o formato antigo pro novo na leitura, sem precisar de migração de dado — testado contra a única entidade real já salva no formato antigo (`TER-000001`) antes de subir. A mini-pesquisa de campo substitui só o contorno principal ao salvar, preservando pontos de interesse já marcados no editor de mesa. Fora de escopo por ora: importar CSV/KML/GPX/Shapefile (só GeoJSON), camadas nomeadas múltiplas — o projeto `geomanager` (`C:\Users\Israel\Downloads\geomanager-com-git`) tem essas features prontas se algum dia fizer falta trazer.
- **Região administrativa** (`entity_type` novo): divisões nomeadas com seu próprio conjunto de municípios (tabelas `entity_admin_divisions` + `entity_admin_division_cities`). TODO: biblioteca de regiões reutilizável com atribuição ao criador — tabelas já normalizadas pra isso, extração ainda não implementada.
- **Organização/entidade jurídica** (escola, associação, projeto): documento público obrigatório — CNPJ, CNES, INEP ou outro (`entity_org_documents`). CNPJ busca endereço oficial via BrasilAPI (`/api/entities/cnpj-lookup`, proxy server-side) e grava a resposta em `official_address` (jsonb).
- **Pessoa** (`entity_type` novo): figura pública/histórica é cadastrada normalmente por um pesquisador; pessoa comum só se autocadastra via link de convite único (`entity_person_invites`, 30 dias de validade) em `/convite/[token]` — exige login Google antes de confirmar (é a própria pessoa quem cria o registro, nunca um terceiro).

TODOs deixados explicados no código: limpar um polígono já salvo via UI ainda não tem endpoint dedicado (schema aceita array vazio pra limpar, mas o fluxo de "apagar tudo e salvar" no editor não foi testado a fundo); mini-pesquisa de campo é só captura de pontos GPS por ora, versão com fotos/offline/diário fica pra quando o tipo `field_diary` (Onda 3, ver seção de tipos de campo pendentes) for implementado; verificação avançada de identidade no autocadastro de pessoa não existe (só login Google basta, por ora).

## Dashboard-builder (construído em fases, 2026-07-02 a 2026-07-04)

Editor de dashboards por pesquisa (`/researches/[id]/dashboard-builder/[dashboardId]`), publicável numa página pública própria (`/d/[slug]`, tema claro/escuro e capa customizáveis, sem chrome do Dataº além de um crédito discreto).

**Grade livre**: posicionamento por `x/y/w/h` contínuo (não mais grade de 12 colunas), arrastar/redimensionar via `react-moveable` com guias de alinhamento, multi-seleção (Shift+clique, move/redimensiona em grupo), desfazer/refazer (Ctrl+Z), modelos de início prontos (painel de indicadores, mapa+resumo, relatório narrativo).

**Tipos de widget** (`src/lib/dashboard/types.ts` → `SUPPORTED_WIDGET_TYPES`, motor de agregação em `src/lib/dashboard/aggregate.ts`): número, barra/pizza/rosca (com legenda de cor↔categoria), tabela, texto (+ variantes decorativas: divisória, bloco de cor, ícone — 20 ícones Tabler curados), imagem, mapa de pontos (marcador padrão ou ícone colorido por categoria de escolha), mapa de calor por estado **ou por município** (`granularity: "state"|"city"`, malha oficial do IBGE), cruzamento de dados/crosstab (categoria A × categoria B, contagem ou % linha/coluna), globo 3D interativo (reaproveita os dados de mapa/mapa de calor, sem motor de agregação próprio).

**Paleta de cores por dashboard**: 4 opções curadas (Terracota/Oceano/Verde-mata/Alto contraste), campo `dashboards.color_palette`, afeta todos os widgets do dashboard de uma vez (seletor na seção "Aparência publicada" do editor).

**Biblioteca de figurinhas/imagens** (`user_assets`): todo upload no widget de imagem vira reaproveitável na biblioteca pessoal automaticamente; pesquisador pode autorizar compartilhar com toda a plataforma (biblioteca comunitária, `/api/assets/community`) — nasce privado por padrão.

**Malha municipal do IBGE**: `scripts/fetch-brasil-municipios.mjs` gera `public/geo/brasil-municipios.json` (~5.570 polígonos, coordenadas simplificadas pra ~11m de precisão, arquivo final 3,1MB / ~800KB comprimido) e `scripts/fetch-municipios-lookup.mjs` gera `src/lib/geo/municipios-lookup.json` (nome+UF → código IBGE de 7 dígitos, já que `geo_city` só grava o nome da cidade). Rodar de novo só se a malha do IBGE mudar (não faz parte do build).

**Nota de performance conhecida, não resolvida**: `municipios-lookup.json` (156KB) acaba entrando no bundle JS do próprio editor (client computa `computeWidgetData` direto pra preview ao vivo) — página do editor foi de ~12kB pra ~65kB de JS próprio. Não afeta a página pública (`/d/[slug]`, que calcula no servidor). Resolver direito exigiria tornar `aggregate.ts` assíncrono — mudança maior, não feita ainda.

**Enum `widget_type` do Postgres**: `crosstab` e `globe` foram adicionados via `ALTER TYPE ... ADD VALUE` direto (aditivo, mesmo motivo do bug do drizzle-kit descrito acima) — `src/lib/db/schema/dashboards.ts` só precisa refletir o enum real do banco.

## Páginas/botões pendentes concluídos + sistema de notificação (2026-07-04)

Levantamento completo do projeto (rotas, links, botões) achou 3 páginas linkadas mas inexistentes e alguns botões decorativos — todos resolvidos:

- **Sistema de toast** (`sonner`): `<Toaster />` global em `src/app/layout.tsx` (`src/components/ui/toaster.tsx`), estilizado na paleta terracota, acompanha o modo claro/escuro do `ThemeProvider`. Substituiu os 5 `alert()` nativos que existiam (`polygon-map-editor.tsx`, `form-builder-client.tsx`, `dashboard-builder-client.tsx`) e ganhou `toast.success()` nas ações de salvar/aprovar/responder em todo o projeto daqui pra frente.
- **`/researches/[id]/settings`** — existia link, faltava a página: título/descrição editáveis, os 4 toggles de configuração de coleta (antes só decorativos na página principal), e a Zona de risco (Encerrar/Excluir pesquisa, movida pra cá).
- **`/privacidade`** — conteúdo real alinhado à LGPD, linkada no rodapé do login.
- **QR Code real** do link público do formulário (lib `qrcode`) com download funcional, substituindo o ícone decorativo.
- **Acessibilidade no login** (alto contraste, A+, A-) ligada ao `ThemeProvider` (`src/components/theme/theme-provider.tsx`) que já existia — sem infraestrutura nova.
- Deixados de fora (sem link hoje, dependeriam de decisão maior): `forgot-password`, `register` (só existe login Google), `respondents`.

## Painel Admin + Suporte + Território com aprovação real (2026-07-04)

- **Papel de equipe interna**: `users.role` (`"user"|"support"|"admin"`, coluna `varchar` simples, não enum do Postgres — separado de `plan`, que é nível de cobrança). Injetado na sessão do NextAuth (`src/lib/auth/index.ts`, callback `session()`) — precisou de `src/lib/auth/types.d.ts` (module augmentation) pra tipar `session.user.role`.
- **Sem `middleware.ts`** — proteção em camadas manuais, igual o resto do projeto: `src/app/(platform)/admin/layout.tsx` faz `notFound()` (não `redirect`, não revela a rota) pra quem não é `admin`/`support`. Dentro do admin, seções restritas a `admin` (Usuários, Território) ficam escondidas da navegação pra quem é só `support`.
- **`/admin`** (visão geral): contagens simples — usuários, pesquisas ativas, entidades, candidaturas de Território pendentes, chamados de suporte abertos.
- **`/admin/usuarios`**: lista/busca, trocar `plan` e `role` de qualquer usuário (`PATCH /api/admin/users/[id]`, só `admin`).
- **Dataº Território ganhou aprovação de verdade**: antes, `POST /api/territorio` só fazia `console.log` e devolvia sucesso fake com "30 dias grátis" — não tinha nenhum efeito real. Agora exige login (a candidatura fica vinculada à conta de quem envia, tabela `territorio_applications`) e aprovar em `/admin/territorio` seta `users.plan = "institution"` direto na conta do candidato.
- **Suporte v1** (`/suporte` pro usuário, `/admin/suporte` pra fila): chamado simples — assunto + mensagem + uma resposta do admin/suporte + status (`support_tickets`), sem conversa de múltiplas mensagens ainda.
- **Bootstrap do primeiro admin**: como não existe UI pra promover ninguém antes de existir o primeiro admin, a conta do Israel (`israeloliveiraa03@gmail.com`) foi promovida via script SQL direto (apagado depois de rodar) — dali em diante, promover outros usuários já é possível pela tela `/admin/usuarios`.
## Equipe de pesquisa — colaboradores por pesquisa (2026-07-07)

Fase estrutural adiada desde o pacote de Admin/Suporte (2026-07-04): cada pesquisa passa a ter, além do dono (`researches.ownerId`, inalterado), colaboradores com papel **editor** ou **visualizador**.

- **Modelo de dados**: tabela nova dedicada (`research_members` + `research_member_invites`, `src/lib/db/schema/research-team.ts`), **não** as tabelas `organizations`/`organization_members` que já existiam mortas no schema — aquelas são por organização inteira (papéis `owner|admin|member`), granularidade errada pro que foi pedido aqui (decisão tomada com Israel). `organizations` continua reservada pra uma fase futura de faturamento institucional. Enum `research_role` só tem `editor|viewer` — "dono" nunca vira uma linha em `research_members`, é sempre `researches.ownerId`.
- **Migração**: `scripts/sql/2026-07-07-research-team.sql`, aditiva — já aplicada no Neon de produção em 2026-07-07.
- **Permissão central**: `src/lib/researches/access.ts` (`getResearchAccess`, `canEdit`, `getMyResearches`) — usado em toda API/página que antes comparava só `research.ownerId !== userId`. Regra: leitura é livre pra qualquer papel; escrita (editar formulário/dashboard/configurações, vincular entidade) exige editor ou dono; excluir/encerrar pesquisa e gerenciar equipe é só do dono.
- **Convite por link copiável** (mesmo padrão do autocadastro de pessoa em `/convite/[token]`, não usa e-mail de verdade): `POST /api/researches/[id]/team` gera token, expira em 7 dias; aceite em `/convite-equipe/[token]` exige login Google, sem checagem de e-mail exato (qualquer conta que tiver o link aceita — decisão consciente de simplicidade, igual o convite de pessoa).
- **Corte de escopo desta rodada**: form-builder e dashboard-builder não ganharam modo de leitura de verdade — editor tem acesso igual ao dono nesses dois editores pesados (drag-and-drop, mapas, globo); visualizador é bloqueado na entrada com uma tela "Somente leitura" (`src/components/researches/readonly-notice.tsx`) em vez disso. Fazer um modo read-only de verdade nesses editores é trabalho futuro, se fizer falta.
- **Card "Equipe"** na página da pesquisa (`research-page-client.tsx`, ao lado de "Entidades vinculadas"): lista dono + membros, convite/trocar papel/remover só visível pra quem é dono.

## Fila de sincronização offline — parte 1 implementada (2026-07-04)

Objetivo de longo prazo: app de campo (celular/tablet, via Capacitor — planejado, não construído ainda) capturando resposta e ponto de GPS territorial sem internet. Antes de investir no app, foram corrigidos os passos 1–4 do offline que já existiam pela metade no site:

- **Achado**: `src/lib/hooks/use-offline-storage.ts` já existia (IndexedDB + fila de pendentes + sincronização no evento `online`) mas nunca tinha sido conectado em nenhuma tela — código morto. Tinha dois bugs que explicam por que nunca foi ligado: gerava id com `shortId()` (string curta, incompatível com a coluna `responses.id` que é `uuid`), e qualquer erro (mesmo validação permanente) deixava a resposta pendente pra sempre, tentando de novo a cada reconexão.
- **Corrigido**: `saveOffline` agora gera `crypto.randomUUID()`; `POST /api/forms/[id]/responses` aceita `id` opcional no corpo e usa `.onConflictDoNothing({ target: responses.id })` — reenvio depois de falha de rede confirma que já está salvo em vez de duplicar; o hook classifica erro (4xx sai da fila de retry automático, 5xx/falha de rede continua tentando); `respondent-client.tsx` agora chama `saveOffline` quando `research.offlineEnabled` e sem conexão (ou quando o `fetch` falha no meio do envio), com tela de sucesso e mensagem diferentes pra "salvo neste aparelho, sincroniza sozinho depois". É a primeira vez que o toggle `offlineEnabled` (existia na tela de configuração desde antes, só decorativo) passa a ter efeito real.
- **Registrado como próxima etapa, não implementado ainda**:
  - Endpoint de sincronização em lote (`/api/sync/responses`) — hoje ainda é um `fetch` por resposta pendente, aceitável no volume atual, vira gargalo se acumular centenas
  - Conflito de versão em edição de entidade (`baseVersion` no PATCH de `/api/entities/[id]`, usando `entityVersions.version` que já existe) — só relevante quando `campo-client.tsx` (captura de GPS territorial) ganhar persistência local própria
  - Token de dispositivo (`device_tokens`, nova tabela) — só necessário quando o app Capacitor existir; o hook web de hoje usa cookie de sessão do NextAuth, não precisa disso
  - ~~Upload de mídia~~ — implementado, ver seção abaixo.

Desde então (`a1e813f`), o app Capacitor (`mobile/`) foi construído de fato: SQLite local (`localDb.ts`), `syncWorker.ts` sincronizando `local_responses` em lote contra `/api/sync/responses`, token de dispositivo (`device_tokens`) e `~25` tipos de campo em `FormFillScreen.tsx`.

## Upload de mídia no app de campo — captura foto/arquivo offline (2026-07-06)

Fecha a lacuna que faltava desde a fila de sincronização: os tipos `image`/`file` do formulário agora funcionam no app de campo, com upload assíncrono numa fila própria (`a6577fb`).

- **Vercel Blob** (`@vercel/blob`, instalado na raiz — não existia antes): store `datazero-media`, acesso público (URLs de alta entropia, não exigem token pra visualizar — decisão consciente de simplicidade). `BLOB_READ_WRITE_TOKEN` já configurado nas env vars da Vercel.
- **`POST /api/media/upload`** (novo): multipart/form-data (`file` + `responseId` + `fieldId`), autenticado por `getRequestUserId` (token de dispositivo ou sessão). Valida que a resposta existe e pertence a quem envia, que o campo pertence ao formulário da resposta, e que o MIME é permitido pelo tipo do campo (`image`: jpeg/png/webp; `file`: mais pdf/txt/csv/doc(x)/xls(x)/odt/ods/zip). Limite **4MB** (não 10MB — teto de corpo de requisição de function da Vercel é ~4,5MB). Sobe via `put()` no path `respostas/{responseId}/{fieldId}/{uuid}.{ext}` e devolve a URL pública.
- **`PATCH /api/responses/[id]`** (novo): `{ fieldId, value }` — atualiza só aquela chave dentro do `data` jsonb da resposta já salva (read-modify-write simples, sem migração). Usado pra trocar o placeholder local pela URL real do blob depois do upload.
- **App de campo**: `mobile/src/lib/media.ts` (novo) — `capturePhoto()` usa `Camera.getPhoto` (`CameraSource.Prompt`: câmera ou galeria, quality 70, largura máx. 1600px) e `importPickedFile()` usa `<input type="file">` (seletor nativo do sistema via WebView, sem plugin novo pra isso); os dois gravam o arquivo em `Directory.Data/media/` via `@capacitor/filesystem`. `FormFillScreen.tsx` ganhou os tipos `image`/`file` (só faltavam esses dois — geo_map/geo_relational continuam fora, é outra decisão pendente): o id da resposta agora nasce na abertura do formulário (não só no salvar), pra mídia capturada durante o preenchimento já vincular à resposta certa; recapturar substitui a mídia pendente anterior do mesmo campo (remove da fila e apaga o arquivo antigo).
- **Placeholder gravado no campo, antes do upload**: `{ kind: "media", localMediaId, fileName, mimeType, pending: true }`; depois de sincronizado vira `{ kind: "media", url, fileName, mimeType }`. Tabela `local_media` (schema já existia, sem uso) ganhou colunas `file_name`/`sync_error` via `ALTER TABLE` guardado por try/catch no init.
- **`syncWorker.ts`**: nova fila de mídia, roda **depois** da fila de respostas (metadado leve primeiro, mídia mais pesada/instável depois) e só processa item cuja resposta dona já sincronizou. Erro 4xx marca `error` (não repete sozinho); rede/5xx mantém `pending`. Mídia cuja resposta nunca aparece localmente (formulário abandonado sem registrar) só vira erro depois de 24h — evita falso positivo com preenchimento demorado.
- **Fora de escopo desta rodada**: renderização do valor `{ kind:"media", url }` nas telas de resposta do site principal (não fazia parte do pedido); se o upload subir mas o PATCH falhar, o retry re-sobe o arquivo (blob órfão inofensivo, aceitável por ora).

## Funcionalidades planejadas (visão de longo prazo)

- **Sistema Colaborativo de Território**: editor de mapas (Leaflet — versão básica de desenho de polígono já existe desde 2026-07-02 em `PolygonMapEditor`, sem versionamento/PRs/forks ainda), versionamento estilo Git com conformidade ABNT, pull requests geográficos, forks com atribuição, biblioteca colaborativa de GeoJSON
- **Rede Social de Pesquisa**: perfil público, publicação de mapas/territórios, notas metodológicas, chamadas de colaboração, grupos temáticos, biblioteca de instrumentos avaliada pela comunidade, revisão por pares leve com reputação científica (ORCID/Lattes)
- **Painel Admin**: gestão de usuários/planos, helpdesk, aprovação do programa Dataº Território, métricas da plataforma
- **Governança e Rastreabilidade**: Scientific Ledger com ID permanente, timestamp e hash criptográfico para cada evento relevante; blockchain entra só como camada de certificação pós-MVP (XRPL, Polygon, Hyperledger)
- **IA (longo prazo)**: sugerir entidades existentes, identificar duplicatas no catálogo, auxiliar construção de formulários, sugerir indicadores, interpretar respostas abertas, gerar mapas, detectar inconsistências

## Modelo de negócio (revisado em 2026-07-04)

Princípio: quem tem orçamento institucional paga o suficiente pra manter a plataforma no azul; o excedente financia o Dataº Território. Substitui o rascunho anterior (R$10/R$5 fixos) por uma escada de planos calibrada por público — o preço fixo único não cobria custo com margem real.

- **Exploração** (gratuito) — 1 pesquisa ativa, até 50 respostas/mês, dashboard com anúncio obrigatório. Funil de entrada, sem cartão.
- **Pesquisador** — R$29/mês por pesquisa ativa (usuários e respostas ilimitados na pesquisa); dashboard sem anúncio: +R$9/mês. Público: pesquisador individual/pós-graduando.
- **Laboratório** — R$149/mês até 5 pesquisas ativas (pesquisa adicional: R$19/mês); colaboradores com papéis (dono/editor/visualizador — feature "Equipe de pesquisa" construída em 2026-07-07, mas ainda sem limite de colaboradores por plano nem cobrança de verdade); faturamento institucional com NF-e. Público: grupo de pesquisa universitário.
- **Governo/Enterprise** — sob consulta, referência a partir de R$690/mês; contrato anual, boleto + NF-e centralizada, SLA. Público: prefeitura, secretaria, autarquia.
- **Dataº Território** (gratuito) — acesso completo para instituições que representam comunidades tradicionais. Vagas calculadas para sustentabilidade (~10% da base pagante como referência). Fundamental para a base ética da plataforma.

**Receita complementar**: dashboard sem anúncio avulso (R$9/mês); certificação de instrumento na biblioteca (R$120 avaliação única ou R$29/mês manutenção); chamada de colaboração paga (taxa de 12% sobre o valor arrecadado); biblioteca de território (R$1 de crédito por uso de terceiro do GeoJSON publicado).

**Custo de operar (excluindo IA, ainda não decidida)**: infra fixa (Vercel + Neon + storage + e-mail) ≈ R$1.300/mês em estágio inicial-crescimento; custo variável por conta pagante ≈ R$4/mês (gateway de pagamento + banda/armazenamento incremental). Com ticket médio de R$35, margem de contribuição ≈ 89%; breakeven do fixo em ≈42 contas pagantes. Meio de pagamento recomendado: gateway brasileiro (Asaas/Iugu/Pagar.me) em vez de Stripe puro — Stripe não resolve Pix/boleto/NF-e nativamente no Brasil, e universidade/governo vão exigir isso.

**Pendente antes de cobrar de verdade**: hoje só existe o enum `users.plan`, sem tabela de assinatura/fatura, webhook de pagamento ou portal de autoatendimento — ver plano completo (planos, custos, matemática de margem e estimativa de lucratividade em escala) no artefato gerado em 2026-07-04.

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

### Correção de registro (2026-07-05) — o padrão real hoje é o tema escuro "Observatório"

O parágrafo acima ficou desatualizado sem que ninguém percebesse: um commit posterior (`dd38d47`, "reskin Observatório na vitrine") escureceu o chrome global (`sidebar.tsx`, `topbar.tsx`, `button.tsx`, `card.tsx` — tokens `ink-*` num neutro quase preto, `--color-ink-950` por padrão em `rgb(20,20,15)`, fonte IBM Plex em vez de Fraunces/Inter), e um commit seguinte (`0096ff8`, "sistema de tema") adicionou toggle completo de cor/contraste/texto/movimento/densidade — existem **4 variantes reais**: escuro (padrão), claro, escuro-alto-contraste, claro-alto-contraste (ver `:root` e overrides em `src/styles/globals.css`). Nenhuma dessas mudanças atualizou este documento até uma auditoria de UI em 2026-07-05 encontrar a divergência.

**Estado real, verificado em código (não em documentação) em 2026-07-05**: o tema escuro `ink`/IBM Plex é o padrão de fato — convertido nesta auditoria em admin (+`admin-nav.tsx` novo), suporte, entidades (lista/detalhe/campo/nova), configurações (globais e por pesquisa), perfil, dashboard, lista/detalhe/respostas/nova pesquisa, lista de dashboards, `/design-system` (reescrito pra refletir a paleta de verdade, antes documentava tokens que não existem mais), `municipality-picker.tsx`, convite. Toasts de sucesso adicionados onde só havia `router.refresh()` silencioso; empty states passaram a orientar o próximo passo.

**Ainda no sistema claro/argila/Fraunces antigo — divergência real e conhecida, não convertido por risco de regressão sem teste ao vivo** (arquivos grandes, interativos, sem automação de navegador neste ambiente): `form-builder-client.tsx`, `respondent-client.tsx` (tela do respondente em `/p/[slug]`), `dashboard-builder-client.tsx`, `public-dashboard-client.tsx` (`/d/[slug]`), landing (`(public)/page.tsx`), `territorio-client.tsx`. Migrar esses pro tema escuro é o próximo passo lógico de consistência visual, mas exige teste interativo (drag-and-drop do form-builder e do dashboard-builder, widgets de mapa/globo) — não tentar às cegas.

## Mapa do Brasil (elemento visual)

O contorno do Brasil usado como elemento visual (login e telas territoriais) deve vir da malha **oficial do IBGE**, nunca desenhado à mão.

- **Fonte oficial**: API de malhas do IBGE — `https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria`. A mesma API já usada nos campos geográficos (mesorregião/microrregião/município) pode fornecer malhas por UF, região, etc.
- **Como gerar (estático, para login/landing)**: script Node que baixa o GeoJSON, projeta lon/lat para SVG (Y invertido — latitude cresce para cima), simplifica ~1 a cada 5 pontos e descarta anéis com menos de ~40 pontos (remove ilhotas/ruído). Salvar o resultado como asset/componente SVG estático. **Não** buscar da rede em runtime na tela de login — o mapa ali é decorativo e deve carregar instantâneo.
- **Mapas interativos dentro da plataforma** (dashboards, territórios, resultados): usar a malha do IBGE ao vivo com MapLibre/Leaflet — isso é pós-MVP, alinhado ao stack futuro (PostGIS + MapLibre). Exceção já implementada: o editor de polígono de território/comunidade (`PolygonMapEditor`, 2026-07-02) usa Leaflet com tiles do OpenStreetMap — é desenho de forma livre sobre um mapa base genérico, não a malha vetorial oficial do IBGE, e não substitui essa entrada.
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
