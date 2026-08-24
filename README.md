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

- `AppLauncherMenu` — the Google-style app grid menu
- `AccountIdentityMenu` — the avatar/account menu with service list
- `BrandWordmark` — the Nordikode logo (`lockup` or `mark`), light/dark assets
  shipped in the package
- `webAppIcons` / `webAppIconFor` — the canonical per-app icon registry

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
