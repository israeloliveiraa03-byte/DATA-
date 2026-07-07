import { pgTable, uuid, varchar, real, date, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, planEnum } from "./users";

// Uma assinatura ativa por usuário. Só planos pagos passam por aqui
// (pesquisador/laboratorio/governo) — free e território não geram cobrança.
export const subscriptions = pgTable("subscriptions", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  userId:              uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  plan:                planEnum("plan").notNull(),
  // varchar simples (não enum do Postgres) — mesmo motivo de sempre neste
  // projeto: evita o drama de enum novo se o Asaas tiver mais um status.
  status:              varchar("status", { length: 20 }).notNull().default("pending"),
  asaasCustomerId:     varchar("asaas_customer_id", { length: 60 }),
  asaasSubscriptionId: varchar("asaas_subscription_id", { length: 60 }),
  billingType:         varchar("billing_type", { length: 20 }),
  currentPeriodEnd:    timestamp("current_period_end", { withTimezone: true }),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Histórico de cobranças individuais — uma assinatura gera várias ao
// longo do tempo (uma por ciclo de fatura).
export const payments = pgTable("payments", {
  id:             uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  asaasPaymentId: varchar("asaas_payment_id", { length: 60 }).notNull().unique(),
  status:         varchar("status", { length: 20 }).notNull().default("pending"),
  value:          real("value").notNull(),
  billingType:    varchar("billing_type", { length: 20 }),
  dueDate:        date("due_date"),
  paidAt:         timestamp("paid_at", { withTimezone: true }),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user:     one(users, { fields: [subscriptions.userId], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] }),
}));
