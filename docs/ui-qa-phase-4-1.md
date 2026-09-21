# UI / responsive / runtime QA — Phase 4.1

Baseline: `63f55e9` (`design: redesign contractor project journey`). This is a UI-stabilization pass only; data access, authorization, actions, schemas, status transitions and API contracts were not changed.

## Route inventory and static checklist

The current repository contains 85 user-facing `page.tsx` routes. Each route was included in the static layout, navigation, overflow, responsive-grid and semantic-control audit.

### Public (5)

- [x] `/`
- [x] `/contractors`
- [x] `/contractors/[id]`
- [x] `/contractors/[id]/reviews`
- [x] `/services/[category]/[city]`

### Auth (7)

- [x] `/login`
- [x] `/register`
- [x] `/forgot-password`
- [x] `/reset-password`
- [x] `/verify-email`
- [x] `/registration-success`
- [x] `/change-password`

### Customer (11)

- [x] `/customer/dashboard`
- [x] `/customer/projects`
- [x] `/customer/projects/new`
- [x] `/customer/projects/[id]`
- [x] `/customer/projects/[id]/edit`
- [x] `/customer/projects/[id]/matches`
- [x] `/customer/projects/[id]/advisor`
- [x] `/customer/projects/[id]/bids/compare`
- [x] `/customer/bids`
- [x] `/customer/contractors`
- [x] `/customer/contractors/[id]`

### Contractor (9)

- [x] `/contractor/dashboard`
- [x] `/contractor/projects`
- [x] `/contractor/projects/[id]`
- [x] `/contractor/bids`
- [x] `/contractor/work`
- [x] `/contractor/company`
- [x] `/contractor/company/trust`
- [x] `/contractor/subscription`
- [x] `/contractor/advertising`

### Workspace (18)

- [x] `/customer/work/[id]`
- [x] `/customer/work/[id]/appointments`
- [x] `/customer/work/[id]/changes`
- [x] `/customer/work/[id]/contract`
- [x] `/customer/work/[id]/contract/print`
- [x] `/customer/work/[id]/disputes`
- [x] `/customer/work/[id]/documents`
- [x] `/customer/work/[id]/issues`
- [x] `/customer/work/[id]/materials`
- [x] `/contractor/work/[id]`
- [x] `/contractor/work/[id]/appointments`
- [x] `/contractor/work/[id]/changes`
- [x] `/contractor/work/[id]/contract`
- [x] `/contractor/work/[id]/contract/print`
- [x] `/contractor/work/[id]/disputes`
- [x] `/contractor/work/[id]/documents`
- [x] `/contractor/work/[id]/issues`
- [x] `/contractor/work/[id]/materials`

### Admin (29)

- [x] `/admin/dashboard`
- [x] `/admin/ads`
- [x] `/admin/analytics`
- [x] `/admin/analytics/discovery`
- [x] `/admin/analytics/matching`
- [x] `/admin/audit`
- [x] `/admin/catalog`
- [x] `/admin/contractors`
- [x] `/admin/contractors/[id]`
- [x] `/admin/contractors/[id]/trust`
- [x] `/admin/data-quality`
- [x] `/admin/disputes`
- [x] `/admin/disputes/[id]`
- [x] `/admin/errors`
- [x] `/admin/finance`
- [x] `/admin/materials`
- [x] `/admin/operations`
- [x] `/admin/projects`
- [x] `/admin/projects/[id]`
- [x] `/admin/release`
- [x] `/admin/reviews`
- [x] `/admin/score`
- [x] `/admin/subscriptions`
- [x] `/admin/suppliers`
- [x] `/admin/suppliers/[id]/delivery`
- [x] `/admin/users`
- [x] `/admin/users/new`
- [x] `/admin/users/[id]`
- [x] `/admin/users/[id]/manage`

### Other (6)

- [x] `/account-blocked`
- [x] `/dashboard`
- [x] `/notification-settings`
- [x] `/legal/personal-data-consent`
- [x] `/legal/privacy`
- [x] `/legal/terms`

## Shared-system audit

- [x] `AppShell`, desktop nav, mobile nav, `PageFrame`, `ContentContainer`, feedback and page-header patterns inspected before route fixes.
- [x] All canonical `Button` navigation uses Base UI `render={<Link />}`; no `button > a` or `a > button` occurrence was found in the audited usage set.
- [x] Logo imports resolve through the canonical `Logo` component (the deprecated `StroyVyborLogo` is a forwarding adapter only).
- [x] All seven wide data tables have an explicit containing horizontal scroll region; no table was allowed to force document-level horizontal overflow.
- [x] Fixed/sticky surfaces were checked against the shell top bar and mobile navigation.

## Issues found and fixes

### P0

None found.

### P1

1. **Customer project intake could place the form in the narrow progress column.** `ProjectForm` gained a format-choice section during the redesign, while the CSS grid still assumed exactly two root sections. The third section (the actual form) therefore occupied the next implicit grid cell. The progress rail and the form now live in an explicit `project-form__layout` grid; the format choice remains full-width above it. At widths below 1200px that grid stacks, because the authenticated shell would otherwise leave the two-column form controls too narrow.
2. **Mobile navigation was rendered together with the desktop sidebar.** `MobileNav` now has `lg:hidden`, matching the AppShell's desktop-sidebar breakpoint.
3. **Two sticky controls could be covered by mobile navigation.** The workspace page navigator and the contractor-company save rail now reserve the shared bottom-navigation/safe-area height below `lg` and return to normal desktop positioning at `lg`.

### P2

- Workspace navigator controls now use 44px touch targets; its floating mobile rail is positioned above the application bottom navigation rather than behind it.

### P3

No speculative redesigns were made. Existing status colors retain text labels; long-content wrapping, `min-w-0`, responsive grids and table containers were checked route-by-route.

## Responsive and runtime matrix

The fixture-independent smoke suite resizes ten accessible public/auth/error routes through: **320, 375, 390, 430, 768, 1024, 1280, 1440 and 1728px**, then returns to 1280px. It checks for server errors, document/body horizontal overflow, nested interactive elements, browser `console.error` and uncaught page errors. The matrix passed on the local production build.

Authenticated customer, contractor, workspace and admin routes cannot be runtime-rendered in this local QA environment because their layouts require a valid session plus seeded role-specific records. The public home route (`/`) is also data-dependent and returns 500 when the local PostgreSQL service is unavailable. Those routes were statically audited instead; the existing E2E suite keeps authenticated scenarios explicitly skipped until `npm run e2e:seed` provisions `CUSTOMER`, `CONTRACTOR`, `WORKSPACE`, `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`.

Final local Playwright run: **2 passed, 5 skipped**. The passed checks are the responsive smoke matrix and canonical brand asset rendering. The five skipped checks are the fixture-dependent customer, contractor and admin scenarios described above.

## Remaining known limitations

- There is no local role-based fixture set, so QA cannot exercise real customer/contractor/admin data, submitted form states, payment states or chat messages visually at every viewport.
- Workspace and admin remain functionally styled legacy areas by design; this phase fixes shell, overflow and sticky regressions only, not their planned Phase 5 redesign.
