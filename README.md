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
- `NkConversation` — samtalevisning (SIGN-1313): meldinger som bobler (egne til høyre),
  delt per dag, med hendelser i samtalen som sentrerte linjer. `entries`
  (`NkConversationEntry[]`: `id`, `kind` `message`/`event`, `own`, `author`, `text`, `at`,
  `receipt`, `attachments`), `locale`, `timeZone`, `labels` (`list`, `newMessages`). Filer i
  et innslag (SIGN-1317, `NkConversationAttachment`: `name`, `url`, `isImage`, `sizeLabel`)
  vises som bilde i boblen (`<img loading="lazy">` mot den signerte lenken) eller som
  lenke med navn og størrelse; `url` null gir navn uten lenke. Komponenten ruller
  ikke selv — siden ruller, og `#footer` (skrivefeltet) står fast nederst. Åpnes nederst
  og følger med når leseren er nederst; har leseren rullet opp, vises en «nye
  meldinger»-knapp. `seen(lastEntryId)` sendes når nyeste innslag er synlig og fanen er
  framme («lest til og med»). `#empty` vises uten innslag. All tekst kommer fra appen
- `NkConversationListItem` — rad i en samtaleliste (SIGN-1313) på `v-list-item`: `title`,
  `preview`, `meta`, `at` (tid i dag, ellers kort dato), `unreadCount` med `unreadLabel`
  for skjermlesere, og `#status` til et `NkStatusChip`. `to`/`href`/`active` sendes videre
- `NkMessageComposer` — skrivefelt for samtaler (SIGN-1313): vokser med teksten, Enter
  sender og Shift+Enter gir ny linje (på berøringsskjerm sender bare knappen).
  `send(text) => Promise<boolean>`: `true` tømmer feltet, ellers beholdes teksten og
  appen viser årsaken i `error`. `labels` (`field`, `send`), `maxLength` med teller når
  det nærmer seg, `disabled`, valgfri `v-model` for utkastet. Vedlegg (SIGN-1317): med
  `attachments` (`NkMessageComposerAttachments`: `accept`, `multiple`, `validate(file,
  selectedCount) => string | null` — appens egen tekst, null tar imot) og `labels.attach`
  får feltet en legg ved-knapp; valgte filer står som merker som kan fjernes
  (`labels.removeAttachment`), størrelsen formateres med `locale`, og `send(text, files)`
  får dem. En melding kan være filer alene. `#attachments` og `#prepend` er fortsatt
  appens
- `NkTemplateField` — felt for tekster med plassholdere (SIGN-1465), f.eks. SMS-maler:
  plassholderne settes inn med én knapp per plassholder (der markøren står) og vises som
  brikker med navnet i feltet; brikken slettes som ett tegn. `v-model` er
  lagringsformatet, uendret: teksten med `{key}`. `placeholders`
  (`NkTemplatePlaceholder[]`: `key`, `label`, `missingMessage` — satt = obligatorisk, med
  meldingen ved feltet) er appens data, typisk nøklene i standardmalen
  (`templatePlaceholderKeys`). `labels` (`field`, `insert`), `hint`, `emptyText` (vises i
  tomt felt, med brikker), `maxLength` (teller lagringsformatet), `rows`, `disabled`,
  `errorMessages`
- `NkTradeSelect` — fagvelgeren (SIGN-1481), brukt overalt et fag velges. `trades`
  (`NkTradeOption[]`: firmaets fag fra core `tenantTrades`, i firmaets rekkefølge) og
  `v-model` med fagets nøkkel (nøklene med `multiple`). Søket treffer navnet og
  synonymene i `platformTrades` (`NkPlatformTradeOption[]`, core `platformTrades`). Fag
  som settes bort får et merke; arkiverte vises bare når de alt er valgt. Med
  `canManage` (`core.trades.manage`) og `createTrade(input) => Promise<key>` står «Legg
  til …» nederst når ingen fag heter akkurat det: fra Nordikodes fagliste når teksten
  treffer et plattformfag, ellers eget fag. Velgeren spør om levering, med mindre
  flaten sender `delivery`. Nøkkelen kommer alltid fra core. `labels`
  (`NkTradeSelectLabels`), `hint`, `loading`, `disabled`, `errorMessages`; øvrige
  attributter går til `v-autocomplete`
