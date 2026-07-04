import { pgTable, uuid, varchar, text, boolean, timestamp, integer, real, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { researches } from "./researches";

// "crosstab" e "globe" adicionados ao enum do Postgres via ALTER TYPE direto
// (aditivo, script rodado uma vez — ver CLAUDE.md sobre o bug do drizzle-kit
// com NOT NULL no Postgres 18/Neon). Essa lista só precisa refletir o que já
// existe no banco pra o TypeScript não reclamar.
export const widgetTypeEnum = pgEnum("widget_type", ["bar_chart","line_chart","pie_chart","donut_chart","map","number_card","table","text","image","heatmap","crosstab","globe"]);

export const dashboards = pgTable("dashboards", {
  id:          uuid("id").primaryKey().defaultRandom(),
  researchId:  uuid("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  title:       varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  layout:      jsonb("layout").notNull().default({ columns: 12, rows: [] }),
  isPublic:    boolean("is_public").notNull().default(false),
  publicSlug:  varchar("public_slug", { length: 200 }).unique(),
  theme:       varchar("theme",       { length: 50  }).notNull().default("light"),
  coverUrl:    text("cover_url"),
  // Paleta de cores dos widgets (gráficos/mapas/globo) — ver COLOR_PALETTES
  // em src/lib/dashboard/types.ts. Coluna adicionada via SQL direto
  // (ALTER TABLE ADD COLUMN, aditivo com default) — mesmo motivo do enum
  // widget_type: drizzle-kit push tentaria remover NOT NULL de tudo no
  // Postgres 18/Neon (ver CLAUDE.md).
  colorPalette: varchar("color_palette", { length: 50 }).notNull().default("terracota"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id:          uuid("id").primaryKey().defaultRandom(),
  dashboardId: uuid("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  type:        widgetTypeEnum("type").notNull(),
  title:       varchar("title", { length: 300 }),
  // Grade livre (não mais célula de 12 colunas): x/w em % da largura do
  // canvas, y/h em pixels — contínuos, não travados em inteiro.
  x:           real("x").notNull().default(0),
  y:           real("y").notNull().default(0),
  w:           real("w").notNull().default(33),
  h:           real("h").notNull().default(96),
  config:      jsonb("config").notNull().default({}),
  order:       integer("order").notNull().default(0),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const indicators = pgTable("indicators", {
  id:         uuid("id").primaryKey().defaultRandom(),
  researchId: uuid("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  key:        varchar("key",   { length: 200 }).notNull(),
  label:      varchar("label", { length: 500 }).notNull(),
  value:      jsonb("value").notNull().default({}),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
  research: one(researches, { fields: [dashboards.researchId], references: [researches.id] }),
  widgets:  many(dashboardWidgets),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  dashboard: one(dashboards, { fields: [dashboardWidgets.dashboardId], references: [dashboards.id] }),
}));
