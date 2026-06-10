# CI/CD Pipeline — DocuForge

Three GitHub Actions workflows handle correctness gating (PR) and deploy (push to `dev`/`main`).

## Workflows

| File | Trigger | What it does |
|---|---|---|
| `ci.yml` | PR → `dev` or `main` | Typecheck + test api & frontend. Gate only — no deploy. |
| `deploy-staging.yml` | Push → `dev` | Calls reusable tests, builds + pushes images to GHCR, SSH-deploys to staging host. |
| `deploy-prod.yml` | Push → `main` | Same as staging but targets prod host and `latest` tags. |
| `ci-reusable.yml` | `workflow_call` only | Shared test jobs consumed by both deploy workflows. |

## Image registry

GHCR (`ghcr.io/kintama48/`) via the built-in `GITHUB_TOKEN` — no extra registry secret needed. The `build-and-deploy` job has `packages: write` permission.

Tags pushed per env:

- Staging: `staging`, `staging-<short-sha>`
- Prod: `latest`, `prod-<short-sha>`

## Required GitHub repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

### Staging

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY_STAGING` | Private half of the ed25519 keypair generated below |
| `SSH_HOST_STAGING` | IP or hostname of the staging droplet |
| `SSH_USER_STAGING` | Linux user that owns the repo on the droplet (e.g. `deploy`) |
| `SSH_DEPLOY_PATH_STAGING` | Absolute path to the repo clone on the droplet (e.g. `/srv/docuforge`) |

### Prod

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY_PROD` | Private half of a separate ed25519 keypair |
| `SSH_HOST_PROD` | IP or hostname of the prod droplet |
| `SSH_USER_PROD` | Linux user (e.g. `deploy`) |
| `SSH_DEPLOY_PATH_PROD` | Absolute path on the prod droplet |

## One-time host bootstrap (per environment)

Run these steps once per droplet before the first CI deploy:

```bash
# 1. Generate a dedicated deploy keypair (do NOT reuse your personal key)
ssh-keygen -t ed25519 -f ./ci-deploy-staging -N ""
# Repeat with -f ./ci-deploy-prod for prod

# 2. Add the public key to the droplet
ssh-copy-id -i ./ci-deploy-staging.pub <user>@<staging-host>
# Or manually append to ~/.ssh/authorized_keys on the droplet

# 3. Paste the private key content into the GitHub secret
cat ./ci-deploy-staging   # copy this → SSH_PRIVATE_KEY_STAGING
# Then delete the local keypair files — they only need to live in GitHub secrets

# 4. Ensure Docker + docker compose v2 are installed on the droplet
# 5. Clone the repo to SSH_DEPLOY_PATH on the droplet
#    git clone https://github.com/kintama48/docuforge.git /srv/docuforge
# 6. Create api/.env.stag (staging) or api/.env (prod) on the droplet
#    (see docs/restart-checklist.md §3 for required vars)
# 7. Create frontend/.env on the droplet
```

## Deploy script

`deploy/deploy.sh <env> <sha>` is the only host-specific touchpoint. To switch hosting providers, change the SSH secrets — the script itself contains no provider-specific commands.

It:
1. Validates that `docker-compose.<env>.yml` exists in the current directory.
2. Runs `docker compose -f docker-compose.<env>.yml pull` to fetch the freshly-pushed images.
3. Runs `docker compose -f docker-compose.<env>.yml up -d --remove-orphans`.

## Swapping the host

Change `SSH_HOST_*`, `SSH_USER_*`, `SSH_PRIVATE_KEY_*`, and `SSH_DEPLOY_PATH_*` to point at any Docker-capable machine. Nothing else needs to change.
