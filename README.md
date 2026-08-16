# StroySelect

Next.js application backed by PostgreSQL, custom `auth_sessions` and S3-compatible object storage.

## Local development

```bash
npm install
npm run dev
```

The application uses `.env.local` for runtime configuration. PostgreSQL and S3/MinIO can be started with the repository infrastructure setup.

## Transactional email

Email verification and password recovery use a small Resend HTTP adapter. In production configure:

```env
APP_BASE_URL=https://stroyselect.example
RESEND_API_KEY=re_...
EMAIL_FROM=StroySelect <noreply@stroyselect.example>
```

In development, when `RESEND_API_KEY` or `EMAIL_FROM` is absent, verification and reset messages are printed to the server console with the generated local link. Tokens are stored only as SHA-256 hashes in PostgreSQL and are single-use.

## Verification

Run the repository-wide checks before pushing:

```bash
npm run verify
```

This validates the migration sequence, audits legacy and security-sensitive dependencies, runs ESLint and builds the production application.

Health endpoints:

```text
/api/health/live
/api/health/ready
```

The product maturity roadmap is in `docs/BUILDZOOM_LEVEL_ROADMAP.md`.
