-- Rede (fase 3): bandeiras de opt-in pro Mapa Geral. Aditivo (ADD COLUMN
-- com DEFAULT, não quebra linhas existentes). Aplicar via SQL direto no
-- Neon — NÃO usar `npm run db:push` (bug conhecido do drizzle-kit com
-- Postgres 18, ver CLAUDE.md).

ALTER TABLE "researches" ADD COLUMN IF NOT EXISTS "network_visibility" varchar(20) NOT NULL DEFAULT 'hidden';
ALTER TABLE "entities"   ADD COLUMN IF NOT EXISTS "location_disclosure" varchar(20) NOT NULL DEFAULT 'hidden';
