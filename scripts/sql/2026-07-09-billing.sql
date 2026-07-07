-- Cobrança (fase 1): redesenho do enum de plano pros 5 tiers reais +
-- tabelas de assinatura/pagamento. Aplicar via SQL direto no Neon — NÃO
-- usar `npm run db:push` (bug conhecido do drizzle-kit com Postgres 18).
-- Espelha src/lib/db/schema/users.ts (planEnum) e billing.ts.

-- Renomeia valores existentes (nenhuma linha em produção usava "pro" ou
-- "institution" além de "free" na conferência de 2026-07-09, mas a
-- renomeação preserva qualquer linha que exista sem precisar de UPDATE).
ALTER TYPE "plan" RENAME VALUE 'pro' TO 'pesquisador';
ALTER TYPE "plan" RENAME VALUE 'institution' TO 'territorio';
ALTER TYPE "plan" ADD VALUE IF NOT EXISTS 'laboratorio';
ALTER TYPE "plan" ADD VALUE IF NOT EXISTS 'governo';

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"               uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "plan"                  "plan" NOT NULL,
  "status"                varchar(20) NOT NULL DEFAULT 'pending',
  "asaas_customer_id"     varchar(60),
  "asaas_subscription_id" varchar(60),
  "billing_type"          varchar(20),
  "current_period_end"    timestamp with time zone,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id"  uuid NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "asaas_payment_id" varchar(60) NOT NULL UNIQUE,
  "status"           varchar(20) NOT NULL DEFAULT 'pending',
  "value"            real NOT NULL,
  "billing_type"     varchar(20),
  "due_date"         date,
  "paid_at"          timestamp with time zone,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payments_subscription_id_idx" ON "payments" ("subscription_id");
