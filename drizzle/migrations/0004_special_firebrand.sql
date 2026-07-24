CREATE TABLE `admin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_username_unique` ON `admin` (`username`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`max_file_size` integer DEFAULT 524288000 NOT NULL,
	`allow_passwordless_shares` integer DEFAULT true NOT NULL,
	`allow_permanent_shares` integer DEFAULT true NOT NULL,
	`max_expiry_days` integer,
	`cap_download_based_expiry` integer DEFAULT false NOT NULL,
	`enable_qr_code` integer DEFAULT true NOT NULL,
	`site_name` text
);
