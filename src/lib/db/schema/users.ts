import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const planEnum    = pgEnum("plan",     ["free", "pro", "institution"]);
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
  publicProfile: boolean("public_profile").notNull().default(false),
  emailVerified: timestamp("email_verified",  { withTimezone: true }),
  createdAt:     timestamp("created_at",      { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at",      { withTimezone: true }).notNull().defaultNow(),
  deletedAt:     timestamp("deleted_at",      { withTimezone: true }),
});

export const accounts = pgTable("accounts", {
  id:                uuid("id").primaryKey().defaultRandom(),
  userId:            uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:              varchar("type",               { length: 50  }).notNull(),
  provider:          varchar("provider",           { length: 50  }).notNull(),
  providerAccountId: varchar("provider_account_id",{ length: 255 }).notNull(),
  refreshToken:      text("refresh_token"),
  accessToken:       text("access_token"),
  expiresAt:         timestamp("expires_at", { withTimezone: true }),
  tokenType:         varchar("token_type",   { length: 50 }),
  scope:             text("scope"),
  idToken:           text("id_token"),
  sessionState:      text("session_state"),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").notNull().unique(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { withTimezone: true }).notNull(),
});

export const organizations = pgTable("organizations", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      varchar("name",  { length: 300 }).notNull(),
  slug:      varchar("slug",  { length: 100 }).notNull().unique(),
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
