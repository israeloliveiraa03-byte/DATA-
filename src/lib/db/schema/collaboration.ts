import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { entities } from "./entities";
import { researches } from "./researches";

export const collaborationKindEnum   = pgEnum("collaboration_kind",   ["fieldwork", "data_gap", "expertise", "funding"]);
export const collaborationStatusEnum = pgEnum("collaboration_status", ["open", "fulfilled", "closed"]);
export const collaborationApplicationStatusEnum = pgEnum("collaboration_application_status", ["pending", "accepted", "declined"]);

// Chamada de colaboração: ponte entre pessoas e território, sem taxa —
// decisão explícita de Israel (2026-07-08), nunca cobrar sobre "funding".
export const collaborationCalls = pgTable("collaboration_calls", {
  id:          uuid("id").primaryKey().defaultRandom(),
  createdBy:   uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  researchId:  uuid("research_id").references(() => researches.id, { onDelete: "cascade" }),
  entityId:    uuid("entity_id").references(() => entities.id, { onDelete: "cascade" }),
  kind:        collaborationKindEnum("kind").notNull(),
  title:       varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  status:      collaborationStatusEnum("status").notNull().default("open"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collaborationApplications = pgTable("collaboration_applications", {
  id:          uuid("id").primaryKey().defaultRandom(),
  callId:      uuid("call_id").notNull().references(() => collaborationCalls.id, { onDelete: "cascade" }),
  applicantId: uuid("applicant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message:     text("message"),
  status:      collaborationApplicationStatusEnum("status").notNull().default("pending"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collaborationCallsRelations = relations(collaborationCalls, ({ one, many }) => ({
  createdByUser: one(users,     { fields: [collaborationCalls.createdBy],  references: [users.id] }),
  research:      one(researches,{ fields: [collaborationCalls.researchId], references: [researches.id] }),
  entity:        one(entities,  { fields: [collaborationCalls.entityId],   references: [entities.id] }),
  applications:  many(collaborationApplications),
}));

export const collaborationApplicationsRelations = relations(collaborationApplications, ({ one }) => ({
  call:      one(collaborationCalls, { fields: [collaborationApplications.callId],      references: [collaborationCalls.id] }),
  applicant: one(users,              { fields: [collaborationApplications.applicantId], references: [users.id] }),
}));
