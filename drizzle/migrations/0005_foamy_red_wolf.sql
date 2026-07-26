ALTER TABLE `shares` ADD `is_reverse` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `upload_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `shares_upload_token_unique` ON `shares` (`upload_token`);