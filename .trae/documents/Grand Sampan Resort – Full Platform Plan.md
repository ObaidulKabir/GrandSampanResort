## Project Overview & Goals
- Build a premium, high-converting platform that sells suites and fractional plans, educates investors, handles bookings/payments, and provides dashboards for investors and admins.
- Target: luxury tourists and investors; brand feel: Maldives + Dubai + Aman Resorts.

## Brand & UX Guidelines
- Colors: Deep ocean blue (#0E3A5A), Champagne gold (#D4AF37), Pearl white (#F8F8F6), Sunset orange (#FF7A3D).
- Typography: Luxury serif for headings (e.g., Playfair Display), clean sans-serif for body (e.g., Inter).
- Visual language: spacious layouts, high-end imagery, refined iconography, motion kept subtle.
- Components: hero with cinematic imagery, premium cards, graph widgets, elegant tables, icon-led feature lists.

## Architecture & Tech Stack
- Frontend: Next.js (React) + Tailwind CSS for SSR/SEO, App Router.
- Backend: Node.js (NestJS) for modular services and typed APIs.
- Database: MongoDB Atlas (primary), with Mongoose or Prisma Mongo (Prisma preferred for type-safety).
- Auth: JWT (access + refresh) + Email OTP, optional TOTP later.
- Payments: SSLCommerz (gateway aggregator) with bKash, Nagad, card; Stripe planned for international.
- Infra: Docker-based deployment; CDN for assets; object storage for media.

## Core Domain Model
- Suite: id, floor, type (Standard/Deluxe/Premium), size, view, totalPrice, revenueShare%, photos, bookingCalendar.
- SharePlan: id, name (Plan A/Plan B/Full Suite), daysPerMonth, lockIn, price, revenueEntitlement.
- Investor: id, KYC status, contact, wallets, ownedSuites, ownedShares.
- Booking: id, suiteId, investorId/guestId, start/end, status, channel, rate, invoiceId.
- Payment: id, method, gatewayRef, amount, currency, status, payerId, target (suite/share/booking).
- Invoice: id, items, totals, taxes, links, status.
- Earnings: id, investorId, month, gross, net, share%, statements.
- Withdrawal: id, investorId, amount, status, approvalTrail.
- AdminUser: id, roles/permissions, activityLog.
- MediaAsset: id, url, tags, alt, placement.

## Public Website (Pages & Features)
- Homepage: hero (“Own the Beach. Earn from It.”), CTAs [Book a Stay] [Invest in a Suite], sections for About, Location, Features, Room Categories, Investment Plans, Returns Calculator, Why Inani, Developer, Testimonials, final CTA.
- About the Project: land size, beachfront, 32 rooms, rooftop café, boutique concept, photo/video gallery.
- Resort Features: icon grid for amenities (restaurant, beach access, balconies, Wi‑Fi, backup power, concierge, housekeeping, security, parking).
- Investment Plans: Plan A (3 days), Plan B (5 days), Full Suite; show price, personal usage, expected return, lock-in, exit; Return Simulator embedded.
- Returns & Income: 60% investor / 40% management fee, occupancy model, sample earnings, long-term capital growth; graphs and explanatory copy.
- FAQ: ownership, legal, exit, revenue, risk, personal stay, transferability.
- Trust: legal disclaimer, documents, developer profile, land info, construction progress, protection model.

## Investor Dashboard
- Overview: portfolio value, earnings, booked vs available days, quick actions.
- Assets: My Suites/Shares with details and calendars.
- Usage: My Stay Days + Request Stay workflow with conflict checks.
- Rental: My Rented Days, channel attribution, occupancy trends.
- Earnings: monthly statements, downloadable PDFs, filters.
- Bookings: calendar view, manage, add-on services.
- Wallet: balance, withdraw earnings, bank/bKash/Nagad linkage.

## Admin Panel
- Inventory: create units, room type, size, price, share plans, availability; bulk upload photos.
- Booking Rules: min/max stay, blackout dates, personal usage limits, lock-in handling.
- Revenue Config: revenue share %, fee structures, settlement cycles.
- Investors: directory, KYC, holdings, activity.
- Bookings: all bookings, channels, statuses, overrides.
- Finance: total revenue, payouts, approve withdrawals, invoices; export reports.
- Content: manage pages (features, FAQs, trust docs), media library.
- Audit: roles/permissions, activity logs, configuration revisions.

## Booking & Payments Flow
- Purchase full suite or fractional plan: collect KYC, price confirmation, pay via SSLCommerz (bKash/Nagad/card), post-payment assignment of unit/share, invoice generation, welcome email.
- Resort stay booking: availability check, rate selection, payment, confirmation, calendar update.
- Payment states: initiated → authorized → captured → settled; webhook handlers for gateway events.

## Returns Simulator & Earnings Logic
- Inputs: selected plan, occupancy %, ADR (average daily rate), management fee (40%), personal usage days.
- Calculation: rentableDays = totalDaysInMonth − personalUsageDays; grossRevenue = ADR × rentableDays × occupancy%; investorShare = grossRevenue × 0.60; net = investorShare − applicable fees/taxes.
- Display: chart of monthly income, sensitivity sliders for occupancy/ADR; sample scenarios.
- Statements: monthly aggregation from bookings, fees, and share rules; PDF generation.

## Authentication & Authorization
- Registration: email OTP verification; optional phone later.
- Sessions: JWT access + refresh; device tracking; revocation list.
- RBAC: roles: investor, admin, super-admin; fine-grained permissions per module.
- Security: rate limiting, CSRF for forms, password hashing (Argon2), IP throttling.

## Data Storage & Reporting
- Collections: suites, sharePlans, investors, bookings, payments, invoices, earnings, withdrawals, admins, media, configs.
- Indexing: by date ranges, suiteId, investorId, status.
- Reporting: pipeline aggregation for occupancy, ADR, revenue, payouts; CSV/PDF exports.

## Security, Compliance & Trust
- Legal disclaimers and documents served via secure CDN with signed URLs.
- KYC document storage encrypted; access controlled.
- Audit trails for admin actions; immutable logs.
- Backup/restore strategy; disaster recovery.

## Deployment & DevOps
- Environments: dev, staging, production.
- CI/CD: tests, lint, type checks, build, deploy.
- Hosting: Frontend on Vercel or Azure Static Web Apps; Backend on Azure App Service or AWS ECS; MongoDB Atlas.
- Observability: logs, metrics, error tracking; uptime monitoring.

## Analytics & SEO
- SEO: SSR pages, meta tags, Open Graph, structured data (Hotel/Accommodation schema).
- Analytics: conversion events for CTAs, funnel tracking for investment/booking flows.

## Initial Repository Structure
- /frontend (Next.js + Tailwind): app pages, components, hooks, charts.
- /backend (NestJS): modules (auth, investors, suites, bookings, payments, earnings, admin), DTOs, controllers, services.
- /infra: IaC templates, Dockerfiles, pipeline configs.
- /docs: brand, legal, API, data model, onboarding.

## Implementation Phases
1. Foundation: repo setup, design system, auth scaffolding.
2. Public Site: homepage and core content pages.
3. Domain & Admin: inventory models, admin panel essentials.
4. Booking & Payments: availability engine, gateway integrations, invoices.
5. Investor Dashboard: assets, earnings, statements, withdrawals.
6. Returns Simulator: calculators and visuals.
7. Trust & Compliance: docs, disclaimers, KYC.
8. Polish & Launch: performance, SEO, analytics, QA.

## Confirmation
- Please confirm this plan and tech choices. On approval, I will scaffold the repository at C:\Unitech\Grand Sampan Resort and begin Phase 1 immediately.