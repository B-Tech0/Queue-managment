# QueueFlow SaaS — Implementation TODO

## Phase 1: Database Schema & Backend Setup

### Database Schema
- [ ] Create `companies` table with slug, name, industry, branding fields
- [ ] Create `queues` table with company relationship and service types
- [ ] Create `tickets` table with status tracking and position management
- [ ] Create `notifications` table for email tracking
- [ ] Create `companyAdmins` table for role-based access
- [ ] Add indexes on `companyId`, `queueId`, `status` for query performance
- [ ] Run `pnpm db:push` to apply migrations

### Backend API — Companies
- [ ] Implement `companies.register` procedure (protected, creates company and admin relationship)
- [ ] Implement `companies.list` procedure (public, paginated with search)
- [ ] Implement `companies.getBySlug` procedure (public, for queue joining)
- [ ] Implement `companies.getById` procedure (protected, admin only)
- [ ] Implement `companies.update` procedure (protected, company admin only)
- [ ] Implement `companies.getMyCompanies` procedure (protected, returns user's companies)
- [ ] Add slug generation and validation (alphanumeric, lowercase, unique)
- [ ] Add company branding validation (color format, logo URL)

### Backend API — Queues
- [ ] Implement `queues.create` procedure (protected, company admin)
- [ ] Implement `queues.list` procedure (protected, company admin)
- [ ] Implement `queues.update` procedure (protected, company admin)
- [ ] Implement `queues.delete` procedure (protected, company admin)
- [ ] Add queue validation (name required, average service time > 0)

### Backend API — Tickets
- [ ] Implement `tickets.join` procedure (public, guest flow)
- [ ] Implement `tickets.getByNumber` procedure (public, guest access with ticket number)
- [ ] Implement `tickets.list` procedure (protected, company admin)
- [ ] Implement `tickets.callNext` procedure (protected, company admin)
- [ ] Implement `tickets.markServing` procedure (protected, company admin)
- [ ] Implement `tickets.markDone` procedure (protected, company admin)
- [ ] Implement `tickets.cancel` procedure (protected, admin or guest with token)
- [ ] Implement `tickets.getStats` procedure (protected, company admin)
- [ ] Add ticket number generation (format: LETTER + 3-digit number)
- [ ] Add position calculation logic (update all waiting tickets when one is removed)
- [ ] Add estimated wait time calculation (position × average service time)

### Backend API — Notifications
- [ ] Implement `notifications.send` procedure (internal, triggered by ticket status changes)
- [ ] Implement `notifications.list` procedure (protected, company admin)
- [ ] Implement `notifications.retry` procedure (protected, admin)
- [ ] Add email template system for different notification types
- [ ] Add notification queue processing (background job or scheduled task)
- [ ] Integrate with Manus email API

### Backend Utilities
- [ ] Create database query helpers in `server/db.ts`
- [ ] Create RBAC middleware (adminProcedure, companyAdminProcedure)
- [ ] Create email notification helper
- [ ] Create Data API integration for real-time broadcasting
- [ ] Add input validation with Zod schemas

### Backend Tests
- [ ] Write vitest tests for company registration
- [ ] Write vitest tests for queue creation and management
- [ ] Write vitest tests for ticket joining and status updates
- [ ] Write vitest tests for RBAC enforcement
- [ ] Write vitest tests for notification system

## Phase 2: Frontend — Landing Page & Company Directory

### Landing Page (`/`)
- [ ] Create hero section with value proposition
- [ ] Create company directory with search and filter
- [ ] Create company cards with industry icons and basic info
- [ ] Add call-to-action for company registration
- [ ] Add call-to-action for joining a queue
- [ ] Implement responsive design (mobile-first)
- [ ] Add loading and error states

### Company Directory
- [ ] Implement search by company name
- [ ] Implement filter by industry type
- [ ] Implement pagination (20 companies per page)
- [ ] Add company card with logo, name, industry, and link to queue
- [ ] Add "Join Queue" button on each card

### Navigation
- [ ] Create main navigation bar with logo and links
- [ ] Add login button (redirects to Manus OAuth)
- [ ] Add responsive mobile menu
- [ ] Add breadcrumb navigation for sub-pages

## Phase 3: Frontend — Public Queue Interface

### Queue Joining Page (`/q/[company-slug]`)
- [ ] Create company header with logo and name
- [ ] Create queue selection dropdown (if multiple queues)
- [ ] Create customer entry form (name, email, phone, service)
- [ ] Add form validation with error messages
- [ ] Add submit button that calls `tickets.join`
- [ ] Show success message and redirect to ticket status page
- [ ] Add loading state during form submission
- [ ] Implement responsive design

### Ticket Status Page (`/q/[company-slug]/ticket`)
- [ ] Display ticket number prominently
- [ ] Show current status (waiting, called, serving, done)
- [ ] Show position in queue
- [ ] Show estimated wait time
- [ ] Show ETA (calculated time)
- [ ] Add real-time status updates via Data API
- [ ] Add polling fallback (3-second intervals)
- [ ] Show counter/window number when called or serving
- [ ] Add "Cancel Ticket" button
- [ ] Add company contact information
- [ ] Implement responsive design with mobile-optimized layout

### Real-Time Updates
- [ ] Integrate Data API for WebSocket connection
- [ ] Implement ticket status subscription
- [ ] Handle connection loss and reconnection
- [ ] Update UI when status changes
- [ ] Update position when other tickets are completed
- [ ] Show visual feedback for status transitions

## Phase 4: Frontend — Admin Dashboard

### Dashboard Shell (`/dashboard`)
- [ ] Create DashboardLayout with sidebar navigation
- [ ] Add user profile dropdown
- [ ] Add logout functionality
- [ ] Implement role-based navigation (owner vs company admin)

### Company Management (`/dashboard/companies`)
- [ ] Create company registration form
- [ ] Add company list with edit/delete actions
- [ ] Implement company settings page (name, industry, branding)
- [ ] Add logo upload to S3
- [ ] Add color picker for branding
- [ ] Implement company activation/deactivation

### Queue Management (`/dashboard/queues`)
- [ ] Create queue list for selected company
- [ ] Add queue creation form
- [ ] Add queue edit form
- [ ] Add queue deletion with confirmation
- [ ] Show queue statistics (total tickets, average wait time)
- [ ] Add queue activation/deactivation

### Admin Queue Panel
- [ ] Display current queue with all tickets
- [ ] Show ticket details (customer name, service, time in queue)
- [ ] Add "Call Next" button
- [ ] Add "Mark Serving" button
- [ ] Add "Mark Done" button
- [ ] Add "Cancel Ticket" button
- [ ] Show ticket status badges
- [ ] Implement real-time queue updates
- [ ] Add counter/window number assignment

### Analytics Dashboard (`/dashboard/analytics`)
- [ ] Show total tickets processed today
- [ ] Show average wait time
- [ ] Show peak hours chart
- [ ] Show service time distribution
- [ ] Show queue efficiency metrics
- [ ] Add date range filter
- [ ] Add export to CSV functionality

## Phase 5: Frontend — Queue Display Board

### Display Board View (`/q/[company-slug]/board`)
- [ ] Create full-screen display mode
- [ ] Show currently called ticket number
- [ ] Show next 3-5 tickets in queue
- [ ] Show counter/window assignments
- [ ] Add large, readable fonts for visibility
- [ ] Implement auto-refresh (every 5 seconds)
- [ ] Add company branding and colors
- [ ] Optimize for TV/monitor display

### Display Board Controls
- [ ] Create settings page for display board
- [ ] Add refresh rate configuration
- [ ] Add font size adjustment
- [ ] Add color scheme options
- [ ] Add logo and company name display toggle

## Phase 6: Email Notifications

### Notification System
- [ ] Implement email template for "called" notification
- [ ] Implement email template for "serving" notification
- [ ] Implement email template for "done" notification
- [ ] Implement email template for "reminder" notification
- [ ] Add notification queue processing (background job)
- [ ] Implement retry logic with exponential backoff
- [ ] Add notification status tracking (sent, failed)
- [ ] Implement email delivery logging

### Notification Triggers
- [ ] Send email when ticket status changes to "called"
- [ ] Send email when ticket status changes to "serving"
- [ ] Send email when ticket status changes to "done"
- [ ] Send reminder email after 15 minutes of waiting
- [ ] Include counter/window number in "called" email

## Phase 7: Polish & Optimization

### Design & UX
- [ ] Ensure consistent branding across all pages
- [ ] Add loading skeletons for better perceived performance
- [ ] Add empty states for all list views
- [ ] Add error boundaries and error messages
- [ ] Implement smooth transitions and animations
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test on tablets and desktop
- [ ] Ensure accessibility (WCAG 2.1 AA)

### Performance
- [ ] Optimize database queries (add missing indexes)
- [ ] Implement query result caching where appropriate
- [ ] Optimize image sizes and formats
- [ ] Implement lazy loading for company logos
- [ ] Add performance monitoring

### Security
- [ ] Implement rate limiting on public endpoints
- [ ] Add CSRF protection
- [ ] Validate all user inputs
- [ ] Implement proper error messages (no sensitive data leaks)
- [ ] Test multi-tenant isolation
- [ ] Audit RBAC enforcement

### Testing
- [ ] Write integration tests for critical flows
- [ ] Test company registration flow end-to-end
- [ ] Test queue joining and ticket tracking
- [ ] Test admin queue management
- [ ] Test real-time updates
- [ ] Test email notifications
- [ ] Test RBAC enforcement

## Phase 8: Deployment & Documentation

### Deployment
- [ ] Create checkpoint before deployment
- [ ] Deploy to Manus hosting
- [ ] Configure custom domain (if needed)
- [ ] Set up monitoring and alerting
- [ ] Configure email service
- [ ] Test all features in production

### Documentation
- [ ] Create user guide for company admins
- [ ] Create user guide for end users
- [ ] Create API documentation
- [ ] Create deployment guide
- [ ] Create troubleshooting guide

## Completed Items

(Items will be marked as complete during implementation)
