import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const alertRulesTable = pgTable("alert_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  metric: text("metric").notNull(),
  condition: text("condition").notNull(),
  threshold: integer("threshold").notNull(),
  channel: text("channel").notNull(),
  webhookUrl: text("webhook_url"),
  email: text("email"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AlertRule = typeof alertRulesTable.$inferSelect;
export type InsertAlertRule = typeof alertRulesTable.$inferInsert;