- `templatePlaceholderKeys` / `parseTemplate` / `templateToken` /
  `missingTemplatePlaceholders` — malformatet bak `NkTemplateField`; appen stopper
  lagringen med `missingTemplatePlaceholders(text, placeholders)` (SIGN-1465)
- `formatFileSize(bytes, locale)` — filstørrelse fra `Intl` («48 kB», «1,3 MB»), for
  vedlegg i samtaler (SIGN-1317)
- `formatConversationDay` / `formatConversationTime` / `formatConversationListTime` /
  `groupConversationEntries` — dato og tid i samtaler, formatert av `Intl` med brukerens
  UI-språk («i dag»/«i går» fra `Intl.RelativeTimeFormat`)
- `NkDialog` — felles dialog-wrapper (SIGN-846): `v-dialog` med tilgjengelig navn ut
  av boksen. **Appene bruker aldri rå `v-dialog`.** Dialogen kobles til den synlige
  tittelen med `aria-labelledby`: elementet merket `data-nk-dialog-title`, ellers den
  første overskriften i innholdet (`h1`–`h6`, `role="heading"`, `v-card-title`,
  `v-toolbar-title`) — tittelen får en `id` hvis den mangler. Ingressen merkes
  `data-nk-dialog-description` og blir `aria-describedby`. En dialog uten synlig tittel
  (bildevisning, datovelger) får `aria-label`; uten noen av delene advarer konsollen.
  Fokus går tilbake til elementet som åpnet dialogen (Vuetify gjør det bare med
  `activator`), og Esc lukker som før. Alle `v-dialog`-props, -hendelser og -slots
  sendes videre, eierens `scoped`-stiler treffer fortsatt, og standard-slotten får i
  tillegg `close`. Wrapperen har ingen egen flate: innholdet er appens, eller `NkSheet`
- `NkConfirmDialog` — felles bekreftelse (SIGN-846): `title` (spørsmålet), `message`
  (konsekvensen), `confirmLabel` (handlingen i klartekst — «Slett avdelingen», aldri
  «OK») og `cancelLabel`, alle fra appens i18n og uten standardverdi. `tone="danger"`
  for det som ikke kan angres. `confirm` lukker ikke dialogen: eieren utfører
  handlingen med `loading` (dialogen kan da ikke lukkes), lukker selv når den er
  ferdig, eller setter `error` («Kunne ikke slette avdelingen.», vises som
  `role="alert"`). Avbryt, Esc og klikk utenfor sender `cancel`. `role="alertdialog"`
  med spørsmålet som navn og meldingen som beskrivelse; fokus starter på Avbryt.
  Standard-slotten er for en kort oversikt eller ett felt — ikke skjemaer
- `NkEmptyState` — tom-tilstand (SIGN-447): sentrert ikon (valgfritt, `mdi-*`),
  `title`, `description` og `actions`-slot; `size` `default` (primær-tonet ikonsirkel,
  hele flater/paneler) eller `compact` (dempet sirkel, «ingen treff» etter søk/filter).
  All tekst og alle handlinger kommer fra appen
- `NkListPane` — det delte listepanelet i liste/detalj-flater (SIGN-1845): listen til
  venstre, det valgte til høyre. Hodet er tre rader og ikke mer — tittelraden (`title`,
  `#badge`, `#actions`), søkeraden (`v-model:search` + `searchPlaceholder`,
  `#search-append`, og én filterknapp med `filterCount` som åpner `#filters` i en
  nedtrekksmeny med «Nullstill» → `reset-filters`) og verktøyraden (`#toolbar`, brikker og
  teller). Filtre ligger aldri som rekker av nedtrekksfelt i hodet. Komponenten eier
  rullingen i listen (`#default`): når listen rulles, legges verktøyraden sammen og
  tittelraden strammes — tittel, `#badge` og `#actions` blir stående over søket
  (SIGN-1852) — og hodet åpner seg igjen øverst (bare når listen fortsatt kan rulles
  etterpå, så ingenting hopper; alt animerer som én bevegelse, og
  `prefers-reduced-motion` slår den av). `#footer` står fast under listen.
  `headingTag` er `h1` der panelet er sidens overskrift, `labels` (`NkListPaneLabels`)
  og all annen tekst kommer fra appen. Eksponerer `body` (rulleelementet), `scrollToTop()`
  og `condensed`. **Liste først** (`listFirst`, SIGN-1888, slått på i Sign): listen er en
  egen side i full bredde og det valgte åpnes alene på hele flaten; `detailOpen` skjuler
  panelet uten å avmontere det, så rulleposisjon, søk og filtre er de samme når brukeren
  lukker det valgte. Uten `listFirst` er alt som før (backoffice, Time)
