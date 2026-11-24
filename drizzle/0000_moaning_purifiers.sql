CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pairs` (
	`id` text PRIMARY KEY NOT NULL,
	`a` text NOT NULL,
	`b` text NOT NULL,
	`body` text NOT NULL,
	`revision` integer NOT NULL
);
