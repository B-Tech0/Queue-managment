# QueueFlow SaaS — Technical Architecture

## Overview

QueueFlow is a multi-tenant queue management platform that enables businesses (hospitals, salons, banks, restaurants, government offices) to manage customer queues efficiently. The platform provides:

- **Company Registration & Management**: Businesses register and configure their queue systems
- **Admin Dashboard**: Company admins manage queues, call customers, and view analytics
- **Public Queue Interface**: Customers join queues via company-specific URLs without authentication
- **Real-time Ticket Tracking**: Customers see live position, ETA, and status updates
- **Queue Display Board**: Public-facing screens for waiting rooms or front desks
- **Email Notifications**: Automated alerts when customers are called
- **Role-Based Access Control**: Platform owner manages all companies; company admins manage their own queues

## Multi-Tenant Architecture

### Data Isolation Strategy

All data is isolated by `companyId` at the database level. Every table that represents company-specific data includes a `companyId` foreign key:

- **Companies**: Root tenant entity
- **Queues**: Belong to a company
- **Tickets**: Belong to a queue
- **Notifications**: Belong to a company

### Authentication & Authorization

| User Type | Authentication | Scope | Access |
|-----------|-----------------|-------|--------|
| Platform Owner | Manus OAuth | All companies | Full platform management |
| Company Admin | Manus OAuth | Their company only | Queue management, analytics, settings |
| End User (Customer) | None (Guest) | Single queue session | Join queue, view ticket status |

## Database Schema

### Core Tables

#### `companies`
Represents registered businesses on the platform.

```sql
CREATE TABLE companies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(64) UNIQUE NOT NULL,           -- URL-friendly identifier (e.g., "xyz-hospital")
  name VARCHAR(255) NOT NULL,                 -- Company display name
  industry VARCHAR(64) NOT NULL,              -- hospital, salon, bank, restaurant, government
  description TEXT,
  logoUrl VARCHAR(512),                       -- S3 URL to company logo
  primaryColor VARCHAR(7),                    -- Hex color for branding (e.g., "#0EA5E9")
  ownerId INT NOT NULL,                       -- User who registered the company
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerId) REFERENCES users(id)
);
```

#### `queues`
Represents individual service queues within a company.

```sql
CREATE TABLE queues (
  id INT PRIMARY KEY AUTO_INCREMENT,
  companyId INT NOT NULL,
  name VARCHAR(255) NOT NULL,                 -- e.g., "General Checkup", "Haircut"
  description TEXT,
  serviceType VARCHAR(128),                   -- Service category
  averageServiceTime INT DEFAULT 20,          -- Average time in minutes
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
);
```

#### `tickets`
Represents individual customer entries in a queue.

```sql
CREATE TABLE tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  queueId INT NOT NULL,
  companyId INT NOT NULL,                     -- Denormalized for query efficiency
  ticketNumber VARCHAR(32) NOT NULL,          -- Display number (e.g., "A042")
  customerName VARCHAR(255) NOT NULL,
  customerEmail VARCHAR(320),
  customerPhone VARCHAR(20),
  status ENUM('waiting', 'called', 'serving', 'done', 'cancelled') DEFAULT 'waiting',
  position INT,                               -- Current position in queue (1-indexed)
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  calledAt TIMESTAMP NULL,
  servingAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  estimatedWaitTime INT,                      -- Minutes (calculated)
  counterNumber INT,                          -- Counter/window assignment
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (queueId) REFERENCES queues(id) ON DELETE CASCADE,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX (companyId, status),
  INDEX (queueId, status)
);
```

#### `notifications`
Tracks email notifications sent to customers.

```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  companyId INT NOT NULL,
  ticketId INT NOT NULL,
  customerEmail VARCHAR(320) NOT NULL,
  type ENUM('called', 'serving', 'done', 'reminder') NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  counterNumber INT,                          -- For "called" notifications
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sentAt TIMESTAMP NULL,
  failureReason TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
);
```

