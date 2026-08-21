# E2E

`public-smoke.spec.ts` runs without authenticated fixtures.

`marketplace-flow.spec.ts` validates the authenticated marketplace journey across customer and contractor roles. It is read-only by default so it is safe to run repeatedly against the dedicated local E2E fixture.

## Recommended: automatic seed

The simplest local workflow is:

```bash
npm run build
npm run test:e2e:marketplace:seeded
```

The seeded command first runs `scripts/seed-e2e.mjs` using `DATABASE_URL` from `.env.local`. The seed is deterministic and idempotent: rerunning it refreshes the same E2E customer, contractor, contractor company, published project, active workspace project and completed project instead of continuously creating new records.

The seed writes the generated Playwright fixture variables to `.env.e2e.local`, which is ignored by git because `.env*` is excluded.

Default seed accounts:

```text
Customer:   e2e.customer@stroyselect.local
Contractor: e2e.contractor@stroyselect.local
Password:   StroySelect-E2E-2026!
```

You can override the password before seeding:

```bash
E2E_SEED_PASSWORD='Another-Strong-Test-Password' npm run e2e:seed
```

Run only the seed:

```bash
npm run e2e:seed
```

Then run the marketplace test with the generated environment file:

```bash
node --env-file=.env.e2e.local ./node_modules/@playwright/test/cli.js test tests/e2e/marketplace-flow.spec.ts
```

## Manual fixtures

If you do not want to use the automatic seed, provide:

```bash
E2E_CUSTOMER_EMAIL=customer@example.test
E2E_CUSTOMER_PASSWORD='...'
E2E_CONTRACTOR_EMAIL=contractor@example.test
E2E_CONTRACTOR_PASSWORD='...'
E2E_PROJECT_PROJECT_ID='<published project uuid visible to the contractor>'
E2E_WORKSPACE_PROJECT_ID='<selected contractor project uuid>'
E2E_COMPLETED_PROJECT_ID='<completed project uuid>'
```

Then run:

```bash
npm run test:e2e:marketplace
```

## Mutation mode

By default the suite does not perform destructive workflow mutations. To allow actions such as sending a new invitation or submitting/updating a bid, set:

```bash
E2E_RUN_MUTATIONS=1
```

Use mutation mode only with disposable E2E fixture records, never with production projects.

Run the whole Playwright suite:

```bash
npm run test:e2e
```

When authenticated fixture variables are absent, marketplace tests are skipped while public smoke tests continue to run. This keeps CI usable before a dedicated CI database fixture is provisioned.
