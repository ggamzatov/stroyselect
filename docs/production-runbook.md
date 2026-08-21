# StroySelect production runbook

## Pre-deploy gate

Before every production deploy:

```bash
npm ci
npm run verify
npm run test:e2e:production:seeded
npm run storage:audit
```

Never run seeded E2E against a production database. The seed commands create deterministic disposable users/projects and mutate payment confirmation state.

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

1. Backup database.
2. Put the application into maintenance/read-only mode if a migration is not backward-compatible.
3. Apply new SQL migration files in numeric order with `ON_ERROR_STOP=1`.
4. Run readiness check.
5. Deploy application build.
6. Run smoke tests.

Example health checks:

```bash
curl -fsS https://YOUR_HOST/api/health/live
curl -fsS https://YOUR_HOST/api/health/ready
```

## Rollback

Application-only regression:

1. Roll back to the previous immutable image/release.
2. Do not roll back a database migration unless a tested down migration exists.
3. Verify `/api/health/live` and `/api/health/ready`.

Database/data regression:

1. Stop writes.
2. Take a forensic backup of the current broken state.
3. Restore the last known-good backup into a new database.
4. Validate counts and critical flows.
5. Switch application connection only after validation.

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

## Secrets

Do not commit `.env.local`, `.env.e2e.local`, database dumps, S3 credentials, SMTP credentials or session secrets. Rotate secrets after any suspected exposure and invalidate active sessions when authentication secrets are rotated.

## Release acceptance checklist

A release is accepted only when all are true:

- `npm run verify` is green;
- production seeded E2E is green on an isolated test database;
- backup has been created;
- restore drill has passed recently;
- readiness endpoint is green;
- admin error monitoring receives test events;
- no unresolved P0/P1 error is visible in `/admin/errors`;
- critical customer and contractor flows work from a clean browser session.
