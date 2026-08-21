# E2E

`public-smoke.spec.ts` runs without authenticated fixtures.

`marketplace-flow.spec.ts` validates the customer/contractor marketplace journey. `production-hardening.spec.ts` validates admin authorization, end-to-end application error monitoring and two-party payment confirmation.

## Recommended automatic seed

Build once, then run the complete seeded production suite:

```bash
npm run build
npm run test:e2e:production:seeded
```

The seeded command runs `scripts/seed-e2e.mjs` and `scripts/seed-e2e-ops.mjs` using `DATABASE_URL` from `.env.local`. The seed is deterministic and idempotent: rerunning it refreshes the same E2E customer, contractor, admin, contractor company, published project, active workspace project, completed project and pending payment.

The seed writes Playwright fixture variables to `.env.e2e.local`. This file is ignored by git.

Default seed accounts:

```text
Customer:   e2e.customer@stroyselect.local
Contractor: e2e.contractor@stroyselect.local
Admin:      e2e.admin@stroyselect.local
Password:   StroySelect-E2E-2026!
```

Override the shared test password before seeding if needed:

```bash
E2E_SEED_PASSWORD='Another-Strong-Test-Password' npm run e2e:seed
```

Run only the original marketplace journey:

```bash
npm run test:e2e:marketplace:seeded
```

Run marketplace plus production-hardening checks:

```bash
npm run test:e2e:production:seeded
```

## Manual fixtures

Without automatic seed, provide:

```bash
E2E_CUSTOMER_EMAIL=customer@example.test
E2E_CUSTOMER_PASSWORD='...'
E2E_CONTRACTOR_EMAIL=contractor@example.test
E2E_CONTRACTOR_PASSWORD='...'
E2E_ADMIN_EMAIL=admin@example.test
E2E_ADMIN_PASSWORD='...'
E2E_PROJECT_ID='<published project uuid visible to the contractor>'
E2E_WORKSPACE_PROJECT_ID='<selected contractor project uuid>'
E2E_COMPLETED_PROJECT_ID='<completed project uuid>'
E2E_PAYMENT_ID='<pending payment uuid in workspace project>'
```

## Mutation mode

The marketplace suite is read-only by default. To allow invitation/bid mutations on a disposable fixture:

```bash
E2E_RUN_MUTATIONS=1
```

The production-hardening payment test intentionally mutates the deterministic seeded payment by confirming it as both participants. The seed resets that payment to `pending` before every run.

Never point automatic seed or mutation-mode E2E at production data.

## Browser installation

After installing/updating Playwright on a new workstation:

```bash
npx playwright install chromium
```

## Full public suite

```bash
npm run test:e2e
```

When authenticated fixture variables are absent, fixture-dependent tests are skipped while public smoke tests continue to run.
