import { sqliteTable as table } from "drizzle-orm/sqlite-core"
import * as t from "drizzle-orm/sqlite-core";

export const shares = table("shares", {
    id: t.int().primaryKey({ autoIncrement: true }),
    token: t.text().notNull().unique(),
    created_at: t.int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    expires_at: t.int({ mode: "timestamp" }),
    max_downloads: t.int(),
    download_count: t.int().default(0).notNull(),
    name: t.text(),
    description: t.text(),
    password_hash: t.text()
});

export const files = table("files", {
    id: t.int().primaryKey({ autoIncrement: true }),
    share_id: t.int().references(() => shares.id).notNull(),
    original_name: t.text().notNull(),
    stored_name: t.text().notNull(),
    size: t.int().notNull(),
    mime_type: t.text().notNull()
})