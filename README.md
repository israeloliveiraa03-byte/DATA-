# Dataº — Plataforma de pesquisa de campo

Plataforma de coleta, sistematização e visualização de dados para pesquisadores, governos, ONGs e territórios tradicionais no Brasil.

## Stack

| Camada     | Tecnologia                                    |
|------------|-----------------------------------------------|
| Frontend   | Next.js 15 (App Router), TypeScript, Tailwind |
| Banco      | Neon (PostgreSQL serverless), Drizzle ORM     |
| Auth       | NextAuth v5 (Google, ORCID)                   |
| Mapas      | Leaflet, react-leaflet                        |
| Gráficos   | Recharts                                      |
| Upload     | UploadThing                                   |
| Email      | Resend                                        |
| Pagamentos | Stripe                                        |
| Cache      | Redis via Upstash                             |
| Deploy     | Vercel                                        |
| Geo        | IBGE API (estados e municípios)               |

## Configuração local

### 1. Clone e instale

```bash
git clone https://github.com/israeloliveiraa03-byte/DATA-.git
cd DATA-
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 3. Banco de dados

```bash
npm run db:generate
npm run db:migrate
```

### 4. Inicia o servidor

```bash
npm run dev
# http://localhost:3000
```

## Estrutura

```
src/
├── app/
│   ├── (auth)/           — Login
│   ├── (platform)/       — App autenticado
│   ├── (public)/         — Dashboards públicos
│   └── api/              — API Routes
├── components/
│   ├── ui/               — Button, Input, Badge…
│   ├── layout/           — Topbar, Sidebar
│   ├── form-builder/     — Construtor drag-and-drop
│   ├── dashboard/        — Construtor de dashboards
│   ├── map/              — Leaflet
│   ├── charts/           — Recharts
│   └── offline/          — Coleta offline
└── lib/
    ├── db/schema/         — Drizzle schemas
    ├── auth/              — NextAuth
    ├── types/             — TypeScript global
    ├── utils/             — Helpers
    ├── hooks/             — use-offline-storage, use-geo
    └── validations/       — Zod schemas
```

## Scripts

| Comando               | Descrição                        |
|-----------------------|----------------------------------|
| `npm run dev`         | Servidor de desenvolvimento      |
| `npm run build`       | Build de produção                |
| `npm run db:generate` | Gera arquivos de migration       |
| `npm run db:migrate`  | Aplica migrations no banco       |
| `npm run db:studio`   | Abre Drizzle Studio              |

## Conformidade

- **LGPD**: coleta mínima, anonimização, consentimento explícito
- **Acessibilidade**: WCAG 2.1 AA
- **Offline**: PWA com IndexedDB e sync automático
