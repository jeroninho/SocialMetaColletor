import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fetchHistoryTable = pgTable("fetch_history", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  duration: text("duration"),
  tags: text("tags"),
  publishedAt: timestamp("published_at"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFetchHistorySchema = createInsertSchema(fetchHistoryTable).omit({ id: true, createdAt: true });
export type InsertFetchHistory = z.infer<typeof insertFetchHistorySchema>;
export type FetchHistory = typeof fetchHistoryTable.$inferSelect;
