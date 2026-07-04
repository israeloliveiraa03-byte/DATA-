import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Candidatura ao programa Dataº Território — exige login (applicantUserId
// é sempre de um usuário real, nunca anônimo) pra que aprovar já vincule
// o benefício (plan = "institution") direto à conta certa.
export const territorioApplications = pgTable("territorio_applications", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  applicantUserId:    uuid("applicant_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cnpj:               varchar("cnpj", { length: 20 }).notNull(),
  razaoSocial:        varchar("razao_social", { length: 300 }).notNull(),
  naturezaJuridica:   varchar("natureza_juridica", { length: 200 }).notNull(),
  enderecoSede:       text("endereco_sede").notNull(),
  municipio:          varchar("municipio", { length: 200 }).notNull(),
  estado:             varchar("estado", { length: 2 }).notNull(),
  tipoComunidade:     varchar("tipo_comunidade", { length: 100 }).notNull(),
  historico:          text("historico").notNull(),
  territorioAtuacao:  text("territorio_atuacao").notNull(),
  numeroMembros:      varchar("numero_membros", { length: 50 }).notNull(),
  nomeResponsavel:    varchar("nome_responsavel", { length: 300 }).notNull(),
  cpfResponsavel:     varchar("cpf_responsavel", { length: 20 }).notNull(),
  cargoResponsavel:   varchar("cargo_responsavel", { length: 200 }).notNull(),
  emailResponsavel:   varchar("email_responsavel", { length: 255 }).notNull(),
  telefoneResponsavel:varchar("telefone_responsavel", { length: 30 }).notNull(),
  // pending | approved | rejected
  status:             varchar("status", { length: 20 }).notNull().default("pending"),
  reviewedBy:         uuid("reviewed_by").references(() => users.id),
  reviewedAt:         timestamp("reviewed_at", { withTimezone: true }),
  reviewNote:         text("review_note"),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Chamado de suporte — v1 simples: pergunta + uma resposta do admin, sem
// conversa de várias mensagens (fica pra depois, se fizer falta).
export const supportTickets = pgTable("support_tickets", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject:      varchar("subject", { length: 300 }).notNull(),
  message:      text("message").notNull(),
  // open | answered | closed
  status:       varchar("status", { length: 20 }).notNull().default("open"),
  response:     text("response"),
  respondedBy:  uuid("responded_by").references(() => users.id),
  respondedAt:  timestamp("responded_at", { withTimezone: true }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const territorioApplicationsRelations = relations(territorioApplications, ({ one }) => ({
  applicant: one(users, { fields: [territorioApplications.applicantUserId], references: [users.id] }),
  reviewer:  one(users, { fields: [territorioApplications.reviewedBy], references: [users.id] }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user:       one(users, { fields: [supportTickets.userId], references: [users.id] }),
  responder:  one(users, { fields: [supportTickets.respondedBy], references: [users.id] }),
}));
