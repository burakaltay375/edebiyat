CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer` text NOT NULL,
	`correct` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `learning_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_session` ON `attempts` (`session_id`);--> statement-breakpoint
CREATE TABLE `authors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`period` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `explanation_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`student_explanation` text NOT NULL,
	`ai_feedback` text NOT NULL,
	`score` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `learning_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_explanation_session` ON `explanation_attempts` (`session_id`);--> statement-breakpoint
CREATE TABLE `grades` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`mode` text NOT NULL,
	`participant_code` text,
	`stage` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`active_seconds` integer DEFAULT 0 NOT NULL,
	`last_heartbeat` text NOT NULL,
	`quiz_score` real,
	`recall_score` real,
	`explanation_score` real,
	`result` text,
	`draft` text DEFAULT '{}' NOT NULL,
	`quiz_submitted` integer DEFAULT 0 NOT NULL,
	`question_count` integer DEFAULT 5 NOT NULL,
	`difficulty` text DEFAULT 'easy' NOT NULL,
	`max_seconds` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `learning_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `lesson_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`subtopic_id` text NOT NULL,
	`content` text NOT NULL,
	`key_points` text NOT NULL,
	`example` text NOT NULL,
	`recall_prompt` text NOT NULL,
	`source` text NOT NULL,
	`review_status` text DEFAULT 'draft' NOT NULL,
	`source_name` text DEFAULT 'MEB Türkiye Yüzyılı Maarif Modeli' NOT NULL,
	`source_section` text DEFAULT '' NOT NULL,
	`curriculum_year` text DEFAULT '2024' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `learning_outcomes` (
	`id` text PRIMARY KEY NOT NULL,
	`subtopic_id` text NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `research_participants` (
	`code` text PRIMARY KEY NOT NULL,
	`group_name` text NOT NULL,
	`user_id` text,
	`consent` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_participants_user_id_unique` ON `research_participants` (`user_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`subtopic_id` text NOT NULL,
	`question_type` text NOT NULL,
	`source_ids` text DEFAULT '[]' NOT NULL,
	`rubric` text DEFAULT '' NOT NULL,
	`generated` integer DEFAULT 0 NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`correct_answer` text NOT NULL,
	`explanation` text NOT NULL,
	`difficulty` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `research_protocol` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`question_count` integer NOT NULL,
	`difficulty` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `research_tests` (
	`code` text NOT NULL,
	`phase` text NOT NULL,
	`score` real NOT NULL,
	`taken_at` text NOT NULL,
	PRIMARY KEY(`code`, `phase`),
	FOREIGN KEY (`code`) REFERENCES `research_participants`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_schedule` (
	`user_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`next_review` text NOT NULL,
	`interval` integer NOT NULL,
	`review_count` integer NOT NULL,
	`level` integer NOT NULL,
	PRIMARY KEY(`user_id`, `topic_id`),
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_user_due` ON `review_schedule` (`user_id`,`next_review`);--> statement-breakpoint
CREATE TABLE `session_questions` (
	`session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`position` integer NOT NULL,
	`last_answer` text,
	`score` real,
	`tries` integer DEFAULT 0 NOT NULL,
	`first_score` real,
	`feedback` text,
	`resolved` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`session_id`, `question_id`),
	FOREIGN KEY (`session_id`) REFERENCES `learning_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `source_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`outcome_id` text NOT NULL,
	`content` text NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`section` text NOT NULL,
	`curriculum_year` text NOT NULL,
	`review_status` text DEFAULT 'draft' NOT NULL,
	FOREIGN KEY (`outcome_id`) REFERENCES `learning_outcomes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `student_progress` (
	`user_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`mastery_score` real NOT NULL,
	`last_studied` text NOT NULL,
	`completed` integer NOT NULL,
	`evidence` text NOT NULL,
	PRIMARY KEY(`user_id`, `topic_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subtopic_progress` (
	`user_id` text NOT NULL,
	`subtopic_id` text NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `subtopic_id`),
	FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subtopics` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`title` text NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_subtopics_topic` ON `subtopics` (`topic_id`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_topics_unit` ON `topics` (`unit_id`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`grade_level` integer NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`grade_level`) REFERENCES `grades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Öğrenci' NOT NULL,
	`grade_level` integer DEFAULT 9 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`genre` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE no action
);
