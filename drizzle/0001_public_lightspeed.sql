CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`industry` varchar(64) NOT NULL,
	`description` text,
	`logoUrl` varchar(512),
	`primaryColor` varchar(7) DEFAULT '#0EA5E9',
	`ownerId` int NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `companyAdmins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`adminRole` enum('owner','admin','staff') DEFAULT 'admin',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `companyAdmins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`ticketId` int NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`type` enum('called','serving','done','reminder') NOT NULL,
	`subject` varchar(255),
	`body` text,
	`counterNumber` int,
	`notificationStatus` enum('pending','sent','failed') DEFAULT 'pending',
	`sentAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`serviceType` varchar(128),
	`averageServiceTime` int DEFAULT 20,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `queues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queueId` int NOT NULL,
	`companyId` int NOT NULL,
	`ticketNumber` varchar(32) NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(320),
	`customerPhone` varchar(20),
	`status` enum('waiting','called','serving','done','cancelled') DEFAULT 'waiting',
	`position` int,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`calledAt` timestamp,
	`servingAt` timestamp,
	`completedAt` timestamp,
	`estimatedWaitTime` int,
	`counterNumber` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
