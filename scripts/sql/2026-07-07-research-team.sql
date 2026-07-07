-- Equipe de pesquisa: colaboradores por pesquisa (editor/visualizador).
-- Aplicar via SQL direto no Neon (console ou psql) — NÃO usar
-- `npm run db:push` por causa do bug conhecido do drizzle-kit com Postgres 18
-- que propõe remover NOT NULL de colunas sem relação nenhuma (ver CLAUDE.md,
-- "Bugs ativos").
-- Espelha src/lib/db/schema/research-team.ts.

DO $$ BEGIN
  CREATE TYPE "research_role" AS ENUM ('editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "research_invite_status" AS ENUM ('pending', 'accepted', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "research_members" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "research_id" uuid NOT NULL REFERENCES "researches"("id") ON DELETE CASCADE,
  "user_id"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role"        research_role NOT NULL DEFAULT 'viewer',
  "invited_by"  uuid REFERENCES "users"("id"),
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "research_members_research_id_user_id_key" UNIQUE ("research_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "research_members_research_id_idx" ON "research_members" ("research_id");
CREATE INDEX IF NOT EXISTS "research_members_user_id_idx"     ON "research_members" ("user_id");

CREATE TABLE IF NOT EXISTS "research_member_invites" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token"       varchar(64) NOT NULL UNIQUE,
  "research_id" uuid NOT NULL REFERENCES "researches"("id") ON DELETE CASCADE,
  "email"       varchar(255) NOT NULL,
  "role"        research_role NOT NULL DEFAULT 'viewer',
  "invited_by"  uuid NOT NULL REFERENCES "users"("id"),
  "status"      research_invite_status NOT NULL DEFAULT 'pending',
  "expires_at"  timestamp with time zone NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "accepted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "research_member_invites_research_id_idx" ON "research_member_invites" ("research_id");
