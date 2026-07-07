-- Chamadas de colaboração (Rede, fase 2). Sem taxa sobre nenhum tipo de
-- chamada, inclusive "funding" — decisão explícita de Israel.
-- Aplicar via SQL direto no Neon — NÃO usar `npm run db:push` (bug
-- conhecido do drizzle-kit com Postgres 18, ver CLAUDE.md).
-- Espelha src/lib/db/schema/collaboration.ts.

DO $$ BEGIN
  CREATE TYPE "collaboration_kind" AS ENUM ('fieldwork', 'data_gap', 'expertise', 'funding');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "collaboration_status" AS ENUM ('open', 'fulfilled', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "collaboration_application_status" AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "collaboration_calls" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_by"  uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "research_id" uuid REFERENCES "researches"("id") ON DELETE CASCADE,
  "entity_id"   uuid REFERENCES "entities"("id") ON DELETE CASCADE,
  "kind"        collaboration_kind NOT NULL,
  "title"       varchar(500) NOT NULL,
  "description" text NOT NULL,
  "status"      collaboration_status NOT NULL DEFAULT 'open',
  "created_at"  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "collaboration_calls_status_idx"    ON "collaboration_calls" ("status");
CREATE INDEX IF NOT EXISTS "collaboration_calls_research_idx"  ON "collaboration_calls" ("research_id");

CREATE TABLE IF NOT EXISTS "collaboration_applications" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "call_id"      uuid NOT NULL REFERENCES "collaboration_calls"("id") ON DELETE CASCADE,
  "applicant_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "message"      text,
  "status"       collaboration_application_status NOT NULL DEFAULT 'pending',
  "created_at"   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "collaboration_applications_call_id_idx" ON "collaboration_applications" ("call_id");
