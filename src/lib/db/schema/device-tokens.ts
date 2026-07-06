import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Token de dispositivo do app de campo (Capacitor). O app nativo não usa o
// cookie de sessão do NextAuth — depois do login Google no navegador do
// aparelho, o app troca a sessão por um token de longa duração via
// POST /api/auth/device-token. Só o hash SHA-256 fica no banco: o valor puro
// é devolvido uma única vez e nunca pode ser recuperado pelo servidor.
// Tabela nova (aditiva) — aplicar via SQL direto por causa do bug conhecido
// do drizzle-kit com Postgres 18 (ver CLAUDE.md, "Bugs ativos").
export const deviceTokens = pgTable("device_tokens", {
  id:         uuid("id").primaryKey().defaultRandom(),
  userId:     uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash:  varchar("token_hash", { length: 64 }).notNull().unique(),
  label:      varchar("label", { length: 200 }),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt:  timestamp("revoked_at", { withTimezone: true }),
});

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
  user: one(users, { fields: [deviceTokens.userId], references: [users.id] }),
}));
