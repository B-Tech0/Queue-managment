import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Companies table — represents registered businesses on the platform
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 64 }).notNull(), // hospital, salon, bank, restaurant, government
  description: text("description"),
  logoUrl: varchar("logoUrl", { length: 512 }),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#0EA5E9"),
  ownerId: int("ownerId").notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Queues table — represents individual service queues within a company
 */
export const queues = mysqlTable("queues", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  serviceType: varchar("serviceType", { length: 128 }),
  averageServiceTime: int("averageServiceTime").default(20), // minutes
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Queue = typeof queues.$inferSelect;
export type InsertQueue = typeof queues.$inferInsert;

/**
 * Tickets table — represents individual customer entries in a queue
 */
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  queueId: int("queueId").notNull(),
  companyId: int("companyId").notNull(),
  ticketNumber: varchar("ticketNumber", { length: 32 }).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  status: mysqlEnum("status", ["waiting", "called", "serving", "done", "cancelled"]).default("waiting"),
  position: int("position"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  calledAt: timestamp("calledAt"),
  servingAt: timestamp("servingAt"),
  completedAt: timestamp("completedAt"),
  estimatedWaitTime: int("estimatedWaitTime"), // minutes
  counterNumber: int("counterNumber"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * Notifications table — tracks email notifications sent to customers
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  ticketId: int("ticketId").notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  type: mysqlEnum("type", ["called", "serving", "done", "reminder"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  counterNumber: int("counterNumber"),
  status: mysqlEnum("notificationStatus", ["pending", "sent", "failed"]).default("pending"),
  sentAt: timestamp("sentAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Company admins table — maps users to companies they administer
 */
export const companyAdmins = mysqlTable("companyAdmins", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("adminRole", ["owner", "admin", "staff"]).default("admin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompanyAdmin = typeof companyAdmins.$inferSelect;
export type InsertCompanyAdmin = typeof companyAdmins.$inferInsert;