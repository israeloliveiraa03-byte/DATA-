import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Biblioteca de figurinhas/imagens do pesquisador — upload próprio,
// reaproveitável em vários widgets/pesquisas sem precisar reenviar o mesmo
// arquivo. isShared vira visível pra toda a plataforma (biblioteca
// comunitária) só quando o dono autoriza explicitamente — nasce privada.
export const userAssets = pgTable("user_assets", {
  id:        uuid("id").primaryKey().defaultRandom(),
  ownerId:   uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:      varchar("name", { length: 200 }).notNull(),
  imageUrl:  text("image_url").notNull(),
  isShared:  boolean("is_shared").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userAssetsRelations = relations(userAssets, ({ one }) => ({
  owner: one(users, { fields: [userAssets.ownerId], references: [users.id] }),
}));
