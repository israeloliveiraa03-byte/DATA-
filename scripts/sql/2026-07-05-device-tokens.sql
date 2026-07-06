-- Tabela nova (aditiva): tokens de dispositivo do app de campo (Capacitor).
-- Aplicar via SQL direto no Neon (console ou psql) — NÃO usar `npm run db:push`
-- por causa do bug conhecido do drizzle-kit com Postgres 18 que propõe remover
-- NOT NULL de colunas sem relação nenhuma (ver CLAUDE.md, "Bugs ativos").
-- Espelha src/lib/db/schema/device-tokens.ts.

CREATE TABLE IF NOT EXISTS "device_tokens" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash"   varchar(64) NOT NULL UNIQUE,
  "label"        varchar(200),
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "last_used_at" timestamp with time zone,
  "expires_at"   timestamp with time zone NOT NULL,
  "revoked_at"   timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "device_tokens_user_id_idx" ON "device_tokens" ("user_id");
