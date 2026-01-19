# Unitech Grand Sampan Resort – Investor & Booking Platform

Luxury beachfront resort & fractional ownership platform. Monorepo structure:

- frontend: Next.js + Tailwind premium website & dashboards
- backend: NestJS API services (auth, booking, payments, earnings)
- infra: deployment, Docker, CI/CD
- docs: brand, legal, API, data model

## Git Workflow
- Branches:
  - `main`: protected release branch
  - `dev`: integration branch
  - `feature/*`: short-lived task branches
  - `hotfix/*`: urgent fixes from `main`
- Commits: use Conventional Commits (feat, fix, refactor, docs, ci, chore, test)
- PR rules: CI must pass; squash merge with semantic title
- Releases: tag on `main` with annotated tags; changelog generated from commits

## CI
- GitHub Actions runs tests for backend and frontend on `dev` and `main`
- Backend job provisions Postgres, runs Prisma generate/migrate/seed, then tests
- Docker job builds backend and frontend images for validation

## Docker (Dev)
- See `docker-compose.yml` for backend, frontend, and Postgres services
- Backend expects `DATABASE_URL`; an example is provided in `backend/.env.example`

