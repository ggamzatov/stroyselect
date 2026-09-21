# StroySelect design system

`components/ui` is the canonical foundation for application UI. Feature and domain
components compose these primitives; they do not create a second button, input,
badge, or card system. The temporary `components/ui/stroy-*` exports are
compatibility adapters and should not be chosen for new work.

## Tokens

Tokens live in `app/globals.css` and use the existing StroySelect brand: deep
green `--primary` (`#0D3B2E`), its supplied green accent, and warm neutral
surfaces. Use semantic names (`background`, `card`, `muted`, `border`,
`success`, `info`, `warning`, `destructive`) rather than hard-coded colors.

Spacing follows a 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Radius is
limited to `sm` for controls, `md` for cards, `lg` for overlay containers, and
`full` for pills. Shadows are `--shadow-subtle`, `--shadow-elevated`, and
`--shadow-modal`; ordinary cards use only the subtle level.

## Typography

Use `PageHeader` for page titles, section headings for internal hierarchy, and
`CardTitle` for independent objects. Body copy is 14–16px, helper/caption copy
is 12–14px. Apply the `numeric` class to prices, dates, and metrics so tabular
figures remain aligned.

## Primitives

- `Button` has `default` (primary), `secondary`, `outline`, `ghost`,
  `destructive`, and `link` variants, plus icon sizes. Use `loading` and
  optional `loadingText` instead of page-specific spinners.
- `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Label`,
  `FormField`, `FormHelperText`, `FormError`, and `FormSection` are
  presentation-only. Preserve form `name`, validation, `FormData`, and
  server-action contracts in feature code.
- `Badge` provides visual tones. `StatusBadge` maps existing status strings to
  `success`, `info`, `warning`, `danger`, or `neutral`; it never changes the
  stored business status.
- `Card`, `Dialog`, `Sheet`, `Separator`, and `Skeleton` share the same border,
  radius, focus, and motion language.

## Patterns and feedback

Use `PageFrame` and `ContentContainer` instead of repeating width and page
padding. Use `PageHeader`, `EntityHeader`, `Metric`, and `Activity` for common
application structure. `EmptyState`, `ErrorState`, `LoadingState`, and
`Confirmation` are the canonical asynchronous states.

## Navigation

`AppShell` is the shared authenticated desktop/mobile shell. It owns sidebar,
topbar, safe-area-aware mobile navigation, and the primary action. Customer and
contractor shells are thin compatibility adapters that only supply existing
routes and server-rendered controls.

`ProjectNav` groups existing workspace routes into Overview, Work,
Communication, Documents, and More. Desktop uses concise menus; mobile uses a
selector. Workspace chat remains contextual to a project because there is no
standalone messages route in the current application.

## Responsive, accessibility, motion

Start at 320px. Controls and mobile destinations have a 44px minimum touch
target, long labels truncate or wrap safely, and bottom navigation reserves the
device safe area. Use semantic controls, visible `:focus-visible` states, and
labels for inputs/icon buttons. Motion is limited to short 140–220ms feedback;
the global reduced-motion rule disables nonessential animation.

## Migration rule

New UI imports from `components/ui`, `components/layout`, `components/navigation`,
`components/feedback`, and `components/patterns`. Keep data fetching, server
actions, Zod validation, auth, permissions, routes, and feature state in their
current feature/app layers. Migrate pages one bounded feature at a time.