- `NkSheet` — det delte dialogskallet (SIGN-733): `v-dialog` + kort med hode
  (`title`, `subtitle`, `#badge`, eller hele hodet i `#head`), rullende kropp
  (`default`) og festet handlingsrad (`#actions`). Bare kroppen ruller; den har
  luft nok til Vuetifys flytende etiketter og fokusrammer, så ingenting klippes
  ved rulleposisjon 0. Under `smAndDown` er sheetet fullskjerm med safe-area
  på handlingsraden (`fullscreenOnMobile`, standard på). Åpen/lukket via
  `v-model` eller `open` + `close`; `maxWidth` (standard 560) og `eager`
  sendes til dialogen. Sekundær handling til venstre: `class="me-auto"` på
  knappen. Erstatter app-kopiene av `.nk-sheet*`-CSS-en — konsumentene har
  ingen egen dialog-CSS; navnet på konsumentens komponent er fortsatt `*Dialog`.
  Bygger på `NkDialog` (SIGN-846): `title` er dialogens navn, `subtitle` beskrivelsen,
  og et eget `#head` får navnet fra overskriften sin. `closeLabel` («Lukk» fra appens
  i18n) gir en lukkeknapp med det navnet i hodet
- `NkStatusChip` — statuschip med to størrelser (`sm`/`md`) og seks semantiske
  toner (`success`/`inflight`/`warning`/`error`/`info`/`neutral`) fra soft-tokenparene;
  teksten kommer alltid fra appens i18n
- `PhoneNumberInput` — `autocomplete` er `off` som standard (SIGN-1907); sett `tel` bare der brukeren skriver sitt eget nummer
- `NK_SEARCH_FIELD_ATTRS` — attributtene som holder nettleserens autofyll ute av søkefelt (`v-bind` på `v-text-field`; `NkListPane` setter dem selv)
- `useWidgetLayout` — kontrolleren for én flates widgetoppsett (SIGN-1850, delt i
  SIGN-1873): hvilke widgeter som vises, i hvilken sone, hvilken størrelse og hvor de
  står. Lagring og tekster er appens (`storage`, `labels`); se «Widgeter» under
- `NkWidgetGrid` — rutenettet på en widgetflate: faste rader med celler på brede
  skjermer, listerekkefølge på smale (`breakpoints`, `rowHeight`); verten tegner
  widgeten i `#widget`
- `NkWidgetColumn` — en kolonne av widgeter i listerekkefølge med naturlig høyde;
  `#widget` og `#empty` (slippsonen når kolonnen er tom i redigeringsmodus)
- `NkWidgetEditBar` — linjen over flaten mens den tilpasses: hint, skjulte widgeter som
  brikker, «Tilbakestill» (bekreftes) og «Ferdig»; `title` overstyrer `labels.editTitle`
- `NkWidgetTools` — verktøyene på hver flis i redigeringsmodus (dra-håndtak med
  piltaster, neste størrelse, skjul); rutenettet og kolonnen tegner den selv
- `NkLineChart` — det delte linjediagrammet (SIGN-1873), også fra `./web`: én eller noen
  få tidsserier som SVG med tokens, trådkors og tooltip for alle seriene (peker og
  piltaster), siste verdi merket direkte, og «Vis som tabell» som tilgjengelig tvilling;
  tekster (`NkLineChartLabels`), tallformat og farger kommer fra appen. Se «Linjediagram»
- `NkSubscriptionCard` — abonnementskortet (SIGN-1790): plan, apper, statuschip, varslene
  (prøveperiode, venter på betaling, feilet betaling, oppsigelse, ventende endring),
  nøkkelrutenettet (brukere, frekvens, binding, neste faktura, betalingsmåte, pris) og
  handlingsraden. Samme kort i firmaappen og Sign-innstillingene; eieren eier data,
  rettigheter og tekster (`NkSubscriptionCardTexts`) og svarer på hendelsene
- `NkPlanCheckoutForm` — utsjekkens skjema (SIGN-1790): planvalg, `NkOfferPicker`,
  `NkSeatStepper`, kampanjekode bak en lenke (SIGN-829) og `NkQuoteSummary`, helt styrt av
  eieren (forhåndsvisning, kjøp, konvertering og planbytte er eierens kall)
