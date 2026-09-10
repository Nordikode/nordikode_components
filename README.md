# `@nordikode/components`

Shared Vue 3 + Vuetify components for Nordikode applications.

## Purpose

This package is the shared UI component source for Nordikode frontend applications.
Start small, keep APIs stable, and grow the library component by component instead of copying UI between repos.

## Current exports

Chrome (header, app-velger, firmameny, kontomeny, temabryter) bor i
`@nordikode/components/web` — se under. Vuetify-inngangens gamle
chrome-komponenter (`AppTopHeader`, `AppSidebarRail`, `UserIdentityMenu`,
`TenantSelector`, `AppBreadcrumbs`) ble fjernet i 0.24.0 (SIGN-535): alle
flatene bruker `AppHeader` med de delte menyene.

- `IdentityAvatar`
- `NkEmptyState` — tom-tilstand (SIGN-447): sentrert ikon (valgfritt, `mdi-*`),
  `title`, `description` og `actions`-slot; `size` `default` (primær-tonet ikonsirkel,
  hele flater/paneler) eller `compact` (dempet sirkel, «ingen treff» etter søk/filter).
  All tekst og alle handlinger kommer fra appen
- `NkStatusChip` — statuschip med to størrelser (`sm`/`md`) og seks semantiske
  toner (`success`/`inflight`/`warning`/`error`/`info`/`neutral`) fra soft-tokenparene;
  teksten kommer alltid fra appens i18n
- `PhoneNumberInput`
- `mdiRegistryIconSet(registry)` — Vuetify-ikonsett som slår opp `mdi-*`-navn i et generert
  `@mdi/js`-register (SIGN-521); registeret lages av bin-scriptet `nk-mdi-registry` fra appens
  kildekode, så bare ikonene som brukes bundles (ingen ikonfont).
- `formatMoney` / `formatMinorAmount` / `formatMoneyRange` / `toBcp47` /
  `supportedCurrencyCodes` — **den ene** beløpsformatteren for alle flater
  (SIGN-499). Valuta er alltid data (tenantens `activeTenant.currency` eller
  dokumentets), locale er brukerens UI-locale som full BCP-47-tag. Standard er
  valutaens egne desimaler («100 000,00 kr» / «NOK 100,000.00»); hele beløp
  bes om eksplisitt med `maximumFractionDigits: 0`. Ingen app skal ha sin egen
  `Intl.NumberFormat(..., { style: 'currency' })`, `toFixed(2)` eller «kr»-tekst.
  Eksporteres også fra `@nordikode/components/web`.

`style.css` contains only this package's own component styles. Vuetify (JS and styles)
and `libphonenumber-js` are externalized — the consuming app owns the Vuetify setup,
including `vuetify-settings.scss`.

### `@nordikode/components/web` (Vuetify-free)

Separate entry for the web surfaces (nordikode.com, admin, account, company)
and for the product apps' chrome (Sign, Time use the same `AppHeader` and
menus, SIGN-442) — no Vuetify anywhere in its import graph, styled with plain scoped CSS against
the web design language's CSS variables (`--color-ink`, `--color-surface-*`,
`--color-line`, `--radius-*`) plus the accent contract `--nk-chrome-accent` /
`--nk-chrome-accent-ink`, which the host app sets from its own theme.

- `AppHeader` — the header shell itself: sticky 3.25rem bar with blur, brand
  (the full brand logo via `brand="nordikode" | "sign"` (SIGN-641), plus
  `#brand-suffix` for products without their own logo, optionally with the
  product's symbol in front of the suffix via `productSymbol="sign"`,
  SIGN-614), the company block in `#tenant` (SIGN-561, see below), nav from a
  `nav` prop rendered both as desktop
  nav (one dropdown level, active by `currentPath` prefix) and as the built-in
  burger drawer below 640px. Widths: `standard` (64rem), `wide` (72rem),
  `full`. **Standard order** on every signed-in surface: brand → thin divider →
  `#tenant` → nav → … → `#actions` → ThemeToggle → NotificationBellMenu →
  AppLauncherMenu → AccountIdentityMenu → burger. The left side says where the
  user is (brand, product, company); the right side holds the user's own tools.
  `#nav-item` lets Inertia/SPA apps render their own link component. z-index
  override: `--nk-chrome-z` (default 50).
