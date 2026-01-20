## Git History Snapshot

* Repository: GrandSampanRemote.git (bare repo present)

* Default branch: dev (refs/heads/dev)

* CI configured for dev and main branches: [ci.yml](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/.github/workflows/ci.yml)

* Recent significant changes (by code state):

  * Backend

    * Added Settings module for revenue policy: [settings.controller.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/settings/settings.controller.ts), [settings.service.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/settings/settings.service.ts), [settings.repository.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/settings/settings.repository.ts), [settings.module.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/settings/settings.module.ts)

    * Timeshare plans: explicit timeFraction support and blank-ID cleanup endpoint: [timeshares.service.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/timeshares/timeshares.service.ts), [timeshares.controller.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/timeshares/timeshares.controller.ts), [timeshares.repository.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/timeshares/timeshares.repository.ts)

    * Suites size normalized to number: [models.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/domain/models.ts#L1-L9), [suites.repository.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/suites/suites.repository.ts)

    * Payments and Booking wiring + concurrency lock fix: [payments.module.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/payments/payments.module.ts), [booking.service.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/booking/booking.service.ts)

    * CORS updated to allow 3000 and 3001: [main.ts](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/src/main.ts)

    * Docker added: [backend/Dockerfile](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/Dockerfile), [.dockerignore](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/backend/.dockerignore)

  * Frontend

    * Admin Units: list, create, edit: [admin/units/page.tsx](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/app/admin/units/page.tsx), [admin/units/new/page.tsx](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/app/admin/units/new/page.tsx), [admin/units/\[id\]/edit/page.tsx](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/app/admin/units/%5Bid%5D/edit/page.tsx)

    * Share Plans: list, create (with timeFraction), inline edit, full edit page, delete: [admin/units/\[id\]/plans/page.tsx](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/app/admin/units/%5Bid%5D/plans/page.tsx), [admin/units/\[id\]/plans/\[planId\]/edit/page.tsx](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/app/admin/units/%5Bid%5D/plans/%5BplanId%5D/edit/page.tsx)

    * Navbar unit-size banner and suites catalog unit update: [Navbar.tsx](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/components/Navbar.tsx), [suites/page.tsx](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/app/suites/page.tsx)

    * Docker added: [frontend/Dockerfile](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/Dockerfile), [.dockerignore](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/frontend/.dockerignore)

  * Compose at root: [docker-compose.yml](file:///c:/Users/HP/GrandSampanResort/Unitech/Grand%20Sampan%20Resort/docker-compose.yml)

## Proposed Git Workflow

* Branches: main (protected), dev (integration), feature/\* (short-lived per task), hotfix/\*

* Commit style: Conventional Commits (feat:, fix:, refactor:, docs:, chore:, test:, ci:)

* PR rules: required review, CI green, semantic PR titles, squash merge with conventional commit title

* Tags & releases: annotated tags on main; changelog generated from commits

## Database & Infrastructure Plan

* Choose PostgreSQL with Prisma ORM for type-safe queries

* Schema & migrations:

  * Tables: suites, share\_plans, bookings, clients, settings (revenue policy)

  * Migrate in-memory repositories to Prisma services; keep controller contracts unchanged

* Docker Compose update:

  * Add postgres service (port 5432) with volume; add prisma migrate step in backend service start

  * Secrets via .env; never commit credentials

* Seed data:

  * Prisma seed script mirroring /admin/seed endpoint; unify seed paths

* CI:

  * Extend GitHub Actions to spin up Postgres, run prisma migrate, run tests

  * Build Docker images on dev and main; push to registry on main

## Backend Enhancements

* Validation & guards:

  * DTOs with class-validator for suites, plans, bookings

  * Enforce non-empty IDs and numeric types at controller level

* Booking consistency:

  * Add overlap checks at DB level (unique constraints on date ranges per suite)

  * Transactional creation with schedule generation

* Settings API:

  * Extend revenue-policy to include fee buckets; version policies

## Frontend Enhancements

* Admin UX polish:

  * Add policy display/edit page consuming /settings/revenue-policy

  * Form validation and success/error toasts

* Plans UI:

  * Derive revenue share from timeFraction; display helper examples

  * Prevent blank IDs, duplicate IDs (pre-check against GET /timeshares/:id)

* Dashboard widgets:

  * Recent bookings, earnings estimation (policy + timeFraction)

## DevOps & Quality

* Add pre-commit hooks (lint, typecheck)

* Expand test coverage: unit (services), integration (controllers), frontend component tests

* Healthchecks: backend /health, frontend ready probe; add to compose

## Next Steps (after your confirmation)

1. Implement Postgres via compose and Prisma; define schema and migrations
2. Replace in-memory repos with Prisma services; keep endpoints stable
3. Add seed scripts and CI steps for DB
4. Harden validation and add DTOs across controllers
5. Frontend: policy page and validations; UX improvements
6. Document updated workflow in README and infra/README

