import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, organizations } from "./users";

export const researchStatusEnum = pgEnum("research_status", ["draft","active","paused","closed","published"]);
export const researchThemeEnum  = pgEnum("research_theme",  ["health","education","environment","culture","economy","governance","territory","other"]);
export const fieldTypeEnum      = pgEnum("field_type",      ["short_text","long_text","number","single_choice","multiple_choice","scale","date","location","image","file","section","matrix"]);

export const researches = pgTable("researches", {
  id:             uuid("id").primaryKey().defaultRandom(),
  ownerId:        uuid("owner_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  title:          varchar("title",       { length: 500 }).notNull(),
  description:    text("description"),
  slug:           varchar("slug",        { length: 200 }).notNull().unique(),
  status:         researchStatusEnum("status").notNull().default("draft"),
  theme:          researchThemeEnum("theme").notNull().default("other"),
  stateCode:      varchar("state_code",  { length: 2   }),
  cityCode:       varchar("city_code",   { length: 10  }),
  cityName:       varchar("city_name",   { length: 200 }),
  allowAnonymous: boolean("allow_anonymous").notNull().default(true),
  collectGps:     boolean("collect_gps").notNull().default(false),
  offlineEnabled: boolean("offline_enabled").notNull().default(true),
  responseLimit:  integer("response_limit"),
  closesAt:       timestamp("closes_at",      { withTimezone: true }),
  publicDashboard:boolean("public_dashboard").notNull().default(false),
  publicUrl:      varchar("public_url",  { length: 300 }),
  createdAt:      timestamp("created_at",     { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at",     { withTimezone: true }).notNull().defaultNow(),
  deletedAt:      timestamp("deleted_at",     { withTimezone: true }),
});

export const forms = pgTable("forms", {
  id:          uuid("id").primaryKey().defaultRandom(),
  researchId:  uuid("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  title:       varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  schema:      jsonb("schema").notNull().default({}),
  isActive:    boolean("is_active").notNull().default(true),
  version:     integer("version").notNull().default(1),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const formFields = pgTable("form_fields", {
  id:           uuid("id").primaryKey().defaultRandom(),
  formId:       uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  type:         fieldTypeEnum("type").notNull(),
  label:        varchar("label",       { length: 500 }).notNull(),
  description:  text("description"),
  placeholder:  varchar("placeholder", { length: 300 }),
  required:     boolean("required").notNull().default(false),
  order:        integer("order").notNull().default(0),
  config:       jsonb("config").notNull().default({}),
  indicatorKey: varchar("indicator_key", { length: 200 }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const responses = pgTable("responses", {
  id:               uuid("id").primaryKey().defaultRandom(),
  formId:           uuid("form_id").notNull().references(() => forms.id),
  researchId:       uuid("research_id").notNull().references(() => researches.id),
  respondentId:     uuid("respondent_id").references(() => users.id),
  collectedOffline: boolean("collected_offline").notNull().default(false),
  syncedAt:         timestamp("synced_at",    { withTimezone: true }),
  ipAddress:        varchar("ip_address",     { length: 50 }),
  userAgent:        text("user_agent"),
  latitude:         text("latitude"),
  longitude:        text("longitude"),
  data:             jsonb("data").notNull().default({}),
  completed:        boolean("completed").notNull().default(false),
  submittedAt:      timestamp("submitted_at", { withTimezone: true }),
  createdAt:        timestamp("created_at",   { withTimezone: true }).notNull().defaultNow(),
});

export const researchesRelations = relations(researches, ({ one, many }) => ({
  owner:        one(users,         { fields: [researches.ownerId],        references: [users.id] }),
  organization: one(organizations, { fields: [researches.organizationId], references: [organizations.id] }),
  forms:        many(forms),
  responses:    many(responses),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  research:  one(researches, { fields: [forms.researchId], references: [researches.id] }),
  fields:    many(formFields),
  responses: many(responses),
}));

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  form: one(forms, { fields: [formFields.formId], references: [forms.id] }),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  form:       one(forms,      { fields: [responses.formId],       references: [forms.id] }),
  research:   one(researches, { fields: [responses.researchId],   references: [researches.id] }),
  respondent: one(users,      { fields: [responses.respondentId], references: [users.id] }),
}));
