import { pgTable, serial, timestamp, integer, varchar, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 页面点赞计数表
export const pageLikes = pgTable(
  "page_likes",
  {
    id: serial().primaryKey(),
    page_key: varchar("page_key", { length: 100 }).notNull().default("homepage"),
    like_count: integer("like_count").notNull().default(0),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("page_likes_key_idx").on(table.page_key),
  ]
);
