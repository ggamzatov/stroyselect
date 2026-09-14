# StroySelect final visual QA checklist

- Desktop: 1440px, 1280px, 1024px.
- Mobile: 390px and 430px.
- Verify no horizontal overflow.
- Verify primary actions remain visible and keyboard focus is clear.
- Verify reduced-motion preference is respected.
- Verify no business logic, data queries, server actions, permissions, or API contracts are changed by visual-only work.
- Run lint, production build, Playwright desktop/mobile and dependency audit in CI before merge.
