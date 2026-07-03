import { pgTable, uuid, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { researches } from "./researches";

// Controla se já mandamos o e-mail de "meta de confiabilidade batida" pra um
// alvo (geral ou um estrato/estado específico) — evita reenviar a cada
// resposta nova depois que a meta já foi alcançada uma vez.
export const researchReliabilityNotifications = pgTable("research_reliability_notifications", {
  id:         uuid("id").primaryKey().defaultRandom(),
  researchId: uuid("research_id").notNull().references(() => researches.id, { onDelete: "cascade" }),
  stratumKey: varchar("stratum_key", { length: 50 }), // null = meta geral (não estratificada)
  notifiedAt: timestamp("notified_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqTarget: unique("research_reliability_notifications_research_id_stratum_key_key").on(table.researchId, table.stratumKey),
}));

export const researchReliabilityNotificationsRelations = relations(researchReliabilityNotifications, ({ one }) => ({
  research: one(researches, { fields: [researchReliabilityNotifications.researchId], references: [researches.id] }),
}));
