import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const verificationCodesTable = pgTable("verification_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type", { enum: ["register", "login"] }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VerificationCode = typeof verificationCodesTable.$inferSelect;
