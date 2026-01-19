## Goals
- Provide a rich “View Details” for share plans with clear pricing, entitlements, unit context, and payment preview
- Keep it actionable: availability glimpse, schedule preview, and CTA to invest

## Route 
- New page: /pricing/plans/[id] (matches existing backend route)
- Accept plan id from URL; show a back link and breadcrumbs

## Data Fetch
- GET /timeshares/:id → plan basics (name, days/month, type, price, status, timeFraction, suiteId)
- GET /suites/:suiteId → unit context (type, view, floor, size)
- GET /pricing/plans/:id → pricing rules list (seasonal price rules, if any)
- GET /booking/availability?suiteId=…&start=…&end=… → conflict check for next 30 days

## UI Structure
1) Header
- Plan name + short descriptor (days/month, plan type)
- Badge for status (Unsold/Reserved/etc.)

2) Summary Cards (grid of 4)
- Price (৳), Entitlement (days/month), Time Fraction (%), Suite (id/type/view)

3) Unit Details
- Card with suite type, view, floor, size, and a thumbnail icon

4) Availability Snapshot
- Simple month window showing “Available/Conflict” for the plan’s suite (compact badges or text)

5) Payment Preview
- Compute deposit (10%), downpayment (20%), and installment breakup client-side using existing cadence logic
- Table: deposit, downpayment (T+3 months), monthly installments for lock-in duration
- Totals row; currency noted

6) Pricing Rules (optional)
- If rules exist: table with start, end, override price
- Explain rule precedence briefly

7) Actions
- Primary: “Proceed to Invest” → link to /investor (or a dedicated invest flow later)
- Secondary: “Contact Sales” → simple mailto/phone link
- Disclaimer text at bottom

## UX Details
- Loading and error states per data segment
- Consistent brand styles (Playfair headings, ocean text, gold borders)
- Mobile-friendly layout (cards stack, tables scroll)

## Implementation Steps
1) Create app/pricing/plans/[id]/page.tsx
- Client page; fetch APIs on mount
- Build sections (Header, Summary, Unit, Availability, Payment, Rules, Actions)
2) Add “View Details” links to use /pricing/plans/[id] where relevant (already used in Invest)
3) Reuse existing API helper (frontend/lib/api.ts)

## Future Enhancements
- Server-side data fetching for faster initial paint
- Add real booking start/end selection to preview schedule for chosen dates
- Tighten auth to tailor actions by user role

Proceed to implement the /pricing/plans/[id] page and wire it to existing “View Details” links?