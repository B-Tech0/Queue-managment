import { eq, and, desc, like, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, companies, queues, tickets, notifications, companyAdmins } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// COMPANY QUERIES
// ============================================================================

export async function getCompanyBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listCompanies(limit = 20, offset = 0, search?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(companies.isActive, true)];
  if (search) {
    conditions.push(like(companies.name, `%${search}%`));
  }
  
  return db.select().from(companies)
    .where(and(...conditions))
    .orderBy(desc(companies.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserCompanies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({ company: companies }).from(companyAdmins)
    .innerJoin(companies, eq(companyAdmins.companyId, companies.id))
    .where(eq(companyAdmins.userId, userId));
}

export async function createCompany(data: { slug: string; name: string; industry: string; ownerId: number; primaryColor?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(companies).values(data);
  return getCompanyBySlug(data.slug);
}

export async function updateCompany(id: number, data: Partial<{ name: string; description: string; logoUrl: string; primaryColor: string; isActive: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(companies).set({ ...data, updatedAt: new Date() }).where(eq(companies.id, id));
}

// ============================================================================
// QUEUE QUERIES
// ============================================================================

export async function getQueuesByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(queues).where(eq(queues.companyId, companyId)).orderBy(asc(queues.createdAt));
}

export async function getQueueById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(queues).where(eq(queues.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createQueue(data: { companyId: number; name: string; serviceType?: string; averageServiceTime?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(queues).values(data);
  return result[0];
}

export async function updateQueue(id: number, data: Partial<{ name: string; description: string; averageServiceTime: number; isActive: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(queues).set({ ...data, updatedAt: new Date() }).where(eq(queues.id, id));
}

// ============================================================================
// TICKET QUERIES
// ============================================================================

export async function getTicketsByQueue(queueId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(tickets).where(eq(tickets.queueId, queueId)).orderBy(asc(tickets.position));
}

export async function getTicketsByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(tickets).where(eq(tickets.companyId, companyId)).orderBy(desc(tickets.createdAt));
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTicketByNumber(ticketNumber: string, companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tickets)
    .where(and(eq(tickets.ticketNumber, ticketNumber), eq(tickets.companyId, companyId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTicket(data: { queueId: number; companyId: number; ticketNumber: string; customerName: string; customerEmail?: string; customerPhone?: string; position: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(tickets).values(data);
  return result[0];
}

export async function updateTicket(id: number, data: Partial<{ status: "waiting" | "called" | "serving" | "done" | "cancelled"; position: number; calledAt: Date; servingAt: Date; completedAt: Date; counterNumber: number; notes: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(tickets).set({ ...data, updatedAt: new Date() }).where(eq(tickets.id, id));
}

export async function getWaitingTickets(queueId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(tickets)
    .where(and(eq(tickets.queueId, queueId), eq(tickets.status, "waiting")))
    .orderBy(asc(tickets.position));
}

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

export async function createNotification(data: { companyId: number; ticketId: number; customerEmail: string; type: "called" | "serving" | "done" | "reminder"; subject?: string; body?: string; counterNumber?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(notifications).values(data);
}

export async function getPendingNotifications(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(notifications).where(eq(notifications.status, "pending")).limit(limit);
}

export async function updateNotification(id: number, data: Partial<{ status: "pending" | "sent" | "failed"; sentAt: Date; failureReason: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications).set(data).where(eq(notifications.id, id));
}

// ============================================================================
// COMPANY ADMIN QUERIES
// ============================================================================

export async function addCompanyAdmin(companyId: number, userId: number, role: "owner" | "admin" | "staff" = "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(companyAdmins).values({ companyId, userId, role });
}

export async function isCompanyAdmin(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(companyAdmins)
    .where(and(eq(companyAdmins.companyId, companyId), eq(companyAdmins.userId, userId)))
    .limit(1);
  return result.length > 0;
}