- `NkOfferPicker` / `NkSeatStepper` / `NkQuoteSummary` — byggeklossene: frekvens × binding
  avledet av planens tilbud (én mulighet vises som en linje), brukertelleren med grenser og
  hint, og det server-prisede sammendraget med ferdig formaterte linjer
- `NkPaymentElementDialog` — DEN betalingsdialogen (SIGN-95/1790): Stripe Payment Element
  på NkSheet for betaling (`payment`) og kortlagring (`setup`), `redirect: 'if_required'`
  med retur til samme side (`?checkout=return`, les med `readStripeReturn`). `getStripe` og
  `completePaymentIntentAction` er de delte Stripe-hjelperne; publishable key kommer alltid
  fra licensing-svaret, aldri fra env
- `NkPaymentMethodList` / `NkInvoiceTable` — kortlisten (merke, siste fire, utløp,
  lommebok, standard, sett/fjern) og fakturatabellen (nummer, dato, status, total, PDF) med
  ferdig formaterte rader fra appen
- Hjelperne for abonnement (SIGN-1790): `cadenceChoices`, `commitmentChoices`, `findOffer`,
  `defaultOffer`, `initialSeats`, `matchingOffer`, `plansForApp`; `quoteLines`,
  `changePreviewLines`, `changePreviewTerms`, `checkoutTerms`; `trialDaysLeft`,
  `canCancelSubscription`, `cancelBlocked`, `subscriptionStatusTone`; `readStripeReturn`,
  `stripStripeParams`, `createReloadPoller`. Tekstene kommer som funksjoner
  (`NkQuoteLineTexts` m.fl.) — pakka har ingen strenger og ingen språkliste
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
- `configureLocales(locales)` — fyller tabellen bak `toBcp47` fra språkregisteret
  (core `platformLocales` / `schemas/locales.json`, SIGN-1157/1164): radene
  `{ code, bcp47, aliases }` erstatter tabellen, så `toBcp47('de')` gir `de-DE`
  den dagen registeret har språket — uten endring her. Dagens språk ligger inne
  som startverdi og gjelder til funksjonen kalles; en tom liste setter tabellen
  tilbake. i18n-motoren i `@nordikode/app-core` (`createNordikodeI18n`) kaller
  den ved oppstart og når registeret hentes på nytt — appene kaller den ikke
  selv. `SharedLocale` er `string`: hvilke språk som finnes, er data.
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
`--nk-chrome-accent-ink` / `--nk-chrome-on-accent`, which the host app sets
from its own theme (see below).

- `PhoneNumberField` — the phone field with country picker for surfaces
  without Vuetify (the website). Same behaviour as `PhoneNumberInput` in the
  main entry: both run on `usePhoneNumberField`. The country comes from the
  host (`defaultCountryCode`: the user's, the company's or the market's
  country); without one the picker is empty and the user picks a country or
  types `+` and the country code. `v-model` is the number in international
  form (E.164). The host owns the label above and the error text below
  (`id`, `invalid`, `describedBy`) and passes every text in `labels`.
  `isValidInternationalPhoneNumber(value)` tells the host whether the value
  can be submitted. Font size and height follow the host through
  `--nk-phone-font-size` (use 16px where iOS Safari would zoom) and
  `--nk-phone-min-height`. Never pass a fixed country, and never write a country
  code into a hint text (SIGN-1301).
