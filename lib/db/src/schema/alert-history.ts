import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const alertHistoryTable = pgTable("alert_history", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").notNull(),
  ruleName: text("rule_name").notNull(),
  platform: text("platform").notNull(),
  metric: text("metric").notNull(),
  currentValue: integer("current_value").notNull(),
  threshold: integer("threshold").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("sent"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export type AlertHistory = typeof alertHistoryTable.$inferSelect;
