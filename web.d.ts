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
}

export type TenantSwitcherLabels = {
  menu: string
  current: string
  companies: string
}

export type AppHeaderNavChild = {
  key: string
  label: string
  href: string
  external?: boolean
  active?: boolean
}

export type AppHeaderNavItem = AppHeaderNavChild & {
  href?: string
  children?: AppHeaderNavChild[]
}

export type AppHeaderLabels = {
  navigation: string
  menu: string
}

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
}

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
}

export type NkSignedOutReason = 'revoked' | 'expired'

export type NkSignedOutDialogLabels = {
  title: string
  revoked: string
  expired: string
  signInAgain: string
  waiting: string
}

export function useTheme(): {
  isDark: import('vue').Ref<boolean>
  preference: import('vue').Ref<ThemePreference>
  toggle: () => ThemePreference
  applyPreference: (preference: ThemePreference) => void
}

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
export const AppHeader: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const PageHeader: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const SectionNav: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const ThemeToggle: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NotificationBellMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkSignedOutDialog: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

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
