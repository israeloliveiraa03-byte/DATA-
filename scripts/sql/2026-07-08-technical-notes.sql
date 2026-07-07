-- Notas técnicas (Rede, fase 1): metodológicas, gerais (por tipo de
-- entidade) ou específicas (por entidade), com endosso leve de pares.
-- Aplicar via SQL direto no Neon — NÃO usar `npm run db:push` (bug
-- conhecido do drizzle-kit com Postgres 18, ver CLAUDE.md).
-- Espelha src/lib/db/schema/technical-notes.ts.

DO $$ BEGIN
  CREATE TYPE "note_visibility" AS ENUM ('public', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "technical_notes" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "author_id"   uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"       varchar(500) NOT NULL,
  "body"        text NOT NULL,
  "tags"        text[] NOT NULL DEFAULT '{}',
  "visibility"  note_visibility NOT NULL DEFAULT 'private',
  "entity_type" entity_type,
  "entity_id"   uuid REFERENCES "entities"("id") ON DELETE CASCADE,
  "research_id" uuid REFERENCES "researches"("id") ON DELETE SET NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "technical_notes_author_id_idx" ON "technical_notes" ("author_id");
CREATE INDEX IF NOT EXISTS "technical_notes_entity_id_idx" ON "technical_notes" ("entity_id");
CREATE INDEX IF NOT EXISTS "technical_notes_visibility_idx" ON "technical_notes" ("visibility");

CREATE TABLE IF NOT EXISTS "technical_note_endorsements" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "note_id"    uuid NOT NULL REFERENCES "technical_notes"("id") ON DELETE CASCADE,
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "technical_note_endorsements_note_id_user_id_key" UNIQUE ("note_id", "user_id")
);
