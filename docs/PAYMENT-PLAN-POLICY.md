# Advance-payment discount policy

Reference for how Grand Sampan prices early payment. The live numbers are admin-editable; this document is the default model shipped in August 2026.

Edit the live policy at **Admin → Policy → Advance payment discounts** (rate, compounding, downpayment %, delay, tenors, quote lifetime, optional PV tenor pricing, and per-tier override).  
Storage key: `payment-plan-policy` in `AppSetting`.  
Code: `backend/src/payment-plans/`.

---

## Purpose

A buyer who pays more of the plan price sooner is worth more to the resort than one who stretches the same nominal price over 24–36 months. The discount is the present-value difference between those two schedules, not a marketing guess.

The model must never invent this arithmetic. Every quoted price comes from `pv.ts` + `schedule.ts`. A later AI assistant may narrate the result; it must not recompute it.

---

## Discount rate (admin input)

| Setting | Default | Meaning |
| --- | --- | --- |
| Nominal annual rate | **8%** | Resort cost of capital |
| Compounding | **Semiannual** (2 / year) | Periodic rate \(r_p = 4\%\) per half-year |
| Quote TTL | **30 minutes** | Signed quote token lifetime |

Monthly discount factor:

\[
v = (1 + r_p)^{-1/6} = 1.04^{-1/6} \approx 0.99348453
\]

- Effective monthly rate ≈ **0.65582%**
- Effective annual rate = **8.16%**

Changing the rate silently reprices **new** quotes only. Existing bookings keep the snapshotted rate and percentages.

---

## Standard schedule (the baseline)

This is the no-discount path. All fair discounts are measured against it.

| Item | Share of **net** price | When |
| --- | --- | --- |
| Booking (deposit) | 10% | Contract start (month 0) |
| Downpayment | 20% | Month 3 |
| Remainder | 70% | 24 monthly installments in months **4 through 27**, or 8 quarterly |

At 8% semiannual, the present value of this schedule is **92.9314%** of the nominal price.

Installments do **not** start immediately after a merged 30%/50% payment. The first installment still lands at month 4. Merging only moves the downpayment forward.

Cadence: monthly or quarterly. Tenor: **24 or 36 months**, price-neutral by default (`tenorPricing: 'neutral'`). A 36-month standard schedule is worth about **2.54% less** to the resort than 24 months; that gap is shown in admin but not charged unless tenor pricing is switched to `pv`.

---

## Tiers (defaults)

Fair discount:

\[
d = 1 - \frac{PV_{\text{standard}}}{PV_{\text{tier}}}
\]

Both PVs are computed on the **same** nominal price. Because every row scales with the total, applying \(d\) to the price makes the resort indifferent.

Fair discount is always compared to the **same tenor and same cadence** with no advance. Do not compare a 36-month full-pay quote to a 24-month installment baseline.

| Id | Label | Due today | Fair discount (8% s.a., 24 mo monthly) | Offered by default |
| --- | --- | --- | --- | --- |
| `standard` | Booking only | 10% | 0% | 0% (forced) |
| `booking_plus_down` | Booking + downpayment | 30% | **0.4162%** | PV-fair (capped at 12%) |
| `half` | Half advance | 50% | **2.4121%** | PV-fair (capped at 12%) |
| `full` | Full payment | 100% | **7.0686%** | PV-fair (capped at 12%) |

**30% is almost worthless in PV terms.** Merging the downpayment only pulls 20% of the price forward by three months. If sales wants a headline number (e.g. “pay 30% now, save 3%”), set a **fixed override** on that tier. The admin screen will still show the fair value beside it so the subsidy is visible.

### How the offered % is resolved

1. Compute PV-fair \(d\).
2. Multiply by `passThroughPct` (default 100 — buyer gets the full time-value benefit).
3. Clamp to `maxDiscountPct` (default 12).
4. If `discountPct` is a number, that **override** wins.

Standard tier is always offered at 0%.

---

## How a price is built

1. Start from `SharePlan.price` (list).
2. Apply the best live **Promotion** (existing % off). Result = `afterPromo`.
3. Apply the advance-payment offered % to `afterPromo` (sequential, not additive). Result = `netPrice` / `Booking.amountTotal`.
4. Generate the integer-taka schedule on `netPrice`. Fixed buckets use `Math.round`; the last installment absorbs the residual so rows always sum to the total.

