# E2E

`public-smoke.spec.ts` runs without authenticated fixtures.

`marketplace-flow.spec.ts` validates the authenticated marketplace journey across customer and contractor roles. It is intentionally read-only by default so it is safe to run against a persistent local test database.

Required environment variables:

```bash
E2E_CUSTOMER_EMAIL=customer@example.test
E2E_CUSTOMER_PASSWORD='...'
E2E_CONTRACTOR_EMAIL=contractor@example.test
E2E_CONTRACTOR_PASSWORD='...'
E2E_PROJECT_ID='<published project uuid visible to the contractor>'
```

For workspace checks, point to a project where this customer selected this contractor:

```bash
E2E_WORKSPACE_PROJECT_ID='<selected contractor project uuid>'
```

For the final review-stage check:

```bash
E2E_COMPLETED_PROJECT_ID='<completed project uuid>'
```

To allow the test to mutate the dedicated fixture by sending an invitation, accepting it and submitting a bid:

```bash
E2E_RUN_MUTATIONS=1
```

Use mutation mode only with disposable E2E fixture records, never with production projects.

Run the authenticated journey:

```bash
npm run test:e2e:marketplace
```

Run the whole Playwright suite:

```bash
npm run test:e2e
```

When the authenticated fixture variables are absent, marketplace tests are skipped while public smoke tests continue to run. This keeps CI usable before a dedicated CI database fixture is provisioned.