- `AppHeader` — the header shell itself: sticky 3.25rem bar with blur, brand
  (the full brand logo via `brand="nordikode" | "sign"` (SIGN-641), plus
  `#brand-suffix` for products without their own logo, optionally with the
  product's symbol in front of the suffix via `productSymbol="sign"`,
  SIGN-614; client-side routers pass `linkComponent` + `hrefProp` so the
  brand link changes page without a reload, as in `SectionNav`, SIGN-1496),
  the company block in `#tenant` (SIGN-561, see below), nav from a
  `nav` prop rendered both as desktop
  nav (one dropdown level, active by `currentPath` prefix) and as the built-in
  burger drawer below 640px. Widths: `standard` (64rem), `wide` (72rem),
  `full`. **Standard order** on every signed-in surface: brand → thin divider →
  `#tenant` → nav → … → `#actions` → ThemeToggle → NotificationBellMenu →
  AppLauncherMenu → AccountIdentityMenu → burger. The left side says where the
  user is (brand, product, company); the right side holds the user's own tools.
  `#nav-item` lets Inertia/SPA apps render their own link component. z-index
  override: `--nk-chrome-z` (default 50).
  **Support session banner (SIGN-1547):** with `supportSession` set
  (`{ userName, tenantName, appName, mode, expiresAt, busy }`) a banner stays
  above the header row: who the operator is viewing as, time left, the mode in
  words, the «Make changes» switch (confirmed in the banner itself before it
  is turned on) and «End». It cannot be closed. The header calls no API: it
  emits `support-session-mode` (`'READ' | 'WRITE'`) and `support-session-end`.
  The texts live in this package, one file per language in
  `src/web/supportSessionTexts/`, and the banner picks them from `locale` —
  no app keeps its own copy (a language without a file gets English; a new
  language is a new file). `supportSessionTexts(locale)` gives apps the same
  texts for the messages they show when an action is refused
  (`messages.readOnly`, `.forbidden`, `.wrongTenant`, `.modeFailed`,
  `.endFailed`). `supportSessionLabels` only overrides a single text. The
  time is formatted with `Intl` in `locale`. Colours are the warning role
  (`--nk-warning`/`--nk-on-warning`, on the website
  `--color-warning`/`--color-on-warning`; override with `--nk-chrome-support`
  and `--nk-chrome-on-support`). Inside a `v-app-bar` with a fixed height, add
  `useSupportBannerHeight()` (pixels, 0 without a banner) to the height.
  `@nordikode/app-core` gives all of it ready to bind:
  `<AppHeader v-bind="supportBanner">` with `useSupportSessionBanner()`.
