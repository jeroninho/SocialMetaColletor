import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const oauthCredentialsTable = pgTable("oauth_credentials", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull().unique(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OAuthCredential = typeof oauthCredentialsTable.$inferSelect;
export type InsertOAuthCredential = typeof oauthCredentialsTable.$inferInsert;