`POST /api/booking/quote` is the only calculator. Checkout, catalog chips, and the advisor all consume it. Never trust a client-sent amount.

### Quote lock

Each quote is signed (`quoteToken`, JWT, purpose `booking-quote`, TTL from policy).  
`POST /api/booking` with a valid token honours the **signed** net price.  
Expired or tampered token → `quote_expired`. Checkout refreshes the quote and asks the buyer to confirm the new total.  
The token covers **pricing only**. Plan still must be Unsold; KYC and deposit details still check live state.

---

## Schedule shapes

- **100% upfront** — one `deposit` row for the full net price. No downpayment, no installments.
- **30% or 50%** — one `deposit` row (merged booking + downpayment), then installments. No `downpayment` row.
- **10% standard** — deposit + downpayment + installments (today’s behaviour).

When there is no `downpayment` row, referral **tranche 2** unlocks when the deposit is confirmed (`confirmDeposit` and `markPaid`). Otherwise brokers would never get the remaining 60%.

---

## What is stored on the booking

Snapshot so a later policy edit does not rewrite history:

- `listPrice`
- `promoDiscountPct`, `promoName`
- `advanceDiscountPct`
- `paymentTierId`
- `installmentMonths`, `cadence`
- `discountRateAnnualPct`
- `amountTotal` = net price actually charged

Broker commission snapshots `amountTotal` (the discounted sale). Early pay therefore slightly lowers commission unless a later flag switches commission to list price.

---

## Advisor (`/invest/advisor`)

Deterministic ranker, not an LLM.

Buyer inputs: cash on hand, monthly capacity, horizon (default 36 months), optional referral target (count or taka volume + their own timeline).

It enumerates unsold plan × tier × tenor, then:

- **Feasible without referral** — salary and cash on hand cover every due date.
- **Feasible if target hit** — same test after spreading the buyer’s own referral target (40/60 tranches, tranche 2 delayed 3 months). Count mode values each referral at **that plan’s price**, not a catalog average.
- **Rank** by share-plan yield = midpoint annual rental return ÷ PV of the buyer’s outflow. Referral income is a cash-flow line, not part of the yield that picks the winner.

Responses use **reason codes** (`SAVES_VS_STANDARD`, `INFEASIBLE_WITHOUT_REFERRAL`, …) plus an `assumptions` object. Frontend maps codes to copy today; a future AI layer consumes the same codes and must not redo the math.

---

## Worked example

List price ৳1,000,000. No promotion. 24-month monthly. 8% semiannual.

| Choice | Discount | You pay | Due today |
| --- | --- | --- | --- |
| Standard | 0% | ৳1,000,000 | ৳100,000 |
| 30% now | 0.42% | ৳995,838 | ৳298,751 |
| 50% now | 2.41% | ৳975,879 | ৳487,940 |
| Full now | 7.07% | ৳929,314 | ৳929,314 |

(Whole-taka rounding on a real quote may differ by a few taka.)

---

## Out of scope (on purpose)

- Refund ledger on cancellation (no Payment/Transaction model yet — riskier once full-pay is public).
- Early settlement of an existing installment book.
- Charging extra for 36 months (`tenorPricing: 'pv'` exists but is off).
- Commission on list price instead of net.
- The AI assistant itself (engine is shaped for it; no model key in this work).

---

## Where to look

| What | Where |
| --- | --- |
| PV math + locked fixtures | `backend/src/payment-plans/pv.ts` |
| Integer schedule | `backend/src/payment-plans/schedule.ts` |
| Policy read/write | `GET/PUT /api/payment-plans/policy` |
| Quote | `POST /api/booking/quote` |
| Signed quote token | `backend/src/booking/quote-token.ts` |
| Advisor | `POST /api/advisor/suggest`, `/invest/advisor` |
| Admin UI | `frontend/app/admin/policy/page.tsx` |
| Migration | `backend/prisma/migrations/20260815140000_booking_payment_plan_snapshot` |
