import { pgTable, uuid, varchar, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { entities, entityTypeEnum } from "./entities";
import { researches } from "./researches";

export const noteVisibilityEnum = pgEnum("note_visibility", ["public", "private"]);

// Nota metodológica: geral (entity_type) OU específica (entity_id), nunca as
// duas — quem decide isso é a UI (não uma constraint), já que Postgres não
// tem um jeito limpo de expressar "no máximo um dos dois" sem trigger.
export const technicalNotes = pgTable("technical_notes", {
  id:         uuid("id").primaryKey().defaultRandom(),
  authorId:   uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:      varchar("title", { length: 500 }).notNull(),
  body:       text("body").notNull(),
  tags:       text("tags").array().notNull().default([]),
  visibility: noteVisibilityEnum("visibility").notNull().default("private"),
  entityType: entityTypeEnum("entity_type"),
  entityId:   uuid("entity_id").references(() => entities.id, { onDelete: "cascade" }),
  researchId: uuid("research_id").references(() => researches.id, { onDelete: "set null" }),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const technicalNoteEndorsements = pgTable("technical_note_endorsements", {
  id:        uuid("id").primaryKey().defaultRandom(),
  noteId:    uuid("note_id").notNull().references(() => technicalNotes.id, { onDelete: "cascade" }),
  userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqEndorsement: unique("technical_note_endorsements_note_id_user_id_key").on(table.noteId, table.userId),
}));

export const technicalNotesRelations = relations(technicalNotes, ({ one, many }) => ({
  author:      one(users,     { fields: [technicalNotes.authorId],   references: [users.id] }),
  entity:      one(entities,  { fields: [technicalNotes.entityId],   references: [entities.id] }),
  research:    one(researches,{ fields: [technicalNotes.researchId], references: [researches.id] }),
  endorsements: many(technicalNoteEndorsements),
}));

export const technicalNoteEndorsementsRelations = relations(technicalNoteEndorsements, ({ one }) => ({
  note: one(technicalNotes, { fields: [technicalNoteEndorsements.noteId], references: [technicalNotes.id] }),
  user: one(users,          { fields: [technicalNoteEndorsements.userId], references: [users.id] }),
}));
