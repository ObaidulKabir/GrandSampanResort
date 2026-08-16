# CI/CD & Environments Setup Guide

This guide details how the continuous integration and deployment (CI/CD) pipelines for **Staging** and **Production** are configured, how they are isolated, and how to configure GitHub Environment secrets.

---

## 1. Architecture Overview

```
                 ┌────────────────────────────────────────────────────────┐
                 │                      GitHub Repo                       │
                 └───────┬────────────────────────┬───────────────┬───────┘
                         │                        │               │
                  Pull Requests                 Push to         Push to
                 (main/dev/staging)           dev/staging          main
                         │                        │               │
                         ▼                        ▼               ▼
                   ┌───────────┐            ┌───────────┐   ┌───────────┐
                   │   ci.yml  │            │staging.yml│   │production.│
                   │           │            │           │   │    yml    │
                   └─────┬─────┘            └─────┬─────┘   └─────┬─────┘
                         │                        │               │
                    Tests Only              Tests + Deploy  Tests + Deploy
                   (No Deploy)                    │               │
                                                  ▼               ▼
                                           ┌─────────────┐ ┌─────────────┐
                                           │ Environment:│ │ Environment:│
                                           │   staging   │ │ production  │
                                           └──────┬──────┘ └──────┬──────┘
                                                  │               │
                                            Staging SSH     Prod SSH
                                              Secrets         Secrets
                                                  │               │
                                                  ▼               ▼
                                           ┌─────────────┐ ┌─────────────┐
                                           │Staging Host │ │ Prod Host   │
                                           │ Port: 3004  │ │ Port: 3005  │
                                           └─────────────┘ └─────────────┘
```

### Pipelines

| Workflow File | Trigger | Environment | Action |
|---|---|---|---|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Pull Requests against `main`, `dev`, `staging` | None | Runs backend tests, integration tests, frontend checks & builds, and docker image build validation. |
| [`.github/workflows/staging.yml`](../.github/workflows/staging.yml) | Push to any branch other than `main` (e.g. `dev`, `staging`, feature branches) or `workflow_dispatch` | `staging` | Runs tests & builds, then SSH deploys to staging server via `docker-compose.staging.yml`. |
| [`.github/workflows/production.yml`](../.github/workflows/production.yml) | Push to `main` or `workflow_dispatch` | `production` | Runs tests & builds, then SSH deploys to production server via `docker-compose.production.yml`. |

---

## 2. Setting Up GitHub Environments & Secrets

To ensure credentials and infrastructure targets are strictly isolated, follow these steps in your GitHub repository:

### Step 2.1: Open GitHub Repository Settings
1. Navigate to your repository on GitHub.
2. Click **Settings** > **Environments** (under *Code and automation*).

---

### Step 2.2: Create the `staging` Environment
1. Click **New environment**.
2. Name: `staging`.
3. Click **Configure environment**.
4. *(Optional)* Under **Deployment branches and tags**, restrict deployments to `dev` and `staging` branches.
5. Under **Environment secrets**, click **Add secret** for each of the following:

| Secret Name | Description | Example Value |
|---|---|---|
| `STAGING_SSH_HOST` | IP address or domain of staging server | `192.168.1.100` or `staging-server.example.com` |
| `STAGING_SSH_USER` | SSH username on staging server | `ubuntu` or `deploy` or `root` |
| `STAGING_SSH_KEY` | Private SSH key (PEM / OpenSSH format) with deploy access | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `STAGING_SSH_PORT` | SSH port (optional, defaults to 22) | `22` |
| `STAGING_APP_PATH` | Full directory path on staging server where repo is cloned | `/home/deploy/grandsampanresort-staging` |

---

### Step 2.3: Create the `production` Environment
1. Click **New environment**.
2. Name: `production`.
3. Click **Configure environment**.
4. *(Optional)* Under **Deployment protection rules**, enable **Required reviewers** if you want manual sign-off before production deployments.
5. Under **Deployment branches and tags**, select **Selected branches** and add `main`.
6. Under **Environment secrets**, click **Add secret** for each of the following:

| Secret Name | Description | Example Value |
|---|---|---|
| `SSH_HOST` | IP address or domain of production server | `203.0.113.10` or `prod-server.example.com` |
| `SSH_USER` | SSH username on production server | `ubuntu` or `deploy` or `root` |
| `SSH_KEY` | Private SSH key (PEM / OpenSSH format) with deploy access | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `SSH_PORT` | SSH port (optional, defaults to 22) | `22` |
| `APP_PATH` | Full directory path on production server where repo is cloned | `/home/deploy/grandsampanresort-prod` |

---

## 3. Server-Side Configuration

Each server (or directory on a shared server) must have its own `.env` file and Git repository initialized.

### Staging Server Setup:
1. Clone repo:
   ```bash
   git clone <repo-url> /home/deploy/grandsampanresort-staging
   cd /home/deploy/grandsampanresort-staging
   git checkout dev
   ```
2. Create staging `.env` from template:
   ```bash
   cp .env.staging.example .env
   # Edit with staging credentials
   nano .env
   ```
3. Initial deployment check:
   ```bash
   docker compose -f docker-compose.staging.yml up -d --build
   ```

### Production Server Setup:
1. Clone repo:
   ```bash
   git clone <repo-url> /home/deploy/grandsampanresort-prod
   cd /home/deploy/grandsampanresort-prod
   git checkout main
   ```
2. Create production `.env` from template:
   ```bash
   cp .env.production.example .env
   # Edit with production credentials
   nano .env
   ```
3. Initial deployment check:
   ```bash
   docker compose -f docker-compose.production.yml up -d --build
   ```

---

## 4. Docker Service & Port Mapping Summary

| Service | Staging (Port / Name) | Production (Port / Name) |
|---|---|---|
| **Frontend** | Host `3004` (`grand-sampan-staging-frontend`) | Host `3005` (`grand-sampan-prod-frontend`) |
| **Backend** | Host `4004` (`grand-sampan-staging-backend`) | Host `4005` (`grand-sampan-prod-backend`) |
| **Database** | Internal network (`grand-sampan-staging-db`) | Host `5432` / Internal (`grand-sampan-prod-db`) |
| **Network** | `grand-sampan-staging-network` | `grand-sampan-prod-network` |
| **Volumes** | `grand_sampan_staging_uploads_data`, `grand_sampan_staging_pgdata` | `grand_sampan_prod_uploads_data`, `grand_sampan_prod_pgdata` |

---

## 5. Troubleshooting & Verification

1. **How to run a manual deployment:**
   - In GitHub: Go to **Actions** tab > select **Staging CI/CD** (or **Production CI/CD**) > click **Run workflow** > select branch > click **Run workflow**.

2. **SSH Connection Refused / Permission Denied:**
   - Ensure the public key corresponding to `SSH_KEY` is added to `~/.ssh/authorized_keys` on the target server.
   - Ensure `SSH_USER` has permissions to run `docker compose` without password prompts (user in `docker` group).
   - Ensure directory permissions on `APP_PATH` allow the SSH user to pull and modify files.

3. **Check container logs:**
   - Staging: `docker compose -f docker-compose.staging.yml logs -f`
   - Production: `docker compose -f docker-compose.production.yml logs -f`
