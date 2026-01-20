## Objectives
- Enable admin to create suites with details (size, category, floor, facing, plan).
- Define timeshare plans (e.g., 3/5 days per month), pricing, availability.
- Expose client catalog, availability search, booking, and staged payments.
- Implement schedules: 10% deposit at booking, 20% downpayment within 3/6 months, remainder over 36/48 months monthly/quarterly.

## Domain Model
- Suite: id, name, size, category, floor, facing, status, publishedAt.
- TimeSharePlan: id, suiteId, name, daysPerMonth, durationMonths (36|48), billingCycle (monthly|quarterly), basePrice, currency, bookingDepositRate (10%), downpaymentRate (20%), downpaymentPeriodMonths (3|6).
- Availability: id, suiteId, date, planId? (optional), capacity, status (available/hold/booked), notes.
- PricingRule: id, planId, season (optional), price, activeFrom/To.
- Booking: id, clientId, suiteId, planId, startDate, endDate, status (pending/confirmed/cancelled), amountTotal, createdAt.
- PaymentScheduleItem: id, bookingId, type (deposit/downpayment/installment), dueDate, amount, status (due/paid/overdue), gatewayRef.
- Payment: id, bookingId, scheduleItemId, paidAt, amount, method, gatewayTxnId, status.

## Backend Architecture (NestJS)
- Persistence: add PostgreSQL + Prisma (or TypeORM). Migrate in-memory repos to DB.
- Auth & Roles: JWT-based auth, RolesGuard (admin/client). Protect admin endpoints.
- Modules:
  - SuitesModule: Admin CRUD for suites; publish/unpublish.
  - TimesharesModule: CRUD for timeshare plans; calculators.
  - AvailabilityModule: manage calendar slots; bulk set/update; check overlaps.
  - PricingModule: rules per plan; seasonal support.
  - BookingModule: availability check, booking creation; generate payment schedule.
  - PaymentsModule: capture/record payments; gateway integration; webhooks.
  - UsersModule: clients/admins management.
- DTOs & Validation: class-validator/class-transformer across controllers.
- Endpoints (examples):
  - Admin Suites: POST/PUT/DELETE /admin/suites; GET /admin/suites/:id.
  - Admin Plans: POST/PUT/DELETE /admin/suites/:id/plans.
  - Admin Availability: POST /admin/suites/:id/availability (bulk dates); GET /admin/suites/:id/availability.
  - Admin Pricing: POST/PUT /admin/plans/:id/pricing.
  - Client Catalog: GET /suites (public); GET /suites/:id/plans; GET /availability?suiteId&planId&range.
  - Booking: POST /booking (calculates deposit & schedule); GET /booking/:id; GET /booking/:id/schedule.
  - Payments: POST /payments/deposit|downpayment|installment; POST /payments/webhook.

## Payment Logic
- Deposit: 10% of total at booking; due immediately to confirm.
- Downpayment: 20% due within selected period (3 or 6 months) after booking; can be split or single invoice.
- Remainder: total - deposit - downpayment; spread over 36/48 months; monthly or quarterly. Generate items with due dates, round to cents, last installment adjusts remainder.
- Status Transitions: booking pending→confirmed on deposit; overdue handling; cancellation rules.

## Frontend Architecture (Next.js)
- Auth & State: Zustand store extended with token and role; interceptors attach Authorization; protected routes for admin.
- Admin UI:
  - Suite Form: fields (name, size, category, floor, facing, plan type); publish toggle.
  - Timeshare Builder: daysPerMonth, duration, billingCycle, pricing inputs.
  - Availability Calendar: date picker with bulk set; view conflicts.
  - Pricing Rules: seasonal adjustments table.
- Client UI:
  - Catalog: list suites and associated plans; filters by category/facing.
  - Availability Search: select suite/plan + date range; shows availability.
  - Booking Wizard: plan selection → dates → price summary → deposit payment.
  - Payments: screens for downpayment and installments; receipts.
  - Dashboard: upcoming dues, payment history, booking details.
- Forms & Validation: React Hook Form + Zod; Tailwind components consistent with current design.

## Data Flows
- Admin creates suite and timeshare plan → sets availability/pricing → publishes.
- Client browses catalog → checks availability → creates booking → pays 10% deposit → schedule created → pays downpayment within window → pays installments per cadence.

## Milestones
1. Foundations: DB integration, auth/roles, module scaffolding, DTOs, basic CRUD for suites/plans.
2. Availability & Pricing: calendar management, pricing rules, public catalog endpoints.
3. Booking & Schedule: availability check, booking creation, payment schedule generation; client booking UI.
4. Payments: mock → gateway integration (bKash/Nagad/card), webhooks, receipts; client dashboard.
5. Hardening: validations, logging, error handling, concurrency locks, tests.

## Acceptance Criteria
- Admin can fully manage suites/plans/availability/pricing with role-protected APIs and UI.
- Clients can discover, check availability, book, and see payment schedules.
- Payment schedule enforces deposit, downpayment window, and installment cadence.
- Endpoints covered by tests; consistent error handling and security.

## Considerations
- Concurrency: prevent double-booking; transactional create.
- Time zones & calendars: store UTC, display local.
- Rounding & proration: deterministic amounts; final installment adjustment.
- Notifications: email/SMS for due reminders (future phase).

Please confirm this plan. Once approved, I will implement step-by-step within the repository.