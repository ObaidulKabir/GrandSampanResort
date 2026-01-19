## Goals
- Present a self‑service investor dashboard focused on holdings, payments, schedules, and key dates
- Show what the investor purchased, status, upcoming payments, totals paid/outstanding, and handover dates
- Enable payment actions (mock gateway) and provide documents/support access

## Data & Sources
- Identity: GET /auth/me → current investor id, name, email
- Holdings: booking records referencing investorId (not yet listed by investor) → add endpoint
- Payment schedule: GET /booking/:id/schedule → list of PaymentScheduleItem with status due/paid
- Payment action: POST /payments/pay { bookingId, itemId, amount, method }
- Suite info: GET /suites/:id
- Plan info: GET /pricing/plans/:id (optional rules) and GET /timeshares/:id

## Backend Additions (minimal)
1. Booking: list by investor
   - Route: GET /booking/investor/:id
   - Service: listByInvestor(investorId) → join (suiteId, planId) and return array {booking, suite, plan}
2. Booking: booking summary
   - Route: GET /booking/:id/summary
   - Service: compute totals: amountTotal, paidTotal, outstanding, nextDue (item), nextDueDate, handoverDate (derive or store)
3. Optional: handover date
   - Store handoverDate on booking (new nullable field) or derive from plan rule; expose in summary

## Frontend Redesign (app/investor/page.tsx)
- Replace tabs with a dashboard layout:
  1) Header: investor name/email, quick actions, last login
  2) KPIs: cards for Portfolio value, Paid to date, Outstanding, Next due amount/date
  3) Holdings list: table/cards per booking
     - Columns: Unit (suiteId, type, view), Plan (name, days/month), Status, Handover date, Actions
     - Expand row to show schedule
  4) Upcoming payments: compact list from all schedules where status = 'due' sorted by date
     - Pay button → calls POST /payments/pay and updates schedule to paid
  5) Documents & support: links for contract, receipts (placeholders), contact info

## API Calls (client)
- GET /auth/me → user
- GET /booking/investor/:id → holdings (booking with suite + plan)
- GET /booking/:bookingId/summary → totals & next due
- GET /booking/:bookingId/schedule → full schedule
- POST /payments/pay → on pay action

## UI/State Structure
- React state: user, holdings[], schedulesByBookingId, summariesByBookingId, upcomingPayments[]
- Loading and error states per section
- Optimistic updates for payment; re‑fetch summary & schedule after success

## Security & Roles
- The investor dashboard must only show data for /auth/me user
- For demo, reuse Authorization: Bearer admin for backend guard where needed; later switch to real tokens

## Migration Notes
- Add handoverDate field to booking (nullable); seed sample data
- If not storing, compute provisional handoverDate: booking.end + 30 days

## Deliverables
- Backend: two routes (+ optional handoverDate store); unit tests for listByInvestor and summary
- Frontend: new investor dashboard page with KPIs, holdings, schedule, payments

## Confirmation
Proceed to implement backend routes and the redesigned investor dashboard as described?