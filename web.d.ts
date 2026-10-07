import type { DefineComponent } from 'vue'

export type AppLauncherItem = {
  key: string
  label: string
  url: string
  group?: string
  badge?: number | null
}

export type AccountMenuService = {
  key: string
  label: string
  url: string
}

export type AccountMenuLabels = {
  menu: string
  services: string
  current: string
  logOut: string
}

export type WebAppIconName =
  | 'sign'
  | 'time'
  | 'website'
  | 'account'
  | 'backoffice'
  | 'helpcenter'
  | 'developer'
  | 'admin'
  | 'review'

export const webAppIcons: Record<WebAppIconName, string[]>
export const webAppFallbackIcon: string[]
export function webAppIconFor(key: string): string[]
/** Apper med eget appikon (iOS-ikonet, lys/mørk) — vises som flis i app-velgeren (SIGN-655). */
export type WebAppTile = { light: string; dark: string }
export const webAppTiles: Partial<Record<WebAppIconName, WebAppTile>>
export function webAppTileFor(key: string): WebAppTile | null

export type TenantSwitcherOption = {
  id: string
  name: string
  logoUrl?: string | null
  /** Bredde/høyde for logoen; ukjent = kvadratisk (SIGN-676). */
  logoAspectRatio?: number | null
  /** Om logoen inneholder lesbar tekst; null = ikke analysert ennå (SIGN-676). */
  logoContainsText?: boolean | null
}

/** Visningen firmavelgeren velger for ett firma (SIGN-676). */
export type TenantLogoFacts = Pick<TenantSwitcherOption, 'logoUrl' | 'logoAspectRatio' | 'logoContainsText'>
export type TenantLogoPresentation = 'initials' | 'square' | 'wide' | 'wordmark'
export const WIDE_LOGO_ASPECT_RATIO: number
export function tenantLogoPresentation(tenant: TenantLogoFacts, logoFailed?: boolean): TenantLogoPresentation

export type TenantSwitcherLabels = {
  menu: string
  current: string
  companies: string
  /** «Nytt firma»-raden (SIGN-1196) — vises bare sammen med `createHref`. */
  create?: string
}

export type AppHeaderNavChild = {
  key: string
  label: string
  href: string
  external?: boolean
  active?: boolean
}

export type AppHeaderNavItem = Omit<AppHeaderNavChild, 'href'> & {
  href?: string
  children?: AppHeaderNavChild[]
}

export type AppHeaderLabels = {
  navigation: string
  menu: string
}

/** Lesemodus eller skrivemodus i en supportøkt (SIGN-1547). */
export type SupportSessionMode = 'READ' | 'WRITE'

/**
 * Supportøkten `AppHeader` viser banner for (SIGN-1547): `supportSession`.
 * Navn og firma er data; `appName` er produktnavnet («Nordikode Sign»).
 */
export type AppHeaderSupportSession = {
  userName: string
  tenantName?: string | null
  appName?: string | null
  mode: SupportSessionMode
  /** ISO 8601. */
  expiresAt: string
  /** Et modusbytte eller en avslutning er underveis: knappene er av. */
  busy?: boolean
}

/**
 * Supportbannerets tekster: `supportSessionLabels` på `AppHeader`. Alle er
 * valgfrie der (kildespråket er standard). `viewingAs` har plassholderne
 * `{app}`, `{name}` og `{tenant}`, `timeLeft` har `{time}`.
 */
export type AppHeaderSupportSessionLabels = {
  region: string
  viewingAs: string
  viewingAsWithoutTenant: string
  timeLeft: string
  expired: string
  readMode: string
  writeMode: string
  makeChanges: string
  confirmWrite: string
  confirm: string
  cancel: string
  end: string
}

/**
 * Høyden på supportbanneret i piksler, 0 når det ikke vises. Legges til
 * høyden på en `v-app-bar` som holder `AppHeader`.
 */
export declare function useSupportBannerHeight(): Readonly<import('vue').Ref<number>>

/** Meldingene appene viser når en handling avvises i en supportøkt (SIGN-1547). */
export type SupportSessionMessageTexts = {
  readOnly: string
  forbidden: string
  wrongTenant: string
  modeFailed: string
  endFailed: string
}

export type SupportSessionBannerTexts = AppHeaderSupportSessionLabels

export type SupportSessionTexts = {
  banner: SupportSessionBannerTexts
  messages: SupportSessionMessageTexts
}

/**
 * Supportøktens tekster på brukerens språk — én kilde for alle apper.
 * Banneret bruker dem selv ut fra `locale`; appene bruker `messages`.
 * Et språk pakken ikke har, gir kildespråket.
 */
export declare function supportSessionTexts(locale?: string | null): SupportSessionTexts

export type PageHeaderBack = {
  href: string
  label: string
}

/** Ett punkt i seksjonsnavigasjonen (SIGN-656). */
export type SectionNavItem = {
  key: string
  label: string
  href?: string
  icon?: string
  badge?: number | null
  /** Gruppenøkkel: punkter med samme gruppe står sammen (SIGN-417). */
  group?: string
}

/** Formen på seksjonsnavigasjonen: `auto` bytter selv på 1280px; resten er faste (SIGN-417). */
export type SectionNavLayout = 'auto' | 'side' | 'tabs' | 'list'

export type ThemeToggleLabels = {
  toLight: string
  toDark: string
}

export type ThemePreference = 'system' | 'light' | 'dark'

export type NotificationBellItem = {
  id: string
  title: string
  body?: string | null
  timeLabel: string
  read: boolean
}