#### `companyAdmins`
Maps users to companies they administer.

```sql
CREATE TABLE companyAdmins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  companyId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('owner', 'admin', 'staff') DEFAULT 'admin',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (companyId, userId),
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Architecture

### tRPC Router Structure

```
appRouter
├── auth
│   ├── me                          -- Get current user
│   └── logout                      -- Logout
├── companies
│   ├── register                    -- Create new company (admin)
│   ├── list                        -- List all companies (public)
│   ├── getBySlug                   -- Get company details (public)
│   ├── getById                     -- Get company details (admin)
│   ├── update                      -- Update company (admin)
│   └── getMyCompanies              -- Get companies I manage (admin)
├── queues
│   ├── create                      -- Create queue (admin)
│   ├── list                        -- List queues for a company (admin)
│   ├── update                      -- Update queue (admin)
│   └── delete                      -- Delete queue (admin)
├── tickets
│   ├── join                        -- Join queue (guest)
│   ├── getByNumber                 -- Get ticket details (guest)
│   ├── list                        -- List tickets in queue (admin)
│   ├── callNext                    -- Call next ticket (admin)
│   ├── markServing                 -- Mark as serving (admin)
│   ├── markDone                    -- Mark as done (admin)
│   ├── cancel                      -- Cancel ticket (admin/guest)
│   └── getStats                    -- Queue statistics (admin)
├── notifications
│   ├── send                        -- Send notification (internal)
│   ├── list                        -- List notifications (admin)
│   └── retry                       -- Retry failed notification (admin)
└── system
    ├── notifyOwner                 -- Notify platform owner
    └── health                      -- Health check
```

## Real-Time Updates Strategy

### Data API Integration

The platform uses Manus Data API for real-time broadcasting:

1. **Ticket Status Changes**: When an admin calls the next ticket, marks it as serving, or completes it, the system broadcasts the update to all connected clients viewing that queue.
2. **Position Updates**: When a ticket is completed, all waiting tickets move up one position. The system broadcasts updated positions to all affected customers.
3. **Polling Fallback**: Customers' ticket pages poll every 3 seconds for status updates if WebSocket connection is unavailable.

### Real-Time Event Flow

```
Admin Action (callNext)
    ↓
tRPC Mutation (tickets.callNext)
    ↓
Update Database
    ↓
Broadcast via Data API
    ↓
All Clients Receive Update
    ↓
UI Re-renders with New Position/Status
```

## Email Notification System

### Notification Types

| Type | Trigger | Message |
|------|---------|---------|
| Called | Ticket status changes to "called" | "You're next — please proceed to counter 3" |
| Serving | Ticket status changes to "serving" | "You are now being served at counter 3" |
| Done | Ticket status changes to "done" | "Your service is complete. Thank you!" |
| Reminder | After 15 minutes of waiting | "Your estimated wait time is 12 minutes" |

### Implementation

- Notifications are queued in the database with status "pending"
- A background job (or scheduled task) processes pending notifications every 30 seconds
- Uses Manus built-in email API to send notifications
- Retries failed notifications up to 3 times with exponential backoff

## Role-Based Access Control (RBAC)

### Procedure Protection

```typescript
// Public procedures (no auth required)
publicProcedure
  - companies.list
  - companies.getBySlug
  - tickets.join
  - tickets.getByNumber

// Protected procedures (Manus OAuth required)
protectedProcedure
  - companies.register
  - companies.getMyCompanies
  - queues.create
  - queues.list
  - tickets.callNext
  - tickets.markServing
  - tickets.markDone
  - notifications.list

// Admin-only procedures (role === 'admin')
adminProcedure
  - companies.list (all)
  - companies.update (any)
  - users.list
  - notifications.retry (all)

// Company-scoped procedures
companyAdminProcedure
  - queues.create (own company)
  - queues.update (own company)
  - tickets.list (own company)
  - tickets.callNext (own company)
  - notifications.list (own company)
