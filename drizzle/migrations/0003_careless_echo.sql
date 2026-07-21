ALTER TABLE `files` ADD `iv` text NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `salt` text NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `auth_tag` text NOT NULL;