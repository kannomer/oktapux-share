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
    password_hash: t.text(),
	is_reverse: t.int({ mode: "boolean" }).notNull().default(false),
	upload_token: t.text().unique()
});

export const files = table("files", {
    id: t.int().primaryKey({ autoIncrement: true }),
    share_id: t.int().references(() => shares.id).notNull(),
    original_name: t.text().notNull(),
    stored_name: t.text().notNull(),
    size: t.int().notNull(),
    mime_type: t.text().notNull(),
    iv: t.text().notNull(),
    salt: t.text().notNull(),
    auth_tag: t.text().notNull()
});

export const admin = table("admin", {
	id: t.int().primaryKey({ autoIncrement: true }),
	username: t.text().notNull().unique(),
	password_hash: t.text().notNull(),
	created_at: t.int({ mode: "timestamp" }).$defaultFn(() => new Date())
});

export const settings = table("settings", {
	id: t.int().primaryKey({ autoIncrement: true }),
	max_file_size: t.int().notNull().default(500 * 1024 * 1024),
	allow_passwordless_shares: t.int({ mode: "boolean" }).notNull().default(true),
	allow_permanent_shares: t.int({ mode: "boolean" }).notNull().default(true),
	max_expiry_days: t.int(),
	cap_download_based_expiry: t.int({ mode: "boolean" }).notNull().default(false),
	enable_qr_code: t.int({ mode: "boolean" }).notNull().default(true),
	allow_reverse_shares: t.int({ mode: "boolean" }).notNull().default(true),
	site_name: t.text()
})