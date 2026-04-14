import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const syncSchedulesTable = pgTable("sync_schedules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platforms: text("platforms").notNull(),
  intervalMinutes: integer("interval_minutes").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SyncSchedule = typeof syncSchedulesTable.$inferSelect;
