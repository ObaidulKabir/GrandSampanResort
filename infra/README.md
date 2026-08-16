## Infrastructure & Environments

- Environments: `dev`, `staging`, `production`
- Deployment: Docker Compose on VPS / Cloud Servers managed via GitHub Actions CI/CD workflows.
- CI/CD & Environment Secrets Documentation: see [CICD-ENVIRONMENTS.md](../docs/CICD-ENVIRONMENTS.md)

### Workflows
- `.github/workflows/ci.yml`: Pull Request testing & validation
- `.github/workflows/staging.yml`: Automated CI & deployment to Staging environment
- `.github/workflows/production.yml`: Automated CI & deployment to Production environment
