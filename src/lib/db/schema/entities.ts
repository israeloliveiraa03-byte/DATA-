import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { researches } from "./researches";

export const entityTypeEnum = pgEnum("entity_type", [
  "territorio", "comunidade", "escola", "associacao", "projeto", "documento",
  "regiao_administrativa", "pessoa",
]);

export const entityStatusEnum = pgEnum("entity_status", ["draft", "published", "archived"]);

export const entityDocumentTypeEnum = pgEnum("entity_document_type", ["cnpj", "cnes", "inep", "outro"]);
export const entityPersonKindEnum   = pgEnum("entity_person_kind",   ["publica_historica", "comum"]);
export const entityInviteStatusEnum = pgEnum("entity_invite_status", ["pending", "accepted", "expired", "revoked"]);

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
  boundaryPolygon: jsonb("boundary_polygon"),
  // Rede — Mapa Geral: hidden|approximate|exact. Só quem criou a entidade
  // decide (entities.createdBy) — decisão de Israel, mesmo motivo de
  // simplicidade do varchar em researches.networkVisibility.
  locationDisclosure: varchar("location_disclosure", { length: 20 }).notNull().default("hidden"),
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

// Território: entidade pode cruzar divisas — N municípios por entidade.
export const entityMunicipalities = pgTable("entity_municipalities", {
  id:        uuid("id").primaryKey().defaultRandom(),
  entityId:  uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  cityCode:  varchar("city_code",  { length: 10 }).notNull(),
  cityName:  varchar("city_name",  { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqCity: unique("entity_municipalities_entity_id_city_code_key").on(table.entityId, table.cityCode),
}));

// Região administrativa: divisões nomeadas (ex.: "1ª Regional de Assistência Social"),
// cada uma com seu próprio conjunto de municípios.
// TODO: biblioteca de regiões reutilizável — extrair entityAdminDivisions com atribuição ao criador (fora de escopo agora).
export const entityAdminDivisions = pgTable("entity_admin_divisions", {
  id:         uuid("id").primaryKey().defaultRandom(),
  entityId:   uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  name:       varchar("name", { length: 300 }).notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entityAdminDivisionCities = pgTable("entity_admin_division_cities", {
  id:         uuid("id").primaryKey().defaultRandom(),
  divisionId: uuid("division_id").notNull().references(() => entityAdminDivisions.id, { onDelete: "cascade" }),
  stateCode:  varchar("state_code", { length: 2 }).notNull(),
  cityCode:   varchar("city_code",  { length: 10 }).notNull(),
  cityName:   varchar("city_name",  { length: 200 }).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqCity: unique("entity_admin_division_cities_division_id_city_code_key").on(table.divisionId, table.cityCode),
}));

// Organização / entidade jurídica: documento público (CNPJ/CNES/INEP/outro), 1:1 com a entidade.
export const entityOrgDocuments = pgTable("entity_org_documents", {
  id:              uuid("id").primaryKey().defaultRandom(),
  entityId:        uuid("entity_id").notNull().unique().references(() => entities.id, { onDelete: "cascade" }),
  documentType:    entityDocumentTypeEnum("document_type").notNull(),
  documentNumber:  varchar("document_number", { length: 30 }).notNull(),
  officialAddress: jsonb("official_address"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Pessoa: figura pública/histórica (cadastrável por terceiros) x pessoa comum (só autocadastro).
export const entityPersonDetails = pgTable("entity_person_details", {
  id:             uuid("id").primaryKey().defaultRandom(),
  entityId:       uuid("entity_id").notNull().unique().references(() => entities.id, { onDelete: "cascade" }),
  personKind:     entityPersonKindEnum("person_kind").notNull(),
  selfRegistered: boolean("self_registered").notNull().default(false),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Convite/autocadastro de pessoa comum: a entidade só nasce quando o convite é aceito.
export const entityPersonInvites = pgTable("entity_person_invites", {
  id:            uuid("id").primaryKey().defaultRandom(),
  token:         varchar("token", { length: 64 }).notNull().unique(),
  createdBy:     uuid("created_by").notNull().references(() => users.id),
  researchId:    uuid("research_id").references(() => researches.id, { onDelete: "set null" }),
  suggestedName: varchar("suggested_name", { length: 500 }),
  contact:       varchar("contact", { length: 255 }),
  status:        entityInviteStatusEnum("status").notNull().default("pending"),
  entityId:      uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
  expiresAt:     timestamp("expires_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt:    timestamp("accepted_at", { withTimezone: true }),
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
  municipalities:   many(entityMunicipalities),
  adminDivisions:   many(entityAdminDivisions),
  orgDocument:      one(entityOrgDocuments,  { fields: [entities.id], references: [entityOrgDocuments.entityId] }),
  personDetails:    one(entityPersonDetails, { fields: [entities.id], references: [entityPersonDetails.entityId] }),
}));

export const entityVersionsRelations = relations(entityVersions, ({ one }) => ({
  entity:        one(entities, { fields: [entityVersions.entityId],  references: [entities.id] }),
  changedByUser: one(users,    { fields: [entityVersions.changedBy], references: [users.id] }),
}));

export const entityMunicipalitiesRelations = relations(entityMunicipalities, ({ one }) => ({
  entity: one(entities, { fields: [entityMunicipalities.entityId], references: [entities.id] }),
}));

export const entityAdminDivisionsRelations = relations(entityAdminDivisions, ({ one, many }) => ({
  entity: one(entities, { fields: [entityAdminDivisions.entityId], references: [entities.id] }),
  cities: many(entityAdminDivisionCities),
}));

export const entityAdminDivisionCitiesRelations = relations(entityAdminDivisionCities, ({ one }) => ({
  division: one(entityAdminDivisions, { fields: [entityAdminDivisionCities.divisionId], references: [entityAdminDivisions.id] }),
}));

export const entityOrgDocumentsRelations = relations(entityOrgDocuments, ({ one }) => ({
  entity: one(entities, { fields: [entityOrgDocuments.entityId], references: [entities.id] }),
}));

export const entityPersonDetailsRelations = relations(entityPersonDetails, ({ one }) => ({
  entity: one(entities, { fields: [entityPersonDetails.entityId], references: [entities.id] }),
}));

export const entityPersonInvitesRelations = relations(entityPersonInvites, ({ one }) => ({
  createdByUser: one(users,      { fields: [entityPersonInvites.createdBy],  references: [users.id] }),
  research:      one(researches, { fields: [entityPersonInvites.researchId], references: [researches.id] }),
  entity:        one(entities,   { fields: [entityPersonInvites.entityId],   references: [entities.id] }),
}));

export const researchEntitiesRelations = relations(researchEntities, ({ one }) => ({
  research:     one(researches, { fields: [researchEntities.researchId], references: [researches.id] }),
  entity:       one(entities,   { fields: [researchEntities.entityId],   references: [entities.id] }),
  linkedByUser: one(users,      { fields: [researchEntities.linkedBy],   references: [users.id] }),
}));