```

## Frontend Structure

### Routes

```
/                           -- Landing page with company directory
/q/[company-slug]          -- Public queue-joining page
/q/[company-slug]/ticket   -- Ticket status page (guest)
/dashboard                 -- Admin dashboard (requires auth)
/dashboard/companies       -- Manage companies (owner only)
/dashboard/company/[id]    -- Company admin panel
/dashboard/queues          -- Queue management
/dashboard/analytics       -- Analytics & reports
/admin                     -- Platform admin panel (owner only)
```

### Component Structure

```
client/src/
├── pages/
│   ├── Home.tsx                    -- Landing page
│   ├── PublicQueue.tsx             -- Queue joining page
│   ├── TicketStatus.tsx            -- Ticket tracking page
│   ├── Dashboard.tsx               -- Admin dashboard shell
│   ├── CompanyManagement.tsx       -- Company registration & settings
│   ├── QueueManagement.tsx         -- Queue admin panel
│   ├── Analytics.tsx               -- Analytics dashboard
│   └── AdminPanel.tsx              -- Platform admin
├── components/
│   ├── DashboardLayout.tsx         -- Admin layout (sidebar)
│   ├── CompanyCard.tsx             -- Company directory card
│   ├── QueueCard.tsx               -- Queue status card
│   ├── TicketForm.tsx              -- Customer entry form
│   ├── TicketDisplay.tsx           -- Ticket status display
│   ├── QueueBoard.tsx              -- Display board view
│   ├── AdminQueuePanel.tsx         -- Admin queue controls
│   └── NotificationCenter.tsx      -- Notification UI
└── lib/
    ├── trpc.ts                     -- tRPC client
    ├── realtime.ts                 -- Data API integration
    └── utils.ts                    -- Helpers
```

## Design System

### Color Palette

The platform uses a professional, trust-inspiring color scheme:

- **Primary**: #0EA5E9 (Sky Blue) — Professional, calm, trustworthy
- **Accent**: #10B981 (Emerald Green) — Success, completion
- **Warning**: #F59E0B (Amber) — Attention, waiting
- **Error**: #EF4444 (Red) — Errors, cancellation
- **Neutral**: #64748B (Slate) — Secondary text, borders

### Typography

- **Headlines**: DM Sans Bold, 24-48px
- **Body**: DM Sans Regular, 14-16px
- **Monospace**: Courier New, 12-14px (for ticket numbers)

### Spacing & Layout

- Base unit: 8px (multiples of 8 for consistency)
- Max content width: 1200px
- Mobile-first responsive design with breakpoints at 640px, 1024px

## Security Considerations

1. **Multi-Tenant Isolation**: All queries include `companyId` filter to prevent data leakage
2. **Authentication**: Manus OAuth for admins; guest flow for customers (no sensitive data)
3. **Authorization**: Role-based checks on every protected procedure
4. **Data Validation**: Zod schemas for all inputs
5. **Rate Limiting**: Prevent abuse of queue joining and API endpoints
6. **Email Verification**: Validate email addresses before sending notifications

## Deployment Strategy

- **Frontend**: Deployed to Manus hosting with auto-scaling
- **Backend**: Express.js running on Manus infrastructure
- **Database**: MySQL/TiDB managed by Manus
- **Storage**: S3 for company logos and assets
- **Email**: Manus built-in email API
- **Real-time**: Data API for WebSocket broadcasting

## Performance Targets

- Landing page load: < 2 seconds
- Queue join response: < 500ms
- Ticket status update: < 1 second (real-time via Data API)
- Admin dashboard load: < 1 second
- Database queries: Indexed on `companyId`, `queueId`, `status`

## Monitoring & Analytics

- Track queue metrics: average wait time, throughput, peak hours
- Monitor system health: API response times, error rates, uptime
- User analytics: companies registered, queues created, tickets processed
- Email delivery: success rate, bounce rate, failure reasons