- `PageHeader` — the page-heading standard: hierarchical back link (always
  one level up, never browser history; top-level pages have none) → the
  page's single H1 → subtitle, with `#badge` (status chip) and `#actions`.
  Scale is the app standard (1.5rem/800 title, 0.9rem secondary subtitle —
  the same heading as Sign and backoffice); a link rendered in `#back` gets
  the back-link style when it carries the `nk-page-header__back` class.
- `SectionNav` — the platform apps' section navigation (SIGN-656): the area's
  pages as a sticky 14rem side menu from 1280px up, and as a scrollable tab row
  under the page header below that. Items are links (`href`) or selections
  (`select` event); client-side routers pass their link component in
  `linkComponent` (`hrefProp` = `href` for Inertia, `to` for RouterLink). Standard for company, account and developer —
  the header's nav slot stays empty in those apps.
- `ThemeToggle` + `useTheme` — the shared light/dark switch. Theme is the
  `dark` class on `<html>`; the OS preference is the default and an explicit
  choice is stored under `nordikode-theme` only while it differs from the OS
  (self-clearing). `useTheme().applyPreference()` accepts the signed-in
  user's `preferredTheme` from core, and `ThemeToggle` emits `change` with
  the resulting preference (`system`/`light`/`dark`) so signed-in surfaces
  can persist it (the Vuetify product apps map it onto their own theme).
  `style.css` binds `color-scheme` to the class (`html` → light,
  `html.dark` → dark), so native controls and scrollbars follow the chosen
  theme rather than the OS even when the host declares
  `<meta name="color-scheme" content="light dark">`; `productCss()` does the
  same for `nk-dark` in the Vuetify apps.
- `AppLauncherMenu` — the Google-style app grid menu
- `NotificationBellMenu` — the global notification bell (SIGN-459): unread badge,
  panel with the user's feed and «mark all as read»; the host maps app-core's
  `useNotificationStore` items to `{ id, title, body, timeLabel, read }`, translates
  `eventKey` + `params` itself and navigates on `select`
- `AccountIdentityMenu` — the avatar/account menu with service list
- `tenantLogoPresentation` (+ `TenantLogoPresentation`, `TenantLogoFacts`) —
  the smart-logo rule (SIGN-676): `initials` (no logo → circle), `square`,
  `wide` (wide logo without text, shown next to the name) or `wordmark` (wide
  logo with text replaces the name). Fed by core's `logoAspectRatio` /
  `logoContainsText` on the tenant.
- `TenantSwitcherMenu` — the company menu (tenant logo/initials, switch between
  the user's companies, optional personal context via the `personal` prop; the
  host owns the actual switch request). `variant="block"` is the **company
  block** (SIGN-561): logo (initials when there is none or it fails to load) and
  the full company name, placed in `AppHeader`'s `#tenant` slot right after the
  brand — clicking it opens the company switch, so the small avatar on the right
  is gone. The name truncates with an ellipsis when space is short (full name in
  `title`), the logo always stays; below 480px the header hides the word
  «Nordikode» (the mark stays) to give the company name room. The personal
  context shows the user's name with the person marker. Data comes from the
  session (`sessionTenant`/memberships: `name`, `logoUrl`) — never hardcoded.
- `BrandWordmark` — the brand logo (`brand="nordikode"` or `"sign"`; `lockup`,
  `stacked` or `mark`, SIGN-641/655), light/dark SVG assets shipped in the
  package and swapped by `.dark` on the root element
