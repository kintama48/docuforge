# Co-location migration runbook

Single droplet hosting prod + stag side-by-side with a shared stateless engine.

---

## Prerequisites

Before running the rollout sequence on the droplet:

1. **KAN-15** — Stag Turso DB must exist. Confirm `api/.env.stag` has a valid `DATABASE_URL` pointing to the stag database (not prod).
2. **KAN-16** — Stag R2 bucket must exist. Confirm `api/.env.stag` has `R2_BUCKET` (and `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) pointing to the stag bucket (not prod).
3. **DNS** — The following records must resolve to the droplet IP (already added):
   - `stag.docuforge.app`
   - `www.stag.docuforge.app`
   - `console.stag.docuforge.app`
   - `api.stag.docuforge.app`
4. **Wildcard cert** — Must be issued before uncommenting stag nginx server blocks (see step 6 below).

---

## Resource caps (1.9 GB RAM / 2 vCPU droplet)

| Service         | Stack  | mem_limit | cpus |
|-----------------|--------|-----------|------|
| engine          | engine | 1024m     | 1.5  |
| nginx           | prod   | 128m      | 0.50 |
| prod api        | prod   | 768m      | 1.50 |
| prod frontend   | prod   | 512m      | 1.00 |
| prod redis      | prod   | 256m      | 0.50 |
| stag api        | stag   | 384m      | 0.5  |
| stag frontend   | stag   | 256m      | 0.5  |
| stag redis      | stag   | 128m      | 0.25 |
| **Total**       |        | **3456m** | **6.25** |

> Note: mem_limit is a hard cap per container, not reserved. Actual simultaneous usage on this droplet should stay well under 1.9 GB given typical idle/low-traffic stag load. Monitor with `docker stats` after bring-up.

---

## Certbot issuance (wildcard, DNS-01 challenge)

Run on the droplet (or any machine with the Cloudflare DNS API accessible):

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.stag.docuforge.app" \
  -d "stag.docuforge.app"
```

When certbot prompts for the DNS TXT record, add it in Cloudflare for `_acme-challenge.stag.docuforge.app`, wait ~30 s for propagation, then confirm.

After cert issuance, copy the files to the repo path on the droplet:

```bash
sudo cp /etc/letsencrypt/live/stag.docuforge.app/fullchain.pem \
        /root/docuforge/nginx/ssl/stag/fullchain.pem
sudo cp /etc/letsencrypt/live/stag.docuforge.app/privkey.pem \
        /root/docuforge/nginx/ssl/stag/privkey.pem
sudo chmod 644 /root/docuforge/nginx/ssl/stag/*.pem
```

---

## Droplet rollout sequence

All commands run as root on the droplet in `/root/docuforge`.

### Step 1 — Pull latest dev

```bash
cd /root/docuforge
git pull origin dev
```

### Step 2 — Bring up the shared engine

```bash
docker compose -f docker-compose.engine.yml up -d --build
```

Verify it's healthy:

```bash
docker ps | grep engine
docker exec engine curl -f http://localhost:3001/health
```

### Step 3 — Re-up prod (now uses external engine-net)

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

Smoke test prod:

```bash
curl -sf https://api.docuforge.app/health && echo "prod api ok"
curl -sf https://www.docuforge.app/ -o /dev/null && echo "prod frontend ok"
```

### Step 4 — Bring up stag

```bash
docker compose -f docker-compose.stag.yml up -d --build
```

Verify containers started:

```bash
docker ps | grep stag
```

### Step 5 — Issue wildcard cert (see Certbot section above)

Complete certbot DNS-01 challenge and drop certs at `nginx/ssl/stag/`.

### Step 6 — Uncomment stag nginx server blocks + reload

Edit `nginx/nginx.conf` and uncomment the four stag server blocks (HTTP redirect + three HTTPS blocks for `stag.`, `www.stag.`, `console.stag.`, `api.stag.`).

Reload nginx without downtime:

```bash
docker exec docuforge-nginx-1 nginx -t && \
docker exec docuforge-nginx-1 nginx -s reload
```

### Step 7 — Smoke test stag end-to-end

```bash
curl -sf https://api.stag.docuforge.app/health && echo "stag api ok"
curl -sf https://stag.docuforge.app/ -o /dev/null && echo "stag frontend ok"
```

Confirm stag API is hitting the stag DB (check `DATABASE_URL` in `api/.env.stag` — must point to stag Turso DB, not prod).
Confirm stag API is hitting the stag R2 bucket (check `R2_BUCKET` in `api/.env.stag`).

---

## Rollback plan

| Step | Rollback one-liner |
|------|-------------------|
| Step 2 (engine up) | `docker compose -f docker-compose.engine.yml down` |
| Step 3 (prod re-up) | `git checkout HEAD~1 -- docker-compose.prod.yml && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d` |
| Step 4 (stag up) | `docker compose -f docker-compose.stag.yml down` |
| Step 6 (nginx reload) | Re-comment stag blocks in nginx.conf, then `docker exec docuforge-nginx-1 nginx -s reload` |
| Full rollback to pre-migration prod | Restore `docker-compose.prod.yml` from the commit before this one; rebuild with original engine block inline |

---

## Notes

- The engine is verified stateless: no volumes, no DB connection, in-memory template cache keyed on SHA-256 of template source. A single engine instance safely serves both prod and stag.
- Nginx joins both `engine-net` and `stag-net` so it can route to both stag and prod services via a single container.
- Real-estate project and mongod were removed in the same pass as this migration. Backup at `~/Backups/realestate-mongodump-20260611T200204Z.archive.gz` on local machine.
