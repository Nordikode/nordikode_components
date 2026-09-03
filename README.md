# `@nordikode/components`

Shared Vue 3 + Vuetify components for Nordikode applications.

## Purpose

This package is the shared UI component source for Nordikode frontend applications.
Start small, keep APIs stable, and grow the library component by component instead of copying UI between repos.

## Current exports

- `AppBreadcrumbs`
- `AppSidebarRail`
- `AppTopHeader`
- `IdentityAvatar`
- `NkStatusChip` — statuschip med to størrelser (`sm`/`md`) og seks semantiske
  toner (`success`/`inflight`/`warning`/`error`/`info`/`neutral`) fra soft-tokenparene;
  teksten kommer alltid fra appens i18n
- `PhoneNumberInput`
- `TenantSelector`
- `UserIdentityMenu`

`style.css` contains only this package's own component styles. Vuetify (JS and styles)
and `libphonenumber-js` are externalized — the consuming app owns the Vuetify setup,
including `vuetify-settings.scss`.

### `@nordikode/components/web` (Vuetify-free)

Separate entry for the web surfaces (nordikode.com, account.nordikode.com) —
no Vuetify anywhere in its import graph, styled with plain scoped CSS against
the web design language's CSS variables (`--color-ink`, `--color-surface-*`,
`--color-line`, `--radius-*`) plus the accent contract `--nk-chrome-accent` /
`--nk-chrome-accent-ink`, which the host app sets from its own theme.

- `AppHeader` — the header shell itself: sticky 3.25rem bar with blur, brand
  (wordmark + `#brand-suffix`), nav from a `nav` prop rendered both as desktop
  nav (one dropdown level, active by `currentPath` prefix) and as the built-in
  burger drawer below 640px. Widths: `standard` (64rem), `wide` (72rem),
  `full`. The right side is consumer-composed in `#menus` in the standard
  order `#actions` → ThemeToggle → AppLauncherMenu → TenantSwitcherMenu →
  AccountIdentityMenu → burger; `#nav-item` lets Inertia/SPA apps render
  their own link component. z-index override: `--nk-chrome-z` (default 50).
- `PageHeader` — the page-heading standard: hierarchical back link (always
  one level up, never browser history; top-level pages have none) → the
  page's single H1 → subtitle, with `#badge` (status chip) and `#actions`.
- `ThemeToggle` + `useTheme` — the shared light/dark switch. Theme is the
  `dark` class on `<html>`; the OS preference is the default and an explicit
  choice is stored under `nordikode-theme` only while it differs from the OS
  (self-clearing). `useTheme().applyPreference()` accepts the signed-in
  user's `preferredTheme` from core.
- `AppTopBar` — the product apps' shared top bar (SIGN-94): a flat 4rem
  surface with a hairline bottom border that composes the literal same chrome
  the website uses, in the standard order ThemeToggle → AppLauncherMenu →
  TenantSwitcherMenu (chip variant) → AccountIdentityMenu, each toggleable via
  props. The host renders the app chip in `#brand` (shared styling via the
  `nk-topbar__chip` class), passes data/labels as props, and handles
  `switch-tenant`/`logout` events; `#tenant-menu-footer` reaches the company
  menu's footer rows.
- `AppLauncherMenu` — the Google-style app grid menu
- `AccountIdentityMenu` — the avatar/account menu with service list
- `TenantSwitcherMenu` — the company menu (tenant logo/initials, switch between
  the user's companies, optional personal context via the `personal` prop; the
  host owns the actual switch request)
- `BrandWordmark` — the Nordikode logo (`lockup` or `mark`), light/dark assets
  shipped in the package
- `webAppIcons` / `webAppIconFor` — the canonical per-app icon registry

The accent contract is mandatory in both themes: hosts must define both
`--nk-chrome-accent` and `--nk-chrome-accent-ink` in light mode *and* in
`.dark` — overriding only one of them in dark mode makes the chrome pick up
mismatched colors.

Import styles once (`@nordikode/components/style.css`) — it carries the scoped
CSS for these components too.

## Package consumption

Applications should consume `@nordikode/components` as a published package from GitHub Packages.
Do not commit `file:` dependencies from app repositories, since isolated CI/deploy builds will not have access to sibling repositories.

## Local development

For immediate local changes without cutting a new package release first, use `npm link`:

```bash
cd frontend/nordikode_components
npm link

cd ../sign-web
npm link @nordikode/components

cd ../portal
npm link @nordikode/components

cd ../nordikode_backoffice
npm link @nordikode/components
```

Import styles once in the consuming app:

```ts
import '@nordikode/components/style.css'
```

When a consuming app is linked locally, its `dev` and `build` scripts will automatically rebuild the linked component package first.

## Design tokens

`@nordikode/components/tokens` er kilden til sannhet for farger, radius, spacing
og typografi — per produkt (Sign, Time, Portal, Backoffice), light + dark.

```ts
// src/plugins/vuetify.ts i en app:
import { buildVuetifyThemes, signTheme } from '@nordikode/components/tokens'

createVuetify({
  theme: {
    defaultTheme: signTheme.vuetifyThemeName,
    themes: buildVuetifyThemes(signTheme),
  },
})
```

```ts
// Generere appens :root / :root.nk-dark CSS-variabler:
import { productCss, signTheme } from '@nordikode/components/tokens'
productCss(signTheme)
```

Kanoniske CSS-variabelnavn: `--nk-page` (sidebakgrunn) og `--nk-surface`
(kort/flate) erstatter det tvetydige `--nk-bg-base`, som betydde forskjellige
ting i ulike apper. Se `src/tokens/` for beslutningslogg (design-audit
2026-08-18).
