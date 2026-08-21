# StroySelect production runbook

## Pre-deploy gate

Before every production deploy:

```bash
npm ci
npm run verify
npm run production:env:check
npm run test:e2e:production:seeded
npm run storage:audit
```

Never run seeded E2E against a production database. The seed commands create deterministic disposable users/projects and mutate payment confirmation state.

## Production environment

Create `.env.production` from `.env.example` on the deployment host or provide the same variables from your secret manager. Never commit `.env.production`.

Required production values include:

- `DATABASE_URL` — private PostgreSQL connection string;
- `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` — canonical HTTPS origin;
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`;
- `RESEND_API_KEY`, `EMAIL_FROM`.

The application must be exposed through an HTTPS reverse proxy/load balancer. The provided production Compose file binds the app to `127.0.0.1` intentionally; TLS termination should happen in the proxy.

## Container deployment

The repository contains a multi-stage `Dockerfile` using Next.js standalone output. The runtime container runs as a non-root user and contains only the standalone server, public assets and Next static assets.

Build locally/on the deployment host:

```bash
APP_IMAGE_TAG=$(git rev-parse --short HEAD) npm run production:image:build
```

Or start with the hardened Compose profile:

```bash
cp .env.example .env.production
# Replace every placeholder in .env.production with real production secrets/endpoints.
APP_IMAGE_TAG=$(git rev-parse --short HEAD) npm run production:compose:up
```

`docker-compose.production.yml` applies a read-only root filesystem, drops Linux capabilities, sets `no-new-privileges`, provides a temporary `/tmp`, binds only to loopback and checks `/api/health/ready`.

Do not put PostgreSQL or S3 credentials into the image build. They are runtime environment variables only.

## Database backup

Create a backup before schema changes and before every release containing migrations:

```bash
npm run db:backup
```

Store the resulting `.dump` and `.sha256` outside the application host as well. A local-only backup does not protect against host or volume loss.

## Restore drill

On local/staging Docker infrastructure:

```bash
npm run db:restore-drill
```

The drill creates an isolated `stroyselect_restore_drill` database, restores the newest fresh dump, verifies critical tables and compares the project row count with the source database, then drops the drill database.

For production, restore into an isolated database/server first. Never test a restore by overwriting the live database.

## Migration deployment

1. Create a database backup.
2. Put the application into maintenance/read-only mode if a migration is not backward-compatible.
3. Run migrations exactly once against the target database:

```bash
DATABASE_URL='postgresql://...' npm run migrations:apply
```

4. Deploy/start the new immutable application image.
5. Wait for `/api/health/ready` to become green.
6. Run the post-deploy smoke test.

Do not run migrations from every application replica during startup. Migration execution must be a separate deployment step to avoid races between replicas.

## Post-deploy smoke

Run against the real deployed HTTPS origin without seeding or mutating application data:

```bash
DEPLOY_BASE_URL=https://YOUR_HOST npm run production:smoke
```

The smoke checks:

- `/api/health/live`;
- `/api/health/ready` and database connectivity;
- public login page availability;
- required security headers and HSTS on HTTPS;
- that an anonymous request cannot open `/admin/errors`.

Then manually verify login with one real/staging customer and contractor account. Do not use E2E seed scripts on production.

## Rollback

Application-only regression:

1. Roll back to the previous immutable image/release.
2. Do not roll back a database migration unless a tested down migration exists.
3. Verify `/api/health/live` and `/api/health/ready`.
4. Run `production:smoke` against the rolled-back release.

Database/data regression:

1. Stop writes.
2. Take a forensic backup of the current broken state.
3. Restore the last known-good backup into a new database.
4. Validate counts and critical flows.
5. Switch application connection only after validation.

## Health checks

```bash
curl -fsS https://YOUR_HOST/api/health/live
curl -fsS https://YOUR_HOST/api/health/ready
```

The liveness endpoint proves the process is serving requests. Readiness additionally checks PostgreSQL and returns `503` when the database is unavailable.

## Error monitoring

Admin monitoring lives at `/admin/errors` and is restricted to staff roles. Client JavaScript errors are accepted by `/api/errors/client`; server request errors are recorded by `instrumentation.ts`.

The seeded production E2E verifies that:

- a customer cannot open `/admin/errors`;
- a client error submitted while authenticated is persisted;
- the admin can see that error with its route and originating user.

## Financial workflow verification

The seeded production E2E also verifies the two-party payment state machine:

1. customer confirms a seeded payment;
2. contractor sees the customer confirmation;
3. contractor confirms the same payment;
4. UI reports `Подтверждён обеими сторонами`.

## Housekeeping

Run periodically:

```bash
npm run maintenance
```

This removes stale rate-limit/login/session/token rows and resolved application errors according to the database housekeeping policy.

## Network and TLS

Production must use HTTPS. Terminate TLS at a trusted reverse proxy/load balancer and forward only the application port internally. PostgreSQL, Redis/MinIO administration ports and any database management interfaces must not be publicly exposed.

HSTS is emitted by the production application build. Do not serve the same production hostname over plain HTTP except to redirect immediately to HTTPS.

## Secrets

Do not commit `.env.local`, `.env.production`, `.env.e2e.local`, database dumps, S3 credentials, email credentials or session secrets. Rotate secrets after any suspected exposure and invalidate active sessions when authentication secrets are rotated.

## Release acceptance checklist

A release is accepted only when all are true:

- `npm run verify` is green;
- `npm run production:env:check` is green against deployment values;
- production seeded E2E is green on an isolated test database;
- backup has been created before schema changes;
- restore drill has passed recently;
- migrations completed successfully as a separate deployment step;
- application container is healthy;
- `/api/health/live` and `/api/health/ready` are green;
- `DEPLOY_BASE_URL=https://... npm run production:smoke` is green;
- admin error monitoring receives test events in staging;
- no unresolved P0/P1 error is visible in `/admin/errors`;
- critical customer and contractor flows work from a clean browser session.