- `EmailVerificationBanner` — the «Confirm your e-mail» band (SIGN-1676) every
  signed-in surface shows at the top of its content while the account has no
  verified e-mail address and the deadline is ahead: the address the link went
  to, the deadline (formatted with `Intl` on the user's locale) and one button,
  «Send a new link». It cannot be dismissed; it goes away when `me` no longer
  carries `pendingEmailVerification`. Data via `pending` ({ email, deadlineAt }),
  texts from the package on `locale` (`emailVerificationTexts`, one JSON per
  language), the host owns the sending (`resend` event, `busy`,
  `resendSecondsLeft` for the shared 30 s cooldown). Colours from the warning
  role (`--nk-warning`/`--nk-on-warning`, on the website
  `--color-warning`/`--color-on-warning`).
- `PageHeader` — the page-heading standard: hierarchical back link (always
  one level up, never browser history; top-level pages have none) → the
  page's single H1 → subtitle, with `#badge` (status chip) and `#actions`.
  Scale is the app standard (1.5rem/800 title, 0.9rem secondary subtitle —
  the same heading as Sign and backoffice); a link rendered in `#back` gets
  the back-link style when it carries the `nk-page-header__back` class.
- `SectionNav` — the area navigation shared by the platform apps (SIGN-656)
  and Sign's settings (SIGN-417). `layout="auto"` (default) is a sticky 14rem
  side menu from 1280px up and a scrollable tab row under the page header
  below that; `side`, `tabs` and `list` are fixed forms for consumers that
  choose the breakpoint themselves — `list` is the grouped, full-width list
  with chevrons that serves as the menu screen on phones (iOS Settings
  style). Items with the same `group` stand together (space between groups
  in the side menu, one card per group in the list). Items are links
  (`href`) or selections (`select` event); client-side routers pass their
  link component in `linkComponent` (`hrefProp` = `href` for Inertia, `to`
  for RouterLink). Standard for company, account and developer — the
  header's nav slot stays empty in those apps.
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
  `eventKey` + `params` itself and navigates on `select`. `labels.loading` is the
  text shown while the feed loads the first time — pass it in every language the
  host has. Rows and «mark all as read» carry a visible focus ring, and focus
  returns to the bell when the panel closes (SIGN-1288)
- `AccountIdentityMenu` — the avatar/account menu with service list
- `tenantLogoPresentation` (+ `TenantLogoPresentation`, `TenantLogoFacts`) —
  the smart-logo rule (SIGN-676): `initials` (no logo → circle), `square`,
  `wide` (wide logo without text, shown next to the name) or `wordmark` (wide
  logo with text replaces the name). Fed by core's `logoAspectRatio` /
  `logoContainsText` on the tenant.
- `TenantSwitcherMenu` — the company menu (tenant logo/initials, switch between
  the user's companies, optional personal context via the `personal` prop; the
  host owns the actual switch request; `createHref` + `labels.create` add a
  «New company» link row to the create-company wizard, SIGN-1196). `variant="block"` is the **company
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

The accent contract has three variables, and they mean different things
(SIGN-904):

- `--nk-chrome-accent` — the accent color itself: filled surfaces, 12 % tints,
  the unread dot in the notification list, focus rings.
- `--nk-chrome-accent-ink` — the accent used *as text or icon on a light
  tint* (active company, selected app, section nav). Hosts set it to the
  accent color; it is never text on a filled accent.
- `--nk-chrome-on-accent` — text on a *filled* accent surface (the button in
  `NkSignedOutDialog`). Hosts set it to their on-primary token
  (`--nk-on-action-primary` in the product apps); the fallback is
  `--color-surface`.

The contract is mandatory in both themes: hosts must define all three in light
mode *and* in `.dark` — overriding only some of them in dark mode makes the
chrome pick up mismatched colors.

Count badges have their own contract (SIGN-1318): `--nk-chrome-badge` (fill)
and `--nk-chrome-badge-ink` (the number). Every count in the chrome — the
unread count on `NotificationBellMenu`, the counts in `AppLauncherMenu` and
`SectionNav` — uses it, and every host sets it from its error token, so a
count is red on every surface. A count badge never uses the accent: the accent
is the host's own color and differs per app. `tests/chromeBadge.test.ts` fails
when a badge in `src/web` is filled with anything else.

Import styles once (`@nordikode/components/style.css`) — it carries the scoped
CSS for these components too.

### `@nordikode/components/bell` (the bell alone, SIGN-1295)

`NotificationBellMenu` and its types (`NotificationBellItem`,
`NotificationBellCompany`, `NotificationBellLabels`) in a module of their own.
`web` still exports the bell as before; this entry exists for a surface that
loads the bell only for signed-in users — the website imports it from here in
the lazily loaded notifications module, so a visitor's shared bundle never
carries it. Same component, same styles (`style.css`).

## Widgeter (SIGN-1850/1873/1911)

En widgetflate (Signs dashbord og saksoversikt) er satt sammen av widgeter brukeren
selv plasserer, gir størrelse og skjuler. Rammeverket eier oppsettet, rutenettet,
redigeringsmodusen og draget; appen eier widgetene, tekstene og lagringen.

```ts
const controller = useWidgetLayout({
  preferenceKey: 'sign.dashboard.layout',   // nøkkelen oppsettet lagres under
  definitions,                              // WidgetDefinition[] eller en getter (tilgang)
  zones: [{ key: 'main', kind: 'grid' }, { key: 'side', kind: 'column' }], // uten: ett rutenett `main`
  storage,                                  // WidgetLayoutStorage: load/save(/current) — Sign: UI-preferansene i core
  labels: () => widgetLabels(t),            // WidgetLabels fra appens i18n; en getter følger språkbyttet
  onSaveError: (error) => toast.error(…),   // appen viser feilen slik den pleier
})
```

- **Tre størrelser**, og innholdet er ulikt per størrelse, ikke bare skalert: `small` er
  ett nøkkeltall eller én linje (én kolonne, én rad), `medium` et panel (halve bredden, to
  rader), `large` alt (hele bredden, tre rader). `WidgetDefinition.sizes` sier hvilke en
  widget kan ha; den første er standard.
- **Høyde i hele rader (SIGN-1903)**: i et rutenett med rader er en widget 1, 2 eller 3
  rader høy. Radene er felles for rutenettet, har en minstehøyde (`rowHeight`) og vokser
  når innholdet trenger mer — flisen ruller aldri. Widgeter på samme rad er derfor like
  høye, og to 1-raders widgeter oppå hverandre er nøyaktig like høye som én 2-raders ved
  siden av. Størrelsen gir standardhøyden (1/2/3 for liten/medium/stor, `rows` på
  definisjonen overstyrer per størrelse); brukeren velger en annen med høydeknappen i
  redigeringsmodus (`setRows`/`cycleRows`, lagret som `rows` på widgeten i oppsettet).
  Innhold uten naturlig tak — en lang liste, et diagram som fyller flisen — merkes
  `nk-widget-fill`: det teller ikke med i radhøyden, fyller plassen flisen har og ruller
  selv. Widgetens rot må være en kolonne-flex. Et diagram som måler sin egen høyde skal
  stå i en slik boks, ellers driver det radhøyden.
- **Soner**: et rutenett (`NkWidgetGrid`, `kind: 'grid'`) snapper fliser til celler når
  radene er faste og følger listerekkefølgen ellers; en kolonne (`NkWidgetColumn`,
  `kind: 'column'`) følger alltid listerekkefølgen. Widgeter kan dras mellom sonene på
  samme flate. `WidgetDefinition.zone` er standardsonen.
- **Dele en widget i flere**: gi de nye `after: '<nøkkelen de ble skilt ut av>'`. Brukere med
  et lagret oppsett får dem da rett etter den gamle, i samme sone og like synlige — ikke
  bakerst i standardsonen.
- **Verten tegner widgetene** i `#widget`-slotten på rutenettet og kolonnen, med
  `widgetKey`, `size`, `definition` og `settings`. Rammeverket vet ikke hva en widget viser.
- **Innstillinger per widget (SIGN-1911)**: en widget som kan vises på flere måter
  deklarerer `settings` på definisjonen — ett valg blant noen få per innstilling
  (`{ key, label, options: [{ value, label }], default }`, «hvilket tall står i fokus»).
  I redigeringsmodus får widgeten da et tannhjul i verktøylinjen med valgene. Verdien er
  personlig, lagres i oppsettet ved siden av størrelse og plassering (bare når den avviker
  fra standarden) og følger «Tilbakestill». Verten leser den fra slottens `settings`
  (alltid komplett: valget, ellers standarden) eller `controller.settingsOf(key)`, og
  setter den med `controller.setSetting(key, setting, value)`. Ukjente innstillinger og
  verdier i et lagret oppsett renses bort. Etiketten på tannhjulet er `labels.settings`.
  Større valg enn dette (skjemaer, lister) hører hjemme på en side, ikke i en widget.
- **Lagring og tekster er data.** `storage.load(key)` leses én gang (det som kommer
  renses med `resolveLayout` mot dagens register, så nye widgeter dukker opp og
  fjernede forsvinner), `storage.save(key, layout)` skrives 500 ms etter siste endring,
  og `storage.current(key)` (valgfri, reaktiv) lar en endring fra en annen fane tas i
  bruk. `labels` er alle tekstene i redigeringslinjen og verktøyene; `title` på en
  widget er ferdig oversatt eller en getter.
- Stilene (`nk-widget-*`) ligger i `style.css` og bruker bare tokens.

## Linjediagram (SIGN-1873)

`NkLineChart` tegner utvikling over tid likt i backoffice og produktappene, etter
dataviz-reglene: én akse (to mål med ulik enhet er to diagrammer ved siden av hverandre,
aldri to y-akser), 2 px linje, hårtynne gridlinjer, ingen tall på hvert punkt — siste
verdi merkes direkte, resten leses i tooltipen eller tabellen. Hover og piltaster flytter
trådkorset til nærmeste kategori og viser alle seriene der. Tekst bærer aldri seriefargen.

```vue
<NkLineChart
  :categories="points.map((p) => p.periodStart)"
  :series="[{ key: 'new', label: t('…'), values: points.map((p) => p.newTenants) }]"
  :labels="{ table: t('…showTable'), chart: t('…showChart'), category: t('…period'), empty: t('…empty') }"
  :aria-label="t('…chartLabel')"
  :format-value="(v) => numberFormat.format(v)"
  :format-category="(d) => shortDate.format(new Date(d))"
  :format-category-long="(d) => longDate.format(new Date(d))"
  :loading="store.loading"
/>
```

- Første serie får `--nk-action-primary`; serie to og utover må ha `color` (en token, aldri
  hex), og da vises en forklaring under diagrammet. Status-fargene brukes aldri som
  seriefarge.
- Mens nye tall hentes holdes forrige tegning svakere (`loading`) — ingen skjelett.
- `niceTicks(max, count)` gir akse-trinnene (0, 5, 10 … eller 0, 2,5, 5 …) og kan brukes
  av andre figurer.

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

## Checks before a pull request

```bash
npm test                # vitest over tests/**/*.test.ts; also a CI step — a red test stops the PR and the publish
npm run type-check      # vue-tsc over src/ (components and stories); also a CI step
npm run build
npm run build-storybook
```

Tests live in `tests/` and run with vitest (`vitest.config.ts`, separate from the
library build). Pure functions are tested directly; a component test mounts the
component with `createApp` in a browser-like DOM by putting
`// @vitest-environment happy-dom` at the top of the file (see
`tests/appHeader.test.ts`), and a Vuetify component also installs `createVuetify`
with the components it renders (see `tests/phoneNumberInput.test.ts`,
`tests/dialog.test.ts`). Behaviour that must be the same in every app belongs
here, not in the apps.

`index.d.ts`, `web.d.ts` and `tokens.d.ts` are written by hand, and they are where
consuming apps get their types from. The type check does not read them: a type
changed in `src/` must be changed in the matching `.d.ts` in the same pull request.

## Design tokens

Produkttemaer: `signTheme` (Sign), `timeTheme`, `backofficeTheme` og `platformTheme`
(Nordikode-paletten for plattformappene company, account og developer — SIGN-657).

`@nordikode/components/tokens` er kilden til sannhet for farger, radius, spacing
og typografi — per produkt (Sign, Time, Backoffice), light + dark.

```ts
// src/plugins/vuetify.ts i en app:
import { buildVuetifyThemes, nkFieldDefaults, signTheme } from '@nordikode/components/tokens'

createVuetify({
  theme: {
    defaultTheme: signTheme.vuetifyThemeName,
    themes: buildVuetifyThemes(signTheme),
  },
  defaults: {
    ...nkFieldDefaults(),
    VBtn: { color: 'primary', variant: 'flat' },
  },
})
```

`nkFieldDefaults()` (SIGN-1907) er felt-standardene alle innloggede apper deler:
samme utseende på `VTextField`, `VTextarea`, `VSelect`, `VAutocomplete` og
`VCombobox`, og **nettleserens autoforslag av** (`autocomplete="off"`) på alle
felt med tekstinntasting. Appene har ingen egen kopi. Et felt som gjelder
brukeren selv (egen e-post, eget telefonnummer, innlogging) setter
`autocomplete` eksplisitt og vinner over standarden; `autocomplete="off"`
skrives aldri for hånd.

```ts
// Generere appens :root / :root.nk-dark CSS-variabler:
import { productCss, signTheme } from '@nordikode/components/tokens'
productCss(signTheme)
```

Sign-paletten (SIGN-604, 2026-09-09) har engelske fargenavn og én jobb per
farge: tar (blekk og mørk flate), plum (`textTitle`, overskrifter), berry
(`primary`/`link` i lys modus), light berry (`primary` i mørk modus og merket),
lime (`success*`), gold
(`attention`/`warning*`) og mauve (`mutedSoft`). Siden 0.43.0 (SIGN-679) er
blått Nordikodes farge (`platformTheme`) og `info`/`infoSoft` nøytral
grå/dempet tint. Siden 0.45.0 (SIGN-690) er berry handling, og siden 0.48.0
(SIGN-752) også railen: `surfaceRail` er ren berry i begge moduser, `frame`
(aktiv rail-knapp) er berry løftet med hvit 20 %, `secondary` (avatarer, firmabrikker)
er mauve-tinten med tar-initial, og `surfaceSoftAccent` (valgt rad, aktivt
filter) er en kald tar-tint. `IdentityAvatar` leser temaets on-farge for
initialen.
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

Monospace: `--nk-font-mono` (`nkFontMono`, siden 0.57.0 — SIGN-1193) er fonten
for tekst som leses tegn for tegn: ID-er, IP-adresser, koder, nøkler og JSON.
Verdien er systemets egne fonter (`ui-monospace`, SF Mono, Menlo, Consolas,
Liberation Mono), så ingenting lastes ned. Tokenet er bare fontfamilien;
størrelse, vekt og farge arves. Bruk `font-family: var(--nk-font-mono)` — aldri
en håndskrevet fontliste, og aldri en reserveverdi (`var(--nk-font-mono, …)`):
variabelen genereres av `cssStaticVariables()`/`productCss()` og finnes alltid.

Layout-token for flytende handlinger: `--nk-fab-reserve` (88px) er plassen
bunnhandlinger til høyre (send, lagre) holder unna en flytende figur/FAB nede
til høyre (SIGN-466). Bruk `padding-right: var(--nk-fab-reserve)` på raden.