export type NotificationBellLabels = {
  menu: string
  menuWithUnread: string
  title: string
  empty: string
  markAllRead: string
  unread: string
  loading?: string
}

export type NkSignedOutReason = 'revoked' | 'expired'

export type NkSignedOutDialogLabels = {
  title: string
  revoked: string
  expired: string
  signInAgain: string
  waiting: string
}

/** Tekstene til `PhoneNumberField` — alle fra verts-appens oversettelser. */
export type PhoneNumberFieldLabels = {
  /** aria-label på landknappen og søkefeltet i menyen. */
  country: string
  /** Plassholder i søkefeltet. */
  search: string
  /** Vises når søket ikke gir treff. */
  noResults: string
}

export function useTheme(): {
  isDark: import('vue').Ref<boolean>
  preference: import('vue').Ref<ThemePreference>
  toggle: () => ThemePreference
  applyPreference: (preference: ThemePreference) => void
}

/**
 * Miljømerket (SIGN-773): kort tekst («BETA») som `BrandWordmark` — og dermed
 * `AppHeader` og innloggingssidene — tegner inntil logoen. Settes én gang av
 * appen fra env; tom = ingen merke (prod).
 */
export declare function setEnvironmentLabel(label: string | null | undefined): void
export declare function useEnvironmentLabel(): import('vue').Ref<string>

export const AppLauncherMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const AccountIdentityMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const TenantSwitcherMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/** Merkevaren i `BrandWordmark`/`AppHeader` (SIGN-641): plattformen eller Sign. */
export type BrandKey = 'nordikode' | 'sign'
export type BrandVariant = 'lockup' | 'stacked' | 'mark'
export const BrandWordmark: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/** Produktsymbolet foran produktnavnet (SIGN-614). `AppHeader` tar det som `productSymbol`. */
export type ProductSymbolKey = 'sign'
export const ProductSymbol: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * Supportøkt (SIGN-1547): props `supportSession`, `supportSessionLabels`,
 * `locale`; events `support-session-mode` (`SupportSessionMode`) og
 * `support-session-end`.
 */
export const AppHeader: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const PageHeader: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const SectionNav: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const ThemeToggle: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NotificationBellMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkSignedOutDialog: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * Telefonfeltet med landvelger uten Vuetify (SIGN-1301). Props: `modelValue`
 * (E.164), `defaultCountryCode` (land fra bruker, firma eller marked — null gir
 * tom velger), `locale`, `labels`, `id`, `name`, `ariaLabel`, `placeholder`, `disabled`,
 * `required`, `invalid`, `describedBy`. Skrift og høyde: `--nk-phone-font-size`,
 * `--nk-phone-min-height`. Events: `update:modelValue`, `input`.
 */
export const PhoneNumberField: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/** Er verdien et gyldig nummer i internasjonal form (med landkode)? */
export declare function isValidInternationalPhoneNumber(value: string | null | undefined): boolean

export interface StaleChunkRouter {
  onError(handler: (error: unknown, to: { fullPath: string }) => unknown): unknown
}
export declare function installStaleChunkReload(router?: StaleChunkRouter): void
export declare function isStaleChunkError(error: unknown): boolean

/**
 * Delt beløpsformatering (SIGN-499): valuta er alltid data (tenant/dokument),
 * locale er brukerens UI-locale som full BCP-47-tag. Se src/money.ts.
 */
export interface FormatMoneyOptions {
  maximumFractionDigits?: number
  minimumFractionDigits?: number
  compact?: boolean
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero'
}
/** Det `configureLocales` trenger fra en rad i språkregisteret (SIGN-1164). */
export interface LocaleRegistryEntry {
  code: string
  bcp47: string
  aliases?: ReadonlyArray<string> | null
}
/**
 * Erstatter tabellen bak `toBcp47` med språkregisteret (core `platformLocales`).
 * En tom liste setter tabellen tilbake til startverdien.
 */
export declare function configureLocales(locales: ReadonlyArray<LocaleRegistryEntry>): void
export declare function toBcp47(locale: string | null | undefined): string
export declare function formatMoney(
  amount: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function formatMinorAmount(
  amountMinor: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function formatMoneyRange(
  from: number,
  to: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function supportedCurrencyCodes(): string[]

/* Delt autolagring (SIGN-1382): skrivemotoren, innstillingskjernen og statuslinjen. */
export type DraftAutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
export interface DraftAutosave {
  status: import('vue').Ref<DraftAutosaveStatus>
  savedAt: import('vue').Ref<Date | null>
  schedule: () => void
  flush: () => Promise<void>
  cancel: () => void
}
export const DRAFT_AUTOSAVE_DELAY_MS: number
export const SETTINGS_AUTOSAVE_DELAY_MS: number
export declare function createDraftAutosave(save: () => Promise<void>, delayMs?: number): DraftAutosave
export interface SettingsAutosaveOptions {
  signature: import('vue').Ref<string>
  baseline: import('vue').Ref<string>
  save: () => Promise<void>
  describeError: (error: unknown) => string
  delayMs?: number
}
export interface SettingsAutosave {
  status: import('vue').Ref<DraftAutosaveStatus>
  errorMessage: import('vue').Ref<string>
  absorbOwnUpdate: () => boolean
  isDirty: () => boolean
  flush: () => Promise<void>
  cancel: () => void
}
export declare function useSettingsAutosave(options: SettingsAutosaveOptions): SettingsAutosave
export type NkAutosaveStatusLabels = {
  saving: string
  saved: string
  error: string
}
export const NkAutosaveStatus: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
