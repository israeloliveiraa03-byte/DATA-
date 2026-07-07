import { pgTable, uuid, varchar, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { researches } from "./researches";

// Papel dentro de UMA pesquisa (não confundir com org_role, que é por
// organização inteira, nem com users.role, que é papel de equipe interna do
// Dataº). "owner" não entra neste enum: o dono de uma pesquisa continua sendo
// só researches.ownerId — sem linha duplicada aqui.
export const researchRoleEnum = pgEnum("research_role", ["editor", "viewer"]);
export const researchInviteStatusEnum = pgEnum("research_invite_status", ["pending", "accepted", "revoked"]);

// Tabelas novas (aditivas) — aplicar via SQL direto por causa do bug
// conhecido do drizzle-kit com Postgres 18 (ver CLAUDE.md, "Bugs ativos").
export const researchMembers = pgTable("research_members", {
  id:         uuid("id").primaryKey().defaultRandom(),
  researchId: uuid("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  userId:     uuid("user_id").notNull().references(() => users.id,     { onDelete: "cascade" }),
  role:       researchRoleEnum("role").notNull().default("viewer"),
  invitedBy:  uuid("invited_by").references(() => users.id),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqMember: unique("research_members_research_id_user_id_key").on(table.researchId, table.userId),
}));

// Convite por link copiável (mesmo padrão de entityPersonInvites): expira em
// 7 dias, mais curto que o de pessoa (30) por ser colaboração direta.
export const researchMemberInvites = pgTable("research_member_invites", {
  id:         uuid("id").primaryKey().defaultRandom(),
  token:      varchar("token", { length: 64 }).notNull().unique(),
  researchId: uuid("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  email:      varchar("email", { length: 255 }).notNull(),
  role:       researchRoleEnum("role").notNull().default("viewer"),
  invitedBy:  uuid("invited_by").notNull().references(() => users.id),
  status:     researchInviteStatusEnum("status").notNull().default("pending"),
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export const researchMembersRelations = relations(researchMembers, ({ one }) => ({
  research: one(researches, { fields: [researchMembers.researchId], references: [researches.id] }),
  user:     one(users,      { fields: [researchMembers.userId],     references: [users.id] }),
  invitedByUser: one(users, { fields: [researchMembers.invitedBy],  references: [users.id] }),
}));

export const researchMemberInvitesRelations = relations(researchMemberInvites, ({ one }) => ({
  research:      one(researches, { fields: [researchMemberInvites.researchId], references: [researches.id] }),
  invitedByUser: one(users,      { fields: [researchMemberInvites.invitedBy],  references: [users.id] }),
}));