- `ProductSymbol` — the product's own symbol (`product="sign"`, SIGN-614),
  rendered inline so the ink part follows `currentColor` (light/dark) while
  the brand colour stays fixed (Sign: light berry). Sized by `height` on the
  host; `AppHeader` places it in front of `#brand-suffix` via `productSymbol`
- `webAppIcons` / `webAppIconFor` — the canonical per-app icon registry;
  `webAppTileFor` names the apps with their own app icon (the iOS icon,
  light/dark PNGs shipped in the package), which `AppLauncherMenu` shows as a
  rounded tile instead of the line icon (SIGN-655)
- `NkSignedOutDialog` — the «You are signed out» overlay (SIGN-509): shown by
  every first-party app when the shared platform session is gone (signed out in
  another tab/device, or expired). It never navigates away and cannot be
  dismissed — the page underneath keeps its unsaved state — and emits `sign-in`
  so the host can open the account app's sign-in in a separate window and
  resume in place (`waiting` shows the pending state). Labels via `labels`
  (`title`, `revoked`, `expired`, `signInAgain`, `waiting`); z-index from
  `--nk-overlay-z` (default 60).

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

cd ../nordikode_backoffice
npm link @nordikode/components
```

Import styles once in the consuming app:

```ts
import '@nordikode/components/style.css'
```

When a consuming app is linked locally, its `dev` and `build` scripts will automatically rebuild the linked component package first.

## Design tokens

Produkttemaer: `signTheme` (Sign), `timeTheme`, `backofficeTheme` og `platformTheme`
(Nordikode-paletten for plattformappene company, account og developer — SIGN-657).

`@nordikode/components/tokens` er kilden til sannhet for farger, radius, spacing
og typografi — per produkt (Sign, Time, Backoffice), light + dark.

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

Sign-paletten (SIGN-604, 2026-09-09) har engelske fargenavn og én jobb per
farge: tar (blekk og mørk flate), plum (`textTitle`, overskrifter), berry
(`primary`/`link` i lys modus), light berry (`primary` i mørk modus og merket),
periwinkle (kun `aiSoft` — maskinen), lime (`success*`), gold
(`attention`/`warning*`) og mauve (`mutedSoft`). Siden 0.43.0 (SIGN-679) er
blått Nordikodes farge (`platformTheme`): i Sign er `frame` (aktiv rail-knapp)
light berry, `secondary` (avatarer, ikoner) dyp berry, `surfaceSoftAccent`
(valgt rad) nøytral tar-tint og `info`/`infoSoft` nøytral grå/dempet tint.
Rollene `frame`, `mutedSoft` og `textTitle` ble lagt til i 0.30.0; time og
backoffice har avledede verdier til de adopterer paletten.

Kundevendte dokumenter (tilbudet i Sign) er «papir» og skal være lyse
uansett appens fargemodus. De bruker derfor det lys-bare settet `--nk-doc-*`
(`documentScheme` / `documentCssVariables()`, SIGN-610): arket (`paper`,
`paperSoft`, `border`), blekk (`ink`, `inkSoft`, `inkMuted`, `title`), båndet
(`band`/`onBand`), handling (`accent*`, berry), venter (`attention*`, gold) og
fullført (`success*`). `productCss()` genererer dem i én `:root`-blokk uten
`.nk-dark`-variant; verdiene leses fra lys Sign-palett, så de følger paletten.
Bruk aldri vanlige `--nk-*`-variabler i et dokument — de bytter til mørk modus.

Kanoniske CSS-variabelnavn: `--nk-page` (sidebakgrunn) og `--nk-surface`
(kort/flate) erstatter det tvetydige `--nk-bg-base`, som betydde forskjellige
ting i ulike apper. Se `src/tokens/` for beslutningslogg (design-audit
2026-08-18).

Layout-token for flytende handlinger: `--nk-fab-reserve` (88px) er plassen
bunnhandlinger til høyre (send, lagre) holder unna en flytende figur/FAB nede
til høyre (SIGN-466). Bruk `padding-right: var(--nk-fab-reserve)` på raden.
