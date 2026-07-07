import { pgTable, uuid, varchar, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 5 tiers reais do modelo de negócio (CLAUDE.md, "Modelo de negócio",
// revisado 2026-07-04). Substituiu o enum antigo (free/pro/institution)
// em 2026-07-09 via ALTER TYPE RENAME VALUE — ver scripts/sql/2026-07-09-billing.sql.
export const planEnum = pgEnum("plan", ["free", "pesquisador", "laboratorio", "governo", "territorio"]);
export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);

export const users = pgTable("users", {
  id:            uuid("id").primaryKey().defaultRandom(),
  email:         varchar("email",       { length: 255 }).notNull().unique(),
  name:          varchar("name",        { length: 200 }).notNull(),
  avatarUrl:     text("avatar_url"),
  image:         text("image"),
  institution:   varchar("institution", { length: 300 }),
  orcid:         varchar("orcid",       { length: 50 }),
  lattesUrl:     text("lattes_url"),
  bio:           text("bio"),
  plan:          planEnum("plan").notNull().default("free"),
  // Papel de equipe interna do Dataº (admin/suporte) — separado de `plan`
  // (nível de cobrança) e do futuro `org_role` (permissão dentro de uma
  // pesquisa/organização). Coluna adicionada via SQL direto (aditiva).
  role:          varchar("role", { length: 20 }).notNull().default("user"),
  publicProfile: boolean("public_profile").notNull().default(false),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt:     timestamp("created_at",     { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at",     { withTimezone: true }).notNull().defaultNow(),
  deletedAt:     timestamp("deleted_at",     { withTimezone: true }),
});

export const accounts = pgTable("accounts", {
  userId:            uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:              varchar("type",              { length: 255 }).notNull(),
  provider:          varchar("provider",          { length: 255 }).notNull(),
  providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
  refresh_token:     text("refresh_token"),
  access_token:      text("access_token"),
  expires_at:        integer("expires_at"),
  token_type:        varchar("token_type",        { length: 255 }),
  scope:             text("scope"),
  id_token:          text("id_token"),
  session_state:     text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId:       uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token:      text("token").notNull(),
  expires:    timestamp("expires", { mode: "date" }).notNull(),
});

export const organizations = pgTable("organizations", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      varchar("name", { length: 300 }).notNull(),
  slug:      varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl:   text("logo_url"),
  website:   text("website"),
  cnpj:      varchar("cnpj", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  id:             uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId:         uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:           orgRoleEnum("role").notNull().default("member"),
  joinedAt:       timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts:            many(accounts),
  sessions:            many(sessions),
  organizationMembers: many(organizationMembers),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user:         one(users,         { fields: [organizationMembers.userId],         references: [users.id] }),
}));