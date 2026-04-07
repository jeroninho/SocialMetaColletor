import { pgTable, serial, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const metadataTable = pgTable("metadata", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  title: text("title"),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  reach: integer("reach").notNull().default(0),
  engagementRate: real("engagement_rate").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: timestamp("published_at"),
  collectedAt: timestamp("collected_at").notNull().defaultNow(),
  rawData: text("raw_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMetadataSchema = createInsertSchema(metadataTable).omit({ id: true, createdAt: true });
export type InsertMetadata = z.infer<typeof insertMetadataSchema>;
export type Metadata = typeof metadataTable.$inferSelect;
