CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `learning_activity` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`active_seconds` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `learning_methods` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`method` text NOT NULL,
	`active_seconds` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`, `method`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `privacy_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`analytics` integer DEFAULT 0 NOT NULL,
	`voice` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `research_authorizations` (
	`user_id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text NOT NULL,
	`consent_reference` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`code`) REFERENCES `research_participants`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_authorizations_code_unique` ON `research_authorizations` (`code`);--> statement-breakpoint
CREATE TABLE `student_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_accounts_username_unique` ON `student_accounts` (`username`);