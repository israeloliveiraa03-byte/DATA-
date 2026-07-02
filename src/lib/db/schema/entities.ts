import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { researches } from "./researches";

export const entityTypeEnum = pgEnum("entity_type", [
  "territorio", "comunidade", "escola", "associacao", "projeto", "documento",
]);

export const entityStatusEnum = pgEnum("entity_status", ["draft", "published", "archived"]);

export const entityCodeCounters = pgTable("entity_code_counters", {
  type:      entityTypeEnum("type").primaryKey(),
  lastValue: integer("last_value").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entities = pgTable("entities", {
  id:          uuid("id").primaryKey().defaultRandom(),
  code:        varchar("code", { length: 20 }).notNull().unique(),
  type:        entityTypeEnum("type").notNull(),
  name:        varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  status:      entityStatusEnum("status").notNull().default("draft"),
  stateCode:   varchar("state_code", { length: 2 }),
  cityCode:    varchar("city_code",  { length: 10 }),
  cityName:    varchar("city_name",  { length: 200 }),
  latitude:    text("latitude"),
  longitude:   text("longitude"),
  createdBy:   uuid("created_by").notNull().references(() => users.id),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt:   timestamp("deleted_at", { withTimezone: true }),
});

export const entityVersions = pgTable("entity_versions", {
  id:         uuid("id").primaryKey().defaultRandom(),
  entityId:   uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  version:    integer("version").notNull().default(1),
  snapshot:   jsonb("snapshot").notNull().default({}),
  changeNote: text("change_note"),
  changedBy:  uuid("changed_by").notNull().references(() => users.id),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchEntities = pgTable("research_entities", {
  id:           uuid("id").primaryKey().defaultRandom(),
  researchId:   uuid("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  entityId:     uuid("entity_id").notNull().references(() => entities.id,   { onDelete: "cascade" }),
  relationNote: text("relation_note"),
  linkedBy:     uuid("linked_by").notNull().references(() => users.id),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqLink: unique("research_entities_research_id_entity_id_key").on(table.researchId, table.entityId),
}));

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  createdByUser:    one(users, { fields: [entities.createdBy], references: [users.id] }),
  versions:         many(entityVersions),
  linkedResearches: many(researchEntities),
}));

export const entityVersionsRelations = relations(entityVersions, ({ one }) => ({
  entity:        one(entities, { fields: [entityVersions.entityId],  references: [entities.id] }),
  changedByUser: one(users,    { fields: [entityVersions.changedBy], references: [users.id] }),
}));

export const researchEntitiesRelations = relations(researchEntities, ({ one }) => ({
  research:     one(researches, { fields: [researchEntities.researchId], references: [researches.id] }),
  entity:       one(entities,   { fields: [researchEntities.entityId],   references: [entities.id] }),
  linkedByUser: one(users,      { fields: [researchEntities.linkedBy],   references: [users.id] }),
}));
