import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// ============================================================================
// RBAC MIDDLEWARE
// ============================================================================

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const companyAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================================================
  // COMPANIES ROUTER
  // ============================================================================
  companies: router({
    register: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        industry: z.string().min(1),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const existing = await db.getCompanyBySlug(input.slug);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Slug already taken" });
        }
        
        const company = await db.createCompany({
          slug: input.slug,
          name: input.name,
          industry: input.industry,
          ownerId: ctx.user.id,
          primaryColor: input.primaryColor,
        });
        
        if (!company) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await db.addCompanyAdmin(company.id, ctx.user.id, "owner");
        
        return company;
      }),

    list: publicProcedure
      .input(z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        search: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return db.listCompanies(input.limit, input.offset, input.search);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getCompanyBySlug(input.slug);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const company = await db.getCompanyById(input.id);
        if (!company) throw new TRPCError({ code: "NOT_FOUND" });
        
        const isAdmin = await db.isCompanyAdmin(company.id, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return company;
      }),

    getMyCompanies: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const results = await db.getUserCompanies(ctx.user.id);
        return results.map(r => r.company);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        primaryColor: z.string().optional(),
        logoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const company = await db.getCompanyById(input.id);
        if (!company) throw new TRPCError({ code: "NOT_FOUND" });
        
        const isAdmin = await db.isCompanyAdmin(company.id, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateCompany(input.id, {
          name: input.name,
          description: input.description,
          primaryColor: input.primaryColor,
          logoUrl: input.logoUrl,
        });
        
        return db.getCompanyById(input.id);
      }),
  }),

  // ============================================================================
  // QUEUES ROUTER
  // ============================================================================
  queues: router({
    create: protectedProcedure
      .input(z.object({
        companyId: z.number(),
        name: z.string().min(1),
        serviceType: z.string().optional(),
        averageServiceTime: z.number().default(20),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const isAdmin = await db.isCompanyAdmin(input.companyId, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return db.createQueue({
          companyId: input.companyId,
          name: input.name,
          serviceType: input.serviceType,
          averageServiceTime: input.averageServiceTime,
        });
      }),

    list: protectedProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const isAdmin = await db.isCompanyAdmin(input.companyId, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return db.getQueuesByCompany(input.companyId);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        averageServiceTime: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const queue = await db.getQueueById(input.id);
        if (!queue) throw new TRPCError({ code: "NOT_FOUND" });
        
        const isAdmin = await db.isCompanyAdmin(queue.companyId, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateQueue(input.id, {
          name: input.name,
          description: input.description,
          averageServiceTime: input.averageServiceTime,
        });
        
        return db.getQueueById(input.id);
      }),
  }),

  // ============================================================================
  // TICKETS ROUTER
  // ============================================================================
  tickets: router({
    join: publicProcedure
      .input(z.object({
        queueId: z.number(),
        companyId: z.number(),
        customerName: z.string().min(1),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const queue = await db.getQueueById(input.queueId);
        if (!queue) throw new TRPCError({ code: "NOT_FOUND" });
        if (queue.companyId !== input.companyId) throw new TRPCError({ code: "FORBIDDEN" });
        
        const waiting = await db.getWaitingTickets(input.queueId);
        const position = waiting.length + 1;
        const ticketNumber = generateTicketNumber();
        
        return db.createTicket({
          queueId: input.queueId,
          companyId: input.companyId,
          ticketNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          position,
        });
      }),

    getByNumber: publicProcedure
      .input(z.object({
        ticketNumber: z.string(),
        companyId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getTicketByNumber(input.ticketNumber, input.companyId);
      }),

    list: protectedProcedure
      .input(z.object({ queueId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const queue = await db.getQueueById(input.queueId);
        if (!queue) throw new TRPCError({ code: "NOT_FOUND" });
        
        const isAdmin = await db.isCompanyAdmin(queue.companyId, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return db.getTicketsByQueue(input.queueId);
      }),

    callNext: protectedProcedure
      .input(z.object({ queueId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const queue = await db.getQueueById(input.queueId);
        if (!queue) throw new TRPCError({ code: "NOT_FOUND" });
        
        const isAdmin = await db.isCompanyAdmin(queue.companyId, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        const waiting = await db.getWaitingTickets(input.queueId);
        if (waiting.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No tickets waiting" });
        
        const ticket = waiting[0];
        await db.updateTicket(ticket.id, { status: "called", calledAt: new Date() });
        
        return ticket;
      }),

    markServing: protectedProcedure
      .input(z.object({ ticketId: z.number(), counterNumber: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const ticket = await db.getTicketById(input.ticketId);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
        
        const isAdmin = await db.isCompanyAdmin(ticket.companyId, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateTicket(input.ticketId, { status: "serving", servingAt: new Date(), counterNumber: input.counterNumber });
        
        return db.getTicketById(input.ticketId);
      }),

    markDone: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        const ticket = await db.getTicketById(input.ticketId);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
        
        const isAdmin = await db.isCompanyAdmin(ticket.companyId, ctx.user.id);
        if (!isAdmin && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        await db.updateTicket(input.ticketId, { status: "done", completedAt: new Date() });
        
        return db.getTicketById(input.ticketId);
      }),
  }),
});

// ============================================================================
// HELPERS
// ============================================================================

function generateTicketNumber(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const number = String(Math.floor(Math.random() * 900) + 100);
  return letter + number;
}

export type AppRouter = typeof appRouter;
